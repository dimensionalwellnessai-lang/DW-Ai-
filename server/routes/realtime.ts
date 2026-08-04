import type { Express } from "express";
import { z } from "zod";

import { requireAuth, requirePaidOrQuota } from "./_shared";
import { storage } from "../storage";
import { getUserContextSnapshot, toPromptString } from "../lib/user-context";
import { pickDWRole, pickInitialRole, PICKER_APPLY_THRESHOLD } from "../lib/dw-role-picker";
import { logDwRolePick } from "../lib/dw-role-pick-log";
import {
  DW_MODES,
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
  app.post("/api/realtime/session", requireAuth, requirePaidOrQuota("voice"), async (req, res) => {
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
    // Initial mode: client may suggest one, but if they didn't, the picker
    // chooses based on time-of-day + snapshot defaults.
    let mode = getDWMode(parsed.data.mode);
    let initialPick: { reason: string; confidence: number } | null = null;

    let userName: string | null = null;
    // Client-supplied text (e.g. recent spoken turns) supplements — never
    // replaces — the server-derived snapshot, so guide context (role map,
    // group challenge) always reaches voice sessions.
    const clientSummary = (parsed.data.userContextSummary ?? "").trim();
    let contextSummary: string | null = clientSummary || null;
    try {
      // Always mint realtime sessions with a fresh snapshot — voice mode
      // is the most context-sensitive surface and a 60s stale window is
      // unacceptable when the user is mid-conversation.
      const snap = await getUserContextSnapshot(userId, { forceFresh: true });
      userName = snap.identity.firstName || null;
      const serverSummary = toPromptString(snap);
      contextSummary = clientSummary
        ? `${serverSummary}\n\nRECENT CONVERSATION (from the client):\n${clientSummary}`
        : serverSummary;
      if (!parsed.data.mode) {
        const opener = pickInitialRole(snap);
        mode = opener.mode;
        initialPick = { reason: opener.reason, confidence: opener.confidence };
      }
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
        modeReason: initialPick?.reason ?? null,
      });
    } catch (err) {
      console.error("[realtime] session create exception", err);
      res.status(500).json({ error: "Could not start voice session." });
    }
  });

  // Per-turn role picker for the voice session. The client posts the latest
  // user transcript here after every spoken turn; we return the picked mode
  // + reason so the client can swap chips and inject a session.update.
  // Honors a client-supplied lock — if the user manually pinned a mode, we
  // echo it back unchanged.
  app.post("/api/realtime/pick-mode", requireAuth, async (req, res) => {
    const schema = z.object({
      message: z.string().min(1).max(2_000),
      lockedMode: z.string().optional(),
      // Hysteresis: client tells us which lane the user is currently in so
      // the picker requires a clearly stronger signal to switch lanes.
      previousMode: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid pick-mode request." });
    }
    const userId = req.session.userId!;

    if (parsed.data.lockedMode) {
      const locked = getDWMode(parsed.data.lockedMode);
      const def = DW_MODES.find((m) => m.id === locked)!;
      logDwRolePick({
        userId,
        surface: "realtime",
        message: parsed.data.message,
        mode: locked,
        source: "locked",
        confidence: 1,
        reason: "user-locked lane",
        locked: true,
        applied: true,
      });
      return res.json({
        mode: locked,
        label: def.label,
        reason: "you picked this lane",
        confidence: 1,
        applied: true,
        locked: true,
      });
    }

    let snap = null;
    try {
      snap = await getUserContextSnapshot(userId);
    } catch {
      // picker handles missing snapshot
    }
    const prevModeForPicker = parsed.data.previousMode
      ? getDWMode(parsed.data.previousMode)
      : null;
    const picked = await pickDWRole(parsed.data.message, snap, { previousMode: prevModeForPicker });
    const def = DW_MODES.find((m) => m.id === picked.mode)!;
    const applied = picked.confidence >= PICKER_APPLY_THRESHOLD;
    logDwRolePick({
      userId,
      surface: "realtime",
      message: parsed.data.message,
      mode: picked.mode,
      source: picked.source,
      confidence: picked.confidence,
      reason: picked.reason,
      locked: false,
      applied,
    });
    res.json({
      mode: picked.mode,
      label: def.label,
      reason: picked.reason,
      confidence: picked.confidence,
      applied,
      locked: false,
    });
  });
}
