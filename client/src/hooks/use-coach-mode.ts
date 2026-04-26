/**
 * useCoachMode – manages the user's preferred coaching mode / tone.
 *
 * Auth users: setting lives in /api/coach-mode (stored in users.coaching_mode)
 * Guests: setting lives in localStorage under "dw_coaching_mode"
 *
 * PR #16: Coach modes / tone settings
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { coachingModeEnum, type CoachingMode } from "@shared/schema";

export { type CoachingMode };
export const COACHING_MODES = coachingModeEnum;

export const COACHING_MODE_LABELS: Record<CoachingMode, string> = {
  gentle: "Gentle",
  direct: "Direct",
  structured: "Structured",
};

export const COACHING_MODE_DESCRIPTIONS: Record<CoachingMode, string> = {
  gentle: "Warm, validating, and supportive — leads with empathy before action",
  direct: "Clear, no-fluff guidance — gets to the point with confident recommendations",
  structured: "Step-by-step, organized — uses lists and frameworks to break things down",
};

const GUEST_KEY = "dw_coaching_mode";
const QUERY_KEY = ["/api/coach-mode"] as const;

function getGuestCoachMode(): CoachingMode {
  try {
    const stored = localStorage.getItem(GUEST_KEY);
    if (stored && (COACHING_MODES as readonly string[]).includes(stored)) {
      return stored as CoachingMode;
    }
  } catch {
    // blocked storage
  }
  return "gentle";
}

function setGuestCoachMode(mode: CoachingMode): void {
  try {
    localStorage.setItem(GUEST_KEY, mode);
  } catch {
    // blocked storage
  }
}

export function useCoachMode() {
  const { user } = useAuth();
  const isAuthenticated = Boolean(user);
  const queryClient = useQueryClient();

  // Auth path — fetch from server
  const { data: serverData } = useQuery<{ coachingMode: CoachingMode } | null>({
    queryKey: QUERY_KEY,
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  const coachMode: CoachingMode = isAuthenticated
    ? ((serverData?.coachingMode &&
        (COACHING_MODES as readonly string[]).includes(serverData.coachingMode)
          ? serverData.coachingMode
          : "gentle") as CoachingMode)
    : getGuestCoachMode();

  // Auth mutation
  const mutation = useMutation({
    mutationFn: async (mode: CoachingMode) => {
      if (isAuthenticated) {
        await apiRequest("PATCH", "/api/coach-mode", { coachingMode: mode });
        return mode;
      } else {
        setGuestCoachMode(mode);
        return mode;
      }
    },
    onSuccess: (mode) => {
      if (isAuthenticated) {
        queryClient.setQueryData(QUERY_KEY, { coachingMode: mode });
      }
    },
  });

  return {
    coachMode,
    setCoachMode: mutation.mutate,
    /** Promise-returning variant — useful when callers want to chain a save
     * indicator (e.g. `usePrefSync`) onto the mutation. */
    setCoachModeAsync: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  };
}
