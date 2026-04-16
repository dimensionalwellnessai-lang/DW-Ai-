import type { Express } from "express";
import type { Request, Response } from "express";

import { analyticsLimiter } from "./_limiters";

import { getAiConfigStatus } from "../openai";

import { googleVisionService } from "../google-vision";


const ANALYTICS_KNOWN_EVENT_NAMES = new Set([
  "quick_setup_started", "quick_setup_completed", "starter_object_created",
  "dw_first_message_shown", "starter_spotlight_clicked", "starter_spotlight_dismissed",
  "app_opened_new_day", "completed_first_action",
  "followup_created", "followup_accepted", "followup_snoozed", "followup_dismissed",
  "plan_visited", "plan_activated", "plan_completed",
  "checkin_completed", "checkin_submitted",
  "reminder_set", "reminder_interacted",
]);

export function registerAnalyticsHealthRoutes(app: Express): void {
  app.post("/api/analytics/events", analyticsLimiter, (req: Request, res: Response) => {
    try {
      const { events } = req.body as { events?: unknown };
      if (!Array.isArray(events)) {
        return res.status(400).json({ error: "events must be an array" });
      }

      // Truncate a string field to a safe length (prevents log injection)
      const truncate = (v: unknown, max = 64): string | undefined =>
        typeof v === "string" ? v.slice(0, max) : undefined;

      let logged = 0;
      for (const event of events.slice(0, 100)) {
        if (!event || typeof event !== "object") continue;
        const e = event as Record<string, unknown>;
        const name = truncate(e.name, 64);
        if (!name || !ANALYTICS_KNOWN_EVENT_NAMES.has(name)) continue;

        // Sanitize payload: keep only scalar/non-PII fields, cap string lengths
        const rawPayload = e.payload && typeof e.payload === "object" ? e.payload as Record<string, unknown> : {};
        const safePayload: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(rawPayload)) {
          if (typeof v === "number" || typeof v === "boolean") {
            safePayload[k] = v;
          } else if (typeof v === "string") {
            safePayload[k] = v.slice(0, 128);
          }
        }

        const ts = typeof e.ts === "number" ? e.ts : undefined;
        const env = e.env === "dev" || e.env === "prod" ? e.env : undefined;
        const sessionId = truncate(e.sessionId, 36);

        console.log("[analytics]", JSON.stringify({ name, payload: safePayload, ts, env, sessionId }));
        logged++;
      }

      return res.json({ received: logged });
    } catch (err) {
      console.error("POST /api/analytics/events error:", err);
      return res.status(500).json({ error: "Failed to process analytics events" });
    }
  });

  // AI health check – reports config status without exposing secret values
  app.get("/api/health/ai", (_req, res) => {
    const { configured, missing } = getAiConfigStatus();
    if (configured) {
      return res.json({ configured: true });
    }
    return res.status(503).json({ configured: false, missing });
  });

  // Email health check – lightweight, side-effect-free.
  // Reports whether email is configured and whether a custom sending domain is set,
  // based solely on environment variables to avoid repeatedly instantiating clients.
  app.get("/api/health/email", (_req, res) => {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;

    if (!apiKey) {
      return res.status(503).json({
        configured: false,
        error: "Email service not configured. Set RESEND_API_KEY (and optionally RESEND_FROM_EMAIL) environment variables.",
      });
    }

    const usingSharedDomain = !fromEmail;
    const resolvedFrom = fromEmail ?? 'onboarding@resend.dev';

    return res.json({
      configured: true,
      usingSharedDomain,
      fromAddress: resolvedFrom,
      hint: usingSharedDomain
        ? "Email will be sent from the Resend shared sender (onboarding@resend.dev). " +
          "To use a branded from-address, verify your domain at https://resend.com/domains " +
          "and set the RESEND_FROM_EMAIL environment variable."
        : "Custom sending domain is configured.",
    });
  });

  // OCR status – reports which OCR providers are available
  app.get("/api/ocr/status", (_req, res) => {
    const visionConfigured = googleVisionService.isConfigured();
    res.json({
      tesseract: true,
      googleVision: visionConfigured,
      enhancedOcrConfigured: visionConfigured,
      hint: visionConfigured
        ? "Both Tesseract and Google Vision OCR are available."
        : "Only basic OCR (Tesseract) is active. Set the GOOGLE_VISION_API_KEY environment variable to enable enhanced image text extraction.",
    });
  });

  // ─── Week Planner ─────────────────────────────────────────────────────────

  // Maps AI-planner categories to known calendar event types so all calendar
  // views (month, week, daily) apply the correct colour without a fallback.
  const PLANNER_CATEGORY_TO_EVENT_TYPE: Record<string, string> = {
    workout: "workout",
    meal: "meal",
    work: "event",
    personal: "event",
    social: "event",
    wellness: "meditation",
    sleep: "event",
  };

  // POST /api/week-planner/chat – AI conversation that builds a personalised weekly schedule
}
