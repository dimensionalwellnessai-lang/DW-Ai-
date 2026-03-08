/**
 * useLearningProfile – manages the user's DW learning profile for both auth and guest users.
 *
 * Auth users: data lives in /api/learning-profile (PostgreSQL)
 * Guests: data lives in localStorage via guest-storage
 *
 * PR #8: Personalization + "DW learns"
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import {
  getGuestLearningProfile,
  updateGuestLearningProfile,
  resetGuestLearningProfile,
  type GuestLearningProfile,
} from "@/lib/guest-storage";
import { isFeatureEnabled } from "@/config/featureFlags";

// Canonical shape used by both auth and guest paths
export interface LearningProfile {
  preferredTimes: Record<string, string>;
  preferredActionTypes: string[];
  sensitivity: Record<string, string>;
  frictionPoints: string[];
  wins: string[];
  avoid: string[];
  lastFeedbackAt: string | number | null;
  learningEnabled: boolean;
  updatedAt: string | number | null;
}

export type LearningProfilePatch = Partial<Omit<LearningProfile, "updatedAt">>;

// ── Selector helpers ──────────────────────────────────────────────────────────

/** Returns the recommended default reminder time (HH:MM) from the profile, or null. */
export function getRecommendedReminderTime(profile: LearningProfile | null): string | null {
  return profile?.preferredTimes?.reminder ?? null;
}

/** Returns up to `max` recommended action types from the profile. */
export function getRecommendedActionTypes(profile: LearningProfile | null, max = 3): string[] {
  return (profile?.preferredActionTypes ?? []).slice(0, max);
}

/** Returns the recommended focus dimension suggestion from the profile. */
export function getRecommendedFocusDimension(profile: LearningProfile | null): string | null {
  const types = profile?.preferredActionTypes ?? [];
  if (types.includes("workout") || types.includes("movement")) return "body";
  if (types.includes("reflection") || types.includes("mindfulness")) return "mind";
  if (types.includes("social") || types.includes("relationship")) return "relationships";
  return null;
}

/**
 * Returns 1-2 "because …" reasons explaining why a preference is set.
 * Used to make personalization transparent to the user.
 */
export function getPersonalizationReasons(profile: LearningProfile | null): string[] {
  if (!profile) return [];
  const reasons: string[] = [];
  if (profile.preferredActionTypes.length > 0) {
    reasons.push(`because you've completed ${profile.preferredActionTypes[0]} actions most often`);
  }
  if (profile.frictionPoints.length > 0) {
    reasons.push(`because ${profile.frictionPoints[0]} has come up as a challenge`);
  }
  return reasons.slice(0, 2);
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useLearningProfile() {
  const { user, isLoading: authLoading } = useAuth();
  const isLoggedIn = Boolean(user);
  const qc = useQueryClient();
  const dwLearnsEnabled = isFeatureEnabled("DW_LEARNS");

  // Auth: fetch from API
  const authQuery = useQuery<LearningProfile | null>({
    queryKey: ["/api/learning-profile"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isLoggedIn && dwLearnsEnabled,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 min
  });

  // Guest: fetch from localStorage
  const guestQuery = useQuery<GuestLearningProfile>({
    queryKey: ["guest_learning_profile"],
    queryFn: () => getGuestLearningProfile(),
    enabled: !isLoggedIn && !authLoading && dwLearnsEnabled,
    retry: false,
  });

  // Auth: patch
  const authPatchMutation = useMutation({
    mutationFn: async (patch: LearningProfilePatch) => {
      const res = await apiRequest("PATCH", "/api/learning-profile", patch);
      return res.json() as Promise<LearningProfile>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/learning-profile"] });
    },
  });

  // Auth: reset
  const authResetMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/learning-profile/reset", {});
      return res.json() as Promise<LearningProfile>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/learning-profile"] });
    },
  });

  // Guest: patch
  const guestPatchMutation = useMutation({
    mutationFn: async (patch: LearningProfilePatch): Promise<GuestLearningProfile> => {
      return updateGuestLearningProfile(patch);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["guest_learning_profile"] });
    },
  });

  // Guest: reset
  const guestResetMutation = useMutation({
    mutationFn: async (): Promise<GuestLearningProfile> => {
      return resetGuestLearningProfile();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["guest_learning_profile"] });
    },
  });

  // Auto-update (fire-and-forget) – sends a learning event to the server
  async function sendLearningEvent(
    event: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    if (!dwLearnsEnabled) return;
    if (!isLoggedIn) {
      // Guest: check learningEnabled before applying
      const current = getGuestLearningProfile();
      if (!current.learningEnabled) return;

      if (event === "plan_action_complete" && payload.actionType) {
        const pat = [...current.preferredActionTypes];
        const at = payload.actionType as string;
        const idx = pat.indexOf(at);
        if (idx !== -1) pat.splice(idx, 1);
        pat.unshift(at);
        const winLabel = payload.title as string | undefined;
        const wins = [...current.wins];
        if (winLabel && !wins.includes(winLabel)) wins.unshift(winLabel);
        updateGuestLearningProfile({ preferredActionTypes: pat.slice(0, 6), wins: wins.slice(0, 10) });
        qc.invalidateQueries({ queryKey: ["guest_learning_profile"] });

      } else if (event === "checkin" && payload.constraintType && payload.constraintType !== "none") {
        const fp = [...current.frictionPoints];
        const ct = payload.constraintType as string;
        if (!fp.includes(ct)) {
          fp.unshift(ct);
          updateGuestLearningProfile({ frictionPoints: fp.slice(0, 5) });
          qc.invalidateQueries({ queryKey: ["guest_learning_profile"] });
        }

      } else if (event === "reminder_snooze") {
        const sens = { ...current.sensitivity };
        const snoozeCount = (parseInt(String(sens._snoozeCount ?? "0"), 10) || 0) + 1;
        sens._snoozeCount = String(snoozeCount);
        if (snoozeCount >= 3) sens.reminders = "low";
        const patch: Partial<Omit<GuestLearningProfile, "updatedAt">> = { sensitivity: sens };
        const snoozedToHour = payload.snoozedToHour;
        if (typeof snoozedToHour === "number") {
          patch.preferredTimes = {
            ...current.preferredTimes,
            reminder: `${String(snoozedToHour).padStart(2, "0")}:00`,
          };
        }
        updateGuestLearningProfile(patch);
        qc.invalidateQueries({ queryKey: ["guest_learning_profile"] });

      } else if (event === "reminder_dismiss") {
        const sens = { ...current.sensitivity };
        const dismissCount = (parseInt(String(sens._dismissCount ?? "0"), 10) || 0) + 1;
        sens._dismissCount = String(dismissCount);
        if (dismissCount >= 5) sens.reminders = "low";
        updateGuestLearningProfile({ sensitivity: sens });
        qc.invalidateQueries({ queryKey: ["guest_learning_profile"] });

      } else if (event === "followup_accept" && payload.actionType) {
        const pat = [...current.preferredActionTypes];
        const at = payload.actionType as string;
        if (!pat.includes(at)) pat.push(at);
        updateGuestLearningProfile({ preferredActionTypes: pat.slice(0, 6) });
        qc.invalidateQueries({ queryKey: ["guest_learning_profile"] });

      } else if (event === "followup_dismiss" && payload.actionType) {
        const avoid = [...current.avoid];
        const at = payload.actionType as string;
        if (!avoid.includes(at)) avoid.push(at);
        updateGuestLearningProfile({ avoid: avoid.slice(0, 10) });
        qc.invalidateQueries({ queryKey: ["guest_learning_profile"] });
      }
      return;
    }
    // Auth: fire-and-forget to server
    try {
      await apiRequest("POST", "/api/learning-profile/auto-update", { event, payload });
      qc.invalidateQueries({ queryKey: ["/api/learning-profile"] });
    } catch (err) {
      // Non-critical operation; log for debugging but don't surface to user
      console.debug("[useLearningProfile] auto-update failed:", err);
    }
  }

  if (isLoggedIn) {
    const profile = authQuery.data ?? null;
    // Selectors only use the profile when personalization is actually enabled
    const effectiveProfile = (dwLearnsEnabled && profile?.learningEnabled !== false) ? profile : null;
    return {
      profile,
      isLoading: authLoading || authQuery.isLoading,
      isEnabled: effectiveProfile !== null,
      updateProfile: authPatchMutation.mutateAsync,
      isUpdating: authPatchMutation.isPending,
      resetProfile: authResetMutation.mutateAsync,
      isResetting: authResetMutation.isPending,
      sendLearningEvent,
      // Selectors – null when learning is disabled so callers fall back to their defaults
      recommendedReminderTime: getRecommendedReminderTime(effectiveProfile),
      recommendedActionTypes: getRecommendedActionTypes(effectiveProfile),
      recommendedFocusDimension: getRecommendedFocusDimension(effectiveProfile),
      personalizationReasons: getPersonalizationReasons(effectiveProfile),
    };
  }

  const guestProfile = guestQuery.data ?? null;
  const profileShape: LearningProfile | null = guestProfile
    ? {
        ...guestProfile,
        lastFeedbackAt: guestProfile.lastFeedbackAt,
        updatedAt: guestProfile.updatedAt,
      }
    : null;
  // Selectors only use the profile when personalization is actually enabled
  const effectiveGuestProfile = (dwLearnsEnabled && guestProfile?.learningEnabled !== false) ? profileShape : null;

  return {
    profile: profileShape,
    isLoading: authLoading || guestQuery.isLoading,
    isEnabled: effectiveGuestProfile !== null,
    updateProfile: async (patch: LearningProfilePatch) => {
      await guestPatchMutation.mutateAsync(patch);
    },
    isUpdating: guestPatchMutation.isPending,
    resetProfile: async () => {
      await guestResetMutation.mutateAsync();
    },
    isResetting: guestResetMutation.isPending,
    sendLearningEvent,
    // Selectors – null when learning is disabled so callers fall back to their defaults
    recommendedReminderTime: getRecommendedReminderTime(effectiveGuestProfile),
    recommendedActionTypes: getRecommendedActionTypes(effectiveGuestProfile),
    recommendedFocusDimension: getRecommendedFocusDimension(effectiveGuestProfile),
    personalizationReasons: getPersonalizationReasons(effectiveGuestProfile),
  };
}
