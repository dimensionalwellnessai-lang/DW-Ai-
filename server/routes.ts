import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcrypt";
import crypto from "crypto";
import multer from "multer";
import { storage } from "./storage";
import { pool } from "./db";
import { sendPasswordResetEmail, sendFeedbackEmail } from "./email";
import { generateChatResponse, generateLifeSystemRecommendations, generateDashboardInsight, generateFullAnalysis, detectIntentAndRespond, generateLearnModeQuestion, generateWorkoutPlan, generateMeditationSuggestions, analyzeMealPlanDocument } from "./openai";
import { extractTextFromBuffer, generateDocumentAnalysisPrompt, validateAnalysisResult, isProcessingError, detectPrimaryCategory, type DocumentAnalysisResult, type DocumentProcessingError } from "./document-parser";
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
  insertShoppingListSchema,
  insertShoppingListItemSchema,
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
  
  const PgSession = connectPgSimple(session);
  
  app.use(
    session({
      store: new PgSession({
        pool: pool,
        tableName: "session",
        createTableIfMissing: true,
      }),
      secret: sessionSecret,
      name: "fts.sid",
      resave: false,
      saveUninitialized: false,
      proxy: isProduction,
      cookie: {
        secure: isProduction,
        httpOnly: true,
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: "/",
      },
      rolling: true,
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
      // Set session duration based on rememberMe preference
      // Rolling sessions will extend this on each request
      if (rememberMe === true) {
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      } else if (rememberMe === false) {
        req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
      } else {
        // Default to 30 days for better UX if not specified
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
    res.json({ user: { id: user.id, email: user.email, firstName: user.firstName, onboardingCompleted: user.onboardingCompleted, systemName: user.systemName } });
  });

  app.post("/api/feedback", async (req, res) => {
    try {
      const { category, message, pageContext, energyLevel, metadata } = req.body;
      if (!category || !message) {
        return res.status(400).json({ error: "Category and message are required" });
      }
      
      const userId = req.session.userId || null;
      let userEmail: string | null = null;
      if (userId) {
        const user = await storage.getUser(userId);
        userEmail = user?.email || null;
      }
      
      const feedbackData = {
        userId,
        guestId: userId ? null : crypto.randomBytes(8).toString('hex'),
        category,
        message,
        pageContext: pageContext || null,
        energyLevel: energyLevel || null,
        metadata: metadata || null,
      };
      
      const result = await storage.createUserFeedback(feedbackData);
      
      sendFeedbackEmail(userEmail, userId, message, category, pageContext, metadata).catch(err => {
        console.error("Failed to send feedback email:", err);
      });
      
      res.json({ success: true, id: result.id });
    } catch (error) {
      console.error("Feedback error:", error);
      res.status(500).json({ error: "Failed to save feedback" });
    }
  });

  app.get("/api/conversations", requireAuth, async (req, res) => {
    try {
      const conversations = await storage.getConversations(req.session.userId!);
      res.json(conversations);
    } catch (error) {
      console.error("Get conversations error:", error);
      res.status(500).json({ error: "Failed to get conversations" });
    }
  });

  app.post("/api/conversations", requireAuth, async (req, res) => {
    try {
      const { title, category } = req.body;
      const conversation = await storage.createConversation({
        userId: req.session.userId!,
        title: title || "New Chat",
        category: category || "general",
        messages: [],
      });
      res.json(conversation);
    } catch (error) {
      console.error("Create conversation error:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  app.get("/api/conversations/:id", requireAuth, async (req, res) => {
    try {
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation || conversation.userId !== req.session.userId) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      res.json(conversation);
    } catch (error) {
      console.error("Get conversation error:", error);
      res.status(500).json({ error: "Failed to get conversation" });
    }
  });

  app.patch("/api/conversations/:id", requireAuth, async (req, res) => {
    try {
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation || conversation.userId !== req.session.userId) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const updated = await storage.updateConversation(req.params.id, {
        ...req.body,
        lastMessageAt: new Date(),
      });
      res.json(updated);
    } catch (error) {
      console.error("Update conversation error:", error);
      res.status(500).json({ error: "Failed to update conversation" });
    }
  });

  app.delete("/api/conversations/:id", requireAuth, async (req, res) => {
    try {
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation || conversation.userId !== req.session.userId) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      await storage.deleteConversation(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete conversation error:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  app.get("/api/weekly-checkin/state", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const trialStartAt = user.trialStartAt || null;
      let currentWeekNumber = 1;
      
      if (trialStartAt) {
        const daysSinceStart = Math.floor((Date.now() - new Date(trialStartAt).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceStart < 7) currentWeekNumber = 1;
        else if (daysSinceStart < 14) currentWeekNumber = 2;
        else if (daysSinceStart < 21) currentWeekNumber = 3;
        else currentWeekNumber = 4;
      }

      const responses = await storage.getWeeklyFeedbackResponses(req.session.userId!);
      const submittedWeeks = responses
        .filter(r => r.status === "submitted")
        .map(r => r.weekNumber);

      res.json({
        trialStartAt,
        currentWeekNumber,
        submittedWeeks
      });
    } catch (error) {
      console.error("Weekly checkin state error:", error);
      res.status(500).json({ error: "Failed to get weekly checkin state" });
    }
  });

  app.post("/api/weekly-checkin/start", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!user.trialStartAt) {
        const trialStartAt = new Date();
        await storage.updateUser(req.session.userId!, { trialStartAt });
        res.json({ trialStartAt });
      } else {
        res.json({ trialStartAt: user.trialStartAt });
      }
    } catch (error) {
      console.error("Weekly checkin start error:", error);
      res.status(500).json({ error: "Failed to start trial" });
    }
  });

  app.get("/api/weekly-checkin/:weekNumber", requireAuth, async (req, res) => {
    try {
      const weekNumber = parseInt(req.params.weekNumber);
      if (isNaN(weekNumber) || weekNumber < 1 || weekNumber > 4) {
        return res.status(400).json({ error: "Invalid week number" });
      }

      const response = await storage.getWeeklyFeedbackResponse(req.session.userId!, weekNumber);
      res.json(response || null);
    } catch (error) {
      console.error("Weekly checkin get error:", error);
      res.status(500).json({ error: "Failed to get weekly checkin" });
    }
  });

  app.post("/api/weekly-checkin/:weekNumber/save", requireAuth, async (req, res) => {
    try {
      const weekNumber = parseInt(req.params.weekNumber);
      if (isNaN(weekNumber) || weekNumber < 1 || weekNumber > 4) {
        return res.status(400).json({ error: "Invalid week number" });
      }

      const { status, answers } = req.body;
      if (!status || !["draft", "submitted"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const user = await storage.getUser(req.session.userId!);
      if (!user?.trialStartAt) {
        await storage.updateUser(req.session.userId!, { trialStartAt: new Date() });
      }

      const result = await storage.saveWeeklyFeedbackResponse({
        userId: req.session.userId!,
        weekNumber,
        status,
        answers,
        trialStartAt: user?.trialStartAt || new Date(),
      });

      res.json(result);
    } catch (error) {
      console.error("Weekly checkin save error:", error);
      res.status(500).json({ error: "Failed to save weekly checkin" });
    }
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
      const { message, conversationHistory, context, userProfile: clientProfile, lifeSystemContext, energyContext, documentIds } = req.body;
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
      
      let documentContext = "";
      if (documentIds && Array.isArray(documentIds) && documentIds.length > 0) {
        const docs = await Promise.all(
          documentIds.map((id: string) => storage.getImportedDocument(id))
        );
        const validDocs = docs.filter(d => d && d.userId === userId);
        if (validDocs.length > 0) {
          documentContext = "\n\n[ATTACHED DOCUMENTS]\n" + validDocs.map(d => 
            `--- ${d!.fileName} ---\n${d!.rawText?.slice(0, 3000) || "(no content)"}\n---`
          ).join("\n");
        }
      }
      
      const enhancedMessage = documentContext 
        ? `${message}\n${documentContext}`
        : message;
      
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
        energyContext: energyContext || null,
      };
      
      const result = await detectIntentAndRespond(
        enhancedMessage,
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

  // Document Upload & Analysis - Wave 3
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
  });

  app.post("/api/documents/upload", requireAuth, upload.single("file"), async (req, res) => {
    const startTime = Date.now();
    
    try {
      if (!req.file) {
        return res.status(400).json({ 
          error: "No file provided",
          userMessage: "Please select a file to upload.",
          suggestions: ["Choose a PDF, image, or Word document"]
        });
      }

      const { buffer, originalname, mimetype } = req.file;
      
      const extracted = await extractTextFromBuffer(buffer, mimetype, originalname);
      
      if (!extracted.text || extracted.text.trim().length < 10) {
        return res.status(400).json({ 
          error: "Could not extract meaningful text from this document",
          userMessage: "This file doesn't seem to have readable text.",
          suggestions: ["Try a different file", "Make sure the document contains text"]
        });
      }

      const processingTimeMs = Date.now() - startTime;

      const docRecord = await storage.createImportedDocument({
        userId: req.session.userId!,
        fileName: originalname,
        fileType: mimetype,
        rawText: extracted.text,
        status: "pending",
        extractionMethod: extracted.extractionMethod,
        ocrConfidence: extracted.ocrConfidence,
        processingTimeMs,
      });

      res.json({ 
        documentId: docRecord.id,
        fileName: originalname,
        textLength: extracted.text.length,
        metadata: extracted.metadata,
        extractionMethod: extracted.extractionMethod,
        ocrConfidence: extracted.ocrConfidence,
        processingTimeMs,
        message: "Document uploaded. Ready for analysis."
      });
    } catch (error) {
      console.error("Document upload error:", error);
      
      if (isProcessingError(error)) {
        const processingError = error as DocumentProcessingError;
        return res.status(422).json({
          error: processingError.code,
          userMessage: processingError.userMessage,
          suggestions: processingError.suggestions,
          isRecoverable: processingError.isRecoverable,
        });
      }
      
      res.status(500).json({ 
        error: "UPLOAD_FAILED",
        userMessage: "Something went wrong while processing your file.",
        suggestions: ["Try uploading again", "Try a different file format"],
        isRecoverable: true,
      });
    }
  });

  app.post("/api/documents/:id/analyze", requireAuth, async (req, res) => {
    try {
      const docId = req.params.id;
      const doc = await storage.getImportedDocument(docId);
      
      if (!doc || doc.userId !== req.session.userId) {
        return res.status(404).json({ error: "Document not found" });
      }

      if (!doc.rawText) {
        return res.status(400).json({ error: "Document has no text content" });
      }

      // Generate analysis prompt and call AI
      const analysisPrompt = generateDocumentAnalysisPrompt(doc.rawText);
      
      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI();
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a document analysis AI that extracts structured data. Always respond with valid JSON only." },
          { role: "user", content: analysisPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const responseText = completion.choices[0]?.message?.content || "{}";
      let analysisResult: DocumentAnalysisResult | null = null;
      
      try {
        const parsed = JSON.parse(responseText);
        analysisResult = validateAnalysisResult(parsed);
      } catch {
        console.error("Failed to parse AI response:", responseText);
      }

      if (!analysisResult) {
        return res.status(500).json({ error: "Failed to analyze document structure" });
      }

      const primaryCategory = analysisResult.primaryCategory || detectPrimaryCategory(analysisResult.items);
      
      await storage.updateImportedDocument(docId, {
        analysisJson: analysisResult as unknown as Record<string, unknown>,
        documentTitle: analysisResult.documentTitle,
        summary: analysisResult.summary,
        confidence: analysisResult.confidence,
        primaryCategory,
        status: "analyzed",
      });

      for (const item of analysisResult.items) {
        await storage.createImportedDocumentItem({
          documentId: docId,
          itemType: item.itemType,
          title: item.title,
          description: item.description,
          details: item.details,
          destinationSystem: item.destinationSystem,
          confidence: item.confidence,
          isSelected: item.isSelected,
        });
      }

      const previewRoute = getPreviewRoute(primaryCategory);

      res.json({
        documentId: docId,
        analysis: analysisResult,
        primaryCategory,
        previewRoute,
        message: "Document analyzed. Review the items before saving."
      });
    } catch (error) {
      console.error("Document analysis error:", error);
      res.status(500).json({ 
        error: "ANALYSIS_FAILED",
        userMessage: "We couldn't analyze this document.",
        suggestions: ["Try uploading a clearer document", "Make sure the content is readable"],
        isRecoverable: true,
      });
    }
  });

  function getPreviewRoute(category: string): string {
    switch (category) {
      case "meals": return "/meals?import=pending";
      case "workouts": return "/workout?import=pending";
      case "routines": return "/routines?import=pending";
      case "calendar": return "/calendar?import=pending";
      default: return "/import/preview";
    }
  }

  app.get("/api/documents/:id", requireAuth, async (req, res) => {
    try {
      const doc = await storage.getImportedDocument(req.params.id);
      if (!doc || doc.userId !== req.session.userId) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      const items = await storage.getImportedDocumentItems(req.params.id);
      
      res.json({
        document: doc,
        items,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to load document" });
    }
  });

  app.patch("/api/documents/:id/items", requireAuth, async (req, res) => {
    try {
      const { items } = req.body as { items: Array<{ id: string; title?: string; isSelected?: boolean; destinationSystem?: string }> };
      
      const doc = await storage.getImportedDocument(req.params.id);
      if (!doc || doc.userId !== req.session.userId) {
        return res.status(404).json({ error: "Document not found" });
      }

      for (const item of items) {
        await storage.updateImportedDocumentItem(item.id, {
          title: item.title,
          isSelected: item.isSelected,
          destinationSystem: item.destinationSystem,
        });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update items" });
    }
  });

  app.post("/api/documents/:id/commit", requireAuth, async (req, res) => {
    try {
      const doc = await storage.getImportedDocument(req.params.id);
      if (!doc || doc.userId !== req.session.userId) {
        return res.status(404).json({ error: "Document not found" });
      }

      const items = await storage.getImportedDocumentItems(req.params.id);
      const selectedItems = items.filter(item => item.isSelected);
      
      const committed: Array<{ itemId: string; entityType: string; entityId: string }> = [];

      // Pre-create parent plans if we have grouped items
      const workoutItems = selectedItems.filter(item => item.destinationSystem === "workout");
      const mealItems = selectedItems.filter(item => item.destinationSystem === "nutrition");
      
      let workoutPlanId: string | undefined;
      let mealPlanId: string | undefined;
      
      // Create a workout plan if we have workout items
      if (workoutItems.length > 0) {
        const workoutPlan = await storage.createWorkoutPlan({
          userId: req.session.userId!,
          title: doc.documentTitle || "Imported Workout Plan",
          summary: doc.summary || undefined,
          source: "import",
          importedDocumentId: doc.id,
          isActive: true,
        });
        workoutPlanId = workoutPlan.id;
      }
      
      // Create a meal plan if we have meal items
      if (mealItems.length > 0) {
        const mealPlan = await storage.createMealPlan({
          userId: req.session.userId!,
          title: doc.documentTitle || "Imported Meal Plan",
          summary: doc.summary || undefined,
          source: "import",
          importedDocumentId: doc.id,
          isActive: true,
        });
        mealPlanId = mealPlan.id;
      }

      for (const item of selectedItems) {
        let entityId: string | undefined;
        let entityType: string = item.destinationSystem || "";

        // Create entities based on destination system
        if (item.destinationSystem === "calendar") {
          const details = item.details as { date?: string; startTime?: string; endTime?: string; isRecurring?: boolean };
          const event = await storage.createCalendarEvent({
            userId: req.session.userId!,
            title: item.title,
            description: item.description || "",
            startTime: details.startTime || "09:00",
            endTime: details.endTime || "10:00",
            eventType: "imported",
            isRecurring: details.isRecurring || false,
          });
          entityId = event.id;
          entityType = "calendar";
        } else if (item.destinationSystem === "routines") {
          const details = item.details as { steps?: Array<{ title: string; instructions?: string; duration?: number }> };
          const routine = await storage.createRoutine({
            userId: req.session.userId!,
            name: item.title,
            dimensionTags: [],
            steps: details.steps || [{ title: item.title, instructions: item.description || "" }],
            totalDurationMinutes: 30,
            scheduleOptions: {},
            mode: "instructions",
            isActive: true,
          });
          entityId = routine.id;
          entityType = "routine";
        }
        else if (item.destinationSystem === "nutrition") {
          const details = item.details as { mealType?: string; weekLabel?: string; ingredients?: string[]; instructions?: string[]; tags?: string[] };
          const meal = await storage.createMeal({
            userId: req.session.userId!,
            mealPlanId: mealPlanId,
            title: item.title,
            mealType: details.mealType || "other",
            weekLabel: details.weekLabel,
            notes: item.description || undefined,
            ingredients: details.ingredients,
            instructions: details.instructions,
            tags: details.tags,
          });
          entityId = meal.id;
          entityType = "meal";
        }
        else if (item.destinationSystem === "workout") {
          const details = item.details as { exerciseType?: string; dayLabel?: string; sets?: string; reps?: string; duration?: string; equipment?: string[]; instructions?: string[]; tags?: string[] };
          const exercise = await storage.createExercise({
            userId: req.session.userId!,
            workoutPlanId: workoutPlanId,
            title: item.title,
            exerciseType: details.exerciseType || "other",
            dayLabel: details.dayLabel,
            notes: item.description || undefined,
            sets: details.sets,
            reps: details.reps,
            duration: details.duration,
            equipment: details.equipment,
            instructions: details.instructions,
            tags: details.tags,
          });
          entityId = exercise.id;
          entityType = "exercise";
        }

        if (entityId) {
          await storage.updateImportedDocumentItem(item.id, {
            linkedEntityId: entityId,
            linkedEntityType: entityType,
          });
          committed.push({ itemId: item.id, entityType, entityId });
        }
      }

      // Update document status
      await storage.updateImportedDocument(req.params.id, {
        status: "saved",
      });

      res.json({
        success: true,
        committed,
        workoutPlanId,
        mealPlanId,
        message: `Saved ${committed.length} items to your systems.`
      });
    } catch (error) {
      console.error("Document commit error:", error);
      res.status(500).json({ error: "Failed to save items" });
    }
  });

  app.get("/api/documents", requireAuth, async (req, res) => {
    try {
      const docs = await storage.getImportedDocuments(req.session.userId!);
      res.json(docs);
    } catch (error) {
      res.status(500).json({ error: "Failed to load documents" });
    }
  });

  // Wave 4: Meal Plan Import Endpoints
  app.post("/api/import/upload", requireAuth, upload.single("file"), async (req, res) => {
    const startTime = Date.now();
    
    try {
      if (!req.file) {
        return res.status(400).json({ 
          error: "No file uploaded",
          userMessage: "Please select a file to upload.",
          suggestions: ["Choose a PDF, image, or Word document"]
        });
      }

      const { buffer, mimetype, originalname } = req.file;
      
      const extracted = await extractTextFromBuffer(buffer, mimetype, originalname);
      
      if (!extracted.text || extracted.text.trim().length < 50) {
        return res.status(400).json({ 
          error: "INSUFFICIENT_CONTENT",
          userMessage: "This file doesn't have enough readable text.",
          suggestions: ["Try a different file", "Make sure the document has content"]
        });
      }

      const processingTimeMs = Date.now() - startTime;

      const doc = await storage.createImportedDocument({
        userId: req.session.userId!,
        fileName: originalname,
        fileType: mimetype,
        rawText: extracted.text,
        status: "draft",
        extractionMethod: extracted.extractionMethod,
        ocrConfidence: extracted.ocrConfidence,
        processingTimeMs,
      });

      res.json({ 
        documentId: doc.id,
        fileName: originalname,
        textLength: extracted.text.length,
        extractionMethod: extracted.extractionMethod,
        ocrConfidence: extracted.ocrConfidence,
        processingTimeMs,
      });
    } catch (error) {
      console.error("Upload error:", error);
      
      if (isProcessingError(error)) {
        const processingError = error as DocumentProcessingError;
        return res.status(422).json({
          error: processingError.code,
          userMessage: processingError.userMessage,
          suggestions: processingError.suggestions,
          isRecoverable: processingError.isRecoverable,
        });
      }
      
      res.status(500).json({ 
        error: "UPLOAD_FAILED",
        userMessage: "Something went wrong while processing your file.",
        suggestions: ["Try uploading again", "Try a different file format"],
        isRecoverable: true,
      });
    }
  });

  app.post("/api/import/analyze/:documentId", requireAuth, async (req, res) => {
    try {
      const doc = await storage.getImportedDocument(req.params.documentId);
      if (!doc || doc.userId !== req.session.userId) {
        return res.status(404).json({ error: "Document not found" });
      }

      if (!doc.rawText) {
        return res.status(400).json({ error: "No text content to analyze" });
      }

      // Analyze with AI
      const analysis = await analyzeMealPlanDocument(doc.rawText);

      // Update document with analysis
      await storage.updateImportedDocument(doc.id, {
        documentTitle: analysis.planTitle,
        summary: analysis.summary,
        confidence: Math.round(analysis.confidence * 100),
        analysisJson: analysis,
        status: "analyzed",
      });

      res.json(analysis);
    } catch (error) {
      console.error("Analysis error:", error);
      res.status(500).json({ error: "I couldn't read that file. Try a different PDF or copy/paste text." });
    }
  });

  app.post("/api/import/commit/:documentId", requireAuth, async (req, res) => {
    try {
      const doc = await storage.getImportedDocument(req.params.documentId);
      if (!doc || doc.userId !== req.session.userId) {
        return res.status(404).json({ error: "Document not found" });
      }

      // Prevent duplicate commits
      if (doc.status === "saved") {
        return res.status(400).json({ error: "This plan has already been saved" });
      }

      const { meals, routine, planTitle } = req.body;

      // Create meal plan
      const mealPlan = await storage.createMealPlan({
        userId: req.session.userId!,
        title: planTitle || doc.documentTitle || "Imported Meal Plan",
        summary: doc.summary || undefined,
        source: "import",
        importedDocumentId: doc.id,
        isActive: true,
      });

      // Create ONLY selected meals (explicit isSelected === true check)
      const selectedMeals = (meals || []).filter((m: { isSelected?: boolean }) => m.isSelected === true);
      const createdMeals = await storage.createMeals(
        selectedMeals.map((m: { title: string; mealType?: string; weekLabel?: string; tags?: string[]; notes?: string; ingredients?: string[]; instructions?: string[] }) => ({
          userId: req.session.userId!,
          mealPlanId: mealPlan.id,
          title: m.title,
          mealType: m.mealType || "other",
          weekLabel: m.weekLabel,
          tags: m.tags,
          notes: m.notes,
          ingredients: m.ingredients,
          instructions: m.instructions,
        }))
      );

      // Create routine if steps exist
      let createdRoutine = null;
      if (routine?.steps?.length > 0) {
        createdRoutine = await storage.createRoutine({
          userId: req.session.userId!,
          name: routine.title || "Meal Prep Routine",
          dimensionTags: ["nutrition"],
          steps: routine.steps.map((s: { text: string; notes?: string }) => ({
            title: s.text,
            instructions: s.notes || "",
          })),
          totalDurationMinutes: routine.steps.length * 10,
          scheduleOptions: {},
          mode: "instructions",
          isActive: true,
        });
      }

      // Update document status to prevent re-commit
      await storage.updateImportedDocument(doc.id, {
        status: "saved",
        savedAt: new Date(),
      });

      res.json({
        success: true,
        mealPlan: mealPlan,
        mealsCount: createdMeals.length,
        routine: createdRoutine,
      });
    } catch (error) {
      console.error("Commit error:", error);
      res.status(500).json({ error: "Failed to save meal plan" });
    }
  });

  app.post("/api/import/workout/:documentId", requireAuth, async (req, res) => {
    try {
      const doc = await storage.getImportedDocument(req.params.documentId);
      if (!doc || doc.userId !== req.session.userId) {
        return res.status(404).json({ error: "Document not found" });
      }

      if (doc.status === "saved") {
        return res.status(400).json({ error: "This plan has already been saved" });
      }

      const { exercises: exerciseList, planTitle } = req.body;

      const workoutPlan = await storage.createWorkoutPlan({
        userId: req.session.userId!,
        title: planTitle || doc.documentTitle || "Imported Workout Plan",
        summary: doc.summary || undefined,
        source: "import",
        importedDocumentId: doc.id,
        isActive: true,
      });

      const selectedExercises = (exerciseList || []).filter((e: { isSelected?: boolean }) => e.isSelected === true);
      const createdExercises = await storage.createExercises(
        selectedExercises.map((e: { title: string; exerciseType?: string; dayLabel?: string; tags?: string[]; notes?: string; sets?: string; reps?: string; duration?: string; equipment?: string[]; instructions?: string[] }) => ({
          userId: req.session.userId!,
          workoutPlanId: workoutPlan.id,
          title: e.title,
          exerciseType: e.exerciseType || "other",
          dayLabel: e.dayLabel,
          tags: e.tags,
          notes: e.notes,
          sets: e.sets,
          reps: e.reps,
          duration: e.duration,
          equipment: e.equipment,
          instructions: e.instructions,
        }))
      );

      await storage.updateImportedDocument(doc.id, {
        status: "saved",
        savedAt: new Date(),
      });

      res.json({
        success: true,
        workoutPlan: workoutPlan,
        exercisesCount: createdExercises.length,
      });
    } catch (error) {
      console.error("Workout commit error:", error);
      res.status(500).json({ error: "Failed to save workout plan" });
    }
  });

  app.post("/api/import/calendar/:documentId", requireAuth, async (req, res) => {
    try {
      // Verify document ownership and status
      const doc = await storage.getImportedDocument(req.params.documentId);
      if (!doc || doc.userId !== req.session.userId) {
        return res.status(404).json({ error: "Document not found" });
      }

      // Only allow calendar additions for saved documents
      if (doc.status !== "saved") {
        return res.status(400).json({ error: "Save the plan first before adding calendar events" });
      }

      const { suggestions } = req.body;
      
      if (!suggestions || !Array.isArray(suggestions)) {
        return res.status(400).json({ error: "No calendar suggestions provided" });
      }

      // Only create events explicitly marked as selected
      const selectedSuggestions = suggestions.filter((s: { isSelected?: boolean }) => s.isSelected === true);
      const created = [];

      for (const suggestion of selectedSuggestions) {
        const event = await storage.createCalendarEvent({
          userId: req.session.userId!,
          title: suggestion.title,
          description: suggestion.notes || "",
          startTime: suggestion.suggestedStart || "09:00",
          endTime: calculateEndTime(suggestion.suggestedStart || "09:00", suggestion.durationMinutes || 60),
          eventType: "meal-prep",
          isRecurring: suggestion.recurrence?.frequency !== "none" && !!suggestion.recurrence?.frequency,
          recurrenceRule: suggestion.recurrence?.frequency && suggestion.recurrence.frequency !== "none" 
            ? suggestion.recurrence.frequency 
            : undefined,
          linkedType: "meal",
          linkedId: suggestion.mealId || null,
          linkedRoute: suggestion.mealId ? `/meal-prep?selected=${suggestion.mealId}` : "/meal-prep",
          linkedMeta: { source: "import", documentId: req.params.documentId },
        });
        created.push(event);
      }

      res.json({
        success: true,
        eventsCreated: created.length,
        events: created,
      });
    } catch (error) {
      console.error("Calendar add error:", error);
      res.status(500).json({ error: "Failed to add calendar events" });
    }
  });

  // Get meal plans
  app.get("/api/meal-plans", requireAuth, async (req, res) => {
    try {
      const plans = await storage.getMealPlans(req.session.userId!);
      res.json(plans);
    } catch (error) {
      res.status(500).json({ error: "Failed to load meal plans" });
    }
  });

  // Update a meal plan (activate/deactivate)
  app.patch("/api/meal-plans/:id", requireAuth, async (req, res) => {
    try {
      const plan = await storage.getMealPlan(req.params.id);
      if (!plan || plan.userId !== req.session.userId) {
        return res.status(404).json({ error: "Meal plan not found" });
      }
      
      // If activating this plan, deactivate others first
      if (req.body.isActive === true) {
        const allPlans = await storage.getMealPlans(req.session.userId!);
        for (const p of allPlans) {
          if (p.id !== req.params.id && p.isActive) {
            await storage.updateMealPlan(p.id, { isActive: false });
          }
        }
      }
      
      const updated = await storage.updateMealPlan(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Update meal plan error:", error);
      res.status(500).json({ error: "Failed to update meal plan" });
    }
  });

  // Get meals for a plan
  app.get("/api/meal-plans/:id/meals", requireAuth, async (req, res) => {
    try {
      const plan = await storage.getMealPlan(req.params.id);
      if (!plan || plan.userId !== req.session.userId) {
        return res.status(404).json({ error: "Meal plan not found" });
      }
      const planMeals = await storage.getMeals(req.session.userId!, req.params.id);
      res.json(planMeals);
    } catch (error) {
      res.status(500).json({ error: "Failed to load meals" });
    }
  });

  // Update a meal
  app.patch("/api/meals/:id", requireAuth, async (req, res) => {
    try {
      const meal = await storage.getMeal(req.params.id);
      if (!meal || meal.userId !== req.session.userId) {
        return res.status(404).json({ error: "Meal not found" });
      }
      
      const updateSchema = z.object({
        title: z.string().min(1).max(200).optional(),
        mealType: z.string().optional(),
        weekLabel: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
        ingredients: z.array(z.string()).optional(),
        instructions: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
      });
      
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }
      
      const updated = await storage.updateMeal(req.params.id, parsed.data);
      res.json(updated);
    } catch (error) {
      console.error("Update meal error:", error);
      res.status(500).json({ error: "Failed to update meal" });
    }
  });

  // Get draft imports
  app.get("/api/import/drafts", requireAuth, async (req, res) => {
    try {
      const docs = await storage.getImportedDocuments(req.session.userId!);
      const drafts = docs.filter(d => d.status === "draft" || d.status === "analyzed");
      res.json(drafts);
    } catch (error) {
      res.status(500).json({ error: "Failed to load drafts" });
    }
  });

  // ========== WORKOUT PLANS & EXERCISES ==========

  app.get("/api/workout-plans", requireAuth, async (req, res) => {
    try {
      const plans = await storage.getWorkoutPlans(req.session.userId!);
      res.json(plans);
    } catch (error) {
      res.status(500).json({ error: "Failed to load workout plans" });
    }
  });

  app.get("/api/workout-plans/:id", requireAuth, async (req, res) => {
    try {
      const plan = await storage.getWorkoutPlan(req.params.id);
      if (!plan || plan.userId !== req.session.userId) {
        return res.status(404).json({ error: "Workout plan not found" });
      }
      res.json(plan);
    } catch (error) {
      res.status(500).json({ error: "Failed to load workout plan" });
    }
  });

  app.post("/api/workout-plans", requireAuth, async (req, res) => {
    try {
      const plan = await storage.createWorkoutPlan({
        userId: req.session.userId!,
        title: req.body.title || "New Workout Plan",
        summary: req.body.summary,
        source: req.body.source || "manual",
        importedDocumentId: req.body.importedDocumentId,
        isActive: req.body.isActive ?? true,
      });
      res.status(201).json(plan);
    } catch (error) {
      console.error("Create workout plan error:", error);
      res.status(500).json({ error: "Failed to create workout plan" });
    }
  });

  app.patch("/api/workout-plans/:id", requireAuth, async (req, res) => {
    try {
      const plan = await storage.getWorkoutPlan(req.params.id);
      if (!plan || plan.userId !== req.session.userId) {
        return res.status(404).json({ error: "Workout plan not found" });
      }
      
      const updateData: Partial<typeof plan> = {};
      if (req.body.title !== undefined) updateData.title = req.body.title;
      if (req.body.summary !== undefined) updateData.summary = req.body.summary;
      if (req.body.isActive !== undefined) {
        updateData.isActive = req.body.isActive;
        if (req.body.isActive) {
          updateData.activatedAt = new Date();
        }
      }
      
      const updated = await storage.updateWorkoutPlan(req.params.id, updateData);
      res.json(updated);
    } catch (error) {
      console.error("Update workout plan error:", error);
      res.status(500).json({ error: "Failed to update workout plan" });
    }
  });

  app.delete("/api/workout-plans/:id", requireAuth, async (req, res) => {
    try {
      const plan = await storage.getWorkoutPlan(req.params.id);
      if (!plan || plan.userId !== req.session.userId) {
        return res.status(404).json({ error: "Workout plan not found" });
      }
      await storage.deleteWorkoutPlan(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete workout plan" });
    }
  });

  app.get("/api/workout-plans/:id/exercises", requireAuth, async (req, res) => {
    try {
      const plan = await storage.getWorkoutPlan(req.params.id);
      if (!plan || plan.userId !== req.session.userId) {
        return res.status(404).json({ error: "Workout plan not found" });
      }
      const planExercises = await storage.getExercises(req.session.userId!, req.params.id);
      res.json(planExercises);
    } catch (error) {
      res.status(500).json({ error: "Failed to load exercises" });
    }
  });

  app.get("/api/exercises", requireAuth, async (req, res) => {
    try {
      const allExercises = await storage.getExercises(req.session.userId!);
      res.json(allExercises);
    } catch (error) {
      res.status(500).json({ error: "Failed to load exercises" });
    }
  });

  app.patch("/api/exercises/:id", requireAuth, async (req, res) => {
    try {
      const exercise = await storage.getExercise(req.params.id);
      if (!exercise || exercise.userId !== req.session.userId) {
        return res.status(404).json({ error: "Exercise not found" });
      }
      
      const updateSchema = z.object({
        title: z.string().min(1).max(200).optional(),
        exerciseType: z.string().optional(),
        dayLabel: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
        sets: z.string().optional().nullable(),
        reps: z.string().optional().nullable(),
        duration: z.string().optional().nullable(),
        equipment: z.array(z.string()).optional(),
        instructions: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
      });
      
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }
      
      const updated = await storage.updateExercise(req.params.id, parsed.data);
      res.json(updated);
    } catch (error) {
      console.error("Update exercise error:", error);
      res.status(500).json({ error: "Failed to update exercise" });
    }
  });

  // ========== SHOPPING LISTS & MEAL PREP PREFERENCES ==========

  // Get meal prep preferences
  app.get("/api/meal-prep-preferences", requireAuth, async (req, res) => {
    try {
      const prefs = await storage.getMealPrepPreferences(req.session.userId!);
      res.json(prefs || null);
    } catch (error) {
      console.error("Get meal prep preferences error:", error);
      res.status(500).json({ error: "Failed to load preferences" });
    }
  });

  // Create or update meal prep preferences
  app.post("/api/meal-prep-preferences", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getMealPrepPreferences(req.session.userId!);
      if (existing) {
        const updated = await storage.updateMealPrepPreferences(req.session.userId!, req.body);
        res.json(updated);
      } else {
        const created = await storage.createMealPrepPreferences({
          userId: req.session.userId!,
          ...req.body,
        });
        res.json(created);
      }
    } catch (error) {
      console.error("Save meal prep preferences error:", error);
      res.status(500).json({ error: "Failed to save preferences" });
    }
  });

  // Get shopping lists
  app.get("/api/shopping-lists", requireAuth, async (req, res) => {
    try {
      const lists = await storage.getShoppingLists(req.session.userId!);
      res.json(lists);
    } catch (error) {
      console.error("Get shopping lists error:", error);
      res.status(500).json({ error: "Failed to load shopping lists" });
    }
  });

  // Get single shopping list with items
  app.get("/api/shopping-lists/:id", requireAuth, async (req, res) => {
    try {
      const list = await storage.getShoppingList(req.params.id);
      if (!list || list.userId !== req.session.userId) {
        return res.status(404).json({ error: "Shopping list not found" });
      }
      const items = await storage.getShoppingListItems(req.params.id);
      res.json({ ...list, items });
    } catch (error) {
      console.error("Get shopping list error:", error);
      res.status(500).json({ error: "Failed to load shopping list" });
    }
  });

  // Create shopping list
  app.post("/api/shopping-lists", requireAuth, async (req, res) => {
    try {
      const createSchema = z.object({
        title: z.string().min(1, "Title is required").max(200),
        mealPlanId: z.string().nullable().optional(),
        weekLabel: z.string().nullable().optional(),
      });
      
      const parsed = createSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }
      
      const list = await storage.createShoppingList({
        userId: req.session.userId!,
        title: parsed.data.title,
        mealPlanId: parsed.data.mealPlanId || null,
        weekLabel: parsed.data.weekLabel || null,
        status: "active",
      });
      res.json(list);
    } catch (error) {
      console.error("Create shopping list error:", error);
      res.status(500).json({ error: "Failed to create shopping list" });
    }
  });

  // Update shopping list
  app.patch("/api/shopping-lists/:id", requireAuth, async (req, res) => {
    try {
      const list = await storage.getShoppingList(req.params.id);
      if (!list || list.userId !== req.session.userId) {
        return res.status(404).json({ error: "Shopping list not found" });
      }
      const updated = await storage.updateShoppingList(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Update shopping list error:", error);
      res.status(500).json({ error: "Failed to update shopping list" });
    }
  });

  // Delete shopping list
  app.delete("/api/shopping-lists/:id", requireAuth, async (req, res) => {
    try {
      const list = await storage.getShoppingList(req.params.id);
      if (!list || list.userId !== req.session.userId) {
        return res.status(404).json({ error: "Shopping list not found" });
      }
      await storage.deleteShoppingList(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete shopping list error:", error);
      res.status(500).json({ error: "Failed to delete shopping list" });
    }
  });

  // Add items to shopping list
  app.post("/api/shopping-lists/:id/items", requireAuth, async (req, res) => {
    try {
      const list = await storage.getShoppingList(req.params.id);
      if (!list || list.userId !== req.session.userId) {
        return res.status(404).json({ error: "Shopping list not found" });
      }
      
      const itemSchema = z.object({
        ingredient: z.string().min(1, "Ingredient name is required").max(500),
        quantity: z.string().optional().nullable(),
        unit: z.string().optional().nullable(),
        category: z.string().optional().default("other"),
        notes: z.string().optional().nullable(),
      });
      
      const items = Array.isArray(req.body) ? req.body : [req.body];
      const validatedItems = [];
      
      for (const item of items) {
        const parsed = itemSchema.safeParse(item);
        if (!parsed.success) {
          return res.status(400).json({ error: parsed.error.errors[0].message });
        }
        validatedItems.push({
          shoppingListId: req.params.id,
          ingredient: parsed.data.ingredient,
          quantity: parsed.data.quantity || null,
          unit: parsed.data.unit || null,
          category: parsed.data.category,
          notes: parsed.data.notes || null,
        });
      }
      
      const created = await storage.createShoppingListItems(validatedItems);
      res.json(created);
    } catch (error) {
      console.error("Add shopping list items error:", error);
      res.status(500).json({ error: "Failed to add items" });
    }
  });

  // Update shopping list item (toggle checked, edit)
  app.patch("/api/shopping-lists/:listId/items/:itemId", requireAuth, async (req, res) => {
    try {
      const list = await storage.getShoppingList(req.params.listId);
      if (!list || list.userId !== req.session.userId) {
        return res.status(404).json({ error: "Shopping list not found" });
      }
      const updated = await storage.updateShoppingListItem(req.params.itemId, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Update shopping list item error:", error);
      res.status(500).json({ error: "Failed to update item" });
    }
  });

  // Delete shopping list item
  app.delete("/api/shopping-lists/:listId/items/:itemId", requireAuth, async (req, res) => {
    try {
      const list = await storage.getShoppingList(req.params.listId);
      if (!list || list.userId !== req.session.userId) {
        return res.status(404).json({ error: "Shopping list not found" });
      }
      await storage.deleteShoppingListItem(req.params.itemId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete shopping list item error:", error);
      res.status(500).json({ error: "Failed to delete item" });
    }
  });

  // Generate shopping list from meal plan
  app.post("/api/shopping-lists/generate-from-plan/:planId", requireAuth, async (req, res) => {
    try {
      const plan = await storage.getMealPlan(req.params.planId);
      if (!plan || plan.userId !== req.session.userId) {
        return res.status(404).json({ error: "Meal plan not found" });
      }
      
      const meals = await storage.getMeals(req.session.userId!, req.params.planId);
      if (meals.length === 0) {
        return res.status(400).json({ error: "No meals in this plan" });
      }
      
      // Create the shopping list
      const list = await storage.createShoppingList({
        userId: req.session.userId!,
        title: `Shopping List - ${plan.title}`,
        mealPlanId: plan.id,
        weekLabel: null,
        status: "active",
      });
      
      // Extract ingredients from all meals and deduplicate
      const ingredientMap = new Map<string, { quantity: string; unit: string; category: string; sources: string[] }>();
      
      for (const meal of meals) {
        if (meal.ingredients && Array.isArray(meal.ingredients)) {
          for (const ing of meal.ingredients) {
            const key = ing.toLowerCase().trim();
            if (!ingredientMap.has(key)) {
              ingredientMap.set(key, {
                quantity: "",
                unit: "",
                category: categorizeIngredient(ing),
                sources: [meal.id],
              });
            } else {
              ingredientMap.get(key)?.sources.push(meal.id);
            }
          }
        }
      }
      
      // Create items
      const items = Array.from(ingredientMap.entries()).map(([ingredient, data]) => ({
        shoppingListId: list.id,
        ingredient,
        quantity: data.quantity,
        unit: data.unit,
        category: data.category,
        sourceMealId: data.sources[0],
        notes: data.sources.length > 1 ? `Used in ${data.sources.length} meals` : null,
      }));
      
      if (items.length > 0) {
        await storage.createShoppingListItems(items);
      }
      
      // Return list with items
      const createdItems = await storage.getShoppingListItems(list.id);
      res.json({ ...list, items: createdItems });
    } catch (error) {
      console.error("Generate shopping list error:", error);
      res.status(500).json({ error: "Failed to generate shopping list" });
    }
  });

  // Life System - Extract actionable items from AI message
  app.post("/api/life-system/extract", requireAuth, async (req, res) => {
    try {
      const { content } = req.body;
      if (!content || typeof content !== "string") {
        return res.status(400).json({ error: "Content is required" });
      }

      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      });

      const systemPrompt = `You are an AI that extracts actionable life system items from conversation content.
Analyze the message and extract any:
- Goals (things to achieve, targets, objectives)
- Habits (recurring activities to build or maintain)
- Routines (multi-step flows like morning routine, evening routine, workout routine)
- Schedule items (specific time-bound activities)

Return a JSON array of items with this structure:
{
  "items": [
    {
      "type": "goal" | "habit" | "routine" | "schedule",
      "title": "Brief title (max 50 chars)",
      "description": "Optional description",
      "frequency": "daily" | "weekly" | "monthly" (for habits only),
      "dayOfWeek": 0-6 (for schedule/routine, 0=Sunday),
      "startTime": "HH:MM" (for schedule),
      "endTime": "HH:MM" (for schedule),
      "scheduleTime": "HH:MM" (for routines - when routine starts),
      "durationMinutes": number (for routines - total duration),
      "steps": [{"title": "Step name", "durationMinutes": 5}] (for routines only),
      "category": "wellness" | "fitness" | "nutrition" | "mindfulness" | "productivity" | "relationships" | "finance" | "morning" | "evening" | "workout" | "other",
      "wellnessDimension": "physical" | "mental" | "emotional" | "spiritual" | "social" | "financial" (for goals)
    }
  ]
}

Rules:
- Only extract concrete, actionable items
- Keep titles concise and action-oriented
- If no actionable items found, return { "items": [] }
- Be conservative - only extract clear commitments or plans
- Use "routine" for multi-step flows (morning routine, evening wind-down, etc.)
- Use "schedule" for single time-block events
- Use "habit" for recurring activities without specific time
- Use "goal" for achievements or targets
- For routines, include the steps array with individual steps and their durations`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Extract actionable items from this message:\n\n${content}` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const responseText = completion.choices[0]?.message?.content || '{"items":[]}';
      const parsed = JSON.parse(responseText);
      
      res.json({ items: parsed.items || [] });
    } catch (error) {
      console.error("Extract life system items error:", error);
      res.status(500).json({ error: "Failed to extract items" });
    }
  });

  // Life System - Save extracted items
  app.post("/api/life-system/save-items", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { items } = req.body;
      
      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ error: "Items array is required" });
      }

      let saved = 0;

      for (const item of items) {
        try {
          if (item.type === "goal") {
            await storage.createGoal({
              userId,
              title: item.title,
              description: item.description || null,
              wellnessDimension: item.wellnessDimension || null,
              progress: 0,
              targetValue: 100,
              isActive: true,
              dataSource: "ai-extracted",
              explainWhy: "Extracted from AI conversation",
            });
            saved++;
          } else if (item.type === "habit") {
            await storage.createHabit({
              userId,
              title: item.title,
              description: item.description || null,
              frequency: item.frequency || "daily",
              reminderTime: null,
              isActive: true,
              streak: 0,
              dataSource: "ai-extracted",
              explainWhy: "Extracted from AI conversation",
            });
            saved++;
          } else if (item.type === "routine") {
            // Create routine
            const routine = await storage.createRoutine({
              userId,
              name: item.title,
              dimensionTags: item.dimensionTags || [],
              steps: item.steps || [],
              totalDurationMinutes: item.durationMinutes || null,
              scheduleOptions: item.scheduleTime ? { time: item.scheduleTime } : null,
              mode: "guided",
              isActive: true,
              dataSource: "ai-extracted",
              explainWhy: "Extracted from AI conversation",
            });
            
            // Also create a calendar event if there's a schedule time
            if (item.scheduleTime && item.dayOfWeek !== undefined) {
              const now = new Date();
              const currentDayOfWeek = now.getDay();
              const targetDayOfWeek = item.dayOfWeek;
              
              const [startHour, startMin] = (item.scheduleTime as string).split(":").map(Number);
              
              let daysUntil = targetDayOfWeek - currentDayOfWeek;
              if (targetDayOfWeek === currentDayOfWeek) {
                const eventTimeMinutes = startHour * 60 + startMin;
                const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
                if (eventTimeMinutes <= currentTimeMinutes) {
                  daysUntil = 7;
                } else {
                  daysUntil = 0;
                }
              } else if (daysUntil < 0) {
                daysUntil += 7;
              }
              
              const eventDate = new Date(now);
              eventDate.setDate(now.getDate() + daysUntil);
              
              const startDateTime = new Date(eventDate);
              startDateTime.setHours(startHour, startMin, 0, 0);
              
              const durationMinutes = item.durationMinutes || 30;
              const endDateTime = new Date(startDateTime);
              endDateTime.setMinutes(endDateTime.getMinutes() + durationMinutes);
              
              await storage.createCalendarEvent({
                userId,
                title: item.title,
                description: item.description || null,
                startTime: startDateTime.toISOString(),
                endTime: endDateTime.toISOString(),
                eventType: "routine",
                isRecurring: true,
                recurrenceRule: `FREQ=WEEKLY;BYDAY=${['SU','MO','TU','WE','TH','FR','SA'][targetDayOfWeek]}`,
                linkedType: "routine",
                linkedId: routine.id,
                linkedRoute: "/routines",
              });
            }
            
            saved++;
          } else if (item.type === "schedule") {
            // Create schedule block
            const scheduleBlock = await storage.createScheduleBlock({
              userId,
              dayOfWeek: item.dayOfWeek ?? 1,
              startTime: item.startTime || "09:00",
              endTime: item.endTime || "10:00",
              title: item.title,
              category: item.category || null,
              color: null,
            });
            
            // Also create a calendar event for this schedule block
            // Calculate the next occurrence date based on dayOfWeek
            const now = new Date();
            const currentDayOfWeek = now.getDay(); // 0 = Sunday
            const targetDayOfWeek = item.dayOfWeek ?? 1;
            
            const startTimeStr = item.startTime || "09:00";
            const endTimeStr = item.endTime || "10:00";
            const [startHour, startMin] = startTimeStr.split(":").map(Number);
            const [endHour, endMin] = endTimeStr.split(":").map(Number);
            
            // Check if target day is today and the time is still upcoming
            let daysUntil = targetDayOfWeek - currentDayOfWeek;
            if (targetDayOfWeek === currentDayOfWeek) {
              // Same day - check if time has passed
              const eventTimeMinutes = startHour * 60 + startMin;
              const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
              if (eventTimeMinutes <= currentTimeMinutes) {
                // Time has passed, schedule for next week
                daysUntil = 7;
              } else {
                // Time is still upcoming, schedule for today
                daysUntil = 0;
              }
            } else if (daysUntil < 0) {
              // Day has passed this week, schedule for next week
              daysUntil += 7;
            }
            
            const eventDate = new Date(now);
            eventDate.setDate(now.getDate() + daysUntil);
            
            const startDateTime = new Date(eventDate);
            startDateTime.setHours(startHour, startMin, 0, 0);
            
            const endDateTime = new Date(eventDate);
            endDateTime.setHours(endHour, endMin, 0, 0);
            
            // Determine event type based on category
            let eventType = "event";
            if (item.category === "workout" || item.title.toLowerCase().includes("workout")) {
              eventType = "workout";
            } else if (item.category === "meal" || item.title.toLowerCase().includes("meal") || item.title.toLowerCase().includes("eat") || item.title.toLowerCase().includes("breakfast") || item.title.toLowerCase().includes("lunch") || item.title.toLowerCase().includes("dinner")) {
              eventType = "meal";
            } else if (item.category === "routine" || item.title.toLowerCase().includes("routine") || item.title.toLowerCase().includes("meditation") || item.title.toLowerCase().includes("journal")) {
              eventType = "routine";
            }
            
            await storage.createCalendarEvent({
              userId,
              title: item.title,
              description: item.description || null,
              startTime: startDateTime.toISOString(),
              endTime: endDateTime.toISOString(),
              eventType,
              isRecurring: true,
              recurrenceRule: `FREQ=WEEKLY;BYDAY=${['SU','MO','TU','WE','TH','FR','SA'][targetDayOfWeek]}`,
              linkedType: "schedule",
              linkedId: scheduleBlock.id,
              linkedRoute: "/daily-schedule",
            });
            
            saved++;
          } else if (item.type === "workout") {
            // Create a workout exercise
            const exercise = await storage.createExercise({
              userId,
              title: item.title,
              notes: item.description || item.notes || null,
              exerciseType: item.exerciseType || "strength",
              sets: item.sets || null,
              reps: item.reps || null,
              duration: item.duration || null,
              dayLabel: item.dayLabel || null,
              workoutPlanId: null,
            });
            
            // Create calendar event if day and time specified
            if (item.dayOfWeek !== undefined && item.scheduleTime) {
              const now = new Date();
              const currentDayOfWeek = now.getDay();
              const targetDayOfWeek = item.dayOfWeek;
              const [startHour, startMin] = (item.scheduleTime as string).split(":").map(Number);
              
              // Calculate days until target, handling same-day future times
              let daysUntil = targetDayOfWeek - currentDayOfWeek;
              if (targetDayOfWeek === currentDayOfWeek) {
                const eventTimeMinutes = startHour * 60 + startMin;
                const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
                if (eventTimeMinutes <= currentTimeMinutes) {
                  daysUntil = 7;
                } else {
                  daysUntil = 0;
                }
              } else if (daysUntil < 0) {
                daysUntil += 7;
              }
              
              const eventDate = new Date(now);
              eventDate.setDate(now.getDate() + daysUntil);
              
              const startDateTime = new Date(eventDate);
              startDateTime.setHours(startHour, startMin, 0, 0);
              
              const durationMinutes = item.durationMinutes || 45;
              const endDateTime = new Date(startDateTime);
              endDateTime.setMinutes(endDateTime.getMinutes() + durationMinutes);
              
              await storage.createCalendarEvent({
                userId,
                title: item.title,
                description: item.description || null,
                startTime: startDateTime.toISOString(),
                endTime: endDateTime.toISOString(),
                eventType: "workout",
                isRecurring: true,
                recurrenceRule: `FREQ=WEEKLY;BYDAY=${['SU','MO','TU','WE','TH','FR','SA'][targetDayOfWeek]}`,
                linkedType: "workout",
                linkedId: exercise.id,
                linkedRoute: "/workouts",
              });
            }
            saved++;
          } else if (item.type === "meal") {
            // Create a meal entry
            const meal = await storage.createMeal({
              userId,
              title: item.title,
              notes: item.description || item.notes || null,
              mealType: item.mealType || "lunch",
              ingredients: item.ingredients || [],
              instructions: item.recipe ? [item.recipe] : item.instructions || [],
            });
            
            // Create calendar event if time specified
            if (item.dayOfWeek !== undefined && item.scheduleTime) {
              const now = new Date();
              const currentDayOfWeek = now.getDay();
              const targetDayOfWeek = item.dayOfWeek;
              const [startHour, startMin] = (item.scheduleTime as string).split(":").map(Number);
              
              // Calculate days until target, handling same-day future times
              let daysUntil = targetDayOfWeek - currentDayOfWeek;
              if (targetDayOfWeek === currentDayOfWeek) {
                const eventTimeMinutes = startHour * 60 + startMin;
                const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
                if (eventTimeMinutes <= currentTimeMinutes) {
                  daysUntil = 7;
                } else {
                  daysUntil = 0;
                }
              } else if (daysUntil < 0) {
                daysUntil += 7;
              }
              
              const eventDate = new Date(now);
              eventDate.setDate(now.getDate() + daysUntil);
              
              const startDateTime = new Date(eventDate);
              startDateTime.setHours(startHour, startMin, 0, 0);
              
              const endDateTime = new Date(startDateTime);
              endDateTime.setMinutes(endDateTime.getMinutes() + 30);
              
              await storage.createCalendarEvent({
                userId,
                title: item.title,
                description: item.description || null,
                startTime: startDateTime.toISOString(),
                endTime: endDateTime.toISOString(),
                eventType: "meal",
                isRecurring: true,
                recurrenceRule: `FREQ=WEEKLY;BYDAY=${['SU','MO','TU','WE','TH','FR','SA'][targetDayOfWeek]}`,
                linkedType: "meal",
                linkedId: meal.id,
                linkedRoute: "/meal-prep",
              });
            }
            saved++;
          } else if (item.type === "spiritual" || item.type === "practice") {
            // Create a spiritual practice routine
            const routine = await storage.createRoutine({
              userId,
              name: item.title,
              dimensionTags: ["spiritual", ...(item.dimensionTags || [])],
              steps: item.steps || [],
              totalDurationMinutes: item.durationMinutes || 10,
              scheduleOptions: item.scheduleTime ? { time: item.scheduleTime } : null,
              mode: "guided",
              isActive: true,
              dataSource: "ai-extracted",
              explainWhy: "Spiritual practice extracted from AI conversation",
            });
            
            // Create calendar event if time specified
            if (item.dayOfWeek !== undefined && item.scheduleTime) {
              const now = new Date();
              const currentDayOfWeek = now.getDay();
              const targetDayOfWeek = item.dayOfWeek;
              const [startHour, startMin] = (item.scheduleTime as string).split(":").map(Number);
              
              // Calculate days until target, handling same-day future times
              let daysUntil = targetDayOfWeek - currentDayOfWeek;
              if (targetDayOfWeek === currentDayOfWeek) {
                const eventTimeMinutes = startHour * 60 + startMin;
                const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
                if (eventTimeMinutes <= currentTimeMinutes) {
                  daysUntil = 7;
                } else {
                  daysUntil = 0;
                }
              } else if (daysUntil < 0) {
                daysUntil += 7;
              }
              
              const eventDate = new Date(now);
              eventDate.setDate(now.getDate() + daysUntil);
              
              const startDateTime = new Date(eventDate);
              startDateTime.setHours(startHour, startMin, 0, 0);
              
              const durationMinutes = item.durationMinutes || 15;
              const endDateTime = new Date(startDateTime);
              endDateTime.setMinutes(endDateTime.getMinutes() + durationMinutes);
              
              await storage.createCalendarEvent({
                userId,
                title: item.title,
                description: item.description || null,
                startTime: startDateTime.toISOString(),
                endTime: endDateTime.toISOString(),
                eventType: "routine",
                isRecurring: true,
                recurrenceRule: `FREQ=WEEKLY;BYDAY=${['SU','MO','TU','WE','TH','FR','SA'][targetDayOfWeek]}`,
                linkedType: "routine",
                linkedId: routine.id,
                linkedRoute: "/spiritual",
              });
            }
            saved++;
          }
        } catch (itemError) {
          console.error("Error saving item:", item, itemError);
        }
      }

      res.json({ saved, total: items.length });
    } catch (error) {
      console.error("Save life system items error:", error);
      res.status(500).json({ error: "Failed to save items" });
    }
  });

  return httpServer;
}

function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`;
}

function categorizeIngredient(ingredient: string): string {
  const lower = ingredient.toLowerCase();
  
  const categories: { [key: string]: string[] } = {
    produce: ["lettuce", "tomato", "onion", "garlic", "pepper", "carrot", "celery", "spinach", "kale", "broccoli", "cucumber", "avocado", "lemon", "lime", "apple", "banana", "orange", "berries", "potato", "sweet potato"],
    protein: ["chicken", "beef", "pork", "turkey", "fish", "salmon", "tuna", "shrimp", "tofu", "tempeh", "eggs", "egg"],
    dairy: ["milk", "cheese", "yogurt", "butter", "cream", "sour cream"],
    grains: ["rice", "pasta", "bread", "quinoa", "oats", "flour", "tortilla", "noodles"],
    pantry: ["oil", "vinegar", "soy sauce", "honey", "maple", "sugar", "salt", "pepper", "spice", "sauce", "broth", "stock", "beans", "lentils", "chickpeas"],
    frozen: ["frozen", "ice cream"],
    beverages: ["juice", "coffee", "tea", "water", "soda", "wine", "beer"],
  };
  
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => lower.includes(keyword))) {
      return category;
    }
  }
  
  return "other";
}
