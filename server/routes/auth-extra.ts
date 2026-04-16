import type { Express } from "express";

import bcrypt from "bcrypt";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { storage } from "../storage";
import { pool } from "../db";
import { db } from "../db";

import { requireAuth } from "./_shared";

import { sendAccountDeletionEmail, sendWelcomeEmail } from "../email";

import { aiLearnings, goals as goalsTable, habits as habitsTable, scheduleBlocks as scheduleBlocksTable, shoppingLists as shoppingListsTable, lifeSystems as lifeSystemsTable, routines as routinesTable, calendarEvents as calendarEventsTable, onboardingProfiles as onboardingProfilesTable, aiSyncSessions as aiSyncSessionsTable, aiSyncItems as aiSyncItemsTable, interactionEvents as interactionEventsTable, aiPatternSnapshots as aiPatternSnapshotsTable, userLearningProfile as userLearningProfileTable, insertUserSchema } from "@shared/schema";
const SALT_ROUNDS = 10;

export function registerAuthExtraRoutes(app: Express): void {
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
}
