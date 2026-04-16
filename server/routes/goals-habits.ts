import type { Express } from "express";
import { sql, and, or } from "drizzle-orm";
import { z } from "zod";
import { storage } from "../storage";
import { db } from "../db";
import { requireAuth } from "./_shared";
import { insertGoalSchema, insertScheduleBlockSchema } from "@shared/schema";
export function registerGoalsHabitsRoutes(app: Express): void {
  app.get("/api/goals", requireAuth, async (req, res) => {
    const goals = await storage.getGoals(req.session.userId!);
    res.json(goals);
  });

  // ── Goal Progress Data — enriches goals with live contributing signals ──────
  app.get("/api/goals/progress-data", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const goals = await storage.getGoals(userId);
      const activeGoals = goals.filter((g: any) => g.isActive !== false && (g.progress ?? 0) < 100);

      // Fetch data sources in parallel
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [workoutSessionsResult, healthMetricsResult, habitsWithLogs] = await Promise.all([
        db.execute(sql`
          SELECT COUNT(*) as count
          FROM workout_sessions
          WHERE user_id = ${userId}
            AND status = 'completed'
            AND created_at >= ${thirtyDaysAgo.toISOString()}
        `),
        db.execute(sql`
          SELECT weight_kg, logged_date
          FROM health_metrics
          WHERE user_id = ${userId}
            AND weight_kg IS NOT NULL
          ORDER BY logged_date DESC
          LIMIT 10
        `),
        storage.getHabits(userId),
      ]);

      const workoutCount = Number((workoutSessionsResult.rows[0] as any)?.count ?? 0);
      const weightRows = healthMetricsResult.rows as any[];
      const latestWeight = weightRows[0]?.weight_kg ? Number(weightRows[0].weight_kg) : null;
      const earliestWeight = weightRows.length > 1 ? Number(weightRows[weightRows.length - 1].weight_kg) : null;

      // Build habit completion rate map keyed by goal title
      const habitCompletionByGoalTitle: Record<string, { completedCount: number; totalHabits: number; habitNames: string[] }> = {};
      for (const habit of habitsWithLogs as any[]) {
        if (!habit.isActive) continue;
        const descLower = (habit.description || "").toLowerCase();
        const titleLower = (habit.title || "").toLowerCase();
        for (const g of activeGoals) {
          const gTitleLower = (g.title || "").toLowerCase();
          if (descLower.includes(`supports goal: ${gTitleLower}`) || titleLower.includes(gTitleLower)) {
            if (!habitCompletionByGoalTitle[g.id]) {
              habitCompletionByGoalTitle[g.id] = { completedCount: 0, totalHabits: 0, habitNames: [] };
            }
            habitCompletionByGoalTitle[g.id].totalHabits++;
            if (habit.completedToday) habitCompletionByGoalTitle[g.id].completedCount++;
            habitCompletionByGoalTitle[g.id].habitNames.push(habit.title);
          }
        }
      }

      const enriched = activeGoals.map((goal: any) => {
        const dim = (goal.wellnessDimension || "").toLowerCase();
        const titleLower = (goal.title || "").toLowerCase();
        const isWeight = /weight|kg|lbs|lb|body fat|slim|lose|body|mass/i.test(titleLower);
        const isFitness = !isWeight && (dim === "physical" || /workout|exercise|run|gym|fitness|strength|cardio|steps/i.test(titleLower));
        const habitData = habitCompletionByGoalTitle[goal.id];

        let contributingData: {
          type: string;
          label: string;
          value: string | null;
          detail: string | null;
          delta: string | null;
        } | null = null;

        if (isFitness && workoutCount > 0) {
          contributingData = {
            type: "workouts",
            label: "Sessions this month",
            value: String(workoutCount),
            detail: `${workoutCount} workout${workoutCount === 1 ? "" : "s"} completed in the last 30 days`,
            delta: null,
          };
        } else if (isWeight && latestWeight !== null) {
          let delta: string | null = null;
          if (earliestWeight !== null && earliestWeight !== latestWeight) {
            const diff = latestWeight - earliestWeight;
            const absDiff = Math.abs(diff).toFixed(1);
            delta = diff < 0 ? `-${absDiff} kg` : `+${absDiff} kg`;
          }
          contributingData = {
            type: "weight",
            label: "Latest weight",
            value: `${latestWeight} kg`,
            detail: `Last logged: ${latestWeight} kg`,
            delta,
          };
        } else if (habitData && habitData.totalHabits > 0) {
          const rate = Math.round((habitData.completedCount / habitData.totalHabits) * 100);
          contributingData = {
            type: "habits",
            label: "Habit completion today",
            value: `${rate}%`,
            detail: `${habitData.completedCount}/${habitData.totalHabits} habits done today: ${habitData.habitNames.slice(0, 2).join(", ")}`,
            delta: null,
          };
        }

        return {
          ...goal,
          contributingData: contributingData ?? {
            type: "none",
            label: "No data yet",
            value: null,
            detail: "No data yet — start tracking to see progress here",
            delta: null,
          },
        };
      });

      res.json(enriched);
    } catch (error) {
      console.error("Goals progress data error:", error);
      res.status(500).json({ error: "Failed to load goals progress data" });
    }
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
}
