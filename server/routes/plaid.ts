import type { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { requireAuth } from "./_shared";
import { encryptSecret } from "./_encryption";
import { Products, CountryCode } from "plaid";
import {
  plaidConfigured,
  getPlaidClient,
  syncPlaidItem,
  maybeNotifyReconnect,
  isReconnectCode,
} from "../plaid-sync";
import { verifyPlaidWebhook } from "../plaid-webhook-verify";

function mapAccountType(t: string | null | undefined, sub: string | null | undefined): "checking" | "savings" | "credit" | "loan" | "investment" | "other" {
  const s = (sub || t || "").toLowerCase();
  if (s.includes("checking")) return "checking";
  if (s.includes("savings")) return "savings";
  if (s.includes("credit")) return "credit";
  if (s.includes("loan") || s.includes("mortgage") || s.includes("student")) return "loan";
  if (s.includes("invest") || s.includes("401") || s.includes("ira") || s.includes("brokerage")) return "investment";
  return "other";
}

function requirePlaid(_req: Request, res: Response, next: () => void) {
  if (!plaidConfigured()) {
    return res.status(503).json({ error: "Plaid is not configured. Set PLAID_CLIENT_ID and PLAID_SECRET to enable bank sync." });
  }
  next();
}

export function registerPlaidRoutes(app: Express) {
  // Status probe the UI uses to decide whether to show "Connect a bank".
  app.get("/api/plaid/status", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const items = plaidConfigured() ? await storage.getPlaidItems(userId) : [];
      res.json({
        configured: plaidConfigured(),
        env: process.env.PLAID_ENV || "sandbox",
        items: items.map(i => ({
          id: i.id,
          institutionName: i.institutionName,
          lastSyncAt: i.lastSyncAt,
          lastSuccessAt: i.lastSuccessAt,
          status: i.status ?? "ok",
          lastError: i.lastError,
          lastErrorCode: i.lastErrorCode,
          lastErrorAt: i.lastErrorAt,
          needsReconnect:
            (i.status ?? "ok") === "error" && isReconnectCode(i.lastErrorCode),
        })),
      });
    } catch (err) {
      console.error("[plaid] status", err);
      res.status(500).json({ error: "Failed to check Plaid status" });
    }
  });

  // Create a Link token for the client to open Plaid Link with.
  app.post("/api/plaid/link-token", requireAuth, requirePlaid, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const client = getPlaidClient()!;
      const r = await client.linkTokenCreate({
        user: { client_user_id: userId },
        client_name: "DW Finances",
        products: [Products.Transactions],
        country_codes: [CountryCode.Us],
        language: "en",
      });
      res.json({ link_token: r.data.link_token });
    } catch (err: any) {
      console.error("[plaid] link-token", err?.response?.data || err);
      res.status(500).json({ error: "Failed to create link token" });
    }
  });

  // Exchange a public_token for an access_token, store it, and sync accounts.
  app.post("/api/plaid/exchange", requireAuth, requirePlaid, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const schema = z.object({
        public_token: z.string().min(10),
        institution: z.object({ name: z.string().optional(), institution_id: z.string().optional() }).optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid exchange request" });

      const client = getPlaidClient()!;
      const tokenResp = await client.itemPublicTokenExchange({ public_token: parsed.data.public_token });
      const accessToken = tokenResp.data.access_token;
      const itemId = tokenResp.data.item_id;

      await storage.createPlaidItem({
        userId,
        itemId,
        accessToken: encryptSecret(accessToken),
        institutionId: parsed.data.institution?.institution_id,
        institutionName: parsed.data.institution?.name,
      });

      // Pull accounts and create finance rows for them.
      const accountsResp = await client.accountsGet({ access_token: accessToken });
      for (const a of accountsResp.data.accounts) {
        await storage.createFinancialAccount({
          userId,
          name: a.name || a.official_name || "Bank account",
          type: mapAccountType(a.type, a.subtype),
          institution: parsed.data.institution?.name || null,
          currentBalance: a.balances.current ?? 0,
          plaidAccountId: a.account_id,
          plaidItemId: itemId,
          isManual: false,
          currency: "USD",
        });
      }

      res.json({ ok: true, itemId });
    } catch (err: any) {
      console.error("[plaid] exchange", err?.response?.data || err);
      res.status(500).json({ error: "Failed to connect bank" });
    }
  });

  // Pull recent transactions for every item owned by the user and upsert them.
  app.post("/api/plaid/sync", requireAuth, requirePlaid, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const client = getPlaidClient()!;
      const items = await storage.getPlaidItems(userId);
      if (items.length === 0) return res.json({ added: 0, modified: 0, removed: 0, itemCount: 0 });

      let added = 0, modified = 0, removed = 0;
      for (const item of items) {
        const counts = await syncPlaidItem(item, client);
        added += counts.added;
        modified += counts.modified;
        removed += counts.removed;
      }

      res.json({ added, modified, removed, itemCount: items.length });
    } catch (err: any) {
      console.error("[plaid] sync", err?.response?.data || err);
      res.status(500).json({ error: "Failed to sync transactions" });
    }
  });

  // Webhook — Plaid will hit this when transactions are available. We don't
  // have a user session here so we identify the owner via item_id. When we
  // get a TRANSACTIONS webhook we run the sync immediately so the user sees
  // the new transactions without waiting for the next scheduler tick.
  app.post("/api/plaid/webhook", async (req, res) => {
    try {
      if (!plaidConfigured()) return res.status(204).end();
      const client = getPlaidClient();
      if (!client) return res.status(204).end();

      // Confirm the request is actually from Plaid before doing any work.
      // The body is parsed by express.json upstream; the verify hook there
      // captures the raw bytes onto req.rawBody so we can hash them here.
      const verifyHeader =
        req.header("plaid-verification") ?? req.header("Plaid-Verification");
      const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;
      const verification = await verifyPlaidWebhook(
        verifyHeader,
        rawBody,
        client,
      );
      if (!verification.ok) {
        console.warn(
          `[plaid] webhook verification failed (${verification.reason}); rejecting`,
        );
        return res.status(401).json({ error: "invalid_signature" });
      }

      const body = (req.body ?? {}) as {
        item_id?: string;
        webhook_type?: string;
        webhook_code?: string;
        error?: { error_code?: string; error_message?: string; display_message?: string } | null;
      };
      const itemId = body.item_id;
      const type = body.webhook_type;
      const code = body.webhook_code;
      if (!itemId) return res.status(204).end();
      const item = await storage.getPlaidItem(itemId);
      if (!item) return res.status(204).end();

      // Acknowledge fast; do the actual work in the background so Plaid
      // doesn't time out and retry the webhook.
      res.status(200).json({ ok: true });

      if (type === "TRANSACTIONS" || type === "SYNC_UPDATES_AVAILABLE") {
        try {
          const counts = await syncPlaidItem(item, client);
          console.log(
            `[plaid] webhook sync item=${itemId} added=${counts.added} modified=${counts.modified} removed=${counts.removed}`,
          );
        } catch (err: any) {
          console.error(
            `[plaid] webhook sync failed for item ${itemId}`,
            err?.response?.data || err?.message || err,
          );
        }
        return;
      }

      // ITEM webhooks: Plaid tells us the connection has gone bad and the
      // user must take action (re-auth, etc). Mark the item, and for the
      // hard error codes nudge the user to reconnect.
      if (type === "ITEM") {
        const errCode = body.error?.error_code ?? code ?? null;
        const errMsg =
          body.error?.error_message ||
          body.error?.display_message ||
          (code ? `Plaid item webhook: ${code}` : "Plaid item error");

        // Action-required codes: mark error + notify.
        const needsReconnect =
          code === "ITEM_LOGIN_REQUIRED" ||
          code === "PENDING_EXPIRATION" ||
          code === "USER_PERMISSION_REVOKED" ||
          code === "USER_ACCOUNT_REVOKED" ||
          code === "ERROR";
        if (needsReconnect) {
          try {
            await storage.markPlaidItemError(itemId, errCode, errMsg);
            await maybeNotifyReconnect(item, errCode);
            console.log(
              `[plaid] webhook ITEM item=${itemId} code=${code} → marked error & notified`,
            );
          } catch (err) {
            console.error(`[plaid] webhook ITEM handling failed for ${itemId}`, err);
          }
        } else {
          // Informational ITEM codes (NEW_ACCOUNTS_AVAILABLE, WEBHOOK_UPDATE_ACKNOWLEDGED, etc.)
          console.log(`[plaid] webhook ITEM item=${itemId} code=${code} (informational)`);
        }
      }
    } catch (err) {
      console.error("[plaid] webhook", err);
      if (!res.headersSent) res.status(200).json({ ok: false });
    }
  });

  // Disconnect an item (local delete only — Plaid-side /item/remove is a
  // follow-up so we don't accidentally leave orphan webhooks in sandbox).
  app.delete("/api/plaid/items/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const ok = await storage.deletePlaidItem(req.params.id, userId);
      res.json({ ok });
    } catch (err) {
      console.error("[plaid] delete item", err);
      res.status(500).json({ error: "Failed to disconnect" });
    }
  });
}
