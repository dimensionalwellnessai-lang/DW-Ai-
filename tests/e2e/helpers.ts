import { Client } from "pg";
import type { APIRequestContext, BrowserContext, Page } from "@playwright/test";
import { request as pwRequest } from "@playwright/test";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required for e2e tests");
}

export const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:5000";

export function uniqueEmail(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const ts = Date.now().toString(36);
  return `${prefix}-${ts}-${rand}@example.com`;
}

export async function withDb<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

export interface RegisteredUser {
  email: string;
  userId: string;
  cookies: { name: string; value: string; domain: string; path: string }[];
}

export async function registerUser(prefix: string): Promise<RegisteredUser> {
  const email = uniqueEmail(prefix);
  const apiContext: APIRequestContext = await pwRequest.newContext({
    baseURL: BASE_URL,
  });
  const res = await apiContext.post("/api/auth/register", {
    data: { email, password: "Passw0rd!" },
  });
  if (!res.ok()) {
    throw new Error(`register failed ${res.status()}: ${await res.text()}`);
  }
  const body = await res.json();
  const userId: string = body.user.id;
  const state = await apiContext.storageState();
  const cookies = state.cookies.map((c) => ({
    name: c.name,
    value: c.value,
    domain: c.domain,
    path: c.path,
  }));
  await apiContext.dispose();
  return { email, userId, cookies };
}

export async function applyAuth(
  context: BrowserContext,
  user: RegisteredUser,
): Promise<void> {
  const url = new URL(BASE_URL);
  await context.addCookies(
    user.cookies.map((c) => ({
      name: c.name,
      value: c.value,
      domain: c.domain || url.hostname,
      path: c.path || "/",
      sameSite: "Lax" as const,
      httpOnly: true,
      secure: false,
    })),
  );
}

export async function setOnboardingCompleted(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("dw_onboarding_completed", "1");
      window.localStorage.setItem("dw_voice_vibe", "direct");
      window.localStorage.setItem("dw_terms_accepted", "true");
      window.localStorage.setItem("dw_splash_shown", "true");
    } catch {
      /* ignore */
    }
  });
}

export interface SeededWearableUser extends RegisteredUser {
  deviceId: string;
}

export async function seedWearableData(
  userId: string,
): Promise<{ deviceId: string }> {
  return withDb(async (db) => {
    const dev = await db.query<{ id: string }>(
      `INSERT INTO wearable_devices (user_id, device_type, device_name, manufacturer, source, is_active)
       VALUES ($1, 'smartwatch', 'E2E Whoop', 'Whoop', 'whoop', true)
       RETURNING id`,
      [userId],
    );
    const deviceId = dev.rows[0].id;

    await db.query(
      `INSERT INTO wearable_data (device_id, user_id, source, source_record_id, metric_kind, metric_value, recorded_at)
       SELECT $1, $2, 'whoop', concat(k, '-', i::text), k::text, v, now() - (i * interval '1 day')
       FROM generate_series(0, 29) AS s(i),
            (VALUES ('hrv', 55), ('resting_hr', 60), ('sleep_minutes', 420), ('steps', 8000)) AS m(k, v)`,
      [deviceId, userId],
    );

    await db.query(
      `INSERT INTO screen_time_usage (user_id, source, date_key, total_minutes, by_category)
       SELECT $1, 'screen_time', to_char((now() - (i * interval '1 day'))::date, 'YYYY-MM-DD'), 200,
              '{"social":60,"productivity":30}'::jsonb
       FROM generate_series(0, 29) AS s(i)`,
      [userId],
    );

    return { deviceId };
  });
}

export async function cleanupUser(userId: string): Promise<void> {
  await withDb(async (db) => {
    await db.query(`DELETE FROM wearable_data WHERE user_id = $1`, [userId]);
    await db.query(`DELETE FROM screen_time_usage WHERE user_id = $1`, [userId]);
    await db.query(`DELETE FROM wearable_devices WHERE user_id = $1`, [userId]);
    const childTables = await db.query<{ table_name: string; column_name: string }>(
      `SELECT tc.table_name, kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
       JOIN information_schema.constraint_column_usage ccu
         ON tc.constraint_name = ccu.constraint_name
       WHERE tc.constraint_type = 'FOREIGN KEY'
         AND ccu.table_name = 'users'
         AND ccu.column_name = 'id'
         AND tc.table_schema = 'public'`,
    );
    for (const { table_name, column_name } of childTables.rows) {
      await db.query(
        `DELETE FROM "${table_name}" WHERE "${column_name}" = $1`,
        [userId],
      );
    }
    await db.query(`DELETE FROM users WHERE id = $1`, [userId]);
  });
}
