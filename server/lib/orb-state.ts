/**
 * Orb State aggregator — the brain of the DW app (Roadmap §15.2).
 *
 * Returns a single OrbState object for the Command Center that turns the Orb
 * from a chat launcher into the user's "what now?" hub:
 *   • Today's focus (from daily briefs)
 *   • Energy reading (from energy score)
 *   • Top priority (AI-ranked goal/task)
 *   • One-tap actions
 *   • Quick pulse data
 */

import { storage } from "../storage";
import { computeEnergyScore, type EnergyScoreResult } from "./energy-score";

export interface OrbAction {
  id: string;
  label: string;
  route: string;
  icon?: string;
}

export interface OrbState {
  /** Brief focus statement for today. */
  todayFocus: string | null;
  /** Live energy score. */
  energy: EnergyScoreResult;
  /** Top priority goal or task. */
  topPriority: { title: string; route: string } | null;
  /** Quick one-tap actions contextual to user state. */
  actions: OrbAction[];
  /** Last pulse check-in time (ISO). */
  lastPulseAt: string | null;
  /** Greeting based on time of day. */
  greeting: string;
}

function getGreeting(hour: number, firstName?: string): string {
  const name = firstName ? `, ${firstName}` : "";
  if (hour < 5) return `Still up${name}? Be gentle with yourself.`;
  if (hour < 12) return `Good morning${name}.`;
  if (hour < 17) return `Good afternoon${name}.`;
  if (hour < 21) return `Good evening${name}.`;
  return `Winding down${name}?`;
}

export async function buildOrbState(userId: string): Promise<OrbState> {
  const [energy, user, goals, todaysMood, habits] = await Promise.all([
    computeEnergyScore(userId),
    storage.getUser(userId).catch(() => null),
    storage.getGoals(userId).catch(() => []),
    storage.getTodaysMoodLog(userId).catch(() => null),
    storage.getHabits(userId).catch(() => []),
  ]);

  const hour = new Date().getHours();
  const firstName = user?.firstName ?? user?.username ?? undefined;
  const greeting = getGreeting(hour, firstName);

  // Top priority: highest-priority active goal
  const activeGoals = goals.filter((g) => g.isActive);
  const topPriority = activeGoals.length > 0
    ? { title: activeGoals[0].title, route: "/goals" }
    : null;

  // Today focus based on energy band
  let todayFocus: string | null = null;
  if (energy.band === "low") {
    todayFocus = "Rest and recovery today. Be kind to yourself.";
  } else if (energy.band === "high") {
    todayFocus = "Energy is high — great day to push toward your goals.";
  } else {
    todayFocus = "Steady energy. A good day for habits and routines.";
  }

  // Contextual actions based on state
  const actions: OrbAction[] = [];

  if (!todaysMood) {
    actions.push({
      id: "log-mood",
      label: "Log mood",
      route: "/mood-tracker",
      icon: "heart",
    });
  }

  const activeHabits = habits.filter((h) => h.isActive);
  if (activeHabits.length > 0) {
    actions.push({
      id: "habits",
      label: `${activeHabits.length} habit${activeHabits.length === 1 ? "" : "s"} today`,
      route: "/habits",
      icon: "check-circle",
    });
  }

  if (energy.band === "low") {
    actions.push({
      id: "breathe",
      label: "Breath reset",
      route: "/recovery",
      icon: "wind",
    });
  } else if (energy.band === "high") {
    actions.push({
      id: "workout",
      label: "Start workout",
      route: "/workout",
      icon: "dumbbell",
    });
  }

  actions.push({
    id: "journal",
    label: "Quick journal",
    route: "/journal",
    icon: "pencil",
  });

  // Only keep 4 actions max
  const finalActions = actions.slice(0, 4);

  const lastPulseAt = todaysMood?.createdAt
    ? new Date(todaysMood.createdAt).toISOString()
    : null;

  return {
    todayFocus,
    energy,
    topPriority,
    actions: finalActions,
    lastPulseAt,
    greeting,
  };
}
