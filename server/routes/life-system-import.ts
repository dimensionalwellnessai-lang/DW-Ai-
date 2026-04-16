import type { Express } from "express";

import { storage } from "../storage";

import { parseLifeSystemRuleBased } from "../life-system-parser-rules";
import { requireAuth, inferDimensionFromTitle } from "./_shared";



export function registerLifeSystemImportRoutes(app: Express): void {
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
        await import("../life-system-parser.js");

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

}
