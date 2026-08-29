import type { Express } from "express";
import multer from "multer";

import { storage } from "../storage";

import { ttsLimiter, upload } from "./_limiters";

import { openai } from "../openai";



export function registerMediaMiscRoutes(app: Express): void {
  app.post("/api/tts", ttsLimiter, async (req, res) => {
    try {
      const { text, voice = "alloy", speed = 1.0 } = req.body as {
        text?: string;
        voice?: string;
        speed?: number;
      };

      if (!text || typeof text !== "string" || text.trim().length === 0) {
        return res.status(400).json({ error: "text is required" });
      }

      const trimmedText = text.trim().slice(0, 1000); // cap at 1000 chars

      const response = await openai.audio.speech.create({
        model: "tts-1",
        voice: voice as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer",
        input: trimmedText,
        speed: Math.max(0.25, Math.min(4.0, speed)),
      });

      const buffer = Buffer.from(await response.arrayBuffer());
      res.set({
        "Content-Type": "audio/mpeg",
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "public, max-age=300",
      });
      res.send(buffer);
    } catch (err: any) {
      console.error("[TTS] Error:", err?.message ?? err);
      res.status(500).json({ error: "TTS generation failed" });
    }
  });

  // ── Speech-to-text transcription ─────────────────────────────────────────
  app.post("/api/transcribe", async (req, res) => {
    const transcribeUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } }).single("audio");
    transcribeUpload(req, res, async (err) => {
      if (err) return res.status(400).json({ error: "File upload failed" });
      try {
        const file = req.file;
        if (!file) return res.status(400).json({ error: "No audio file provided" });

        if (process.env.DEEPGRAM_API_KEY) {
          try {
            const response = await fetch("https://api.deepgram.com/v1/listen?model=nova-3&language=en&smart_format=true", {
              method: "POST",
              headers: {
                Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
                "Content-Type": file.mimetype || "audio/webm",
              },
              body: file.buffer,
              signal: AbortSignal.timeout(30_000),
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json() as {
              results?: {
                channels?: Array<{
                  alternatives?: Array<{
                    transcript?: string;
                  }>;
                }>;
              };
            };
            const transcript = data.results?.channels?.[0]?.alternatives?.[0]?.transcript;
            if (!transcript || transcript.trim().length === 0) throw new Error("Empty transcript");

            return res.json({ text: transcript });
          } catch (deepgramError: any) {
            console.error("[Transcribe] Deepgram failed, falling back to OpenAI transcription:", deepgramError?.message ?? deepgramError);
          }
        }

        const { toFile } = await import("openai");
        const audioFile = await toFile(file.buffer, file.originalname || "audio.webm", {
          type: file.mimetype || "audio/webm",
        });
        const transcription = await openai.audio.transcriptions.create({
          model: "gpt-4o-mini-transcribe",
          file: audioFile,
          language: "en",
        });
        res.json({ text: transcription.text });
      } catch (e: any) {
        console.error("[Transcribe] Error:", e?.message ?? e);
        res.status(500).json({ error: "Transcription failed" });
      }
    });
  });

  // ── Assistant action analytics ──────────────────────────────────────────
  app.post("/api/assistant/log", async (req, res) => {
    try {
      const { platform, source, action, parametersJson, success, durationMs } = req.body as {
        platform?: string;
        source?: string;
        action?: string;
        parametersJson?: string;
        success?: boolean;
        durationMs?: number;
      };
      console.log("[AssistantAction]", { platform, source, action, success, durationMs });
      res.json({ ok: true });
    } catch {
      res.json({ ok: false });
    }
  });

}
