import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { storage } from "./storage";
import { sendPasswordResetEmail } from "./email";
import { generateChatResponse, generateLifeSystemRecommendations, generateDashboardInsight, generateFullAnalysis, detectIntentAndRespond, generateLearnModeQuestion, generateWorkoutPlan, generateMeditationSuggestions } from "./openai";
import {
  insertUserSchema,
  insertGoalSchema,
  insertHabitSchema,
  insertMoodLogSchema,
  insertScheduleBlockSchema,
  insertWellnessBlueprintSchema,
  insertBaselineProfileSchema,
  insertStressSignalsSchema,
  insertStabilizingActionSchema,
  insertSupportPreferencesSchema,
  insertRecoveryReflectionSchema,
  insertRoutineSchema,
  insertTaskSchema,
  insertProjectSchema,
  insertProjectChatSchema,
  insertCalendarEventSchema,
  insertUserProfileSchema,
  insertChallengeSchema,
  insertBodyScanSchema,
  insertSystemModuleSchema,
  insertDailyScheduleEventSchema,
  insertUserSystemPreferencesSchema,
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
  const isProduction = process.env.NODE_ENV === "production";
  
  if (isProduction && !process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET environment variable is required in production");
  }
  
  const sessionSecret = process.env.SESSION_SECRET || "wellness-dev-only-secret-key-not-for-production";
  
  app.use(
    session({
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: isProduction,
        httpOnly: true,
        sameSite: "lax",
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
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ error: "Session error" });
        }
        res.json({ user: { id: user.id, email: user.email, onboardingCompleted: user.onboardingCompleted } });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password, rememberMe } = req.body;
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      req.session.userId = user.id;
      if (rememberMe) {
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
      }
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ error: "Session error" });
        }
        res.json({ user: { id: user.id, email: user.email, onboardingCompleted: user.onboardingCompleted } });
      });
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

  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.json({ success: true, message: "If an account exists with this email, a reset link has been sent." });
      }
      
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      
      await storage.createPasswordResetToken({
        userId: user.id,
        token,
        expiresAt,
      });
      
      await sendPasswordResetEmail(email, token);
      
      res.json({ success: true, message: "If an account exists with this email, a reset link has been sent." });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Failed to process request" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        return res.status(400).json({ error: "Token and password are required" });
      }
      
      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }
      
      const resetToken = await storage.getPasswordResetToken(token);
      if (!resetToken) {
        return res.status(400).json({ error: "Invalid or expired reset link" });
      }
      
      if (resetToken.usedAt) {
        return res.status(400).json({ error: "This reset link has already been used" });
      }
      
      if (new Date() > resetToken.expiresAt) {
        return res.status(400).json({ error: "This reset link has expired" });
      }
      
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      await storage.updateUser(resetToken.userId, { password: hashedPassword });
      await storage.markPasswordResetTokenUsed(resetToken.id);
      
      res.json({ success: true, message: "Password has been reset successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  app.get("/api/auth/verify-reset-token", async (req, res) => {
    try {
      const { token } = req.query;
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ valid: false, error: "Token is required" });
      }
      
      const resetToken = await storage.getPasswordResetToken(token);
      if (!resetToken || resetToken.usedAt || new Date() > resetToken.expiresAt) {
        return res.json({ valid: false });
      }
      
      res.json({ valid: true });
    } catch (error) {
      res.status(500).json({ valid: false, error: "Failed to verify token" });
    }
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

  app.post("/api/chat/smart", async (req, res) => {
    try {
      const { message, conversationHistory, context, userProfile: clientProfile, lifeSystemContext } = req.body;
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
      
      const [user, goals, habits, profile] = await Promise.all([
        storage.getUser(userId),
        storage.getGoals(userId),
        storage.getHabits(userId),
        storage.getUserProfile(userId),
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
        profile: profile || clientProfile || null,
        lifeSystem: lifeSystemContext || null,
      };
      
      const result = await detectIntentAndRespond(
        message,
        conversationHistory || [],
        userContext
      );
      
      res.json(result);
    } catch (error) {
      console.error("Smart chat error:", error);
      res.status(500).json({ error: "Failed to get response" });
    }
  });

  app.post("/api/workout/generate", async (req, res) => {
    try {
      const { preferences } = req.body;
      const plan = await generateWorkoutPlan(preferences || {});
      res.json(plan);
    } catch (error) {
      console.error("Workout generation error:", error);
      res.status(500).json({ error: "Failed to generate workout plan" });
    }
  });

  app.post("/api/meditation/suggest", async (req, res) => {
    try {
      const { preferences } = req.body;
      const suggestions = await generateMeditationSuggestions(preferences || {});
      res.json(suggestions);
    } catch (error) {
      console.error("Meditation suggestion error:", error);
      res.status(500).json({ error: "Failed to get meditation suggestions" });
    }
  });

  app.post("/api/learn-mode/question", async (req, res) => {
    try {
      const { previousAnswers, focusArea } = req.body;
      const result = await generateLearnModeQuestion(previousAnswers || [], focusArea);
      res.json(result);
    } catch (error) {
      console.error("Learn mode error:", error);
      res.status(500).json({ error: "Failed to generate question" });
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

  app.get("/api/blueprint", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      let blueprint = await storage.getWellnessBlueprint(userId);
      
      if (!blueprint) {
        blueprint = await storage.createWellnessBlueprint({ userId });
      }
      
      const [baseline, signals, actions, support, reflections] = await Promise.all([
        storage.getBaselineProfile(blueprint.id),
        storage.getStressSignals(blueprint.id),
        storage.getStabilizingActions(blueprint.id),
        storage.getSupportPreferences(blueprint.id),
        storage.getRecoveryReflections(blueprint.id),
      ]);
      
      res.json({
        blueprint,
        baseline,
        signals,
        actions,
        support,
        reflections,
      });
    } catch (error) {
      console.error("Blueprint error:", error);
      res.status(500).json({ error: "Failed to load blueprint" });
    }
  });

  app.patch("/api/blueprint", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const blueprint = await storage.getWellnessBlueprint(userId);
      if (!blueprint) {
        return res.status(404).json({ error: "Blueprint not found" });
      }
      const updated = await storage.updateWellnessBlueprint(blueprint.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update blueprint" });
    }
  });

  app.post("/api/blueprint/baseline", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      let blueprint = await storage.getWellnessBlueprint(userId);
      if (!blueprint) {
        blueprint = await storage.createWellnessBlueprint({ userId });
      }
      
      const existing = await storage.getBaselineProfile(blueprint.id);
      if (existing) {
        const updated = await storage.updateBaselineProfile(existing.id, req.body);
        return res.json(updated);
      }
      
      const data = insertBaselineProfileSchema.parse({ ...req.body, blueprintId: blueprint.id });
      const created = await storage.createBaselineProfile(data);
      res.json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to save baseline profile" });
    }
  });

  app.post("/api/blueprint/signals", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      let blueprint = await storage.getWellnessBlueprint(userId);
      if (!blueprint) {
        blueprint = await storage.createWellnessBlueprint({ userId });
      }
      
      const existing = await storage.getStressSignals(blueprint.id);
      if (existing) {
        const updated = await storage.updateStressSignals(existing.id, req.body);
        return res.json(updated);
      }
      
      const data = insertStressSignalsSchema.parse({ ...req.body, blueprintId: blueprint.id });
      const created = await storage.createStressSignals(data);
      res.json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to save stress signals" });
    }
  });

  app.get("/api/blueprint/actions", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const blueprint = await storage.getWellnessBlueprint(userId);
      if (!blueprint) {
        return res.json([]);
      }
      const actions = await storage.getStabilizingActions(blueprint.id);
      res.json(actions);
    } catch (error) {
      res.status(500).json({ error: "Failed to load actions" });
    }
  });

  app.post("/api/blueprint/actions", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      let blueprint = await storage.getWellnessBlueprint(userId);
      if (!blueprint) {
        blueprint = await storage.createWellnessBlueprint({ userId });
      }
      
      const data = insertStabilizingActionSchema.parse({ ...req.body, blueprintId: blueprint.id });
      const created = await storage.createStabilizingAction(data);
      res.json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create action" });
    }
  });

  app.patch("/api/blueprint/actions/:id", requireAuth, async (req, res) => {
    try {
      const updated = await storage.updateStabilizingAction(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update action" });
    }
  });

  app.delete("/api/blueprint/actions/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteStabilizingAction(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete action" });
    }
  });

  app.post("/api/blueprint/support", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      let blueprint = await storage.getWellnessBlueprint(userId);
      if (!blueprint) {
        blueprint = await storage.createWellnessBlueprint({ userId });
      }
      
      const existing = await storage.getSupportPreferences(blueprint.id);
      if (existing) {
        const updated = await storage.updateSupportPreferences(existing.id, req.body);
        return res.json(updated);
      }
      
      const data = insertSupportPreferencesSchema.parse({ ...req.body, blueprintId: blueprint.id });
      const created = await storage.createSupportPreferences(data);
      res.json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to save support preferences" });
    }
  });

  app.get("/api/blueprint/reflections", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const blueprint = await storage.getWellnessBlueprint(userId);
      if (!blueprint) {
        return res.json([]);
      }
      const reflections = await storage.getRecoveryReflections(blueprint.id);
      res.json(reflections);
    } catch (error) {
      res.status(500).json({ error: "Failed to load reflections" });
    }
  });

  app.post("/api/blueprint/reflections", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      let blueprint = await storage.getWellnessBlueprint(userId);
      if (!blueprint) {
        blueprint = await storage.createWellnessBlueprint({ userId });
      }
      
      const data = insertRecoveryReflectionSchema.parse({ ...req.body, blueprintId: blueprint.id });
      const created = await storage.createRecoveryReflection(data);
      res.json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create reflection" });
    }
  });

  app.patch("/api/blueprint/reflections/:id", requireAuth, async (req, res) => {
    try {
      const updated = await storage.updateRecoveryReflection(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update reflection" });
    }
  });

  app.delete("/api/blueprint/reflections/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteRecoveryReflection(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete reflection" });
    }
  });

  app.get("/api/routines", requireAuth, async (req, res) => {
    try {
      const routines = await storage.getRoutines(req.session.userId!);
      res.json(routines);
    } catch (error) {
      res.status(500).json({ error: "Failed to load routines" });
    }
  });

  app.post("/api/routines", requireAuth, async (req, res) => {
    try {
      const data = insertRoutineSchema.parse({ ...req.body, userId: req.session.userId! });
      const created = await storage.createRoutine(data);
      res.json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create routine" });
    }
  });

  app.patch("/api/routines/:id", requireAuth, async (req, res) => {
    try {
      const updated = await storage.updateRoutine(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update routine" });
    }
  });

  app.delete("/api/routines/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteRoutine(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete routine" });
    }
  });

  app.get("/api/tasks", requireAuth, async (req, res) => {
    try {
      const tasks = await storage.getTasks(req.session.userId!);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to load tasks" });
    }
  });

  app.post("/api/tasks", requireAuth, async (req, res) => {
    try {
      const data = insertTaskSchema.parse({ ...req.body, userId: req.session.userId! });
      const created = await storage.createTask(data);
      res.json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  app.patch("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const updated = await storage.updateTask(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteTask(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  app.get("/api/projects", requireAuth, async (req, res) => {
    try {
      const projects = await storage.getProjects(req.session.userId!);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Failed to load projects" });
    }
  });

  app.get("/api/projects/:id", requireAuth, async (req, res) => {
    try {
      const project = await storage.getProjectForUser(req.params.id, req.session.userId!);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to load project" });
    }
  });

  app.post("/api/projects", requireAuth, async (req, res) => {
    try {
      const data = insertProjectSchema.parse({ ...req.body, userId: req.session.userId! });
      const created = await storage.createProject(data);
      res.json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create project" });
    }
  });

  app.patch("/api/projects/:id", requireAuth, async (req, res) => {
    try {
      const updated = await storage.updateProjectForUser(req.params.id, req.session.userId!, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteProjectForUser(req.params.id, req.session.userId!);
      if (!deleted) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  app.get("/api/projects/:id/chats", requireAuth, async (req, res) => {
    try {
      const chats = await storage.getProjectChatsForUser(req.params.id, req.session.userId!);
      res.json(chats);
    } catch (error) {
      res.status(500).json({ error: "Failed to load project chats" });
    }
  });

  app.post("/api/projects/:id/chats", requireAuth, async (req, res) => {
    try {
      const data = insertProjectChatSchema.parse({ ...req.body, projectId: req.params.id });
      const created = await storage.createProjectChatForUser(data, req.session.userId!);
      if (!created) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create project chat" });
    }
  });

  app.get("/api/calendar", requireAuth, async (req, res) => {
    try {
      const events = await storage.getCalendarEvents(req.session.userId!);
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to load calendar events" });
    }
  });

  app.get("/api/calendar/:id", requireAuth, async (req, res) => {
    try {
      const event = await storage.getCalendarEventForUser(req.params.id, req.session.userId!);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      res.status(500).json({ error: "Failed to load event" });
    }
  });

  app.post("/api/calendar", requireAuth, async (req, res) => {
    try {
      const data = insertCalendarEventSchema.parse({ ...req.body, userId: req.session.userId! });
      const created = await storage.createCalendarEvent(data);
      res.json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create event" });
    }
  });

  app.patch("/api/calendar/:id", requireAuth, async (req, res) => {
    try {
      const updated = await storage.updateCalendarEventForUser(req.params.id, req.session.userId!, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Event not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update event" });
    }
  });

  app.delete("/api/calendar/:id", requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteCalendarEventForUser(req.params.id, req.session.userId!);
      if (!deleted) {
        return res.status(404).json({ error: "Event not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete event" });
    }
  });

  app.get("/api/profile", requireAuth, async (req, res) => {
    try {
      const profile = await storage.getUserProfile(req.session.userId!);
      res.json(profile || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to load profile" });
    }
  });

  app.post("/api/profile", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getUserProfile(req.session.userId!);
      if (existing) {
        const updated = await storage.updateUserProfile(req.session.userId!, req.body);
        return res.json(updated);
      }
      const data = insertUserProfileSchema.parse({ ...req.body, userId: req.session.userId! });
      const created = await storage.createUserProfile(data);
      res.json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to save profile" });
    }
  });

  app.patch("/api/profile", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getUserProfile(req.session.userId!);
      if (!existing) {
        const data = insertUserProfileSchema.parse({ ...req.body, userId: req.session.userId! });
        const created = await storage.createUserProfile(data);
        return res.json(created);
      }
      const updated = await storage.updateUserProfile(req.session.userId!, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.get("/api/challenges", requireAuth, async (req, res) => {
    try {
      const userChallenges = await storage.getChallenges(req.session.userId!);
      res.json(userChallenges);
    } catch (error) {
      res.status(500).json({ error: "Failed to load challenges" });
    }
  });

  app.get("/api/challenges/:id", requireAuth, async (req, res) => {
    try {
      const challenge = await storage.getChallenge(req.params.id, req.session.userId!);
      if (!challenge) {
        return res.status(404).json({ error: "Challenge not found" });
      }
      res.json(challenge);
    } catch (error) {
      res.status(500).json({ error: "Failed to load challenge" });
    }
  });

  app.post("/api/challenges", requireAuth, async (req, res) => {
    try {
      const data = insertChallengeSchema.parse({ ...req.body, userId: req.session.userId! });
      const created = await storage.createChallenge(data);
      res.json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create challenge" });
    }
  });

  app.patch("/api/challenges/:id", requireAuth, async (req, res) => {
    try {
      const updated = await storage.updateChallenge(req.params.id, req.session.userId!, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Challenge not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update challenge" });
    }
  });

  app.delete("/api/challenges/:id", requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteChallenge(req.params.id, req.session.userId!);
      if (!deleted) {
        return res.status(404).json({ error: "Challenge not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete challenge" });
    }
  });

  app.get("/api/body-scans", requireAuth, async (req, res) => {
    try {
      const scans = await storage.getBodyScans(req.session.userId!);
      res.json(scans);
    } catch (error) {
      res.status(500).json({ error: "Failed to load body scans" });
    }
  });

  app.post("/api/body-scans", requireAuth, async (req, res) => {
    try {
      const data = insertBodyScanSchema.parse({ ...req.body, userId: req.session.userId! });
      const created = await storage.createBodyScan(data);
      res.json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create body scan" });
    }
  });

  app.delete("/api/body-scans/:id", requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteBodyScan(req.params.id, req.session.userId!);
      if (!deleted) {
        return res.status(404).json({ error: "Body scan not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete body scan" });
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

  app.get("/api/system-modules", requireAuth, async (req, res) => {
    try {
      const modules = await storage.getSystemModules(req.session.userId!);
      res.json(modules);
    } catch (error) {
      res.status(500).json({ error: "Failed to load system modules" });
    }
  });

  app.get("/api/system-modules/:id", requireAuth, async (req, res) => {
    try {
      const module = await storage.getSystemModule(req.params.id);
      if (!module) {
        return res.status(404).json({ error: "System module not found" });
      }
      res.json(module);
    } catch (error) {
      res.status(500).json({ error: "Failed to load system module" });
    }
  });

  app.post("/api/system-modules", requireAuth, async (req, res) => {
    try {
      const data = insertSystemModuleSchema.parse({ ...req.body, userId: req.session.userId! });
      const created = await storage.createSystemModule(data);
      res.json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create system module" });
    }
  });

  app.patch("/api/system-modules/:id", requireAuth, async (req, res) => {
    try {
      const updated = await storage.updateSystemModule(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "System module not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update system module" });
    }
  });

  app.delete("/api/system-modules/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteSystemModule(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete system module" });
    }
  });

  app.get("/api/schedule-events", requireAuth, async (req, res) => {
    try {
      const dayOfWeek = req.query.day ? parseInt(req.query.day as string) : undefined;
      let events;
      if (dayOfWeek !== undefined && !isNaN(dayOfWeek)) {
        events = await storage.getScheduleEventsByDay(req.session.userId!, dayOfWeek);
      } else {
        events = await storage.getScheduleEvents(req.session.userId!);
      }
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to load schedule events" });
    }
  });

  app.post("/api/schedule-events", requireAuth, async (req, res) => {
    try {
      const data = insertDailyScheduleEventSchema.parse({ ...req.body, userId: req.session.userId! });
      const created = await storage.createScheduleEvent(data);
      res.json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create schedule event" });
    }
  });

  app.patch("/api/schedule-events/:id", requireAuth, async (req, res) => {
    try {
      const updated = await storage.updateScheduleEvent(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Schedule event not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update schedule event" });
    }
  });

  app.delete("/api/schedule-events/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteScheduleEvent(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete schedule event" });
    }
  });

  app.get("/api/system-preferences", requireAuth, async (req, res) => {
    try {
      const prefs = await storage.getUserSystemPreferences(req.session.userId!);
      res.json(prefs || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to load system preferences" });
    }
  });

  app.post("/api/system-preferences", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getUserSystemPreferences(req.session.userId!);
      if (existing) {
        const updated = await storage.updateUserSystemPreferences(req.session.userId!, req.body);
        return res.json(updated);
      }
      const data = insertUserSystemPreferencesSchema.parse({ ...req.body, userId: req.session.userId! });
      const created = await storage.createUserSystemPreferences(data);
      res.json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to save system preferences" });
    }
  });

  app.patch("/api/system-preferences", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getUserSystemPreferences(req.session.userId!);
      if (!existing) {
        const data = insertUserSystemPreferencesSchema.parse({ ...req.body, userId: req.session.userId! });
        const created = await storage.createUserSystemPreferences(data);
        return res.json(created);
      }
      const updated = await storage.updateUserSystemPreferences(req.session.userId!, req.body);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update system preferences" });
    }
  });

  return httpServer;
}
