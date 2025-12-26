import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { generateChatResponse, generateLifeSystemRecommendations, generateDashboardInsight, generateFullAnalysis } from "./openai";
import {
  insertUserSchema,
  insertGoalSchema,
  insertHabitSchema,
  insertMoodLogSchema,
  insertScheduleBlockSchema,
} from "@shared/schema";
import { z } from "zod";

const SALT_ROUNDS = 10;

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

interface ExtractedCategoryData {
  category: string;
  title: string;
  content?: string;
  date?: string;
  metadata?: Record<string, unknown>;
}

function extractCategoryData(userMessage: string, aiResponse: string, context?: string): ExtractedCategoryData[] {
  const results: ExtractedCategoryData[] = [];
  const combined = `${userMessage} ${aiResponse}`.toLowerCase();
  
  const calendarPatterns = [
    /(?:schedule|plan|appointment|meeting|event)\s+(?:for|on|at)?\s*([a-zA-Z]+day|\d{1,2}(?:\/|-)\d{1,2})/gi,
    /(?:tomorrow|today|next\s+week|this\s+week)/gi,
  ];
  
  const mealPatterns = [
    /(?:breakfast|lunch|dinner|meal|recipe|cook|eat)\s+([^.!?]+)/gi,
    /(?:meal\s+prep|food\s+plan)/gi,
  ];
  
  const goalPatterns = [
    /(?:goal|want\s+to|aim\s+to|plan\s+to)\s+([^.!?]+)/gi,
    /(?:achieve|accomplish|complete)\s+([^.!?]+)/gi,
  ];
  
  const financialPatterns = [
    /(?:budget|save|spend|money|invest|payment|expense)\s+([^.!?]+)/gi,
    /\$\d+/gi,
  ];
  
  const diaryPatterns = [
    /(?:feeling|felt|i\s+feel|today\s+i|journal)\s+([^.!?]+)/gi,
  ];
  
  if (context === "calendar" || calendarPatterns.some(p => p.test(combined))) {
    const eventMatch = userMessage.match(/(?:schedule|plan|add|create|set)\s+(?:a\s+)?([^.!?]+)/i);
    if (eventMatch) {
      results.push({
        category: "calendar",
        title: eventMatch[1].trim().slice(0, 100),
        content: userMessage,
        date: new Date().toISOString().split('T')[0],
      });
    }
  }
  
  if (context === "meals" || mealPatterns.some(p => p.test(combined))) {
    const mealMatch = userMessage.match(/(?:make|cook|prepare|eat|try)\s+([^.!?]+)/i);
    if (mealMatch) {
      results.push({
        category: "meals",
        title: mealMatch[1].trim().slice(0, 100),
        content: aiResponse,
      });
    }
  }
  
  if (context === "goals" || goalPatterns.some(p => p.test(combined))) {
    const goalMatch = userMessage.match(/(?:goal|want\s+to|plan\s+to)\s+([^.!?]+)/i);
    if (goalMatch) {
      results.push({
        category: "goals",
        title: goalMatch[1].trim().slice(0, 100),
        content: aiResponse,
      });
    }
  }
  
  if (context === "financial" || financialPatterns.some(p => p.test(combined))) {
    const finMatch = userMessage.match(/(?:budget|save|spend)\s+([^.!?]+)/i);
    if (finMatch) {
      results.push({
        category: "financial",
        title: finMatch[1].trim().slice(0, 100),
        content: aiResponse,
      });
    }
  }
  
  if (context === "diary" || diaryPatterns.some(p => p.test(combined))) {
    results.push({
      category: "diary",
      title: `Entry - ${new Date().toLocaleDateString()}`,
      content: userMessage,
      date: new Date().toISOString().split('T')[0],
    });
  }
  
  if (context && results.length === 0 && userMessage.length > 20) {
    results.push({
      category: context,
      title: userMessage.slice(0, 50) + (userMessage.length > 50 ? "..." : ""),
      content: aiResponse,
      date: new Date().toISOString().split('T')[0],
    });
  }
  
  return results;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "wellness-lifestyle-ai-secret-key-dev",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    })
  );

  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      const existing = await storage.getUserByEmail(data.email);
      if (existing) {
        return res.status(400).json({ error: "Email already registered" });
      }
      const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);
      const user = await storage.createUser({ ...data, password: hashedPassword });
      req.session.userId = user.id;
      res.json({ user: { id: user.id, email: user.email, onboardingCompleted: user.onboardingCompleted } });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      req.session.userId = user.id;
      res.json({ user: { id: user.id, email: user.email, onboardingCompleted: user.onboardingCompleted } });
    } catch (error) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ user: { id: user.id, email: user.email, onboardingCompleted: user.onboardingCompleted, systemName: user.systemName } });
  });

  app.post("/api/onboarding/complete", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { 
        responsibilities, 
        priorities, 
        freeTimeHours, 
        peakMotivationTime, 
        wellnessFocus, 
        systemName,
        lifeAreaDetails,
        shortTermGoals,
        longTermGoals,
        relationshipGoals 
      } = req.body;

      const { conversationData } = req.body;
      
      await storage.createOnboardingProfile({
        userId,
        responsibilities: responsibilities || [],
        priorities: priorities || [],
        freeTimeHours,
        peakMotivationTime,
        wellnessFocus: wellnessFocus || [],
        lifeAreaDetails: lifeAreaDetails || {},
        shortTermGoals: shortTermGoals || "",
        longTermGoals: longTermGoals || "",
        relationshipGoals: relationshipGoals || "",
        conversationData: conversationData || null,
      });

      const recommendations = await generateLifeSystemRecommendations({
        responsibilities: responsibilities || [],
        priorities: priorities || [],
        freeTimeHours,
        peakMotivationTime,
        wellnessFocus: wellnessFocus || [],
        lifeAreaDetails,
        shortTermGoals,
        longTermGoals,
        conversationData,
      });

      await storage.createLifeSystem({
        userId,
        name: systemName || "My Life System",
        weeklySchedule: recommendations.weeklyScheduleSuggestions,
        suggestedHabits: recommendations.suggestedHabits,
        suggestedTools: [],
        scheduleBlocks: recommendations.scheduleBlocks || [],
        mealSuggestions: recommendations.mealSuggestions || [],
      });

      for (const habit of recommendations.suggestedHabits) {
        await storage.createHabit({
          userId,
          title: habit.title,
          description: habit.description,
          frequency: habit.frequency,
          isActive: true,
        });
      }

      for (const goal of recommendations.suggestedGoals) {
        await storage.createGoal({
          userId,
          title: goal.title,
          description: goal.description,
          wellnessDimension: goal.wellnessDimension,
          isActive: true,
        });
      }

      await storage.updateUser(userId, { onboardingCompleted: true, systemName: systemName || "My Life System" });

      res.json({ success: true });
    } catch (error) {
      console.error("Onboarding error:", error);
      res.status(500).json({ error: "Failed to complete onboarding" });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { message, conversationHistory, context } = req.body;
      let userId = req.session.userId;
      
      if (!userId) {
        let devUser = await storage.getUserByEmail("dev@wellness.local");
        if (!devUser) {
          devUser = await storage.createUser({
            email: "dev@wellness.local",
            password: "devpassword123",
          });
        }
        userId = devUser.id;
        req.session.userId = userId;
      }
      
      const [user, goals, habits, recentEntries, moodLogs] = await Promise.all([
        storage.getUser(userId),
        storage.getGoals(userId),
        storage.getHabits(userId),
        storage.getCategoryEntries(userId),
        storage.getMoodLogs(userId),
      ]);
      
      const userContext = {
        category: context,
        systemName: user?.systemName || undefined,
        activeGoals: goals.filter(g => g.isActive).map(g => ({ 
          title: g.title, 
          progress: g.progress || 0 
        })),
        habits: habits.filter(h => h.isActive).map(h => ({ 
          title: h.title, 
          streak: h.streak || 0 
        })),
        upcomingEvents: recentEntries
          .filter(e => e.category === 'calendar' && e.date)
          .slice(0, 5)
          .map(e => ({ title: e.title, date: e.date! })),
        recentMoods: moodLogs.slice(0, 5).map(m => ({
          energy: m.energyLevel,
          mood: m.moodLevel,
          date: m.createdAt?.toISOString().split('T')[0] || ''
        })),
        categoryEntries: recentEntries.slice(0, 10).map(e => ({
          category: e.category,
          title: e.title,
          content: e.content || '',
          date: e.date || undefined
        }))
      };
      
      const response = await generateChatResponse(
        message,
        conversationHistory || [],
        userContext
      );
      
      let updatedCategories: string[] = [];
      
      const extractedData = extractCategoryData(message, response, context);
      
      for (const item of extractedData) {
        try {
          await storage.createCategoryEntry({
            userId,
            category: item.category,
            title: item.title,
            content: item.content,
            date: item.date,
            metadata: item.metadata,
          });
          if (!updatedCategories.includes(item.category)) {
            updatedCategories.push(item.category);
          }
        } catch (err) {
          console.error("Failed to create category entry:", err);
        }
      }
      
      res.json({ response, updatedCategories });
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ error: "Failed to get response" });
    }
  });

  app.get("/api/category-entries", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.json([]);
      }
      const category = req.query.category as string | undefined;
      const entries = await storage.getCategoryEntries(userId, category);
      res.json(entries);
    } catch (error) {
      res.status(500).json({ error: "Failed to get category entries" });
    }
  });

  app.delete("/api/category-entries/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteCategoryEntry(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete entry" });
    }
  });

  app.get("/api/dashboard", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      const lifeSystem = await storage.getLifeSystem(userId);
      const goals = await storage.getGoals(userId);
      const habits = await storage.getHabits(userId);
      const todaysMood = await storage.getTodaysMoodLog(userId);

      res.json({
        systemName: user?.systemName || lifeSystem?.name || "Your Life System",
        lifeSystem,
        goals: goals.filter((g) => g.isActive),
        habits: habits.filter((h) => h.isActive),
        todaysMood,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to load dashboard" });
    }
  });

  app.get("/api/goals", requireAuth, async (req, res) => {
    const goals = await storage.getGoals(req.session.userId!);
    res.json(goals);
  });

  app.post("/api/goals", requireAuth, async (req, res) => {
    try {
      const goal = await storage.createGoal({
        userId: req.session.userId!,
        ...req.body,
      });
      res.json(goal);
    } catch (error) {
      res.status(500).json({ error: "Failed to create goal" });
    }
  });

  app.patch("/api/goals/:id", requireAuth, async (req, res) => {
    try {
      const goal = await storage.updateGoal(req.params.id, req.body);
      res.json(goal);
    } catch (error) {
      res.status(500).json({ error: "Failed to update goal" });
    }
  });

  app.delete("/api/goals/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteGoal(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete goal" });
    }
  });

  app.get("/api/habits", requireAuth, async (req, res) => {
    const habits = await storage.getHabits(req.session.userId!);
    res.json(habits);
  });

  app.post("/api/habits", requireAuth, async (req, res) => {
    try {
      const habit = await storage.createHabit({
        userId: req.session.userId!,
        ...req.body,
      });
      res.json(habit);
    } catch (error) {
      res.status(500).json({ error: "Failed to create habit" });
    }
  });

  app.patch("/api/habits/:id", requireAuth, async (req, res) => {
    try {
      const habit = await storage.updateHabit(req.params.id, req.body);
      res.json(habit);
    } catch (error) {
      res.status(500).json({ error: "Failed to update habit" });
    }
  });

  app.delete("/api/habits/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteHabit(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete habit" });
    }
  });

  app.post("/api/habits/:id/log", requireAuth, async (req, res) => {
    try {
      const habit = await storage.getHabit(req.params.id);
      if (!habit) {
        return res.status(404).json({ error: "Habit not found" });
      }
      await storage.createHabitLog({ habitId: req.params.id, notes: req.body.notes });
      await storage.updateHabit(req.params.id, { streak: (habit.streak || 0) + 1 });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to log habit" });
    }
  });

  app.get("/api/mood", requireAuth, async (req, res) => {
    const logs = await storage.getMoodLogs(req.session.userId!);
    res.json(logs);
  });

  app.get("/api/mood/today", requireAuth, async (req, res) => {
    const log = await storage.getTodaysMoodLog(req.session.userId!);
    res.json(log || null);
  });

  app.post("/api/mood", requireAuth, async (req, res) => {
    try {
      const log = await storage.createMoodLog({
        userId: req.session.userId!,
        ...req.body,
      });
      res.json(log);
    } catch (error) {
      res.status(500).json({ error: "Failed to log mood" });
    }
  });

  app.get("/api/schedule", requireAuth, async (req, res) => {
    const blocks = await storage.getScheduleBlocks(req.session.userId!);
    res.json(blocks);
  });

  app.post("/api/schedule", requireAuth, async (req, res) => {
    try {
      const block = await storage.createScheduleBlock({
        userId: req.session.userId!,
        ...req.body,
      });
      res.json(block);
    } catch (error) {
      res.status(500).json({ error: "Failed to create schedule block" });
    }
  });

  app.patch("/api/schedule/:id", requireAuth, async (req, res) => {
    try {
      const block = await storage.updateScheduleBlock(req.params.id, req.body);
      res.json(block);
    } catch (error) {
      res.status(500).json({ error: "Failed to update schedule block" });
    }
  });

  app.delete("/api/schedule/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteScheduleBlock(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete schedule block" });
    }
  });

  app.get("/api/checkins", requireAuth, async (req, res) => {
    const checkIns = await storage.getCheckIns(req.session.userId!);
    res.json(checkIns);
  });


  app.get("/api/progress", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const moodLogs = await storage.getMoodLogs(userId);
      const goals = await storage.getGoals(userId);
      const habits = await storage.getHabits(userId);

      res.json({ moodLogs, goals, habits });
    } catch (error) {
      res.status(500).json({ error: "Failed to load progress data" });
    }
  });

  app.get("/api/insight", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const moodLogs = await storage.getMoodLogs(userId);
      const habits = await storage.getHabits(userId);
      const goals = await storage.getGoals(userId);
      const profile = await storage.getOnboardingProfile(userId);

      const insight = await generateDashboardInsight({
        moodLogs: moodLogs.slice(0, 7).map(m => ({
          energyLevel: m.energyLevel,
          moodLevel: m.moodLevel,
          clarityLevel: m.clarityLevel,
          createdAt: m.createdAt,
        })),
        habits: habits.map(h => ({
          title: h.title,
          streak: h.streak || 0,
        })),
        goals: goals.map(g => ({
          title: g.title,
          progress: g.progress,
        })),
        peakMotivationTime: profile?.peakMotivationTime || undefined,
        wellnessFocus: profile?.wellnessFocus || undefined,
      });

      res.json({ insight });
    } catch (error) {
      console.error("Insight error:", error);
      res.status(500).json({ error: "Failed to generate insight" });
    }
  });

  app.post("/api/insights/analyze", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const moodLogs = await storage.getMoodLogs(userId);
      const habits = await storage.getHabits(userId);
      const goals = await storage.getGoals(userId);
      const profile = await storage.getOnboardingProfile(userId);

      const analysis = await generateFullAnalysis({
        moodLogs: moodLogs.map(m => ({
          energyLevel: m.energyLevel,
          moodLevel: m.moodLevel,
          clarityLevel: m.clarityLevel,
          createdAt: m.createdAt,
        })),
        habits: habits.map(h => ({
          title: h.title,
          streak: h.streak || 0,
        })),
        goals: goals.map(g => ({
          title: g.title,
          progress: g.progress,
          wellnessDimension: g.wellnessDimension,
        })),
        peakMotivationTime: profile?.peakMotivationTime || undefined,
        wellnessFocus: profile?.wellnessFocus || undefined,
      });

      res.json(analysis);
    } catch (error) {
      console.error("Analysis error:", error);
      res.status(500).json({ error: "Failed to generate analysis" });
    }
  });

  return httpServer;
}
