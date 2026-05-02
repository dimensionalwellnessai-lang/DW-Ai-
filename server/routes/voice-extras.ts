import type { Express } from "express";

import { storage } from "../storage";

import { requireAuth, calculateRelevance } from "./_shared";

import { openai } from "../openai";
import { generateProactiveNudges } from "../proactive";



export function registerVoiceExtrasRoutes(app: Express): void {
  app.get("/api/ai/proactive-opener", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const nudges = await generateProactiveNudges(userId);
      const top = nudges.find(n => n.priority === "high") || nudges.find(n => n.priority === "medium");
      if (!top) return res.json({ message: null });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are DW, a grounded wellness AI companion. A returning user just opened their chat. 
Convert the nudge context below into a single warm, natural opening message — like a thoughtful concierge who notices what's going on. 
Keep it to 1–2 sentences. Sound like a person, not a notification. Don't start with "Hello" or "Hi".`,
          },
          { role: "user", content: `Context: ${top.message}` },
        ],
        max_tokens: 80,
        temperature: 0.85,
      });

      const message = completion.choices[0]?.message?.content?.trim() || null;
      res.json({ message });
    } catch {
      res.json({ message: null });
    }
  });

  // Wellness Summary Endpoint - aggregates mood, completions, and energy logs
  app.get("/api/summary", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const days = parseInt(req.query.days as string) || 7;
      
      // Get data from the last N days
      const moodLogs = await storage.getMoodLogs(userId);
      const recentMoods = moodLogs.slice(-days);
      
      const habits = await storage.getHabits(userId);
      const goals = await storage.getGoals(userId);
      const routines = await storage.getRoutines(userId);
      
      // Calculate average energy and mood
      const avgEnergy = recentMoods.length > 0 
        ? recentMoods.reduce((sum, log) => sum + (log.energyLevel || 0), 0) / recentMoods.length 
        : 0;
      const avgMood = recentMoods.length > 0 
        ? recentMoods.reduce((sum, log) => sum + (log.moodLevel || 0), 0) / recentMoods.length 
        : 0;
      const avgClarity = recentMoods.length > 0 
        ? recentMoods.reduce((sum, log) => sum + (log.clarityLevel || 0), 0) / recentMoods.length 
        : 0;
      
      // Count completions
      const activeGoalsCount = goals.filter(g => g.isActive).length;
      const completedGoalsCount = goals.filter(g => !g.isActive && (g.progress ?? 0) >= 100).length;
      const activeHabitsCount = habits.filter(h => h.isActive).length;
      const activeRoutinesCount = routines.filter(r => r.isActive).length;
      
      res.json({
        period: `${days} days`,
        moodTrends: {
          averageEnergy: Math.round(avgEnergy * 10) / 10,
          averageMood: Math.round(avgMood * 10) / 10,
          averageClarity: Math.round(avgClarity * 10) / 10,
          totalLogs: recentMoods.length
        },
        progress: {
          activeGoals: activeGoalsCount,
          completedGoals: completedGoalsCount,
          activeHabits: activeHabitsCount,
          activeRoutines: activeRoutinesCount
        },
        insights: [
          avgEnergy > 7 ? "Your energy levels have been strong this week!" : 
          avgEnergy < 4 ? "Your energy has been low. Consider adding more rest and recovery." :
          "Your energy levels are moderate. Balance is key.",
          
          avgMood > 7 ? "You've been feeling positive lately!" :
          avgMood < 4 ? "Your mood has been lower. Reach out for support if needed." :
          "Your mood has been steady."
        ]
      });
    } catch (error) {
      console.error("Error generating summary:", error);
      res.status(500).json({ error: "Failed to generate summary" });
    }
  });

  // Unified Search Endpoint - searches across tasks, projects, routines, goals
  app.post("/api/search/unified", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { query, categories } = req.body;
      
      if (!query || query.trim().length === 0) {
        return res.json({ results: [], summary: "Please enter a search query" });
      }
      
      const searchTerm = query.toLowerCase();
      const results: any[] = [];
      
      // Determine which categories to search
      const searchCategories = categories || ["tasks", "projects", "routines", "goals"];
      
      // Search Tasks
      if (searchCategories.includes("tasks")) {
        const tasks = await storage.getTasks(userId);
        const matchingTasks = tasks.filter(task => 
          task.title?.toLowerCase().includes(searchTerm) ||
          task.description?.toLowerCase().includes(searchTerm) ||
          task.dimensionTags?.some(tag => tag.toLowerCase().includes(searchTerm))
        );
        
        results.push(...matchingTasks.map(task => ({
          id: task.id,
          type: "task",
          title: task.title,
          description: task.description,
          status: task.status,
          dueDate: task.dueDate,
          relevanceScore: calculateRelevance(task.title, task.description, searchTerm)
        })));
      }
      
      // Search Projects
      if (searchCategories.includes("projects")) {
        const projects = await storage.getProjects(userId);
        const matchingProjects = projects.filter(project =>
          project.name?.toLowerCase().includes(searchTerm) ||
          project.description?.toLowerCase().includes(searchTerm) ||
          project.dimensionTags?.some(tag => tag.toLowerCase().includes(searchTerm))
        );
        
        results.push(...matchingProjects.map(project => ({
          id: project.id,
          type: "project",
          title: project.name,
          description: project.description,
          status: project.isActive ? "active" : "inactive",
          relevanceScore: calculateRelevance(project.name, project.description, searchTerm)
        })));
      }
      
      // Search Routines
      if (searchCategories.includes("routines")) {
        const routines = await storage.getRoutines(userId);
        const matchingRoutines = routines.filter(routine =>
          routine.name?.toLowerCase().includes(searchTerm) ||
          routine.explainWhy?.toLowerCase().includes(searchTerm)
        );
        
        results.push(...matchingRoutines.map(routine => ({
          id: routine.id,
          type: "routine",
          title: routine.name,
          description: routine.explainWhy,
          isActive: routine.isActive,
          duration: routine.totalDurationMinutes,
          relevanceScore: calculateRelevance(routine.name, routine.explainWhy, searchTerm)
        })));
      }
      
      // Search Goals
      if (searchCategories.includes("goals")) {
        const goals = await storage.getGoals(userId);
        const matchingGoals = goals.filter(goal =>
          goal.title?.toLowerCase().includes(searchTerm) ||
          goal.description?.toLowerCase().includes(searchTerm) ||
          goal.wellnessDimension?.toLowerCase().includes(searchTerm)
        );
        
        results.push(...matchingGoals.map(goal => ({
          id: goal.id,
          type: "goal",
          title: goal.title,
          description: goal.description,
          progress: goal.progress,
          isActive: goal.isActive,
          relevanceScore: calculateRelevance(goal.title, goal.description, searchTerm)
        })));
      }
      
      // Sort by relevance score (higher is better)
      results.sort((a, b) => b.relevanceScore - a.relevanceScore);
      
      res.json({
        results: results.slice(0, 20), // Limit to top 20 results
        totalResults: results.length,
        query: query
      });
    } catch (error) {
      console.error("Error performing unified search:", error);
      res.status(500).json({ error: "Search failed" });
    }
  });

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



  // ── AI Routine Step Generation ─────────────────────────────────────────────
  // Generates personalized routine steps for a given template using the user's
  // profile (fitness goal, energy time, day structure, goals, habits).
  // Falls back to curated defaults if AI is not configured or fails.
}
