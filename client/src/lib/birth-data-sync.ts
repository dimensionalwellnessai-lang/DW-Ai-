/**
 * Single write path for cosmic birth details.
 *
 * Every page that saves birth details (Cosmic Hub quick-add, Cosmic Insights
 * chart dialog, enhanced onboarding bridge) must go through this helper so
 * that:
 *  - the device cache is always owner-scoped (no cross-account leakage), and
 *  - logged-in users' details are persisted to the account API so they
 *    follow the user across devices.
 */
import { apiRequest, queryClient } from "./queryClient";
import { saveBirthDataFor, type BirthData } from "./birth-data-storage";

/**
 * Saves birth details to owner-scoped device storage and, when `userId` is
 * present (logged-in user), syncs them to the account in the background.
 */
export async function persistBirthData(data: BirthData, userId: string | null): Promise<void> {
  saveBirthDataFor(data, userId);
  if (!userId) return; // guests: device-only by design
  try {
    await apiRequest("POST", "/api/astrology/chart", data);
    void queryClient.invalidateQueries({ queryKey: ["/api/astrology/chart", userId] });
  } catch (err) {
    // Device storage already has the data; a transient failure only affects
    // other devices. Surfacing is left to callers that need it.
    console.error("Failed to save birth details to account:", err);
  }
}
