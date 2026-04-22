import type { Express } from "express";
import { z } from "zod";

import { requireAuth } from "./_shared";
import { storage } from "../storage";
import { getUserContextSnapshot, toPromptString } from "../lib/user-context";
import {
  DW_REALTIME_MODEL,
  DW_REALTIME_VOICE,
  buildDWInstructions,
  getDWMode,
} from "@shared/dw-persona";

const sessionBodySchema = z.object({
  mode: z.string().optional(),
  // Optional client override. When provided we trust the caller and use it
  // verbatim; otherwise we derive a fresh snapshot server-side so the
  // realtime model never operates on stale data.
  userContextSummary: z.string().max(4000).optional(),
});

function getOpenAIKey(): string | null {
  return process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY || null;
}

export function registerRealtimeRoutes(app: Express): void {
  // Mints an ephemeral OpenAI Realtime client_secret so the browser can
  // open a WebRTC session directly with OpenAI without our API key
  // ever touching the client.
  app.post("/api/realtime/session", requireAuth, async (req, res) => {
    const apiKey = getOpenAIKey();
    if (!apiKey) {
      return res
        .status(503)
        .json({ error: "Voice mode is not configured on this server." });
    }

    const parsed = sessionBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid session request." });
    }

    const userId = req.session.userId!;
    const mode = getDWMode(parsed.data.mode);

    let userName: string | null = null;
    let contextSummary: string | null = parsed.data.userContextSummary ?? null;
    try {
      // Always mint realtime sessions with a fresh snapshot — voice mode
      // is the most context-sensitive surface and a 60s stale window is
      // unacceptable when the user is mid-conversation.
      const snap = await getUserContextSnapshot(userId, { forceFresh: true });
      userName = snap.identity.firstName || null;
      // Only derive the summary server-side when the client did not supply one.
      if (!contextSummary) contextSummary = toPromptString(snap);
    } catch {
      // Fall back to a minimal user lookup so the session still mints if
      // the snapshot fetch fails for any reason.
      try {
        const user = await storage.getUser(userId);
        userName = (user?.firstName || user?.username || "").trim() || null;
      } catch {
        userName = null;
      }
    }

    const instructions = buildDWInstructions({
      mode,
      userName,
      userContextSummary: contextSummary,
    });

    try {
      const upstream = await fetch("https://api.openai.com/v1/realtime/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: DW_REALTIME_MODEL,
          voice: DW_REALTIME_VOICE,
          modalities: ["audio", "text"],
          instructions,
          input_audio_transcription: { model: "whisper-1" },
          turn_detection: {
            type: "server_vad",
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 600,
          },
          temperature: 0.85,
        }),
      });

      if (!upstream.ok) {
        const errText = await upstream.text().catch(() => "");
        console.error("[realtime] session create failed", upstream.status, errText);
        return res.status(502).json({
          error: "Could not start voice session. Please try again.",
        });
      }

      const sessionData = (await upstream.json()) as {
        client_secret?: { value?: string; expires_at?: number };
        id?: string;
      };

      const secret = sessionData.client_secret?.value;
      if (!secret) {
        return res.status(502).json({ error: "Voice session response was malformed." });
      }

      res.json({
        clientSecret: secret,
        expiresAt: sessionData.client_secret?.expires_at ?? null,
        sessionId: sessionData.id ?? null,
        model: DW_REALTIME_MODEL,
        voice: DW_REALTIME_VOICE,
        mode,
      });
    } catch (err) {
      console.error("[realtime] session create exception", err);
      res.status(500).json({ error: "Could not start voice session." });
    }
  });
}
