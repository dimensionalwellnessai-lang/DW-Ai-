/**
 * use-weekly-review.ts
 *
 * Hook for the Weekly Review feature (PR #15).
 * - Auth users: data lives in the DB via /api/weekly-review/* endpoints.
 * - Guest users: data lives in localStorage via weekly-review-storage helpers.
 *
 * Integrates with:
 * - PR #5 (Elevation Plan): archives the plan on review submission
 * - PR #8 (DW Learns): updates learning profile wins/friction on submission
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { isFeatureEnabled } from "@/config/featureFlags";
import { useLearningProfile } from "@/hooks/use-learning-profile";
import {
  getGuestWeeklyPlanReview,
  saveGuestWeeklyPlanReview,
  updateGuestWeeklyPlanReview,
  type GuestWeeklyPlanReview,
} from "@/lib/weekly-review-storage";
import {
  getGuestElevationPlanFull,
  updateGuestElevationPlan,
  type GuestElevationPlan,
} from "@/lib/elevation-plan-storage";
import type { ElevationPlanItem, ElevationPlanDayItem } from "@/hooks/use-elevation-plan";

export interface WeeklyReview {
  id: string;
  planId: string;
  wins: string[];
  frictionPoints: string[];
  completionRate: number;
  feedbackWorked: string;
  feedbackImprove: string;
  status: "draft" | "submitted";
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyReviewData {
  review: WeeklyReview;
  plan: ElevationPlanItem;
  days: ElevationPlanDayItem[];
}

/** Returns whether a plan's end date has passed (review is due). */
export function isPlanReviewDue(endDate: string): boolean {
  const end = new Date(endDate);
  // Make sure we compare date only (not time)
  end.setHours(23, 59, 59, 999);
  return new Date() > end;
}

/**
 * Build a guest WeeklyReviewData from localStorage plan data.
 * Computes wins/friction from completed/incomplete actions.
 */
function buildGuestReviewData(planId: string): WeeklyReviewData | null {
  const full = getGuestElevationPlanFull(planId);
  if (!full) return null;

  const existing = getGuestWeeklyPlanReview(planId);
  if (existing) {
    return {
      review: existing as WeeklyReview,
      plan: full.plan as unknown as ElevationPlanItem,
      days: full.days as unknown as ElevationPlanDayItem[],
    };
  }

  // Auto-generate recap from plan completion data
  const wins: string[] = [];
  const frictionPoints: string[] = [];
  let totalActions = 0;
  let completedActions = 0;

  for (const day of full.days) {
    for (const action of day.actions) {
      totalActions++;
      if (action.isCompleted) {
        completedActions++;
        wins.push(action.title);
      } else {
        frictionPoints.push(action.title);
      }
    }
  }

  const completionRate = totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0;

  const review = saveGuestWeeklyPlanReview({
    planId,
    wins: wins.slice(0, 10),
    frictionPoints: frictionPoints.slice(0, 10),
    completionRate,
    feedbackWorked: "",
    feedbackImprove: "",
    status: "draft",
  });

  return {
    review: review as WeeklyReview,
    plan: full.plan as unknown as ElevationPlanItem,
    days: full.days as unknown as ElevationPlanDayItem[],
  };
}

export function useWeeklyReview(planId: string | null) {
  const { user } = useAuth();
  const isLoggedIn = Boolean(user);
  const queryClient = useQueryClient();
  const enabled = isFeatureEnabled("WEEKLY_REVIEW");
  const { sendLearningEvent } = useLearningProfile();

  const queryKey = ["/api/weekly-review", planId];

  // ─── Fetch review + plan data ──────────────────────────────────────────────

  const {
    data,
    isLoading,
    refetch,
  } = useQuery<WeeklyReviewData | null>({
    queryKey,
    enabled: enabled && !!planId,
    queryFn: async () => {
      if (!planId) return null;

      if (isLoggedIn) {
        const res = await fetch(`/api/weekly-review/${planId}`, { credentials: "include" });
        if (!res.ok) return null;
        return res.json() as Promise<WeeklyReviewData>;
      }

      return buildGuestReviewData(planId);
    },
    staleTime: 30_000,
  });

  // ─── Submit / update review ────────────────────────────────────────────────

  const submitMutation = useMutation<
    WeeklyReview,
    Error,
    {
      feedbackWorked?: string;
      feedbackImprove?: string;
      wins?: string[];
      frictionPoints?: string[];
      status: "draft" | "submitted";
    }
  >({
    mutationFn: async (fields) => {
      if (!planId) throw new Error("No plan selected");

      if (isLoggedIn) {
        const res = await fetch(`/api/weekly-review/${planId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(fields),
        });
        if (!res.ok) throw new Error("Failed to submit weekly review");
        return res.json() as Promise<WeeklyReview>;
      }

      // Guest path
      const existing = getGuestWeeklyPlanReview(planId);
      if (existing) {
        const updated = updateGuestWeeklyPlanReview(planId, fields);
        if (!updated) throw new Error("Review not found");
        // On submit: archive the plan + update learning profile
        if (fields.status === "submitted") {
          updateGuestElevationPlan(planId, { status: "archived" });
          const wins = updated.wins ?? [];
          const friction = updated.frictionPoints ?? [];
          if (wins.length > 0) {
            await sendLearningEvent("weekly_review_wins", { wins, friction });
          }
        }
        return updated as WeeklyReview;
      } else {
        const full = getGuestElevationPlanFull(planId);
        if (!full) throw new Error("Plan not found");

        // Calculate completion rate from plan actions
        let totalActions = 0;
        let completedActions = 0;
        for (const day of full.days) {
          for (const action of day.actions) {
            totalActions++;
            if (action.isCompleted) completedActions++;
          }
        }
        const completionRate = totalActions > 0
          ? Math.round((completedActions / totalActions) * 100)
          : 0;

        const review = saveGuestWeeklyPlanReview({
          planId,
          wins: fields.wins ?? [],
          frictionPoints: fields.frictionPoints ?? [],
          completionRate,
          feedbackWorked: fields.feedbackWorked ?? "",
          feedbackImprove: fields.feedbackImprove ?? "",
          status: fields.status,
        });
        if (fields.status === "submitted") {
          updateGuestElevationPlan(planId, { status: "archived" });
        }
        return review as WeeklyReview;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["/api/elevation-plans/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/elevation-plans"] });
    },
  });

  return {
    enabled,
    data: data ?? null,
    review: data?.review ?? null,
    plan: data?.plan ?? null,
    days: data?.days ?? [],
    isLoading,
    refetch,
    submitReview: submitMutation.mutateAsync,
    isSubmitting: submitMutation.isPending,
    submitError: submitMutation.error,
  };
}
