import type { Express } from "express";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { requireAuth } from "./_shared";

export function registerHealthMetricsRoutes(app: Express): void {
  // ─── Workout Sessions Analytics ─────────────────────────────────────────────
  app.get("/api/workout-sessions/analytics", requireAuth, async (req: any, res) => {
    const userId = req.user!.id;
    try {
      const weeklyResult = await db.execute(sql`
        SELECT
          to_char(DATE_TRUNC('week', started_at), 'IYYY-"W"IW') as week,
          COUNT(*) as session_count,
          COALESCE(SUM(duration_seconds), 0) as total_seconds
        FROM workout_sessions
        WHERE user_id = ${userId} AND status = 'completed'
          AND started_at > NOW() - INTERVAL '16 weeks'
        GROUP BY DATE_TRUNC('week', started_at)
        ORDER BY week
      `);

      const prResult = await db.execute(sql`
        SELECT
          title,
          MAX(sets_completed) as max_sets,
          MAX(logged_at) as last_logged,
          MAX(CASE WHEN weight_per_set IS NOT NULL
            THEN (regexp_match(weight_per_set, '[0-9]+\.?[0-9]*'))[1]::numeric
            ELSE NULL END) as max_weight
        FROM workout_session_steps
        WHERE user_id = ${userId} AND step_type = 'strength' AND completed = true
        GROUP BY title
        ORDER BY max_weight DESC NULLS LAST, max_sets DESC NULLS LAST
        LIMIT 10
      `);

      const statsResult = await db.execute(sql`
        SELECT
          COUNT(*) FILTER (WHERE status = 'completed') as total_completed,
          COALESCE(SUM(duration_seconds) FILTER (WHERE status = 'completed'), 0) as total_seconds,
          COUNT(*) FILTER (WHERE status = 'completed' AND completed_at > NOW() - INTERVAL '7 days') as this_week
        FROM workout_sessions
        WHERE user_id = ${userId}
      `);

      const stats = statsResult.rows[0] as any;
      res.json({
        weeklyActivity: weeklyResult.rows,
        personalRecords: prResult.rows,
        totalSessions: Number(stats?.total_completed || 0),
        totalMinutes: Math.round(Number(stats?.total_seconds || 0) / 60),
        thisWeek: Number(stats?.this_week || 0),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Push Notification Subscriptions ────────────────────────────────────────
  app.post("/api/push/subscribe", requireAuth, async (req: any, res) => {
    const userId = req.user!.id;
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: "Missing subscription data" });
    }
    try {
      await db.execute(sql`
        INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
        VALUES (${userId}, ${endpoint}, ${keys.p256dh}, ${keys.auth})
        ON CONFLICT (endpoint) DO UPDATE SET
          user_id = ${userId},
          p256dh = ${keys.p256dh},
          auth = ${keys.auth},
          updated_at = NOW()
      `);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/push/subscribe", requireAuth, async (req: any, res) => {
    const userId = req.user!.id;
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: "Missing endpoint" });
    try {
      await db.execute(sql`
        DELETE FROM push_subscriptions WHERE user_id = ${userId} AND endpoint = ${endpoint}
      `);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/push/vapid-key", (req, res) => {
    const key = process.env.VAPID_PUBLIC_KEY || "";
    res.json({ publicKey: key });
  });

  // ─── Health Metrics ──────────────────────────────────────────────────────────
  app.get("/api/health-metrics", requireAuth, async (req: any, res) => {
    const userId = req.user!.id;
    const days = Number(req.query.days) || 60;
    try {
      const result = await db.execute(sql`
        SELECT id, user_id, logged_date, steps, sleep_hours, heart_rate, weight_kg, notes, created_at
        FROM health_metrics
        WHERE user_id = ${userId}
          AND logged_date > (CURRENT_DATE - (${days}::int || ' days')::interval)::text
        ORDER BY logged_date DESC
      `);
      const rows = result.rows.map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        loggedDate: r.logged_date,
        steps: r.steps,
        sleepHours: r.sleep_hours,
        heartRate: r.heart_rate,
        weightKg: r.weight_kg,
        notes: r.notes,
        createdAt: r.created_at,
      }));
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/health-metrics", requireAuth, async (req: any, res) => {
    const userId = req.user!.id;
    const { loggedDate, steps, sleepHours, heartRate, weight, notes } = req.body;
    const date = loggedDate || new Date().toISOString().slice(0, 10);
    try {
      const result = await db.execute(sql`
        INSERT INTO health_metrics (user_id, logged_date, steps, sleep_hours, heart_rate, weight_kg, notes)
        VALUES (${userId}, ${date},
          ${steps != null ? steps : null},
          ${sleepHours != null ? sleepHours : null},
          ${heartRate != null ? heartRate : null},
          ${weight != null ? weight : null},
          ${notes || null})
        ON CONFLICT (user_id, logged_date) DO UPDATE SET
          steps = COALESCE(EXCLUDED.steps, health_metrics.steps),
          sleep_hours = COALESCE(EXCLUDED.sleep_hours, health_metrics.sleep_hours),
          heart_rate = COALESCE(EXCLUDED.heart_rate, health_metrics.heart_rate),
          weight_kg = COALESCE(EXCLUDED.weight_kg, health_metrics.weight_kg),
          notes = COALESCE(EXCLUDED.notes, health_metrics.notes)
        RETURNING id, user_id, logged_date, steps, sleep_hours, heart_rate, weight_kg, notes
      `);
      const r = result.rows[0] as any;
      res.json({
        id: r.id, userId: r.user_id, loggedDate: r.logged_date,
        steps: r.steps, sleepHours: r.sleep_hours, heartRate: r.heart_rate,
        weightKg: r.weight_kg, notes: r.notes,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/health-metrics/:id", requireAuth, async (req: any, res) => {
    const userId = req.user!.id;
    const { id } = req.params;
    try {
      await db.execute(sql`
        DELETE FROM health_metrics WHERE id = ${id} AND user_id = ${userId}
      `);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}
