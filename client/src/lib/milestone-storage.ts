/**
 * Milestone Storage
 *
 * Tracks which milestone moments the user has already seen so we never
 * surface the same celebration twice.  Keys are stored as a plain string
 * array in localStorage.
 *
 * Key format:  "<switchId>:<status>"   e.g. "body:stable"
 *              "insight:first"
 *              "<custom>"
 */

import type { MilestoneType } from "@/components/milestone-moment";
import type { SwitchId, SwitchStatus } from "@/lib/switch-storage";

const STORAGE_KEY = "dw_milestones_seen";

// ── Low-level helpers ─────────────────────────────────────────────────────────

function readSeenKeys(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as string[]) : [];
  } catch {
    return [];
  }
}

function writeSeenKeys(keys: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  } catch (e) {
    console.error("milestone-storage: write error", e);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Build the canonical key for a switch-status milestone. */
export function switchMilestoneKey(switchId: SwitchId, status: SwitchStatus): string {
  return `${switchId}:${status}`;
}

/** Build the canonical key for an insight milestone. */
export function insightMilestoneKey(tag: string): string {
  return `insight:${tag}`;
}

/** Returns true when the milestone for a given key has already been seen. */
export function hasMilestoneSeen(key: string): boolean {
  return readSeenKeys().includes(key);
}

/** Marks a milestone key as seen so it won't appear again. */
export function markMilestoneSeen(key: string): void {
  const keys = readSeenKeys();
  if (!keys.includes(key)) {
    writeSeenKeys([...keys, key]);
  }
}

/**
 * Map a switch status to the corresponding MilestoneType.
 * Returns null for statuses that don't have a milestone (e.g. "off").
 */
export function statusToMilestoneType(status: SwitchStatus): MilestoneType | null {
  switch (status) {
    case "flickering":
      return "switch-flickering";
    case "stable":
      return "switch-stable";
    case "powered":
      return "switch-powered";
    default:
      return null;
  }
}

/**
 * Returns the list of [switchId, MilestoneType] pairs that the user has
 * earned (based on current switch statuses) but has not yet seen.
 */
export function getPendingSwitchMilestones(
  switches: Array<{ switchId: SwitchId; status: SwitchStatus }>,
): Array<{ switchId: SwitchId; milestoneType: MilestoneType }> {
  return switches
    .filter(({ switchId, status }) => {
      const type = statusToMilestoneType(status);
      if (!type) return false;
      return !hasMilestoneSeen(switchMilestoneKey(switchId, status));
    })
    .map(({ switchId, status }) => ({
      switchId,
      milestoneType: statusToMilestoneType(status) as MilestoneType,
    }));
}
