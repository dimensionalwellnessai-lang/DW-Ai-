/**
 * useDailyCheckin – manages today's daily check-in for both auth and guest users.
 *
 * Auth users: data lives in /api/daily-checkins (PostgreSQL)
 * Guests: data lives in localStorage via guest-storage
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import {
  getTodayGuestCheckin,
  upsertGuestDailyCheckin,
  getRecentGuestCheckins,
  type GuestDailyCheckin,
} from "@/lib/guest-storage";

export interface DailyCheckinData {
  id: string;
  date: string;
  moodScore: number; // 1–5
  constraintType: string;
  constraintNote: string | null;
  createdAt: string | number;
}

export interface SubmitCheckinInput {
  date: string;
  moodScore: number;
  constraintType: string;
  constraintNote?: string;
}

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Public hook ────────────────────────────────────────────────────────────────

export function useDailyCheckin() {
  const { user, isLoading: authLoading } = useAuth();
  const isLoggedIn = Boolean(user);
  const qc = useQueryClient();
  const today = getTodayDate();

  // Auth: fetch from API (only when logged in)
  const authTodayQuery = useQuery<DailyCheckinData | null>({
    queryKey: ["/api/daily-checkins/today"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isLoggedIn,
    retry: false,
  });

  // Guest: fetch from localStorage (only when not logged in)
  const guestTodayQuery = useQuery<GuestDailyCheckin | null>({
    queryKey: ["guest_daily_checkin_today", today],
    queryFn: () => getTodayGuestCheckin(today),
    enabled: !isLoggedIn && !authLoading,
    retry: false,
  });

  const authMutation = useMutation({
    mutationFn: async (input: SubmitCheckinInput) => {
      const res = await apiRequest("POST", "/api/daily-checkins", input);
      return res.json() as Promise<DailyCheckinData>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/daily-checkins/today"] });
      qc.invalidateQueries({ queryKey: ["/api/daily-checkins/recent"] });
    },
  });

  const guestMutation = useMutation({
    mutationFn: async (input: SubmitCheckinInput): Promise<GuestDailyCheckin> => {
      return upsertGuestDailyCheckin({
        date: input.date,
        moodScore: input.moodScore,
        constraintType: input.constraintType,
        constraintNote: input.constraintNote ?? null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["guest_daily_checkin_today"] });
      qc.invalidateQueries({ queryKey: ["guest_daily_checkins_recent"] });
    },
  });

  if (isLoggedIn) {
    return {
      todayCheckin: authTodayQuery.data ?? null,
      isLoading: authLoading || authTodayQuery.isLoading,
      submitCheckin: authMutation.mutateAsync,
      isSubmitting: authMutation.isPending,
      today,
    };
  }

  return {
    todayCheckin: guestTodayQuery.data ?? null,
    isLoading: authLoading || guestTodayQuery.isLoading,
    submitCheckin: guestMutation.mutateAsync,
    isSubmitting: guestMutation.isPending,
    today,
  };
}

// ── Recent check-ins utility (for PR3 momentum integration) ───────────────────

export function useRecentCheckins(days = 14) {
  const { user, isLoading: authLoading } = useAuth();
  const isLoggedIn = Boolean(user);

  const authQuery = useQuery<DailyCheckinData[]>({
    queryKey: ["/api/daily-checkins/recent", days],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isLoggedIn,
    retry: false,
  });

  const guestQuery = useQuery<GuestDailyCheckin[]>({
    queryKey: ["guest_daily_checkins_recent", days],
    queryFn: () => getRecentGuestCheckins(days),
    enabled: !isLoggedIn && !authLoading,
    retry: false,
  });

  if (isLoggedIn) {
    return { checkins: authQuery.data ?? [], isLoading: authQuery.isLoading };
  }
  return { checkins: guestQuery.data ?? [], isLoading: guestQuery.isLoading };
}
