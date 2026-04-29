import type { Express } from "express";

import { storage } from "../storage";

import { generateDiscoverRandomContent } from "../openai";
import { aiContentLimiter } from "./_limiters";



import { DISCOVER_STATIC_LIBRARY } from "../discover-static";

export function registerDiscoverFeedRoutes(app: Express): void {
  app.get("/api/discover/feed", aiContentLimiter, async (req, res) => {
    try {
      const userId = req.session?.userId;
      const page = parseInt(req.query.page as string) || 1;

      // Fetch user context for personalization
      let profileCtx = "";
      let firstGoalTitle = "";
      if (userId) {
        try {
          const profile = await storage.getUserProfile(userId);
          const goals = (await storage.getGoals(userId)).filter((g: any) => g.status === "active");
          firstGoalTitle = goals[0]?.title || "";
          const lp = (profile as any)?.lifestylePreferences;
          const parts = [
            profile?.occupation && `Occupation: ${profile.occupation}`,
            profile?.interests?.length && `Interests: ${(profile.interests as string[]).join(", ")}`,
            lp?.identityVision && `Identity vision: ${lp.identityVision}`,
            lp?.styleLikes && `Style: ${lp.styleLikes}`,
            lp?.watchLikes && `Watches: ${lp.watchLikes}`,
            lp?.readLikes && `Reads: ${lp.readLikes}`,
            goals.length && `Active goals: ${goals.map((g: any) => g.title).join(", ")}`,
          ].filter(Boolean);
          profileCtx = parts.join(". ");
        } catch (_) {}
      }

      const perplexityKey = process.env.PERPLEXITY_API_KEY;
      const cards: any[] = [];
      const ts = Date.now();

      const pxPost = async (systemMsg: string, userMsg: string) => {
        const r = await fetch("https://api.perplexity.ai/chat/completions", { signal: AbortSignal.timeout(25000),
          method: "POST",
          headers: { Authorization: `Bearer ${perplexityKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "sonar",
            messages: [
              { role: "system", content: systemMsg },
              { role: "user", content: userMsg },
            ],
            max_tokens: 2000,
          }),
        });
        if (!r.ok) return null;
        const d = await r.json();
        const text: string = d.choices?.[0]?.message?.content || "";
        const m = text.match(/\[[\s\S]*?\]/);
        if (!m) return null;
        try { return JSON.parse(m[0]); } catch { return null; }
      };

      if (perplexityKey) {
        // ── FOR YOU: personalized real content ──
        try {
          const forYouQ = profileCtx
            ? `Find 5 specific real articles or YouTube videos for someone with this profile: ${profileCtx}. Focus on personal development, wellness, productivity, or their stated interests. Return ONLY a JSON array with fields: title (string), url (real URL), source (e.g. YouTube/Medium/TED), summary (2 sentences), synopsis (4 sentences with more depth), type ("article"|"video"), dimension ("emotional"|"physical"|"financial"|"social"|"spiritual"|"intellectual"|"environmental"|"purpose"|"general").`
            : `Find 5 real trending personal development or wellness articles/videos right now. Return ONLY a JSON array: title, url, source, summary (2 sentences), synopsis (4 sentences), type ("article"|"video"), dimension.`;
          const forYouItems = await pxPost("You are a wellness content curator. Return ONLY valid JSON arrays. Use only real, verifiable URLs.", forYouQ);
          if (Array.isArray(forYouItems)) {
            for (const item of forYouItems.slice(0, 5)) {
              if (!item.title) continue;
              cards.push({
                id: `fy-p${page}-${cards.length}-${ts}`,
                type: item.type === "video" ? "video" : "article",
                bucket: "for_you",
                title: String(item.title).slice(0, 120),
                summary: String(item.summary || "").slice(0, 200),
                synopsis: String(item.synopsis || item.summary || "").slice(0, 600),
                dwConnection: firstGoalTitle
                  ? `This connects to your goal of "${firstGoalTitle}" and nurtures your ${item.dimension || "general"} dimension.`
                  : `Chosen to support your personal growth and ${item.dimension || "general"} wellness.`,
                url: String(item.url || ""),
                source: String(item.source || "Web"),
                dimension: String(item.dimension || "general"),
                readTime: item.type === "video" ? "Watch" : "Read",
              });
            }
          }
        } catch (e) { console.error("Discover for_you error:", e); }

        // ── EXPLORE: new, adjacent topics ──
        try {
          const exploreQ = profileCtx
            ? `Find 5 real fascinating articles or videos on topics this person would find enriching but probably hasn't explored yet, based on their profile: ${profileCtx}. Choose topics adjacent to their interests but genuinely new — history, science, philosophy, art, culture, unexpected places. Return ONLY a JSON array: title, url, source, summary (2 sentences), synopsis (4 sentences), type ("article"|"video"), dimension.`
            : `Find 5 real fascinating articles or videos on unexpected enriching topics — history, science, philosophy, culture. Return ONLY a JSON array: title, url, source, summary (2 sentences), synopsis (4 sentences), type ("article"|"video"), dimension.`;
          const exploreItems = await pxPost("You are a curiosity guide. Return ONLY valid JSON arrays. Use only real URLs.", exploreQ);
          if (Array.isArray(exploreItems)) {
            for (const item of exploreItems.slice(0, 5)) {
              if (!item.title) continue;
              cards.push({
                id: `ex-p${page}-${cards.length}-${ts}`,
                type: item.type === "video" ? "video" : "article",
                bucket: "explore",
                title: String(item.title).slice(0, 120),
                summary: String(item.summary || "").slice(0, 200),
                synopsis: String(item.synopsis || item.summary || "").slice(0, 600),
                dwConnection: "Something new to explore — broadening your perspective and expanding what you thought was possible.",
                url: String(item.url || ""),
                source: String(item.source || "Web"),
                dimension: String(item.dimension || "intellectual"),
                readTime: item.type === "video" ? "Watch" : "Read",
              });
            }
          }
        } catch (e) { console.error("Discover explore error:", e); }
      }

      // ── RANDOM / SURPRISE: facts, history, spiritual, quotes, lessons ──
      try {
        const randomTypes = ["fun_fact", "history", "spiritual", "quote", "lesson"];
        const rType = randomTypes[(page + Math.floor(ts / 1000)) % randomTypes.length];
        const typeMap: Record<string, string> = {
          fun_fact: "fact", history: "fact", spiritual: "spiritual", quote: "quote", lesson: "lesson",
        };
        const sourceMap: Record<string, string> = {
          fun_fact: "DW Insights", history: "History", spiritual: "DW Wisdom", quote: "DW Quotes", lesson: "DW Lessons",
        };
        const rItems = await generateDiscoverRandomContent(rType);
        for (const item of rItems.slice(0, 5)) {
          if (!item.title) continue;
          const body = String(item.body || "");
          cards.push({
            id: `rnd-p${page}-${cards.length}-${ts}`,
            type: typeMap[rType] || "fact",
            bucket: "random",
            title: String(item.title).slice(0, 120),
            summary: body.slice(0, 150) + (body.length > 150 ? "…" : ""),
            synopsis: body,
            dwConnection: `This touches your ${item.dimension || "spiritual"} dimension — a moment to pause and absorb.`,
            url: "",
            source: item.source || sourceMap[rType] || "DW Insights",
            dimension: String(item.dimension || "intellectual"),
            readTime: "1 min",
          });
        }
      } catch (e) { console.error("Discover random error:", e); }

      // If AI returned fewer than 5 cards (e.g., API unavailable), fill in from static library
      if (cards.length < 5) {
        // Rotate through static library so each page shows different content
        const pageOffset = (page - 1) * 5;
        const staticCards = DISCOVER_STATIC_LIBRARY.map((item, idx) => ({
          id: `static-p${page}-${idx}-${ts}`,
          ...item,
        }));
        // Shuffle static with a page-seeded deterministic sort
        const seeded = staticCards.sort((a, b) => {
          const h = (s: string) => [...s].reduce((acc, c) => acc + c.charCodeAt(0), page * 37);
          return h(a.id) - h(b.id);
        });
        const needed = Math.max(0, 12 - cards.length);
        const slice = seeded.slice(pageOffset % seeded.length).concat(seeded).slice(0, needed);
        cards.push(...slice);
      }

      // Shuffle the three buckets together so they interleave naturally
      const shuffled = cards.sort(() => Math.random() - 0.5);
      res.json({ cards: shuffled, page, hasMore: true });
    } catch (error) {
      console.error("GET /api/discover/feed error:", error);
      res.status(500).json({ cards: [], page: 1, hasMore: false });
    }
  });

  // ── DW Smart Import ───────────────────────────────────────────────────────
  // Auto-detects content type and extracts structured data from any pasted text
}
