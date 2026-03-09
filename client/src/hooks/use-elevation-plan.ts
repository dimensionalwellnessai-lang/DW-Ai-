/**
 * useElevationPlan – hook for generating, fetching, and managing the
 * 7-day Elevation Plan (PR #5).
 *
 * - Auth users: data lives in the DB via /api/elevation-plans/* endpoints.
 * - Guest users: data lives in localStorage via elevation-plan-storage helpers.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { isFeatureEnabled } from "@/config/featureFlags";
import { useLearningProfile } from "@/hooks/use-learning-profile";
import { STALE_TIME } from "@/lib/queryClient";
import {
  getGuestActivePlan,
  getGuestElevationPlans,
  getGuestElevationPlanFull,
  getGuestDraftPlanForDay,
  saveGuestElevationPlan,
  saveGuestElevationPlanDay,
  saveGuestElevationPlanAction,
  updateGuestElevationPlan,
  updateGuestElevationPlanAction,
} from "@/lib/elevation-plan-storage";
import { generateElevationPlanClientSide } from "@/lib/elevation-plan-client";

export type ElevationPlanStatus = "draft" | "active" | "archived";

export interface ElevationPlanActionItem {
  id: string;
  planDayId: string;
  actionType: string;
  title: string;
  description: string;
  timeOfDay?: string | null;
  durationMinutes?: number | null;
  isCompleted: boolean;
  linkedEntity?: { type: "calendar_event" | "task"; id: string } | null;
  createdAt: string;
  updatedAt?: string;
}

export interface ElevationPlanDayItem {
  id: string;
  planId: string;
  dayIndex: number;
  theme: string;
  intention: string;
  createdAt: string;
  actions: ElevationPlanActionItem[];
}

export interface ElevationPlanItem {
  id: string;
  title: string;
  goal?: string | null;
  focusDimension?: string | null;
  status: ElevationPlanStatus;
  startDate: string;
  endDate: string;
  sourceConversationId?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface ElevationPlanFull {
  plan: ElevationPlanItem;
  days: ElevationPlanDayItem[];
}

export interface ElevationPlanWithStats extends ElevationPlanItem {
  totalActions: number;
  completedActions: number;
}

const ACTIVE_PLAN_KEY = "/api/elevation-plans/active";
const ALL_PLANS_KEY = "/api/elevation-plans";

export function useElevationPlan() {
  const { user } = useAuth();
  const isLoggedIn = Boolean(user);
  const queryClient = useQueryClient();
  const enabled = isFeatureEnabled("ELEVATION_PLAN");
  const { sendLearningEvent } = useLearningProfile();

  // ─── Fetch active plan ─────────────────────────────────────────────────────

  const {
    data: activePlanData,
    isLoading: isLoadingActive,
    refetch: refetchActive,
  } = useQuery<ElevationPlanFull | null>({
    queryKey: [ACTIVE_PLAN_KEY],
    enabled,
    queryFn: async () => {
      if (isLoggedIn) {
        const res = await fetch(ACTIVE_PLAN_KEY, { credentials: "include" });
        if (!res.ok) return null;
        return res.json() as Promise<ElevationPlanFull | null>;
      }
      // Guest path
      const guestPlan = getGuestActivePlan();
      if (!guestPlan) return null;
      return getGuestElevationPlanFull(guestPlan.id) as ElevationPlanFull | null;
    },
    staleTime: STALE_TIME.MEDIUM,
  });

  // ─── Generate / get draft plan ─────────────────────────────────────────────

  const generateDraftMutation = useMutation<
    ElevationPlanFull,
    Error,
    {
      conversationId?: string;
      reasons?: string;
      recentInsights?: string;
      userPreferences?: string;
      focusDimension?: string;
    }
  >({
    mutationFn: async (opts) => {
      if (isLoggedIn) {
        const res = await fetch("/api/elevation-plans/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(opts),
        });
        if (!res.ok) throw new Error("Failed to generate elevation plan");
        return res.json() as Promise<ElevationPlanFull>;
      }

      // Guest path: check idempotency first
      const today = new Date().toISOString().slice(0, 10);
      const existing = getGuestDraftPlanForDay(today, opts.conversationId);
      if (existing) {
        const full = getGuestElevationPlanFull(existing.id);
        if (full) return full as ElevationPlanFull;
      }

      // Generate client-side for guests
      const structure = await generateElevationPlanClientSide(opts);
      if (!structure) throw new Error("Failed to generate elevation plan");

      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 6);

      const plan = saveGuestElevationPlan({
        title: structure.title,
        goal: structure.goal,
        focusDimension: structure.focusDimension,
        status: "draft",
        startDate: today,
        endDate: endDate.toISOString().slice(0, 10),
        sourceConversationId: opts.conversationId,
      });

      const days = structure.days.slice(0, 7).map((dayData) => {
        const day = saveGuestElevationPlanDay({
          planId: plan.id,
          dayIndex: dayData.dayIndex,
          theme: dayData.theme,
          intention: dayData.intention,
        });
        const actions = (dayData.actions ?? []).slice(0, 4).map((a) =>
          saveGuestElevationPlanAction({
            planDayId: day.id,
            actionType: a.actionType,
            title: a.title,
            description: a.description,
            timeOfDay: a.timeOfDay,
            durationMinutes: a.durationMinutes,
            isCompleted: false,
          })
        );
        return { ...day, actions };
      });

      return { plan: plan as ElevationPlanItem, days: days as ElevationPlanDayItem[] };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ACTIVE_PLAN_KEY] });
    },
  });

  // ─── Update plan (title/goal/status) ──────────────────────────────────────

  const updatePlanMutation = useMutation<
    ElevationPlanItem,
    Error,
    { id: string; title?: string; goal?: string; status?: ElevationPlanStatus }
  >({
    mutationFn: async ({ id, title, goal, status }) => {
      if (isLoggedIn) {
        const res = await fetch(`/api/elevation-plans/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ title, goal, status }),
        });
        if (!res.ok) throw new Error("Failed to update plan");
        return res.json() as Promise<ElevationPlanItem>;
      }
      updateGuestElevationPlan(id, { title, goal, status });
      const updated = getGuestElevationPlans().find((p) => p.id === id) ?? { id, title: title ?? "", status: status ?? "draft", startDate: "", endDate: "", createdAt: "" };
      return updated as unknown as ElevationPlanItem;
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: [ACTIVE_PLAN_KEY] });
      queryClient.invalidateQueries({ queryKey: [`/api/elevation-plans/${id}`] });
    },
  });

  // ─── Toggle action complete ────────────────────────────────────────────────

  const toggleActionMutation = useMutation<
    ElevationPlanActionItem,
    Error,
    { id: string; isCompleted: boolean; planId?: string; actionType?: string; title?: string }
  >({
    mutationFn: async ({ id, isCompleted, actionType, title }) => {
      if (isLoggedIn) {
        const res = await fetch(`/api/elevation-plan-actions/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ isCompleted }),
        });
        if (!res.ok) throw new Error("Failed to update action");
        return res.json() as Promise<ElevationPlanActionItem>;
      }
      updateGuestElevationPlanAction(id, { isCompleted });
      // For guests, build a minimal record using the variables passed in
      return { id, isCompleted, actionType: actionType ?? "", title: title ?? "" } as ElevationPlanActionItem;
    },
    onSuccess: (data, { planId, isCompleted }) => {
      queryClient.invalidateQueries({ queryKey: [ACTIVE_PLAN_KEY] });
      if (planId) queryClient.invalidateQueries({ queryKey: [`/api/elevation-plans/${planId}`] });
      // Fire-and-forget: update learning profile when an action is marked complete
      if (isCompleted && data?.actionType) {
        void sendLearningEvent("plan_action_complete", {
          actionType: data.actionType,
          title: data.title,
        });
      }
    },
  });

  // ─── Update action text ────────────────────────────────────────────────────

  const updateActionMutation = useMutation<
    ElevationPlanActionItem,
    Error,
    { id: string; title?: string; description?: string; planId?: string }
  >({
    mutationFn: async ({ id, title, description }) => {
      if (isLoggedIn) {
        const res = await fetch(`/api/elevation-plan-actions/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ title, description }),
        });
        if (!res.ok) throw new Error("Failed to update action");
        return res.json() as Promise<ElevationPlanActionItem>;
      }
      updateGuestElevationPlanAction(id, { title, description });
      return { id, title, description } as ElevationPlanActionItem;
    },
    onSuccess: (_data, { planId }) => {
      queryClient.invalidateQueries({ queryKey: [ACTIVE_PLAN_KEY] });
      if (planId) queryClient.invalidateQueries({ queryKey: [`/api/elevation-plans/${planId}`] });
    },
  });

  // ─── Add action to calendar ────────────────────────────────────────────────

  const addToCalendarMutation = useMutation<
    { action: ElevationPlanActionItem; calendarEvent: { id: string; title: string } },
    Error,
    { actionId: string; planDayIndex: number; planStartDate: string; planTitle?: string; planId?: string }
  >({
    mutationFn: async ({ actionId, planDayIndex, planStartDate, planTitle }) => {
      const res = await fetch(`/api/elevation-plan-actions/${actionId}/add-to-calendar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ planDayIndex, planStartDate, planTitle }),
      });
      if (res.status === 409) {
        const body = await res.json() as { error: string };
        throw new Error(body.error ?? "Already linked to calendar");
      }
      if (!res.ok) throw new Error("Failed to add to calendar");
      return res.json() as Promise<{ action: ElevationPlanActionItem; calendarEvent: { id: string; title: string } }>;
    },
    onSuccess: (_data, { planId }) => {
      queryClient.invalidateQueries({ queryKey: [ACTIVE_PLAN_KEY] });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar"] });
      if (planId) queryClient.invalidateQueries({ queryKey: [`/api/elevation-plans/${planId}`] });
    },
  });

  // ─── Remove action from calendar ──────────────────────────────────────────

  const removeFromCalendarMutation = useMutation<
    { action: ElevationPlanActionItem; success: boolean },
    Error,
    { actionId: string; planId?: string }
  >({
    mutationFn: async ({ actionId }) => {
      const res = await fetch(`/api/elevation-plan-actions/${actionId}/remove-from-calendar`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove from calendar");
      return res.json() as Promise<{ action: ElevationPlanActionItem; success: boolean }>;
    },
    onSuccess: (_data, { planId }) => {
      queryClient.invalidateQueries({ queryKey: [ACTIVE_PLAN_KEY] });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar"] });
      if (planId) queryClient.invalidateQueries({ queryKey: [`/api/elevation-plans/${planId}`] });
    },
  });

  // ─── Add action to tasks ───────────────────────────────────────────────────

  const addToTasksMutation = useMutation<
    { action: ElevationPlanActionItem; task: { id: string; title: string } },
    Error,
    { actionId: string; planDayIndex: number; planStartDate: string; planId?: string }
  >({
    mutationFn: async ({ actionId, planDayIndex, planStartDate }) => {
      const res = await fetch(`/api/elevation-plan-actions/${actionId}/add-to-tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ planDayIndex, planStartDate }),
      });
      if (res.status === 409) {
        const body = await res.json() as { error: string };
        throw new Error(body.error ?? "Already linked to a task");
      }
      if (!res.ok) throw new Error("Failed to add to tasks");
      return res.json() as Promise<{ action: ElevationPlanActionItem; task: { id: string; title: string } }>;
    },
    onSuccess: (_data, { planId }) => {
      queryClient.invalidateQueries({ queryKey: [ACTIVE_PLAN_KEY] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      if (planId) queryClient.invalidateQueries({ queryKey: [`/api/elevation-plans/${planId}`] });
    },
  });

  // ─── Remove action from tasks ─────────────────────────────────────────────

  const removeFromTasksMutation = useMutation<
    { action: ElevationPlanActionItem; success: boolean },
    Error,
    { actionId: string; planId?: string }
  >({
    mutationFn: async ({ actionId }) => {
      const res = await fetch(`/api/elevation-plan-actions/${actionId}/remove-from-tasks`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove from tasks");
      return res.json() as Promise<{ action: ElevationPlanActionItem; success: boolean }>;
    },
    onSuccess: (_data, { planId }) => {
      queryClient.invalidateQueries({ queryKey: [ACTIVE_PLAN_KEY] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      if (planId) queryClient.invalidateQueries({ queryKey: [`/api/elevation-plans/${planId}`] });
    },
  });

  return {
    enabled,
    activePlan: activePlanData ?? null,
    isLoadingActive,
    refetchActive,
    generateDraft: generateDraftMutation.mutateAsync,
    isGenerating: generateDraftMutation.isPending,
    generateError: generateDraftMutation.error,
    updatePlan: updatePlanMutation.mutateAsync,
    isUpdatingPlan: updatePlanMutation.isPending,
    toggleAction: toggleActionMutation.mutateAsync,
    updateAction: updateActionMutation.mutateAsync,
    addToCalendar: addToCalendarMutation.mutateAsync,
    isAddingToCalendar: addToCalendarMutation.isPending,
    removeFromCalendar: removeFromCalendarMutation.mutateAsync,
    isRemovingFromCalendar: removeFromCalendarMutation.isPending,
    addToTasks: addToTasksMutation.mutateAsync,
    isAddingToTasks: addToTasksMutation.isPending,
    removeFromTasks: removeFromTasksMutation.mutateAsync,
    isRemovingFromTasks: removeFromTasksMutation.isPending,
  };
}
