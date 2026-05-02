import type { Express } from "express";

import { requireAuth } from "./_shared";

export function registerVoiceExtrasRoutes(app: Express): void {
  // Calendar Sync — not yet available
  app.get("/api/integrations/calendar/google/status", requireAuth, async (req, res) => {
    res.json({
      connected: false,
      available: false,
      message: "Google Calendar integration is not yet available.",
    });
  });

  app.post("/api/integrations/calendar/google/connect", requireAuth, async (_req, res) => {
    res.status(503).json({
      error: "not_available",
      message: "Google Calendar sync is coming in a future update. Check back soon.",
    });
  });

  // Voice Query / Response — not yet available
  app.post("/api/voice/query", requireAuth, async (_req, res) => {
    res.status(503).json({
      error: "not_available",
      message: "Voice query support is coming in a future update.",
    });
  });

  app.post("/api/voice/response", requireAuth, async (_req, res) => {
    res.status(503).json({
      error: "not_available",
      message: "Voice response support is coming in a future update.",
    });
  });
}
