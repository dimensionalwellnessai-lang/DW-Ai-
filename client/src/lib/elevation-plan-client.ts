/**
 * elevation-plan-client.ts
 *
 * Client-side helper that calls the server's draft endpoint to generate a
 * 7-day elevation plan structure. Used indirectly by the useElevationPlan hook
 * for guest users via the /api/elevation-plans/draft endpoint which returns
 * the generated structure without persisting to DB.
 *
 * For guest users we call a lightweight preview endpoint that returns the AI
 * structure without user authentication.
 */

export interface ElevationPlanActionStructure {
  actionType: string;
  title: string;
  description: string;
  timeOfDay?: string;
  durationMinutes?: number;
}

export interface ElevationPlanDayStructure {
  dayIndex: number;
  theme: string;
  intention: string;
  actions: ElevationPlanActionStructure[];
}

export interface ElevationPlanStructure {
  title: string;
  goal: string;
  focusDimension: string;
  days: ElevationPlanDayStructure[];
}

/**
 * Generate elevation plan structure for guest users via the preview endpoint.
 * Auth users use the POST /api/elevation-plans/draft endpoint directly.
 */
export async function generateElevationPlanClientSide(context: {
  reasons?: string;
  recentInsights?: string;
  userPreferences?: string;
  focusDimension?: string;
  conversationId?: string;
}): Promise<ElevationPlanStructure | null> {
  try {
    const res = await fetch("/api/elevation-plans/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(context),
    });
    if (!res.ok) return null;
    return res.json() as Promise<ElevationPlanStructure>;
  } catch {
    return null;
  }
}
