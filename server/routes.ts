import type { Express, Request, Response } from "express";

import express from "express";
import { type Server } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";

import crypto from "crypto";

import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";

import { patchRateLimiter, validatePatchPayloadSize, sanitizePatchBody } from "./middleware/guardrails";
import { storage } from "./storage";
import { pool } from "./db";

import { registerHealthMetricsRoutes } from "./routes/health-metrics";
import { registerWellnessTrackingRoutes } from "./routes/wellness-tracking";
import { registerAccountabilityRoutes } from "./routes/accountability-routes";
import { registerDimensionsConfigRoutes } from "./routes/dimensions-config";
import { registerHouseholdRoutes } from "./routes/household";
import { registerAiFeaturesRoutes } from "./routes/ai-features";
import { registerNotificationsRoutes } from "./routes/notifications";
import { registerAccountabilityCheckinRoutes } from "./routes/accountability-checkin";
import { registerUsersRoutes } from "./routes/users";
import { registerConversationsRoutes } from "./routes/conversations";
import { registerGoalsHabitsRoutes } from "./routes/goals-habits";
import { registerCheckinsBlueprintRoutes } from "./routes/checkins-blueprint";
import { registerTasksProjectsRoutes } from "./routes/tasks-projects";
import { registerProfileChallengesRoutes } from "./routes/profile-challenges";
import { registerContentFeedRoutes } from "./routes/content-feed";
import { registerSystemModulesRoutes } from "./routes/system-modules";
import { registerPlansShoppingRoutes } from "./routes/plans-shopping";
import { registerAdminProgressRoutes } from "./routes/admin-progress";
import { registerAuthExtraRoutes } from "./routes/auth-extra";
import { registerBillingRoutes } from "./routes/billing";
import { registerFeedbackRoutes } from "./routes/feedback";
import { registerCheckinStatusRoutes } from "./routes/checkin-status";
import { registerPasswordResetRoutes } from "./routes/password-reset";
import { registerOnboardingRoutes } from "./routes/onboarding";
import { registerHelpersRoutes } from "./routes/helpers-routes";
import { registerChatRoutes } from "./routes/chat";
import { registerWorkoutSuggestRoutes } from "./routes/workout-suggest";
import { registerDashboardRoutes } from "./routes/dashboard";
import { registerMusicExplainRoutes } from "./routes/music-explain";
import { registerVoiceExtrasRoutes } from "./routes/voice-extras";
import { registerRoutinesBrowseRoutes } from "./routes/routines-browse";
import { registerCalendarRoutes } from "./routes/calendar-routes";
import { registerDocumentsRoutes } from "./routes/documents";
import { registerImportRoutes } from "./routes/import-routes";
import { registerLifeSystemExtractRoutes } from "./routes/life-system-extract";
import { registerAstrologyRoutes } from "./routes/astrology";
import { registerLocalResourcesRoutes } from "./routes/local-resources";
import { registerDwProcessRoutes } from "./routes/dw-process";
import { registerElevationCheckRoutes } from "./routes/elevation-check";
import { registerSupportDetailedRoutes } from "./routes/support-detailed";
import { registerElevationPlansRoutes } from "./routes/elevation-plans";
import { registerWeeklyReviewRoutes } from "./routes/weekly-review";
import { registerElevationActionsRoutes } from "./routes/elevation-actions";
import { registerRemindersRoutes } from "./routes/reminders";
import { registerLearningProfileRoutes } from "./routes/learning-profile";
import { registerAnalyticsHealthRoutes } from "./routes/analytics-health";
import { registerWeekPlannerRoutes } from "./routes/week-planner";
import { registerCommunitySavedRoutes } from "./routes/community-saved";
import { registerBrowseMiscRoutes } from "./routes/browse-misc";
import { registerCommunityRoutes } from "./routes/community";
import { registerDiscoverFeedRoutes } from "./routes/discover-feed";
import { registerLifeSystemImportRoutes } from "./routes/life-system-import";
import { registerMediaMiscRoutes } from "./routes/media-misc";
import { oauthCallbackLimiter } from "./routes/_limiters";
const SALT_ROUNDS = 10;

declare module "express-session" {
  interface SessionData {
    userId?: string;
    oauthState?: string;
  }
}


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

  // Rate limiter for chat endpoints (30 requests / 60 seconds per IP).

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

  registerAuthExtraRoutes(app);
  registerBillingRoutes(app);
  registerFeedbackRoutes(app);
  registerCheckinStatusRoutes(app);
  registerPasswordResetRoutes(app);
  registerOnboardingRoutes(app);
  registerHelpersRoutes(app);
  registerChatRoutes(app);
  registerWorkoutSuggestRoutes(app);
  registerDashboardRoutes(app);
  registerMusicExplainRoutes(app);
  registerVoiceExtrasRoutes(app);
  registerRoutinesBrowseRoutes(app);
  registerCalendarRoutes(app);
  registerDocumentsRoutes(app);
  registerImportRoutes(app);
  registerLifeSystemExtractRoutes(app);
  registerAstrologyRoutes(app);
  registerLocalResourcesRoutes(app);
  registerDwProcessRoutes(app);
  registerElevationCheckRoutes(app);
  registerSupportDetailedRoutes(app);
  registerElevationPlansRoutes(app);
  registerWeeklyReviewRoutes(app);
  registerElevationActionsRoutes(app);
  registerRemindersRoutes(app);
  registerLearningProfileRoutes(app);
  registerAnalyticsHealthRoutes(app);
  registerWeekPlannerRoutes(app);
  registerCommunitySavedRoutes(app);
  registerBrowseMiscRoutes(app);
  registerCommunityRoutes(app);
  registerDiscoverFeedRoutes(app);
  registerLifeSystemImportRoutes(app);
  registerMediaMiscRoutes(app);
  registerHealthMetricsRoutes(app);
  registerConversationsRoutes(app);
  registerWellnessTrackingRoutes(app);
  registerAccountabilityRoutes(app);
  registerDimensionsConfigRoutes(app);
  registerHouseholdRoutes(app);
  registerAiFeaturesRoutes(app);
  registerNotificationsRoutes(app);
  registerAccountabilityCheckinRoutes(app);
  registerUsersRoutes(app);
  registerGoalsHabitsRoutes(app);
  registerCheckinsBlueprintRoutes(app);
  registerTasksProjectsRoutes(app);
  registerProfileChallengesRoutes(app);
  registerContentFeedRoutes(app);
  registerSystemModulesRoutes(app);
  registerPlansShoppingRoutes(app);
  registerAdminProgressRoutes(app);

  return httpServer;
}
