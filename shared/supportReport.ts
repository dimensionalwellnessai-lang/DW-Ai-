/**
 * Shared types for structured "Report mismatch" event hooks.
 * Used by both the server API and client components.
 */

export const MISMATCH_EVENT_TYPES = [
  "exercise_demo_mismatch",
  "recipe_mismatch",
  "content_mismatch",
] as const;

export type MismatchEventType = typeof MISMATCH_EVENT_TYPES[number];

export const MISMATCH_EVENT_LABELS: Record<MismatchEventType, string> = {
  exercise_demo_mismatch: "Exercise Demo Mismatch",
  recipe_mismatch: "Recipe / Meal Mismatch",
  content_mismatch: "Content Feed Mismatch",
};

export interface MismatchReportPayload {
  /** Structured event type for triage grouping */
  eventType: MismatchEventType;
  /** What the user originally requested / expected */
  requestedItem: string;
  /** The closest match that was actually shown */
  closestMatch: string;
  /** Optional free-form details from the user */
  details?: string;
  /** Page / section context (e.g. "/workout", "/meal-prep") */
  pageContext?: string;
}
