/**
 * Schema-level guardrail tests for the settings/preferences endpoints
 * tightened in Task #42 plus the upsert branches in #41.
 *
 * Why schema-level (and not full Express integration)?
 *   Every patched route handler in this batch follows the same shape:
 *     1. `someUpdateSchema.safeParse(req.body)`
 *     2. on `!success`, return 400 with `{error, details: parsed.error.flatten()}`
 *     3. otherwise hand `parsed.data` to storage with the userId from the
 *        session (never from the body)
 *   The only thing protecting against mass-assignment regressions is the
 *   `.strict()` on each `*UpdateSchema`. If a future refactor drops
 *   `.strict()` (or swaps the schema for a non-strict one), these tests
 *   fail immediately with a clear pointer to the schema and field.
 *
 *   Pulling in the 13k-line `server/routes.ts` and mocking out OAuth /
 *   passport / schedulers / multer just to assert "yes, the route returns
 *   400" would be a much bigger refactor with much weaker coverage — the
 *   schemas ARE the contract.
 *
 * Each schema gets the same three checks:
 *   a) Unknown / hostile field is rejected (`hackerColumn`)
 *   b) The owner key the route omits (`userId` or `blueprintId`) is also
 *      rejected, since it should never be settable from the body
 *   c) An empty body `{}` and a single known field both parse successfully
 */

import { describe, it, expect } from "vitest";
import {
  wellnessBlueprintUpdateSchema,
  baselineProfileUpdateSchema,
  stressSignalsUpdateSchema,
  userProfileUpdateSchema,
  userSystemPreferencesUpdateSchema,
  wellnessPreferencesUpdateSchema,
  userValuesRulesUpdateSchema,
  featureSettingsUpdateSchema,
  notificationPreferencesUpdateSchema,
} from "@shared/schema";

/**
 * Each scenario pins one strict update schema. `validPartial` is a body
 * that should round-trip cleanly. `omittedOwnerKey` is the field the
 * route strips from the body and reads from the session instead — the
 * schema must reject it.
 */
interface SchemaScenario {
  label: string;
  schema:
    | typeof wellnessBlueprintUpdateSchema
    | typeof baselineProfileUpdateSchema
    | typeof stressSignalsUpdateSchema
    | typeof userProfileUpdateSchema
    | typeof userSystemPreferencesUpdateSchema
    | typeof wellnessPreferencesUpdateSchema
    | typeof userValuesRulesUpdateSchema
    | typeof featureSettingsUpdateSchema
    | typeof notificationPreferencesUpdateSchema;
  routeNote: string;
  omittedOwnerKey: "userId" | "blueprintId";
  validPartial: Record<string, unknown>;
}

const scenarios: SchemaScenario[] = [
  {
    label: "wellnessBlueprintUpdateSchema",
    schema: wellnessBlueprintUpdateSchema,
    routeNote: "PATCH /api/blueprint",
    omittedOwnerKey: "userId",
    validPartial: { title: "Renamed blueprint" },
  },
  {
    label: "baselineProfileUpdateSchema",
    schema: baselineProfileUpdateSchema,
    routeNote: "POST /api/blueprint/baseline (upsert branch)",
    omittedOwnerKey: "blueprintId",
    validPartial: { notes: "Steady pace this week." },
  },
  {
    label: "stressSignalsUpdateSchema",
    schema: stressSignalsUpdateSchema,
    routeNote: "POST /api/blueprint/signals (upsert branch)",
    omittedOwnerKey: "blueprintId",
    validPartial: { notes: "Noticing tighter shoulders." },
  },
  {
    label: "userProfileUpdateSchema",
    schema: userProfileUpdateSchema,
    routeNote: "PATCH /api/profile",
    omittedOwnerKey: "userId",
    validPartial: { coachingTone: "warm" },
  },
  {
    label: "userSystemPreferencesUpdateSchema",
    schema: userSystemPreferencesUpdateSchema,
    routeNote: "PATCH /api/system-preferences",
    omittedOwnerKey: "userId",
    validPartial: { meditationEnabled: true },
  },
  {
    label: "wellnessPreferencesUpdateSchema",
    schema: wellnessPreferencesUpdateSchema,
    routeNote: "PATCH /api/wellness-preferences/:id",
    omittedOwnerKey: "userId",
    validPartial: { beliefSystem: "spiritual" },
  },
  {
    label: "userValuesRulesUpdateSchema",
    schema: userValuesRulesUpdateSchema,
    routeNote: "PATCH /api/user-values-rules/:id",
    omittedOwnerKey: "userId",
    validPartial: { reminderStyle: "gentle" },
  },
  {
    label: "featureSettingsUpdateSchema",
    schema: featureSettingsUpdateSchema,
    routeNote: "PATCH /api/feature-settings/:id",
    omittedOwnerKey: "userId",
    validPartial: { householdTasksEnabled: true },
  },
  {
    // The original Task #42 hardening was driven by the accountability
    // preferences endpoint (see #39). Including it here keeps every
    // strict settings/preferences schema in one place so a future
    // refactor that swaps `.strict()` for `.passthrough()` on ANY of
    // them fails immediately.
    label: "notificationPreferencesUpdateSchema",
    schema: notificationPreferencesUpdateSchema,
    routeNote: "PUT /api/accountability/preferences",
    omittedOwnerKey: "userId",
    validPartial: { accountabilityEnabled: true },
  },
];

describe("strict update schemas reject unknown fields", () => {
  for (const { label, schema, routeNote, omittedOwnerKey, validPartial } of scenarios) {
    describe(`${label} (used by ${routeNote})`, () => {
      it("rejects a body containing a totally unknown field", () => {
        const result = schema.safeParse({
          ...validPartial,
          hackerColumn: "should be rejected",
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          // Zod surfaces unknown keys as an "unrecognized_keys" issue —
          // anything else means `.strict()` was dropped or replaced with
          // `.passthrough()` / `.strip()`.
          const codes = result.error.issues.map((issue) => issue.code);
          expect(codes).toContain("unrecognized_keys");
        }
      });

      it(`rejects ${omittedOwnerKey} so it can't be mass-assigned from the body`, () => {
        const result = schema.safeParse({
          ...validPartial,
          [omittedOwnerKey]: "spoofed-owner-id",
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          // The owner key has been .omit()ed from the schema, so it shows
          // up as an unrecognized key (not a type error).
          const flat = result.error.flatten();
          const all = JSON.stringify(flat);
          expect(all).toContain(omittedOwnerKey);
        }
      });

      it("accepts an empty partial body", () => {
        const result = schema.safeParse({});
        expect(result.success).toBe(true);
      });

      it("accepts a valid single-field partial body", () => {
        const result = schema.safeParse(validPartial);
        expect(result.success).toBe(true);
        if (result.success) {
          // The parsed data must contain the field we sent — proves the
          // schema isn't silently stripping it.
          const sentKey = Object.keys(validPartial)[0]!;
          expect(result.data).toHaveProperty(sentKey);
        }
      });
    });
  }

  it("covers every endpoint listed in task-125 acceptance criteria", () => {
    // Sanity check so a future task can't quietly delete a scenario and
    // leave an endpoint uncovered. The eight endpoints below match the
    // "Done looks like" checklist in .local/tasks/task-125.md.
    const expectedRoutes = [
      "PATCH /api/blueprint",
      "POST /api/blueprint/baseline (upsert branch)",
      "POST /api/blueprint/signals (upsert branch)",
      "PATCH /api/profile",
      "PATCH /api/system-preferences",
      "PATCH /api/wellness-preferences/:id",
      "PATCH /api/user-values-rules/:id",
      "PATCH /api/feature-settings/:id",
      "PUT /api/accountability/preferences",
    ];
    const covered = scenarios.map((s) => s.routeNote);
    expect(covered).toEqual(expectedRoutes);
  });
});
