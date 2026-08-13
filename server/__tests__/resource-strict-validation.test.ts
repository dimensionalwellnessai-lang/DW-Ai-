/**
 * Schema-level guardrail tests for the resource update schemas added in
 * Task #124. Mirrors the structure of `settings-strict-validation.test.ts`
 * but covers the broader CRUD endpoints (conversations, goals, habits,
 * tasks, projects, calendar events, meals, workouts, shopping lists,
 * etc.) that previously passed `req.body` straight through to storage.
 *
 * Why schema-level (and not full Express integration)?
 *   See the same explanation in settings-strict-validation.test.ts. Each
 *   patched handler follows the same shape:
 *     1. `someUpdateSchema.safeParse(req.body ?? {})`
 *     2. on `!success`, return 400 with `{error, details: parsed.error.flatten()}`
 *     3. otherwise hand `parsed.data` to storage with the userId from the session
 *   The only thing protecting against mass-assignment regressions is the
 *   `.strict()` on each `*UpdateSchema`. If a future refactor drops
 *   `.strict()`, these tests fail immediately with a clear pointer.
 *
 * Each schema gets the same three checks:
 *   a) Unknown / hostile field is rejected (`hackerColumn`)
 *   b) The owner key the route omits (`userId`) is also rejected
 *   c) An empty body `{}` parses successfully (partial PATCH semantics)
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";
// Every schema imported here is wired to a real PATCH/PUT handler in
// server/routes.ts (either as the sole validator or as the strict
// gatekeeper that runs before any route-specific transform). Adding a
// schema to this suite without wiring it to a route would create false
// confidence in unused validation.
import {
  conversationUpdateSchema,
  aiSyncSessionUpdateSchema,
  aiSyncItemUpdateSchema,
  goalUpdateSchema,
  habitUpdateSchema,
  scheduleBlockUpdateSchema,
  stabilizingActionUpdateSchema,
  recoveryReflectionUpdateSchema,
  routineUpdateSchema,
  taskUpdateSchema,
  projectUpdateSchema,
  calendarEventUpdateSchema,
  calendarEventTaskUpdateSchema,
  challengeUpdateSchema,
  savedContentUpdateSchema,
  systemModuleUpdateSchema,
  dailyScheduleEventUpdateSchema,
  importedDocumentItemUpdateSchema,
  mealPlanUpdateSchema,
  mealUpdateSchema,
  workoutPlanUpdateSchema,
  exerciseUpdateSchema,
  workoutSessionUpdateSchema,
  workoutSessionStepUpdateSchema,
  shoppingListUpdateSchema,
  shoppingListItemUpdateSchema,
  dimensionBlueprintUpdateSchema,
  resetProtocolUpdateSchema,
  universalPlanUpdateSchema,
  streakUpdateSchema,
  aiSuggestionUpdateSchema,
  conversationInsightUpdateSchema,
  dwFollowupUpdateSchema,
  elevationPlanUpdateSchema,
  elevationPlanActionUpdateSchema,
  reminderUpdateSchema,
  pillarCheckinUpdateSchema,
} from "@shared/schema";

interface SchemaScenario {
  label: string;
  schema: z.ZodTypeAny;
  routeNote: string;
  /**
   * The owner-ish key(s) the route strips and reads from session/params
   * instead. Tables with multiple ownership/FK keys (for example
   * `exercises` which has BOTH `userId` and `workoutPlanId`) must list
   * every one so each is asserted to be unwritable from the body.
   */
  omittedOwnerKey: string | string[];
}

const scenarios: SchemaScenario[] = [
  { label: "conversationUpdateSchema", schema: conversationUpdateSchema, routeNote: "PATCH /api/conversations/:id", omittedOwnerKey: "userId" },
  { label: "aiSyncSessionUpdateSchema", schema: aiSyncSessionUpdateSchema, routeNote: "PATCH /api/sync/sessions/:id", omittedOwnerKey: "userId" },
  { label: "aiSyncItemUpdateSchema", schema: aiSyncItemUpdateSchema, routeNote: "PATCH /api/sync/items/:id", omittedOwnerKey: "sessionId" },
  { label: "goalUpdateSchema", schema: goalUpdateSchema, routeNote: "PATCH /api/goals/:id", omittedOwnerKey: "userId" },
  { label: "habitUpdateSchema", schema: habitUpdateSchema, routeNote: "PATCH /api/habits/:id", omittedOwnerKey: "userId" },
  { label: "scheduleBlockUpdateSchema", schema: scheduleBlockUpdateSchema, routeNote: "PATCH /api/schedule/:id", omittedOwnerKey: "userId" },
  { label: "stabilizingActionUpdateSchema", schema: stabilizingActionUpdateSchema, routeNote: "PATCH /api/blueprint/actions/:id", omittedOwnerKey: "blueprintId" },
  { label: "recoveryReflectionUpdateSchema", schema: recoveryReflectionUpdateSchema, routeNote: "PATCH /api/blueprint/reflections/:id", omittedOwnerKey: "blueprintId" },
  { label: "routineUpdateSchema", schema: routineUpdateSchema, routeNote: "PATCH /api/routines/:id", omittedOwnerKey: "userId" },
  { label: "taskUpdateSchema", schema: taskUpdateSchema, routeNote: "PATCH /api/tasks/:id", omittedOwnerKey: "userId" },
  { label: "projectUpdateSchema", schema: projectUpdateSchema, routeNote: "PATCH /api/projects/:id", omittedOwnerKey: "userId" },
  { label: "calendarEventUpdateSchema", schema: calendarEventUpdateSchema, routeNote: "PATCH /api/calendar/:id", omittedOwnerKey: "userId" },
  { label: "calendarEventTaskUpdateSchema", schema: calendarEventTaskUpdateSchema, routeNote: "PATCH /api/calendar/tasks/:id", omittedOwnerKey: "calendarEventId" },
  { label: "challengeUpdateSchema", schema: challengeUpdateSchema, routeNote: "PATCH /api/challenges/:id", omittedOwnerKey: "userId" },
  { label: "savedContentUpdateSchema", schema: savedContentUpdateSchema, routeNote: "PATCH /api/saved-content/:id", omittedOwnerKey: "userId" },
  { label: "systemModuleUpdateSchema", schema: systemModuleUpdateSchema, routeNote: "PATCH /api/system-modules/:id", omittedOwnerKey: "userId" },
  { label: "dailyScheduleEventUpdateSchema", schema: dailyScheduleEventUpdateSchema, routeNote: "PATCH /api/schedule-events/:id", omittedOwnerKey: "userId" },
  { label: "importedDocumentItemUpdateSchema", schema: importedDocumentItemUpdateSchema, routeNote: "PATCH /api/documents/:id/items", omittedOwnerKey: "documentId" },
  { label: "mealPlanUpdateSchema", schema: mealPlanUpdateSchema, routeNote: "PATCH /api/meal-plans/:id", omittedOwnerKey: "userId" },
  { label: "workoutPlanUpdateSchema", schema: workoutPlanUpdateSchema, routeNote: "PATCH /api/workout-plans/:id", omittedOwnerKey: "userId" },
  { label: "shoppingListUpdateSchema", schema: shoppingListUpdateSchema, routeNote: "PATCH /api/shopping-lists/:id", omittedOwnerKey: "userId" },
  { label: "shoppingListItemUpdateSchema", schema: shoppingListItemUpdateSchema, routeNote: "PATCH /api/shopping-lists/:listId/items/:itemId", omittedOwnerKey: "listId" },
  { label: "dimensionBlueprintUpdateSchema", schema: dimensionBlueprintUpdateSchema, routeNote: "PATCH /api/dimension-blueprints/:id", omittedOwnerKey: "userId" },
  { label: "resetProtocolUpdateSchema", schema: resetProtocolUpdateSchema, routeNote: "PATCH /api/reset-protocol/:id", omittedOwnerKey: "userId" },
  { label: "pillarCheckinUpdateSchema", schema: pillarCheckinUpdateSchema, routeNote: "POST /api/pillar-checkins", omittedOwnerKey: "userId" },
  { label: "universalPlanUpdateSchema", schema: universalPlanUpdateSchema, routeNote: "PATCH /api/universal-plans/:id", omittedOwnerKey: "userId" },
  { label: "streakUpdateSchema", schema: streakUpdateSchema, routeNote: "PATCH /api/streaks/:id", omittedOwnerKey: "userId" },
  { label: "mealUpdateSchema", schema: mealUpdateSchema, routeNote: "PATCH /api/meals/:id", omittedOwnerKey: "userId" },
  { label: "exerciseUpdateSchema", schema: exerciseUpdateSchema, routeNote: "PATCH /api/exercises/:id", omittedOwnerKey: ["userId", "workoutPlanId"] },
  { label: "workoutSessionUpdateSchema", schema: workoutSessionUpdateSchema, routeNote: "PATCH /api/workout-sessions/:id", omittedOwnerKey: "userId" },
  { label: "workoutSessionStepUpdateSchema", schema: workoutSessionStepUpdateSchema, routeNote: "PUT /api/workout-sessions/:id/steps/:stepIndex", omittedOwnerKey: "sessionId" },
  { label: "aiSuggestionUpdateSchema", schema: aiSuggestionUpdateSchema, routeNote: "PATCH /api/ai-suggestions/:id", omittedOwnerKey: "userId" },
  { label: "conversationInsightUpdateSchema", schema: conversationInsightUpdateSchema, routeNote: "PATCH /api/insights/:id (gatekeeper)", omittedOwnerKey: "userId" },
  { label: "dwFollowupUpdateSchema", schema: dwFollowupUpdateSchema, routeNote: "PATCH /api/dw/followups/:id (gatekeeper)", omittedOwnerKey: "userId" },
  { label: "reminderUpdateSchema", schema: reminderUpdateSchema, routeNote: "PATCH /api/reminders/:id", omittedOwnerKey: "userId" },
  { label: "elevationPlanUpdateSchema", schema: elevationPlanUpdateSchema, routeNote: "PATCH /api/elevation-plans/:id", omittedOwnerKey: "userId" },
  { label: "elevationPlanActionUpdateSchema", schema: elevationPlanActionUpdateSchema, routeNote: "PATCH /api/elevation-plan-actions/:id", omittedOwnerKey: "planDayId" },
];

describe("resource update schemas reject unknown fields", () => {
  for (const { label, schema, routeNote, omittedOwnerKey } of scenarios) {
    const ownerKeys = Array.isArray(omittedOwnerKey) ? omittedOwnerKey : [omittedOwnerKey];
    describe(`${label} (used by ${routeNote})`, () => {
      it("rejects a body containing a totally unknown field", () => {
        const result = schema.safeParse({ hackerColumn: "should be rejected" });
        expect(result.success).toBe(false);
        if (!result.success) {
          const codes = result.error.issues.map((issue) => issue.code);
          expect(codes).toContain("unrecognized_keys");
        }
      });

      for (const key of ownerKeys) {
        it(`rejects ${key} so it can't be mass-assigned from the body`, () => {
          const result = schema.safeParse({ [key]: "spoofed-owner-id" });
          expect(result.success).toBe(false);
          if (!result.success) {
            const flat = result.error.flatten();
            const all = JSON.stringify(flat);
            expect(all).toContain(key);
          }
        });
      }

      it("accepts an empty partial body", () => {
        const result = schema.safeParse({});
        expect(result.success).toBe(true);
      });
    });
  }
});
