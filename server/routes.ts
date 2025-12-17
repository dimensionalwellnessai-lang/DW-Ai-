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
      });

      await storage.createLifeSystem({
        userId,
        name: systemName || "My Life System",
        weeklySchedule: recommendations.weeklyScheduleSuggestions,
        suggestedHabits: recommendations.suggestedHabits,
        suggestedTools: [],
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

  app.post("/api/chat", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { message, messages } = req.body;

      const user = await storage.getUser(userId);
      const profile = await storage.getOnboardingProfile(userId);

      const reply = await generateChatResponse(message, messages || [], {
        systemName: user?.systemName || undefined,
        wellnessFocus: profile?.wellnessFocus || undefined,
        peakMotivationTime: profile?.peakMotivationTime || undefined,
      });

      await storage.createCheckIn({
        userId,
        type: "chat",
        messages: [...(messages || []), { role: "user", content: message }, { role: "assistant", content: reply }],
        aiResponse: reply,
      });

      res.json({ reply });
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ error: "Failed to get AI response" });
    }
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
