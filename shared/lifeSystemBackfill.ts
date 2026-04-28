/**
 * Structured tags describing what was carried over during a Life System
 * backfill.  These tags are returned by the server (instead of pre-formatted
 * English strings) so the client can render them in the user's selected
 * language via the same i18n pipeline as the rest of the banner.
 *
 * Adding a new kind here is the only place that needs to change to introduce
 * a new "carried" line — both the server (which emits the tag) and the client
 * (which renders it) reference the same discriminated union.
 */

export type LifeSystemDailyRhythmPart = "wake" | "sleep" | "peakTime";

export type LifeSystemBackfillCarriedItem =
  | { kind: "goalsToProjects"; count: number }
  | { kind: "starterTemplateProjects" }
  | { kind: "dailyRhythm"; parts: LifeSystemDailyRhythmPart[] }
  | { kind: "responsibility" }
  | { kind: "purpose" }
  | { kind: "physicalHealth" }
  | { kind: "foundation" };

export interface LifeSystemBackfillSummary {
  carried: LifeSystemBackfillCarriedItem[];
}
