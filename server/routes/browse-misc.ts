import type { Express } from "express";

import { storage } from "../storage";

import { openai } from "../openai";
import { aiContentLimiter } from "./_limiters";



export function registerBrowseMiscRoutes(app: Express): void {
  app.get("/api/browse/entertainment", aiContentLimiter, async (req, res) => {
    try {
      const userId = req.session?.userId;
      let personalCtx = "";
      if (userId) {
        try {
          const [profile, onboarding, goals] = await Promise.all([
            storage.getUserProfile(userId),
            storage.getOnboardingProfile(userId),
            storage.getGoals(userId),
          ]);
          const lp = (profile?.lifestylePreferences ?? {}) as Record<string, string>;
          const parts = [
            lp.identityVision ? `Becoming: ${lp.identityVision}` : "",
            lp.watchLikes ? `Likes to watch: ${lp.watchLikes}` : "",
            lp.styleLikes ? `Style/vibe: ${lp.styleLikes}` : "",
            lp.musicLikes ? `Music/audio: ${lp.musicLikes}` : "",
            onboarding?.wellnessFocus?.length ? `Wellness focus: ${onboarding.wellnessFocus.join(", ")}` : "",
            goals.filter((g: any) => g.isActive).slice(0, 3).map((g: any) => g.title).join(", "),
          ].filter(Boolean).join(". ");
          personalCtx = parts;
        } catch { /* non-fatal */ }
      }
      const perplexityApiKey = process.env.PERPLEXITY_API_KEY;
      const prompt = `${personalCtx ? `User context: ${personalCtx}.` : ""}

Search the web for 6 specific TV shows or movies worth watching right now. Mix streaming platforms (Netflix, Hulu, HBO Max, Disney+, Amazon Prime, Apple TV+, YouTube). Pick shows/movies that fit the user's vibe and goals if context is given.

Return ONLY this JSON, no other text:
{"shows":[{"id":"s1","title":"Show or Movie Name","synopsis":"2 sentences about what it is","platform":"Netflix","type":"show or movie","genre":"Drama/Crime/etc","whyPicked":"1 sentence why this fits this person","searchUrl":"https://www.google.com/search?q=Show+Name+watch+online"}]}`;

      let shows: any[] = [];
      if (perplexityApiKey) {
        try {
          const pxRes = await fetch("https://api.perplexity.ai/chat/completions", { signal: AbortSignal.timeout(25000),
            method: "POST",
            headers: { "Authorization": `Bearer ${perplexityApiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "llama-3.1-sonar-large-128k-online",
              messages: [{ role: "user", content: prompt }],
              temperature: 0.3, max_tokens: 1500,
            }),
          });
          if (pxRes.ok) {
            const pxData = await pxRes.json();
            let raw = (pxData.choices?.[0]?.message?.content || "").trim();
            if (raw.startsWith("```")) raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
            const startIdx = raw.indexOf("{"); const endIdx = raw.lastIndexOf("}");
            if (startIdx !== -1 && endIdx !== -1) {
              const parsed = JSON.parse(raw.substring(startIdx, endIdx + 1));
              shows = parsed.shows || [];
            }
          }
        } catch { /* fall through to OpenAI */ }
      }
      if (!shows.length) {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7, max_tokens: 1000,
        });
        const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
        try {
          const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
          shows = JSON.parse(cleaned).shows || [];
        } catch { shows = []; }
      }
      res.json({ shows });
    } catch (error) {
      console.error("browse/entertainment error:", error);
      res.status(500).json({ shows: [] });
    }
  });

  // ── Browse: Activities ──────────────────────────────────────────────────────
  app.get("/api/browse/activities", aiContentLimiter, async (req, res) => {
    try {
      const userId = req.session?.userId;
      let personalCtx = "";
      if (userId) {
        try {
          const [profile, onboarding, goals] = await Promise.all([
            storage.getUserProfile(userId),
            storage.getOnboardingProfile(userId),
            storage.getGoals(userId),
          ]);
          const lp = (profile?.lifestylePreferences ?? {}) as Record<string, string>;
          personalCtx = [
            lp.identityVision ? `Becoming: ${lp.identityVision}` : "",
            lp.doLikes ? `Enjoys: ${lp.doLikes}` : "",
            lp.goLikes ? `Likes going to: ${lp.goLikes}` : "",
            lp.styleLikes ? `Vibe/aesthetic: ${lp.styleLikes}` : "",
            onboarding?.shortTermGoals ? `Working on: ${onboarding.shortTermGoals}` : "",
            goals.filter((g: any) => g.isActive).slice(0, 2).map((g: any) => g.title).join(", "),
          ].filter(Boolean).join(". ");
        } catch { /* non-fatal */ }
      }

      // Use the slot from query param (sent by frontend with time context) or detect server-side
      const slotParam = req.query.slot as string | undefined;
      const hour = new Date().getHours();
      const detectedSlot = hour >= 5 && hour < 9 ? "morning"
        : hour >= 9 && hour < 12 ? "late-morning"
        : hour >= 12 && hour < 17 ? "afternoon"
        : hour >= 17 && hour < 21 ? "evening"
        : "night";
      const slot = slotParam || detectedSlot;

      const slotConfig: Record<string, { label: string; intent: string; avoid: string; examples: string }> = {
        "morning":      { label: "early morning (5–9 AM)", intent: "energise and set a positive tone for the day", avoid: "evening, wind-down, dinner, or late-night activities", examples: "quick workout, journaling, cold shower, healthy breakfast prep, morning walk" },
        "late-morning": { label: "mid-morning (9 AM–12 PM)", intent: "build momentum and focus for the rest of the day", avoid: "sleep, wind-down, dinner, or late-night activities", examples: "deep work session, gym, healthy brunch, skill practice, outdoor walk" },
        "afternoon":    { label: "afternoon (12–5 PM)", intent: "sustain energy, beat the slump, and recharge midday", avoid: "morning routines, sleep, heavy dinner, or late-night activities", examples: "power nap, lunch walk, stretching break, call a friend, creative project" },
        "evening":      { label: "evening (5–9 PM)", intent: "decompress, connect, and transition into a restful night", avoid: "morning routines, breakfast activities, or anything that implies starting a new day", examples: "evening walk, light yoga, cook dinner, journal, read a book, spend time with family/friends" },
        "night":        { label: "night (9 PM+)", intent: "wind down and prepare body and mind for quality sleep", avoid: "morning routines, high-intensity workouts, screen-heavy activities, or anything energising", examples: "meditation, light stretching, gratitude journaling, herbal tea, reading, sleep preparation" },
      };
      const cfg = slotConfig[slot] ?? slotConfig["evening"];

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: `${personalCtx ? `About this person: ${personalCtx}.\n\n` : ""}It is ${cfg.label}.

Suggest 6 specific activities for RIGHT NOW — activities that fit what people actually do at ${cfg.label}. The intent is to ${cfg.intent}.

CRITICAL RULES:
- Do NOT suggest ${cfg.avoid}
- Every title must feel natural for ${cfg.label} — no "morning" in titles if it's not morning, no "wind-down" if it's morning, etc.
- Activity titles should be vivid and specific, NOT generic (e.g. "Cook a nourishing dinner together" not just "Cooking")
- Mix indoor, outdoor, and social options
- Some quick (15–30 min), some longer (45–60 min)
- Good examples of appropriate activities: ${cfg.examples}

Return ONLY this JSON (no markdown):
{"activities":[{"id":"a1","title":"Specific vivid title","description":"1-2 sentences — what to do exactly and why it's perfect for this time of day","type":"indoor or outdoor or social","duration":"30 min","whyPicked":"1 sentence connecting this to their goals or the time","canAddToSchedule":true,"suggestedTime":"${cfg.label}"}]}` }],
        temperature: 0.85, max_tokens: 1000,
      });
      const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
      let activities: any[] = [];
      try {
        const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
        activities = JSON.parse(cleaned).activities || [];
      } catch { activities = []; }
      res.json({ activities });
    } catch (error) {
      console.error("browse/activities error:", error);
      res.status(500).json({ activities: [] });
    }
  });

  // ── Browse: Learning ────────────────────────────────────────────────────────
  app.get("/api/browse/learning", aiContentLimiter, async (req, res) => {
    try {
      const userId = req.session?.userId;
      let personalCtx = "";
      if (userId) {
        try {
          const [profile, onboarding, goals] = await Promise.all([
            storage.getUserProfile(userId),
            storage.getOnboardingProfile(userId),
            storage.getGoals(userId),
          ]);
          const lp = (profile?.lifestylePreferences ?? {}) as Record<string, string>;
          personalCtx = [
            lp.identityVision ? `Becoming: ${lp.identityVision}` : "",
            lp.readLikes ? `Likes reading about: ${lp.readLikes}` : "",
            lp.doLikes ? `Enjoys: ${lp.doLikes}` : "",
            onboarding?.longTermGoals ? `Long-term vision: ${onboarding.longTermGoals}` : "",
            onboarding?.wellnessFocus?.length ? `Focus areas: ${onboarding.wellnessFocus.join(", ")}` : "",
            goals.filter((g: any) => g.isActive).slice(0, 3).map((g: any) => g.title).join(", "),
          ].filter(Boolean).join(". ");
        } catch { /* non-fatal */ }
      }
      const perplexityApiKey = process.env.PERPLEXITY_API_KEY;
      const prompt = `${personalCtx ? `About this person: ${personalCtx}.` : ""}

Search the web and find 5 real learning resources — YouTube videos, online courses, articles, or podcasts — that would help this person grow in areas that match their goals and interests. Use real URLs.

Return ONLY this JSON:
{"resources":[{"id":"r1","title":"Resource title","description":"1-2 sentences about what you'll learn","source":"YouTube / Coursera / etc","url":"https://real.url","duration":"20 min / 4 hours / etc","type":"video or course or article or podcast","whyPicked":"1 sentence why this matters for their goals","canAddToSchedule":true}]}`;

      let resources: any[] = [];
      if (perplexityApiKey) {
        try {
          const pxRes = await fetch("https://api.perplexity.ai/chat/completions", { signal: AbortSignal.timeout(25000),
            method: "POST",
            headers: { "Authorization": `Bearer ${perplexityApiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "llama-3.1-sonar-large-128k-online",
              messages: [{ role: "user", content: prompt }],
              temperature: 0.2, max_tokens: 1500,
            }),
          });
          if (pxRes.ok) {
            const pxData = await pxRes.json();
            let raw = (pxData.choices?.[0]?.message?.content || "").trim();
            if (raw.startsWith("```")) raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
            const si = raw.indexOf("{"); const ei = raw.lastIndexOf("}");
            if (si !== -1 && ei !== -1) resources = JSON.parse(raw.substring(si, ei + 1)).resources || [];
          }
        } catch { /* fall through */ }
      }
      if (!resources.length) {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }],
          temperature: 0.7, max_tokens: 900,
        });
        const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
        try {
          const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
          resources = JSON.parse(cleaned).resources || [];
        } catch { resources = []; }
      }
      res.json({ resources });
    } catch (error) {
      console.error("browse/learning error:", error);
      res.status(500).json({ resources: [] });
    }
  });

  // ── Community: Engage (volunteering, events, resources by location) ─────────
}
