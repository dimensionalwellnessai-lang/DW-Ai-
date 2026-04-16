import type { Express } from "express";

import { storage } from "../storage";

import { requireAuth } from "./_shared";

import { openai } from "../openai";



export function registerLifeSystemExtractRoutes(app: Express): void {
  app.post("/api/life-system/extract", requireAuth, async (req, res) => {
    try {
      const { content } = req.body;
      if (!content || typeof content !== "string") {
        return res.status(400).json({ error: "Content is required" });
      }

      const systemPrompt = `You are an AI that extracts specific, actionable items from wellness conversation content and routes them to the correct destination.

DESTINATION TYPES — choose the most precise one:
- "calendar": A specific one-time or recurring event (meetings, appointments, classes, date-specific plans). Goes to the Calendar.
- "workout": An exercise session, training plan, or physical activity. Goes to Workouts.
- "meal": A specific meal, recipe, or nutrition plan item. Goes to Meal Prep / Nutrition.
- "habit": A recurring behavior to build or maintain (no specific time required). Goes to Habits.
- "goal": A target, achievement, or milestone across any life dimension. Goes to Goals.
- "routine": A multi-step daily flow (morning routine, bedtime routine, wind-down, etc.). Goes to Routines.

Return a JSON object with this structure:
{
  "items": [
    {
      "type": "calendar" | "workout" | "meal" | "habit" | "goal" | "routine",
      "title": "Concise action-oriented title (max 50 chars)",
      "description": "1-2 sentence description (optional)",

      // For calendar events:
      "date": "YYYY-MM-DD" (if specific date mentioned, otherwise omit),
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "isRecurring": true/false,
      "dayOfWeek": 0-6 (0=Sunday, if recurring),

      // For workouts:
      "exerciseType": "strength" | "cardio" | "flexibility" | "hiit" | "other",
      "durationMinutes": number,
      "dayOfWeek": 0-6 (if specific day mentioned),
      "scheduleTime": "HH:MM" (if specific time mentioned),

      // For meals:
      "mealType": "breakfast" | "lunch" | "dinner" | "snack",
      "ingredients": ["ingredient1", "ingredient2"],
      "dayOfWeek": 0-6 (if specific day mentioned),
      "scheduleTime": "HH:MM" (if specific time mentioned),

      // For habits:
      "frequency": "daily" | "weekly" | "monthly",
      "category": "physical" | "mental" | "emotional" | "spiritual" | "social" | "financial" | "productivity",

      // For goals:
      "wellnessDimension": "physical" | "mental" | "emotional" | "spiritual" | "social" | "financial",
      "targetValue": number (if measurable),

      // For routines:
      "scheduleTime": "HH:MM",
      "durationMinutes": number,
      "steps": [{"title": "Step name", "durationMinutes": 5}]
    }
  ]
}

Rules:
- Be specific and contextual: if the message discusses a chest workout, title it "Chest & Triceps Session" not "Workout"
- Match the type precisely to the content — don't use "goal" for something that belongs in "calendar" or "workout"
- If no concrete actionable items are found, return { "items": [] }
- Only extract clear commitments, plans, or things the user said they want to do
- For workouts, capture exercise type and duration if mentioned
- For meals, capture the meal type (breakfast/lunch/dinner) from context`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
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
          } else if (item.type === "calendar") {
            // Direct calendar event
            const now = new Date();
            let startDateTime: Date;
            let endDateTime: Date;

            if (item.date) {
              // Specific date event
              const [year, month, day] = (item.date as string).split("-").map(Number);
              startDateTime = new Date(year, month - 1, day);
              if (item.startTime) {
                const [h, m] = (item.startTime as string).split(":").map(Number);
                startDateTime.setHours(h, m, 0, 0);
              } else {
                startDateTime.setHours(9, 0, 0, 0);
              }
              endDateTime = new Date(startDateTime);
              if (item.endTime) {
                const [h, m] = (item.endTime as string).split(":").map(Number);
                endDateTime.setHours(h, m, 0, 0);
              } else {
                endDateTime.setMinutes(endDateTime.getMinutes() + 60);
              }
            } else if (item.dayOfWeek !== undefined) {
              // Recurring weekly event — find next occurrence
              const currentDayOfWeek = now.getDay();
              const targetDayOfWeek = item.dayOfWeek;
              let daysUntil = targetDayOfWeek - currentDayOfWeek;
              if (daysUntil < 0) daysUntil += 7;
              if (daysUntil === 0 && item.startTime) {
                const [h, m] = (item.startTime as string).split(":").map(Number);
                if (h * 60 + m <= now.getHours() * 60 + now.getMinutes()) daysUntil = 7;
              }
              startDateTime = new Date(now);
              startDateTime.setDate(now.getDate() + daysUntil);
              const [h, m] = ((item.startTime as string) || "09:00").split(":").map(Number);
              startDateTime.setHours(h, m, 0, 0);
              endDateTime = new Date(startDateTime);
              if (item.endTime) {
                const [eh, em] = (item.endTime as string).split(":").map(Number);
                endDateTime.setHours(eh, em, 0, 0);
              } else {
                endDateTime.setMinutes(endDateTime.getMinutes() + 60);
              }
            } else {
              // No date info — schedule for tomorrow at 9am
              startDateTime = new Date(now);
              startDateTime.setDate(now.getDate() + 1);
              startDateTime.setHours(9, 0, 0, 0);
              endDateTime = new Date(startDateTime);
              endDateTime.setHours(10, 0, 0, 0);
            }

            await storage.createCalendarEvent({
              userId,
              title: item.title,
              description: item.description || null,
              startTime: startDateTime.toISOString(),
              endTime: endDateTime.toISOString(),
              eventType: "event",
              isRecurring: !!(item.isRecurring || item.dayOfWeek !== undefined),
              recurrenceRule: (item.isRecurring || item.dayOfWeek !== undefined)
                ? `FREQ=WEEKLY;BYDAY=${['SU','MO','TU','WE','TH','FR','SA'][item.dayOfWeek ?? now.getDay()]}`
                : null,
              linkedType: null,
              linkedId: null,
              linkedRoute: "/calendar",
            });
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


}
