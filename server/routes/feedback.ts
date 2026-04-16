import type { Express } from "express";

import crypto from "crypto";
import { z } from "zod";

import { storage } from "../storage";

import { sendFeedbackEmail, sendSupportReportEmail } from "../email";



export function registerFeedbackRoutes(app: Express): void {
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

}
