/**
 * Shared Plaid transaction sync logic + background scheduler.
 *
 * The same `syncPlaidItem` routine is used by:
 *   - the user-initiated POST /api/plaid/sync route (server/routes/plaid.ts)
 *   - the TRANSACTIONS webhook (Plaid -> us, low latency)
 *   - the periodic scheduler started by server/index.ts (catch-up safety net)
 *
 * The scheduler runs every PLAID_SYNC_INTERVAL_MS, finds every Plaid item in
 * the database, and runs `syncPlaidItem` for each. With the push.ts
 * horizontal-shard system already in place we only sync items whose owner
 * falls in this instance's shard, so multi-instance deploys don't double
 * sync the same item.
 */

import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  type Transaction as PlaidTransaction,
} from "plaid";
import { storage } from "./storage";
import { decryptSecret } from "./routes/_encryption";
import { isUserInShard } from "./push";
import type { PlaidItem } from "@shared/schema";

const PLAID_SYNC_INTERVAL_MS = 4 * 60 * 60 * 1000; // every 4 hours
const STARTUP_DELAY_MS = 60 * 1000; // wait a minute after boot before first run

export function plaidConfigured(): boolean {
  return !!(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET);
}

export function getPlaidClient(): PlaidApi | null {
  if (!plaidConfigured()) return null;
  const env = (process.env.PLAID_ENV || "sandbox") as keyof typeof PlaidEnvironments;
  const configuration = new Configuration({
    basePath: PlaidEnvironments[env] || PlaidEnvironments.sandbox,
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID!,
        "PLAID-SECRET": process.env.PLAID_SECRET!,
      },
    },
  });
  return new PlaidApi(configuration);
}

function mapCategory(categories: string[] | null | undefined): string {
  if (!categories || categories.length === 0) return "Other";
  const head = categories[0].toLowerCase();
  if (/food|restaurant|dining/.test(head)) return "Food";
  if (/transport|travel|taxi|uber|gas/.test(head)) return "Transport";
  if (/entertainment|recreation/.test(head)) return "Entertainment";
  if (/shop|merchand/.test(head)) return "Shopping";
  if (/health|medical|pharmacy/.test(head)) return "Health";
  if (/rent|mortgage|utilities|home/.test(head)) return "Housing";
  if (/payroll|deposit|income|payment/.test(head)) return "Income";
  if (/transfer/.test(head)) return "Transfer";
  if (/subscription|service/.test(head)) return "Subscriptions";
  return categories[0];
}

export interface SyncCounts {
  added: number;
  modified: number;
  removed: number;
}

/**
 * Sync transactions + refresh balances for a single Plaid item. Idempotent
 * via the cursor stored on the item row, so callers can invoke this from
 * the webhook, the user route and the scheduler without worrying about
 * duplicate writes.
 */
export async function syncPlaidItem(
  item: PlaidItem,
  client: PlaidApi,
): Promise<SyncCounts> {
  let cursor = item.cursor || undefined;
  let hasMore = true;
  let added = 0;
  let modified = 0;
  let removed = 0;

  const accessToken = decryptSecret(item.accessToken);
  const accountsResp = await client.accountsGet({ access_token: accessToken });
  const userAccounts = await storage.getFinancialAccounts(item.userId);
  const accIdByPlaid: Record<string, string> = {};
  for (const a of userAccounts) {
    if (a.plaidAccountId) accIdByPlaid[a.plaidAccountId] = a.id;
  }

  // Refresh balances on each sync.
  for (const a of accountsResp.data.accounts) {
    const localId = accIdByPlaid[a.account_id];
    if (localId) {
      await storage.updateFinancialAccount(localId, item.userId, {
        currentBalance: a.balances.current ?? 0,
      });
    }
  }

  while (hasMore) {
    const syncResp = await client.transactionsSync({ access_token: accessToken, cursor });
    const { added: a, modified: m, removed: r, has_more, next_cursor } = syncResp.data;

    for (const t of a as PlaidTransaction[]) {
      await storage.upsertTransactionByPlaidId({
        userId: item.userId,
        accountId: accIdByPlaid[t.account_id] || null,
        amount: -t.amount,
        category: mapCategory(t.category),
        merchant: t.merchant_name || t.name || null,
        note: null,
        date: t.date,
        source: "plaid",
        plaidTransactionId: t.transaction_id,
        pending: t.pending ?? false,
        currency: "USD",
      });
      added++;
    }
    for (const t of m as PlaidTransaction[]) {
      await storage.upsertTransactionByPlaidId({
        userId: item.userId,
        accountId: accIdByPlaid[t.account_id] || null,
        amount: -t.amount,
        category: mapCategory(t.category),
        merchant: t.merchant_name || t.name || null,
        note: null,
        date: t.date,
        source: "plaid",
        plaidTransactionId: t.transaction_id,
        pending: t.pending ?? false,
        currency: "USD",
      });
      modified++;
    }
    for (const rem of r) {
      await storage.deleteTransactionByPlaidId(rem.transaction_id, item.userId);
      removed++;
    }

    cursor = next_cursor;
    hasMore = has_more;
  }

  await storage.updatePlaidItemCursor(item.itemId, cursor || "");
  return { added, modified, removed };
}

/**
 * Sync every Plaid item in the database that belongs to a user owned by
 * this instance's shard. Logs (but does not throw) per-item errors so one
 * broken item doesn't block the rest.
 */
export async function runScheduledPlaidSync(): Promise<void> {
  if (!plaidConfigured()) return;
  const client = getPlaidClient();
  if (!client) return;

  let items: PlaidItem[];
  try {
    items = await storage.getAllPlaidItems();
  } catch (err) {
    console.error("[plaid] scheduler: failed to list items", err);
    return;
  }
  if (items.length === 0) return;

  const owned = items.filter((i) => isUserInShard(i.userId));
  if (owned.length === 0) return;

  let totalAdded = 0;
  let totalModified = 0;
  let totalRemoved = 0;
  let failed = 0;
  for (const item of owned) {
    try {
      const counts = await syncPlaidItem(item, client);
      totalAdded += counts.added;
      totalModified += counts.modified;
      totalRemoved += counts.removed;
    } catch (err: any) {
      failed++;
      console.error(
        `[plaid] scheduler: sync failed for item ${item.itemId}`,
        err?.response?.data || err?.message || err,
      );
    }
  }
  console.log(
    `[plaid] scheduler tick: items=${owned.length} added=${totalAdded} modified=${totalModified} removed=${totalRemoved} failed=${failed}`,
  );
}

let schedulerHandle: ReturnType<typeof setInterval> | null = null;

export function startPlaidSyncScheduler(): void {
  if (schedulerHandle) return;
  if (!plaidConfigured()) {
    console.log("[plaid] scheduler not started (Plaid not configured).");
    return;
  }
  // Defer the first run so we don't compete with boot-time work.
  setTimeout(() => {
    void runScheduledPlaidSync();
  }, STARTUP_DELAY_MS);
  schedulerHandle = setInterval(() => {
    void runScheduledPlaidSync();
  }, PLAID_SYNC_INTERVAL_MS);
  console.log(
    `[plaid] scheduler started (interval ${PLAID_SYNC_INTERVAL_MS / 1000 / 60}m).`,
  );
}
