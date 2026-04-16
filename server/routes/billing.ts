import type { Express } from "express";

import { storage } from "../storage";



export function registerBillingRoutes(app: Express): void {
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

}
