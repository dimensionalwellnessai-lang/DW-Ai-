import type { Express } from "express";

import { z } from "zod";

import { storage } from "../storage";

import { aiContentLimiter } from "./_limiters";

import { openai, getAiConfigStatus } from "../openai";

import { type Habit, type Goal } from "@shared/schema";

export function registerRoutinesBrowseRoutes(app: Express): void {
  app.post("/api/routines/generate-steps", aiContentLimiter, async (req, res) => {
    const bodySchema = z.object({
      templateId: z.string().min(1, "templateId is required"),
      templateTitle: z.string().min(1, "templateTitle is required"),
      defaultSteps: z.array(z.string().min(1)).min(1, "defaultSteps must be a non-empty array"),
    });

    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(req.body);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors[0]?.message ?? "Invalid request" });
      }
      return res.status(400).json({ error: "Invalid request body" });
    }

    const { templateId, templateTitle, defaultSteps } = body;

    try {
      if (!aiConfig.configured) {
        return res.json({ steps: defaultSteps, aiGenerated: false, reason: "AI not configured" });
      }

      // Try to get user context for personalisation
      let userContext: Record<string, unknown> = {};
      const userId = req.session?.userId;
      if (userId) {
        try {
          const [userProfile, goals, habits] = await Promise.all([
            storage.getUserProfile(userId),
            storage.getGoals(userId),
            storage.getHabits(userId),
          ]);
          userContext = {
            fitnessGoal: userProfile?.fitnessGoal || null,
            energyLevel: userProfile?.energyLevel || null,
            goals: goals.slice(0, 3).map((g: Goal) => g.title),
            habits: habits.slice(0, 3).map((h: Habit) => h.title),
          };
        } catch {
          // Non-fatal — proceed without profile context
        }
      }

      const contextBlock = Object.keys(userContext).length
        ? `\nUSER CONTEXT:\n${Object.entries(userContext)
            .filter(([, v]) => v && (Array.isArray(v) ? (v as unknown[]).length > 0 : true))
            .map(([k, v]) => `- ${k}: ${Array.isArray(v) ? (v as unknown[]).join(", ") : v}`)
            .join("\n")}`
        : "";

      const prompt = `You are a wellness coach creating a personalized "${templateTitle}" routine.${contextBlock}

Default steps for reference: ${defaultSteps.join(", ")}

Create 5-7 actionable, personalized steps for the "${templateTitle}" routine. Make them:
- Specific and time-aware (e.g., "5-min gentle stretch focusing on neck tension")
- Tailored to the user context if provided, otherwise keep them practical for most people
- In a natural daily flow order

Return ONLY a valid JSON object:
{ "steps": ["step 1", "step 2", ...], "whySuggested": "One sentence explaining the routine's focus" }`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 400,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error("Empty AI response");

      const parsed = JSON.parse(content);
      // Only report aiGenerated=true when the AI actually provided usable steps
      const aiSteps = Array.isArray(parsed.steps) && parsed.steps.length > 0
        ? (parsed.steps as unknown[]).filter((s): s is string => typeof s === "string")
        : [];
      const usedAiSteps = aiSteps.length > 0;
      const steps = usedAiSteps ? aiSteps : defaultSteps;
      const whySuggested = typeof parsed.whySuggested === "string" ? parsed.whySuggested : null;

      return res.json({ steps, whySuggested, aiGenerated: usedAiSteps });
    } catch (error) {
      console.error("Routine step generation error:", error);
      // Graceful fallback to validated defaults (from Zod-parsed body)
      return res.json({
        steps: defaultSteps,
        aiGenerated: false,
      });
    }
  });

  // ── AI Article Curation ────────────────────────────────────────────────────
  // Uses AI to suggest real wellness articles on topics relevant to the user.
  // Each item includes title, synopsis, why it's relevant, and a plausible URL.
  // Falls back to an empty array (client shows sample content) if AI not configured.
  app.get("/api/browse/ai-articles", aiContentLimiter, async (req, res) => {
    try {
      const hour = new Date().getHours();
      const timeSlot =
        hour >= 5 && hour < 9   ? "morning" :
        hour >= 9 && hour < 12  ? "late-morning" :
        hour >= 12 && hour < 17 ? "afternoon" :
        hour >= 17 && hour < 21 ? "evening" : "night";
      const dayName = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][new Date().getDay()];

      // Optional user context
      let topics: string[] = [];
      let articlePersonalCtx = "";
      const userId = req.session?.userId;
      if (userId) {
        try {
          const [userProfile, goals, onboarding] = await Promise.all([
            storage.getUserProfile(userId),
            storage.getGoals(userId),
            storage.getOnboardingProfile(userId),
          ]);
          if (userProfile?.fitnessGoal) topics.push(userProfile.fitnessGoal);
          goals.slice(0, 3).forEach((g: Goal) => {
            if (g.wellnessDimension) topics.push(g.wellnessDimension);
            if (g.title) topics.push(g.title);
          });
          const lp = (userProfile?.lifestylePreferences ?? {}) as Record<string, string>;
          const ctxParts = [
            lp.identityVision ? `They are becoming: ${lp.identityVision}` : "",
            lp.styleLikes ? `Style/aesthetic: ${lp.styleLikes}` : "",
            lp.readLikes ? `They like reading about: ${lp.readLikes}` : "",
            lp.doLikes ? `They enjoy: ${lp.doLikes}` : "",
            onboarding?.shortTermGoals ? `Short-term goal: ${onboarding.shortTermGoals}` : "",
            onboarding?.wellnessFocus?.length ? `Wellness focus: ${onboarding.wellnessFocus.join(", ")}` : "",
          ].filter(Boolean).join(". ");
          if (ctxParts) articlePersonalCtx = ctxParts;
        } catch {
          // Non-fatal
        }
      }

      const topicsLine = topics.length
        ? `The user is interested in: ${topics.join(", ")}.${articlePersonalCtx ? ` Context: ${articlePersonalCtx}.` : ""}`
        : "The user is interested in general wellness, mindfulness, and healthy living.";

      const perplexityApiKey = process.env.PERPLEXITY_API_KEY;

      // Try Perplexity first for real article URLs
      if (perplexityApiKey) {
        const pxPrompt = `Today is ${dayName}, ${timeSlot}. ${topicsLine}

Search the web and find 6 real wellness articles from established health sites that are specifically relevant to this person's goals and interests. Use real article URLs from sites like healthline.com, verywellfit.com, mindbodygreen.com, self.com, psychologytoday.com, medicalnewstoday.com, greatist.com.

Make the "whySuggested" field personal and specific to what you know about this person — not generic wellness copy. Reference their actual goals, what they're working toward, or their style.

Return ONLY this JSON, no other text:
{"articles":[{"id":"a1","title":"...","synopsis":"2-3 sentence summary","whySuggested":"1 sentence personal reason tied to their goals or identity","url":"https://...","category":"article","readTimeMinutes":5}]}`;

        const pxRes = await fetch("https://api.perplexity.ai/chat/completions", { signal: AbortSignal.timeout(25000),
          method: "POST",
          headers: { "Authorization": `Bearer ${perplexityApiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "llama-3.1-sonar-large-128k-online",
            messages: [
              { role: "system", content: "You are a wellness content curator. Search the web and return only valid JSON with real article URLs." },
              { role: "user", content: pxPrompt },
            ],
            temperature: 0.1,
            max_tokens: 1800,
          }),
        });

        if (pxRes.ok) {
          const pxData = await pxRes.json();
          let raw = (pxData.choices?.[0]?.message?.content || "").trim();
          if (raw.startsWith("```")) raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
          try {
            const parsed = JSON.parse(raw);
            const rawArticles = Array.isArray(parsed.articles) ? parsed.articles : [];
            const safeArticles = rawArticles.map((a: Record<string, unknown>) => {
              let safeUrl = "";
              if (typeof a.url === "string") {
                try { const p = new URL(a.url); if (p.protocol === "https:" && p.hostname) safeUrl = a.url; } catch {}
              }
              return { ...a, url: safeUrl };
            }).filter((a: any) => a.url && a.title);
            if (safeArticles.length >= 3) {
              return res.json({ articles: safeArticles, aiGenerated: true });
            }
          } catch { /* fall through to OpenAI */ }
        }
      }

      // Fallback to OpenAI
      const aiConfig = getAiConfigStatus();
      if (!aiConfig.configured) {
        return res.json({ articles: [], aiGenerated: false });
      }

      const prompt = `You are a wellness content curator. Today is ${dayName}, ${timeSlot}. ${topicsLine}

Suggest 6 real wellness article topics appropriate for this time of day. For each provide a title, synopsis, whySuggested, a URL from a real wellness domain (healthline.com, verywellhealth.com, mindbodygreen.com, greatist.com, self.com, psychologytoday.com), and category.

Return ONLY:
{"articles":[{"id":"ai-article-1","title":"...","synopsis":"...","whySuggested":"...","url":"https://...","category":"article","readTimeMinutes":5}]}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 900,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error("Empty AI response");

      const parsed = JSON.parse(content);
      const rawArticles = Array.isArray(parsed.articles) ? parsed.articles : [];

      // Sanitize AI-provided URLs: only accept https: URLs with a parseable hostname.
      // This prevents javascript: / data: injections from reaching the client.
      const safeArticles = rawArticles.map((a: Record<string, unknown>) => {
        let safeUrl = "";
        if (typeof a.url === "string") {
          try {
            const parsed = new URL(a.url);
            if (parsed.protocol === "https:" && parsed.hostname) {
              safeUrl = a.url;
            }
          } catch {
            // Drop malformed URL
          }
        }
        return { ...a, url: safeUrl };
      });

      return res.json({ articles: safeArticles, aiGenerated: true });
    } catch (error) {
      console.error("AI article curation error:", error);
      return res.json({ articles: [], aiGenerated: false });
    }
  });

  /**
   * GET /api/browse/for-you
   * Returns time-aware, day-aware real wellness content using Perplexity web search.
   * Falls back to curated static content when Perplexity is unavailable.
   */
  app.get("/api/browse/for-you", async (req, res) => {
    try {
      const hour = new Date().getHours();
      const timeSlot: string =
        hour >= 5 && hour < 9   ? "morning" :
        hour >= 9 && hour < 12  ? "late-morning" :
        hour >= 12 && hour < 17 ? "afternoon" :
        hour >= 17 && hour < 21 ? "evening" : "night";
      const dayName = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][new Date().getDay()];

      const timeLabel: Record<string, string> = {
        "morning": "early morning", "late-morning": "mid-morning",
        "afternoon": "afternoon", "evening": "evening", "night": "night",
      };
      const videoFocus: Record<string, string> = {
        "morning": "morning yoga, energising wake-up workout, or breathwork",
        "late-morning": "HIIT workout, strength training, or focused flow yoga",
        "afternoon": "desk stretches, walking workout, or mindfulness break",
        "evening": "wind-down yoga, relaxing stretches, or meditation",
        "night": "sleep yoga, body scan meditation, or gentle stretching",
      };
      const mealFocus: Record<string, string> = {
        "morning": "healthy breakfast or morning smoothie",
        "late-morning": "healthy snack or brunch recipe",
        "afternoon": "lunch or meal prep idea",
        "evening": "healthy dinner recipe",
        "night": "light evening snack or sleep-supportive food",
      };

      let userId: number | undefined;
      let userTopics = "";
      if (req.session?.userId) {
        userId = req.session.userId;
        try {
          const [profile, goals, onboarding] = await Promise.all([
            storage.getUserProfile(userId),
            storage.getGoals(userId),
            storage.getOnboardingProfile(userId),
          ]);
          const parts: string[] = [];
          if (profile?.fitnessGoal) parts.push(profile.fitnessGoal);
          goals.slice(0, 3).forEach((g: any) => {
            if (g.wellnessDimension) parts.push(g.wellnessDimension);
            if (g.title) parts.push(g.title);
          });
          const lp = (profile?.lifestylePreferences ?? {}) as Record<string, string>;
          const personalParts = [
            lp.identityVision ? `becoming: ${lp.identityVision}` : "",
            lp.styleLikes ? `style: ${lp.styleLikes}` : "",
            lp.doLikes ? `enjoys: ${lp.doLikes}` : "",
            lp.watchLikes ? `watches: ${lp.watchLikes}` : "",
            lp.musicLikes ? `listens to: ${lp.musicLikes}` : "",
            lp.goLikes ? `likes going to: ${lp.goLikes}` : "",
            onboarding?.shortTermGoals ? `working on: ${onboarding.shortTermGoals}` : "",
            onboarding?.wellnessFocus?.length ? `wellness focus: ${onboarding.wellnessFocus.join(", ")}` : "",
          ].filter(Boolean).join("; ");
          if (parts.length || personalParts) {
            userTopics = ` This person is ${personalParts || parts.join(", ")}.${parts.length ? ` Goals: ${parts.join(", ")}.` : ""} Make ALL content — videos, articles, workouts, meals — feel curated specifically for them.`;
          }
        } catch { /* non-fatal */ }
      }

      const perplexityApiKey = process.env.PERPLEXITY_API_KEY;

      interface VideoItem { id: string; title: string; description: string; url: string; channel: string; duration: string; category: string; }
      interface ArticleItem { id: string; title: string; synopsis: string; url: string; source: string; readTimeMinutes: number; whySuggested: string; dimension?: string; }
      interface WorkoutItem { id: string; title: string; description: string; url: string; duration: string; difficulty: string; }
      interface MealItem { id: string; title: string; description: string; url: string; prepTime: string; }

      let videos: VideoItem[] = [];
      let articles: ArticleItem[] = [];
      let workouts: WorkoutItem[] = [];
      let meal: MealItem | null = null;

      if (perplexityApiKey) {
        const prompt = `Today is ${dayName} and it is ${timeLabel[timeSlot]}.${userTopics}

Find real wellness content appropriate for this time. Search for ACTUAL existing content with real working URLs.

1. Find 4 real YouTube wellness videos about ${videoFocus[timeSlot]}. Use real YouTube video IDs (e.g. https://www.youtube.com/watch?v=REAL_ID). Try channels like Yoga With Adriene, Heather Robertson, MedBridge, Headspace, Pick Up Limes, Jeff Nippard.
2. Find 3 real wellness articles from sites like healthline.com, mindbodygreen.com, verywellfit.com, self.com, psychologytoday.com. Use real article URLs. Include a dimension field: one of emotional, physical, financial, social, spiritual, intellectual, environmental, purpose, or general.
3. Find 2 real workout videos for ${dayName} ${timeLabel[timeSlot]}.
4. Find 1 real recipe for a ${mealFocus[timeSlot]} from a real recipe site like allrecipes.com, budgetbytes.com, or minimalistbaker.com.

Return ONLY this exact JSON structure, no other text:
{
  "videos": [{"id":"v1","title":"...","description":"...","url":"https://www.youtube.com/watch?v=...","channel":"...","duration":"15 min","category":"yoga"}],
  "articles": [{"id":"a1","title":"...","synopsis":"...","url":"https://...","source":"Healthline","readTimeMinutes":5,"whySuggested":"...","dimension":"physical"}],
  "workouts": [{"id":"w1","title":"...","description":"...","url":"https://www.youtube.com/watch?v=...","duration":"20 min","difficulty":"beginner"}],
  "meal": {"id":"m1","title":"...","description":"...","url":"https://...","prepTime":"15 min"}
}`;

        const pxRes = await fetch("https://api.perplexity.ai/chat/completions", { signal: AbortSignal.timeout(25000),
          method: "POST",
          headers: { "Authorization": `Bearer ${perplexityApiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "llama-3.1-sonar-large-128k-online",
            messages: [
              { role: "system", content: "You are a wellness content curator. Return only valid JSON with real URLs from the web." },
              { role: "user", content: prompt },
            ],
            temperature: 0.1,
            max_tokens: 2000,
          }),
        });

        if (pxRes.ok) {
          const pxData = await pxRes.json();
          let raw = (pxData.choices?.[0]?.message?.content || "").trim();
          if (raw.startsWith("```")) raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
          try {
            const parsed = JSON.parse(raw);
            const sanitizeUrl = (u: unknown) => {
              if (typeof u !== "string") return "";
              try { const p = new URL(u); return p.protocol === "https:" ? u : ""; } catch { return ""; }
            };
            if (Array.isArray(parsed.videos)) {
              videos = parsed.videos
                .filter((v: any) => v?.title && sanitizeUrl(v?.url))
                .slice(0, 6)
                .map((v: any, i: number) => ({ id: `v${i}`, title: String(v.title), description: String(v.description || ""), url: sanitizeUrl(v.url), channel: String(v.channel || ""), duration: String(v.duration || ""), category: String(v.category || "wellness") }));
            }
            if (Array.isArray(parsed.articles)) {
              articles = parsed.articles
                .filter((a: any) => a?.title && sanitizeUrl(a?.url))
                .slice(0, 5)
                .map((a: any, i: number) => ({ id: `a${i}`, title: String(a.title), synopsis: String(a.synopsis || ""), url: sanitizeUrl(a.url), source: String(a.source || ""), readTimeMinutes: Number(a.readTimeMinutes) || 5, whySuggested: String(a.whySuggested || ""), dimension: String(a.dimension || "general") }));
            }
            if (Array.isArray(parsed.workouts)) {
              workouts = parsed.workouts
                .filter((w: any) => w?.title && sanitizeUrl(w?.url))
                .slice(0, 3)
                .map((w: any, i: number) => ({ id: `w${i}`, title: String(w.title), description: String(w.description || ""), url: sanitizeUrl(w.url), duration: String(w.duration || ""), difficulty: String(w.difficulty || "beginner") }));
            }
            if (parsed.meal?.title && sanitizeUrl(parsed.meal?.url)) {
              meal = { id: "m0", title: String(parsed.meal.title), description: String(parsed.meal.description || ""), url: sanitizeUrl(parsed.meal.url), prepTime: String(parsed.meal.prepTime || "") };
            }
          } catch (e) {
            console.warn("[browse/for-you] JSON parse failed, using fallback");
          }
        }
      }

      // Static fallbacks for when Perplexity returns empty results
      if (videos.length === 0) {
        const fallbackVideos: Record<string, VideoItem[]> = {
          "morning": [
            { id: "fv1", title: "Morning Yoga for Energy", description: "Gentle wake-up flow to energise your body", url: "https://www.youtube.com/results?search_query=morning+yoga+energy+flow", channel: "Yoga With Adriene", duration: "20 min", category: "yoga" },
            { id: "fv2", title: "5-Minute Morning Stretch", description: "Quick full-body stretch to start the day right", url: "https://www.youtube.com/results?search_query=5+minute+morning+stretch+routine", channel: "FitnessBlender", duration: "5 min", category: "stretch" },
          ],
          "afternoon": [
            { id: "fv3", title: "Afternoon HIIT Workout", description: "Beat the afternoon slump with this energising HIIT", url: "https://www.youtube.com/results?search_query=afternoon+hiit+workout+30+minutes", channel: "Heather Robertson", duration: "30 min", category: "workout" },
            { id: "fv4", title: "Desk Yoga & Stretches", description: "Counteract sitting all day with these office-friendly moves", url: "https://www.youtube.com/results?search_query=desk+yoga+stretches+for+office+workers", channel: "Yoga With Adriene", duration: "10 min", category: "yoga" },
          ],
          "evening": [
            { id: "fv5", title: "Evening Wind-Down Yoga", description: "Release the day's tension with this calming flow", url: "https://www.youtube.com/results?search_query=evening+wind+down+yoga+relaxing", channel: "Yoga With Adriene", duration: "25 min", category: "yoga" },
            { id: "fv6", title: "Guided Evening Meditation", description: "Calm your mind for a restful night's sleep", url: "https://www.youtube.com/results?search_query=guided+evening+meditation+10+minutes", channel: "Headspace", duration: "10 min", category: "meditation" },
          ],
          "night": [
            { id: "fv7", title: "Sleep Meditation", description: "Deep relaxation to help you drift off peacefully", url: "https://www.youtube.com/results?search_query=sleep+meditation+guided+relaxation", channel: "Headspace", duration: "20 min", category: "meditation" },
            { id: "fv8", title: "Gentle Bedtime Yoga", description: "Slow, restorative poses to prepare your body for sleep", url: "https://www.youtube.com/results?search_query=bedtime+yoga+gentle+restorative", channel: "Yoga With Adriene", duration: "15 min", category: "yoga" },
          ],
        };
        videos = fallbackVideos[timeSlot] || fallbackVideos["afternoon"];
      }
      if (articles.length === 0) {
        articles = [
          { id: "fa1", title: "How to Build a Sustainable Morning Routine", synopsis: "Science-backed strategies for creating a morning routine that actually sticks and energizes your whole day.", url: "https://www.healthline.com/health/morning-routine", source: "Healthline", readTimeMinutes: 6, whySuggested: "Morning routines are the foundation of a thriving life.", dimension: "emotional" },
          { id: "fa2", title: "The Science of Habit Formation", synopsis: "Understand the habit loop and how to rewire your brain for lasting positive change.", url: "https://www.verywellmind.com/what-is-a-habit-2795023", source: "Verywell Mind", readTimeMinutes: 8, whySuggested: "Habits are how DW helps you build the life you want.", dimension: "purpose" },
          { id: "fa3", title: "Mindful Eating: How to Listen to Your Body", synopsis: "Practical tips for eating mindfully and developing a healthier relationship with food.", url: "https://www.mindbodygreen.com/food", source: "Mindbodygreen", readTimeMinutes: 5, whySuggested: "Nutrition is one of the 8 dimensions of your wellness.", dimension: "nutrition" },
        ];
      }

      return res.json({ videos, articles, workouts, meal, timeSlot, dayName, timeLabel: timeLabel[timeSlot] });
    } catch (err) {
      console.error("[browse/for-you] error", err);
      return res.status(500).json({ error: "Failed to load content" });
    }
  });


}
