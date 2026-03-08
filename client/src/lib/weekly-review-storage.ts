/**
 * weekly-review-storage.ts
 *
 * Local storage helpers for the Weekly Review feature (PR #15).
 * Used by guest users – authenticated users use the DB via API endpoints.
 */

export interface GuestWeeklyPlanReview {
  id: string;
  planId: string;
  wins: string[];
  frictionPoints: string[];
  completionRate: number;
  feedbackWorked: string;
  feedbackImprove: string;
  /** "draft" while editing; "submitted" once confirmed */
  status: "draft" | "submitted";
  createdAt: string;
  updatedAt: string;
}

const REVIEWS_KEY = "dw_weekly_plan_reviews";

function generateId(): string {
  return `guest_wr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function readJson<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeJson<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Blocked storage – silently fail
  }
}

export function getGuestWeeklyPlanReview(planId: string): GuestWeeklyPlanReview | null {
  return readJson<GuestWeeklyPlanReview>(REVIEWS_KEY).find((r) => r.planId === planId) ?? null;
}

export function saveGuestWeeklyPlanReview(
  data: Omit<GuestWeeklyPlanReview, "id" | "createdAt" | "updatedAt">
): GuestWeeklyPlanReview {
  const reviews = readJson<GuestWeeklyPlanReview>(REVIEWS_KEY).filter((r) => r.planId !== data.planId);
  const now = new Date().toISOString();
  const review: GuestWeeklyPlanReview = { ...data, id: generateId(), createdAt: now, updatedAt: now };
  writeJson(REVIEWS_KEY, [review, ...reviews]);
  return review;
}

export function updateGuestWeeklyPlanReview(
  planId: string,
  data: Partial<GuestWeeklyPlanReview>
): GuestWeeklyPlanReview | null {
  const reviews = readJson<GuestWeeklyPlanReview>(REVIEWS_KEY);
  const idx = reviews.findIndex((r) => r.planId === planId);
  if (idx === -1) return null;
  const updated = { ...reviews[idx], ...data, updatedAt: new Date().toISOString() };
  reviews[idx] = updated;
  writeJson(REVIEWS_KEY, reviews);
  return updated;
}
