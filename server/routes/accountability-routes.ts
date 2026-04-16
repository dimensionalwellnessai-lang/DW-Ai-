import type { Express } from "express";
import { or } from "drizzle-orm";

import { requireAuth } from "./_shared";
import { sendPartnerInviteEmail } from "../email";
import * as accountability from "../accountability";

export function registerAccountabilityRoutes(app: Express): void {
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
}
