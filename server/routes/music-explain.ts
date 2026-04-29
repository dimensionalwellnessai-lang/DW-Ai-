import type { Express } from "express";

import { storage } from "../storage";

import { openai } from "../openai";
import { aiContentLimiter } from "./_limiters";



export function registerMusicExplainRoutes(app: Express): void {
  app.get("/api/browse/music", aiContentLimiter, async (req, res) => {
    try {
      const userId = req.session?.userId;
      let personalCtx = "";
      if (userId) {
        try {
          const [profile, goals, onboarding] = await Promise.all([
            storage.getUserProfile(userId),
            storage.getGoals(userId),
            storage.getOnboardingProfile(userId),
          ]);
          const lp = (profile?.lifestylePreferences ?? {}) as Record<string, string>;
          const parts = [
            lp.musicLikes ? `Music they like: ${lp.musicLikes}` : "",
            lp.identityVision ? `Aspiring to: ${lp.identityVision}` : "",
            onboarding?.wellnessFocus?.length ? `Wellness focus: ${onboarding.wellnessFocus.join(", ")}` : "",
            goals.filter((g: any) => g.isActive).slice(0, 2).map((g: any) => g.title).join(", "),
          ].filter(Boolean).join(". ");
          personalCtx = parts;
        } catch { /* non-fatal */ }
      }

      const hour = new Date().getHours();
      const timeOfDay = hour < 9 ? "morning" : hour < 12 ? "late morning" : hour < 17 ? "afternoon" : hour < 21 ? "evening" : "night";

      const prompt = `${personalCtx ? `User context: ${personalCtx}.` : ""}
Time of day: ${timeOfDay}.

Generate 6 music playlist/genre/mood recommendations that would genuinely suit this person right now. Mix moods and purposes — some for energy, some for focus, some for wind-down. Each should link to both Spotify search and YouTube Music search.

Return ONLY this JSON:
{"playlists":[{"id":"m1","title":"Playlist or Vibe Name","mood":"Energy/Focus/Chill/etc","genre":"Genre","description":"1 sentence describing the sound and feeling","why":"1 sentence why this fits this person right now","spotifySearchUrl":"https://open.spotify.com/search/[URL-encoded query]","youtubeSearchUrl":"https://www.youtube.com/results?search_query=[URL-encoded query]","appleMusicSearchUrl":"https://music.apple.com/search?term=[URL-encoded query]"}]}`;

      let playlists: any[] = [];
      const perplexityApiKey = process.env.PERPLEXITY_API_KEY;
      if (perplexityApiKey) {
        try {
          const pxRes = await fetch("https://api.perplexity.ai/chat/completions", {
            signal: AbortSignal.timeout(20000),
            method: "POST",
            headers: { "Authorization": `Bearer ${perplexityApiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "llama-3.1-sonar-large-128k-online",
              messages: [{ role: "user", content: prompt }],
              temperature: 0.5, max_tokens: 1200,
            }),
          });
          if (pxRes.ok) {
            const pxData = await pxRes.json();
            let raw = (pxData.choices?.[0]?.message?.content || "").trim();
            if (raw.startsWith("```")) raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
            const si = raw.indexOf("{"); const ei = raw.lastIndexOf("}");
            if (si !== -1 && ei !== -1) playlists = JSON.parse(raw.substring(si, ei + 1)).playlists || [];
          }
        } catch { /* fall through */ }
      }
      if (!playlists.length) {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7, max_tokens: 900,
        });
        const raw = (completion.choices[0]?.message?.content ?? "{}").trim()
          .replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
        try { playlists = JSON.parse(raw).playlists || []; } catch { playlists = []; }
      }
      res.json({ playlists });
    } catch (err) {
      console.error("[browse/music]", err);
      res.status(500).json({ playlists: [] });
    }
  });

  // DW Explain — inline educational explanations personalized to the user's context
  app.post("/api/ai/explain", async (req, res) => {
    try {
      const { topic, userContext } = req.body as {
        topic: string;
        userContext?: Record<string, unknown>;
      };
      if (!topic || topic.trim().length < 3) return res.status(400).json({ error: "topic required" });

      const contextStr = userContext && Object.keys(userContext).length > 0
        ? `\n\nHere is what I know about this person: ${JSON.stringify(userContext)}`
        : "";

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are DW — a personal life intelligence system. Your job is to explain real-life topics clearly and honestly, in plain conversational English. Never use jargon without explaining it immediately in parentheses. Always connect your explanation to the person's specific situation. Structure: start with the direct answer first, then explain the "why", then give one concrete thing they can do today. Keep it under 200 words. Use short paragraphs (2-3 sentences max). Be warm, direct, never preachy or generic.`,
          },
          {
            role: "user",
            content: `Explain this specifically for my situation: ${topic.trim()}${contextStr}`,
          },
        ],
        max_tokens: 320,
        temperature: 0.72,
      });

      const explanation = completion.choices[0]?.message?.content?.trim() || "";
      res.json({ explanation });
    } catch (err) {
      console.error("[ai/explain]", err);
      res.status(500).json({ error: "Failed to generate explanation" });
    }
  });

  // Context-aware transcript correction — fix Whisper misrecognitions using conversation history
  app.post("/api/ai/fix-transcript", async (req, res) => {
    try {
      const { transcript, context } = req.body as {
        transcript: string;
        context?: Array<{ role: string; content: string }>;
      };
      if (!transcript || transcript.trim().length === 0) {
        return res.status(400).json({ error: "transcript required" });
      }
      const recentContext = (context ?? [])
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-6)
        .map((m) => `${m.role === "user" ? "User" : "DW"}: ${m.content.slice(0, 200)}`)
        .join("\n");

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a speech-to-text correction assistant. You will receive a raw voice transcript that may have misheard words, wrong homophones, missing punctuation, or garbled phrases. Using the conversation context, correct only actual errors — do not rephrase or expand. Return ONLY the corrected transcript text, nothing else. If the transcript is already correct, return it unchanged.`,
          },
          {
            role: "user",
            content: `Conversation so far:\n${recentContext || "(no prior context)"}\n\nRaw transcript to correct:\n"${transcript.trim()}"`,
          },
        ],
        max_tokens: 256,
        temperature: 0.2,
      });

      const corrected = completion.choices[0]?.message?.content?.trim() || transcript;
      res.json({ text: corrected.replace(/^["']|["']$/g, "").trim() });
    } catch (err) {
      console.error("[ai/fix-transcript]", err);
      res.json({ text: req.body?.transcript ?? "" });
    }
  });

  // Proactive DW opener for returning users — based on today's schedule/habits context
}
