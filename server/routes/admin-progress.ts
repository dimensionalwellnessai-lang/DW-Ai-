import type { Express } from "express";

import { z } from "zod";
import { storage } from "../storage";

import { requireAuth, requireAdmin } from "./_shared";
import { insertAstrologyPredictionSchema } from "@shared/schema";
export function registerAdminProgressRoutes(app: Express): void {
// ── DW Role Picker telemetry ──────────────────────────────────────────────
  // Lane usage + override rate per lane. Used to tune rules in
  // server/lib/dw-role-picker.ts and detect drift over time.
  app.get("/api/admin/dw-role-picks/summary", requireAdmin, async (req, res) => {
    try {
      const days = Math.max(1, Math.min(180, parseInt(String(req.query.days ?? "30"), 10) || 30));
      const stats = await storage.getDwRolePickStats(days);
      res.json(stats);
    } catch (err) {
      console.error("[admin] dw-role-picks summary failed", err);
      res.status(500).json({ error: "Failed to load picker stats" });
    }
  });

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

  // ── Wearable device + manual-sync endpoints moved to ────────────────────
  // server/routes/wearables.ts (the canonical /api/wearables/* module).
  // See Task #201.

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

}
