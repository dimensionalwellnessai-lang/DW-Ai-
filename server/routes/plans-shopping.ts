import type { Express } from "express";
import { and, or } from "drizzle-orm";
import { z } from "zod";
import { storage } from "../storage";

import { requireAuth, categorizeIngredient } from "./_shared";
export function registerPlansShoppingRoutes(app: Express): void {
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
      
      // If activating this plan, deactivate others first (single SQL UPDATE)
      if (req.body.isActive === true) {
        await storage.deactivateOtherMealPlans(req.session.userId!, req.params.id);
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
}
