// ── Switch ⇄ Pillar mapping ───────────────────────────────────────────────
// The Switchboard exposes 8 "switches" (life dimensions). These map cleanly
// 1:1 onto canonical Life System pillar ids (shared/lifeSystemTaxonomy.ts), so
// a check-in recorded from a switch persists to `pillar_checkins` under the
// canonical pillar id and shows up on both My Progress and Life Blueprint.
//
// We PREFER canonical pillar ids (rather than storing the raw switch string)
// because the Life Blueprint pillar cards key off canonical ids — this lets a
// switch check-in surface a "Last check-in" line on the matching pillar card.
import type { LifeSystemPillarId } from "./lifeSystemTaxonomy";

export type SwitchId =
  | "body"
  | "mind"
  | "time"
  | "purpose"
  | "money"
  | "relationships"
  | "environment"
  | "identity";

/** Canonical switchId → pillarId. Clean 1:1 mapping. */
export const SWITCH_TO_PILLAR: Record<SwitchId, LifeSystemPillarId> = {
  body: "physical_health",
  mind: "mental_emotional",
  time: "daily_rhythm",
  purpose: "purpose",
  money: "money",
  relationships: "social_environment",
  environment: "physical_environment",
  identity: "growth",
};

/** Reverse map pillarId → switchId (only for the 8 mapped pillars). */
export const PILLAR_TO_SWITCH: Partial<Record<string, SwitchId>> = Object.fromEntries(
  (Object.entries(SWITCH_TO_PILLAR) as [SwitchId, string][]).map(([s, p]) => [p, s]),
) as Partial<Record<string, SwitchId>>;

// ── Status mapping ─────────────────────────────────────────────────────────
// Switch UI statuses:  "off" | "flickering" | "stable" | "powered"
// pillar_checkins statuses: "Powered" | "Stable" | "Building" | "Needs Attention"
export type SwitchStatus = "off" | "flickering" | "stable" | "powered";
export type PillarCheckinStatus = "Powered" | "Stable" | "Building" | "Needs Attention";

export const SWITCH_TO_CHECKIN_STATUS: Record<SwitchStatus, PillarCheckinStatus> = {
  powered: "Powered",
  stable: "Stable",
  flickering: "Building",
  off: "Needs Attention",
};

export const CHECKIN_TO_SWITCH_STATUS: Record<PillarCheckinStatus, SwitchStatus> = {
  Powered: "powered",
  Stable: "stable",
  Building: "flickering",
  "Needs Attention": "off",
};

export function checkinStatusToSwitch(status: string): SwitchStatus {
  return CHECKIN_TO_SWITCH_STATUS[status as PillarCheckinStatus] ?? "off";
}
