import type { Express } from "express";
import { and, or } from "drizzle-orm";
import { z } from "zod";
import { storage } from "../storage";

import { requireAuth } from "./_shared";
import { openai, generateChatResponse } from "../openai";
import { insertFeedInteractionSchema, insertSavedContentSchema } from "@shared/schema";
export function registerContentFeedRoutes(app: Express): void {
  app.get("/api/my-plan", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const [user, goals, habits, profile] = await Promise.all([
        storage.getUser(userId),
        storage.getGoals(userId),
        storage.getHabits(userId),
        storage.getOnboardingProfile(userId),
      ]);

      const activeGoals = goals.filter((g: any) => g.status === "active").slice(0, 5);
      const activeHabits = habits.filter((h: any) => h.isActive !== false).slice(0, 8);

      const context = [
        user?.name && `User: ${user.name}`,
        profile?.fitnessGoal && `Fitness goal: ${profile.fitnessGoal}`,
        activeGoals.length && `Active goals: ${activeGoals.map((g: any) => g.title).join(", ")}`,
        activeHabits.length && `Daily habits: ${activeHabits.map((h: any) => h.title).join(", ")}`,
      ].filter(Boolean).join("\n");

      const systemPrompt = `You are DW, a wellness AI creating a personalized 7-day life plan. Generate a unified JSON plan that connects workouts, nutrition, habits, and recovery. Make it specific, realistic, and motivating.

Return ONLY valid JSON in this exact shape:
{
  "weekTheme": "string — an inspiring theme for the week",
  "bodyGoalFocus": "string — 1-sentence focus based on body goals",
  "nutritionTarget": { "calories": number, "protein": "Xg", "note": "string" },
  "days": [
    {
      "day": "Monday",
      "workout": { "type": "string", "duration": "string", "focus": "string", "exercises": ["string"] },
      "nutrition": { "breakfast": "string", "lunch": "string", "dinner": "string", "snack": "string" },
      "habits": ["string"],
      "recovery": "string",
      "intention": "string — a short morning intention"
    }
  ],
  "weeklyInsight": "string — a motivating summary for the week"
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Create my personalized 7-day plan based on:\n${context || "General wellness and balance"}` },
        ],
        max_tokens: 2000,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content || "{}";
      const plan = JSON.parse(content);
      res.json(plan);
    } catch (error: any) {
      console.error("My plan error:", error);
      res.status(500).json({ error: "Failed to generate plan. Please try again." });
    }
  });

  app.get("/api/wellness-content", async (req, res) => {
    try {
      const content = await storage.getWellnessContent();
      res.json(content);
    } catch (error) {
      res.status(500).json({ error: "Failed to load wellness content" });
    }
  });

  app.get("/api/wellness-content/:id", async (req, res) => {
    try {
      const content = await storage.getWellnessContentById(req.params.id);
      if (!content) {
        return res.status(404).json({ error: "Content not found" });
      }
      res.json(content);
    } catch (error) {
      res.status(500).json({ error: "Failed to load content" });
    }
  });

  // Saved Content Routes
  app.get("/api/saved-content", requireAuth, async (req, res) => {
    try {
      const content = await storage.getSavedContent(req.session.userId!);
      res.json(content);
    } catch (error) {
      res.status(500).json({ error: "Failed to load saved content" });
    }
  });

  app.post("/api/saved-content", requireAuth, async (req, res) => {
    try {
      const data = insertSavedContentSchema.parse({ 
        ...req.body, 
        userId: req.session.userId! 
      });
      const created = await storage.createSavedContent(data);
      res.json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to save content" });
    }
  });

  app.patch("/api/saved-content/:id", requireAuth, async (req, res) => {
    try {
      const updated = await storage.updateSavedContent(
        req.params.id,
        req.session.userId!,
        req.body
      );
      if (!updated) {
        return res.status(404).json({ error: "Saved content not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update saved content" });
    }
  });

  app.delete("/api/saved-content/:id", requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteSavedContent(
        req.params.id,
        req.session.userId!
      );
      if (!deleted) {
        return res.status(404).json({ error: "Saved content not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete saved content" });
    }
  });

  // Feed Interaction Routes (not-interested, personalization signals)
  app.post("/api/feed-interactions", requireAuth, async (req, res) => {
    try {
      const data = insertFeedInteractionSchema.parse({
        ...req.body,
        userId: req.session.userId!,
      });
      const created = await storage.createFeedInteraction(data);
      res.json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to record feed interaction" });
    }
  });

  app.get("/api/feed-interactions/not-interested", requireAuth, async (req, res) => {
    try {
      const interactions = await storage.getFeedInteractionsByAction(
        req.session.userId!,
        "not_interested"
      );
      res.json(interactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to load feed interactions" });
    }
  });

  // Add content to schedule from feed
  app.post("/api/feed/add-to-schedule", requireAuth, async (req, res) => {
    const bodySchema = z.object({
      title: z.string().min(1),
      scheduledTime: z.string().min(1),
      contentUrl: z.string().optional(),
      contentType: z.string().optional(),
      notes: z.string().optional(),
      topic: z.string().optional(),
      description: z.string().optional(),
      linkedRoute: z.string().optional(),
    });
    try {
      const body = bodySchema.parse(req.body);
      const { title, scheduledTime, contentUrl, contentType, notes, topic, description, linkedRoute } = body;

      /**
       * Normalize scheduledTime so we always store a UTC ISO 8601 timestamp.
       *
       * Accepted inputs:
       * - "HH:MM"  → interpreted as today at HH:MM (server local), stored as UTC ISO.
       *              If that time is already in the past today, advanced to tomorrow.
       * - Any Date-parseable string (e.g. ISO 8601 with timezone) → stored as UTC ISO.
       *
       * dailyScheduleEvents.scheduledTime is a text column expected to always contain
       * a full ISO 8601 timestamp in UTC (e.g. "2024-02-01T10:00:00.000Z").
       */
      let normalizedTime: string;
      if (/^\d{2}:\d{2}$/.test(scheduledTime)) {
        const now = new Date();
        const scheduledDate = new Date(now);
        const [hours, minutes] = scheduledTime.split(":");
        scheduledDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
        // If the computed time is in the past for today, schedule for tomorrow instead
        if (scheduledDate.getTime() < now.getTime()) {
          scheduledDate.setDate(scheduledDate.getDate() + 1);
        }
        normalizedTime = scheduledDate.toISOString();
      } else {
        const parsed = new Date(scheduledTime);
        if (Number.isNaN(parsed.getTime())) {
          return res.status(400).json({ error: "Invalid scheduledTime format" });
        }
        normalizedTime = parsed.toISOString();
      }

      const event = await storage.createScheduleEvent({
        userId: req.session.userId!,
        title,
        scheduledTime: normalizedTime,
        systemReference: contentUrl || null,
        systemType: contentType || "feed_content",
        notes: notes || null,
      });

      // Also create a CalendarEvent so it appears in the calendar schedule view with DW deep link
      try {
        const startDt = new Date(normalizedTime);
        const endDt = new Date(startDt.getTime() + 60 * 60 * 1000); // default 1 hour
        // Infer a sensible eventType from contentType
        const typeMap: Record<string, string> = {
          workout: "workout", meal: "meal", meditation: "meditation", routine: "routine",
          yoga: "routine", spiritual: "spiritual",
        };
        const eventType = typeMap[contentType || ""] || "event";
        await storage.createCalendarEvent({
          userId: req.session.userId!,
          title,
          description: description || null,
          startTime: startDt.toISOString(),
          endTime: endDt.toISOString(),
          eventType,
          linkedType: contentType || "none",
          linkedId: null,
          linkedRoute: linkedRoute || null,
        });
      } catch (_e) {
        // Non-fatal — schedule event was already created
      }

      // Also record a scheduled interaction for personalization
      await storage.createFeedInteraction({
        userId: req.session.userId!,
        contentType: contentType || null,
        contentTitle: title,
        contentUrl: contentUrl || null,
        action: "scheduled",
        topic: topic || null,
      });
      res.json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to add to schedule" });
    }
  });

  // Explore Content APIs - External content discovery
  // Note: API keys should be set in environment variables
  // For now, these return mock data as placeholders until API keys are configured

  app.post("/api/explore/youtube", requireAuth, async (req, res) => {
    try {
      const { query, maxResults = 10 } = req.body;
      
      if (!query) {
        return res.status(400).json({ error: "Query parameter is required" });
      }

      // Check for API key
      if (!process.env.YOUTUBE_API_KEY) {
        // Return mock data as fallback
        return res.json({
          items: [],
          message: "YouTube API key not configured. Set YOUTUBE_API_KEY in environment variables.",
        });
      }

      // YouTube Data API v3 integration
      const youtubeUrl = new URL("https://www.googleapis.com/youtube/v3/search");
      youtubeUrl.searchParams.set("part", "snippet");
      youtubeUrl.searchParams.set("q", query);
      youtubeUrl.searchParams.set("maxResults", String(maxResults));
      youtubeUrl.searchParams.set("type", "video");
      youtubeUrl.searchParams.set("key", process.env.YOUTUBE_API_KEY);

      const response = await fetch(youtubeUrl.toString(), { signal: AbortSignal.timeout(15000) });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "YouTube API request failed");
      }

      // Format results
      const formatted = data.items?.map((item: any) => ({
        id: item.id.videoId,
        type: "video",
        source: "YouTube",
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails?.medium?.url,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        metadata: {
          channel: item.snippet.channelTitle,
          publishedAt: new Date(item.snippet.publishedAt).toLocaleDateString(),
        },
      })) || [];

      res.json({ items: formatted });
    } catch (error) {
      console.error("YouTube API error:", error);
      res.status(500).json({ 
        error: "Failed to search YouTube",
        items: [],
      });
    }
  });

  app.post("/api/explore/articles", requireAuth, async (req, res) => {
    try {
      const { query, category = "health" } = req.body;
      
      if (!query) {
        return res.status(400).json({ error: "Query parameter is required" });
      }

      // Check for API key
      if (!process.env.NEWS_API_KEY) {
        // Return mock data as fallback
        return res.json({
          items: [],
          message: "NewsAPI key not configured. Set NEWS_API_KEY in environment variables.",
        });
      }

      // NewsAPI integration
      const newsUrl = new URL("https://newsapi.org/v2/everything");
      newsUrl.searchParams.set("q", `${query} ${category}`);
      newsUrl.searchParams.set("language", "en");
      newsUrl.searchParams.set("sortBy", "relevancy");
      newsUrl.searchParams.set("pageSize", "10");
      newsUrl.searchParams.set("apiKey", process.env.NEWS_API_KEY);

      const response = await fetch(newsUrl.toString(), { signal: AbortSignal.timeout(15000) });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "NewsAPI request failed");
      }

      // Format results
      const formatted = data.articles?.map((article: any) => ({
        id: `article-${Buffer.from(article.url).toString('base64').substring(0, 16)}`,
        type: "article",
        source: article.source.name,
        title: article.title,
        description: article.description || article.content?.substring(0, 200),
        thumbnail: article.urlToImage,
        url: article.url,
        metadata: {
          publishedAt: new Date(article.publishedAt).toLocaleDateString(),
        },
      })) || [];

      res.json({ items: formatted });
    } catch (error) {
      console.error("NewsAPI error:", error);
      res.status(500).json({ 
        error: "Failed to search articles",
        items: [],
      });
    }
  });

  app.post("/api/explore/exercises", requireAuth, async (req, res) => {
    try {
      const { query, muscle, type } = req.body;
      
      if (!query && !muscle && !type) {
        return res.status(400).json({ error: "At least one search parameter is required" });
      }

      // Check for API key
      if (!process.env.EXERCISE_API_KEY) {
        // Return mock data as fallback
        return res.json({
          items: [],
          message: "Exercise API key not configured. Set EXERCISE_API_KEY in environment variables.",
        });
      }

      // API-Ninjas Exercise Database integration
      const exerciseUrl = new URL("https://api.api-ninjas.com/v1/exercises");
      if (query) exerciseUrl.searchParams.set("name", query);
      if (muscle) exerciseUrl.searchParams.set("muscle", muscle);
      if (type) exerciseUrl.searchParams.set("type", type);

      const response = await fetch(exerciseUrl.toString(), {
        signal: AbortSignal.timeout(15000),
        headers: {
          "X-Api-Key": process.env.EXERCISE_API_KEY,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error("Exercise API request failed");
      }

      // Format results
      const formatted = Array.isArray(data) ? data.map((exercise: any) => ({
        id: `exercise-${exercise.name.replace(/\s+/g, "-").toLowerCase()}-${exercise.muscle}`,
        type: "exercise",
        source: "API-Ninjas Exercise DB",
        title: exercise.name,
        description: exercise.instructions,
        duration: `${exercise.difficulty} difficulty`,
        url: "", // No external URL available for exercises
        metadata: {
          type: exercise.type,
          muscle: exercise.muscle,
          equipment: exercise.equipment,
          difficulty: exercise.difficulty,
        },
      })) : [];

      res.json({ items: formatted });
    } catch (error) {
      console.error("Exercise API error:", error);
      res.status(500).json({ 
        error: "Failed to search exercises",
        items: [],
      });
    }
  });

  app.get("/api/explore/suggestions", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;

      // Fetch user data for personalized suggestions
      const [dimensionBlueprints, goals, habits, userProfile, onboardingProfile] = await Promise.all([
        storage.getDimensionBlueprints(userId),
        storage.getGoals(userId),
        storage.getHabits(userId),
        storage.getUserProfile(userId),
        storage.getOnboardingProfile(userId),
      ]);

      const lp = (userProfile?.lifestylePreferences ?? {}) as Record<string, string>;
      const exploreIdentityCtx = [
        lp.identityVision ? `Who they're becoming: ${lp.identityVision}` : "",
        lp.styleLikes ? `Their aesthetic/style: ${lp.styleLikes}` : "",
        lp.readLikes ? `They like reading about: ${lp.readLikes}` : "",
        lp.doLikes ? `Activities they love: ${lp.doLikes}` : "",
        lp.watchLikes ? `Content they watch: ${lp.watchLikes}` : "",
        lp.musicLikes ? `Music/podcasts they follow: ${lp.musicLikes}` : "",
        lp.goLikes ? `Places/experiences they seek: ${lp.goLikes}` : "",
        onboardingProfile?.shortTermGoals ? `Short-term focus: ${onboardingProfile.shortTermGoals}` : "",
        onboardingProfile?.longTermGoals ? `Long-term vision: ${onboardingProfile.longTermGoals}` : "",
        onboardingProfile?.wellnessFocus?.length ? `Wellness areas: ${onboardingProfile.wellnessFocus.join(", ")}` : "",
      ].filter(Boolean).join("\n");

      // Generate AI suggestions
      const prompt = `You are DW, a personal AI who knows this person deeply. Generate content discovery suggestions that feel curated specifically for them — not generic wellness categories.

═══ WHO THIS PERSON IS ═══
Active Goals: ${goals.slice(0, 3).map((g: any) => g.title).join(", ") || "none set"}
Current Habits: ${habits.slice(0, 3).map((h: any) => h.title).join(", ") || "none set"}
${userProfile?.fitnessGoal ? `Fitness Goal: ${userProfile.fitnessGoal}` : ""}
${exploreIdentityCtx || "No lifestyle preferences set yet — give diverse, growth-oriented suggestions."}
═══════════════════════════

Generate 3-4 content topic suggestions. Each should feel like it was chosen specifically because of who this person is and who they're becoming — not generic "explore wellness" suggestions. Reference their identity, style, or specific goals directly in the description.

Return as JSON array:
[{
  "dimension": "life area (Body / Mind / Money / Purpose / Environment / Life / Spiritual / Social)",
  "title": "specific, personal topic title",
  "description": "1-2 sentences — tie it to their goals, identity, or preferences specifically",
  "keywords": ["keyword1", "keyword2", "keyword3"]
}]

Return only valid JSON, no other text.`;

      const aiResponse = await generateChatResponse(prompt, []);
      
      // Ensure we have a string response
      const responseText = typeof aiResponse === 'string' ? aiResponse : JSON.stringify(aiResponse);
      
      // Parse AI response - look for JSON array with improved bracket matching
      let suggestions = [];
      try {
        // Find the first '[' and count brackets to find matching ']'
        const startIdx = responseText.indexOf('[');
        if (startIdx !== -1) {
          let depth = 0;
          let endIdx = startIdx;
          for (let i = startIdx; i < responseText.length; i++) {
            if (responseText[i] === '[') depth++;
            if (responseText[i] === ']') depth--;
            if (depth === 0) {
              endIdx = i;
              break;
            }
          }
          if (endIdx > startIdx) {
            const jsonStr = responseText.substring(startIdx, endIdx + 1);
            suggestions = JSON.parse(jsonStr);
          }
        }
      } catch (e) {
        console.error("Failed to parse AI suggestions:", e);
      }

      // Fallback suggestions if AI fails
      if (suggestions.length === 0) {
        suggestions = [
          {
            dimension: "Body",
            title: "Explore wellness content for your body",
            description: "Discover workouts, nutrition tips, and recovery techniques.",
            keywords: ["workout routines", "nutrition basics", "recovery tips"],
          },
        ];
      }

      res.json({ suggestions });
    } catch (error) {
      console.error("AI suggestions error:", error);
      res.status(500).json({ 
        error: "Failed to generate suggestions",
        suggestions: [],
      });
    }
  });

}
