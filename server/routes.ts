import type { Express, Request, Response, NextFunction } from "express";
import { parseLifeSystemRuleBased } from "./life-system-parser-rules";
import express from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcrypt";
import crypto from "crypto";
import multer from "multer";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import rateLimit from "express-rate-limit";
import { patchRateLimiter, validatePatchPayloadSize, sanitizePatchBody } from "./middleware/guardrails";
import { storage } from "./storage";
import { pool } from "./db";
import { db } from "./db";
import { elevationPlans, elevationPlanDays, elevationPlanActions, aiLearnings, communityPosts, communityPostLikes, communityGroups, communityGroupMembers, goals as goalsTable, habits as habitsTable, scheduleBlocks as scheduleBlocksTable, shoppingLists as shoppingListsTable, lifeSystems as lifeSystemsTable, routines as routinesTable, calendarEvents as calendarEventsTable, onboardingProfiles as onboardingProfilesTable, aiSyncSessions as aiSyncSessionsTable, aiSyncItems as aiSyncItemsTable, interactionEvents as interactionEventsTable, aiPatternSnapshots as aiPatternSnapshotsTable, userLearningProfile as userLearningProfileTable } from "@shared/schema";
import { eq } from "drizzle-orm";
import * as accountability from "./accountability";
import { sendPasswordResetEmail, sendFeedbackEmail, sendAccountDeletionEmail, sendSupportReportEmail, sendPartnerInviteEmail, sendWelcomeEmail } from "./email";
import { generateChatResponse, generateLifeSystemRecommendations, generateDashboardInsight, generateFullAnalysis, detectIntentAndRespond, detectIntentAndRespondStreaming, generateLearnModeQuestion, generateWorkoutPlan, generateMeditationSuggestions, analyzeMealPlanDocument, generateInteractionInsights, generateContextualSearch, generateIngredientSubstitutes, processConversationIntoInsights, generateElevationPlanStructure, openai, getAiConfigStatus, generateDiscoverRandomContent, enforceOneQuestion, type SearchCategory } from "./openai";
import { generateProactiveNudges, generateMorningBriefing } from "./proactive";
import { extractTextFromBuffer, generateDocumentAnalysisPrompt, validateAnalysisResult, isProcessingError, detectPrimaryCategory, type DocumentAnalysisResult, type DocumentProcessingError } from "./document-parser";
import { googleVisionService } from "./google-vision";
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
  insertSavedContentSchema,
  insertFeedInteractionSchema,
  insertChallengeSchema,
  insertBodyScanSchema,
  insertSystemModuleSchema,
  insertDailyScheduleEventSchema,
  insertUserSystemPreferencesSchema,
  insertShoppingListSchema,
  insertShoppingListItemSchema,
  insertWearableDeviceSchema,
  insertWearableDataSchema,
  insertAstrologyPredictionSchema,
  insertDimensionBlueprintSchema,
  insertResetProtocolSchema,
  insertUserPatternSchema,
  insertTrackingLogSchema,
  insertMealLogSchema,
  insertWaterLogSchema,
  insertUniversalPlanSchema,
  insertCompletionStatusSchema,
  insertTaskAccountabilitySchema,
  insertAccountabilityStatsSchema,
  insertNotificationPreferencesSchema,
  insertLifeDimensionAssessmentSchema,
  insertDimensionSystemSchema,
  insertWellnessPreferencesSchema,
  insertUserValuesRulesSchema,
  insertFeatureSettingsSchema,
  insertHouseholdCleaningTaskSchema,
  insertHouseholdLaundryScheduleSchema,
  insertAiFeatureUsageSchema,
  insertAiSuggestionSchema,
  insertConversationInsightSchema,
  insertDwInsightSchema,
  insertDwJournalEntrySchema,
  insertDwFollowupSchema,
  insertReminderSchema,
  updateUserLearningProfileSchema,
  insertWeeklyPlanReviewSchema,
  updateWeeklyPlanReviewSchema,
  type Habit,
  type Goal,
  type MoodLog,
  type ScheduleBlock,
  type CoachingMode,
  type UserProfile,
  type InsertUserProfile,
  type OnboardingProfile,
  coachingModeEnum,
} from "@shared/schema";
import { z } from "zod";

const SALT_ROUNDS = 10;

declare module "express-session" {
  interface SessionData {
    userId?: string;
    oauthState?: string;
  }
}

// Helper function to calculate search relevance score
function calculateRelevance(title: string | null | undefined, description: string | null | undefined, searchTerm: string): number {
  let score = 0;
  const lowerSearch = searchTerm.toLowerCase();
  const titleLower = (title || "").toLowerCase();
  const descLower = (description || "").toLowerCase();
  
  // Exact match in title gets highest score
  if (titleLower === lowerSearch) score += 100;
  // Title starts with search term
  else if (titleLower.startsWith(lowerSearch)) score += 50;
  // Title contains search term
  else if (titleLower.includes(lowerSearch)) score += 25;
  
  // Description contains search term
  if (descLower.includes(lowerSearch)) score += 10;
  
  // Bonus for multiple word matches
  const searchWords = lowerSearch.split(/\s+/);
  searchWords.forEach(word => {
    if (word.length > 2) {
      if (titleLower.includes(word)) score += 5;
      if (descLower.includes(word)) score += 2;
    }
  });
  
  return score;
}

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Not authorized" });
    }
    next();
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify admin status" });
  }
};

interface ExtractedCategoryData {
  category: string;
  title: string;
  content?: string;
  date?: string;
  metadata?: Record<string, unknown>;
}

interface ExtractedSyncItem {
  itemType: "event" | "goal" | "habit" | "task";
  title: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  recurrencePattern?: string;
  recurrenceGroupKey?: string;
  dimensionTags?: string[];
  rawExtraction?: string;
}

function extractSyncableItems(userMessage: string, aiResponse: string): ExtractedSyncItem[] {
  const items: ExtractedSyncItem[] = [];
  const combined = `${userMessage} ${aiResponse}`;
  const lowerCombined = combined.toLowerCase();
  
  const hasRecurringIntent = 
    /every\s+(day|week|month|morning|evening|night)/i.test(combined) ||
    /every\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(combined) ||
    /\b(daily|weekly|monthly|weekdays|weekends)\b/i.test(combined) ||
    /every\s+other\s+(day|week)/i.test(combined);
  
  const hasScheduleIntent = 
    /(?:schedule|add|create|set\s+up|plan|remind)\s+/i.test(combined);
  
  if (hasScheduleIntent && hasRecurringIntent) {
    let eventTitle = "";
    let recurrencePattern = "";
    
    const titleMatch = combined.match(/(?:schedule|add|create|set\s+up|plan|remind)\s+(?:me\s+to\s+)?(?:a\s+)?(?:recurring\s+)?([^,\.]+?)(?:\s+every|\s+daily|\s+weekly|\s+on\s+)/i);
    if (titleMatch && titleMatch[1]) {
      eventTitle = titleMatch[1].trim();
    }
    
    if (!eventTitle) {
      const simpleMatch = combined.match(/(?:schedule|add|create)\s+([a-zA-Z\s]+?)(?:\s+at\s+|\s+for\s+|\s+every\s+)/i);
      if (simpleMatch && simpleMatch[1]) {
        eventTitle = simpleMatch[1].trim();
      }
    }
    
    if (/every\s+day|daily|every\s+morning|every\s+evening|every\s+night/i.test(combined)) {
      recurrencePattern = "Daily";
    } else if (/weekdays|every\s+weekday|monday\s+through\s+friday/i.test(combined)) {
      recurrencePattern = "Weekdays";
    } else if (/weekends|every\s+weekend/i.test(combined)) {
      recurrencePattern = "Weekends";
    } else if (/every\s+other\s+day/i.test(combined)) {
      recurrencePattern = "Every other day";
    } else if (/every\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(combined)) {
      const dayMatch = combined.match(/every\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
      if (dayMatch) {
        recurrencePattern = `Weekly on ${dayMatch[1].charAt(0).toUpperCase() + dayMatch[1].slice(1).toLowerCase()}`;
      }
    } else if (/every\s+week|weekly/i.test(combined)) {
      recurrencePattern = "Weekly";
    } else if (/every\s+month|monthly/i.test(combined)) {
      recurrencePattern = "Monthly";
    }
    
    let timeDescription = "";
    const timeMatch = combined.match(/(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
    if (timeMatch) {
      const hour = parseInt(timeMatch[1]);
      const minute = timeMatch[2] || "00";
      const ampm = timeMatch[3].toLowerCase();
      timeDescription = `${hour}:${minute} ${ampm}`;
    } else if (/\bmorning\b/i.test(lowerCombined)) {
      timeDescription = "morning";
    } else if (/\bevening\b/i.test(lowerCombined)) {
      timeDescription = "evening";
    } else if (/\bnight\b/i.test(lowerCombined)) {
      timeDescription = "night";
    }
    
    if (eventTitle && recurrencePattern) {
      eventTitle = eventTitle.replace(/^(a|an|the|my)\s+/i, "").trim();
      
      if (eventTitle.length < 3 || eventTitle.length > 100) {
        return items;
      }
      
      const groupKey = `recurring-${eventTitle.toLowerCase().replace(/\s+/g, "-").slice(0, 30)}-${Date.now()}`;
      
      items.push({
        itemType: "event",
        title: eventTitle.slice(0, 100),
        description: timeDescription 
          ? `${recurrencePattern} at ${timeDescription}` 
          : recurrencePattern,
        recurrencePattern: timeDescription 
          ? `${recurrencePattern} at ${timeDescription}` 
          : recurrencePattern,
        recurrenceGroupKey: groupKey,
        rawExtraction: userMessage.slice(0, 300),
      });
    }
  }
  
  return items;
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

// ── DW Intelligence: pipeline thresholds ─────────────────────────────────────
/** Minimum number of messages in a conversation to trigger the DW pipeline. */
const DW_MIN_MESSAGES = 4; // at least 2 user+assistant exchanges
/** Minimum total character count across all messages to trigger the pipeline. */
const DW_MIN_TOTAL_CHARS = 200;
/** Maximum messages allowed in a single /api/dw/processConversation request. */
const DW_MAX_CONVERSATION_MESSAGES = 100;
/** Maximum characters per individual message. */
const DW_MAX_MESSAGE_CONTENT_LENGTH = 100_000;
/** Maximum total characters across all messages in a single request. */
const DW_MAX_TOTAL_CONTENT_LENGTH = 100_000;

/**
 * Server-controlled system prompt overrides keyed by chat `context` value.
 * Clients send a context name (e.g. "voice-onboarding"); the server resolves
 * the actual prompt text, preventing arbitrary prompt injection from clients.
 */
const CONTEXT_SYSTEM_OVERRIDES: Record<string, string> = {
  "voice-onboarding":
    "You are DW, a warm and grounding AI wellness companion.\n" +
    "You are meeting this person for the first time during voice onboarding.\n\n" +
    "Your role in this conversation:\n" +
    "- Introduce yourself briefly and warmly\n" +
    "- Learn what dimension of wellness matters most to them right now (physical, emotional, mental, financial, spiritual, occupational)\n" +
    "- Ask one thoughtful question at a time\n" +
    "- Help them feel heard and welcome\n" +
    "- Keep responses concise (2–4 sentences) and calm\n" +
    "- Avoid overwhelming them with information\n\n" +
    "Start by welcoming them and asking a single open question about how they're doing or what brought them here today.",
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const isProduction = process.env.NODE_ENV === "production";
  
  // Trust the first proxy (Replit's proxy) for secure cookies to work
  app.set("trust proxy", 1);
  
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET environment variable is required. Please set it in your environment or Replit Secrets.");
  }
  
  const sessionSecret = process.env.SESSION_SECRET;
  
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

  // Initialize Passport (used for OAuth strategies; no session serialization needed
  // since we manage sessions ourselves via express-session)
  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user, done) => done(null, user as Express.User));
  app.use(passport.initialize());

  // ─── PATCH guardrails ─────────────────────────────────────────────────────
  // Apply rate limiting, payload-size guard, and prompt-injection sanitisation
  // to every PATCH /api/* request, before any route handler executes.
  app.patch("/api/*", patchRateLimiter, validatePatchPayloadSize, sanitizePatchBody);

  // ─── OAuth helpers ─────────────────────────────────────────────────────────
  // The base URL used for OAuth redirect URIs.  Falls back to the Replit URL
  // for local/staging use, and can be overridden via OAUTH_REDIRECT_BASE_URL
  // once a custom domain is in use.
  const oauthRedirectBase = (() => {
    if (process.env.OAUTH_REDIRECT_BASE_URL) return process.env.OAUTH_REDIRECT_BASE_URL;
    if (process.env.NODE_ENV === "production") {
      return process.env.APP_URL || process.env.APP_BASE_URL || (
        process.env.REPLIT_DOMAINS
          ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
          : "https://dimensional-wellness-ai--dareiltrader.replit.app"
      );
    }
    return process.env.REPLIT_DOMAINS
      ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
      : process.env.APP_URL || process.env.APP_BASE_URL || "https://dimensional-wellness-ai--dareiltrader.replit.app";
  })().replace(/\/$/, "");

  console.log("[oauth] Redirect base URL:", oauthRedirectBase, "(env:", process.env.NODE_ENV, ")");

  /** Find-or-create a user for an OAuth login, then set an Express session. */
  async function handleOAuthUser(
    req: Request,
    res: Response,
    opts: { provider: string; oauthId: string; email: string; firstName?: string }
  ) {
    const { provider, oauthId, firstName } = opts;

    // Basic email format validation before touching the database
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(opts.email)) {
      throw new Error(`Invalid email address received from ${provider}`);
    }
    const email = opts.email.toLowerCase().trim();

    // 1. Look up by OAuth identity (most common path after first sign-in)
    let user = await storage.getUserByOAuthId(provider, oauthId);

    if (!user) {
      // 2. Check for an existing email/password account with this email.
      //    Only link automatically when the current session already belongs to
      //    that account (i.e. the user is already signed in and adding OAuth).
      //    Otherwise, create a fresh account to prevent account takeover.
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        // OAuth provider has verified the email — safe to link to the matching account.
        // This lets users who previously signed up with email/password continue
        // with Google/Apple without a catch-22 situation.
        const updated = await storage.updateUser(existingUser.id, { oauthProvider: provider, oauthId });
        if (!updated) {
          throw new Error("Failed to link OAuth credentials to existing account");
        }
        user = updated;
      } else {
        // 3. Create a brand-new account (no password for OAuth users)
        user = await storage.createUser({
          email,
          oauthProvider: provider,
          oauthId,
          ...(firstName ? { firstName } : {}),
        });
      }
    }

    // Set session with a 30-day cookie (same as the email/password default)
    req.session.userId = user.id;
    req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
    await new Promise<void>((resolve, reject) =>
      req.session.save((err) => {
        if (err) {
          if (process.env.NODE_ENV === "development") {
            console.error("[auth] Session save error after OAuth login:", err);
          }
          reject(new Error("Failed to establish session after OAuth login"));
        } else {
          resolve();
        }
      })
    );
    return user;
  }

  // ─── Google OAuth ───────────────────────────────────────────────────────────
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  console.log("[oauth] Google OAuth configured:", !!googleClientId && !!googleClientSecret);

  // Rate limiter applied only to OAuth callback endpoints (50 requests / 15 min per IP).
  // Initiation endpoints are not rate-limited; they just redirect to the provider.
  const oauthCallbackLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many auth requests. Please try again later." },
  });

  // Rate limiter for chat endpoints (30 requests / 60 seconds per IP).
  const chatLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many chat requests. Please slow down and try again shortly." },
  });

  app.get("/api/auth/google/callback", (_req, res, next) => {
    if (!googleClientId || !googleClientSecret) {
      return res.redirect("/login?error=google_not_configured");
    }
    next();
  });

  if (googleClientId && googleClientSecret) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: googleClientId,
          clientSecret: googleClientSecret,
          callbackURL: `${oauthRedirectBase}/api/auth/google/callback`,
          passReqToCallback: false,
        },
        (_accessToken, _refreshToken, profile, done) => done(null, profile)
      )
    );

    // Initiate Google OAuth – generate a CSRF state, save to session, then redirect
    app.get("/api/auth/google", (req, res, next) => {
      const state = crypto.randomBytes(16).toString("hex");
      const stateHash = crypto.createHash("sha256").update(state + sessionSecret).digest("hex");
      req.session.oauthState = stateHash;
      req.session.save((err) => {
        if (err) return next(err);
        const combinedState = `${state}.${stateHash}`;
        passport.authenticate("google", {
          scope: ["profile", "email"],
          session: false,
          state: combinedState,
        })(req, res, next);
      });
    });

    // Google OAuth callback – validate CSRF state before processing the profile
    app.get(
      "/api/auth/google/callback",
      oauthCallbackLimiter,
      (req, res, next) => {
        const returnedState = typeof req.query.state === "string" ? req.query.state : undefined;
        if (!returnedState) {
          return res.redirect("/login?error=invalid_state");
        }
        const [rawState, stateHash] = returnedState.split(".");
        if (!rawState || !stateHash) {
          return res.redirect("/login?error=invalid_state");
        }
        const expectedHash = crypto.createHash("sha256").update(rawState + sessionSecret).digest("hex");
        if (expectedHash !== stateHash) {
          return res.redirect("/login?error=invalid_state");
        }
        const sessionState = req.session.oauthState;
        delete req.session.oauthState;
        if (sessionState && sessionState !== stateHash) {
          return res.redirect("/login?error=invalid_state");
        }
        next();
      },
      passport.authenticate("google", { session: false, failureRedirect: "/login?error=google_failed" }),
      async (req, res) => {
        try {
          const profile = req.user as import("passport-google-oauth20").Profile;
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return res.redirect("/login?error=no_email");
          }
          await handleOAuthUser(req, res, {
            provider: "google",
            oauthId: profile.id,
            email,
            firstName: profile.name?.givenName,
          });
          res.redirect("/");
        } catch (err) {
          if (process.env.NODE_ENV === "development") {
            console.error("[auth] Google callback error:", err);
          }
          const errorCode =
            err instanceof Error && err.message === "account_exists_use_password"
              ? "account_exists_use_password"
              : "google_failed";
          res.redirect(`/login?error=${errorCode}`);
        }
      }
    );
  } else {
    // Stub routes so the frontend can detect when Google OAuth is not configured
    app.get("/api/auth/google", (_req, res) =>
      res.status(503).json({ error: "Google OAuth not configured" })
    );
  }

  // ─── Facebook OAuth ─────────────────────────────────────────────────────────
  const facebookAppId = process.env.FACEBOOK_APP_ID;
  const facebookAppSecret = process.env.FACEBOOK_APP_SECRET;

  if (facebookAppId && facebookAppSecret) {
    passport.use(
      new FacebookStrategy(
        {
          clientID: facebookAppId,
          clientSecret: facebookAppSecret,
          callbackURL: `${oauthRedirectBase}/api/auth/facebook/callback`,
          profileFields: ["id", "emails", "name"],
        },
        (_accessToken, _refreshToken, profile, done) => done(null, profile)
      )
    );

    app.get("/api/auth/facebook", (req, res, next) => {
      const state = crypto.randomBytes(16).toString("hex");
      const stateHash = crypto.createHash("sha256").update(state + sessionSecret).digest("hex");
      req.session.oauthState = stateHash;
      req.session.save((err) => {
        if (err) return next(err);
        const combinedState = `${state}.${stateHash}`;
        passport.authenticate("facebook", {
          scope: ["email"],
          session: false,
          state: combinedState,
        })(req, res, next);
      });
    });

    app.get(
      "/api/auth/facebook/callback",
      oauthCallbackLimiter,
      (req, res, next) => {
        const returnedState = typeof req.query.state === "string" ? req.query.state : undefined;
        if (!returnedState) return res.redirect("/login?error=invalid_state");
        const [rawState, stateHash] = returnedState.split(".");
        if (!rawState || !stateHash) return res.redirect("/login?error=invalid_state");
        const expectedHash = crypto.createHash("sha256").update(rawState + sessionSecret).digest("hex");
        if (expectedHash !== stateHash) return res.redirect("/login?error=invalid_state");
        const sessionState = req.session.oauthState;
        delete req.session.oauthState;
        if (sessionState && sessionState !== stateHash) return res.redirect("/login?error=invalid_state");
        next();
      },
      passport.authenticate("facebook", { session: false, failureRedirect: "/login?error=facebook_failed" }),
      async (req, res) => {
        try {
          const profile = req.user as import("passport-facebook").Profile;
          const email = profile.emails?.[0]?.value;
          if (!email) return res.redirect("/login?error=no_email");
          await handleOAuthUser(req, res, {
            provider: "facebook",
            oauthId: profile.id,
            email,
            firstName: profile.name?.givenName,
          });
          res.redirect("/");
        } catch (err) {
          if (process.env.NODE_ENV === "development") {
            console.error("[auth] Facebook callback error:", err);
          }
          const errorCode =
            err instanceof Error && err.message === "account_exists_use_password"
              ? "account_exists_use_password"
              : "facebook_failed";
          res.redirect(`/login?error=${errorCode}`);
        }
      }
    );
  } else {
    app.get("/api/auth/facebook", (_req, res) =>
      res.status(503).json({ error: "Facebook OAuth not configured" })
    );
    app.get("/api/auth/facebook/callback", (_req, res) =>
      res.status(503).json({ error: "Facebook OAuth not configured" })
    );
  }

  // Expose which OAuth providers are configured so the frontend can show/hide buttons
  app.get("/api/auth/providers", (_req, res) => {
    res.json({
      google: !!googleClientId && !!googleClientSecret,
      facebook: !!facebookAppId && !!facebookAppSecret,
    });
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      // Log device/user-agent info for debugging (dev mode only)
      if (process.env.NODE_ENV === "development") {
        const userAgent = req.headers["user-agent"] || "unknown";
        const deviceType = /iPad|iPhone|iPod/.test(userAgent) ? "iOS" : 
                          /Android/.test(userAgent) ? "Android" : "Other";
        console.log(`[Registration] Device: ${deviceType}, User-Agent: ${userAgent}`);
      }

      // Validate input data with better error messages
      let data;
      try {
        data = insertUserSchema.parse(req.body);
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          const firstError = validationError.errors[0];
          let userMessage = "Please check your information and try again.";
          
          if (firstError.path.includes("email")) {
            userMessage = "Please enter a valid email address.";
          } else if (firstError.path.includes("password")) {
            userMessage = "Password must be at least 6 characters long.";
          }
          
          return res.status(400).json({ 
            error: userMessage,
            details: process.env.NODE_ENV === "development" ? validationError.errors : undefined
          });
        }
        throw validationError;
      }
      
      // Normalize email to lowercase and trim whitespace
      const email = data.email?.toLowerCase().trim();
      const password = data.password?.trim();
      
      // Additional validation
      if (!email || !password) {
        return res.status(400).json({ 
          error: "Email and password are required." 
        });
      }
      
      // Check if email already exists
      let existing;
      try {
        existing = await storage.getUserByEmail(email);
      } catch (dbError) {
        console.error("Database error checking existing user:", dbError);
        return res.status(500).json({ 
          error: "We're having trouble connecting. Please try again in a moment." 
        });
      }
      
      if (existing) {
        return res.status(400).json({ 
          error: "This email is already registered. Try logging in instead." 
        });
      }
      
      // Hash password with error handling
      let hashedPassword;
      try {
        hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      } catch (hashError) {
        console.error("Password hashing error:", hashError);
        return res.status(500).json({ 
          error: "Unable to secure your password. Please try again." 
        });
      }
      
      // Create user with error handling
      let user;
      try {
        user = await storage.createUser({ 
          email, 
          password: hashedPassword 
        });
      } catch (createError) {
        console.error("User creation error:", createError);
        return res.status(500).json({ 
          error: "Unable to create your account. Please try again or contact support." 
        });
      }
      
      if (!user || !user.id) {
        console.error("User creation failed - no user returned");
        return res.status(500).json({ 
          error: "Account creation incomplete. Please try again." 
        });
      }
      
      // Set session
      req.session.userId = user.id;

      // Save session - fail registration if session cannot be established
      try {
        await new Promise<void>((resolve, reject) => {
          req.session.save((err) => {
            if (err) {
              console.error("Session save error during registration:", err);
              reject(err);
            } else {
              resolve();
            }
          });
        });
      } catch (sessionError) {
        // Session save failed - registration cannot continue without a valid session
        console.error("Failed to establish session for new user:", sessionError);
        return res.status(500).json({
          error: "Your account was created but we couldn't log you in. Please try logging in manually."
        });
      }
      
      // Send welcome email (non-blocking — don't fail registration if email fails)
      sendWelcomeEmail(email).catch((err) =>
        console.error('[email] Welcome email failed for new user:', err)
      );

      // Success! Return user data
      res.json({ 
        user: { 
          id: user.id, 
          email: user.email, 
          onboardingCompleted: user.onboardingCompleted || false
        }
      });
    } catch (error) {
      // Catch-all error handler
      console.error("Unexpected registration error:", error);
      
      // Provide helpful error message based on error type
      let userMessage = "Something went wrong. Please try again.";
      
      if (error instanceof Error) {
        // Check for network-related errors
        if (error.message.includes("ECONNREFUSED") || error.message.includes("ETIMEDOUT")) {
          userMessage = "Unable to connect to the server. Please check your internet connection.";
        } else if (error.message.includes("database") || error.message.includes("pool")) {
          userMessage = "Database connection issue. Please try again in a moment.";
        }
      }
      
      res.status(500).json({ 
        error: userMessage 
      });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password, rememberMe } = req.body;
      const normalizedEmail = email.toLowerCase().trim();
      const user = await storage.getUserByEmail(normalizedEmail);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      // OAuth-only accounts have no password – direct them to sign in with their provider
      if (!user.password) {
        const provider = user.oauthProvider || "social provider";
        const providerLabels: Record<string, string> = {
          google: "Continue with Google",
        };
        const buttonLabel = providerLabels[provider] ?? `Sign in with ${provider}`;
        return res.status(401).json({
          error: `This account uses ${provider} sign-in. Please use the "${buttonLabel}" button.`,
        });
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

  app.delete("/api/auth/delete-account", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      // Get user email before deletion for confirmation email
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const userEmail = user.email;
      
      // Delete all user data
      await storage.deleteUser(userId);
      
      // Send confirmation email
      try {
        await sendAccountDeletionEmail(userEmail);
      } catch (emailError) {
        // Log error but don't fail the deletion
        console.error('Failed to send account deletion email:', emailError);
      }
      
      // Destroy session
      req.session.destroy(() => {
        res.json({ success: true, message: "Account deleted successfully" });
      });
    } catch (error) {
      console.error('Error deleting account:', error);
      res.status(500).json({ error: "Failed to delete account" });
    }
  });

  // Full account reset — wipes life system data, AI learnings, and resets onboarding
  app.delete("/api/user/life-system/reset", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;

      // 1. Delete AI sync items first (FK dependency on sessions)
      await db.delete(aiSyncItemsTable).where(eq(aiSyncItemsTable.sessionId,
        db.select({ id: aiSyncSessionsTable.id }).from(aiSyncSessionsTable).where(eq(aiSyncSessionsTable.userId, userId)) as any
      )).catch(() => {/* ignore if FK cascade handles it */});

      // 2. Wipe everything in parallel
      await Promise.all([
        db.delete(goalsTable).where(eq(goalsTable.userId, userId)),
        db.delete(habitsTable).where(eq(habitsTable.userId, userId)),
        db.delete(scheduleBlocksTable).where(eq(scheduleBlocksTable.userId, userId)),
        db.delete(routinesTable).where(eq(routinesTable.userId, userId)),
        db.delete(calendarEventsTable).where(eq(calendarEventsTable.userId, userId)),
        db.delete(lifeSystemsTable).where(eq(lifeSystemsTable.userId, userId)),
        db.delete(aiLearnings).where(eq(aiLearnings.userId, userId)),
        db.delete(aiSyncSessionsTable).where(eq(aiSyncSessionsTable.userId, userId)),
        db.delete(interactionEventsTable).where(eq(interactionEventsTable.userId, userId)),
        db.delete(aiPatternSnapshotsTable).where(eq(aiPatternSnapshotsTable.userId, userId)),
        db.delete(userLearningProfileTable).where(eq(userLearningProfileTable.userId, userId)),
        db.delete(onboardingProfilesTable).where(eq(onboardingProfilesTable.userId, userId)),
      ]);

      // 3. Shopping lists cascade to items via FK
      await db.delete(shoppingListsTable).where(eq(shoppingListsTable.userId, userId));

      // 4. Mark onboarding as not completed so user goes through it again
      await storage.updateUser(userId, { onboardingCompleted: false });

      res.json({ success: true });
    } catch (error) {
      console.error("Full reset error:", error);
      res.status(500).json({ error: "Failed to reset account" });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ user: { id: user.id, email: user.email, username: user.username, firstName: user.firstName, systemName: user.systemName, onboardingCompleted: user.onboardingCompleted } });
  });

  // ─── Billing stub endpoints ───────────────────────────────────────────────
  // These are MVP simulation endpoints. Replace the stub logic with real
  // RevenueCat / Stripe webhook handling when billing infra is available.

  /**
   * GET /api/billing/status
   * Returns the caller's current subscription tier.
   * NOTE: Paywall is disabled until App Store in-app purchases are configured.
   *       All authenticated users are treated as "plus" tier in the meantime.
   *       Restore the original logic (user.subscriptionTier) once IAP is live.
   */
  app.get("/api/billing/status", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.json({ tier: "free", updatedAt: null });
      }
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.json({ tier: "free", updatedAt: null });
      }
      // Paywall disabled — grant plus to all signed-in users until IAP is ready
      return res.json({
        tier: "plus",
        updatedAt: user.subscriptionUpdatedAt ?? null,
      });
    } catch (err) {
      console.error("[billing] status error", err);
      return res.status(500).json({ error: "Failed to fetch subscription status" });
    }
  });

  /**
   * POST /api/billing/upgrade
   * Simulates a successful purchase and sets the user's subscription tier to
   * "plus". Accepts an optional `plan` body field for future plan variants.
   * "free" is intentionally excluded — use a dedicated cancel/downgrade endpoint
   * when that flow is needed.
   * For unauthenticated users the upgrade is acknowledged but not persisted
   * (the client handles entitlement via localStorage).
   */
  app.post("/api/billing/upgrade", async (req, res) => {
    try {
      const VALID_PLANS = ["plus", "premium", "lifetime"] as const;
      const plan: string = req.body?.plan ?? "plus";
      if (!VALID_PLANS.includes(plan as typeof VALID_PLANS[number])) {
        return res.status(400).json({ error: `Invalid plan. Must be one of: ${VALID_PLANS.join(", ")}` });
      }
      // All paid plans map to the "plus" tier for MVP
      const tier = "plus" as const;

      if (req.session.userId) {
        const updated = await storage.updateUser(req.session.userId, {
          subscriptionTier: tier,
          subscriptionUpdatedAt: new Date(),
        });
        if (!updated) {
          // Session is stale — user row no longer exists; DB entitlement was not persisted.
          return res.status(404).json({ error: "User not found; subscription not persisted to database" });
        }
      }

      return res.json({
        success: true,
        tier,
        message: "DW Plus activated",
      });
    } catch (err) {
      console.error("[billing] upgrade error", err);
      return res.status(500).json({ error: "Failed to process upgrade" });
    }
  });

  /**
   * POST /api/billing/restore
   * Simulates a purchase restore. If the user already has a "plus" tier in the
   * DB the restore succeeds; otherwise it returns a "not found" response so the
   * client can surface the right message.
   * For unauthenticated users the response always indicates nothing to restore.
   */
  app.post("/api/billing/restore", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.json({ success: false, tier: "free", message: "No active subscription found" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.json({ success: false, tier: "free", message: "No active subscription found" });
      }

      if (user.subscriptionTier === "plus") {
        return res.json({
          success: true,
          tier: "plus",
          message: "DW Plus restored successfully",
        });
      }

      return res.json({ success: false, tier: "free", message: "No active subscription found" });
    } catch (err) {
      console.error("[billing] restore error", err);
      return res.status(500).json({ error: "Failed to restore subscription" });
    }
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

  const supportReportSchema = z.object({
    description: z.string().min(10, "Description must be at least 10 characters").max(5000),
    reportType: z.enum(["bug", "mismatch", "general", "other"]).default("general"),
    includeTechDetails: z.boolean().default(true),
    includeConversation: z.boolean().default(false),
    includeContext: z.boolean().default(false),
    conversationSummary: z.string().max(3000).nullable().optional(),
    contextSummary: z.string().max(3000).nullable().optional(),
    techDetails: z.object({
      userAgent: z.string().optional(),
      platform: z.string().optional(),
      appVersion: z.string().optional(),
      pageContext: z.string().optional(),
      screenSize: z.string().optional(),
    }).nullable().optional(),
  });

  app.post("/api/support/report", async (req, res) => {
    const parse = supportReportSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: "Invalid report data", details: parse.error.flatten() });
    }

    const {
      description,
      reportType,
      includeTechDetails,
      includeConversation,
      includeContext,
      conversationSummary,
      contextSummary,
      techDetails,
    } = parse.data;

    const userId = req.session.userId || null;
    let userEmail: string | null = null;
    if (userId) {
      try {
        const user = await storage.getUser(userId);
        userEmail = user?.email || null;
      } catch {
        // non-critical
      }
    }

    sendSupportReportEmail(
      userEmail,
      userId,
      description,
      reportType,
      includeTechDetails,
      includeConversation,
      includeContext,
      includeTechDetails ? (techDetails ?? null) : null,
      includeConversation ? (conversationSummary ?? null) : null,
      includeContext ? (contextSummary ?? null) : null
    ).catch((err) => {
      console.error("Failed to send support report email:", err);
    });

    res.json({ success: true });
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
      const { title, category, messages } = req.body;
      const conversation = await storage.createConversation({
        userId: req.session.userId!,
        title: title || "New Chat",
        category: category || "general",
        messages: messages || [],
      });
      res.json(conversation);
    } catch (error) {
      console.error("Create conversation error:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  app.post("/api/conversations/sync", requireAuth, async (req, res) => {
    try {
      const { conversations: guestConvos } = req.body;
      if (!Array.isArray(guestConvos)) {
        return res.status(400).json({ error: "conversations array required" });
      }
      
      // Get existing conversations to check for duplicates
      const existingConvos = await storage.getConversations(req.session.userId!);
      const existingTitles = new Set(existingConvos.map(c => c.title));
      
      const results = [];
      for (const convo of guestConvos) {
        if (!convo.messages || convo.messages.length === 0) continue;
        
        // Skip if a conversation with same title already exists (simple dedup)
        if (existingTitles.has(convo.title)) continue;
        
        // Validate and sanitize messages
        const validatedMessages = convo.messages
          .filter((m: any) => m && typeof m.content === "string" && ["user", "assistant"].includes(m.role))
          .map((m: any) => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp || Date.now(),
          }));
        
        if (validatedMessages.length === 0) continue;
        
        const conversation = await storage.createConversation({
          userId: req.session.userId!,
          title: convo.title || "Imported Chat",
          category: convo.category || "general",
          messages: validatedMessages,
        });
        results.push(conversation);
        existingTitles.add(convo.title);
      }
      
      res.json({ imported: results.length, conversations: results });
    } catch (error) {
      console.error("Sync conversations error:", error);
      res.status(500).json({ error: "Failed to sync conversations" });
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

  app.get("/api/sync/sessions", requireAuth, async (req, res) => {
    try {
      const sessions = await storage.getSyncSessions(req.session.userId!);
      res.json(sessions);
    } catch (error) {
      console.error("Get sync sessions error:", error);
      res.status(500).json({ error: "Failed to get sync sessions" });
    }
  });

  app.get("/api/sync/sessions/active", requireAuth, async (req, res) => {
    try {
      const session = await storage.getActiveSyncSession(req.session.userId!);
      if (!session) {
        return res.json(null);
      }
      const items = await storage.getSyncItems(session.id);
      const groupedItems: Record<string, typeof items> = {};
      const ungroupedItems: typeof items = [];
      
      for (const item of items) {
        if (item.recurrenceGroupKey) {
          if (!groupedItems[item.recurrenceGroupKey]) {
            groupedItems[item.recurrenceGroupKey] = [];
          }
          groupedItems[item.recurrenceGroupKey].push(item);
        } else {
          ungroupedItems.push(item);
        }
      }
      
      res.json({ session, items, groupedItems, ungroupedItems });
    } catch (error) {
      console.error("Get active sync session error:", error);
      res.status(500).json({ error: "Failed to get active sync session" });
    }
  });

  app.post("/api/sync/sessions", requireAuth, async (req, res) => {
    try {
      const session = await storage.createSyncSession({
        userId: req.session.userId!,
        conversationId: req.body.conversationId || null,
        status: "processing",
        totalItems: req.body.totalItems || 0,
        sourceType: req.body.sourceType || "chat",
      });
      res.json(session);
    } catch (error) {
      console.error("Create sync session error:", error);
      res.status(500).json({ error: "Failed to create sync session" });
    }
  });

  app.get("/api/sync/sessions/:id", requireAuth, async (req, res) => {
    try {
      const session = await storage.getSyncSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Sync session not found" });
      }
      const items = await storage.getSyncItems(session.id);
      res.json({ session, items });
    } catch (error) {
      console.error("Get sync session error:", error);
      res.status(500).json({ error: "Failed to get sync session" });
    }
  });

  app.patch("/api/sync/sessions/:id", requireAuth, async (req, res) => {
    try {
      const updated = await storage.updateSyncSession(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Update sync session error:", error);
      res.status(500).json({ error: "Failed to update sync session" });
    }
  });

  app.post("/api/sync/items", requireAuth, async (req, res) => {
    try {
      if (Array.isArray(req.body)) {
        const items = await storage.createSyncItems(req.body);
        res.json(items);
      } else {
        const item = await storage.createSyncItem(req.body);
        res.json(item);
      }
    } catch (error) {
      console.error("Create sync items error:", error);
      res.status(500).json({ error: "Failed to create sync items" });
    }
  });

  app.patch("/api/sync/items/:id", requireAuth, async (req, res) => {
    try {
      const updated = await storage.updateSyncItem(req.params.id, {
        ...req.body,
        decidedAt: req.body.userDecision ? new Date() : undefined,
      });
      res.json(updated);
    } catch (error) {
      console.error("Update sync item error:", error);
      res.status(500).json({ error: "Failed to update sync item" });
    }
  });

  app.post("/api/sync/items/group/:sessionId/:groupKey/accept", requireAuth, async (req, res) => {
    try {
      await storage.updateSyncItemsByGroup(req.params.sessionId, req.params.groupKey, {
        status: "accepted",
        userDecision: "accepted",
        decidedAt: new Date(),
      });
      
      const items = await storage.getSyncItemsByGroup(req.params.sessionId, req.params.groupKey);
      for (const item of items) {
        if (item.itemType === "event" && item.startTime && item.title) {
          const startTimeStr = item.startTime.toISOString();
          const endTimeStr = item.endTime 
            ? item.endTime.toISOString() 
            : new Date(item.startTime.getTime() + 60 * 60 * 1000).toISOString();
          await storage.createCalendarEvent({
            userId: req.session.userId!,
            title: item.title,
            description: item.description || undefined,
            startTime: startTimeStr,
            endTime: endTimeStr,
            isRecurring: !!item.recurrencePattern,
            recurrenceRule: item.recurrencePattern || undefined,
            dimensionTags: item.dimensionTags || undefined,
          });
        }
      }
      
      res.json({ success: true, itemsAccepted: items.length });
    } catch (error) {
      console.error("Accept sync group error:", error);
      res.status(500).json({ error: "Failed to accept sync group" });
    }
  });

  app.post("/api/sync/items/group/:sessionId/:groupKey/reject", requireAuth, async (req, res) => {
    try {
      await storage.updateSyncItemsByGroup(req.params.sessionId, req.params.groupKey, {
        status: "rejected",
        userDecision: "rejected",
        decidedAt: new Date(),
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Reject sync group error:", error);
      res.status(500).json({ error: "Failed to reject sync group" });
    }
  });

  app.post("/api/interactions", requireAuth, async (req, res) => {
    try {
      const event = await storage.createInteractionEvent({
        userId: req.session.userId!,
        eventType: req.body.eventType,
        pagePath: req.body.pagePath,
        actionTarget: req.body.actionTarget,
        actionValue: req.body.actionValue,
        durationMs: req.body.durationMs,
        metadata: req.body.metadata,
      });
      res.json(event);
    } catch (error) {
      console.error("Create interaction event error:", error);
      res.status(500).json({ error: "Failed to create interaction event" });
    }
  });

  app.get("/api/patterns", requireAuth, async (req, res) => {
    try {
      const dimension = req.query.dimension as string | undefined;
      const patterns = await storage.getPatternSnapshots(req.session.userId!, dimension);
      res.json(patterns);
    } catch (error) {
      console.error("Get patterns error:", error);
      res.status(500).json({ error: "Failed to get patterns" });
    }
  });

  // AI engine health status — shows which providers are active/circuit-open
  app.get("/api/ai/status", async (_req, res) => {
    try {
      const { getAIEngineStatus } = await import("./ai-engine");
      res.json(getAIEngineStatus());
    } catch {
      res.json({ status: "unknown" });
    }
  });

  app.get("/api/ai/insights", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const aggregatedData = await storage.getAggregatedInteractionData(userId);
      const insights = await generateInteractionInsights(aggregatedData);
      res.json(insights);
    } catch (error) {
      console.error("Get AI insights error:", error);
      res.status(500).json({ error: "Failed to get AI insights" });
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
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      
      await storage.createPasswordResetToken({
        userId: user.id,
        tokenHash,
        expiresAt,
      });
      
      const emailSent = await sendPasswordResetEmail(email, token);
      if (!emailSent) {
        console.error("[auth] Password reset email failed to send for:", email);
      }
      
      res.json({ success: true, message: "If an account exists with this email, a reset link has been sent." });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.json({ success: true, message: "If an account exists with this email, a reset link has been sent." });
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

  // Voice-onboarding profile extraction — called when user taps Done
  app.post("/api/onboarding/voice-complete", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { messages } = req.body as { messages?: Array<{ role: string; content: string }> };

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        await storage.updateUser(userId, { onboardingCompleted: true });
        return res.json({ success: true });
      }

      const transcript = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => `${m.role === "user" ? "User" : "DW"}: ${m.content}`)
        .join("\n");

      let extracted: {
        firstName?: string;
        wellnessFocus?: string;
        shortTermGoals?: string;
        energyLevel?: string;
      } = {};

      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `Extract key profile information from this onboarding conversation. Return a JSON object with these optional fields:
- firstName: the user's first name if they mentioned it (string or null)
- wellnessFocus: the primary wellness dimension they care about, one of: physical, emotional, mental, financial, spiritual, occupational, social, environmental (string or null)
- shortTermGoals: a short plain-text summary of their immediate goals or what brought them here (string, max 200 chars, or null)
- energyLevel: their self-described energy level: low, medium, or high (string or null)

Return only valid JSON. Use null for fields not mentioned. Do not guess.`,
            },
            {
              role: "user",
              content: `Onboarding conversation:\n${transcript}`,
            },
          ],
          response_format: { type: "json_object" },
          max_tokens: 300,
        });
        const raw = completion.choices[0]?.message?.content;
        if (raw) {
          extracted = JSON.parse(raw);
        }
      } catch (aiErr) {
        console.error("Voice onboarding AI extraction error (non-fatal):", aiErr);
      }

      await storage.updateUser(userId, { onboardingCompleted: true, ...(extracted.firstName && typeof extracted.firstName === "string" ? { firstName: extracted.firstName.trim().slice(0, 50) } : {}) });

      if (extracted.wellnessFocus || extracted.shortTermGoals) {
        try {
          const existingOnboarding = await storage.getOnboardingProfile(userId);
          if (existingOnboarding) {
            const onboardingUpdates: Partial<OnboardingProfile> = {};
            if (extracted.wellnessFocus) onboardingUpdates.wellnessFocus = [extracted.wellnessFocus];
            if (extracted.shortTermGoals) onboardingUpdates.shortTermGoals = extracted.shortTermGoals;
            await storage.updateOnboardingProfile(existingOnboarding.id, onboardingUpdates);
          } else {
            await storage.createOnboardingProfile({
              userId,
              responsibilities: [],
              priorities: [],
              wellnessFocus: extracted.wellnessFocus ? [extracted.wellnessFocus] : [],
              shortTermGoals: extracted.shortTermGoals || "",
              longTermGoals: "",
              relationshipGoals: "",
              lifeAreaDetails: {},
              conversationData: null,
            });
          }
        } catch (profileErr) {
          console.error("Voice onboarding profile save error (non-fatal):", profileErr);
        }
      }

      res.json({ success: true, extracted });
    } catch (error) {
      console.error("Voice onboarding complete error:", error);
      res.status(500).json({ error: "Failed to complete voice onboarding" });
    }
  });

  // AI-powered contextual search endpoint
  app.post("/api/search", async (req, res) => {
    try {
      const { query, category, limit, excludedIngredients, includeSubstitutes } = req.body;
      
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Search query is required" });
      }
      
      const validCategories: SearchCategory[] = ["meals", "workouts", "recovery", "spiritual", "community"];
      if (!category || !validCategories.includes(category)) {
        return res.status(400).json({ error: "Valid category is required: meals, workouts, recovery, spiritual, or community" });
      }
      
      const searchLimit = Math.min(Math.max(limit || 5, 1), 10);
      const excluded = Array.isArray(excludedIngredients) ? excludedIngredients : [];
      const results = await generateContextualSearch(query, category, searchLimit, excluded, includeSubstitutes === true);
      
      res.json(results);
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ error: "Search failed" });
    }
  });

  // AI-powered ingredient substitutes endpoint
  app.post("/api/ingredient-substitutes", async (req, res) => {
    try {
      const { ingredient, context, excludedIngredients } = req.body;
      
      if (!ingredient || typeof ingredient !== "string") {
        return res.status(400).json({ error: "Ingredient is required" });
      }
      
      const excluded = Array.isArray(excludedIngredients) ? excludedIngredients : [];
      const results = await generateIngredientSubstitutes(ingredient, context, excluded);
      
      res.json(results);
    } catch (error) {
      console.error("Ingredient substitutes error:", error);
      res.status(500).json({ error: "Failed to generate substitutes" });
    }
  });

  // Generalized alternatives endpoint for all domains
  app.post("/api/alternatives", async (req, res) => {
    try {
      const { domain, item, context, excludedItems, constraints } = req.body;
      
      if (!item || typeof item !== "string") {
        return res.status(400).json({ error: "Item is required" });
      }
      
      const validDomains = ["meals", "workouts", "recovery", "spiritual", "community"];
      if (!domain || !validDomains.includes(domain)) {
        return res.status(400).json({ error: "Valid domain is required: meals, workouts, recovery, spiritual, or community" });
      }
      
      const excluded = Array.isArray(excludedItems) ? excludedItems : [];
      const userConstraints = Array.isArray(constraints) ? constraints : [];
      
      const { generateDomainAlternatives } = await import("./openai");
      const results = await generateDomainAlternatives(domain, item, context, excluded, userConstraints);
      
      res.json(results);
    } catch (error) {
      console.error("Alternatives error:", error);
      res.status(500).json({ error: "Failed to generate alternatives" });
    }
  });

  // Guided CookSession recipe generation
  app.post("/api/ai/cook-session", async (req, res) => {
    try {
      const { query, preferences, mode } = req.body;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "query is required" });
      }
      if (query.length > 300) {
        return res.status(400).json({ error: "query must be 300 characters or fewer" });
      }
      const validModes = ["lightweight", "full"];
      const sessionMode = validModes.includes(mode) ? mode : "full";

      // Normalize preferences to avoid runtime errors from malformed input
      const rawPreferences = preferences && typeof preferences === "object" ? preferences : {};
      const normalizeStringArray = (value: unknown): string[] => {
        if (!Array.isArray(value)) return [];
        return (value as unknown[])
          .filter((v): v is string => typeof v === "string")
          .map((v) => v.trim())
          .filter((v) => v.length > 0);
      };
      const prefsRecord = rawPreferences as Record<string, unknown>;
      const normalizeValues = (value: unknown): string[] => {
        if (Array.isArray(value)) {
          return normalizeStringArray(value);
        }
        if (typeof value === "string") {
          const trimmed = value.trim();
          return trimmed.length > 0 ? [trimmed] : [];
        }
        return [];
      };
      const dietaryStyle =
        typeof prefsRecord.dietaryStyle === "string"
          ? prefsRecord.dietaryStyle.trim() || undefined
          : undefined;
      const sanitizedPreferences = {
        ...prefsRecord,
        restrictions: normalizeStringArray(prefsRecord.restrictions),
        allergies: normalizeStringArray(prefsRecord.allergies),
        bannedIngredients: normalizeStringArray(prefsRecord.bannedIngredients),
        dietaryStyle,
        values: normalizeValues(prefsRecord.values),
      };

      const recipe = await generateCookSessionRecipe(query, sanitizedPreferences, sessionMode);
      res.json(recipe);
    } catch (error) {
      console.error("Cook session generation error:", error);
      res.status(500).json({ error: "Failed to generate cook session recipe" });
    }
  });

  app.post("/api/chat", chatLimiter, async (req, res) => {
    try {
      const { message, conversationHistory, context } = req.body;

      // Validate message content
      if (!message || typeof message !== "string" || message.trim().length === 0) {
        return res.status(400).json({ error: "Message is required" });
      }
      if (message.length > DW_MAX_MESSAGE_CONTENT_LENGTH) {
        return res.status(400).json({ error: `Message is too long (max ${DW_MAX_MESSAGE_CONTENT_LENGTH} characters)` });
      }

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
      
      const [user, goals, habits, recentEntries, moodLogs, scheduleBlocks, routines, calendarEvents, lifeSystem, userProfile, systemPrefs, wellnessPrefs] = await Promise.all([
        storage.getUser(userId),
        storage.getGoals(userId),
        storage.getHabits(userId),
        storage.getCategoryEntries(userId),
        storage.getMoodLogs(userId),
        storage.getScheduleBlocks(userId),
        storage.getRoutines(userId),
        storage.getCalendarEvents(userId),
        storage.getLifeSystem(userId),
        storage.getUserProfile(userId),
        storage.getUserSystemPreferences(userId),
        storage.getWellnessPreferences(userId),
      ]);
      
      const today = new Date();
      const dayOfWeek = today.getDay();
      const todayStr = today.toISOString().split('T')[0];
      
      const userContext = {
        category: context,
        systemName: user?.systemName || undefined,
        activeGoals: goals.filter(g => g.isActive).map(g => ({ 
          title: g.title, 
          progress: g.progress || 0,
          wellnessDimension: g.wellnessDimension || undefined
        })),
        habits: habits.filter(h => h.isActive).map(h => ({ 
          title: h.title, 
          streak: h.streak || 0,
          frequency: h.frequency || 'daily'
        })),
        upcomingEvents: recentEntries
          .filter(e => e.category === 'calendar' && e.date)
          .slice(0, 5)
          .map(e => ({ title: e.title, date: e.date! })),
        recentMoods: moodLogs.slice(0, 5).map(m => ({
          energy: m.energyLevel,
          mood: m.moodLevel,
          clarity: m.clarityLevel || undefined,
          date: m.createdAt?.toISOString().split('T')[0] || ''
        })),
        categoryEntries: recentEntries.slice(0, 10).map(e => ({
          category: e.category,
          title: e.title,
          content: e.content || '',
          date: e.date || undefined
        })),
        todaySchedule: scheduleBlocks
          .filter(b => b.dayOfWeek === dayOfWeek)
          .map(b => ({
            title: b.title,
            startTime: b.startTime,
            endTime: b.endTime,
            category: b.category || undefined
          })),
        routines: routines.map(r => ({
          title: r.name,
          type: r.mode || 'routine',
          isActive: r.isActive ?? true
        })),
        todayCalendarEvents: calendarEvents
          .filter(e => e.startTime?.startsWith(todayStr))
          .map(e => ({
            title: e.title,
            time: e.startTime?.split('T')[1]?.substring(0, 5) || undefined,
            allDay: false
          })),
        lifeSystem: {
          preferences: {
            enabledSystems: systemPrefs?.enabledSystems || [],
            preferredWakeTime: systemPrefs?.preferredWakeTime || undefined,
            preferredSleepTime: systemPrefs?.preferredSleepTime || undefined,
          },
          scheduleEvents: scheduleBlocks
            .filter(b => b.dayOfWeek === dayOfWeek)
            .map(b => ({
              title: b.title,
              scheduledTime: b.startTime,
              systemReference: b.category || undefined
            })),
        },
        wellnessFocus: userProfile?.goals || [],
        peakMotivationTime: systemPrefs?.preferredWakeTime || undefined,
        coachMode: (coachingModeEnum as readonly string[]).includes(user?.coachingMode ?? "")
          ? (user!.coachingMode as CoachingMode)
          : "gentle",
        wellnessPreferences: wellnessPrefs ? {
          beliefSystem: wellnessPrefs.beliefSystem,
          traditions: wellnessPrefs.traditions,
          otherTradition: wellnessPrefs.otherTradition,
          meditationEnabled: wellnessPrefs.meditationEnabled,
          journalEnabled: wellnessPrefs.journalEnabled,
          astrologyEnabled: wellnessPrefs.astrologyEnabled,
          tarotEnabled: wellnessPrefs.tarotEnabled,
          energyWorkEnabled: wellnessPrefs.energyWorkEnabled,
        } : undefined,
      };
      
      const rawResponse = await generateChatResponse(
        message,
        conversationHistory || [],
        userContext
      );
      
      const response = typeof rawResponse === 'string' ? rawResponse : rawResponse.content;
      const toolCalls = typeof rawResponse === 'object' && 'toolCalls' in rawResponse ? rawResponse.toolCalls : [];
      
      const actionsTaken: string[] = [];
      for (const toolCall of toolCalls) {
        try {
          switch (toolCall.name) {
            case 'create_schedule_block':
              await storage.createScheduleBlock({
                userId,
                title: toolCall.arguments.title,
                startTime: toolCall.arguments.startTime,
                endTime: toolCall.arguments.endTime,
                dayOfWeek: toolCall.arguments.dayOfWeek,
                category: toolCall.arguments.category || 'personal',
              });
              actionsTaken.push(`Added "${toolCall.arguments.title}" to your schedule`);
              break;
            case 'log_mood':
              await storage.createMoodLog({
                userId,
                energyLevel: toolCall.arguments.energyLevel,
                moodLevel: toolCall.arguments.moodLevel,
                clarityLevel: toolCall.arguments.clarityLevel,
                notes: toolCall.arguments.notes,
              });
              actionsTaken.push(`Logged your mood (energy: ${toolCall.arguments.energyLevel}/5, mood: ${toolCall.arguments.moodLevel}/5)`);
              break;
            case 'create_goal':
              await storage.createGoal({
                userId,
                title: toolCall.arguments.title,
                description: toolCall.arguments.description,
                wellnessDimension: toolCall.arguments.wellnessDimension,
                isActive: true,
              });
              actionsTaken.push(`Created goal: "${toolCall.arguments.title}"`);
              break;
            case 'create_habit':
              await storage.createHabit({
                userId,
                title: toolCall.arguments.title,
                description: toolCall.arguments.description,
                frequency: toolCall.arguments.frequency,
                reminderTime: toolCall.arguments.reminderTime,
                isActive: true,
              });
              actionsTaken.push(`Created habit: "${toolCall.arguments.title}"`);
              break;
          }
        } catch (err) {
          console.error(`Failed to execute tool ${toolCall.name}:`, err);
        }
      }
      
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
      
      const syncableItems = extractSyncableItems(message, response);
      let syncSessionId: string | undefined;
      
      if (syncableItems.length > 0) {
        try {
          let session = await storage.getActiveSyncSession(userId);
          
          if (!session) {
            session = await storage.createSyncSession({
              userId,
              status: "processing",
              totalItems: syncableItems.length,
              sourceType: "chat",
            });
          }
          syncSessionId = session.id;
          
          const syncItems = syncableItems.map(item => ({
            sessionId: session!.id,
            itemType: item.itemType,
            title: item.title,
            description: item.description,
            startTime: item.startTime ? item.startTime.toISOString() : undefined,
            endTime: item.endTime ? item.endTime.toISOString() : undefined,
            recurrencePattern: item.recurrencePattern,
            recurrenceGroupKey: item.recurrenceGroupKey,
            dimensionTags: item.dimensionTags,
            rawExtraction: item.rawExtraction,
            status: "pending" as const,
          }));
          
          await storage.createSyncItems(syncItems as any);
          
          const currentItems = await storage.getSyncItems(session.id);
          await storage.updateSyncSession(session.id, {
            status: "awaiting_review",
            totalItems: currentItems.length,
            processedItems: currentItems.length,
          });
        } catch (err) {
          console.error("Failed to create sync items:", err);
        }
      }
      
      res.json({ response: enforceOneQuestion(response), updatedCategories, syncSessionId, actionsTaken });
    } catch (error: any) {
      const errMsg: string = error?.message || String(error);
      // Graceful degradation: show a human-readable message instead of crashing
      if (errMsg.includes("DW_AI_UNAVAILABLE")) {
        return res.json({
          response: "I'm here — just had a brief moment of interrupted thinking. Send that again and I'll pick right up.",
          updatedCategories: [],
          actionsTaken: [],
        });
      }
      const errStatus: number = typeof error?.status === "number" ? error.status : 500;
      console.error("Chat error:", errStatus, errMsg);
      res.status(errStatus >= 400 && errStatus < 600 ? errStatus : 500).json({
        error: errMsg,
        status: errStatus,
      });
    }
  });

  app.post("/api/chat/smart", chatLimiter, async (req, res) => {
    try {
      const { message, conversationHistory, context, userProfile: clientProfile, lifeSystemContext, energyContext, documentIds, cosmicConsent } = req.body;

      if (!message || typeof message !== "string" || message.trim().length === 0) {
        return res.status(400).json({ error: "Message is required" });
      }
      if (message.length > DW_MAX_MESSAGE_CONTENT_LENGTH) {
        return res.status(400).json({ error: `Message is too long (max ${DW_MAX_MESSAGE_CONTENT_LENGTH} characters)` });
      }

      const aiConfig = getAiConfigStatus();
      if (!aiConfig.configured) {
        return res.json({
          response: "I'm having a small moment on my end — nothing to worry about. Take a breath, and whenever you're ready, share what's on your mind. I'm not going anywhere.",
          actionsTaken: [],
        });
      }

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
      
      const [user, goals, habits, profile, wellnessPrefs, todayHabitLogs, moodLogs, scheduleBlocks, calendarEvents, recentJournal, pendingReminders, routines] = await Promise.all([
        storage.getUser(userId),
        storage.getGoals(userId),
        storage.getHabits(userId),
        storage.getUserProfile(userId),
        storage.getWellnessPreferences(userId),
        storage.getTodayHabitLogsByUser(userId),
        storage.getMoodLogs(userId),
        storage.getScheduleBlocks(userId),
        storage.getCalendarEvents(userId),
        storage.getDwJournalEntries(userId, 3),
        storage.getReminders(userId, 'scheduled'),
        storage.getRoutines(userId),
      ]);
      
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const dayOfWeek = today.getDay();

      // Compute which active habits are done today
      const completedHabitIds = new Set(todayHabitLogs.map((l: any) => l.habitId));
      const activeHabits = habits.filter((h: any) => h.isActive);

      // Today's schedule blocks (matching today's day of week)
      const todayScheduleBlocks = scheduleBlocks.filter((b: any) => b.dayOfWeek === dayOfWeek);

      // Today's calendar events
      const todayCalEvents = calendarEvents.filter((e: any) => {
        if (!e.startTime) return false;
        const evDate = new Date(e.startTime).toISOString().split('T')[0];
        return evDate === todayStr;
      });

      // Most recent mood log
      const latestMood = moodLogs.length > 0 ? moodLogs[0] : null;
      
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
        activeGoals: goals.filter((g: any) => g.isActive).map((g: any) => ({ 
          id: g.id,
          title: g.title, 
          progress: g.progress || 0 
        })),
        habits: activeHabits.map((h: any) => ({ 
          id: h.id,
          title: h.title, 
          streak: h.streak || 0,
          frequency: h.frequency,
          completedToday: completedHabitIds.has(h.id),
        })),
        todaySchedule: todayScheduleBlocks.map((b: any) => ({
          title: b.title,
          startTime: b.startTime,
          endTime: b.endTime,
          category: b.category,
        })),
        todayCalendarEvents: todayCalEvents.map((e: any) => ({
          title: e.title,
          startTime: e.startTime,
          description: e.description,
        })),
        currentMood: latestMood ? {
          energyLevel: latestMood.energyLevel,
          moodLevel: latestMood.moodLevel,
          clarityLevel: latestMood.clarityLevel,
          loggedAt: latestMood.createdAt,
        } : null,
        recentJournalEntries: recentJournal.map((j: any) => ({
          content: j.content?.slice(0, 200),
          mood: j.mood,
          createdAt: j.createdAt,
        })),
        pendingReminders: pendingReminders.slice(0, 5).map((r: any) => ({
          title: r.title,
          reminderTime: r.reminderTime,
        })),
        activeRoutines: routines.map((r: any) => ({
          id: r.id,
          name: r.name,
          mode: r.mode,
        })),
        profile: profile || clientProfile || null,
        lifeSystem: lifeSystemContext || null,
        energyContext: energyContext || null,
        cosmicConsent: cosmicConsent && typeof cosmicConsent === "object"
          ? {
              useAstrologyInGuidance: Boolean(cosmicConsent.useAstrologyInGuidance),
              useNumerologyInGuidance: Boolean(cosmicConsent.useNumerologyInGuidance),
            }
          : undefined,
        coachMode: (coachingModeEnum as readonly string[]).includes(user?.coachingMode ?? "")
          ? (user!.coachingMode as CoachingMode)
          : "gentle",
        wellnessPreferences: wellnessPrefs ? {
          beliefSystem: wellnessPrefs.beliefSystem,
          traditions: wellnessPrefs.traditions,
          otherTradition: wellnessPrefs.otherTradition,
          meditationEnabled: wellnessPrefs.meditationEnabled,
          journalEnabled: wellnessPrefs.journalEnabled,
          astrologyEnabled: wellnessPrefs.astrologyEnabled,
          tarotEnabled: wellnessPrefs.tarotEnabled,
          energyWorkEnabled: wellnessPrefs.energyWorkEnabled,
        } : undefined,
      };
      
      // Strip any non-standard roles (e.g. 'insight') that OpenAI rejects
      const safeHistory = (conversationHistory || []).filter(
        (m: any) => m && typeof m.content === "string" && ["user", "assistant"].includes(m.role)
      );

      const result = await detectIntentAndRespond(
        enhancedMessage,
        safeHistory,
        userContext,
        typeof context === "string" && Object.prototype.hasOwnProperty.call(CONTEXT_SYSTEM_OVERRIDES, context)
          ? CONTEXT_SYSTEM_OVERRIDES[context]
          : undefined
      );
      
      // Execute tool calls if any
      const actionsTaken: string[] = [];
      let navigationAction: { path: string; reason: string } | null = null;
      if (result.toolCalls && result.toolCalls.length > 0) {
        for (const toolCall of result.toolCalls) {
          try {
            // Parse arguments if they're a string (defensive)
            const args = typeof toolCall.arguments === 'string' 
              ? JSON.parse(toolCall.arguments) 
              : toolCall.arguments;
            
            if (!args || typeof args !== 'object') {
              console.error(`Invalid tool arguments for ${toolCall.name}:`, toolCall.arguments);
              continue;
            }
            
            switch (toolCall.name) {
              case 'create_schedule_block':
                if (args.title && args.startTime && args.endTime) {
                  await storage.createScheduleBlock({
                    userId,
                    title: args.title,
                    startTime: args.startTime,
                    endTime: args.endTime,
                    dayOfWeek: args.dayOfWeek ?? new Date().getDay(),
                    category: args.category || 'personal',
                  });
                  actionsTaken.push(`Added "${args.title}" to your schedule`);
                }
                break;
              case 'log_mood':
                if (args.energyLevel && args.moodLevel) {
                  await storage.createMoodLog({
                    userId,
                    energyLevel: args.energyLevel,
                    moodLevel: args.moodLevel,
                    clarityLevel: args.clarityLevel,
                    notes: args.notes,
                  });
                  actionsTaken.push(`Logged your mood (energy: ${args.energyLevel}/5, mood: ${args.moodLevel}/5)`);
                }
                break;
              case 'create_goal':
                if (args.title) {
                  await storage.createGoal({
                    userId,
                    title: args.title,
                    description: args.description,
                    wellnessDimension: args.wellnessDimension,
                    isActive: true,
                  });
                  actionsTaken.push(`Created goal: "${args.title}"`);
                }
                break;
              case 'create_habit':
                if (args.title) {
                  await storage.createHabit({
                    userId,
                    title: args.title,
                    description: args.description,
                    frequency: args.frequency || 'daily',
                    reminderTime: args.reminderTime,
                    isActive: true,
                  });
                  actionsTaken.push(`Created habit: "${args.title}"`);
                }
                break;
              case 'create_workout_plan':
                actionsTaken.push(`Generated workout plan based on your preferences`);
                break;
              case 'navigate_to':
                if (args.path) {
                  navigationAction = { path: args.path, reason: args.reason || '' };
                  actionsTaken.push(`Opening ${args.path}${args.reason ? ': ' + args.reason : ''}`);
                }
                break;
              case 'create_journal_entry':
                if (args.content) {
                  const entryTitle = args.content.slice(0, 60) + (args.content.length > 60 ? '…' : '');
                  await storage.createDwJournalEntry({
                    userId,
                    title: entryTitle,
                    story: args.content,
                    tags: args.tags || [],
                  });
                  actionsTaken.push(`Saved journal entry`);
                }
                break;
              case 'log_habit_completion':
                if (args.habitId && args.habitTitle) {
                  const existingLog = await storage.getTodaysHabitLog(args.habitId);
                  if (!existingLog) {
                    await storage.createHabitLog({
                      habitId: args.habitId,
                      userId,
                      notes: args.notes,
                    });
                  }
                  actionsTaken.push(`Marked "${args.habitTitle}" as complete for today`);
                }
                break;
              case 'create_reminder':
                if (args.title && args.reminderTime) {
                  await storage.createReminder({
                    userId,
                    type: 'custom',
                    title: args.title,
                    body: args.notes,
                    scheduledAt: new Date(args.reminderTime),
                    status: 'scheduled',
                  });
                  actionsTaken.push(`Set reminder: "${args.title}"`);
                }
                break;
              case 'create_routine':
                if (args.name) {
                  await storage.createRoutine({
                    userId,
                    name: args.name,
                    mode: args.mode || 'custom',
                    isActive: true,
                  });
                  actionsTaken.push(`Created routine: "${args.name}"`);
                }
                break;
              case 'update_goal_progress':
                if (args.goalId && typeof args.progress === 'number') {
                  await storage.updateGoal(args.goalId, {
                    progress: args.progress,
                  });
                  actionsTaken.push(`Updated progress on "${args.goalTitle}" to ${args.progress}%`);
                }
                break;
            }
          } catch (err) {
            console.error(`Failed to execute tool ${toolCall.name}:`, err);
          }
        }
      }
      
      const syncableItems = extractSyncableItems(message, result.response || "");
      let syncSessionId: string | undefined;
      
      if (syncableItems.length > 0) {
        try {
          let session = await storage.getActiveSyncSession(userId);
          
          if (!session) {
            session = await storage.createSyncSession({
              userId,
              status: "processing",
              totalItems: syncableItems.length,
              sourceType: "chat",
            });
          }
          syncSessionId = session.id;
          
          const syncItems = syncableItems.map(item => ({
            sessionId: session!.id,
            itemType: item.itemType,
            title: item.title,
            description: item.description,
            startTime: item.startTime ? item.startTime.toISOString() : undefined,
            endTime: item.endTime ? item.endTime.toISOString() : undefined,
            recurrencePattern: item.recurrencePattern,
            recurrenceGroupKey: item.recurrenceGroupKey,
            dimensionTags: item.dimensionTags,
            rawExtraction: item.rawExtraction,
            status: "pending" as const,
          }));
          
          await storage.createSyncItems(syncItems as any);
          
          const currentItems = await storage.getSyncItems(session.id);
          await storage.updateSyncSession(session.id, {
            status: "awaiting_review",
            totalItems: currentItems.length,
            processedItems: currentItems.length,
          });
        } catch (err) {
          console.error("Failed to create sync items:", err);
        }
      }
      
      const safeResult = { ...result, response: enforceOneQuestion(result.response) };
      res.json({ ...safeResult, syncSessionId, actionsTaken, navigation: navigationAction });
    } catch (error: any) {
      const errMsg: string = error?.message || String(error);
      const errStatus: number = typeof error?.status === "number" ? error.status : 500;
      console.error("Smart chat error:", errStatus, errMsg);
      return res.status(errStatus >= 400 && errStatus < 600 ? errStatus : 500).json({
        error: errMsg,
        status: errStatus,
      });
    }
  });

  // ── DW Command endpoint ──────────────────────────────────────────────────────
  // Processes a short command/question from the floating widget.
  // Returns a text response plus an optional navigation action.
  app.post("/api/chat/command", chatLimiter, async (req, res) => {
    try {
      const { message } = req.body as { message?: string };
      if (!message || typeof message !== "string" || !message.trim()) {
        return res.status(400).json({ error: "message is required" });
      }

      if (message.length > DW_MAX_MESSAGE_CONTENT_LENGTH) {
        return res.status(400).json({ error: `Message is too long (max ${DW_MAX_MESSAGE_CONTENT_LENGTH} characters)` });
      }

      // Detect Cosmic navigation intent before calling the full AI
      type CosmicTab = "calendar" | "insights" | "astrology" | "numerology";
      const lower = message.toLowerCase();
      let cosmicTab: CosmicTab | null = null;
      if (/\b(calendar|schedule|event)\b/.test(lower) && /\bcosmic\b/.test(lower)) cosmicTab = "calendar";
      else if (/\bastrology\b|\bchart\b|\bplanet\b|\bhoroscope\b|\bzodiac\b/.test(lower)) cosmicTab = "astrology";
      else if (/\bnumerology\b|\blife path\b/.test(lower)) cosmicTab = "numerology";
      else if (/\bcosmic\b/.test(lower)) cosmicTab = "insights";

      const action: { type: "navigate"; path: string; tab?: string } | null = cosmicTab
        ? { type: "navigate", path: `/cosmic?tab=${cosmicTab}`, tab: cosmicTab }
        : null;

      // Generate a brief AI response
      const rawAI = await generateChatResponse(
        message,
        [],
        undefined
      );
      const response = typeof rawAI === "string" ? rawAI : rawAI.content;

      res.json({ response, action });
    } catch (error) {
      console.error("Command chat error:", error);
      res.status(500).json({ error: "Failed to process command" });
    }
  });

  // Streaming chat endpoint for improved performance
  app.post("/api/chat/stream", chatLimiter, async (req, res) => {
    try {
      const { message, conversationHistory, context, userProfile: clientProfile, lifeSystemContext, energyContext, documentIds, cosmicConsent } = req.body;

      if (!message || typeof message !== "string" || message.trim().length === 0) {
        return res.status(400).json({ error: "Message is required" });
      }
      if (message.length > DW_MAX_MESSAGE_CONTENT_LENGTH) {
        return res.status(400).json({ error: `Message is too long (max ${DW_MAX_MESSAGE_CONTENT_LENGTH} characters)` });
      }

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
      
      // Set headers for SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // Fetch enriched user context (same as smart endpoint)
      const [user, goals, habits, profile, wellnessPrefs, todayHabitLogsS, moodLogsS, scheduleBlocksS, calendarEventsS, recentJournalS, pendingRemindersS, routinesS] = await Promise.all([
        storage.getUser(userId),
        storage.getGoals(userId),
        storage.getHabits(userId),
        storage.getUserProfile(userId),
        storage.getWellnessPreferences(userId),
        storage.getTodayHabitLogsByUser(userId),
        storage.getMoodLogs(userId),
        storage.getScheduleBlocks(userId),
        storage.getCalendarEvents(userId),
        storage.getDwJournalEntries(userId, 3),
        storage.getReminders(userId, 'scheduled'),
        storage.getRoutines(userId),
      ]);

      const todayS = new Date();
      const todayStrS = todayS.toISOString().split('T')[0];
      const dayOfWeekS = todayS.getDay();
      const completedHabitIdsS = new Set(todayHabitLogsS.map((l: any) => l.habitId));
      const activeHabitsS = habits.filter((h: any) => h.isActive);
      const todayScheduleBlocksS = scheduleBlocksS.filter((b: any) => b.dayOfWeek === dayOfWeekS);
      const todayCalEventsS = calendarEventsS.filter((e: any) => {
        if (!e.startTime) return false;
        return new Date(e.startTime).toISOString().split('T')[0] === todayStrS;
      });
      const latestMoodS = moodLogsS.length > 0 ? moodLogsS[0] : null;
      
      // Handle document attachments
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
        activeGoals: goals.filter((g: any) => g.isActive).map((g: any) => ({ 
          id: g.id,
          title: g.title, 
          progress: g.progress || 0 
        })),
        habits: activeHabitsS.map((h: any) => ({ 
          id: h.id,
          title: h.title, 
          streak: h.streak || 0,
          frequency: h.frequency,
          completedToday: completedHabitIdsS.has(h.id),
        })),
        todaySchedule: todayScheduleBlocksS.map((b: any) => ({
          title: b.title, startTime: b.startTime, endTime: b.endTime, category: b.category,
        })),
        todayCalendarEvents: todayCalEventsS.map((e: any) => ({
          title: e.title, startTime: e.startTime, description: e.description,
        })),
        currentMood: latestMoodS ? {
          energyLevel: latestMoodS.energyLevel,
          moodLevel: latestMoodS.moodLevel,
          clarityLevel: latestMoodS.clarityLevel,
          loggedAt: latestMoodS.createdAt,
        } : null,
        recentJournalEntries: recentJournalS.map((j: any) => ({
          content: j.content?.slice(0, 200), mood: j.mood, createdAt: j.createdAt,
        })),
        pendingReminders: pendingRemindersS.slice(0, 5).map((r: any) => ({
          title: r.title, reminderTime: r.reminderTime,
        })),
        activeRoutines: routinesS.map((r: any) => ({
          id: r.id, name: r.name, mode: r.mode,
        })),
        profile: profile || clientProfile || null,
        lifeSystem: lifeSystemContext || null,
        energyContext: energyContext || null,
        coachMode: (coachingModeEnum as readonly string[]).includes(user?.coachingMode ?? "")
          ? (user!.coachingMode as CoachingMode)
          : "gentle",
        cosmicConsent: cosmicConsent && typeof cosmicConsent === "object"
          ? {
              useAstrologyInGuidance: Boolean(cosmicConsent.useAstrologyInGuidance),
              useNumerologyInGuidance: Boolean(cosmicConsent.useNumerologyInGuidance),
            }
          : undefined,
        wellnessPreferences: wellnessPrefs ? {
          beliefSystem: wellnessPrefs.beliefSystem,
          traditions: wellnessPrefs.traditions,
          otherTradition: wellnessPrefs.otherTradition,
          meditationEnabled: wellnessPrefs.meditationEnabled,
          journalEnabled: wellnessPrefs.journalEnabled,
          astrologyEnabled: wellnessPrefs.astrologyEnabled,
          tarotEnabled: wellnessPrefs.tarotEnabled,
          energyWorkEnabled: wellnessPrefs.energyWorkEnabled,
        } : undefined,
      };
      
      // Strip any non-standard roles (e.g. 'insight') that OpenAI rejects
      const safeStreamHistory = (conversationHistory || []).filter(
        (m: any) => m && typeof m.content === "string" && ["user", "assistant"].includes(m.role)
      );

      // Use detectIntentAndRespond to get the AI response with streaming support
      const result = await detectIntentAndRespondStreaming(
        enhancedMessage,
        safeStreamHistory,
        userContext,
        res
      );
      
      // Execute tool calls if any (same as smart endpoint)
      const actionsTaken: string[] = [];
      let navigationActionS: { path: string; reason: string } | null = null;
      if (result.toolCalls && result.toolCalls.length > 0) {
        for (const toolCall of result.toolCalls) {
          try {
            const args = typeof toolCall.arguments === 'string' 
              ? JSON.parse(toolCall.arguments) 
              : toolCall.arguments;
            
            if (!args || typeof args !== 'object') {
              console.error(`Invalid tool arguments for ${toolCall.name}:`, toolCall.arguments);
              continue;
            }
            
            switch (toolCall.name) {
              case 'create_schedule_block':
                if (args.title && args.startTime && args.endTime) {
                  await storage.createScheduleBlock({
                    userId,
                    title: args.title,
                    startTime: args.startTime,
                    endTime: args.endTime,
                    dayOfWeek: args.dayOfWeek ?? new Date().getDay(),
                    category: args.category || 'personal',
                  });
                  actionsTaken.push(`Added "${args.title}" to your schedule`);
                }
                break;
              case 'log_mood':
                if (args.energyLevel && args.moodLevel) {
                  await storage.createMoodLog({
                    userId,
                    energyLevel: args.energyLevel,
                    moodLevel: args.moodLevel,
                    clarityLevel: args.clarityLevel,
                    notes: args.notes,
                  });
                  actionsTaken.push(`Logged your mood (energy: ${args.energyLevel}/5, mood: ${args.moodLevel}/5)`);
                }
                break;
              case 'create_goal':
                if (args.title) {
                  await storage.createGoal({
                    userId,
                    title: args.title,
                    description: args.description,
                    wellnessDimension: args.wellnessDimension,
                    isActive: true,
                  });
                  actionsTaken.push(`Created goal: "${args.title}"`);
                }
                break;
              case 'create_habit':
                if (args.title) {
                  await storage.createHabit({
                    userId,
                    title: args.title,
                    description: args.description,
                    frequency: args.frequency || 'daily',
                    reminderTime: args.reminderTime,
                    isActive: true,
                  });
                  actionsTaken.push(`Created habit: "${args.title}"`);
                }
                break;
              case 'create_workout_plan':
                actionsTaken.push(`Generated workout plan based on your preferences`);
                break;
              case 'navigate_to':
                if (args.path) {
                  navigationActionS = { path: args.path, reason: args.reason || '' };
                  actionsTaken.push(`Opening ${args.path}${args.reason ? ': ' + args.reason : ''}`);
                }
                break;
              case 'create_journal_entry':
                if (args.content) {
                  const sEntryTitle = args.content.slice(0, 60) + (args.content.length > 60 ? '…' : '');
                  await storage.createDwJournalEntry({
                    userId,
                    title: sEntryTitle,
                    story: args.content,
                    tags: args.tags || [],
                  });
                  actionsTaken.push(`Saved journal entry`);
                }
                break;
              case 'log_habit_completion':
                if (args.habitId && args.habitTitle) {
                  const existingLog = await storage.getTodaysHabitLog(args.habitId);
                  if (!existingLog) {
                    await storage.createHabitLog({
                      habitId: args.habitId,
                      userId,
                      notes: args.notes,
                    });
                  }
                  actionsTaken.push(`Marked "${args.habitTitle}" as complete for today`);
                }
                break;
              case 'create_reminder':
                if (args.title && args.reminderTime) {
                  await storage.createReminder({
                    userId,
                    type: 'custom',
                    title: args.title,
                    body: args.notes,
                    scheduledAt: new Date(args.reminderTime),
                    status: 'scheduled',
                  });
                  actionsTaken.push(`Set reminder: "${args.title}"`);
                }
                break;
              case 'create_routine':
                if (args.name) {
                  await storage.createRoutine({
                    userId,
                    name: args.name,
                    mode: args.mode || 'custom',
                    isActive: true,
                  });
                  actionsTaken.push(`Created routine: "${args.name}"`);
                }
                break;
              case 'update_goal_progress':
                if (args.goalId && typeof args.progress === 'number') {
                  await storage.updateGoal(args.goalId, {
                    progress: args.progress,
                  });
                  actionsTaken.push(`Updated progress on "${args.goalTitle}" to ${args.progress}%`);
                }
                break;
            }
          } catch (err) {
            console.error(`Failed to execute tool ${toolCall.name}:`, err);
          }
        }
      }
      
      // Handle syncable items (same as smart endpoint)
      const syncableItems = extractSyncableItems(message, result.response || "");
      let syncSessionId: string | undefined;
      
      if (syncableItems.length > 0) {
        try {
          let session = await storage.getActiveSyncSession(userId);
          
          if (!session) {
            session = await storage.createSyncSession({
              userId,
              status: "processing",
              totalItems: syncableItems.length,
              sourceType: "chat",
            });
          }
          syncSessionId = session.id;
          
          const syncItems = syncableItems.map(item => ({
            sessionId: session!.id,
            itemType: item.itemType,
            title: item.title,
            description: item.description,
            startTime: item.startTime ? item.startTime.toISOString() : undefined,
            endTime: item.endTime ? item.endTime.toISOString() : undefined,
            recurrencePattern: item.recurrencePattern,
            recurrenceGroupKey: item.recurrenceGroupKey,
            dimensionTags: item.dimensionTags,
            rawExtraction: item.rawExtraction,
            status: "pending" as const,
          }));
          
          await storage.createSyncItems(syncItems as any);
          
          const currentItems = await storage.getSyncItems(session.id);
          await storage.updateSyncSession(session.id, {
            status: "awaiting_review",
            totalItems: currentItems.length,
            processedItems: currentItems.length,
          });
        } catch (err) {
          console.error("Failed to create sync items:", err);
        }
      }
      
      // Send actions taken and metadata at the end
      if (actionsTaken.length > 0 || syncSessionId || navigationActionS) {
        res.write(`data: ${JSON.stringify({ 
          metadata: { 
            actionsTaken, 
            syncSessionId,
            navigation: navigationActionS,
          } 
        })}\n\n`);
      }
      
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error: any) {
      const errMsg: string = error?.message || String(error);
      const errStatus: number = typeof error?.status === "number" ? error.status : 500;
      console.error("Streaming chat error:", errStatus, errMsg);
      res.write(`data: ${JSON.stringify({ error: errMsg, status: errStatus })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
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

  app.get("/api/proactive/nudges", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const nudges = await generateProactiveNudges(userId);
      res.json(nudges);
    } catch (error) {
      console.error("Error generating proactive nudges:", error);
      res.json([]);
    }
  });

  app.get("/api/proactive/briefing", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const briefing = await generateMorningBriefing(userId);
      res.json(briefing);
    } catch (error) {
      console.error("Error generating morning briefing:", error);
      res.status(500).json({ error: "Failed to generate briefing" });
    }
  });

  // Quick-reply chip suggestions — given a DW message, return 2-3 short user replies
  app.post("/api/ai/chips", requireAuth, async (req, res) => {
    try {
      const { message } = req.body as { message?: string };
      if (!message || message.length < 10) return res.json({ chips: [] });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You generate short quick-reply button text for a wellness AI chat.
Given the assistant's last message, produce 2–3 short replies a user might tap.
Rules:
- Each reply must be 2–7 words max
- Only produce chips if the message asks a question or invites a response
- If the message is purely informational with no question, return []
- Make chips feel natural and personal, not robotic
- Return ONLY a valid JSON array of strings. No explanation, no markdown.
Example: ["Work stress mostly", "It's been everything", "Just need a plan"]`,
          },
          { role: "user", content: message },
        ],
        max_tokens: 80,
        temperature: 0.8,
      });

      const raw = completion.choices[0]?.message?.content?.trim() || "[]";
      let chips: string[] = [];
      try { chips = JSON.parse(raw); } catch { chips = []; }
      res.json({ chips: Array.isArray(chips) ? chips.slice(0, 3) : [] });
    } catch {
      res.json({ chips: [] });
    }
  });

  // Proactive DW opener for returning users — based on today's schedule/habits context
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

  // Calendar Sync Stub - for future Google Calendar integration
  app.get("/api/integrations/calendar/google/status", requireAuth, async (req, res) => {
    res.json({
      connected: false,
      message: "Google Calendar integration coming soon"
    });
  });

  app.post("/api/integrations/calendar/google/connect", requireAuth, async (req, res) => {
    res.status(501).json({
      error: "Not implemented",
      message: "Google Calendar sync will be available in a future update"
    });
  });

  // Voice Query Stubs - for future voice integration
  app.post("/api/voice/query", requireAuth, async (req, res) => {
    res.status(501).json({
      error: "Not implemented",
      message: "Voice query support coming in Phase 2"
    });
  });

  app.post("/api/voice/response", requireAuth, async (req, res) => {
    res.status(501).json({
      error: "Not implemented",
      message: "Voice response support coming in Phase 2"
    });
  });

  app.get("/api/goals", requireAuth, async (req, res) => {
    const goals = await storage.getGoals(req.session.userId!);
    res.json(goals);
  });

  app.post("/api/goals", requireAuth, async (req, res) => {
    try {
      const { title, description, userId: _userId, id: _id, createdAt: _createdAt, ...rest } = req.body;
      if (!title || typeof title !== "string" || title.trim().length === 0) {
        return res.status(400).json({ error: "Goal title is required" });
      }
      const trimmedTitle = title.trim();
      if (trimmedTitle.length > 200) {
        return res.status(400).json({ error: "Goal title is too long (max 200 characters)" });
      }
      if (description !== undefined && description !== null) {
        if (typeof description !== "string") {
          return res.status(400).json({ error: "Goal description must be a string or null" });
        }
        if (description.length > 1000) {
          return res.status(400).json({ error: "Goal description is too long (max 1000 characters)" });
        }
      }
      // Strip client-supplied server-owned fields before inserting
      const goal = await storage.createGoal({
        ...rest,
        userId: req.session.userId!,
        title: trimmedTitle,
        description,
      });
      res.json(goal);
    } catch (error) {
      res.status(500).json({ error: "Failed to create goal" });
    }
  });

  app.patch("/api/goals/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getGoal(req.params.id);
      if (!existing || existing.userId !== req.session.userId) {
        return res.status(404).json({ error: "Goal not found" });
      }
      // Only allow updates to permitted goal fields; disallow changing ownership.
      const updateGoalSchema = insertGoalSchema.omit({ userId: true }).partial();
      const updateData = updateGoalSchema.parse(req.body);
      const goal = await storage.updateGoal(req.params.id, updateData);
      res.json(goal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update goal" });
    }
  });

  app.delete("/api/goals/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getGoal(req.params.id);
      if (!existing || existing.userId !== req.session.userId) {
        return res.status(404).json({ error: "Goal not found" });
      }
      await storage.deleteGoal(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete goal" });
    }
  });

  app.get("/api/habits", requireAuth, async (req, res) => {
    const habits = await storage.getHabits(req.session.userId!);
    // Single batch query instead of N+1
    const todaysLogs = await storage.getTodayHabitLogsByUser(req.session.userId!);
    const completedHabitIds = new Set(todaysLogs.map((l) => l.habitId));
    const habitsWithCompletion = habits.map((habit) => ({
      ...habit,
      completedToday: completedHabitIds.has(habit.id),
    }));
    res.json(habitsWithCompletion);
  });

  app.post("/api/habits", requireAuth, async (req, res) => {
    try {
      const { title, description, userId: _userId, id: _id, createdAt: _createdAt, ...rest } = req.body;
      if (!title || typeof title !== "string" || title.trim().length === 0) {
        return res.status(400).json({ error: "Habit title is required" });
      }
      const trimmedTitle = title.trim();
      if (trimmedTitle.length > 200) {
        return res.status(400).json({ error: "Habit title is too long (max 200 characters)" });
      }
      if (description !== undefined && description !== null) {
        if (typeof description !== "string") {
          return res.status(400).json({ error: "Habit description must be a string or null" });
        }
        if (description.length > 1000) {
          return res.status(400).json({ error: "Habit description is too long (max 1000 characters)" });
        }
      }
      // Strip client-supplied server-owned fields before inserting
      const habit = await storage.createHabit({
        ...rest,
        userId: req.session.userId!,
        title: trimmedTitle,
        description,
      });
      res.json(habit);
    } catch (error) {
      res.status(500).json({ error: "Failed to create habit" });
    }
  });

  app.patch("/api/habits/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getHabit(req.params.id);
      if (!existing || existing.userId !== req.session.userId) {
        return res.status(404).json({ error: "Habit not found" });
      }

      // Strip sensitive/system-managed fields from the update payload
      const { userId: _userId, id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...updateData } = req.body ?? {};

      // Optionally validate title/description if they are being updated
      if (typeof updateData.title !== "undefined") {
        if (
          typeof updateData.title !== "string" ||
          updateData.title.trim().length === 0
        ) {
          return res.status(400).json({ error: "Habit title must be a non-empty string" });
        }
        if (updateData.title.trim().length > 200) {
          return res.status(400).json({ error: "Habit title is too long (max 200 characters)" });
        }
        updateData.title = updateData.title.trim();
      }

      if (typeof updateData.description !== "undefined") {
        if (
          updateData.description !== null &&
          typeof updateData.description !== "string"
        ) {
          return res.status(400).json({ error: "Habit description must be a string or null" });
        }
        if (
          typeof updateData.description === "string" &&
          updateData.description.length > 1000
        ) {
          return res.status(400).json({ error: "Habit description is too long (max 1000 characters)" });
        }
      }

      const habit = await storage.updateHabit(req.params.id, updateData);
      res.json(habit);
    } catch (error) {
      res.status(500).json({ error: "Failed to update habit" });
    }
  });

  app.delete("/api/habits/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getHabit(req.params.id);
      if (!existing || existing.userId !== req.session.userId) {
        return res.status(404).json({ error: "Habit not found" });
      }
      await storage.deleteHabit(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete habit" });
    }
  });

  app.post("/api/habits/:id/log", requireAuth, async (req, res) => {
    try {
      const habit = await storage.getHabit(req.params.id);
      if (!habit || habit.userId !== req.session.userId) {
        return res.status(404).json({ error: "Habit not found" });
      }
      await storage.createHabitLog({ habitId: req.params.id, notes: req.body.notes });
      await storage.updateHabit(req.params.id, { streak: (habit.streak || 0) + 1 });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to log habit" });
    }
  });

  app.post("/api/habits/:id/toggle", requireAuth, async (req, res) => {
    try {
      const habit = await storage.getHabit(req.params.id);
      if (!habit || habit.userId !== req.session.userId) {
        return res.status(404).json({ error: "Habit not found" });
      }
      const todaysLog = await storage.getTodaysHabitLog(req.params.id);
      // If a `completed` boolean is provided in the request body, treat it as an
      // idempotent set operation (the caller controls the desired state).
      // If omitted, fall back to pure toggle semantics based on current server state.
      const requestedCompleted =
        typeof req.body?.completed === "boolean" ? req.body.completed : !todaysLog;
      if (!requestedCompleted) {
        // Uncheck: delete ALL of today's logs to avoid stale duplicates
        await storage.deleteAllTodaysHabitLogs(req.params.id);
        const updated = await storage.getHabit(req.params.id);
        return res.json({ ...updated, completedToday: false });
      } else {
        // Check: only create a log and increment streak if not already completed today
        if (!todaysLog) {
          await storage.createHabitLog({ habitId: req.params.id });
          const newStreak = (habit.streak || 0) + 1;
          const updated = await storage.updateHabit(req.params.id, { streak: newStreak });
          return res.json({ ...updated, completedToday: true });
        }
        // Already completed today — return current state without duplicating
        return res.json({ ...habit, completedToday: true });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to toggle habit" });
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
      const existing = await storage.getScheduleBlock(req.params.id);
      if (!existing || existing.userId !== req.session.userId) {
        return res.status(404).json({ error: "Schedule block not found" });
      }
      // Only allow updates to permitted schedule block fields; disallow changing ownership.
      const updateScheduleSchema = insertScheduleBlockSchema.omit({ userId: true }).partial();
      const updateData = updateScheduleSchema.parse(req.body);
      const block = await storage.updateScheduleBlock(req.params.id, updateData);
      res.json(block);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update schedule block" });
    }
  });

  app.delete("/api/schedule/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getScheduleBlock(req.params.id);
      if (!existing || existing.userId !== req.session.userId) {
        return res.status(404).json({ error: "Schedule block not found" });
      }
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
      const userId = req.session.userId!;
      const action = await storage.getStabilizingAction(req.params.id);
      if (!action) {
        return res.status(404).json({ error: "Action not found" });
      }
      const blueprint = await storage.getWellnessBlueprint(userId);
      if (!blueprint || action.blueprintId !== blueprint.id) {
        return res.status(404).json({ error: "Action not found" });
      }
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
      const userId = req.session.userId!;
      const reflection = await storage.getRecoveryReflection(req.params.id);
      if (!reflection) {
        return res.status(404).json({ error: "Reflection not found" });
      }
      const blueprint = await storage.getWellnessBlueprint(userId);
      if (!blueprint || reflection.blueprintId !== blueprint.id) {
        return res.status(404).json({ error: "Reflection not found" });
      }
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
      const userId = req.session.userId!;
      const routine = await storage.getRoutine(req.params.id);
      if (!routine || routine.userId !== userId) {
        return res.status(404).json({ error: "Routine not found" });
      }
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

  // ── Shared AI limiter for new non-chat AI endpoints ────────────────────────
  const aiContentLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many AI requests. Please slow down and try again shortly." },
  });

  // ── AI Routine Step Generation ─────────────────────────────────────────────
  // Generates personalized routine steps for a given template using the user's
  // profile (fitness goal, energy time, day structure, goals, habits).
  // Falls back to curated defaults if AI is not configured or fails.
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
        model: "gpt-4o",
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
        model: "gpt-4o",
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
      interface ArticleItem { id: string; title: string; synopsis: string; url: string; source: string; readTimeMinutes: number; whySuggested: string; }
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
2. Find 3 real wellness articles from sites like healthline.com, mindbodygreen.com, verywellfit.com, self.com, psychologytoday.com. Use real article URLs.
3. Find 2 real workout videos for ${dayName} ${timeLabel[timeSlot]}.
4. Find 1 real recipe for a ${mealFocus[timeSlot]} from a real recipe site like allrecipes.com, budgetbytes.com, or minimalistbaker.com.

Return ONLY this exact JSON structure, no other text:
{
  "videos": [{"id":"v1","title":"...","description":"...","url":"https://www.youtube.com/watch?v=...","channel":"...","duration":"15 min","category":"yoga"}],
  "articles": [{"id":"a1","title":"...","synopsis":"...","url":"https://...","source":"Healthline","readTimeMinutes":5,"whySuggested":"..."}],
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
                .map((a: any, i: number) => ({ id: `a${i}`, title: String(a.title), synopsis: String(a.synopsis || ""), url: sanitizeUrl(a.url), source: String(a.source || ""), readTimeMinutes: Number(a.readTimeMinutes) || 5, whySuggested: String(a.whySuggested || "") }));
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
          { id: "fa1", title: "How to Build a Sustainable Morning Routine", synopsis: "Science-backed strategies for creating a morning routine that actually sticks and energizes your whole day.", url: "https://www.healthline.com/health/morning-routine", source: "Healthline", readTimeMinutes: 6, whySuggested: "Morning routines are the foundation of a thriving life." },
          { id: "fa2", title: "The Science of Habit Formation", synopsis: "Understand the habit loop and how to rewire your brain for lasting positive change.", url: "https://www.verywellmind.com/what-is-a-habit-2795023", source: "Verywell Mind", readTimeMinutes: 8, whySuggested: "Habits are how DW helps you build the life you want." },
          { id: "fa3", title: "Mindful Eating: How to Listen to Your Body", synopsis: "Practical tips for eating mindfully and developing a healthier relationship with food.", url: "https://www.mindbodygreen.com/food", source: "Mindbodygreen", readTimeMinutes: 5, whySuggested: "Nutrition is one of the 8 dimensions of your wellness." },
        ];
      }

      return res.json({ videos, articles, workouts, meal, timeSlot, dayName, timeLabel: timeLabel[timeSlot] });
    } catch (err) {
      console.error("[browse/for-you] error", err);
      return res.status(500).json({ error: "Failed to load content" });
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
      const userId = req.session.userId!;
      const existing = await storage.getTask(req.params.id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ error: "Task not found" });
      }
      // Only allow updates to permitted task fields; disallow changing ownership.
      const updateTaskSchema = insertTaskSchema.omit({ userId: true }).partial();
      const updateData = updateTaskSchema.parse(req.body);
      const updated = await storage.updateTaskForUser(req.params.id, userId, updateData);

      // Bidirectional sync: propagate completion to a linked elevation plan action
      if (updateData.isCompleted !== undefined && existing.blueprintActionId) {
        try {
          await storage.updateElevationPlanAction(existing.blueprintActionId, userId, {
            isCompleted: updateData.isCompleted,
          });
        } catch {
          // Non-fatal: linked plan action may have been deleted externally
        }
      }

      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getTask(req.params.id);
      if (!existing || existing.userId !== req.session.userId) {
        return res.status(404).json({ error: "Task not found" });
      }
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

  // ─── iCal Feed ────────────────────────────────────────────────────────────────
  // Helpers for signing/verifying tokens so we can give Apple/Google a public URL
  function makeIcalToken(userId: string): string {
    const payload = Buffer.from(userId).toString("base64url");
    const sig = crypto
      .createHmac("sha256", process.env.SESSION_SECRET || "dw-ical-secret")
      .update(payload)
      .digest("base64url")
      .slice(0, 24);
    return `${payload}.${sig}`;
  }

  function verifyIcalToken(token: string): string | null {
    try {
      const [payload, sig] = token.split(".");
      if (!payload || !sig) return null;
      const expected = crypto
        .createHmac("sha256", process.env.SESSION_SECRET || "dw-ical-secret")
        .update(payload)
        .digest("base64url")
        .slice(0, 24);
      if (sig !== expected) return null;
      return Buffer.from(payload, "base64url").toString("utf8");
    } catch {
      return null;
    }
  }

  function escapeIcal(str: string): string {
    return (str || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  }

  function toIcalDate(iso: string): string {
    // Returns UTC date-time string YYYYMMDDTHHMMSSZ
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  }

  // Authenticated endpoint: returns the subscription URL for the current user
  app.get("/api/calendar/ical-token", requireAuth, (req, res) => {
    const token = makeIcalToken(req.session.userId!);
    const base = process.env.APP_BASE_URL || `https://${req.hostname}`;
    res.json({ url: `${base}/api/ical/${token}.ics` });
  });

  // Public endpoint: Apple/Google Calendar subscribes to this URL
  app.get("/api/ical/:token", async (req, res) => {
    const rawToken = req.params.token.replace(/\.ics$/, "");
    const userId = verifyIcalToken(rawToken);
    if (!userId) return res.status(401).send("Invalid or expired calendar token.");

    try {
      const events = await storage.getCalendarEvents(userId);
      const lines: string[] = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Dimensional Wellness AI//Calendar//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:Dimensional Wellness",
        "X-WR-TIMEZONE:UTC",
      ];

      for (const ev of events) {
        const dtStart = toIcalDate(ev.startTime);
        const dtEnd   = toIcalDate(ev.endTime || ev.startTime);
        if (!dtStart) continue;
        lines.push("BEGIN:VEVENT");
        lines.push(`UID:${ev.id}@dimensionalwellnessai.com`);
        lines.push(`DTSTAMP:${toIcalDate(new Date().toISOString())}`);
        lines.push(`DTSTART:${dtStart}`);
        lines.push(`DTEND:${dtEnd}`);
        lines.push(`SUMMARY:${escapeIcal(ev.title)}`);
        if (ev.description) lines.push(`DESCRIPTION:${escapeIcal(ev.description)}`);
        if (ev.eventType)   lines.push(`CATEGORIES:${escapeIcal(ev.eventType)}`);
        lines.push("END:VEVENT");
      }

      lines.push("END:VCALENDAR");

      res.setHeader("Content-Type", "text/calendar; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="dw-calendar.ics"');
      res.setHeader("Cache-Control", "no-cache, no-store");
      res.send(lines.join("\r\n"));
    } catch (error) {
      res.status(500).send("Failed to generate calendar feed.");
    }
  });
  // ─────────────────────────────────────────────────────────────────────────────

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

  // ── Calendar Event Tasks ────────────────────────────────────────────────
  app.get("/api/calendar/:eventId/tasks", requireAuth, async (req, res) => {
    try {
      const tasks = await storage.getEventTasks(req.params.eventId, req.session.userId!);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to load tasks" });
    }
  });

  app.post("/api/calendar/:eventId/tasks", requireAuth, async (req, res) => {
    try {
      const task = await storage.createEventTask({
        calendarEventId: req.params.eventId,
        userId: req.session.userId!,
        title: req.body.title,
        dwSuggested: req.body.dwSuggested ?? false,
        linkedRoute: req.body.linkedRoute ?? null,
      });
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  app.patch("/api/calendar/tasks/:taskId", requireAuth, async (req, res) => {
    try {
      const updated = await storage.updateEventTask(req.params.taskId, req.session.userId!, req.body);
      if (!updated) return res.status(404).json({ error: "Task not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  app.delete("/api/calendar/tasks/:taskId", requireAuth, async (req, res) => {
    try {
      await storage.deleteEventTask(req.params.taskId, req.session.userId!);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  // DW suggests tasks for a calendar event — personalized using user context
  app.post("/api/calendar/:eventId/suggest-tasks", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { title, description, startTime, endTime, dimensionTags, location } = req.body;

      // ── Collect user context in parallel ──────────────────────────────────
      const [onboarding, userGoals, profile, learningsRows] = await Promise.all([
        storage.getOnboardingProfile(userId),
        storage.getGoals(userId),
        storage.getUserProfile(userId),
        db.select().from(aiLearnings).where(eq(aiLearnings.userId, userId)).limit(12),
      ]);

      const activeGoalTitles = userGoals
        .filter((g) => g.isActive)
        .map((g) => g.title)
        .slice(0, 8);

      const learningsSummary = learningsRows
        .map((l) => `${l.topic}: ${JSON.stringify(l.details ?? "")}`)
        .join("; ");

      const lp = (profile?.lifestylePreferences ?? {}) as Record<string, string>;
      const lifestyleCtx = [
        lp.identityVision ? `Who they're becoming / identity vision: ${lp.identityVision}` : "",
        lp.styleLikes ? `Their style / aesthetic: ${lp.styleLikes}` : "",
        lp.watchLikes ? `TV/Movies they enjoy: ${lp.watchLikes}` : "",
        lp.readLikes ? `Reading interests: ${lp.readLikes}` : "",
        lp.doLikes ? `Activities they love: ${lp.doLikes}` : "",
        lp.musicLikes ? `Music/Podcasts they like: ${lp.musicLikes}` : "",
        lp.goLikes ? `Places/experiences they enjoy: ${lp.goLikes}` : "",
        lp.createLikes ? `Creative interests: ${lp.createLikes}` : "",
      ].filter(Boolean).join("\n");

      const userCtx = [
        onboarding?.shortTermGoals ? `Short-term goals: ${onboarding.shortTermGoals}` : "",
        onboarding?.longTermGoals ? `Long-term goals: ${onboarding.longTermGoals}` : "",
        onboarding?.wellnessFocus?.length ? `Wellness focus areas: ${onboarding.wellnessFocus.join(", ")}` : "",
        onboarding?.priorities?.length ? `Priorities: ${onboarding.priorities.join(", ")}` : "",
        activeGoalTitles.length ? `Active goals: ${activeGoalTitles.join(", ")}` : "",
        profile?.fitnessGoal ? `Fitness goal: ${profile.fitnessGoal}` : "",
        profile?.coachingTone ? `Preferred tone: ${profile.coachingTone}` : "",
        lifestyleCtx ? `LIFESTYLE PREFERENCES (use these to be specific):\n${lifestyleCtx}` : "",
        learningsSummary ? `What DW has learned about this person: ${learningsSummary}` : "",
      ].filter(Boolean).join("\n");

      // ── Detect free time / leisure event ──────────────────────────────────
      const freeTimeKeywords = ["free", "relax", "tv", "television", "chill", "leisure", "downtime", "unwind", "rest", "watch", "movie", "read", "hang", "game", "play", "scroll", "browse"];
      const isFreeTime = !title?.trim() || freeTimeKeywords.some((kw) => title.toLowerCase().includes(kw));

      let prompt: string;

      const hasLifestylePrefs = lifestyleCtx.length > 0;
      const identityLens = lp.identityVision ? `This person is actively becoming: ${lp.identityVision}. Every suggestion should feel like it serves that version of them.` : "";
      const styleLens = lp.styleLikes ? `Their style/aesthetic is: ${lp.styleLikes}. Suggestions should feel aligned with this vibe.` : "";

      if (isFreeTime) {
        prompt = `You are DW, a personal AI companion who knows this person more deeply than anyone. They have free/leisure time${startTime ? ` at ${startTime}` : ""}${endTime ? ` until ${endTime}` : ""}${location ? ` in/near ${location}` : ""}.

═══ EVERYTHING YOU KNOW ABOUT THIS PERSON ═══
${userCtx || "Limited context — give diverse, growth-oriented suggestions."}

${identityLens}
${styleLens}
═══════════════════════════════════════════════

${hasLifestylePrefs
  ? `USE THEIR PREFERENCES TO BE EXTREMELY SPECIFIC:
- If they like crime dramas → suggest a specific type of crime drama, not just "watch TV"
- If they're into R&B → suggest a specific mood or artist type, not just "listen to music"  
- If they enjoy coffee shops → suggest going to a cozy spot to work on something specific
- Every suggestion should feel like it was written specifically for this person
- Their identity vision is the filter — does this suggestion serve who they're becoming?`
  : `No specific preferences yet — make suggestions that feel aspirational and growth-oriented for someone building a healthier, more intentional life.`}

Generate 5-6 suggestions for their free time. Each should feel like it was curated specifically for THIS person. Vary the categories. Make some suggestions serve their goals, some serve pure enjoyment — but all should feel right for who they are.

Return ONLY a JSON array. Each object must have:
- "title": specific and personal (max 70 chars) — name real content types, genres, activity types, vibes
- "category": one of "Watch", "Read", "Go", "Do", "Listen", "Create"  
- "why": one short sentence (max 80 chars) — tie it to their identity, goals, or preferences specifically. Never say "This is relaxing" — say WHY it fits THEM.
- "linkedRoute": relevant app route or null (options: /browse, /workout, /insights, /goals, /habits, /talk)

Return only valid JSON, no markdown, no extra text.`;
      } else {
        const timeStr = startTime ? ` at ${startTime}` : "";
        const durationStr = endTime ? ` until ${endTime}` : "";
        const tagStr = dimensionTags?.length ? ` [${dimensionTags.join(", ")}]` : "";
        const locationStr = location ? ` at ${location}` : "";

        prompt = `You are DW, a personal AI companion who knows this person deeply. They have a calendar event: "${title}"${timeStr}${durationStr}${tagStr}${locationStr}.${description ? ` Notes: ${description}` : ""}

═══ WHAT YOU KNOW ABOUT THIS PERSON ═══
${userCtx || "No specific context — suggest practical, actionable steps."}
${identityLens}
${styleLens}
═══════════════════════════════════════

Generate 4-5 specific, actionable tasks for this event. Every task should serve both the event AND who this person is becoming. Reference their goals and style directly — not generic advice anyone would get.

Return ONLY a JSON array. Each object must have:
- "title": task title (max 65 chars) — be specific and practical
- "category": one of "Prepare", "Do", "Track", "Reflect", "Connect"
- "why": one short sentence (max 80 chars) — tie it to their specific goals, identity, or style
- "linkedRoute": relevant app route or null (options: /workout, /insights, /habits, /goals, /talk, /browse, /mood-tracker, /tracking)

Return only valid JSON, no markdown, no extra text.`;
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
        max_tokens: 600,
      });

      const raw = completion.choices[0]?.message?.content?.trim() ?? "[]";
      let suggestions: { title: string; category: string; why: string; linkedRoute: string | null }[] = [];
      try {
        const cleaned = raw.replace(/^```(?:json)?[\s\S]*?\n|```$/gm, "").trim();
        suggestions = JSON.parse(cleaned);
      } catch {
        suggestions = [];
      }

      res.json({ suggestions, isFreeTime, hasLifestylePrefs });
    } catch (error) {
      console.error("suggest-tasks error:", error);
      res.status(500).json({ error: "Failed to generate suggestions" });
    }
  });

  // ── Lifestyle preferences ────────────────────────────────────────────────────
  app.get("/api/profile/lifestyle-preferences", requireAuth, async (req, res) => {
    try {
      const profile = await storage.getUserProfile(req.session.userId!);
      res.json((profile?.lifestylePreferences as Record<string, string>) ?? {});
    } catch {
      res.status(500).json({ error: "Failed to load lifestyle preferences" });
    }
  });

  app.post("/api/profile/lifestyle-preferences", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const prefs = req.body as Record<string, string>;
      const existing = await storage.getUserProfile(userId);
      if (existing) {
        const updated = await storage.updateUserProfile(userId, { lifestylePreferences: prefs });
        res.json(updated?.lifestylePreferences ?? prefs);
      } else {
        const created = await storage.createUserProfile({ userId, lifestylePreferences: prefs });
        res.json(created?.lifestylePreferences ?? prefs);
      }
    } catch {
      res.status(500).json({ error: "Failed to save lifestyle preferences" });
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
    });
    try {
      const body = bodySchema.parse(req.body);
      const { title, scheduledTime, contentUrl, contentType, notes, topic } = body;

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
      const userId = req.session.userId!;
      const existing = await storage.getSystemModule(req.params.id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ error: "System module not found" });
      }
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
      const userId = req.session.userId!;
      const existing = await storage.getScheduleEvent(req.params.id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ error: "Schedule event not found" });
      }
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
        ocrWarning: extracted.ocrWarning,
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
        ocrWarning: extracted.ocrWarning,
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

  // ========== WORKOUT SESSIONS ==========

  app.get("/api/workout-sessions", requireAuth, async (req, res) => {
    try {
      const sessions = await storage.getWorkoutSessions(req.session.userId!);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: "Failed to load workout sessions" });
    }
  });

  app.get("/api/workout-sessions/:id", requireAuth, async (req, res) => {
    try {
      const session = await storage.getWorkoutSession(req.params.id);
      if (!session || session.userId !== req.session.userId) {
        return res.status(404).json({ error: "Workout session not found" });
      }
      const steps = await storage.getWorkoutSessionSteps(req.params.id);
      res.json({ ...session, steps });
    } catch (error) {
      res.status(500).json({ error: "Failed to load workout session" });
    }
  });

  app.post("/api/workout-sessions", requireAuth, async (req, res) => {
    try {
      const schema = z.object({
        title: z.string().min(1).max(200),
        sessionType: z.enum(["strength", "timed", "distance", "breathwork", "mobility", "custom"]).optional(),
        workoutPlanId: z.string().optional().nullable(),
        voiceCoachEnabled: z.boolean().optional(),
        notes: z.string().optional().nullable(),
        metadata: z.record(z.unknown()).optional().nullable(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }
      const session = await storage.createWorkoutSession({
        userId: req.session.userId!,
        ...parsed.data,
      });
      res.status(201).json(session);
    } catch (error) {
      console.error("Create workout session error:", error);
      res.status(500).json({ error: "Failed to create workout session" });
    }
  });

  app.patch("/api/workout-sessions/:id", requireAuth, async (req, res) => {
    try {
      const session = await storage.getWorkoutSession(req.params.id);
      if (!session || session.userId !== req.session.userId) {
        return res.status(404).json({ error: "Workout session not found" });
      }
      const schema = z.object({
        status: z.enum(["in_progress", "completed", "cancelled"]).optional(),
        voiceCoachEnabled: z.boolean().optional(),
        notes: z.string().optional().nullable(),
        durationSeconds: z.number().int().optional().nullable(),
        completedAt: z.string().optional().nullable(),
        metadata: z.record(z.unknown()).optional().nullable(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }
      const updateData: {
        status?: string;
        voiceCoachEnabled?: boolean;
        notes?: string | null;
        durationSeconds?: number | null;
        completedAt?: Date | null;
        metadata?: Record<string, unknown> | null;
      } = {};
      if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
      if (parsed.data.voiceCoachEnabled !== undefined) updateData.voiceCoachEnabled = parsed.data.voiceCoachEnabled;
      if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;
      if (parsed.data.durationSeconds !== undefined) updateData.durationSeconds = parsed.data.durationSeconds;
      if (parsed.data.metadata !== undefined) updateData.metadata = parsed.data.metadata as Record<string, unknown> | null;
      if (parsed.data.completedAt) {
        updateData.completedAt = new Date(parsed.data.completedAt);
      } else if (parsed.data.completedAt === null) {
        updateData.completedAt = null;
      }
      const updated = await storage.updateWorkoutSession(req.params.id, updateData);
      res.json(updated);
    } catch (error) {
      console.error("Update workout session error:", error);
      res.status(500).json({ error: "Failed to update workout session" });
    }
  });

  app.delete("/api/workout-sessions/:id", requireAuth, async (req, res) => {
    try {
      const session = await storage.getWorkoutSession(req.params.id);
      if (!session || session.userId !== req.session.userId) {
        return res.status(404).json({ error: "Workout session not found" });
      }
      await storage.deleteWorkoutSession(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete workout session" });
    }
  });

  // Log / update a single step in a session
  app.put("/api/workout-sessions/:id/steps/:stepIndex", requireAuth, async (req, res) => {
    try {
      const session = await storage.getWorkoutSession(req.params.id);
      if (!session || session.userId !== req.session.userId) {
        return res.status(404).json({ error: "Workout session not found" });
      }
      const stepIndex = parseInt(req.params.stepIndex, 10);
      if (isNaN(stepIndex) || stepIndex < 0) {
        return res.status(400).json({ error: "Invalid step index" });
      }
      const schema = z.object({
        title: z.string().min(1).max(200),
        stepType: z.enum(["strength", "timed", "distance", "breathwork", "mobility", "custom"]),
        completed: z.boolean().optional(),
        setsCompleted: z.number().int().optional().nullable(),
        repsPerSet: z.string().optional().nullable(),
        weightPerSet: z.string().optional().nullable(),
        durationSeconds: z.number().int().optional().nullable(),
        distanceMeters: z.number().optional().nullable(),
        notes: z.string().optional().nullable(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }
      const step = await storage.upsertWorkoutSessionStep({
        sessionId: req.params.id,
        userId: req.session.userId!,
        stepIndex,
        ...parsed.data,
      });
      res.json(step);
    } catch (error) {
      console.error("Log workout step error:", error);
      res.status(500).json({ error: "Failed to log workout step" });
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

      const systemPrompt = `You are an AI that extracts specific, actionable items from wellness conversation content and routes them to the correct destination.

DESTINATION TYPES — choose the most precise one:
- "calendar": A specific one-time or recurring event (meetings, appointments, classes, date-specific plans). Goes to the Calendar.
- "workout": An exercise session, training plan, or physical activity. Goes to Workouts.
- "meal": A specific meal, recipe, or nutrition plan item. Goes to Meal Prep / Nutrition.
- "habit": A recurring behavior to build or maintain (no specific time required). Goes to Habits.
- "goal": A target, achievement, or milestone across any life dimension. Goes to Goals.
- "routine": A multi-step daily flow (morning routine, bedtime routine, wind-down, etc.). Goes to Routines.

Return a JSON object with this structure:
{
  "items": [
    {
      "type": "calendar" | "workout" | "meal" | "habit" | "goal" | "routine",
      "title": "Concise action-oriented title (max 50 chars)",
      "description": "1-2 sentence description (optional)",

      // For calendar events:
      "date": "YYYY-MM-DD" (if specific date mentioned, otherwise omit),
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "isRecurring": true/false,
      "dayOfWeek": 0-6 (0=Sunday, if recurring),

      // For workouts:
      "exerciseType": "strength" | "cardio" | "flexibility" | "hiit" | "other",
      "durationMinutes": number,
      "dayOfWeek": 0-6 (if specific day mentioned),
      "scheduleTime": "HH:MM" (if specific time mentioned),

      // For meals:
      "mealType": "breakfast" | "lunch" | "dinner" | "snack",
      "ingredients": ["ingredient1", "ingredient2"],
      "dayOfWeek": 0-6 (if specific day mentioned),
      "scheduleTime": "HH:MM" (if specific time mentioned),

      // For habits:
      "frequency": "daily" | "weekly" | "monthly",
      "category": "physical" | "mental" | "emotional" | "spiritual" | "social" | "financial" | "productivity",

      // For goals:
      "wellnessDimension": "physical" | "mental" | "emotional" | "spiritual" | "social" | "financial",
      "targetValue": number (if measurable),

      // For routines:
      "scheduleTime": "HH:MM",
      "durationMinutes": number,
      "steps": [{"title": "Step name", "durationMinutes": 5}]
    }
  ]
}

Rules:
- Be specific and contextual: if the message discusses a chest workout, title it "Chest & Triceps Session" not "Workout"
- Match the type precisely to the content — don't use "goal" for something that belongs in "calendar" or "workout"
- If no concrete actionable items are found, return { "items": [] }
- Only extract clear commitments, plans, or things the user said they want to do
- For workouts, capture exercise type and duration if mentioned
- For meals, capture the meal type (breakfast/lunch/dinner) from context`;

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
          } else if (item.type === "calendar") {
            // Direct calendar event
            const now = new Date();
            let startDateTime: Date;
            let endDateTime: Date;

            if (item.date) {
              // Specific date event
              const [year, month, day] = (item.date as string).split("-").map(Number);
              startDateTime = new Date(year, month - 1, day);
              if (item.startTime) {
                const [h, m] = (item.startTime as string).split(":").map(Number);
                startDateTime.setHours(h, m, 0, 0);
              } else {
                startDateTime.setHours(9, 0, 0, 0);
              }
              endDateTime = new Date(startDateTime);
              if (item.endTime) {
                const [h, m] = (item.endTime as string).split(":").map(Number);
                endDateTime.setHours(h, m, 0, 0);
              } else {
                endDateTime.setMinutes(endDateTime.getMinutes() + 60);
              }
            } else if (item.dayOfWeek !== undefined) {
              // Recurring weekly event — find next occurrence
              const currentDayOfWeek = now.getDay();
              const targetDayOfWeek = item.dayOfWeek;
              let daysUntil = targetDayOfWeek - currentDayOfWeek;
              if (daysUntil < 0) daysUntil += 7;
              if (daysUntil === 0 && item.startTime) {
                const [h, m] = (item.startTime as string).split(":").map(Number);
                if (h * 60 + m <= now.getHours() * 60 + now.getMinutes()) daysUntil = 7;
              }
              startDateTime = new Date(now);
              startDateTime.setDate(now.getDate() + daysUntil);
              const [h, m] = ((item.startTime as string) || "09:00").split(":").map(Number);
              startDateTime.setHours(h, m, 0, 0);
              endDateTime = new Date(startDateTime);
              if (item.endTime) {
                const [eh, em] = (item.endTime as string).split(":").map(Number);
                endDateTime.setHours(eh, em, 0, 0);
              } else {
                endDateTime.setMinutes(endDateTime.getMinutes() + 60);
              }
            } else {
              // No date info — schedule for tomorrow at 9am
              startDateTime = new Date(now);
              startDateTime.setDate(now.getDate() + 1);
              startDateTime.setHours(9, 0, 0, 0);
              endDateTime = new Date(startDateTime);
              endDateTime.setHours(10, 0, 0, 0);
            }

            await storage.createCalendarEvent({
              userId,
              title: item.title,
              description: item.description || null,
              startTime: startDateTime.toISOString(),
              endTime: endDateTime.toISOString(),
              eventType: "event",
              isRecurring: !!(item.isRecurring || item.dayOfWeek !== undefined),
              recurrenceRule: (item.isRecurring || item.dayOfWeek !== undefined)
                ? `FREQ=WEEKLY;BYDAY=${['SU','MO','TU','WE','TH','FR','SA'][item.dayOfWeek ?? now.getDay()]}`
                : null,
              linkedType: null,
              linkedId: null,
              linkedRoute: "/calendar",
            });
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

  // Astrology Engine API
  const { calculateBirthChart, getChartSummary } = await import("./astrology");

  app.get("/api/astrology/chart", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const chart = await storage.getBirthChart(userId);
      if (!chart) {
        return res.status(404).json({ error: "No birth chart found" });
      }
      res.json(chart);
    } catch (error) {
      console.error("Get birth chart error:", error);
      res.status(500).json({ error: "Failed to get birth chart" });
    }
  });

  app.post("/api/astrology/chart", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { 
        birthDate, 
        birthTime, 
        birthCity, 
        birthState, 
        birthCountry, 
        timezone,
        latitude,
        longitude,
        daylightSavings = false,
        zodiacSystem = "tropical",
        houseSystem = "placidus"
      } = req.body;

      if (!birthDate || !birthTime || !birthCity || !birthCountry || !timezone) {
        return res.status(400).json({ error: "Missing required birth data" });
      }

      const lat = latitude || 40.7128;
      const lng = longitude || -74.0060;

      const calculatedChart = calculateBirthChart(
        birthDate,
        birthTime,
        lat,
        lng,
        zodiacSystem,
        houseSystem
      );

      const chartData = {
        userId,
        birthDate,
        birthTime,
        birthCity,
        birthState: birthState || null,
        birthCountry,
        timezone,
        daylightSavings,
        zodiacSystem,
        houseSystem,
        placements: calculatedChart.placements,
        aspects: calculatedChart.aspects,
        interpretations: calculatedChart.interpretations,
      };

      const existing = await storage.getBirthChart(userId);
      let chart;
      if (existing) {
        chart = await storage.updateBirthChart(userId, chartData);
      } else {
        chart = await storage.createBirthChart(chartData);
      }

      res.json({
        chart,
        summary: getChartSummary(calculatedChart),
      });
    } catch (error) {
      console.error("Save birth chart error:", error);
      res.status(500).json({ error: "Failed to save birth chart" });
    }
  });

  app.post("/api/astrology/calculate", async (req, res) => {
    try {
      const { 
        birthDate, 
        birthTime, 
        latitude = 40.7128, 
        longitude = -74.0060,
        zodiacSystem = "tropical",
        houseSystem = "placidus"
      } = req.body;

      if (!birthDate || !birthTime) {
        return res.status(400).json({ error: "Birth date and time required" });
      }

      const calculatedChart = calculateBirthChart(
        birthDate,
        birthTime,
        latitude,
        longitude,
        zodiacSystem,
        houseSystem
      );

      res.json({
        ...calculatedChart,
        summary: getChartSummary(calculatedChart),
      });
    } catch (error) {
      console.error("Calculate chart error:", error);
      res.status(500).json({ error: "Failed to calculate chart" });
    }
  });

  // Local Resources Search using Perplexity API
  app.post("/api/local-resources/search", async (req, res) => {
    try {
      const { query } = req.body;
      
      // Validate query
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Search query is required" });
      }
      
      // Limit query length for safety
      const sanitizedQuery = query.trim().slice(0, 200);

      const perplexityApiKey = process.env.PERPLEXITY_API_KEY;
      
      if (!perplexityApiKey) {
        // Fallback to mock data if no API key
        const mockResources = [
          {
            title: "Local Wellness Center",
            description: `Results for "${sanitizedQuery}" - A comprehensive wellness center offering various services to support your health journey.`,
            category: "Wellness",
            rating: 4.5,
            address: "123 Main St",
            aiSuggested: true,
            aiReason: "This matches your search and has great reviews",
          },
          {
            title: "Community Fitness Studio",
            description: "Group classes, personal training, and wellness programs for all fitness levels.",
            category: "Fitness",
            rating: 4.3,
            address: "456 Oak Ave",
          },
          {
            title: "Mindful Living Center",
            description: "Meditation, yoga, and stress management programs in a peaceful environment.",
            category: "Mental Health",
            rating: 4.7,
            address: "789 Peace Blvd",
            aiSuggested: true,
            aiReason: "Highly rated for stress relief and mindfulness",
          },
        ];
        return res.json({ resources: mockResources });
      }

      // Call Perplexity API for web search
      const response = await fetch("https://api.perplexity.ai/chat/completions", { signal: AbortSignal.timeout(25000),
        method: "POST",
        headers: {
          "Authorization": `Bearer ${perplexityApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-sonar-small-128k-online",
          messages: [
            {
              role: "system",
              content: `You are a helpful local resource finder. When the user searches for something, find relevant local businesses, services, or resources. 
              
Return your response as a JSON array with objects containing these fields:
- title: Business/resource name
- description: Brief description of services
- category: Type of business (e.g., "Gym", "Therapist", "Restaurant", "Yoga Studio")
- rating: Numeric rating if available (1-5)
- address: Address if available
- phone: Phone number if available
- website: Website URL if available
- aiSuggested: true if this is a top recommendation
- aiReason: Brief reason why this is recommended (only for aiSuggested items)

Return ONLY the JSON array, no other text. Return 3-5 relevant results.`
            },
            {
              role: "user",
              content: `Find local resources for: ${sanitizedQuery}`
            }
          ],
          temperature: 0.2,
          max_tokens: 1500,
        }),
      });

      if (!response.ok) {
        console.error("Perplexity API error:", response.status, await response.text());
        return res.status(500).json({ error: "Failed to search resources" });
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "[]";
      
      // Try to parse the JSON response
      interface LocalResource {
        title: string;
        description: string;
        category: string;
        rating?: number;
        address?: string;
        phone?: string;
        website?: string;
        aiSuggested: boolean;
        aiReason?: string;
      }
      let resources: LocalResource[] = [];
      try {
        // Clean up the response - remove markdown code blocks if present
        let cleanContent = content.trim();
        if (cleanContent.startsWith("```json")) {
          cleanContent = cleanContent.slice(7);
        }
        if (cleanContent.startsWith("```")) {
          cleanContent = cleanContent.slice(3);
        }
        if (cleanContent.endsWith("```")) {
          cleanContent = cleanContent.slice(0, -3);
        }
        const parsed = JSON.parse(cleanContent.trim());
        // Validate that it's an array and each item has required fields
        if (Array.isArray(parsed)) {
          resources = parsed
            .filter((item: any) => item && typeof item === "object" && item.title && item.description)
            .map((item: any) => ({
              title: String(item.title || "").slice(0, 200),
              description: String(item.description || "").slice(0, 500),
              category: String(item.category || "General").slice(0, 50),
              rating: typeof item.rating === "number" ? Math.min(Math.max(item.rating, 0), 5) : undefined,
              address: item.address ? String(item.address).slice(0, 200) : undefined,
              phone: item.phone ? String(item.phone).slice(0, 30) : undefined,
              website: item.website ? String(item.website).slice(0, 300) : undefined,
              aiSuggested: Boolean(item.aiSuggested),
              aiReason: item.aiReason ? String(item.aiReason).slice(0, 200) : undefined,
            }));
        }
      } catch (parseError) {
        console.error("Failed to parse Perplexity response:", parseError);
        // Return empty array if parsing fails
        resources = [];
      }

      res.json({ 
        resources,
        citations: data.citations || [],
      });
    } catch (error) {
      console.error("Local resources search error:", error);
      res.status(500).json({ error: "Failed to search resources" });
    }
  });

  // ===== ADMIN ANALYTICS ROUTES =====
  
  // Check user role
  app.get("/api/auth/role", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ role: user.role || "user" });
    } catch (error) {
      res.status(500).json({ error: "Failed to get user role" });
    }
  });

  // Helper to compute date ranges
  const getDateRange = (range: string) => {
    const now = new Date();
    const endDate = now.toISOString().split('T')[0];
    let days = 7;
    if (range === '30d') days = 30;
    if (range === '14d') days = 14;
    if (range === '21d') days = 21;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return { range, startDate, endDate, generatedAt: now.toISOString() };
  };

  // Admin metrics - summary
  app.get("/api/admin/metrics/summary", requireAdmin, async (req, res) => {
    try {
      const range = (req.query.range as string) || "7d";
      const dateInfo = getDateRange(range);
      
      const metrics = await storage.getAdminMetricsSummary(range);
      res.json({
        ...dateInfo,
        kpis: {
          dau: metrics.dau || 0,
          wau: metrics.wau || 0,
          mau: metrics.mau || 0,
          activationRate7d: metrics.activationRate7d || 0,
          d1Retention: metrics.d1Retention || 0,
          d7Retention: metrics.d7Retention || 0,
          d7MeaningfulRetention: metrics.d7MeaningfulRetention || 0,
          helpedPositiveRate: metrics.helpedPositiveRate || 0,
          avgCompletionsPerActiveUser: metrics.avgCompletionsPerActiveUser || 0,
          swapRate: metrics.swapRate || 0,
          errorsPerSession: metrics.errorsPerSession || 0,
        },
        counts: {
          sessions: metrics.sessions || 0,
          planGenerated: metrics.planGenerated || 0,
          planSaved: metrics.planSaved || 0,
          planItemCompleted: metrics.planItemCompleted || 0,
          postActionCheckins: metrics.postActionCheckins || 0,
          recommendationsViewed: metrics.recommendationsViewed || 0,
          recommendationsSwapped: metrics.recommendationsSwapped || 0,
          errors: metrics.errors || 0,
        },
      });
    } catch (error) {
      console.error("Admin metrics summary error:", error);
      res.status(500).json({ error: "Failed to get metrics summary" });
    }
  });

  // Admin metrics - funnel
  app.get("/api/admin/metrics/funnel", requireAdmin, async (req, res) => {
    try {
      const range = (req.query.range as string) || "7d";
      const dateInfo = getDateRange(range);
      
      const funnel = await storage.getAdminMetricsFunnel(range);
      res.json({
        ...dateInfo,
        steps: [
          { stepId: "onboarding_started", label: "Onboarding Started", users: funnel.onboardingStarted || 0, conversionFromPrev: null },
          { stepId: "onboarding_completed", label: "Onboarding Completed", users: funnel.onboardingCompleted || 0, conversionFromPrev: funnel.onboardingStarted ? (funnel.onboardingCompleted / funnel.onboardingStarted) : 0 },
          { stepId: "plan_generated", label: "Plan Generated", users: funnel.planGenerated || 0, conversionFromPrev: funnel.onboardingCompleted ? (funnel.planGenerated / funnel.onboardingCompleted) : 0 },
          { stepId: "plan_saved", label: "Plan Saved", users: funnel.planSaved || 0, conversionFromPrev: funnel.planGenerated ? (funnel.planSaved / funnel.planGenerated) : 0 },
          { stepId: "plan_item_completed", label: "Plan Item Completed", users: funnel.planItemCompleted || 0, conversionFromPrev: funnel.planSaved ? (funnel.planItemCompleted / funnel.planSaved) : 0 },
          { stepId: "post_action_checkin", label: "Post-action Check-in", users: funnel.postActionCheckin || 0, conversionFromPrev: funnel.planItemCompleted ? (funnel.postActionCheckin / funnel.planItemCompleted) : 0 },
        ],
      });
    } catch (error) {
      console.error("Admin metrics funnel error:", error);
      res.status(500).json({ error: "Failed to get funnel metrics" });
    }
  });

  // Admin metrics - switches
  app.get("/api/admin/metrics/switches", requireAdmin, async (req, res) => {
    try {
      const range = (req.query.range as string) || "7d";
      const dateInfo = getDateRange(range);
      
      const switchIds = ["body", "mind", "time", "purpose", "money", "relationships", "environment", "identity"];
      const switchData = await storage.getAdminMetricsSwitches(range);
      
      const switches = switchIds.map(switchId => {
        const data = switchData[switchId] || {};
        return {
          switchId,
          detailViews: data.detailViews || 0,
          plansGenerated: data.plansGenerated || 0,
          plansSaved: data.plansSaved || 0,
          itemsCompleted: data.itemsCompleted || 0,
          helped: {
            yes: data.helpedYes || 0,
            some: data.helpedSome || 0,
            no: data.helpedNo || 0,
            positiveRate: data.helpedTotal ? ((data.helpedYes + data.helpedSome) / data.helpedTotal) : 0,
          },
        };
      });
      
      const totals = switches.reduce((acc, s) => ({
        detailViews: acc.detailViews + s.detailViews,
        plansGenerated: acc.plansGenerated + s.plansGenerated,
        plansSaved: acc.plansSaved + s.plansSaved,
        itemsCompleted: acc.itemsCompleted + s.itemsCompleted,
      }), { detailViews: 0, plansGenerated: 0, plansSaved: 0, itemsCompleted: 0 });
      
      res.json({ ...dateInfo, switches, totals });
    } catch (error) {
      console.error("Admin metrics switches error:", error);
      res.status(500).json({ error: "Failed to get switch metrics" });
    }
  });

  // Admin metrics - recommendations
  app.get("/api/admin/metrics/recommendations", requireAdmin, async (req, res) => {
    try {
      const range = (req.query.range as string) || "7d";
      const dateInfo = getDateRange(range);
      
      const recData = await storage.getAdminMetricsRecommendations(range);
      res.json({
        ...dateInfo,
        recommendations: {
          viewed: recData.viewed || 0,
          swapped: recData.swapped || 0,
          accepted: recData.accepted || 0,
          completedWithin24h: recData.completedWithin24h || 0,
          swapRate: recData.viewed ? (recData.swapped / recData.viewed) : 0,
          acceptRate: recData.viewed ? (recData.accepted / recData.viewed) : 0,
          completion24hRate: recData.accepted ? (recData.completedWithin24h / recData.accepted) : 0,
        },
        byReason: recData.byReason || [],
        bySwitch: recData.bySwitch || [],
      });
    } catch (error) {
      console.error("Admin metrics recommendations error:", error);
      res.status(500).json({ error: "Failed to get recommendation metrics" });
    }
  });

  // Admin metrics - timeband
  app.get("/api/admin/metrics/timeband", requireAdmin, async (req, res) => {
    try {
      const range = (req.query.range as string) || "7d";
      const dateInfo = getDateRange(range);
      
      const tbData = await storage.getAdminMetricsTimeband(range);
      res.json({
        ...dateInfo,
        timeBandDistribution: {
          tiny: tbData.distribution?.tiny || 0,
          small: tbData.distribution?.small || 0,
          medium: tbData.distribution?.medium || 0,
          large: tbData.distribution?.large || 0,
        },
        modeDistribution: {
          restoring: tbData.modeDistribution?.restoring || 0,
          training: tbData.modeDistribution?.training || 0,
          maintaining: tbData.modeDistribution?.maintaining || 0,
        },
        helpedByTimeBand: tbData.helpedByTimeBand || [],
        helpedByMode: tbData.helpedByMode || [],
        completionByTimeBand: tbData.completionByTimeBand || [],
      });
    } catch (error) {
      console.error("Admin metrics timeband error:", error);
      res.status(500).json({ error: "Failed to get timeband metrics" });
    }
  });

  // Admin metrics - flags
  app.get("/api/admin/metrics/flags", requireAdmin, async (req, res) => {
    try {
      const range = (req.query.range as string) || "14d";
      const dateInfo = getDateRange(range);
      
      const flagData = await storage.getAdminMetricsFlags(range);
      res.json({
        ...dateInfo,
        topFlags: flagData.topFlags || [],
        flagToOutcome: flagData.flagToOutcome || [],
      });
    } catch (error) {
      console.error("Admin metrics flags error:", error);
      res.status(500).json({ error: "Failed to get flag metrics" });
    }
  });

  // Admin metrics - errors
  app.get("/api/admin/metrics/errors", requireAdmin, async (req, res) => {
    try {
      const range = (req.query.range as string) || "7d";
      const dateInfo = getDateRange(range);
      
      const errorData = await storage.getAdminMetricsErrors(range);
      res.json({
        ...dateInfo,
        errorsPerSession: errorData.errorsPerSession || 0,
        topErrorCodes: errorData.topErrorCodes || [],
        topScreens: errorData.topScreens || [],
      });
    } catch (error) {
      console.error("Admin metrics errors error:", error);
      res.status(500).json({ error: "Failed to get error metrics" });
    }
  });

  // Legacy admin analytics endpoint
  app.get("/api/admin/analytics", requireAdmin, async (req, res) => {
    try {
      const analytics = await storage.getAdminAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Admin analytics error:", error);
      res.status(500).json({ error: "Failed to get analytics" });
    }
  });

  // ===== USER PROGRESS ROUTES =====

  // User progress - summary
  app.get("/api/progress/summary", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const range = (req.query.range as string) || "14d";
      const dateInfo = getDateRange(range);
      
      const summary = await storage.getUserProgressSummary(userId, range);
      res.json({
        ...dateInfo,
        snapshot: {
          energyLevel: summary.energyLevel || "medium",
          stressLevel: summary.stressLevel || "medium",
          timeBand: summary.timeBand || "small",
          consistencyDays14d: summary.consistencyDays || 0,
        },
        wins: {
          actionsCompleted: summary.actionsCompleted || 0,
          bestDay: summary.bestDay || null,
          helped: {
            yes: summary.helpedYes || 0,
            some: summary.helpedSome || 0,
            no: summary.helpedNo || 0,
          },
        },
      });
    } catch (error) {
      console.error("User progress summary error:", error);
      res.status(500).json({ error: "Failed to get progress summary" });
    }
  });

  // User progress - switches
  app.get("/api/progress/switches", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const range = (req.query.range as string) || "21d";
      const dateInfo = getDateRange(range);
      
      const switches = await storage.getUserProgressSwitches(userId, range);
      res.json({
        ...dateInfo,
        switches: switches.map(s => ({
          switchId: s.switchId,
          status: s.status || "off",
          lastTrainedAt: s.lastTrainedAt || null,
          completedCount21d: s.completedCount || 0,
        })),
      });
    } catch (error) {
      console.error("User progress switches error:", error);
      res.status(500).json({ error: "Failed to get switch progress" });
    }
  });

  // User progress - patterns
  app.get("/api/progress/patterns", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const range = (req.query.range as string) || "14d";
      const dateInfo = getDateRange(range);
      
      const patterns = await storage.getUserProgressPatterns(userId, range);
      const friendlyLabels: Record<string, string> = {
        overwhelm: "Felt overwhelmed",
        timeChaos: "Days felt scattered",
        lowEnergy: "Energy dips",
        moneyStress: "Financial pressure",
        relationshipDrain: "People felt draining",
        envMess: "Space caused friction",
        lowMotivation: "Low motivation",
        sleepDebt: "Sleep debt",
      };
      
      res.json({
        ...dateInfo,
        patterns: patterns.map(p => ({
          label: friendlyLabels[p.flagKey] || p.flagKey,
          count: p.count,
        })),
      });
    } catch (error) {
      console.error("User progress patterns error:", error);
      res.status(500).json({ error: "Failed to get patterns" });
    }
  });

  // User recommendation - today
  app.get("/api/recommendation/today", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const recommendation = await storage.getUserRecommendationToday(userId);
      
      res.json({
        generatedAt: new Date().toISOString(),
        recommendedSwitchId: recommendation.switchId || "time",
        alternativeSwitchId: recommendation.alternativeId || "mind",
        timeBand: recommendation.timeBand || "tiny",
        mode: recommendation.mode || "training",
        title: recommendation.title || "Quick Training (10 min)",
        reasonLine: recommendation.reason || "Start with what feels manageable today.",
        primaryAction: { label: "Start", action: "START_PLAN" },
        secondaryAction: { label: "Save for Later", action: "SAVE_PLAN" },
      });
    } catch (error) {
      console.error("User recommendation error:", error);
      res.status(500).json({ error: "Failed to get recommendation" });
    }
  });

  // Legacy user progress endpoint
  app.get("/api/user/progress", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const progress = await storage.getUserProgress(userId);
      res.json(progress);
    } catch (error) {
      console.error("User progress error:", error);
      res.status(500).json({ error: "Failed to get progress" });
    }
  });

  // Wearable Device Integration Endpoints
  app.get("/api/wearables/devices", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const devices = await storage.getWearableDevices(userId);
      res.json(devices);
    } catch (error) {
      console.error("Wearable devices error:", error);
      res.status(500).json({ error: "Failed to get wearable devices" });
    }
  });

  app.post("/api/wearables/devices", requireAuth, async (req, res) => {
    try {
      const data = insertWearableDeviceSchema.parse({ 
        ...req.body, 
        userId: req.session.userId! 
      });
      const device = await storage.createWearableDevice(data);
      res.json(device);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create wearable device error:", error);
      res.status(500).json({ error: "Failed to create wearable device" });
    }
  });

  app.post("/api/wearables/sync", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const data = insertWearableDataSchema.parse({ 
        ...req.body, 
        userId 
      });
      
      // Save wearable data
      const wearableData = await storage.createWearableData(data);
      
      // Detect mood from biometric data
      let detectedMood = data.detectedMood;
      if (!detectedMood && data.heartRate && data.stressLevel) {
        detectedMood = detectMoodFromBiometrics(data.heartRate, data.stressLevel, data.hrvScore);
      }
      
      // Update the wearable data with detected mood
      if (detectedMood && !data.detectedMood) {
        await storage.updateWearableData(wearableData.id, { detectedMood });
      }
      
      // Update device last synced time
      await storage.updateWearableDevice(data.deviceId, { 
        lastSyncedAt: new Date() 
      });
      
      res.json({ 
        success: true, 
        data: { ...wearableData, detectedMood },
        detectedMood 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Wearable sync error:", error);
      res.status(500).json({ error: "Failed to sync wearable data" });
    }
  });

  app.get("/api/wearables/data", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const data = await storage.getWearableData(userId, limit);
      res.json(data);
    } catch (error) {
      console.error("Wearable data error:", error);
      res.status(500).json({ error: "Failed to get wearable data" });
    }
  });

  app.get("/api/wearables/latest-mood", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const latestData = await storage.getLatestWearableData(userId);
      
      if (!latestData || !latestData.detectedMood) {
        return res.json({ mood: null });
      }
      
      res.json({ 
        mood: latestData.detectedMood,
        timestamp: latestData.timestamp,
        heartRate: latestData.heartRate,
        stressLevel: latestData.stressLevel,
      });
    } catch (error) {
      console.error("Latest mood error:", error);
      res.status(500).json({ error: "Failed to get latest mood" });
    }
  });

  // Astrology Predictions Endpoints
  app.get("/api/astrology/predictions", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date();
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      const predictions = await storage.getAstrologyPredictions(userId, startDate, endDate);
      res.json(predictions);
    } catch (error) {
      console.error("Astrology predictions error:", error);
      res.status(500).json({ error: "Failed to get astrology predictions" });
    }
  });

  app.post("/api/astrology/predictions", requireAuth, async (req, res) => {
    try {
      const data = insertAstrologyPredictionSchema.parse({
        ...req.body,
        userId: req.session.userId!,
      });
      const prediction = await storage.createAstrologyPrediction(data);
      res.json(prediction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create astrology prediction error:", error);
      res.status(500).json({ error: "Failed to create astrology prediction" });
    }
  });

  // ========================================
  // DW.AI PHASE 1 - NEW API ENDPOINTS
  // ========================================

  // Dimension Blueprints
  app.get("/api/dimension-blueprints", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const dimension = req.query.dimension as string | undefined;
      const blueprints = await storage.getDimensionBlueprints(userId, dimension);
      res.json(blueprints);
    } catch (error) {
      console.error("Get dimension blueprints error:", error);
      res.status(500).json({ error: "Failed to get dimension blueprints" });
    }
  });

  app.post("/api/dimension-blueprints", requireAuth, async (req, res) => {
    try {
      const data = insertDimensionBlueprintSchema.parse({
        ...req.body,
        userId: req.session.userId!,
      });
      const blueprint = await storage.createDimensionBlueprint(data);
      res.json(blueprint);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create dimension blueprint error:", error);
      res.status(500).json({ error: "Failed to create dimension blueprint" });
    }
  });

  app.patch("/api/dimension-blueprints/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const existing = await storage.getDimensionBlueprint(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ error: "Dimension blueprint not found" });
      }
      const blueprint = await storage.updateDimensionBlueprint(id, req.body);
      if (!blueprint) {
        return res.status(404).json({ error: "Dimension blueprint not found" });
      }
      res.json(blueprint);
    } catch (error) {
      console.error("Update dimension blueprint error:", error);
      res.status(500).json({ error: "Failed to update dimension blueprint" });
    }
  });

  // Reset Protocol
  app.get("/api/reset-protocol", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const protocol = await storage.getResetProtocol(userId);
      res.json(protocol || {});
    } catch (error) {
      console.error("Get reset protocol error:", error);
      res.status(500).json({ error: "Failed to get reset protocol" });
    }
  });

  app.post("/api/reset-protocol", requireAuth, async (req, res) => {
    try {
      const data = insertResetProtocolSchema.parse({
        ...req.body,
        userId: req.session.userId!,
      });
      const protocol = await storage.createResetProtocol(data);
      res.json(protocol);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create reset protocol error:", error);
      res.status(500).json({ error: "Failed to create reset protocol" });
    }
  });

  app.patch("/api/reset-protocol/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const existing = await storage.getResetProtocolById(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ error: "Reset protocol not found" });
      }
      const protocol = await storage.updateResetProtocol(id, req.body);
      if (!protocol) {
        return res.status(404).json({ error: "Reset protocol not found" });
      }
      res.json(protocol);
    } catch (error) {
      console.error("Update reset protocol error:", error);
      res.status(500).json({ error: "Failed to update reset protocol" });
    }
  });

  // User Patterns
  app.get("/api/patterns", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;
      const patterns = await storage.getUserPatterns(userId, isActive);
      res.json(patterns);
    } catch (error) {
      console.error("Get user patterns error:", error);
      res.status(500).json({ error: "Failed to get user patterns" });
    }
  });

  app.post("/api/patterns", requireAuth, async (req, res) => {
    try {
      const data = insertUserPatternSchema.parse({
        ...req.body,
        userId: req.session.userId!,
      });
      const pattern = await storage.createUserPattern(data);
      res.json(pattern);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create user pattern error:", error);
      res.status(500).json({ error: "Failed to create user pattern" });
    }
  });

  // Tracking Logs
  app.get("/api/tracking-logs", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const trackingType = req.query.trackingType as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const logs = await storage.getTrackingLogs(userId, trackingType, limit);
      res.json(logs);
    } catch (error) {
      console.error("Get tracking logs error:", error);
      res.status(500).json({ error: "Failed to get tracking logs" });
    }
  });

  app.post("/api/tracking-logs", requireAuth, async (req, res) => {
    try {
      const data = insertTrackingLogSchema.parse({
        ...req.body,
        userId: req.session.userId!,
      });
      const log = await storage.createTrackingLog(data);
      res.json(log);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create tracking log error:", error);
      res.status(500).json({ error: "Failed to create tracking log" });
    }
  });

  // Meal Logs
  app.get("/api/meal-logs", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const logs = await storage.getMealLogs(userId, limit);
      res.json(logs);
    } catch (error) {
      console.error("Get meal logs error:", error);
      res.status(500).json({ error: "Failed to get meal logs" });
    }
  });

  app.post("/api/meal-logs", requireAuth, async (req, res) => {
    try {
      const data = insertMealLogSchema.parse({
        ...req.body,
        userId: req.session.userId!,
      });
      const log = await storage.createMealLog(data);
      res.json(log);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create meal log error:", error);
      res.status(500).json({ error: "Failed to create meal log" });
    }
  });

  // Water Logs
  app.get("/api/water-logs", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const logs = await storage.getWaterLogs(userId, limit);
      res.json(logs);
    } catch (error) {
      console.error("Get water logs error:", error);
      res.status(500).json({ error: "Failed to get water logs" });
    }
  });

  app.post("/api/water-logs", requireAuth, async (req, res) => {
    try {
      const data = insertWaterLogSchema.parse({
        ...req.body,
        userId: req.session.userId!,
      });
      const log = await storage.createWaterLog(data);
      res.json(log);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create water log error:", error);
      res.status(500).json({ error: "Failed to create water log" });
    }
  });

  // Universal Plans
  app.get("/api/universal-plans", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const planType = req.query.planType as string | undefined;
      const plans = await storage.getUniversalPlans(userId, planType);
      res.json(plans);
    } catch (error) {
      console.error("Get universal plans error:", error);
      res.status(500).json({ error: "Failed to get universal plans" });
    }
  });

  app.post("/api/universal-plans", requireAuth, async (req, res) => {
    try {
      const data = insertUniversalPlanSchema.parse({
        ...req.body,
        userId: req.session.userId!,
      });
      const plan = await storage.createUniversalPlan(data);
      res.json(plan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create universal plan error:", error);
      res.status(500).json({ error: "Failed to create universal plan" });
    }
  });

  app.patch("/api/universal-plans/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const existing = await storage.getUniversalPlan(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ error: "Universal plan not found" });
      }
      const plan = await storage.updateUniversalPlan(id, req.body);
      if (!plan) {
        return res.status(404).json({ error: "Universal plan not found" });
      }
      res.json(plan);
    } catch (error) {
      console.error("Update universal plan error:", error);
      res.status(500).json({ error: "Failed to update universal plan" });
    }
  });

  // Completion Status
  app.get("/api/completion-status", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      let status = await storage.getCompletionStatus(userId);
      
      // If no status exists, create a default one
      if (!status) {
        status = await storage.createCompletionStatus({
          userId,
          bodyScanCompleted: false,
          mealPreferencesCompleted: false,
          blueprintCompletions: {},
          resetProtocolCompleted: false,
          onboardingCompleted: false,
        });
      }
      
      res.json(status);
    } catch (error) {
      console.error("Get completion status error:", error);
      res.status(500).json({ error: "Failed to get completion status" });
    }
  });

  app.post("/api/completion-status", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const existing = await storage.getCompletionStatus(userId);
      
      if (existing) {
        // Update existing
        const updated = await storage.updateCompletionStatus(userId, req.body);
        res.json(updated);
      } else {
        // Create new
        const data = insertCompletionStatusSchema.parse({
          ...req.body,
          userId,
        });
        const status = await storage.createCompletionStatus(data);
        res.json(status);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create/update completion status error:", error);
      res.status(500).json({ error: "Failed to save completion status" });
    }
  });

  // Analyze Meal Photo (placeholder for AI vision integration)
  app.post("/api/analyze-meal-photo", requireAuth, async (req, res) => {
    try {
      const { photoUrl } = req.body;
      
      if (!photoUrl) {
        return res.status(400).json({ error: "Photo URL is required" });
      }

      // Placeholder for AI vision analysis
      // In a real implementation, this would use Google Vision API or OpenAI Vision
      const analysis = {
        items: ["Food item detected"],
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        confidence: 0,
        aiAnalysis: "Meal photo analysis not yet implemented. Please enter nutrition information manually.",
      };
      
      res.json(analysis);
    } catch (error) {
      console.error("Analyze meal photo error:", error);
      res.status(500).json({ error: "Failed to analyze meal photo" });
    }
  });

  // Achievements endpoints
  app.get("/api/achievements", requireAuth, async (req, res) => {
    try {
      const achievements = await storage.getAchievements(req.user!.id);
      res.json(achievements);
    } catch (error) {
      console.error("Get achievements error:", error);
      res.status(500).json({ error: "Failed to fetch achievements" });
    }
  });

  app.post("/api/achievements", requireAuth, async (req, res) => {
    try {
      const achievement = await storage.createAchievement({
        userId: req.user!.id,
        ...req.body,
      });
      res.json(achievement);
    } catch (error) {
      console.error("Create achievement error:", error);
      res.status(500).json({ error: "Failed to create achievement" });
    }
  });

  // Streaks endpoints
  app.get("/api/streaks", requireAuth, async (req, res) => {
    try {
      const { streakType } = req.query;
      const streaks = await storage.getStreaks(
        req.user!.id,
        streakType as string | undefined
      );
      res.json(streaks);
    } catch (error) {
      console.error("Get streaks error:", error);
      res.status(500).json({ error: "Failed to fetch streaks" });
    }
  });

  app.post("/api/streaks", requireAuth, async (req, res) => {
    try {
      const streak = await storage.createStreak({
        userId: req.user!.id,
        ...req.body,
      });
      res.json(streak);
    } catch (error) {
      console.error("Create streak error:", error);
      res.status(500).json({ error: "Failed to create streak" });
    }
  });

  app.patch("/api/streaks/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const existing = await storage.getStreak(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ error: "Streak not found" });
      }
      const streak = await storage.updateStreak(id, req.body);
      
      if (!streak) {
        return res.status(404).json({ error: "Streak not found" });
      }
      
      res.json(streak);
    } catch (error) {
      console.error("Update streak error:", error);
      res.status(500).json({ error: "Failed to update streak" });
    }
  });

  // Accountability tracking routes
  app.post("/api/accountability/commit", requireAuth, async (req, res) => {
    try {
      const {
        taskId,
        calendarEventId,
        taskName,
        scheduledTime,
        scheduledEndTime,
        commitmentResponse
      } = req.body;

      if (!taskName || !scheduledTime || !commitmentResponse) {
        return res.status(400).json({ 
          error: "Missing required fields: taskName, scheduledTime, commitmentResponse" 
        });
      }

      if (!['yes', 'remind_later', 'skip'].includes(commitmentResponse)) {
        return res.status(400).json({ 
          error: "Invalid commitmentResponse. Must be 'yes', 'remind_later', or 'skip'" 
        });
      }

      const record = await accountability.recordCommitment(
        req.session.userId!,
        taskId || null,
        calendarEventId || null,
        taskName,
        new Date(scheduledTime),
        scheduledEndTime ? new Date(scheduledEndTime) : null,
        commitmentResponse
      );

      res.json(record);
    } catch (error) {
      console.error("Record commitment error:", error);
      res.status(500).json({ error: "Failed to record commitment" });
    }
  });

  app.post("/api/accountability/complete", requireAuth, async (req, res) => {
    try {
      const {
        taskId,
        calendarEventId,
        completionStatus,
        reflectionNote
      } = req.body;

      if (!completionStatus) {
        return res.status(400).json({ 
          error: "Missing required field: completionStatus" 
        });
      }

      if (!['completed', 'partial', 'skipped', 'no_response'].includes(completionStatus)) {
        return res.status(400).json({ 
          error: "Invalid completionStatus" 
        });
      }

      const record = await accountability.recordCompletion(
        req.session.userId!,
        taskId || null,
        calendarEventId || null,
        completionStatus,
        reflectionNote
      );

      res.json(record);
    } catch (error) {
      console.error("Record completion error:", error);
      res.status(500).json({ error: "Failed to record completion" });
    }
  });

  app.get("/api/accountability/stats", requireAuth, async (req, res) => {
    try {
      const stats = await accountability.getAccountabilityStats(req.session.userId!);
      res.json(stats);
    } catch (error) {
      console.error("Get accountability stats error:", error);
      res.status(500).json({ error: "Failed to get stats" });
    }
  });

  app.get("/api/accountability/records", requireAuth, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const records = await accountability.getAccountabilityRecords(
        req.session.userId!,
        start,
        end
      );

      res.json(records);
    } catch (error) {
      console.error("Get accountability records error:", error);
      res.status(500).json({ error: "Failed to get records" });
    }
  });

  app.get("/api/accountability/today", requireAuth, async (req, res) => {
    try {
      const summary = await accountability.getTodayAccountabilitySummary(req.session.userId!);
      res.json(summary);
    } catch (error) {
      console.error("Get today's accountability error:", error);
      res.status(500).json({ error: "Failed to get today's summary" });
    }
  });

  app.get("/api/accountability/synopsis", requireAuth, async (req, res) => {
    try {
      const synopsis = await accountability.getWeeklySynopsis(req.session.userId!);
      res.json(synopsis);
    } catch (error) {
      console.error("Get synopsis error:", error);
      res.status(500).json({ error: "Failed to get synopsis" });
    }
  });

  app.get("/api/accountability/preferences", requireAuth, async (req, res) => {
    try {
      const prefs = await accountability.getNotificationPreferences(req.session.userId!);
      res.json(prefs);
    } catch (error) {
      console.error("Get notification preferences error:", error);
      res.status(500).json({ error: "Failed to get preferences" });
    }
  });

  app.put("/api/accountability/preferences", requireAuth, async (req, res) => {
    try {
      const prefs = await accountability.updateNotificationPreferences(
        req.session.userId!,
        req.body
      );
      res.json(prefs);
    } catch (error) {
      console.error("Update notification preferences error:", error);
      res.status(500).json({ error: "Failed to update preferences" });
    }
  });

  // ------ Partner Linking ------

  // POST /api/accountability/partner/invite
  // Body: { email: string }
  app.post("/api/accountability/partner/invite", requireAuth, async (req, res) => {
    try {
      const { email } = req.body as { email?: string };
      if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "A valid email address is required." });
      }
      const trimmedEmail = email.trim();
      const basicEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!basicEmailRegex.test(trimmedEmail)) {
        return res.status(400).json({ error: "A valid email address is required." });
      }
      const invite = await accountability.invitePartner(req.session.userId!, trimmedEmail);

      // Send invitation email — requesterEmail is already available from invitePartner()
      if (invite.requesterEmail) {
        sendPartnerInviteEmail(trimmedEmail, invite.requesterEmail, invite.inviteToken).catch((err) => {
          console.error("Failed to send partner invite email:", err);
        });
      }

      // Return the invite token so the client can construct a deep-link if desired
      res.json({ invite });
    } catch (error) {
      const message = error instanceof Error ? error.message : null;
      if (
        message === "You cannot invite yourself as an accountability partner." ||
        message?.startsWith("You already have an active accountability partner")
      ) {
        return res.status(400).json({ error: message });
      }
      console.error("Partner invite error:", error);
      res.status(500).json({ error: "Failed to send invite." });
    }
  });

  // GET /api/accountability/partner
  // Returns the active partnership (or pending outgoing invites) for the logged-in user
  app.get("/api/accountability/partner", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const active = await accountability.getActivePartnership(userId);
      const pending = await accountability.getPendingOutgoingInvites(userId);
      res.json({ active, pending });
    } catch (error) {
      console.error("Get partner error:", error);
      res.status(500).json({ error: "Failed to load partner info." });
    }
  });

  // GET /api/accountability/partner/invite/:token
  // Public-ish: look up an invite by token (used on the accept-invite page)
  app.get("/api/accountability/partner/invite/:token", async (req, res) => {
    try {
      const { token } = req.params;
      if (!token || token.length !== 64 || !/^[0-9a-f]+$/.test(token)) {
        return res.status(400).json({ error: "Invalid token." });
      }
      const invite = await accountability.getInviteByToken(token);
      if (!invite || invite.status !== "pending") {
        return res.status(404).json({ error: "Invite not found or already used." });
      }
      // Only expose safe fields to the client
      res.json({
        invitedEmail: invite.invitedEmail,
        requesterEmail: invite.requesterEmail,
        requesterName: invite.requesterName,
        invitedAt: invite.invitedAt,
      });
    } catch (error) {
      console.error("Get invite by token error:", error);
      res.status(500).json({ error: "Failed to look up invite." });
    }
  });

  // POST /api/accountability/partner/accept/:token
  // Authenticated: logged-in user accepts the invite
  app.post("/api/accountability/partner/accept/:token", requireAuth, async (req, res) => {
    try {
      const { token } = req.params;
      if (!token || token.length !== 64 || !/^[0-9a-f]+$/.test(token)) {
        return res.status(400).json({ error: "Invalid token." });
      }
      const result = await accountability.acceptPartnerInvite(token, req.session.userId!);
      if (!result) {
        return res.status(400).json({ error: "Invite is invalid, expired, or already used." });
      }
      res.json({ success: true, partner: result });
    } catch (error) {
      console.error("Accept partner invite error:", error);
      res.status(500).json({ error: "Failed to accept invite." });
    }
  });

  // POST /api/accountability/partner/decline/:token
  // Authenticated: logged-in user declines the invite
  app.post("/api/accountability/partner/decline/:token", requireAuth, async (req, res) => {
    try {
      const { token } = req.params;
      if (!token || token.length !== 64 || !/^[0-9a-f]+$/.test(token)) {
        return res.status(400).json({ error: "Invalid token." });
      }
      const result = await accountability.declinePartnerInvite(token, req.session.userId!);
      if (!result) {
        return res.status(400).json({ error: "Invite not found or already handled." });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Decline partner invite error:", error);
      res.status(500).json({ error: "Failed to decline invite." });
    }
  });

  // DELETE /api/accountability/partner
  // Unlink the active partnership
  app.delete("/api/accountability/partner", requireAuth, async (req, res) => {
    try {
      const unlinked = await accountability.unlinkPartner(req.session.userId!);
      if (!unlinked) {
        return res.status(404).json({ error: "No active partnership found." });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Unlink partner error:", error);
      res.status(500).json({ error: "Failed to unlink partner." });
    }
  });

  // DELETE /api/accountability/partner/invite/:inviteId
  // Cancel a pending outgoing invite
  app.delete("/api/accountability/partner/invite/:inviteId", requireAuth, async (req, res) => {
    try {
      const { inviteId } = req.params;
      const cancelled = await accountability.cancelInvite(inviteId, req.session.userId!);
      if (!cancelled) {
        return res.status(404).json({ error: "Invite not found or already handled." });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Cancel invite error:", error);
      res.status(500).json({ error: "Failed to cancel invite." });
    }
  });

  // ========================================
  // PR #3: NEW API ROUTES
  // ========================================

  // Life Dimension Assessments
  app.get("/api/life-dimension-assessments", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const assessments = await storage.getLifeDimensionAssessments(userId);
      res.json(assessments);
    } catch (error) {
      console.error("Get life dimension assessments error:", error);
      res.status(500).json({ error: "Failed to get assessments" });
    }
  });

  app.post("/api/life-dimension-assessments", requireAuth, async (req, res) => {
    try {
      const data = insertLifeDimensionAssessmentSchema.parse({
        ...req.body,
        userId: req.session.userId!,
      });
      const assessment = await storage.createLifeDimensionAssessment(data);
      res.json(assessment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create assessment error:", error);
      res.status(500).json({ error: "Failed to create assessment" });
    }
  });

  // Dimension Systems
  app.get("/api/dimension-systems", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const dimension = req.query.dimension as string | undefined;
      const systems = await storage.getDimensionSystems(userId, dimension);
      res.json(systems);
    } catch (error) {
      console.error("Get dimension systems error:", error);
      res.status(500).json({ error: "Failed to get systems" });
    }
  });

  app.post("/api/dimension-systems", requireAuth, async (req, res) => {
    try {
      const data = insertDimensionSystemSchema.parse({
        ...req.body,
        userId: req.session.userId!,
      });
      const system = await storage.createDimensionSystem(data);
      res.json(system);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create system error:", error);
      res.status(500).json({ error: "Failed to create system" });
    }
  });

  app.patch("/api/dimension-systems/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const system = await storage.updateDimensionSystem(id, userId, req.body);
      if (!system) {
        return res.status(404).json({ error: "System not found" });
      }
      res.json(system);
    } catch (error) {
      console.error("Update system error:", error);
      res.status(500).json({ error: "Failed to update system" });
    }
  });

  app.delete("/api/dimension-systems/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      await storage.deleteDimensionSystem(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete system error:", error);
      res.status(500).json({ error: "Failed to delete system" });
    }
  });

  // Wellness Preferences
  app.get("/api/wellness-preferences", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const preferences = await storage.getWellnessPreferences(userId);
      res.json(preferences ?? null);
    } catch (error) {
      console.error("Get wellness preferences error:", error);
      res.status(500).json({ error: "Failed to get preferences" });
    }
  });

  app.post("/api/wellness-preferences", requireAuth, async (req, res) => {
    try {
      const data = insertWellnessPreferencesSchema.parse({
        ...req.body,
        userId: req.session.userId!,
      });
      const preferences = await storage.createWellnessPreferences(data);
      res.json(preferences);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create wellness preferences error:", error);
      res.status(500).json({ error: "Failed to create preferences" });
    }
  });

  app.patch("/api/wellness-preferences/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const parsed = insertWellnessPreferencesSchema
        .omit({ userId: true })
        .partial()
        .safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors });
      }
      const preferences = await storage.updateWellnessPreferences(id, userId, parsed.data);
      if (!preferences) {
        return res.status(404).json({ error: "Preferences not found" });
      }
      res.json(preferences);
    } catch (error) {
      console.error("Update wellness preferences error:", error);
      res.status(500).json({ error: "Failed to update preferences" });
    }
  });

  // ── Cosmic Consent ──────────────────────────────────────────────────────────
  // Returns useAstrologyInGuidance + useNumerologyInGuidance for authenticated user.
  app.get("/api/cosmic/consent", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const prefs = await storage.getWellnessPreferences(userId);
      res.json({
        useAstrologyInGuidance: prefs?.useAstrologyInGuidance ?? false,
        useNumerologyInGuidance: prefs?.useNumerologyInGuidance ?? false,
      });
    } catch (error) {
      console.error("Get cosmic consent error:", error);
      res.status(500).json({ error: "Failed to get cosmic consent" });
    }
  });

  app.patch("/api/cosmic/consent", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { useAstrologyInGuidance, useNumerologyInGuidance } = req.body as {
        useAstrologyInGuidance?: boolean;
        useNumerologyInGuidance?: boolean;
      };
      const update: Record<string, boolean> = {};
      if (typeof useAstrologyInGuidance === "boolean") update.useAstrologyInGuidance = useAstrologyInGuidance;
      if (typeof useNumerologyInGuidance === "boolean") update.useNumerologyInGuidance = useNumerologyInGuidance;

      if (Object.keys(update).length === 0) {
        return res.status(400).json({ error: "At least one of useAstrologyInGuidance or useNumerologyInGuidance must be provided" });
      }

      let prefs = await storage.getWellnessPreferences(userId);
      if (prefs) {
        await storage.updateWellnessPreferences(prefs.id, userId, update);
      } else {
        prefs = await storage.createWellnessPreferences({ userId, ...update });
      }

      const updated = await storage.getWellnessPreferences(userId);
      res.json({
        useAstrologyInGuidance: updated?.useAstrologyInGuidance ?? false,
        useNumerologyInGuidance: updated?.useNumerologyInGuidance ?? false,
      });
    } catch (error) {
      console.error("Update cosmic consent error:", error);
      res.status(500).json({ error: "Failed to update cosmic consent" });
    }
  });

  // User Values & Rules
  app.get("/api/user-values-rules", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const record = await storage.getUserValuesRules(userId);
      res.json(record || null);
    } catch (error) {
      console.error("Get user values rules error:", error);
      res.status(500).json({ error: "Failed to get values & rules" });
    }
  });

  app.post("/api/user-values-rules", requireAuth, async (req, res) => {
    try {
      const data = insertUserValuesRulesSchema.parse({
        ...req.body,
        userId: req.session.userId!,
      });
      const record = await storage.createUserValuesRules(data);
      res.json(record);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create user values rules error:", error);
      res.status(500).json({ error: "Failed to create values & rules" });
    }
  });

  app.patch("/api/user-values-rules/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const data = insertUserValuesRulesSchema.omit({ userId: true }).partial().parse(req.body);
      const record = await storage.updateUserValuesRules(id, userId, data);
      if (!record) {
        return res.status(404).json({ error: "Values & rules not found" });
      }
      res.json(record);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Update user values rules error:", error);
      res.status(500).json({ error: "Failed to update values & rules" });
    }
  });

  // Feature Settings
  app.get("/api/feature-settings", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const settings = await storage.getFeatureSettings(userId);
      res.json(settings);
    } catch (error) {
      console.error("Get feature settings error:", error);
      res.status(500).json({ error: "Failed to get feature settings" });
    }
  });

  app.post("/api/feature-settings", requireAuth, async (req, res) => {
    try {
      const data = insertFeatureSettingsSchema.parse({
        ...req.body,
        userId: req.session.userId!,
      });
      const settings = await storage.createFeatureSettings(data);
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create feature settings error:", error);
      res.status(500).json({ error: "Failed to create feature settings" });
    }
  });

  app.patch("/api/feature-settings/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const settings = await storage.updateFeatureSettings(id, userId, req.body);
      if (!settings) {
        return res.status(404).json({ error: "Feature settings not found" });
      }
      res.json(settings);
    } catch (error) {
      console.error("Update feature settings error:", error);
      res.status(500).json({ error: "Failed to update feature settings" });
    }
  });

  // Household Cleaning Tasks
  app.get("/api/household-cleaning-tasks", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const tasks = await storage.getHouseholdCleaningTasks(userId);
      res.json(tasks);
    } catch (error) {
      console.error("Get cleaning tasks error:", error);
      res.status(500).json({ error: "Failed to get cleaning tasks" });
    }
  });

  app.post("/api/household-cleaning-tasks", requireAuth, async (req, res) => {
    try {
      const data = insertHouseholdCleaningTaskSchema.parse({
        ...req.body,
        userId: req.session.userId!,
      });
      const task = await storage.createHouseholdCleaningTask(data);
      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create cleaning task error:", error);
      res.status(500).json({ error: "Failed to create cleaning task" });
    }
  });

  app.patch("/api/household-cleaning-tasks/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const task = await storage.updateHouseholdCleaningTask(id, userId, req.body);
      if (!task) {
        return res.status(404).json({ error: "Cleaning task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("Update cleaning task error:", error);
      res.status(500).json({ error: "Failed to update cleaning task" });
    }
  });

  app.delete("/api/household-cleaning-tasks/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      await storage.deleteHouseholdCleaningTask(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete cleaning task error:", error);
      res.status(500).json({ error: "Failed to delete cleaning task" });
    }
  });

  // Household Laundry Schedule
  app.get("/api/household-laundry-schedule", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const schedule = await storage.getHouseholdLaundrySchedule(userId);
      res.json(schedule);
    } catch (error) {
      console.error("Get laundry schedule error:", error);
      res.status(500).json({ error: "Failed to get laundry schedule" });
    }
  });

  app.post("/api/household-laundry-schedule", requireAuth, async (req, res) => {
    try {
      const data = insertHouseholdLaundryScheduleSchema.parse({
        ...req.body,
        userId: req.session.userId!,
      });
      const schedule = await storage.createHouseholdLaundrySchedule(data);
      res.json(schedule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create laundry schedule error:", error);
      res.status(500).json({ error: "Failed to create laundry schedule" });
    }
  });

  app.patch("/api/household-laundry-schedule/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const schedule = await storage.updateHouseholdLaundrySchedule(id, userId, req.body);
      if (!schedule) {
        return res.status(404).json({ error: "Laundry schedule not found" });
      }
      res.json(schedule);
    } catch (error) {
      console.error("Update laundry schedule error:", error);
      res.status(500).json({ error: "Failed to update laundry schedule" });
    }
  });

  app.delete("/api/household-laundry-schedule/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      await storage.deleteHouseholdLaundrySchedule(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete laundry schedule error:", error);
      res.status(500).json({ error: "Failed to delete laundry schedule" });
    }
  });

  // AI Feature Usage Tracking
  app.get("/api/ai-feature-usage", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const usage = await storage.getAiFeatureUsage(userId);
      res.json(usage);
    } catch (error) {
      console.error("Get AI feature usage error:", error);
      res.status(500).json({ error: "Failed to get feature usage" });
    }
  });

  const trackFeatureUsageSchema = z.object({
    featureName: z.string().min(1, "Feature name is required"),
    timeSpentSeconds: z.number().int().min(0).optional().default(0),
  });

  app.post("/api/ai-feature-usage/track", requireAuth, async (req, res) => {
    try {
      const { featureName, timeSpentSeconds } = trackFeatureUsageSchema.parse(req.body);
      const userId = req.session.userId!;
      await storage.trackFeatureUsage(userId, featureName, timeSpentSeconds);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Track feature usage error:", error);
      res.status(500).json({ error: "Failed to track usage" });
    }
  });

  app.get("/api/ai-feature-usage/most-used", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      let limit = 4;
      if (req.query.limit !== undefined) {
        const parsedLimit = parseInt(req.query.limit as string, 10);
        if (!Number.isNaN(parsedLimit)) {
          limit = Math.min(Math.max(parsedLimit, 1), 20);
        }
      }
      const mostUsed = await storage.getMostUsedFeatures(userId, limit);
      res.json(mostUsed);
    } catch (error) {
      console.error("Get most used features error:", error);
      res.status(500).json({ error: "Failed to get most used features" });
    }
  });

  // AI Suggestions
  app.get("/api/ai-suggestions", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const status = req.query.status as string | undefined;
      const suggestions = await storage.getAiSuggestions(userId, status);
      res.json(suggestions);
    } catch (error) {
      console.error("Get AI suggestions error:", error);
      res.status(500).json({ error: "Failed to get suggestions" });
    }
  });

  app.post("/api/ai-suggestions", requireAuth, async (req, res) => {
    try {
      const data = insertAiSuggestionSchema.parse({
        ...req.body,
        userId: req.session.userId!,
      });
      const suggestion = await storage.createAiSuggestion(data);
      res.json(suggestion);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create AI suggestion error:", error);
      res.status(500).json({ error: "Failed to create suggestion" });
    }
  });

  app.patch("/api/ai-suggestions/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const { status } = req.body;
      const suggestion = await storage.updateAiSuggestion(id, userId, { status, respondedAt: new Date() });
      if (!suggestion) {
        return res.status(404).json({ error: "Suggestion not found" });
      }
      res.json(suggestion);
    } catch (error) {
      console.error("Update AI suggestion error:", error);
      res.status(500).json({ error: "Failed to update suggestion" });
    }
  });

  // ── Conversation Insight Cards (backend persistence for auth users) ─────────

  // Maximum number of insights that can be uploaded in a single bulk request.
  // Prevents excessively large payloads during local→backend migration.
  const MAX_BULK_INSIGHTS = 200;

  // Zod schema for PATCH /api/insights/:id – only the mutable subset of fields.
  const patchInsightSchema = z.object({
    title: z.string().min(1).max(80).optional(),
    summary: z.string().max(300).optional(),
    pinned: z.boolean().optional(),
    // Accept ms-epoch number, ISO string, or explicit null (unpin clears timestamp)
    pinnedAt: z.union([z.number(), z.string(), z.null()])
      .optional()
      .transform((v) => (v != null ? new Date(v) : null)),
    hidden: z.boolean().optional(),
  });

  app.get("/api/insights", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const limit = Math.max(1, Math.min(parseInt(String(req.query.limit ?? "50"), 10) || 50, MAX_BULK_INSIGHTS));
      const offset = Math.max(parseInt(String(req.query.offset ?? "0"), 10) || 0, 0);
      const insights = await storage.getConversationInsights(userId, limit, offset);
      res.json(insights);
    } catch (error) {
      console.error("Get insights error:", error);
      res.status(500).json({ error: "Failed to get insights" });
    }
  });

  app.post("/api/insights", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const data = insertConversationInsightSchema.parse({ ...req.body, userId });
      const insight = await storage.createConversationInsight(data);
      res.status(201).json(insight);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create insight error:", error);
      res.status(500).json({ error: "Failed to create insight" });
    }
  });

  // Bulk upsert – used for migrating local insights on first login
  app.post("/api/insights/bulk", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { insights } = req.body;
      if (!Array.isArray(insights)) {
        return res.status(400).json({ error: "insights must be an array" });
      }
      const capped = (insights as unknown[]).slice(0, MAX_BULK_INSIGHTS);
      const parsed = capped.map((i: unknown) => {
        return insertConversationInsightSchema.parse({ ...(i as object), userId });
      });
      await storage.bulkUpsertConversationInsights(parsed);
      res.json({ ok: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Bulk upsert insights error:", error);
      res.status(500).json({ error: "Failed to bulk upsert insights" });
    }
  });

  app.patch("/api/insights/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const patch = patchInsightSchema.parse(req.body);
      const updated = await storage.updateConversationInsight(id, userId, patch as Parameters<typeof storage.updateConversationInsight>[2]);
      if (!updated) {
        return res.status(404).json({ error: "Insight not found" });
      }
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Update insight error:", error);
      res.status(500).json({ error: "Failed to update insight" });
    }
  });

  app.delete("/api/insights/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      await storage.deleteConversationInsight(id, userId);
      res.json({ ok: true });
    } catch (error) {
      console.error("Delete insight error:", error);
      res.status(500).json({ error: "Failed to delete insight" });
    }
  });

  // ── DW Insight + Journal Intelligence System ──────────────────────────────

  // Rate limiter for the expensive AI pipeline endpoint
  const dwProcessLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many processing requests. Please try again later." },
  });

  // Zod schema shared by both DW process endpoints
  const dwMessageSchema = z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(8000),
  });
  const dwProcessSchema = z.object({
    messages: z.array(dwMessageSchema).min(1).max(200),
    conversationId: z.string().max(200).optional(),
  });

  // POST /api/dw/processConversation – run the AI pipeline on a conversation
  app.post("/api/dw/processConversation", requireAuth, dwProcessLimiter, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const parsed = dwProcessSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }
      const { messages, conversationId } = parsed.data;

      // Idempotency: skip if this conversation was already processed for this user
      if (conversationId) {
        const existing = await storage.getDwInsightByConversation(userId, conversationId);
        if (existing) {
          return res.status(200).json({ skipped: true, reason: "already_processed", insightId: existing.id });
        }
      }

      const result = await processConversationIntoInsights(messages);
      if (!result) {
        return res.status(422).json({ error: "Conversation too short or could not be processed" });
      }

      // Persist insight
      const insight = await storage.createDwInsight({
        userId,
        title: result.insight.title,
        summary: result.insight.summary,
        insightLine: result.insight.insightLine,
        quotes: result.insight.quotes,
        theme: result.insight.theme,
        tags: result.insight.tags,
        switchTag: result.insight.switchTag ?? null,
        sourceConversationId: conversationId ?? null,
      });

      // Persist journal entry
      const journalEntry = await storage.createDwJournalEntry({
        userId,
        title: result.journalEntry.title,
        story: result.journalEntry.story,
        quotes: result.journalEntry.quotes,
        tags: result.journalEntry.tags,
        sourceConversationId: conversationId ?? null,
      });

      // Persist follow-up
      const followup = await storage.createDwFollowup({
        userId,
        prompt: result.followupPrompt,
        relatedInsightId: insight.id,
        sourceConversationId: conversationId ?? null,
        status: "pending",
      });

      res.status(201).json({ insight, journalEntry, followup });
    } catch (error) {
      console.error("DW processConversation error:", error);
      res.status(500).json({ error: "Failed to process conversation" });
    }
  });

  // POST /api/dw/processConversation/preview – guest-friendly endpoint
  // Runs the AI pipeline and returns the result WITHOUT saving to the database.
  // Guests should store the returned data in localStorage on the client.
  app.post("/api/dw/processConversation/preview", dwProcessLimiter, async (req, res) => {
    try {
      const parsed = dwProcessSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }
      const { messages } = parsed.data;

      const result = await processConversationIntoInsights(messages);
      if (!result) {
        return res.status(422).json({ error: "Conversation too short or could not be processed" });
      }

      res.json(result);
    } catch (error) {
      console.error("DW processConversation/preview error:", error);
      res.status(500).json({ error: "Failed to process conversation" });
    }
  });

  // GET /api/dw/latestInsight
  app.get("/api/dw/latestInsight", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const insight = await storage.getLatestDwInsight(userId);
      res.json(insight ?? null);
    } catch (error) {
      console.error("DW latestInsight error:", error);
      res.status(500).json({ error: "Failed to get latest insight" });
    }
  });

  // GET /api/dw/insights – feed of all DW insights for the insights page
  app.get("/api/dw/insights", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const limit = Math.min(parseInt(String(req.query.limit ?? "50"), 10) || 50, 100);
      const insights = await storage.getDwInsights(userId, limit);
      res.json(insights);
    } catch (error) {
      console.error("DW insights error:", error);
      res.status(500).json({ error: "Failed to get insights" });
    }
  });

  // GET /api/dw/latestJournal
  app.get("/api/dw/latestJournal", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const entry = await storage.getLatestDwJournalEntry(userId);
      res.json(entry ?? null);
    } catch (error) {
      console.error("DW latestJournal error:", error);
      res.status(500).json({ error: "Failed to get latest journal entry" });
    }
  });

  // GET /api/dw/journalEntries – list of all DW journal entries
  app.get("/api/dw/journalEntries", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const limit = Math.min(parseInt(String(req.query.limit ?? "50"), 10) || 50, 100);
      const entries = await storage.getDwJournalEntries(userId, limit);
      res.json(entries);
    } catch (error) {
      console.error("DW journalEntries error:", error);
      res.status(500).json({ error: "Failed to get journal entries" });
    }
  });

  // GET /api/dw/followups
  app.get("/api/dw/followups", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      // Default to "pending" (which also surfaces snoozed-expired); pass "all" to get everything
      const status = typeof req.query.status === "string" ? req.query.status : "pending";
      const followups = await storage.getDwFollowups(userId, status);
      res.json(followups);
    } catch (error) {
      console.error("DW followups error:", error);
      res.status(500).json({ error: "Failed to get follow-ups" });
    }
  });

  // PATCH /api/dw/followups/:id – update follow-up status + snooze fields
  app.patch("/api/dw/followups/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const { status, snoozedUntil } = req.body as { status?: string; snoozedUntil?: string };
      const validStatuses = ["pending", "accepted", "snoozed", "answered", "dismissed"];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ error: `status must be one of: ${validStatuses.join(", ")}` });
      }

      const now = new Date();
      const fields: Parameters<typeof storage.updateDwFollowup>[2] = { status };

      if (status === "snoozed") {
        if (!snoozedUntil) return res.status(400).json({ error: "snoozedUntil is required when status is snoozed" });
        const snoozeDate = new Date(snoozedUntil);
        if (isNaN(snoozeDate.getTime())) return res.status(400).json({ error: "snoozedUntil must be a valid ISO date" });
        fields.snoozedUntil = snoozeDate;
      } else if (status === "accepted") {
        fields.acceptedAt = now;
      } else if (status === "answered") {
        fields.answeredAt = now;
      } else if (status === "dismissed") {
        fields.dismissedAt = now;
      }

      const updated = await storage.updateDwFollowup(id, userId, fields);
      if (!updated) return res.status(404).json({ error: "Follow-up not found" });
      res.json(updated);
    } catch (error) {
      console.error("DW update followup error:", error);
      res.status(500).json({ error: "Failed to update follow-up" });
    }
  });

  // ── Elevation Engine (PR #3) ──────────────────────────────────────────────

  /**
   * Compute momentum status from a user's existing data.
   * Uses only real data: habits (streak), goals (progress), mood logs (last 7 days).
   * Returns: { momentumStatus, reasons, suggestedFocus }
   *
   * @param recentMoods - Mood logs within the last 7 days (pre-filtered by DB query)
   * @param hasPriorMoodLogs - Whether any mood logs exist before the 7-day window
   */
  function computeMomentumStatus(
    habits: Habit[],
    goals: Goal[],
    recentMoods: MoodLog[],
    hasPriorMoodLogs: boolean,
    learningProfile?: { preferredActionTypes?: string[]; frictionPoints?: string[]; wins?: string[] },
  ): { momentumStatus: "green" | "yellow" | "red"; reasons: string[]; suggestedFocus?: string } {
    const negativeSignals: string[] = [];

    const activeHabits = habits.filter((h) => h.isActive !== false);
    const activeGoals = goals.filter((g) => g.isActive !== false);

    // Signal 1: Nothing is being tracked
    if (activeHabits.length === 0 && activeGoals.length === 0) {
      return {
        momentumStatus: "red",
        reasons: ["No habits or goals are active yet"],
        suggestedFocus: "Start with one habit or goal to get things in motion",
      };
    }

    // Signal 2: Habits set up but no streak
    if (activeHabits.length > 0) {
      const maxStreak = activeHabits.reduce((max, h) => Math.max(max, h.streak ?? 0), 0);
      if (maxStreak === 0) {
        negativeSignals.push("Habits are set up but consistency has stalled");
      }
    }

    // Signal 3: Goals with no progress
    if (activeGoals.length > 0) {
      const allStuck = activeGoals.every((g) => {
        return typeof g.progress !== "number" || g.progress === 0;
      });
      if (allStuck) {
        negativeSignals.push("Goals are active but haven't moved yet");
      }
    }

    // Signal 4: No mood check-ins in last 7 days (only flagged if they've logged before)
    if (recentMoods.length === 0 && hasPriorMoodLogs) {
      negativeSignals.push("No energy check-ins in the last 7 days");
    }

    // Signal 5: Low average mood recently
    if (recentMoods.length > 0) {
      const avgMood = recentMoods.reduce((sum, m) => sum + m.moodLevel, 0) / recentMoods.length;
      if (avgMood <= 3) {
        negativeSignals.push("Energy has been lower than usual recently");
      }
    }

    // Classify: limit reasons to max 2
    const reasons = negativeSignals.slice(0, 2);
    let momentumStatus: "green" | "yellow" | "red";
    let suggestedFocus: string | undefined;

    if (negativeSignals.length >= 2) {
      momentumStatus = "red";
      // Use learning profile to personalize the suggestedFocus
      const topActionType = learningProfile?.preferredActionTypes?.[0];
      suggestedFocus = topActionType
        ? `One small ${topActionType} action today can restart your momentum`
        : "One small action today can restart your momentum";
    } else if (negativeSignals.length === 1) {
      momentumStatus = "yellow";
      const knownFriction = learningProfile?.frictionPoints?.[0];
      suggestedFocus = knownFriction
        ? `You're close — even with ${knownFriction} challenges, one consistent action can shift things`
        : "You're close — one consistent action can shift things";
    } else {
      momentumStatus = "green";
      const recentWin = learningProfile?.wins?.[0];
      suggestedFocus = recentWin
        ? `Keep building on what worked (like "${recentWin}")`
        : "Keep building on what's working";
    }

    return { momentumStatus, reasons, suggestedFocus };
  }

  function todayDateString(): string {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  }

  // GET /api/elevation/check – return today's cached check (or null if not yet run)
  app.get("/api/elevation/check", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const today = todayDateString();
      const existing = await storage.getElevationCheckByDate(userId, today);
      if (existing) {
        return res.json(existing);
      }
      res.json(null);
    } catch (error) {
      console.error("Elevation check GET error:", error);
      res.status(500).json({ error: "Failed to get elevation check" });
    }
  });

  const elevationCheckBodySchema = z.object({
    force: z.boolean().optional(),
  });

  // POST /api/elevation/check – run (or re-run) today's elevation check
  // Body: { force?: boolean } — force=true bypasses the daily idempotency guard
  app.post("/api/elevation/check", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const today = todayDateString();

      const parsed = elevationCheckBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body" });
      }
      const force = parsed.data.force === true;

      // Idempotency: skip if already checked today (unless force=true)
      if (!force) {
        const existing = await storage.getElevationCheckByDate(userId, today);
        if (existing) {
          return res.json({ ...existing, skipped: true });
        }
      }

      // Gather only what we need: habits/goals (all active) + mood logs for the last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const [habits, goals, moodData, learningProfile] = await Promise.all([
        storage.getHabits(userId),
        storage.getGoals(userId),
        storage.getRecentMoodLogs(userId, sevenDaysAgo),
        storage.getLearningProfile(userId),
      ]);

      const { momentumStatus, reasons, suggestedFocus } = computeMomentumStatus(
        habits,
        goals,
        moodData.logs,
        moodData.hasPriorLogs,
        // Only pass learning profile when personalization is enabled
        (learningProfile?.learningEnabled !== false) ? (learningProfile ?? undefined) : undefined,
      );

      const check = await storage.upsertElevationCheck({
        userId,
        checkedDate: today,
        momentumStatus,
        reasons,
        suggestedFocus: suggestedFocus ?? null,
      });

      res.json(check);
    } catch (error) {
      console.error("Elevation check POST error:", error);
      res.status(500).json({ error: "Failed to run elevation check" });
    }
  });

  // Support report endpoint (accessible to both guests and authenticated users)
  const supportReportLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many support reports. Please try again later." },
  });

  const detailedSupportReportSchema = z.object({
    category: z.enum(["bug", "demo_mismatch", "voice", "content_feed", "scheduling", "other"]),
    description: z.string().min(1),
    stepsToReproduce: z.string().optional(),
    eventType: z.string().optional(),
    requestedTerm: z.string().optional(),
    normalizedTerm: z.string().optional(),
    closestMatch: z.object({ id: z.string().optional(), name: z.string().optional() }).optional(),
    confidence: z.number().min(0).max(1).optional(),
    includeTechnicalDetails: z.boolean(),
    technicalDetails: z.object({
      appVersion: z.string().optional(),
      platform: z.string().optional(),
      deviceModel: z.string().optional(),
      osVersion: z.string().optional(),
      userAgent: z.string().optional(),
    }).optional(),
    includeRecentContext: z.boolean(),
    recentContext: z.object({
      route: z.string().optional(),
      screen: z.string().optional(),
      lastAction: z.string().optional(),
    }).optional(),
    includeConversationSnippet: z.boolean(),
    conversationSnippet: z.object({
      conversationId: z.string().optional(),
      lastUserMessage: z.string().optional(),
      lastDwReply: z.string().optional(),
    }).optional(),
    includeConstraintsSnapshot: z.boolean(),
    constraintsSnapshot: z.object({
      equipment: z.unknown().optional(),
      injuries: z.unknown().optional(),
      lowImpact: z.boolean().optional(),
      dietaryRules: z.unknown().optional(),
    }).optional(),
  });

  app.post("/api/support/detailed-report", supportReportLimiter, async (req, res) => {
    try {
      const data = detailedSupportReportSchema.parse(req.body);
      const createdAt = new Date().toISOString();

      const report = {
        category: data.category,
        description: data.description,
        stepsToReproduce: data.stepsToReproduce,
        eventType: data.eventType,
        requestedTerm: data.requestedTerm,
        normalizedTerm: data.normalizedTerm,
        closestMatch: data.closestMatch,
        confidence: data.confidence,
        technicalDetails: data.includeTechnicalDetails ? data.technicalDetails : undefined,
        recentContext: data.includeRecentContext ? data.recentContext : undefined,
        conversationSnippet: data.includeConversationSnippet ? data.conversationSnippet : undefined,
        constraintsSnapshot: data.includeConstraintsSnapshot ? data.constraintsSnapshot : undefined,
        createdAt,
      };

      const sent = await sendSupportReportEmail(report);
      if (!sent) {
        console.error("Support report email could not be delivered");
        return res.status(500).json({ error: "Failed to deliver support report. Please try again or email dimensionalwellnessai@gmail.com directly." });
      }

      res.json({ success: true, createdAt });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.flatten() });
      }
      console.error("Support report error:", error);
      res.status(500).json({ error: "Failed to submit support report" });
    }
  });

  // ========================================
  // PR #5: ELEVATION PLAN BUILDER
  // ========================================

  const elevationPlanLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many elevation plan requests. Please try again later." },
  });

  const elevationPlanDraftSchema = z.object({
    conversationId: z.string().max(200).optional(),
    reasons: z.string().max(2000).optional(),
    recentInsights: z.string().max(2000).optional(),
    userPreferences: z.string().max(1000).optional(),
    focusDimension: z.string().max(100).optional(),
  });

  const elevationPlanUpdateSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    goal: z.string().max(500).optional(),
    status: z.enum(["draft", "active", "archived"]).optional(),
  });

  const elevationPlanActionUpdateSchema = z.object({
    isCompleted: z.boolean().optional(),
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
  });

  const elevationPlanAddToCalendarSchema = z.object({
    planDayIndex: z.number().int().min(1).max(7),
    planStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    planTitle: z.string().max(200).optional(),
  });

  const elevationPlanAddToTasksSchema = z.object({
    planDayIndex: z.number().int().min(1).max(7),
    planStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  });

  /** Map action timeOfDay string to a wall-clock hour (24h). */
  function resolveActionHour(timeOfDay: string | null | undefined): number {
    if (!timeOfDay) return 9;
    const t = timeOfDay.toLowerCase();
    if (t.includes("morning")) return 8;
    if (t.includes("afternoon")) return 13;
    if (t.includes("evening") || t.includes("night")) return 18;
    // Try to parse "HH:MM" or "H:MM AM/PM"
    const match12 = t.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
    if (match12) {
      let h = parseInt(match12[1], 10);
      if (match12[3] === "pm" && h !== 12) h += 12;
      if (match12[3] === "am" && h === 12) h = 0;
      return h;
    }
    const match24 = t.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) return parseInt(match24[1], 10);
    return 9;
  }

  /** Add calendar days to a YYYY-MM-DD string without timezone conversion. */
  function addCalendarDays(dateStr: string, days: number): string {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d + days);
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  }

  /** Build wall-clock startTime / endTime strings (no timezone offset) for a plan action. */
  function buildActionEventTimes(
    planStartDate: string,
    dayIndex: number,
    timeOfDay: string | null | undefined,
    durationMinutes: number | null | undefined
  ): { startTime: string; endTime: string } {
    const dateStr = addCalendarDays(planStartDate, dayIndex - 1);
    const hour = resolveActionHour(timeOfDay);
    const dur = durationMinutes ?? 30;
    const startMinutes = hour * 60;
    const endMinutes = startMinutes + dur;
    const endHour = Math.floor(endMinutes / 60) % 24;
    const endMin = endMinutes % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    const startTime = `${dateStr}T${pad(hour)}:00:00`;
    const endTime = `${addCalendarDays(planStartDate, dayIndex - 1 + (endMinutes >= 1440 ? 1 : 0))}T${pad(endHour)}:${pad(endMin)}:00`;
    return { startTime, endTime };
  }

  /** Map action type to calendar event type. */
  function actionTypeToEventType(actionType: string): string {
    const map: Record<string, string> = {
      workout: "workout",
      nutrition: "meal",
      habit: "routine",
      reflection: "routine",
      schedule: "event",
    };
    return map[actionType] ?? "event";
  }

  // POST /api/elevation-plans/preview – guest preview (no auth, returns structure only)
  app.post("/api/elevation-plans/preview", elevationPlanLimiter, async (req, res) => {
    try {
      const parsed = elevationPlanDraftSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }
      const { reasons, recentInsights, userPreferences, focusDimension } = parsed.data;
      const structure = await generateElevationPlanStructure({ reasons, recentInsights, userPreferences, focusDimension });
      if (!structure) return res.status(500).json({ error: "Failed to generate elevation plan" });
      res.json(structure);
    } catch (error) {
      console.error("Elevation plan preview error:", error);
      res.status(500).json({ error: "Failed to generate elevation plan preview" });
    }
  });

  // POST /api/elevation-plans/draft – create or reuse existing draft for current conversation/date
  app.post("/api/elevation-plans/draft", requireAuth, elevationPlanLimiter, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const parsed = elevationPlanDraftSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }
      const { conversationId, reasons, recentInsights, userPreferences, focusDimension } = parsed.data;

      const today = new Date().toISOString().slice(0, 10);

      // Idempotency: reuse existing draft for the same day / conversation
      const existing = await storage.getDraftElevationPlanForDay(userId, today, conversationId);
      if (existing) {
        const days = await storage.getElevationPlanDays(existing.id);
        const daysWithActions = await Promise.all(
          days.map(async (d) => ({ ...d, actions: await storage.getElevationPlanActions(d.id) }))
        );
        return res.json({ plan: existing, days: daysWithActions });
      }

      // Enrich with learning profile context (PR #8)
      const learningProfile = await storage.getLearningProfile(userId);
      let enrichedUserPreferences = userPreferences ?? "";
      if (learningProfile && learningProfile.learningEnabled !== false) {
        const parts: string[] = [];
        if (learningProfile.preferredActionTypes && learningProfile.preferredActionTypes.length > 0) {
          parts.push(`Preferred action types: ${learningProfile.preferredActionTypes.join(", ")}`);
        }
        if (learningProfile.preferredTimes && Object.keys(learningProfile.preferredTimes).length > 0) {
          const times = Object.entries(learningProfile.preferredTimes)
            .filter(([k]) => !k.startsWith("_"))
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ");
          if (times) parts.push(`Preferred times: ${times}`);
        }
        if (learningProfile.frictionPoints && learningProfile.frictionPoints.length > 0) {
          parts.push(`Known friction points: ${learningProfile.frictionPoints.join(", ")}`);
        }
        if (learningProfile.avoid && learningProfile.avoid.length > 0) {
          parts.push(`Avoid: ${learningProfile.avoid.join(", ")}`);
        }
        if (parts.length > 0) {
          enrichedUserPreferences = [enrichedUserPreferences, parts.join(". ")].filter(Boolean).join("\n");
        }
      }

      // Generate via AI
      const structure = await generateElevationPlanStructure({ reasons, recentInsights, userPreferences: enrichedUserPreferences || undefined, focusDimension });
      if (!structure) {
        return res.status(500).json({ error: "Failed to generate elevation plan" });
      }

      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 6);

      // Wrap all inserts in a DB transaction to avoid partial drafts
      const { plan, daysWithActions } = await db.transaction(async (tx) => {
        const [plan] = await tx.insert(elevationPlans)
          .values({
            userId,
            title: structure.title,
            goal: structure.goal,
            focusDimension: structure.focusDimension,
            status: "draft",
            startDate: today,
            endDate: endDate.toISOString().slice(0, 10),
            sourceConversationId: conversationId,
            updatedAt: new Date(),
          })
          .returning();

        const daysWithActions = [];
        for (const dayData of structure.days.slice(0, 7)) {
          const [day] = await tx.insert(elevationPlanDays)
            .values({
              planId: plan.id,
              dayIndex: dayData.dayIndex,
              theme: dayData.theme,
              intention: dayData.intention,
            })
            .returning();

          const actions = [];
          for (const a of (dayData.actions ?? []).slice(0, 4)) {
            const [action] = await tx.insert(elevationPlanActions)
              .values({
                planDayId: day.id,
                actionType: a.actionType,
                title: a.title,
                description: a.description,
                timeOfDay: a.timeOfDay,
                durationMinutes: a.durationMinutes,
                isCompleted: false,
                updatedAt: new Date(),
              })
              .returning();
            actions.push(action);
          }
          daysWithActions.push({ ...day, actions });
        }

        return { plan, daysWithActions };
      });

      res.json({ plan, days: daysWithActions });
    } catch (error) {
      console.error("Elevation plan draft error:", error);
      res.status(500).json({ error: "Failed to create elevation plan draft" });
    }
  });

  // GET /api/elevation-plans/active – get the active elevation plan
  app.get("/api/elevation-plans/active", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const plan = await storage.getActiveElevationPlan(userId);
      if (!plan) return res.json(null);
      const days = await storage.getElevationPlanDays(plan.id);
      const daysWithActions = await Promise.all(
        days.map(async (d) => ({ ...d, actions: await storage.getElevationPlanActions(d.id) }))
      );
      res.json({ plan, days: daysWithActions });
    } catch (error) {
      console.error("Elevation plan active error:", error);
      res.status(500).json({ error: "Failed to get active elevation plan" });
    }
  });

  // GET /api/elevation-plans – list all plans for the user with completion stats (PR #17)
  app.get("/api/elevation-plans", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      // Use a single aggregate query to avoid N+1 (PR #17)
      const plansWithStats = await storage.getElevationPlansWithStats(userId);
      res.json(plansWithStats);
    } catch (error) {
      console.error("Elevation plans list error:", error);
      res.status(500).json({ error: "Failed to list elevation plans" });
    }
  });

  // GET /api/elevation-plans/:id – get a specific elevation plan
  app.get("/api/elevation-plans/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const plan = await storage.getElevationPlan(req.params.id, userId);
      if (!plan) return res.status(404).json({ error: "Plan not found" });
      const days = await storage.getElevationPlanDays(plan.id);
      const daysWithActions = await Promise.all(
        days.map(async (d) => ({ ...d, actions: await storage.getElevationPlanActions(d.id) }))
      );
      res.json({ plan, days: daysWithActions });
    } catch (error) {
      console.error("Elevation plan get error:", error);
      res.status(500).json({ error: "Failed to get elevation plan" });
    }
  });

  // PATCH /api/elevation-plans/:id – update plan title/goal/status
  app.patch("/api/elevation-plans/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const parsed = elevationPlanUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }
      // PR #17: when activating a plan, first verify the target plan exists/belongs to user
      // so we don't accidentally archive the current active plan for a non-existent target.
      if (parsed.data.status === "active") {
        const targetPlan = await storage.getElevationPlan(req.params.id, userId);
        if (!targetPlan) return res.status(404).json({ error: "Plan not found" });
        const currentActive = await storage.getActiveElevationPlan(userId);
        if (currentActive && currentActive.id !== req.params.id) {
          await storage.updateElevationPlan(currentActive.id, userId, { status: "archived" });
        }
      }
      const updated = await storage.updateElevationPlan(req.params.id, userId, parsed.data);
      if (!updated) return res.status(404).json({ error: "Plan not found" });

      // When activating a plan, bulk-create calendar events for all actions that
      // are not already linked to a calendar event (non-fatal: errors are logged).
      if (parsed.data.status === "active") {
        try {
          const days = await storage.getElevationPlanDays(updated.id);
          const daysWithActions = await Promise.all(
            days.map(async (d) => ({ ...d, actions: await storage.getElevationPlanActions(d.id) }))
          );
          for (const day of daysWithActions) {
            for (const action of day.actions) {
              const linked = action.linkedEntity as { type?: string; id?: string } | null;
              if (linked?.type === "calendar_event" && linked.id) continue; // already linked
              try {
                const { startTime, endTime } = buildActionEventTimes(
                  updated.startDate,
                  day.dayIndex,
                  action.timeOfDay,
                  action.durationMinutes
                );
                const calendarEvent = await storage.createCalendarEvent({
                  userId,
                  title: action.title,
                  description: action.description ?? "",
                  startTime,
                  endTime,
                  eventType: actionTypeToEventType(action.actionType),
                  linkedType: "elevation_action",
                  linkedId: action.id,
                  linkedRoute: "/elevation-plan",
                  linkedMeta: {
                    planTitle: updated.title ?? "",
                    planDayIndex: day.dayIndex,
                    actionType: action.actionType,
                  },
                });
                await storage.updateElevationPlanAction(action.id, userId, {
                  linkedEntity: { type: "calendar_event", id: calendarEvent.id },
                });
              } catch (actionErr) {
                console.error(`Failed to create calendar event for action ${action.id}:`, actionErr);
              }
            }
          }
        } catch (bulkErr) {
          console.error("Failed to bulk-create calendar events on plan activation:", bulkErr);
        }
      }

      res.json(updated);
    } catch (error) {
      console.error("Elevation plan update error:", error);
      res.status(500).json({ error: "Failed to update elevation plan" });
    }
  });

  // PATCH /api/elevation-plan-actions/:id – toggle complete, update text
  app.patch("/api/elevation-plan-actions/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const parsed = elevationPlanActionUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }
      const updated = await storage.updateElevationPlanAction(req.params.id, userId, parsed.data);
      if (!updated) return res.status(404).json({ error: "Action not found" });

      // Sync completion state to a linked task when isCompleted changes
      if (parsed.data.isCompleted !== undefined && updated.linkedEntity) {
        const linked = updated.linkedEntity as { type?: string; id?: string } | null;
        if (linked && linked.type === "task" && linked.id) {
          try {
            await storage.updateTaskForUser(linked.id, userId, {
              isCompleted: parsed.data.isCompleted,
              status: parsed.data.isCompleted ? "done" : "todo",
            });
          } catch {
            // Non-fatal: linked task may have been deleted externally
          }
        }
      }

      res.json(updated);
    } catch (error) {
      console.error("Elevation plan action update error:", error);
      res.status(500).json({ error: "Failed to update elevation plan action" });
    }
  });

  // ── Weekly Plan Reviews API (PR #15) ──────────────────────────────────────

  // GET /api/weekly-review/:planId – get the review for a specific plan
  app.get("/api/weekly-review/:planId", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { planId } = req.params;

      // Verify the plan belongs to this user
      const plan = await storage.getElevationPlan(planId, userId);
      if (!plan) return res.status(404).json({ error: "Plan not found" });

      // Fetch days+actions once – reused for both recap generation and response payload
      const rawDays = await storage.getElevationPlanDays(planId);
      const daysWithActions = await Promise.all(
        rawDays.map(async (d) => ({ ...d, actions: await storage.getElevationPlanActions(d.id) }))
      );

      // Get or auto-populate the review from plan completion data
      let review = await storage.getWeeklyPlanReview(planId, userId);
      if (!review) {
        // Auto-generate recap from plan completion stats (reuses already-fetched data)
        const wins: string[] = [];
        const frictionPoints: string[] = [];
        let totalActions = 0;
        let completedActions = 0;

        for (const day of daysWithActions) {
          for (const action of day.actions) {
            totalActions++;
            if (action.isCompleted) {
              completedActions++;
              wins.push(action.title);
            } else {
              frictionPoints.push(action.title);
            }
          }
        }

        const completionRate = totalActions > 0
          ? Math.round((completedActions / totalActions) * 100)
          : 0;

        review = await storage.createWeeklyPlanReview({
          userId,
          planId,
          wins: wins.slice(0, 10),
          frictionPoints: frictionPoints.slice(0, 10),
          completionRate,
          status: "draft",
        });
      }

      res.json({ review, plan, days: daysWithActions });
    } catch (error) {
      console.error("Weekly review get error:", error);
      res.status(500).json({ error: "Failed to get weekly review" });
    }
  });

  // POST /api/weekly-review/:planId – submit/update the weekly review
  app.post("/api/weekly-review/:planId", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { planId } = req.params;

      // Verify the plan belongs to this user
      const plan = await storage.getElevationPlan(planId, userId);
      if (!plan) return res.status(404).json({ error: "Plan not found" });

      const parsed = updateWeeklyPlanReviewSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }

      const existing = await storage.getWeeklyPlanReview(planId, userId);
      let review: import("@shared/schema").WeeklyPlanReview;
      if (existing) {
        const updated = await storage.updateWeeklyPlanReview(planId, userId, parsed.data);
        if (!updated) return res.status(404).json({ error: "Review not found" });
        review = updated;
      } else {
        review = await storage.createWeeklyPlanReview({
          userId,
          planId,
          ...parsed.data,
        });
      }

      // When submitted, archive the plan and update learning profile with wins/friction
      if (parsed.data.status === "submitted") {
        await storage.updateElevationPlan(planId, userId, { status: "archived" });

        // Update learning profile with wins and friction from the review
        const wins = review.wins ?? [];
        const frictionPoints = review.frictionPoints ?? [];
        const currentProfile = await storage.getLearningProfile(userId);
        const existingWins = (currentProfile?.wins ?? []) as string[];
        const existingFriction = (currentProfile?.frictionPoints ?? []) as string[];
        const mergedWins = [...new Set([...wins, ...existingWins])].slice(0, 20);
        const mergedFriction = [...new Set([...frictionPoints, ...existingFriction])].slice(0, 10);
        await storage.upsertLearningProfile(userId, {
          wins: mergedWins,
          frictionPoints: mergedFriction,
          lastFeedbackAt: new Date(),
        });
      }

      res.json(review);
    } catch (error) {
      console.error("Weekly review submit error:", error);
      res.status(500).json({ error: "Failed to submit weekly review" });
    }
  });

  // POST /api/elevation-plan-actions/:id/add-to-calendar – create a calendar event from a plan action
  app.post("/api/elevation-plan-actions/:id/add-to-calendar", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const parsed = elevationPlanAddToCalendarSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }

      const action = await storage.getElevationPlanActionForUser(req.params.id, userId);
      if (!action) return res.status(404).json({ error: "Action not found" });

      const existing = action.linkedEntity as { type?: string; id?: string } | null;
      if (existing?.type === "calendar_event" && existing.id) {
        return res.status(409).json({ error: "Action is already linked to a calendar event", calendarEventId: existing.id });
      }

      const { startTime, endTime } = buildActionEventTimes(
        parsed.data.planStartDate,
        parsed.data.planDayIndex,
        action.timeOfDay,
        action.durationMinutes
      );

      const calendarEvent = await storage.createCalendarEvent({
        userId,
        title: action.title,
        description: action.description ?? "",
        startTime,
        endTime,
        eventType: actionTypeToEventType(action.actionType),
        linkedType: "elevation_action",
        linkedId: action.id,
        linkedRoute: "/elevation-plan",
        linkedMeta: {
          planTitle: parsed.data.planTitle ?? "",
          planDayIndex: parsed.data.planDayIndex,
          actionType: action.actionType,
        },
      });

      const updatedAction = await storage.updateElevationPlanAction(action.id, userId, {
        linkedEntity: { type: "calendar_event", id: calendarEvent.id },
      });

      res.json({ action: updatedAction, calendarEvent });
    } catch (error) {
      console.error("Elevation plan add-to-calendar error:", error);
      res.status(500).json({ error: "Failed to add action to calendar" });
    }
  });

  // DELETE /api/elevation-plan-actions/:id/remove-from-calendar – remove linked calendar event
  app.delete("/api/elevation-plan-actions/:id/remove-from-calendar", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const action = await storage.getElevationPlanActionForUser(req.params.id, userId);
      if (!action) return res.status(404).json({ error: "Action not found" });

      const linked = action.linkedEntity as { type?: string; id?: string } | null;
      if (linked && linked.type === "calendar_event" && linked.id) {
        await storage.deleteCalendarEventForUser(linked.id, userId);
      }

      const updatedAction = await storage.updateElevationPlanAction(action.id, userId, {
        linkedEntity: null,
      });
      res.json({ action: updatedAction, success: true });
    } catch (error) {
      console.error("Elevation plan remove-from-calendar error:", error);
      res.status(500).json({ error: "Failed to remove action from calendar" });
    }
  });

  // POST /api/elevation-plan-actions/:id/add-to-tasks – create a task from a plan action
  app.post("/api/elevation-plan-actions/:id/add-to-tasks", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const parsed = elevationPlanAddToTasksSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }

      const action = await storage.getElevationPlanActionForUser(req.params.id, userId);
      if (!action) return res.status(404).json({ error: "Action not found" });

      const existing = action.linkedEntity as { type?: string; id?: string } | null;
      if (existing?.type === "task" && existing.id) {
        return res.status(409).json({ error: "Action is already linked to a task", taskId: existing.id });
      }

      // Compute due date for the plan day using pure date arithmetic (no UTC shift)
      const dueDate = addCalendarDays(parsed.data.planStartDate, parsed.data.planDayIndex - 1);

      const task = await storage.createTask({
        userId,
        title: action.title,
        description: action.description ?? "",
        status: "todo",
        isCompleted: false,
        dueDate,
        dimensionTags: [action.actionType],
        blueprintActionId: action.id,  // back-reference for bidirectional completion sync
      });

      const updatedAction = await storage.updateElevationPlanAction(action.id, userId, {
        linkedEntity: { type: "task", id: task.id },
      });

      res.json({ action: updatedAction, task });
    } catch (error) {
      console.error("Elevation plan add-to-tasks error:", error);
      res.status(500).json({ error: "Failed to add action to tasks" });
    }
  });

  // DELETE /api/elevation-plan-actions/:id/remove-from-tasks – remove linked task
  app.delete("/api/elevation-plan-actions/:id/remove-from-tasks", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const action = await storage.getElevationPlanActionForUser(req.params.id, userId);
      if (!action) return res.status(404).json({ error: "Action not found" });

      const linked = action.linkedEntity as { type?: string; id?: string } | null;
      if (linked && linked.type === "task" && linked.id) {
        await storage.deleteTask(linked.id);
      }

      const updatedAction = await storage.updateElevationPlanAction(action.id, userId, {
        linkedEntity: null,
      });
      res.json({ action: updatedAction, success: true });
    } catch (error) {
      console.error("Elevation plan remove-from-tasks error:", error);
      res.status(500).json({ error: "Failed to remove action from tasks" });
    }
  });

  // ── Reminders API (PR #7) ─────────────────────────────────────────────────

  // GET /api/reminders – list reminders for the authenticated user
  app.get("/api/reminders", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const items = await storage.getReminders(userId, status);
      res.json(items);
    } catch (err) {
      console.error("GET /api/reminders error:", err);
      res.status(500).json({ error: "Failed to fetch reminders" });
    }
  });

  // POST /api/reminders – create a reminder
  app.post("/api/reminders", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const parsed = insertReminderSchema.safeParse({ ...req.body, userId });
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid reminder data", details: parsed.error.flatten() });
      }
      const created = await storage.createReminder(parsed.data);
      res.status(201).json(created);
    } catch (err) {
      console.error("POST /api/reminders error:", err);
      res.status(500).json({ error: "Failed to create reminder" });
    }
  });

  // PATCH /api/reminders/:id – update status or reschedule
  app.patch("/api/reminders/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { id } = req.params;
      const { status, scheduledAt, title, body } = req.body as {
        status?: string;
        scheduledAt?: string;
        title?: string;
        body?: string;
      };
      const fields: Record<string, unknown> = {};
      if (status !== undefined) fields.status = status;
      if (scheduledAt !== undefined) fields.scheduledAt = new Date(scheduledAt);
      if (title !== undefined) fields.title = title;
      if (body !== undefined) fields.body = body;
      const updated = await storage.updateReminder(id, userId, fields as Parameters<typeof storage.updateReminder>[2]);
      if (!updated) return res.status(404).json({ error: "Reminder not found" });
      res.json(updated);
    } catch (err) {
      console.error("PATCH /api/reminders/:id error:", err);
      res.status(500).json({ error: "Failed to update reminder" });
    }
  });

  // POST /api/reminders/cancel-by-source – cancel reminders matching a source entity
  app.post("/api/reminders/cancel-by-source", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { sourceEntityType, sourceEntityId } = req.body as {
        sourceEntityType?: string;
        sourceEntityId?: string;
      };
      if (!sourceEntityType || !sourceEntityId) {
        return res.status(400).json({ error: "sourceEntityType and sourceEntityId are required" });
      }
      await storage.cancelRemindersBySource(userId, sourceEntityType, sourceEntityId);
      res.json({ success: true });
    } catch (err) {
      console.error("POST /api/reminders/cancel-by-source error:", err);
      res.status(500).json({ error: "Failed to cancel reminders" });
    }
  });

  // ── Learning Profile (PR #8: DW Learns) ───────────────────────────────────

  // GET /api/learning-profile – get profile for the authenticated user
  app.get("/api/learning-profile", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const profile = await storage.getLearningProfile(userId);
      if (!profile) {
        // Return sensible empty defaults so the client always gets a valid shape
        return res.json({
          preferredTimes: {},
          preferredActionTypes: [],
          sensitivity: {},
          frictionPoints: [],
          wins: [],
          avoid: [],
          lastFeedbackAt: null,
          learningEnabled: true,
          updatedAt: null,
        });
      }
      res.json(profile);
    } catch (err) {
      console.error("GET /api/learning-profile error:", err);
      res.status(500).json({ error: "Failed to fetch learning profile" });
    }
  });

  // PATCH /api/learning-profile – manual user edits
  app.patch("/api/learning-profile", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const parsed = updateUserLearningProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid data", details: parsed.error.flatten() });
      }
      const profile = await storage.upsertLearningProfile(userId, { ...parsed.data, lastFeedbackAt: new Date() });
      res.json(profile);
    } catch (err) {
      console.error("PATCH /api/learning-profile error:", err);
      res.status(500).json({ error: "Failed to update learning profile" });
    }
  });

  // POST /api/learning-profile/reset – reset all learned data
  app.post("/api/learning-profile/reset", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const profile = await storage.resetLearningProfile(userId);
      res.json(profile);
    } catch (err) {
      console.error("POST /api/learning-profile/reset error:", err);
      res.status(500).json({ error: "Failed to reset learning profile" });
    }
  });

  // POST /api/learning-profile/auto-update – internal endpoint for event-driven updates
  // Called from: daily check-in completion, reminder snooze/dismiss, plan action completion
  app.post("/api/learning-profile/auto-update", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const profile = await storage.getLearningProfile(userId);
      // Stop auto-updates if user has disabled learning
      if (profile && profile.learningEnabled === false) {
        return res.json({ skipped: true });
      }

      const autoUpdateSchema = z.discriminatedUnion("event", [
        z.object({
          event: z.literal("checkin"),
          payload: z.object({ constraintType: z.string().optional(), moodScore: z.number().optional() }).passthrough(),
        }),
        z.object({
          event: z.literal("reminder_snooze"),
          payload: z.object({ snoozedToHour: z.number().optional() }).passthrough(),
        }),
        z.object({
          event: z.literal("reminder_dismiss"),
          payload: z.object({}).passthrough(),
        }),
        z.object({
          event: z.literal("plan_action_complete"),
          payload: z.object({ actionType: z.string().optional(), title: z.string().optional() }).passthrough(),
        }),
        z.object({
          event: z.literal("followup_accept"),
          payload: z.object({ actionType: z.string().optional() }).passthrough(),
        }),
        z.object({
          event: z.literal("followup_dismiss"),
          payload: z.object({ actionType: z.string().optional() }).passthrough(),
        }),
      ]);

      const parsed = autoUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body for learning profile auto-update" });
      }

      const { event, payload } = parsed.data;

      const patch: Record<string, unknown> = {};

      if (event === "checkin") {
        // Learn from constraint types and mood trends
        const constraintType = payload.constraintType as string | undefined;
        if (constraintType && constraintType !== "none") {
          const current = await storage.getLearningProfile(userId);
          const fp = [...(current?.frictionPoints ?? [])];
          if (!fp.includes(constraintType)) {
            fp.unshift(constraintType);
            patch.frictionPoints = fp.slice(0, 5); // keep top 5
          }
        }
      } else if (event === "reminder_snooze") {
        // Snoozed reminders → lower reminder sensitivity or adjust time.
        // NOTE: _snoozeCount and _dismissCount are internal tracking keys stored
        // in the sensitivity JSON blob (prefixed with _ to distinguish them from
        // user-facing keys like "reminders"). They are not shown in the UI.
        const current = await storage.getLearningProfile(userId);
        const sens = { ...(current?.sensitivity ?? {}) };
        const snoozeCount = (parseInt(String(sens._snoozeCount ?? "0"), 10) || 0) + 1;
        sens._snoozeCount = String(snoozeCount);
        if (snoozeCount >= 3) {
          sens.reminders = "low";
        }
        patch.sensitivity = sens;
        // Learn preferred time from where the user snoozed TO (that's their actual preferred time)
        const snoozedToHour = payload.snoozedToHour;
        if (typeof snoozedToHour === "number") {
          const times = { ...(current?.preferredTimes ?? {}) };
          times.reminder = `${String(snoozedToHour).padStart(2, "0")}:00`;
          patch.preferredTimes = times;
        }
      } else if (event === "reminder_dismiss") {
        const current = await storage.getLearningProfile(userId);
        const sens = { ...(current?.sensitivity ?? {}) };
        const dismissCount = (parseInt(String(sens._dismissCount ?? "0"), 10) || 0) + 1;
        sens._dismissCount = String(dismissCount);
        if (dismissCount >= 5) {
          sens.reminders = "low";
        }
        patch.sensitivity = sens;
      } else if (event === "plan_action_complete") {
        // Learn from which action types get completed
        const actionType = payload.actionType as string | undefined;
        if (actionType) {
          const current = await storage.getLearningProfile(userId);
          const pat = [...(current?.preferredActionTypes ?? [])];
          if (!pat.includes(actionType)) {
            pat.unshift(actionType);
          } else {
            // Bubble to top
            const idx = pat.indexOf(actionType);
            pat.splice(idx, 1);
            pat.unshift(actionType);
          }
          patch.preferredActionTypes = pat.slice(0, 6);
          const wins = [...(current?.wins ?? [])];
          const winLabel = payload.title as string | undefined;
          if (winLabel && !wins.includes(winLabel)) {
            wins.unshift(winLabel);
            patch.wins = wins.slice(0, 10);
          }
        }
      } else if (event === "followup_accept") {
        const actionType = payload.actionType as string | undefined;
        if (actionType) {
          const current = await storage.getLearningProfile(userId);
          const pat = [...(current?.preferredActionTypes ?? [])];
          if (!pat.includes(actionType)) pat.push(actionType);
          patch.preferredActionTypes = pat.slice(0, 6);
        }
      } else if (event === "followup_dismiss") {
        const actionType = payload.actionType as string | undefined;
        if (actionType) {
          const current = await storage.getLearningProfile(userId);
          const avoid = [...(current?.avoid ?? [])];
          if (!avoid.includes(actionType)) avoid.push(actionType);
          patch.avoid = avoid.slice(0, 10);
        }
      }

      if (Object.keys(patch).length === 0) {
        return res.json({ skipped: true });
      }

      const updated = await storage.upsertLearningProfile(userId, patch as Parameters<typeof storage.upsertLearningProfile>[1]);
      res.json(updated);
    } catch (err) {
      console.error("POST /api/learning-profile/auto-update error:", err);
      res.status(500).json({ error: "Failed to auto-update learning profile" });
    }
  });

// Known analytics event names — must mirror client EVENTS constants.
// Hoisted to module scope so a new Set is not created on every request.
const ANALYTICS_KNOWN_EVENT_NAMES = new Set([
  "quick_setup_started", "quick_setup_completed", "starter_object_created",
  "dw_first_message_shown", "starter_spotlight_clicked", "starter_spotlight_dismissed",
  "app_opened_new_day", "completed_first_action",
  "followup_created", "followup_accepted", "followup_snoozed", "followup_dismissed",
  "plan_visited", "plan_activated", "plan_completed",
  "checkin_completed", "checkin_submitted",
  "reminder_set", "reminder_interacted",
]);

  // ===== ANALYTICS EVENTS ENDPOINT =====

  // POST /api/analytics/events
  // Accepts a batch of client-side analytics events and logs them server-side.
  // No authentication required; events must not include PII.
  // Rate-limited to prevent abuse.
  const analyticsLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many analytics requests" },
  });

  app.post("/api/analytics/events", analyticsLimiter, (req: Request, res: Response) => {
    try {
      const { events } = req.body as { events?: unknown };
      if (!Array.isArray(events)) {
        return res.status(400).json({ error: "events must be an array" });
      }

      // Truncate a string field to a safe length (prevents log injection)
      const truncate = (v: unknown, max = 64): string | undefined =>
        typeof v === "string" ? v.slice(0, max) : undefined;

      let logged = 0;
      for (const event of events.slice(0, 100)) {
        if (!event || typeof event !== "object") continue;
        const e = event as Record<string, unknown>;
        const name = truncate(e.name, 64);
        if (!name || !ANALYTICS_KNOWN_EVENT_NAMES.has(name)) continue;

        // Sanitize payload: keep only scalar/non-PII fields, cap string lengths
        const rawPayload = e.payload && typeof e.payload === "object" ? e.payload as Record<string, unknown> : {};
        const safePayload: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(rawPayload)) {
          if (typeof v === "number" || typeof v === "boolean") {
            safePayload[k] = v;
          } else if (typeof v === "string") {
            safePayload[k] = v.slice(0, 128);
          }
        }

        const ts = typeof e.ts === "number" ? e.ts : undefined;
        const env = e.env === "dev" || e.env === "prod" ? e.env : undefined;
        const sessionId = truncate(e.sessionId, 36);

        console.log("[analytics]", JSON.stringify({ name, payload: safePayload, ts, env, sessionId }));
        logged++;
      }

      return res.json({ received: logged });
    } catch (err) {
      console.error("POST /api/analytics/events error:", err);
      return res.status(500).json({ error: "Failed to process analytics events" });
    }
  });

  // AI health check – reports config status without exposing secret values
  app.get("/api/health/ai", (_req, res) => {
    const { configured, missing } = getAiConfigStatus();
    if (configured) {
      return res.json({ configured: true });
    }
    return res.status(503).json({ configured: false, missing });
  });

  // Email health check – lightweight, side-effect-free.
  // Reports whether email is configured and whether a custom sending domain is set,
  // based solely on environment variables to avoid repeatedly instantiating clients.
  app.get("/api/health/email", (_req, res) => {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;

    if (!apiKey) {
      return res.status(503).json({
        configured: false,
        error: "Email service not configured. Set RESEND_API_KEY (and optionally RESEND_FROM_EMAIL) environment variables.",
      });
    }

    const usingSharedDomain = !fromEmail;
    const resolvedFrom = fromEmail ?? 'onboarding@resend.dev';

    return res.json({
      configured: true,
      usingSharedDomain,
      fromAddress: resolvedFrom,
      hint: usingSharedDomain
        ? "Email will be sent from the Resend shared sender (onboarding@resend.dev). " +
          "To use a branded from-address, verify your domain at https://resend.com/domains " +
          "and set the RESEND_FROM_EMAIL environment variable."
        : "Custom sending domain is configured.",
    });
  });

  // OCR status – reports which OCR providers are available
  app.get("/api/ocr/status", (_req, res) => {
    const visionConfigured = googleVisionService.isConfigured();
    res.json({
      tesseract: true,
      googleVision: visionConfigured,
      enhancedOcrConfigured: visionConfigured,
      hint: visionConfigured
        ? "Both Tesseract and Google Vision OCR are available."
        : "Only basic OCR (Tesseract) is active. Set the GOOGLE_VISION_API_KEY environment variable to enable enhanced image text extraction.",
    });
  });

  // ─── Week Planner ─────────────────────────────────────────────────────────

  // Maps AI-planner categories to known calendar event types so all calendar
  // views (month, week, daily) apply the correct colour without a fallback.
  const PLANNER_CATEGORY_TO_EVENT_TYPE: Record<string, string> = {
    workout: "workout",
    meal: "meal",
    work: "event",
    personal: "event",
    social: "event",
    wellness: "meditation",
    sleep: "event",
  };

  // POST /api/week-planner/chat – AI conversation that builds a personalised weekly schedule
  app.post("/api/week-planner/chat", chatLimiter, requireAuth, async (req, res) => {
    try {
      const { message, conversationHistory, questionCount } = req.body;

      if (!message || typeof message !== "string" || message.trim().length === 0) {
        return res.status(400).json({ error: "Message content is required" });
      }
      if (message.length > DW_MAX_MESSAGE_CONTENT_LENGTH) {
        return res.status(400).json({ error: `Message is too long (max ${DW_MAX_MESSAGE_CONTENT_LENGTH} characters)` });
      }

      const aiConfig = getAiConfigStatus();
      if (!aiConfig.configured) {
        return res.status(503).json({ error: "AI is not configured on this server." });
      }

      const currentQuestionCount: number = typeof questionCount === "number" ? questionCount : 0;
      const today = new Date();
      const todayStr = today.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

      // Build message history for the AI – only allow "user" | "assistant" roles,
      // cap at 20 turns to avoid excessively large prompts.
      const ALLOWED_ROLES = new Set(["user", "assistant"]);
      const history: { role: "user" | "assistant"; content: string }[] = Array.isArray(conversationHistory)
        ? conversationHistory
            .filter(
              (m: unknown) =>
                m !== null &&
                typeof m === "object" &&
                typeof (m as Record<string, unknown>).role === "string" &&
                typeof (m as Record<string, unknown>).content === "string" &&
                ALLOWED_ROLES.has((m as Record<string, unknown>).role as string)
            )
            .slice(-20)
            .map((m: Record<string, unknown>) => ({ role: m.role as "user" | "assistant", content: m.content as string }))
        : [];

      const systemPrompt = `You are the DW Week Planner, a calm and thoughtful assistant that helps users build their personalised weekly schedule.

TODAY: ${todayStr}

YOUR GOAL: Gather information across up to 8 targeted questions, then propose a structured week plan.

QUESTIONS TO COVER (spread across the conversation, not all at once):
1. Wake time and morning energy
2. Work/school schedule and core commitments
3. Physical activity preferences and frequency
4. Meal preferences or prep habits
5. Evening wind-down or sleep goals
6. Social or personal commitments
7. Self-care or wellness priorities
8. Any blockers, constraints, or preferences

CURRENT QUESTION COUNT: ${currentQuestionCount} questions asked so far.

PHASE RULES:
- If questionCount < 7: Ask the NEXT unanswered question naturally. Keep responses brief and conversational (2-4 sentences). DO NOT produce a schedule yet.
- If questionCount >= 7: Summarise what you know, then produce the final schedule as JSON.

SCHEDULE JSON FORMAT (only when questionCount >= 7):
When ready, end your response with a JSON block in this exact format — no additional text after the JSON:

<SCHEDULE_JSON>
[
  {
    "id": "block-1",
    "title": "Morning Workout",
    "day": 1,
    "startTime": "07:00",
    "endTime": "08:00",
    "category": "workout",
    "why": "Aligns with your high morning energy on weekdays."
  }
]
</SCHEDULE_JSON>

FIELD RULES:
- "day": 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
- "startTime" and "endTime": HH:mm 24-hour format
- "category": one of workout, meal, work, personal, social, wellness, sleep
- "id": unique string like "block-1", "block-2" etc.
- "why": brief one-sentence rationale personalised to the user
- Propose 5–12 blocks spread across the week
- Always include sleep blocks, at least one meal prep or meal block, and blocks matching the user's stated priorities

TONE: Warm, grounded, non-prescriptive. Never preachy. Match the user's energy level.`;

      const messages: { role: "user" | "assistant" | "system"; content: string }[] = [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: message },
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        temperature: 0.7,
        max_tokens: 1200,
      });

      const rawResponse = completion.choices[0]?.message?.content || "I'm here to help plan your week. Could you tell me more?";

      // Extract schedule JSON if present
      let proposedSchedule: unknown[] | null = null;
      let cleanResponse = rawResponse;
      const jsonMatch = rawResponse.match(/<SCHEDULE_JSON>([\s\S]*?)<\/SCHEDULE_JSON>/);
      if (jsonMatch) {
        try {
          proposedSchedule = JSON.parse(jsonMatch[1].trim());
          cleanResponse = rawResponse.replace(/<SCHEDULE_JSON>[\s\S]*?<\/SCHEDULE_JSON>/, "").trim();
        } catch {
          // If JSON parse fails, treat as plain text response
        }
      }

      const newQuestionCount = Math.min(currentQuestionCount + 1, 8);
      const phase = proposedSchedule ? "proposal" : "questions";

      res.json({
        response: cleanResponse,
        questionCount: newQuestionCount,
        phase,
        ...(proposedSchedule ? { proposedSchedule } : {}),
      });
    } catch (error) {
      console.error("Week planner chat error:", error);
      res.status(500).json({ error: "Failed to process week planner message" });
    }
  });

  // POST /api/week-planner/confirm – save confirmed schedule blocks as calendar events
  // Accepts an optional `weekStart` (ISO string) from the client so server and
  // client anchor events to the same week. Falls back to the next Sunday if omitted.
  app.post("/api/week-planner/confirm", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { confirmedItems, weekStart: weekStartParam } = req.body;

      if (!Array.isArray(confirmedItems) || confirmedItems.length === 0) {
        return res.status(400).json({ error: "At least one schedule item must be confirmed" });
      }

      // Resolve week start: prefer the ISO string provided by the client so both
      // sides anchor to the same week; fall back to the upcoming Sunday.
      const computeNextSunday = () => {
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0=Sunday
        const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
        const d = new Date(now);
        d.setDate(now.getDate() + daysUntilSunday);
        return d;
      };
      let weekStart: Date;
      if (typeof weekStartParam === "string") {
        const parsed = new Date(weekStartParam);
        // Fall back to the same Sunday calculation if the client value is invalid
        weekStart = isNaN(parsed.getTime()) ? computeNextSunday() : parsed;
      } else {
        weekStart = computeNextSunday();
      }
      weekStart.setHours(0, 0, 0, 0);

      let created = 0;
      for (const item of confirmedItems) {
        // Guard against null/non-object entries
        if (!item || typeof item !== "object") continue;
        if (!(item as Record<string, unknown>).isConfirmed) continue;

        const day = (item as Record<string, unknown>).day;
        const startTimeRaw = (item as Record<string, unknown>).startTime;

        // Validate day is an integer in 0–6
        if (typeof day !== "number" || !Number.isInteger(day) || day < 0 || day > 6) continue;
        if (typeof startTimeRaw !== "string") continue;

        // Calculate the date for this block
        const eventDate = new Date(weekStart);
        eventDate.setDate(weekStart.getDate() + day);

        // Parse startTime (HH:mm)
        const [startHour, startMin] = startTimeRaw.split(":").map(Number);
        if (isNaN(startHour) || isNaN(startMin)) continue;
        eventDate.setHours(startHour, startMin, 0, 0);

        // Parse endTime (HH:mm) or default to +1 hour
        let endDate: Date;
        const endTimeRaw = (item as Record<string, unknown>).endTime;
        if (endTimeRaw && typeof endTimeRaw === "string") {
          const [endHour, endMin] = endTimeRaw.split(":").map(Number);
          endDate = new Date(eventDate);
          if (!isNaN(endHour) && !isNaN(endMin)) {
            endDate.setHours(endHour, endMin, 0, 0);
            // Handle overnight blocks (e.g. 22:00 → 06:00): advance end to next day
            if (endDate <= eventDate) {
              endDate.setDate(endDate.getDate() + 1);
            }
          } else {
            endDate = new Date(eventDate.getTime() + 60 * 60 * 1000);
          }
        } else {
          endDate = new Date(eventDate.getTime() + 60 * 60 * 1000);
        }

        // Map planner category to a known calendar event type
        const category = (item as Record<string, unknown>).category;
        const eventType =
          typeof category === "string" && PLANNER_CATEGORY_TO_EVENT_TYPE[category]
            ? PLANNER_CATEGORY_TO_EVENT_TYPE[category]
            : "event";

        try {
          const data = insertCalendarEventSchema.parse({
            userId,
            title: String((item as Record<string, unknown>).title || "Untitled block"),
            description: (item as Record<string, unknown>).description
              ? String((item as Record<string, unknown>).description)
              : null,
            startTime: eventDate.toISOString(),
            endTime: endDate.toISOString(),
            eventType,
          });
          await storage.createCalendarEvent(data);
          created++;
        } catch {
          // Skip invalid items rather than failing the whole batch
        }
      }

      res.json({ created });
    } catch (error) {
      console.error("Week planner confirm error:", error);
      res.status(500).json({ error: "Failed to save schedule. Please try again." });
    }
  });

  // ========================================
  // COMMUNITY OPPORTUNITIES (live data)
  // ========================================

  // Seed default opportunities on startup (no-op if already seeded)
  storage.seedDefaultCommunityOpportunities().catch((err) =>
    console.error("[community] seed error:", err),
  );

  // GET /api/community/opportunities — public; includes isSaved if authenticated
  app.get("/api/community/opportunities", async (req, res) => {
    try {
      const opportunities = await storage.getCommunityOpportunities();
      const userId = req.session.userId;
      const savedIds = userId
        ? await storage.getSavedCommunityOpportunityIds(userId)
        : [];

      const savedIdSet = new Set(savedIds);
      const result = opportunities.map((opp) => ({
        ...opp,
        discoveredAt: opp.createdAt ? opp.createdAt.getTime() : Date.now(),
        isSaved: savedIdSet.has(opp.id),
      }));
      res.json(result);
    } catch (error) {
      console.error("GET /api/community/opportunities error:", error);
      res.status(500).json({ error: "Failed to fetch community opportunities" });
    }
  });

  // POST /api/community/opportunities/saved — auth required
  app.post("/api/community/opportunities/saved", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const bodyResult = z.object({ opportunityId: z.string().min(1) }).safeParse(req.body);
      if (!bodyResult.success) {
        return res.status(400).json({ error: "opportunityId is required" });
      }
      await storage.saveCommunityOpportunity(userId, bodyResult.data.opportunityId);
      res.json({ success: true, saved: true });
    } catch (error) {
      console.error("POST /api/community/opportunities/saved error:", error);
      res.status(500).json({ error: "Failed to save opportunity" });
    }
  });

  // DELETE /api/community/opportunities/saved/:id — auth required
  app.delete("/api/community/opportunities/saved/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const idResult = z.string().min(1).safeParse(req.params.id);
      if (!idResult.success) {
        return res.status(400).json({ error: "Invalid opportunity id" });
      }
      await storage.unsaveCommunityOpportunity(userId, idResult.data);
      res.json({ success: true, saved: false });
    } catch (error) {
      console.error("DELETE /api/community/opportunities/saved error:", error);
      res.status(500).json({ error: "Failed to unsave opportunity" });
    }
  });

  // ── Browse: Entertainment (TV/Movies) ──────────────────────────────────────
  app.get("/api/browse/entertainment", async (req, res) => {
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
          model: "gpt-4o",
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
  app.get("/api/browse/activities", async (req, res) => {
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
      const hour = new Date().getHours();
      const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: `${personalCtx ? `About this person: ${personalCtx}.` : ""} It is ${timeOfDay}.

Suggest 6 specific activities they could do today. Mix indoor, outdoor, and social options. Each should feel like it was picked for THIS person — serve their goals and vibe. Some should be quick (15-30 min), some longer.

Return ONLY this JSON:
{"activities":[{"id":"a1","title":"Specific activity","description":"1-2 sentences — what to do exactly","type":"indoor or outdoor or social","duration":"30 min","whyPicked":"1 sentence why this fits them","canAddToSchedule":true,"suggestedTime":"${timeOfDay}"}]}` }],
        temperature: 0.8, max_tokens: 900,
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
  app.get("/api/browse/learning", async (req, res) => {
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
          model: "gpt-4o", messages: [{ role: "user", content: prompt }],
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
  app.get("/api/community/engage", async (req, res) => {
    try {
      const location = (req.query.location as string) || "my area";
      const type = (req.query.type as string) || "all";
      const perplexityApiKey = process.env.PERPLEXITY_API_KEY;
      const typeFilter = type === "volunteering" ? "volunteering opportunities" :
        type === "events" ? "community events" :
        type === "service" ? "community service" :
        "volunteering, community events, and service opportunities";
      const prompt = `Search the web and find 6-8 real ${typeFilter} in or near ${location}. Include real organizations, events, or programs with actual websites where possible.

Return ONLY this JSON:
{"opportunities":[{"id":"e1","title":"Opportunity name","organization":"Org name","description":"2 sentences about what it is and who can participate","type":"volunteering or event or service or resource","location":"${location}","schedule":"When/how often (e.g. Saturdays 9am, ongoing, one-time)","url":"https://real.url.if.available or null","tags":["wellness","community","etc"],"isVirtual":false}]}`;

      let opportunities: any[] = [];
      if (perplexityApiKey) {
        try {
          const pxRes = await fetch("https://api.perplexity.ai/chat/completions", { signal: AbortSignal.timeout(25000),
            method: "POST",
            headers: { "Authorization": `Bearer ${perplexityApiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "llama-3.1-sonar-large-128k-online",
              messages: [{ role: "user", content: prompt }],
              temperature: 0.2, max_tokens: 2000,
            }),
          });
          if (pxRes.ok) {
            const pxData = await pxRes.json();
            let raw = (pxData.choices?.[0]?.message?.content || "").trim();
            if (raw.startsWith("```")) raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
            const si = raw.indexOf("{"); const ei = raw.lastIndexOf("}");
            if (si !== -1 && ei !== -1) opportunities = JSON.parse(raw.substring(si, ei + 1)).opportunities || [];
          }
        } catch { /* non-fatal */ }
      }
      res.json({ opportunities, location });
    } catch (error) {
      console.error("community/engage error:", error);
      res.status(500).json({ opportunities: [], location: "" });
    }
  });

  // ── Community: Local groups/meetups by location ─────────────────────────────
  app.get("/api/community/groups/local", async (req, res) => {
    try {
      const location = (req.query.location as string) || "my area";
      const perplexityApiKey = process.env.PERPLEXITY_API_KEY;
      const prompt = `Search for real physical community groups, clubs, or meetups in or near ${location}. Look for wellness, fitness, social, hobby, book clubs, running clubs, yoga groups, mental health support groups, etc. Find real groups with actual websites.

Return ONLY this JSON:
{"groups":[{"id":"g1","name":"Group name","description":"What the group is about and who it's for","category":"fitness or wellness or social or learning or support","location":"${location}","schedule":"Meeting frequency/time","url":"https://real.url.if.known or null","membersEstimate":"e.g. 50+ members or unknown"}]}`;

      let groups: any[] = [];
      if (perplexityApiKey) {
        try {
          const pxRes = await fetch("https://api.perplexity.ai/chat/completions", { signal: AbortSignal.timeout(25000),
            method: "POST",
            headers: { "Authorization": `Bearer ${perplexityApiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "llama-3.1-sonar-large-128k-online",
              messages: [{ role: "user", content: prompt }],
              temperature: 0.2, max_tokens: 1800,
            }),
          });
          if (pxRes.ok) {
            const pxData = await pxRes.json();
            let raw = (pxData.choices?.[0]?.message?.content || "").trim();
            if (raw.startsWith("```")) raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
            const si = raw.indexOf("{"); const ei = raw.lastIndexOf("}");
            if (si !== -1 && ei !== -1) groups = JSON.parse(raw.substring(si, ei + 1)).groups || [];
          }
        } catch { /* non-fatal */ }
      }
      res.json({ groups, location });
    } catch (error) {
      console.error("community/groups/local error:", error);
      res.status(500).json({ groups: [], location: "" });
    }
  });

  // ── Community: In-app groups (CRUD) ─────────────────────────────────────────
  app.get("/api/community/groups/online", async (req, res) => {
    try {
      const rows = await db.select().from(communityGroups).orderBy(communityGroups.createdAt);
      const userId = req.session?.userId;
      let memberGroupIds: Set<string> = new Set();
      if (userId) {
        const memberships = await db.select().from(communityGroupMembers).where(eq(communityGroupMembers.userId, userId));
        memberGroupIds = new Set(memberships.map((m) => m.groupId));
      }
      const result = rows.map((g) => ({ ...g, isMember: memberGroupIds.has(g.id) }));
      res.json({ groups: result });
    } catch (error) {
      console.error("community/groups/online GET error:", error);
      res.status(500).json({ groups: [] });
    }
  });

  app.post("/api/community/groups", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { name, description, type, location, meetingUrl, meetingSchedule, tags } = req.body;
      if (!name?.trim()) return res.status(400).json({ error: "Group name is required" });
      const [group] = await db.insert(communityGroups).values({
        createdByUserId: userId,
        name: name.trim(),
        description: description?.trim() || null,
        type: type || "online_chat",
        location: location?.trim() || null,
        meetingUrl: meetingUrl?.trim() || null,
        meetingSchedule: meetingSchedule?.trim() || null,
        tags: tags || [],
        membersCount: 1,
        isPublic: true,
      }).returning();
      await db.insert(communityGroupMembers).values({ groupId: group.id, userId }).onConflictDoNothing();
      res.json(group);
    } catch (error) {
      console.error("POST /api/community/groups error:", error);
      res.status(500).json({ error: "Failed to create group" });
    }
  });

  app.post("/api/community/groups/:id/join", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const groupId = req.params.id;
      await pool.query(
        "INSERT INTO community_group_members (id, group_id, user_id) VALUES (gen_random_uuid(), $1, $2) ON CONFLICT (group_id, user_id) DO NOTHING",
        [groupId, userId]
      );
      await pool.query("UPDATE community_groups SET members_count = (SELECT COUNT(*) FROM community_group_members WHERE group_id = $1) WHERE id = $1", [groupId]);
      res.json({ joined: true });
    } catch (error) {
      console.error("POST /api/community/groups/:id/join error:", error);
      res.status(500).json({ error: "Failed to join group" });
    }
  });

  app.delete("/api/community/groups/:id/leave", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const groupId = req.params.id;
      await pool.query("DELETE FROM community_group_members WHERE group_id = $1 AND user_id = $2", [groupId, userId]);
      await pool.query("UPDATE community_groups SET members_count = GREATEST(members_count - 1, 0) WHERE id = $1", [groupId]);
      res.json({ left: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to leave group" });
    }
  });

  // ── Community: Posts / Group Chat ─────────────────────────────────────────────
  app.get("/api/community/posts", async (req, res) => {
    try {
      const groupId = req.query.groupId as string | undefined;
      const category = req.query.category as string | undefined;
      const userId = req.session?.userId;

      let rows = await db.select().from(communityPosts).orderBy(communityPosts.createdAt);
      // Filter by group
      if (groupId) rows = rows.filter((p) => p.groupId === groupId);
      // Filter to top-level posts only (replies are nested below)
      const topLevel = rows.filter((p) => !p.parentId);
      const replies = rows.filter((p) => !!p.parentId);
      // Apply category filter only on user posts
      const filtered = category && category !== "all"
        ? topLevel.filter((p) => p.category === category)
        : topLevel;

      let likedPostIds: Set<string> = new Set();
      if (userId) {
        const likes = await db.select().from(communityPostLikes).where(eq(communityPostLikes.userId, userId));
        likedPostIds = new Set(likes.map((l) => l.postId));
      }

      // Build reply map: parentId → replies array
      const replyMap: Record<string, any[]> = {};
      for (const r of replies) {
        if (!r.parentId) continue;
        if (!replyMap[r.parentId]) replyMap[r.parentId] = [];
        replyMap[r.parentId].push({ ...r, isLiked: likedPostIds.has(r.id) });
      }

      const result = filtered.reverse().map((p) => ({
        ...p,
        isLiked: likedPostIds.has(p.id),
        displayName: p.isAnonymous ? "Anonymous" : "Community Member",
        replies: replyMap[p.id] || [],
      }));
      res.json({ posts: result });
    } catch (error) {
      console.error("GET /api/community/posts error:", error);
      res.status(500).json({ posts: [] });
    }
  });

  app.post("/api/community/posts", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { title, body, category, isAnonymous, groupId } = req.body;
      if (!title?.trim() || !body?.trim()) return res.status(400).json({ error: "Title and body are required" });

      const [post] = await db.insert(communityPosts).values({
        userId,
        groupId: groupId || null,
        title: title.trim(),
        body: body.trim(),
        category: category || "general",
        isAnonymous: isAnonymous ?? false,
        isDwResponse: false,
      }).returning();

      res.json(post);

      // Generate DW AI response asynchronously (don't block the response)
      if (groupId) {
        try {
          // Get group context
          const groupRows = await pool.query("SELECT name, description, tags FROM community_groups WHERE id = $1", [groupId]);
          const group = groupRows.rows[0];
          // Get user context for personalization
          let userCtx = "";
          try {
            const [profile, onboarding] = await Promise.all([
              storage.getUserProfile(userId),
              storage.getOnboardingProfile(userId),
            ]);
            const firstName = profile?.firstName || "friend";
            userCtx = `The person who shared this: name is ${firstName}.`;
          } catch { /* non-fatal */ }

          const groupCtx = group ? `This is the "${group.name}" support group — ${group.description}` : "a wellness support group";

          const dwPrompt = `You are DW — a warm, emotionally intelligent AI companion facilitating a support group. ${groupCtx}.

${userCtx}

A community member just shared this post:
Title: "${title}"
Message: "${body}"

Write a brief, warm, supportive response (2-4 sentences max). 
- Acknowledge what they shared with genuine empathy
- Offer one gentle reflection, insight, or question to help them go deeper
- Never give medical advice or diagnose
- Tone: calm, caring, human — like a wise friend who truly listens
- Do NOT start with "DW here" or "As DW" — just speak naturally
- Do NOT use bullet points or headers

Response:`;

          const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: dwPrompt }],
            temperature: 0.8,
            max_tokens: 250,
          });

          const dwBody = completion.choices[0]?.message?.content?.trim() ?? "";
          if (dwBody) {
            await db.insert(communityPosts).values({
              userId: "dw-ai-system",
              groupId: groupId || null,
              parentId: post.id,
              isDwResponse: true,
              title: "DW Response",
              body: dwBody,
              category: "support",
              isAnonymous: false,
            });
            // Update comments count
            await pool.query("UPDATE community_posts SET comments_count = comments_count + 1 WHERE id = $1", [post.id]);
          }
        } catch (aiErr) {
          console.error("DW response generation error:", aiErr);
        }
      }
    } catch (error) {
      console.error("POST /api/community/posts error:", error);
      res.status(500).json({ error: "Failed to create post" });
    }
  });

  app.post("/api/community/posts/:id/like", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const postId = req.params.id;
      const existing = await db.select().from(communityPostLikes).where(eq(communityPostLikes.postId, postId));
      const alreadyLiked = existing.some((l) => l.userId === userId);
      if (alreadyLiked) {
        await db.delete(communityPostLikes).where(eq(communityPostLikes.postId, postId));
        await pool.query("UPDATE community_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = $1", [postId]);
        res.json({ liked: false });
      } else {
        await db.insert(communityPostLikes).values({ postId, userId }).onConflictDoNothing();
        await pool.query("UPDATE community_posts SET likes_count = likes_count + 1 WHERE id = $1", [postId]);
        res.json({ liked: true });
      }
    } catch (error) {
      console.error("POST /api/community/posts/:id/like error:", error);
      res.status(500).json({ error: "Failed to like post" });
    }
  });

  // ── DISCOVER FEED STATIC LIBRARY ────────────────────────────────────────────
  // Rich curated fallback content when AI is unavailable
  const DISCOVER_STATIC_LIBRARY = [
    // ── FOR YOU ──
    { type: "article", bucket: "for_you", title: "The 5-Minute Morning Reset That Changes Everything", summary: "A simple ritual used by top performers to start every day with intention rather than reaction.", synopsis: "Most people start their day by reaching for their phone. This simple reset takes just 5 minutes and rewires your morning for focus and calm. It involves three breaths, one intention, and one thing you're grateful for — nothing more. Over time, this micro-habit compounds into a life that feels authored, not accidental.", dwConnection: "Starting the day with intention directly nurtures your emotional and mental wellness dimensions.", url: "https://www.healthline.com/health/morning-routine", source: "Healthline", dimension: "emotional", readTime: "4 min read" },
    { type: "video", bucket: "for_you", title: "Andrew Huberman: The Science of a Perfect Morning", summary: "Stanford neuroscientist explains exactly what to do in the first 60 minutes after waking up.", synopsis: "Dr. Andrew Huberman walks through the neuroscience of morning light, cortisol timing, and how your first hour sets your dopamine baseline for the entire day. He explains why viewing natural light within 30 minutes of waking is the single most powerful biological lever available to you. This video changed the morning routines of millions.", dwConnection: "Understanding your biology is the foundation of sustainable physical and emotional wellness.", url: "https://www.youtube.com/watch?v=gR_f-iwUGY4", source: "YouTube", dimension: "physical", readTime: "Watch" },
    { type: "article", bucket: "for_you", title: "How to Build Habits That Actually Stick", summary: "James Clear's framework from Atomic Habits: why tiny changes create remarkable results.", synopsis: "Most people try to change too much at once. James Clear's research shows that 1% improvement, done consistently, leads to 37x improvement over a year. The key insight: don't set goals, design systems. Every habit has a cue, craving, response, and reward — and you can engineer all four. This framework has been applied by millions worldwide.", dwConnection: "Building sustainable habits is the foundation of every wellness dimension you're working to improve.", url: "https://jamesclear.com/atomic-habits", source: "James Clear", dimension: "general", readTime: "8 min read" },
    { type: "article", bucket: "for_you", title: "The Hidden Cost of Never Saying No", summary: "Why boundaries aren't walls — they're the architecture of a life that actually belongs to you.", synopsis: "Research from Brené Brown and others shows that people who struggle with boundaries often suffer chronic depletion, resentment, and a sense that their life is happening to them rather than by them. Saying no to the wrong things is saying yes to the right ones. This piece walks through practical scripts and the psychological shift required to make boundaries feel natural.", dwConnection: "Healthy boundaries are the bedrock of emotional wellness and sustainable social connection.", url: "https://brenebrown.com/resources/", source: "Brené Brown", dimension: "emotional", readTime: "6 min read" },
    { type: "video", bucket: "for_you", title: "This Is Your Brain on Gratitude", summary: "Neuroscientist explains what happens in the brain when you practice gratitude — and why it works.", synopsis: "Dr. Rick Hanson breaks down how gratitude physically rewires your brain over time. The brain has a negativity bias baked in from evolution — gratitude practice counteracts this by strengthening neural pathways associated with positive emotion, social connection, and resilience. Even 30 seconds a day has measurable effects within weeks.", dwConnection: "A regular gratitude practice is one of the most evidence-based tools for emotional regulation.", url: "https://www.youtube.com/watch?v=JMd1CcGZYwU", source: "YouTube", dimension: "emotional", readTime: "Watch" },
    { type: "article", bucket: "for_you", title: "Money Mindset: The Psychology Behind Financial Stress", summary: "Why your relationship with money is mostly emotional — and how to change it.", synopsis: "Financial therapists have found that most money problems aren't about math — they're about meaning. Our money scripts (beliefs formed in childhood) drive adult financial decisions unconsciously. Understanding and rewriting these scripts is the first step toward real financial peace. This article walks through three common money wounds and how to heal them.", dwConnection: "Your financial wellness dimension starts with self-awareness, not spreadsheets.", url: "https://www.psychologytoday.com/us/blog/financial-therapy", source: "Psychology Today", dimension: "financial", readTime: "7 min read" },
    { type: "article", bucket: "for_you", title: "Why Walking Is the Most Underrated Health Practice", summary: "Science keeps finding new benefits of daily walking — from brain health to longevity.", synopsis: "Walking 7,000–10,000 steps a day is associated with a 50–70% reduction in all-cause mortality risk. But beyond the cardiovascular benefits, walking is the only exercise that meaningfully reduces cortisol while simultaneously boosting creativity and mood. A 2019 Stanford study found that walking increased creative output by 81%. It's free, requires no gym, and works immediately.", dwConnection: "Movement is medicine — especially the kind that doesn't feel like medicine.", url: "https://www.health.harvard.edu/staying-healthy/5-surprising-benefits-of-walking", source: "Harvard Health", dimension: "physical", readTime: "5 min read" },
    { type: "video", bucket: "for_you", title: "Mel Robbins: How to Stop Screwing Yourself Over", summary: "One of the most-watched TED Talks ever — and the 5-second rule that changed millions of lives.", synopsis: "Mel Robbins discovered that the moment you feel resistance to doing something you know you should do, you have exactly 5 seconds before your brain talks you out of it. The 5-second rule is simple: count down 5-4-3-2-1 and physically move. It interrupts the habit loop and activates your prefrontal cortex. Simple, ridiculous, and it works.", dwConnection: "Taking action in the face of fear is the core of building momentum in any life dimension.", url: "https://www.youtube.com/watch?v=Lp7E973zozc", source: "YouTube", dimension: "general", readTime: "Watch" },
    // ── EXPLORE ──
    { type: "article", bucket: "explore", title: "The Japanese Art of Kintsugi: Beauty in Broken Things", summary: "The 500-year-old philosophy of repairing broken objects with gold — and what it teaches us about resilience.", synopsis: "Kintsugi, the Japanese art of repairing broken pottery with gold lacquer, is a profound metaphor for human resilience. Instead of hiding damage, kintsugi highlights it, treating breakage as part of the object's history rather than something to conceal. The philosophy behind it — wabi-sabi and mono no aware — suggests that imperfection is not just acceptable but beautiful. Psychologists have started using this concept in trauma therapy.", dwConnection: "Your breaks and scars are not weaknesses — they're where your light gets in. This is a deeply emotional and spiritual insight.", url: "https://en.wikipedia.org/wiki/Kintsugi", source: "Wikipedia", dimension: "spiritual", readTime: "5 min read" },
    { type: "article", bucket: "explore", title: "The Science of Flow: How to Enter Your Peak State", summary: "Mihaly Csikszentmihalyi's research on the state where time disappears and work becomes effortless.", synopsis: "Flow is the state of complete absorption where self-consciousness disappears and performance peaks. Psychologist Mihaly Csikszentmihalyi spent decades studying this state, interviewing artists, surgeons, chess players, and athletes. He found flow emerges when challenge slightly exceeds current skill level — not too easy (boredom), not too hard (anxiety). Learning to engineer flow conditions can transform any area of your life.", dwConnection: "Flow states are where your best work lives — and they're accessible in any dimension of your life.", url: "https://www.ted.com/talks/mihaly_csikszentmihalyi_flow_the_secret_to_happiness", source: "TED", dimension: "intellectual", readTime: "Watch" },
    { type: "article", bucket: "explore", title: "Forest Bathing: What the Japanese Have Known for Decades", summary: "Shinrin-yoku, the practice of spending time in forests, has extraordinary measurable health effects.", synopsis: "Japanese researchers have documented that spending time in forests reduces cortisol by 15%, blood pressure by 7%, and significantly boosts NK (natural killer) immune cells. These effects last 30 days after a single weekend in nature. The practice is called Shinrin-yoku — forest bathing — and it's now prescribed by some Japanese doctors. The key mechanism is phytoncides, organic compounds released by trees.", dwConnection: "Your environment shapes your biology. Environmental wellness isn't just about tidying your space — it's about what environments you choose.", url: "https://www.nationalgeographic.com/travel/article/forest-bathing", source: "National Geographic", dimension: "environmental", readTime: "6 min read" },
    { type: "article", bucket: "explore", title: "The Forgotten Science of Belonging", summary: "Loneliness is more dangerous than smoking 15 cigarettes a day. Here's what the research says.", synopsis: "Surgeon General Vivek Murthy declared loneliness an epidemic in 2023. The research is stark: chronic loneliness increases mortality risk by 26%, equivalent to smoking 15 cigarettes daily. Social connection isn't a nice-to-have — it's a biological necessity. Our nervous systems are literally calibrated to regulate via other humans. This article walks through the neuroscience of belonging and practical ways to build deeper connection.", dwConnection: "Social wellness is not about having many connections — it's about the quality of the ones you do have.", url: "https://www.hhs.gov/sites/default/files/surgeon-general-social-connection-advisory.pdf", source: "U.S. Surgeon General", dimension: "social", readTime: "8 min read" },
    { type: "video", bucket: "explore", title: "The Most Unknown Thing About How Memory Works", summary: "Every time you remember something, you rewrite it. Memory is reconstruction, not recording.", synopsis: "Memory researcher Elizabeth Loftus reveals one of the most counterintuitive findings in psychology: human memory is not a recording — it's a reconstruction. Every time you recall a memory, you subtly alter it. This means our memories of the past are partly fictional, edited by our present emotions and beliefs. The implications for identity, relationships, and self-improvement are profound.", dwConnection: "Understanding how your mind works is core to intellectual wellness and self-compassion.", url: "https://www.youtube.com/watch?v=PB2OegI6wvI", source: "YouTube", dimension: "intellectual", readTime: "Watch" },
    { type: "article", bucket: "explore", title: "Why Stoicism Is the Most Practical Philosophy Ever Written", summary: "Marcus Aurelius governed an empire while writing private notes to himself about not losing his mind.", synopsis: "The Stoics — Epictetus, Seneca, Marcus Aurelius — developed a philosophy for navigating chaos, loss, and uncertainty with equanimity. Epictetus was a slave. Marcus Aurelius was an emperor. Both concluded the same thing: the only thing you control is your response. Stoicism offers concrete daily practices (negative visualization, voluntary discomfort, memento mori) that train psychological resilience.", dwConnection: "Stoic practices directly build emotional regulation, resilience, and purposeful living.", url: "https://dailystoic.com/what-is-stoicism-a-definition-3-stoic-exercises-to-get-you-started/", source: "Daily Stoic", dimension: "spiritual", readTime: "7 min read" },
    { type: "article", bucket: "explore", title: "The Polyvagal Theory: Your Nervous System Is Running Your Life", summary: "Why you can't just 'think' your way out of anxiety — and what to do instead.", synopsis: "Dr. Stephen Porges' Polyvagal Theory explains that the autonomic nervous system has three states: safe and social, fight-or-flight, and shutdown. Most people shift between these states without knowing why. Once you understand your neuroception — how your nervous system reads safety — you can learn to regulate these states with specific somatic practices. This is the missing piece in most mental health conversations.", dwConnection: "Understanding your nervous system is foundational to emotional wellness and building safe, authentic relationships.", url: "https://www.nicabm.com/trauma-how-to-help-your-clients-understand-the-window-of-tolerance/", source: "NICABM", dimension: "emotional", readTime: "8 min read" },
    // ── RANDOM / SURPRISE ──
    { type: "fact", bucket: "random", title: "Cleopatra Lived Closer to the Moon Landing Than to the Building of the Pyramids", summary: "The Great Pyramid was built around 2560 BCE. Cleopatra lived in 69 BCE — 2,500 years later. The moon landing was 1969 CE — just 2,038 years after her. Time is genuinely strange.", synopsis: "The Great Pyramid of Giza was built around 2560 BCE. Cleopatra lived from 69–30 BCE — nearly 2,500 years after the pyramids. The Apollo 11 moon landing happened in 1969 CE, only 2,038 years after Cleopatra. This means she was temporally closer to Neil Armstrong's first step on the moon than to the pyramids she likely gazed upon as ancient history. History is not as evenly spaced as we imagine.", dwConnection: "Perspective is a superpower. When you zoom out on time, your current challenges find their proper proportion.", url: "", source: "Historical Research", dimension: "intellectual", readTime: "1 min" },
    { type: "quote", bucket: "random", title: "\"The cave you fear to enter holds the treasure you seek.\" — Joseph Campbell", summary: "Campbell spent his life studying mythology and found one story repeated across every culture: the hero's journey. The monster at the gate is always the guardian of the gift.", synopsis: "Joseph Campbell spent decades studying myths from every human culture and found a single pattern: the hero must descend into darkness, face their greatest fear, and only then return with the gift that heals their world. The cave metaphor is universal. Whatever you're avoiding — the difficult conversation, the creative risk, the vulnerable honesty — inside it is exactly what you need. The fear is the sign, not the warning.", dwConnection: "This applies to every dimension of your life. What are you circling around instead of entering?", url: "", source: "Joseph Campbell", dimension: "spiritual", readTime: "1 min" },
    { type: "spiritual", bucket: "random", title: "The Zen Teaching of 'Beginner's Mind'", summary: "In the beginner's mind there are many possibilities. In the expert's mind there are few. — Shunryu Suzuki", synopsis: "Shunryu Suzuki, the Zen master who brought Zen Buddhism to America, wrote: 'In the beginner's mind there are many possibilities. In the expert's mind there are few.' Beginner's mind means approaching each moment — a conversation, a meal, a problem — as if encountering it for the first time. The opposite is being so full of what you already know that nothing new can enter. Most of our suffering comes from insisting reality match our existing maps.", dwConnection: "Beginner's mind is the antidote to rigidity in any dimension — relationships, work, health habits, beliefs.", url: "", source: "Shunryu Suzuki, Zen Mind, Beginner's Mind", dimension: "spiritual", readTime: "1 min" },
    { type: "fact", bucket: "random", title: "Trees Communicate Through Underground Fungal Networks", summary: "Forests are not individual trees — they're communities. Mother trees send nutrients to young seedlings and dying trees redistribute resources to their neighbors.", synopsis: "Ecologist Suzanne Simard discovered that trees in forests are connected by vast underground fungal networks — sometimes called the 'Wood Wide Web.' Through these networks, older 'mother trees' send carbon, water, and nutrients to younger, struggling seedlings, including those of different species. When a tree is dying, it redistributes its resources to neighboring trees. Forests are not collections of individuals competing for resources — they're cooperative superorganisms.", dwConnection: "We are built for interdependence, not independence. This is true of trees, of neurons, and of human communities.", url: "https://www.youtube.com/watch?v=Un2yBgIAxYs", source: "TED Talk", dimension: "environmental", readTime: "1 min" },
    { type: "lesson", bucket: "random", title: "The 10-10-10 Rule for Hard Decisions", summary: "Ask yourself: how will I feel about this in 10 minutes? 10 months? 10 years? The answers usually make the right choice obvious.", synopsis: "Suzy Welch developed the 10-10-10 rule for cutting through the emotional fog of hard decisions. When facing a difficult choice, ask: How will I feel about this decision in 10 minutes? In 10 months? In 10 years? The short-term answer addresses immediate emotion. The medium-term grounds you in your season of life. The long-term connects you to your values. Most regrets live in the 10-year column — and so do most of the things that matter.", dwConnection: "Good decision-making is a foundational life skill that improves every dimension — relationships, career, health, money.", url: "", source: "Suzy Welch", dimension: "intellectual", readTime: "1 min" },
    { type: "spiritual", bucket: "random", title: "Viktor Frankl's Discovery in the Concentration Camp", summary: "Everything can be taken from a man but one thing: the last of the human freedoms — to choose one's attitude in any given set of circumstances.", synopsis: "Viktor Frankl, psychiatrist and Holocaust survivor, observed in Auschwitz that the prisoners who survived the longest were not the physically strongest — they were the ones who maintained a sense of meaning. He wrote: 'When we are no longer able to change a situation, we are challenged to change ourselves.' From his experience emerged logotherapy — the idea that meaning is the primary human motivational force, not pleasure or power.", dwConnection: "Meaning-making is not passive — it's an active, daily practice. This touches your purpose and spiritual dimensions profoundly.", url: "", source: "Viktor Frankl, Man's Search for Meaning", dimension: "purpose", readTime: "1 min" },
    { type: "fact", bucket: "random", title: "Your Body Replaces Almost Every Cell Every 7–10 Years", summary: "The 'you' of 10 years ago is physically almost entirely gone. You are always becoming, never just being.", synopsis: "Most of the cells in your body are replaced over time. Your red blood cells live 120 days. Liver cells: about a year. Bone cells: 10 years. Even neurons, long thought to be permanent, have some turnover. The implication is profound: you are not a fixed object but a continuous process. The 'you' who made a mistake 10 years ago is literally, atomically, not the same person. Transformation is not metaphorical — it's biological.", dwConnection: "You are built to change. Stagnation is the anomaly, not the norm. This truth belongs to your physical and emotional dimensions.", url: "", source: "Scientific Research", dimension: "physical", readTime: "1 min" },
    { type: "quote", bucket: "random", title: "\"The present moment always will have been.\" — Eckhart Tolle", summary: "Whatever good you experience right now is permanent in a way nothing can undo. It happened. It's real. Forever.", synopsis: "Eckhart Tolle offers a radical comfort: the present moment, once lived, is eternally woven into the fabric of what has happened. No future suffering can un-happen your joy. The kindness you gave, the peace you felt, the love you experienced — these are indestructible facts. This realization shifts our relationship with impermanence. We don't need to cling to good moments because they're already safe. They will always have been.", dwConnection: "This perspective is a profound gift for emotional wellness, especially during difficult seasons.", url: "", source: "Eckhart Tolle", dimension: "spiritual", readTime: "1 min" },
    { type: "lesson", bucket: "random", title: "The Ownership Paradox: Why Accepting Responsibility Feels Like Freedom", summary: "The moment you take full ownership of your situation is the moment you regain the power to change it.", synopsis: "Jocko Willink, in Extreme Ownership, argues that the most powerful shift available to any person is total personal responsibility. Not blame, not self-flagellation — ownership. When you own a problem completely, you also own the solution. This is counterintuitive: accepting that something is 'your fault' feels like losing, but it's actually the only path to agency. Victims wait. Owners act.", dwConnection: "Ownership thinking transforms every life dimension — from relationships to finances to health. It's not about blame. It's about power.", url: "", source: "Jocko Willink, Extreme Ownership", dimension: "purpose", readTime: "1 min" },
    { type: "fact", bucket: "random", title: "Humans Are the Only Animals That Voluntarily Delay Sleep", summary: "Every other species sleeps when it's tired. Only humans override this biological signal — and it's destroying our health.", synopsis: "Sleep scientist Matthew Walker calls voluntary sleep deprivation a catastrophic modern phenomenon. No other animal on earth voluntarily stays awake when its body signals sleep. Humans alone override this with artificial light, deadlines, and entertainment. The costs are staggering: impaired immunity, emotional dysregulation, cognitive decline, increased cancer risk, and reduced lifespan. Sleeping less to do more is, mathematically, doing less — because everything you do suffers.", dwConnection: "Sleep is the foundation. Without it, every other wellness habit is undermined. This belongs to your physical dimension.", url: "https://www.sleepfoundation.org/how-sleep-works/why-do-we-need-sleep", source: "Sleep Foundation", dimension: "physical", readTime: "1 min" },
  ];

  // ── DISCOVER FEED ──────────────────────────────────────────────────────────
  // GET /api/discover/feed?page=1
  // Returns a mixed batch of AI-curated content cards (for_you | explore | random)
  app.get("/api/discover/feed", async (req, res) => {
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

  // ── Notifications ─────────────────────────────────────────────────────────
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const notifs = await storage.getUserNotifications(req.session.userId!);
      res.json(notifs);
    } catch (err) {
      console.error("GET /api/notifications error:", err);
      res.status(500).json([]);
    }
  });

  app.get("/api/notifications/count", requireAuth, async (req, res) => {
    try {
      const count = await storage.getUnreadNotificationCount(req.session.userId!);
      res.json({ count });
    } catch (err) {
      res.json({ count: 0 });
    }
  });

  app.put("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      await storage.markNotificationRead(req.params.id, req.session.userId!);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  });

  app.put("/api/notifications/read-all", requireAuth, async (req, res) => {
    try {
      await storage.markAllNotificationsRead(req.session.userId!);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  });

  app.delete("/api/notifications/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteNotification(req.params.id, req.session.userId!);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  });

  // Generate DW daily affirmation notification (called on app open, max once per day)
  app.post("/api/notifications/dw-daily", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const today = new Date().toISOString().split("T")[0];
      // Check if we already sent one today
      const existing = await storage.getUserNotifications(userId);
      const alreadySent = existing.some((n: any) => n.type === "dw_affirmation" && n.created_at?.toISOString?.()?.startsWith(today));
      if (alreadySent) return res.json({ sent: false });

      const user = await storage.getUser(userId);
      const name = (user as any)?.systemName || (user as any)?.firstName || "friend";
      const hour = new Date().getHours();
      const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

      let affirmation = `Good ${timeOfDay}, ${name}. Today is a fresh opportunity to move toward who you're becoming. You don't have to do it all — just one step.`;
      try {
        const { generateAffirmation } = await import("./openai");
        affirmation = await generateAffirmation(name, timeOfDay);
      } catch (_) {}

      const notif = await storage.createNotification({
        userId,
        type: "dw_affirmation",
        title: `Good ${timeOfDay}, ${name} ✨`,
        body: affirmation,
        actionUrl: "/talk",
      });
      res.json({ sent: true, notification: notif });
    } catch (err) {
      console.error("DW daily affirmation error:", err);
      res.status(500).json({ sent: false });
    }
  });

  // ── Evening Check-In ───────────────────────────────────────────────────────
  app.get("/api/accountability/check-in-status", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();
      const today = now.toISOString().split("T")[0];
      const yesterday = new Date(now.getTime() - 86400000).toISOString().split("T")[0];

      // Pull existing check-in for today
      const existing = await storage.getTodayCheckIn(userId);
      // Check if yesterday was missed
      let yesterdayCheckIn: any = null;
      try {
        const ei = await (storage as any).getCheckInByDate?.(userId, yesterday);
        yesterdayCheckIn = ei || null;
      } catch (_) {}

      // Compute optimal check-in time from user preferences
      let optimalHour = 21; // default 9 PM
      let optimalMinute = 30;
      try {
        const prefs = await storage.getUserSystemPreferences(userId);
        if (prefs?.preferredSleepTime) {
          // preferredSleepTime like "23:00" or "11:00 PM"
          const match = prefs.preferredSleepTime.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
          if (match) {
            let h = parseInt(match[1]);
            const m = parseInt(match[2]);
            const meridiem = match[3]?.toLowerCase();
            if (meridiem === "pm" && h < 12) h += 12;
            if (meridiem === "am" && h === 12) h = 0;
            // Optimal check-in = 90 minutes before sleep
            const optimalTotal = h * 60 + m - 90;
            optimalHour = Math.floor(optimalTotal / 60);
            optimalMinute = optimalTotal % 60;
            if (optimalHour < 0) optimalHour = 21; // fallback
          }
        }
      } catch (_) {}

      // Count today's calendar events (planned tasks) as context
      let todayTaskCount = 0;
      try {
        const events = await storage.getCalendarEvents(userId);
        todayTaskCount = events.filter((e: any) => {
          const st = e.startTime || "";
          return st.startsWith(today);
        }).length;
      } catch (_) {}

      // Time of day classification
      const nowMinutes = hour * 60 + minute;
      const optimalMinutes = optimalHour * 60 + optimalMinute;
      const isEarlyMorning = hour >= 4 && hour < 10;
      const isMorning = hour >= 10 && hour < 14;
      const isAfternoon = hour >= 14 && hour < 18;
      const isEvening = hour >= 18 && hour < 22;
      const isNight = hour >= 22 || hour < 4;
      const pastOptimalTime = nowMinutes >= optimalMinutes;
      const completedToday = !!existing;

      // Determine scenario
      // "needsCheckIn" = should show the modal now
      // "missedCheckIn" = they had a chance yesterday and didn't do it
      const missedYesterday = !yesterdayCheckIn;

      let needsCheckIn = false;
      let timeContext = "none";
      let contextTitle = "How did today go?";
      let contextBody = "DW wants to help you reflect and set up tomorrow.";
      let showMissedCount = false;

      if (!completedToday) {
        if (pastOptimalTime && isEvening) {
          // Prime time — optimal evening window
          needsCheckIn = true;
          timeContext = "prime_evening";
          contextTitle = "Time to check in";
          contextBody = "DW is ready whenever you are — a quick reflection goes a long way.";
        } else if (isNight && hour >= 22) {
          // Late evening / night, still same day
          needsCheckIn = true;
          timeContext = "late_night";
          contextTitle = "Still up?";
          contextBody = "Before you wind down — a quick reflection so tomorrow starts clear.";
        } else if (isNight && hour < 4) {
          // Very late / early hours — brief and non-pressuring
          needsCheckIn = true;
          timeContext = "very_late";
          contextTitle = "Late night…";
          contextBody = "No pressure — just a quick word with DW before you sleep. Totally optional.";
        } else if (isEarlyMorning && missedYesterday) {
          // Woke up, missed yesterday
          needsCheckIn = true;
          timeContext = "missed_morning";
          contextTitle = "Yesterday slipped by";
          contextBody = todayTaskCount > 0
            ? `You had ${todayTaskCount} things on the agenda — before today starts, want to close out yesterday?`
            : "Before today begins, want to close out yesterday with DW?";
          showMissedCount = true;
        } else if (isMorning && missedYesterday) {
          // Morning, missed yesterday
          needsCheckIn = true;
          timeContext = "missed_day_start";
          contextTitle = "A quick close-out";
          contextBody = todayTaskCount > 0
            ? `Yesterday had ${todayTaskCount} things planned. Before this day gets going — want to reflect?`
            : "Yesterday went uncaptured. Before this day gets going — a quick reflection?";
          showMissedCount = true;
        } else if (isAfternoon && missedYesterday) {
          // Afternoon, missed yesterday — lighter nudge
          needsCheckIn = true;
          timeContext = "missed_afternoon";
          contextTitle = "Yesterday's reflection";
          contextBody = "DW noticed you didn't check in yesterday. Even a one-line recap helps you stay aligned.";
          showMissedCount = true;
        }
        // else: before optimal window and no missed check-in → don't prompt yet
      }

      res.json({
        needsCheckIn,
        completed: completedToday,
        timeContext,
        contextTitle,
        contextBody,
        optimalHour,
        optimalMinute,
        missedYesterday,
        todayTaskCount,
        showMissedCount,
        hour,
        minute,
        today,
        yesterday,
      });
    } catch (err) {
      res.json({ needsCheckIn: false, completed: false, timeContext: "none" });
    }
  });

  app.post("/api/accountability/evening-check-in", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { userNotes, energyScore, completedSummary, timeContext, missedTaskCount } = req.body;
      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const hour = now.getHours();

      let dwAnalysis = "Thank you for checking in. Every day you show up for yourself counts — even the imperfect ones.";
      try {
        const { generateCheckInAnalysis } = await import("./openai");
        const user = await storage.getUser(userId);
        const name = (user as any)?.systemName || (user as any)?.firstName || "friend";
        const goals = await storage.getGoals(userId);
        dwAnalysis = await generateCheckInAnalysis(
          name,
          userNotes || "",
          energyScore || 5,
          goals.map((g: any) => g.title),
          { timeContext: timeContext || "prime_evening", hour, missedTaskCount: missedTaskCount || 0 }
        );
      } catch (_) {}

      const checkIn = await storage.createEveningCheckIn({ userId, checkInDate: today, userNotes, completedSummary, dwAnalysis, energyScore });

      await storage.createNotification({
        userId,
        type: "accountability",
        title: "Check-in saved ✓",
        body: dwAnalysis.slice(0, 120) + (dwAnalysis.length > 120 ? "…" : ""),
        actionUrl: "/talk",
      });

      res.json({ checkIn, dwAnalysis });
    } catch (err) {
      console.error("Evening check-in error:", err);
      res.status(500).json({ error: "Failed to save check-in" });
    }
  });

  // ── Username Setup ─────────────────────────────────────────────────────────
  app.get("/api/users/check-username", async (req, res) => {
    const { username } = req.query as { username: string };
    if (!username || username.length < 3) return res.json({ available: false, reason: "Too short" });
    if (!/^[a-zA-Z0-9_.-]+$/.test(username)) return res.json({ available: false, reason: "Only letters, numbers, _ . -" });
    try {
      const existing = await storage.getUserByUsername(username);
      res.json({ available: !existing });
    } catch (err) {
      res.status(500).json({ available: false });
    }
  });

  app.post("/api/users/set-username", requireAuth, async (req, res) => {
    try {
      const { username, systemName } = req.body;
      if (!username || username.length < 3) return res.status(400).json({ error: "Username too short" });
      if (!/^[a-zA-Z0-9_.-]+$/.test(username)) return res.status(400).json({ error: "Invalid characters" });
      const existing = await storage.getUserByUsername(username);
      if (existing && existing.id !== req.session.userId) return res.status(409).json({ error: "Username taken" });
      await storage.setUsername(req.session.userId!, username, systemName);
      res.json({ ok: true });
    } catch (err) {
      console.error("Set username error:", err);
      res.status(500).json({ error: "Failed" });
    }
  });

  app.patch("/api/users/me", requireAuth, async (req, res) => {
    try {
      const { firstName } = req.body;
      if (typeof firstName !== "string" || !firstName.trim()) {
        return res.status(400).json({ error: "Invalid name" });
      }
      const updated = await storage.updateUser(req.session.userId!, { firstName: firstName.trim().slice(0, 50) });
      res.json({ ok: true, firstName: updated?.firstName });
    } catch (err) {
      console.error("Update user name error:", err);
      res.status(500).json({ error: "Failed to update name" });
    }
  });

  // ── Discover Filter (AI-tailored) ──────────────────────────────────────────
  app.get("/api/discover/filter", async (req, res) => {
    try {
      const { bucket, type: contentType, dimension } = req.query as Record<string, string>;
      const userId = req.session?.userId;
      let profileCtx = "";
      if (userId) {
        try {
          const profile = await storage.getUserProfile(userId);
          const goals = (await storage.getGoals(userId)).filter((g: any) => g.status === "active");
          const lp = (profile as any)?.lifestylePreferences;
          profileCtx = [
            profile?.interests?.length && `Interests: ${(profile.interests as string[]).join(", ")}`,
            lp?.identityVision && `Identity: ${lp.identityVision}`,
            goals.length && `Goals: ${goals.map((g: any) => g.title).join(", ")}`,
          ].filter(Boolean).join(". ");
        } catch (_) {}
      }

      // Import the static library from discover feed logic and filter it
      const { DISCOVER_STATIC_LIBRARY } = await import("./discover-static");
      let filtered: any[] = [...DISCOVER_STATIC_LIBRARY];
      if (bucket && bucket !== "all") filtered = filtered.filter((c: any) => c.bucket === bucket);
      if (contentType && contentType !== "all") filtered = filtered.filter((c: any) => c.type === contentType);
      if (dimension && dimension !== "all") filtered = filtered.filter((c: any) => c.dimension?.toLowerCase() === dimension.toLowerCase());

      // Shuffle
      filtered = filtered.sort(() => Math.random() - 0.5);
      res.json({ cards: filtered, filtered: true });
    } catch (err) {
      console.error("Discover filter error:", err);
      res.status(500).json({ cards: [] });
    }
  });

  // ── DW Smart Import ───────────────────────────────────────────────────────
  // Auto-detects content type and extracts structured data from any pasted text
  app.post("/api/life-system/import/parse", requireAuth, async (req, res) => {
    try {
      const { text } = req.body;
      if (!text || typeof text !== "string" || text.trim().length < 20) {
        return res.status(400).json({ error: "Please paste some content for DW to read." });
      }
      const trimmed = text.trim();

      // ── Primary: rule-based parser (works without AI) ─────────────────────
      const parsed = parseLifeSystemRuleBased(trimmed);
      console.log(`[dw-import] parsed: types=${parsed.detectedTypes.join(",")}, goals=${parsed.goals.length}, rules=${parsed.coreRules.length}`);
      res.json({ parsed });
    } catch (err: any) {
      console.error("DW import parse error:", err?.message);
      res.status(500).json({ error: "Could not read your content. Please try again." });
    }
  });

  // Apply parsed life system to the user's account
  app.post("/api/life-system/import/apply", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { parsed, scheduleFrequency, startDate, conflictResolutions } = req.body as {
        parsed: import("./life-system-parser.js").ParsedLifeSystem;
        scheduleFrequency: "weekly" | "biweekly" | "every3weeks" | "monthly";
        startDate: string;
        conflictResolutions: Record<string, "keep_existing" | "use_new">;
      };

      const { getScheduleDates, getDayDate, formatDateStr, getWeekMondayStart } =
        await import("./life-system-parser.js");

      const results: Record<string, number> = {
        goals: 0, habits: 0, insights: 0, routines: 0, calendarEvents: 0, groceryItems: 0, meals: 0, workouts: 0,
      };

      // 0. Clear previous life-system import data so re-imports don't double-book
      await storage.clearLifeSystemImportData(userId);

      // Helper: get current user calendar events for dedup (catches old imports without source marker)
      const existingCalEvents = await storage.getCalendarEvents(userId);
      const calEventKey = (title: string, startTime: string) =>
        `${title.toLowerCase().trim()}|${startTime}`;
      const existingCalKeys = new Set(existingCalEvents.map((e) => calEventKey(e.title, e.startTime)));

      // Wrap calendar event creation with dedup + source marker
      const createCalEvent = async (eventData: Parameters<typeof storage.createCalendarEvent>[0]) => {
        const key = calEventKey(eventData.title, eventData.startTime);
        if (existingCalKeys.has(key)) return null;
        existingCalKeys.add(key);
        const enriched = {
          ...eventData,
          linkedMeta: { ...(eventData.linkedMeta ?? {}), source: "life_system_import" },
        };
        return storage.createCalendarEvent(enriched);
      };

      // 1. Goals — merge/replace based on conflict resolutions
      const existingGoals = await storage.getGoals(userId);
      for (const g of (parsed.goals ?? [])) {
        const existing = existingGoals.find(
          (e) => e.title.toLowerCase().trim() === g.title.toLowerCase().trim()
        );
        if (existing) {
          const resolution = conflictResolutions?.[g.title];
          if (resolution === "use_new") {
            await storage.updateGoal(existing.id, {
              description: g.description,
              wellnessDimension: g.wellnessDimension,
            });
            results.goals++;
          }
          // if "keep_existing" or undefined, skip
        } else {
          await storage.createGoal({
            userId,
            title: g.title,
            description: g.description,
            wellnessDimension: g.wellnessDimension,
            isActive: true,
            dataSource: "life_system_import",
          });
          results.goals++;
        }
      }

      // 2. Core rules → habits + insights (deduplicated)
      const existingHabits = await storage.getHabits(userId);
      const existingInsights = await storage.getDwInsights(userId);
      const existingHabitTitles = new Set(existingHabits.map((h) => h.title.toLowerCase().trim()));
      const existingInsightLines = new Set(
        existingInsights.map((i) => (i.insightLine ?? "").toLowerCase().trim())
      );

      for (const rule of (parsed.coreRules ?? [])) {
        const ruleText = typeof rule === "string" ? rule : (rule as any).text;
        const ruleDimension = typeof rule === "string" ? "purpose" : ((rule as any).wellnessDimension ?? "purpose");
        const ruleContext = typeof rule === "string" ? ruleText : ((rule as any).context ?? ruleText);
        if (!ruleText?.trim()) continue;

        // Save as habit (skip if already exists)
        if (!existingHabitTitles.has(ruleText.trim().toLowerCase())) {
          const freq = ruleText.toLowerCase().includes("sunday") ? "weekly" : "daily";
          await storage.createHabit({
            userId,
            title: ruleText.trim(),
            frequency: freq,
            isActive: true,
            dataSource: "life_system_import",
          });
          existingHabitTitles.add(ruleText.trim().toLowerCase());
          results.habits++;
        }

        // Save as insight (skip if already exists)
        if (!existingInsightLines.has(ruleText.trim().toLowerCase())) {
          await storage.createDwInsight({
            userId,
            title: `Life Rule: ${ruleText.trim()}`,
            summary: ruleContext,
            insightLine: ruleText.trim(),
            theme: ruleDimension,
            tags: ["core_rule", "life_system", ruleDimension],
            switchTag: ruleDimension,
            sourceConversationId: null,
          });
          existingInsightLines.add(ruleText.trim().toLowerCase());
          results.insights++;
        }
      }

      // 3. Morning routine
      if (parsed.morningRoutine?.steps?.length) {
        await storage.createRoutine({
          userId,
          name: parsed.morningRoutine.name || "Morning Routine",
          steps: parsed.morningRoutine.steps,
          totalDurationMinutes: parsed.morningRoutine.steps.reduce((acc, s) => {
            const m = parseInt(s.duration) || 0;
            return acc + m;
          }, 0),
          isActive: true,
          dataSource: "life_system_import",
        });
        results.routines++;
      }

      // 4. Wind Down routine
      if (parsed.windDownRoutine?.steps?.length) {
        await storage.createRoutine({
          userId,
          name: parsed.windDownRoutine.name || "Wind Down",
          steps: parsed.windDownRoutine.steps,
          totalDurationMinutes: parsed.windDownRoutine.steps.reduce((acc, s) => {
            const m = parseInt(s.duration) || 0;
            return acc + m;
          }, 0),
          isActive: true,
          dataSource: "life_system_import",
        });
        results.routines++;
      }

      // 5. Calendar events — create for each week based on frequency
      const refDate = startDate ? new Date(startDate) : new Date();
      const baseMonday = getWeekMondayStart(refDate);
      const weekStarts = getScheduleDates(scheduleFrequency || "weekly", baseMonday);
      const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

      for (const weekStart of weekStarts) {
        for (const dayName of DAYS) {
          const dayData = parsed.weeklySchedule?.[dayName];
          if (!dayData) continue;
          const dayDate = getDayDate(weekStart, dayName);

          // Workout event
          if (dayData.workout?.title) {
            const wTime = dayData.workout.time || "18:00";
            const [wH, wM] = wTime.split(":").map(Number);
            const endH = String(wH + 1).padStart(2, "0");
            const wStart = formatDateStr(dayDate, `${String(wH).padStart(2, "0")}:${String(wM || 0).padStart(2, "0")}`);
            const wEnd = formatDateStr(dayDate, `${endH}:${String(wM || 0).padStart(2, "0")}`);

            const evt = await createCalEvent({
              userId,
              title: dayData.workout.title,
              description: `Workout: ${dayData.workout.exercises?.map(e => e.name).join(", ") || ""}`,
              startTime: wStart,
              endTime: wEnd,
              eventType: "workout",
              dimensionTags: ["physical"],
              linkedType: "workout",
              linkedRoute: "/workout",
              linkedMeta: { exercises: dayData.workout.exercises },
            });

            if (evt) {
              // Add exercises as tasks
              if (dayData.workout.exercises?.length) {
                for (const ex of dayData.workout.exercises) {
                  const label = [ex.name, ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : "", ex.notes].filter(Boolean).join(" — ");
                  await storage.createEventTask({
                    calendarEventId: evt.id,
                    userId,
                    title: label,
                    isCompleted: false,
                    dwSuggested: false,
                    linkedRoute: "/workout",
                  });
                }
              }
              results.calendarEvents++;
            }
          }

          // Meal events — use the exact meal times from the parsed document
          const mealSlots = [
            { key: "breakfast", label: "Breakfast", time: "07:00", endTime: "07:30" },
            { key: "lunch", label: "Lunch", time: "12:00", endTime: "13:00" },
            { key: "dinner", label: "Dinner", time: "19:00", endTime: "19:45" },
            { key: "snack", label: "Snack", time: "21:00", endTime: "21:15" },
          ] as const;
          for (const slot of mealSlots) {
            const items = dayData.meals?.[slot.key];
            if (!items?.length) continue;
            const sStart = formatDateStr(dayDate, slot.time);
            const sEnd = formatDateStr(dayDate, slot.endTime);
            const mEvt = await createCalEvent({
              userId,
              title: `${slot.label}: ${items.slice(0, 2).join(", ")}${items.length > 2 ? "…" : ""}`,
              description: items.join(", "),
              startTime: sStart,
              endTime: sEnd,
              eventType: "meal",
              dimensionTags: ["physical"],
              linkedType: "meal",
              linkedRoute: "/meal-prep",
              linkedMeta: { items, mealType: slot.key },
            });
            if (mEvt) {
              for (const item of items) {
                await storage.createEventTask({
                  calendarEventId: mEvt.id,
                  userId,
                  title: item,
                  isCompleted: false,
                  dwSuggested: false,
                  linkedRoute: "/meal-prep",
                });
              }
              results.calendarEvents++;
            }
          }

          // App work event
          if (dayData.appWork?.title) {
            const aTime = dayData.appWork.time || "19:45";
            const [aH, aM] = aTime.split(":").map(Number);
            const dur = dayData.appWork.durationMinutes || 45;
            const totalMin = (aH * 60 + (aM || 0)) + dur;
            const endH = String(Math.floor(totalMin / 60) % 24).padStart(2, "0");
            const endM = String(totalMin % 60).padStart(2, "0");
            const aStart = formatDateStr(dayDate, `${String(aH).padStart(2, "0")}:${String(aM || 0).padStart(2, "0")}`);
            const aEnd = formatDateStr(dayDate, `${endH}:${endM}`);

            const aEvt = await createCalEvent({
              userId,
              title: `App Work: ${dayData.appWork.title}`,
              description: dayData.appWork.tasks?.join(", ") || "",
              startTime: aStart,
              endTime: aEnd,
              eventType: "work",
              dimensionTags: ["intellectual"],
              linkedType: "none",
              linkedRoute: "/plan",
              linkedMeta: { tasks: dayData.appWork.tasks },
            });

            if (aEvt) {
              for (const task of (dayData.appWork.tasks ?? [])) {
                await storage.createEventTask({
                  calendarEventId: aEvt.id,
                  userId,
                  title: task,
                  isCompleted: false,
                  dwSuggested: false,
                });
              }
              results.calendarEvents++;
            }
          }

          // Other events (cleaning, grooming, admin, morning routine items, etc.)
          // Use dimension from parser if provided; fall back to inferring from keywords
          for (const other of (dayData.otherEvents ?? [])) {
            if (!other?.title) continue;
            const oStart = formatDateStr(dayDate, other.time || "12:00");
            const oEnd = formatDateStr(dayDate, other.endTime || "12:30");
            const inferredDimension = other.dimension ?? inferDimensionFromTitle(other.title);

            // Map dimension/keywords to a relevant app route
            const titleLower = other.title.toLowerCase();
            let oLinkedRoute: string | null = null;
            if (inferredDimension === "spiritual" || titleLower.includes("meditat") || titleLower.includes("breath")) {
              oLinkedRoute = "/spiritual";
            } else if (inferredDimension === "physical" || titleLower.includes("activation") || titleLower.includes("stretch") || titleLower.includes("walk")) {
              oLinkedRoute = "/workout";
            } else if (titleLower.includes("wind-down") || titleLower.includes("wind down") || titleLower.includes("morning") || titleLower.includes("routin")) {
              oLinkedRoute = "/routines";
            } else if (inferredDimension === "environmental" || titleLower.includes("clean") || titleLower.includes("reset")) {
              oLinkedRoute = "/habits";
            } else if (inferredDimension === "financial" || titleLower.includes("admin") || titleLower.includes("finance")) {
              oLinkedRoute = "/goals";
            }

            const oEvt = await createCalEvent({
              userId,
              title: other.title,
              description: other.notes || "",
              startTime: oStart,
              endTime: oEnd,
              eventType: "event",
              dimensionTags: [inferredDimension],
              linkedRoute: oLinkedRoute,
            });
            if (oEvt) {
              // Create event tasks from steps (bullet-point actions in this block)
              const steps: string[] = Array.isArray((other as any).steps) && (other as any).steps.length > 0
                ? (other as any).steps
                : (other.notes || "").split(/[•·,\n]/).map((s: string) => s.trim()).filter(Boolean);
              for (let si = 0; si < steps.length; si++) {
                await storage.createEventTask({
                  calendarEventId: oEvt.id,
                  userId,
                  title: steps[si],
                  isCompleted: false,
                  dwSuggested: false,
                  linkedRoute: oLinkedRoute,
                });
              }
              results.calendarEvents++;
            }
          }
        }
      }

      // 6. Grocery list → shopping list (fixed: extras maps to "other" not "dairy")
      const groceryItems = [
        ...(parsed.groceryList?.protein ?? []).map((i) => ({ ingredient: i, category: "protein" })),
        ...(parsed.groceryList?.carbs ?? []).map((i) => ({ ingredient: i, category: "carbs" })),
        ...(parsed.groceryList?.produce ?? []).map((i) => ({ ingredient: i, category: "produce" })),
        ...(parsed.groceryList?.extras ?? []).map((i) => ({ ingredient: i, category: "other" })),
      ];

      if (groceryItems.length) {
        const list = await storage.createShoppingList({
          userId,
          title: "Weekly Grocery List (Life System)",
          weekLabel: new Date().toISOString().slice(0, 10),
          status: "active",
        });
        await storage.createShoppingListItems(
          groceryItems.map((item) => ({
            shoppingListId: list.id,
            ingredient: item.ingredient,
            category: item.category,
            isChecked: false,
          }))
        );
        results.groceryItems = groceryItems.length;
      }

      // 6b. Meal plan → Nutrition hub (one plan per week, one Meal entry per meal slot per day)
      const DAYS_ORDERED = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
      const weekLabel = (startDate ?? new Date().toISOString()).slice(0, 10);

      const mealSlotsConfig = [
        { key: "breakfast" as const, label: "Breakfast", macrosKey: "breakfastMacros" as const },
        { key: "lunch" as const, label: "Lunch", macrosKey: "lunchMacros" as const },
        { key: "dinner" as const, label: "Dinner", macrosKey: "dinnerMacros" as const },
        { key: "snack" as const, label: "Snack", macrosKey: "snackMacros" as const },
      ];

      // Collect all meals across the schedule
      const mealsToCreate: any[] = [];
      for (const dayName of DAYS_ORDERED) {
        const dayData = parsed.weeklySchedule?.[dayName];
        if (!dayData) continue;
        for (const slot of mealSlotsConfig) {
          const items = dayData.meals?.[slot.key];
          if (!items?.length) continue;
          const macros = (dayData.meals as any)?.[slot.macrosKey] as import("./life-system-parser.js").ParsedMacros | undefined;
          const macroNote = macros
            ? `Est. macros: ${macros.calories} cal · ${macros.protein}g protein · ${macros.carbs}g carbs · ${macros.fat}g fat`
            : undefined;

          mealsToCreate.push({
            userId,
            title: `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${slot.label}`,
            mealType: slot.key,
            weekLabel,
            tags: ["life_system_import", dayName, slot.key],
            ingredients: items,
            notes: macroNote ?? null,
            mealPlanId: null as string | null,
          });
        }
      }

      if (mealsToCreate.length > 0) {
        const mealPlan = await storage.createMealPlan({
          userId,
          title: `Life System Meal Plan — Week of ${weekLabel}`,
          summary: `Imported from life system. ${mealsToCreate.length} meals across the week.`,
          source: "life_system_import",
          isActive: true,
        });
        for (const m of mealsToCreate) {
          m.mealPlanId = mealPlan.id;
          await storage.createMeal(m);
          results.meals++;
        }
      }

      // 6c. Workout plan → Workout hub (one plan, exercises grouped by day)
      type ParsedExercise = { name: string; sets: string; reps: string; notes: string };
      const workoutDays: Array<{ dayName: string; workout: { title: string; exercises: ParsedExercise[] } }> = [];
      for (const dayName of DAYS_ORDERED) {
        const dayData = parsed.weeklySchedule?.[dayName];
        if (dayData?.workout?.exercises?.length) {
          workoutDays.push({ dayName, workout: dayData.workout });
        }
      }

      if (workoutDays.length > 0) {
        const workoutPlan = await storage.createWorkoutPlan({
          userId,
          title: `Life System Workout Plan — Week of ${weekLabel}`,
          summary: `Band-based workout plan imported from life system. ${workoutDays.length} training days.`,
          source: "life_system_import",
          isActive: true,
        });

        let exerciseOrder = 0;
        for (const { dayName, workout } of workoutDays) {
          for (const ex of workout.exercises) {
            await storage.createExercise({
              userId,
              workoutPlanId: workoutPlan.id,
              title: ex.name,
              exerciseType: "strength",
              dayLabel: `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} — ${workout.title}`,
              sets: ex.sets || null,
              reps: ex.reps || null,
              notes: ex.notes || null,
              equipment: ["resistance bands"],
              tags: ["life_system_import", dayName],
            });
            exerciseOrder++;
            results.workouts++;
          }
        }
      }

      // 7. Journal entries + freeform notes
      const journalEntries = (parsed as any).journalEntries ?? [];
      for (const je of journalEntries) {
        if (!je?.content?.trim()) continue;
        await storage.createDwJournalEntry({
          userId,
          title: je.title || "Imported Journal Entry",
          story: je.content,
          quotes: [],
          tags: je.tags ?? [],
          sourceConversationId: null,
        });
        (results as any).journalEntries = ((results as any).journalEntries || 0) + 1;
      }

      // 8. Affirmations → goals with spiritual dimension
      const affirmations = (parsed as any).affirmations ?? [];
      for (const a of affirmations) {
        if (!a?.trim()) continue;
        await storage.createGoal({
          userId,
          title: a.trim(),
          description: "Affirmation",
          wellnessDimension: "spiritual",
          isActive: true,
          dataSource: "life_system_import",
        });
        results.goals++;
      }

      // 9. Reading list → goals with intellectual dimension
      const readingList = (parsed as any).readingList ?? [];
      for (const item of readingList) {
        if (!item?.title?.trim()) continue;
        await storage.createGoal({
          userId,
          title: item.title.trim(),
          description: [item.author ? `by ${item.author}` : "", item.type ?? "", item.notes ?? ""].filter(Boolean).join(" · "),
          wellnessDimension: "intellectual",
          isActive: true,
          dataSource: "life_system_import",
        });
        results.goals++;
      }

      // 10. Financial goals → goals with financial dimension
      const financialGoals = (parsed as any).financialGoals ?? [];
      for (const fg of financialGoals) {
        if (!fg?.title?.trim()) continue;
        await storage.createGoal({
          userId,
          title: fg.title.trim(),
          description: [fg.description, fg.target ? `Target: ${fg.target}` : "", fg.timeline ?? ""].filter(Boolean).join(" · "),
          wellnessDimension: "financial",
          isActive: true,
          dataSource: "life_system_import",
        });
        results.goals++;
      }

      // 11. Project tasks → goals with purpose dimension
      const projectTasks = (parsed as any).projectTasks ?? [];
      for (const pt of projectTasks) {
        if (!pt?.title?.trim()) continue;
        await storage.createGoal({
          userId,
          title: pt.title.trim(),
          description: [pt.description, pt.dueDate ? `Due: ${pt.dueDate}` : "", pt.priority ? `Priority: ${pt.priority}` : ""].filter(Boolean).join(" · "),
          wellnessDimension: "purpose",
          isActive: true,
          dataSource: "life_system_import",
        });
        results.goals++;
      }

      // 12. Freeform notes → saved as a journal entry
      const notes = (parsed as any).notes as string | undefined;
      if (notes?.trim()) {
        await storage.createDwJournalEntry({
          userId,
          title: (parsed as any).rawTitle || "Imported Notes",
          story: notes.trim(),
          quotes: [],
          tags: (parsed as any).notesTags ?? [],
          sourceConversationId: null,
        });
        (results as any).journalEntries = ((results as any).journalEntries || 0) + 1;
      }

      res.json({ success: true, results });
    } catch (err) {
      console.error("Life system apply error:", err);
      res.status(500).json({ error: "Failed to apply life system. Please try again." });
    }
  });

  // Check for goal conflicts with existing goals
  app.post("/api/life-system/import/check-conflicts", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { goals } = req.body as { goals: Array<{ title: string; description: string }> };
      const existing = await storage.getGoals(userId);

      const conflicts: Array<{
        newGoal: { title: string; description: string };
        existingGoal: { id: string; title: string; description?: string | null };
      }> = [];

      for (const g of goals) {
        const match = existing.find(
          (e) => e.title.toLowerCase().trim() === g.title.toLowerCase().trim()
        );
        if (match) {
          conflicts.push({ newGoal: g, existingGoal: match });
        }
      }

      res.json({ conflicts });
    } catch (err) {
      console.error("Conflict check error:", err);
      res.status(500).json({ conflicts: [] });
    }
  });

  // ── OpenAI Text-to-Speech (Alloy voice for onboarding & voice mode) ────
  const ttsLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 40,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many TTS requests. Please slow down." },
  });

  app.post("/api/tts", ttsLimiter, async (req, res) => {
    try {
      const { text, voice = "alloy", speed = 1.0 } = req.body as {
        text?: string;
        voice?: string;
        speed?: number;
      };

      if (!text || typeof text !== "string" || text.trim().length === 0) {
        return res.status(400).json({ error: "text is required" });
      }

      const trimmedText = text.trim().slice(0, 1000); // cap at 1000 chars

      const response = await openai.audio.speech.create({
        model: "tts-1",
        voice: voice as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer",
        input: trimmedText,
        speed: Math.max(0.25, Math.min(4.0, speed)),
      });

      const buffer = Buffer.from(await response.arrayBuffer());
      res.set({
        "Content-Type": "audio/mpeg",
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "public, max-age=300",
      });
      res.send(buffer);
    } catch (err: any) {
      console.error("[TTS] Error:", err?.message ?? err);
      res.status(500).json({ error: "TTS generation failed" });
    }
  });

  // ── Assistant action analytics ──────────────────────────────────────────
  app.post("/api/assistant/log", async (req, res) => {
    try {
      const { platform, source, action, parametersJson, success, durationMs } = req.body as {
        platform?: string;
        source?: string;
        action?: string;
        parametersJson?: string;
        success?: boolean;
        durationMs?: number;
      };
      console.log("[AssistantAction]", { platform, source, action, success, durationMs });
      res.json({ ok: true });
    } catch {
      res.json({ ok: false });
    }
  });

  return httpServer;
}

// Infer wellness dimension from event title for "other" calendar events
function inferDimensionFromTitle(title: string): string {
  const t = title.toLowerCase();
  if (/wake|sleep|water|shower|hygiene|dressed|hair|wrap|groom|breathe|stretch|mobility|activation|pushup|squat|plank|walk|hike|movement/.test(t)) return "physical";
  if (/meditat|spiritual|reflect|pray|journal|learning|study/.test(t)) return "spiritual";
  if (/clean|reset|laundry|dishes|trash|pickup|wipe|bathroom|floor|bedding|kitchen|tidy/.test(t)) return "environmental";
  if (/money|finance|account|debt|savings|budget|spending|pay|transport/.test(t)) return "financial";
  if (/app|plan|review|task|work|build|fix|test|code|dev|deploy/.test(t)) return "intellectual";
  if (/social|friend|date|out|explore|park|museum|dinner|lunch|restaurant/.test(t)) return "social";
  if (/meal prep|cook|prep/.test(t)) return "physical";
  return "environmental";
}

// Mood detection thresholds
const MOOD_THRESHOLDS = {
  HIGH_STRESS: 70,
  LOW_STRESS: 30,
  CALM_HEART_RATE: 70,
  ENERGETIC_HEART_RATE: 90,
  MODERATE_STRESS_MIN: 30,
  MODERATE_STRESS_MAX: 60,
  MODERATE_HR_MIN: 70,
  MODERATE_HR_MAX: 90,
  GOOD_HRV: 70,
  MODERATE_STRESS_THRESHOLD: 50,
};

// Helper function to detect mood from biometric data
function detectMoodFromBiometrics(heartRate: number, stressLevel: number, hrvScore?: number | null): string {
  // High stress = stressed
  if (stressLevel > MOOD_THRESHOLDS.HIGH_STRESS) return "stressed";
  
  // Low stress + low heart rate = calm/relaxed
  if (stressLevel < MOOD_THRESHOLDS.LOW_STRESS && heartRate < MOOD_THRESHOLDS.CALM_HEART_RATE) return "calm";
  
  // High heart rate + moderate stress = energetic
  if (heartRate > MOOD_THRESHOLDS.ENERGETIC_HEART_RATE && stressLevel < MOOD_THRESHOLDS.MODERATE_STRESS_THRESHOLD) return "energetic";
  
  // Good HRV = relaxed
  if (hrvScore && hrvScore > MOOD_THRESHOLDS.GOOD_HRV) return "relaxed";
  
  // Moderate ranges = focused
  if (heartRate >= MOOD_THRESHOLDS.MODERATE_HR_MIN && heartRate <= MOOD_THRESHOLDS.MODERATE_HR_MAX && 
      stressLevel >= MOOD_THRESHOLDS.MODERATE_STRESS_MIN && stressLevel <= MOOD_THRESHOLDS.MODERATE_STRESS_MAX) {
    return "focused";
  }
  
  return "neutral";
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

// (Routes moved inside registerRoutes function above)
// END OF FILE
