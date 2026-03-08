import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcrypt";
import crypto from "crypto";
import multer from "multer";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import appleSignin from "apple-signin-auth";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import { pool } from "./db";
import * as accountability from "./accountability";
import { sendPasswordResetEmail, sendFeedbackEmail, sendAccountDeletionEmail, sendSupportReportEmail } from "./email";
import { generateChatResponse, generateLifeSystemRecommendations, generateDashboardInsight, generateFullAnalysis, detectIntentAndRespond, detectIntentAndRespondStreaming, generateLearnModeQuestion, generateWorkoutPlan, generateMeditationSuggestions, analyzeMealPlanDocument, generateInteractionInsights, generateContextualSearch, generateIngredientSubstitutes, processConversationIntoInsights, openai, type SearchCategory } from "./openai";
import { generateProactiveNudges, generateMorningBriefing } from "./proactive";
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
  type Habit,
  type Goal,
  type MoodLog,
  type ScheduleBlock,
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
const DW_MAX_MESSAGE_CONTENT_LENGTH = 4_000;
/** Maximum total characters across all messages in a single request. */
const DW_MAX_TOTAL_CONTENT_LENGTH = 100_000;

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

  // ─── OAuth helpers ─────────────────────────────────────────────────────────
  // The base URL used for OAuth redirect URIs.  Falls back to the Replit URL
  // for local/staging use, and can be overridden via OAUTH_REDIRECT_BASE_URL
  // once a custom domain is in use.
  const oauthRedirectBase = (
    process.env.OAUTH_REDIRECT_BASE_URL ||
    process.env.APP_URL ||
    "https://dimensional-wellness-ai--dareiltrader.replit.app"
  ).replace(/\/$/, "");

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
        if (req.session.userId && req.session.userId === existingUser.id) {
          // The user is already authenticated as this account – safe to link
          const updated = await storage.updateUser(existingUser.id, { oauthProvider: provider, oauthId });
          if (!updated) {
            throw new Error("Failed to link OAuth credentials to existing account");
          }
          user = updated;
        } else {
          // An account with this email exists but the caller is not authenticated
          // as that account. Prevent silent account takeover by rejecting.
          throw new Error("account_exists_use_password");
        }
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

  // Rate limiter applied only to OAuth callback endpoints (50 requests / 15 min per IP).
  // Initiation endpoints are not rate-limited; they just redirect to the provider.
  const oauthCallbackLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many auth requests. Please try again later." },
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
      req.session.oauthState = state;
      req.session.save((err) => {
        if (err) return next(err);
        passport.authenticate("google", {
          scope: ["profile", "email"],
          session: false,
          state,
        })(req, res, next);
      });
    });

    // Google OAuth callback – validate CSRF state before processing the profile
    app.get(
      "/api/auth/google/callback",
      oauthCallbackLimiter,
      (req, res, next) => {
        const returnedState = typeof req.query.state === "string" ? req.query.state : undefined;
        const sessionState = req.session.oauthState;
        // Clear state immediately to prevent replay
        delete req.session.oauthState;
        if (!returnedState || !sessionState || returnedState !== sessionState) {
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

  // ─── Apple OAuth ────────────────────────────────────────────────────────────
  // Apple Sign In uses a server-side OAuth 2.0 authorization-code flow.
  // The callback is a POST (Apple requirement) and Apple returns an id_token JWT.

  const appleClientId = process.env.APPLE_CLIENT_ID;
  const appleTeamId = process.env.APPLE_TEAM_ID;
  const appleKeyId = process.env.APPLE_KEY_ID;
  // The private key may be stored as a multi-line PEM in the env var.
  const applePrivateKey = process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  const appleConfigured = !!(appleClientId && appleTeamId && appleKeyId && applePrivateKey);

  if (appleConfigured) {
    // Initiate Apple OAuth – generate CSRF state, save to session, then redirect
    app.get("/api/auth/apple", (req, res, next) => {
      const state = crypto.randomBytes(16).toString("hex");
      req.session.oauthState = state;
      req.session.save((err) => {
        if (err) return next(err);
        const params = new URLSearchParams({
          response_type: "code id_token",
          response_mode: "form_post",
          client_id: appleClientId!,
          redirect_uri: `${oauthRedirectBase}/api/auth/apple/callback`,
          scope: "name email",
          state,
        });
        res.redirect(`https://appleid.apple.com/auth/authorize?${params.toString()}`);
      });
    });

    // Apple OAuth callback (Apple POSTs to this endpoint)
    // Uses express.urlencoded to parse Apple's form_post body (consistent with
    // the global extended:false setting in server/index.ts).
    app.post(
      "/api/auth/apple/callback",
      oauthCallbackLimiter,
      express.urlencoded({ extended: false }),
      async (req, res) => {
        try {
          // Validate CSRF state before processing any credentials
          const returnedState = typeof req.body.state === "string" ? req.body.state : undefined;
          const sessionState = req.session.oauthState;
          // Clear state immediately to prevent replay
          delete req.session.oauthState;
          if (!returnedState || !sessionState || returnedState !== sessionState) {
            return res.redirect("/login?error=invalid_state");
          }

          const { code, id_token, user: userJson } = req.body as {
            code?: string;
            id_token?: string;
            user?: string;
          };

          if (!id_token && !code) {
            return res.redirect("/login?error=apple_failed");
          }

          let email: string | undefined;
          let appleUserId: string | undefined;
          let firstName: string | undefined;

          // When Apple sends both code and id_token (response_type: "code id_token"),
          // prefer id_token for direct verification – the code path is a fallback
          // for clients that only receive an authorization code.
          if (id_token) {
            // Verify the id_token directly against Apple's JWKS
            const appleIdToken = await appleSignin.verifyIdToken(id_token, {
              audience: appleClientId!,
              ignoreExpiration: false,
            });
            email = appleIdToken.email;
            appleUserId = appleIdToken.sub;
          } else if (code) {
            // Exchange code for tokens to obtain the id_token
            const clientSecret = appleSignin.getClientSecret({
              clientID: appleClientId!,
              teamID: appleTeamId!,
              privateKey: applePrivateKey!,
              keyIdentifier: appleKeyId!,
            });
            const tokens = await appleSignin.getAuthorizationToken(code, {
              clientID: appleClientId!,
              redirectUri: `${oauthRedirectBase}/api/auth/apple/callback`,
              clientSecret,
            });
            if (tokens.id_token) {
              const decoded = await appleSignin.verifyIdToken(tokens.id_token, {
                audience: appleClientId!,
                ignoreExpiration: false,
              });
              email = decoded.email;
              appleUserId = decoded.sub;
            }
          }

          if (!email || !appleUserId) {
            return res.redirect("/login?error=apple_no_email");
          }

          // Apple only sends user name on the first authorization
          if (userJson) {
            try {
              const parsed = JSON.parse(userJson) as { name?: { firstName?: string } };
              firstName = parsed.name?.firstName;
            } catch {
              // ignore parse errors
            }
          }

          await handleOAuthUser(req, res, {
            provider: "apple",
            oauthId: appleUserId,
            email,
            firstName,
          });
          res.redirect("/");
        } catch (err) {
          if (process.env.NODE_ENV === "development") {
            console.error("[auth] Apple callback error:", err);
          }
          const errorCode =
            err instanceof Error && err.message === "account_exists_use_password"
              ? "account_exists_use_password"
              : "apple_failed";
          res.redirect(`/login?error=${errorCode}`);
        }
      }
    );
  } else {
    // Stub routes so the frontend can detect when Apple OAuth is not configured
    app.get("/api/auth/apple", (_req, res) =>
      res.status(503).json({ error: "Apple OAuth not configured" })
    );
    app.post("/api/auth/apple/callback", (_req, res) =>
      res.status(503).json({ error: "Apple OAuth not configured" })
    );
  }

  // Expose which OAuth providers are configured so the frontend can show/hide buttons
  app.get("/api/auth/providers", (_req, res) => {
    res.json({
      google: !!googleClientId && !!googleClientSecret,
      apple: appleConfigured,
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
          apple: "Continue with Apple",
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
      
      const [user, goals, habits, recentEntries, moodLogs, scheduleBlocks, routines, calendarEvents, lifeSystem, userProfile, systemPrefs] = await Promise.all([
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
      
      res.json({ response, updatedCategories, syncSessionId, actionsTaken });
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
      
      // Execute tool calls if any
      const actionsTaken: string[] = [];
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
                // This tool creates a workout plan - the AI will present it in the response
                // The plan data is embedded in the conversation, not saved to database yet
                // User will approve/save it through the workout page UI
                actionsTaken.push(`Generated workout plan based on your preferences`);
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
      
      res.json({ ...result, syncSessionId, actionsTaken });
    } catch (error) {
      console.error("Smart chat error:", error);
      res.status(500).json({ error: "Failed to get response" });
    }
  });

  // Streaming chat endpoint for improved performance
  app.post("/api/chat/stream", async (req, res) => {
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
      
      // Set headers for SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // Fetch user context (same as smart endpoint)
      const [user, goals, habits, profile] = await Promise.all([
        storage.getUser(userId),
        storage.getGoals(userId),
        storage.getHabits(userId),
        storage.getUserProfile(userId),
      ]);
      
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
      
      // Use detectIntentAndRespond to get the AI response with streaming support
      const result = await detectIntentAndRespondStreaming(
        enhancedMessage,
        conversationHistory || [],
        userContext,
        res
      );
      
      // Execute tool calls if any (same as smart endpoint)
      const actionsTaken: string[] = [];
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
                // This tool creates a workout plan - the AI will present it in the response
                // The plan data is embedded in the conversation, not saved to database yet
                // User will approve/save it through the workout page UI
                actionsTaken.push(`Generated workout plan based on your preferences`);
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
      if (actionsTaken.length > 0 || syncSessionId) {
        res.write(`data: ${JSON.stringify({ 
          metadata: { 
            actionsTaken, 
            syncSessionId 
          } 
        })}\n\n`);
      }
      
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
      console.error("Streaming chat error:", error);
      res.write(`data: ${JSON.stringify({ error: "Failed to get response" })}\n\n`);
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

      const response = await fetch(youtubeUrl.toString());
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

      const response = await fetch(newsUrl.toString());
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
      const [dimensionBlueprints, goals, habits, userProfile] = await Promise.all([
        storage.getDimensionBlueprints(userId),
        storage.getGoals(userId),
        storage.getHabits(userId),
        storage.getUserProfile(userId),
      ]);

      // Build context for AI
      const context = {
        dimensions: dimensionBlueprints.map(d => ({
          dimension: d.dimension,
          focus: d.whatIStandFor?.join(", ") || "wellness",
        })),
        goals: goals.slice(0, 3).map(g => ({ title: g.title, dimension: g.wellnessDimension })),
        habits: habits.slice(0, 3).map(h => ({ title: h.title })),
        fitnessGoal: userProfile?.fitnessGoal,
      };

      // Generate AI suggestions
      const prompt = `Based on the user's wellness data:
- Dimensions: ${context.dimensions.map(d => d.dimension).join(", ")}
- Active Goals: ${context.goals.map(g => g.title).join(", ")}
- Current Habits: ${context.habits.map(h => h.title).join(", ")}
${context.fitnessGoal ? `- Fitness Goal: ${context.fitnessGoal}` : ""}

Generate 3-4 personalized topic suggestions for content discovery. For each suggestion:
1. A brief title explaining the connection to their wellness focus
2. A short description (1-2 sentences)
3. 3 specific topic keywords they can explore

Return as JSON array with format:
[{
  "dimension": "dimension name",
  "title": "suggestion title",
  "description": "why this is relevant",
  "keywords": ["keyword1", "keyword2", "keyword3"]
}]`;

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
      const response = await fetch("https://api.perplexity.ai/chat/completions", {
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
      res.json(preferences);
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
      const preferences = await storage.updateWellnessPreferences(id, userId, req.body);
      if (!preferences) {
        return res.status(404).json({ error: "Preferences not found" });
      }
      res.json(preferences);
    } catch (error) {
      console.error("Update wellness preferences error:", error);
      res.status(500).json({ error: "Failed to update preferences" });
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
      suggestedFocus = "One small action today can restart your momentum";
    } else if (negativeSignals.length === 1) {
      momentumStatus = "yellow";
      suggestedFocus = "You're close — one consistent action can shift things";
    } else {
      momentumStatus = "green";
      suggestedFocus = "Keep building on what's working";
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
      const [habits, goals, moodData] = await Promise.all([
        storage.getHabits(userId),
        storage.getGoals(userId),
        storage.getRecentMoodLogs(userId, sevenDaysAgo),
      ]);

      const { momentumStatus, reasons, suggestedFocus } = computeMomentumStatus(
        habits,
        goals,
        moodData.logs,
        moodData.hasPriorLogs,
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

  // GET /api/reminders/due – reminders due before now (for polling)
  app.get("/api/reminders/due", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const items = await storage.getDueReminders(userId, new Date());
      res.json(items);
    } catch (err) {
      console.error("GET /api/reminders/due error:", err);
      res.status(500).json({ error: "Failed to fetch due reminders" });
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

  return httpServer;
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
