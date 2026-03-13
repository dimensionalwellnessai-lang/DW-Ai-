/**
 * Tests for milestone-storage utility
 *
 * Validates the localStorage-backed seen-milestone tracking used by
 * MilestoneMoment integrations in switch-training, my-progress, and insights.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// ── localStorage mock ─────────────────────────────────────────────────────────

const localStorageStore: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => localStorageStore[key] ?? null,
  setItem: (key: string, value: string) => {
    localStorageStore[key] = value;
  },
  removeItem: (key: string) => {
    delete localStorageStore[key];
  },
  clear: () => {
    Object.keys(localStorageStore).forEach((k) => delete localStorageStore[k]);
  },
};
vi.stubGlobal("localStorage", localStorageMock);

// ─────────────────────────────────────────────────────────────────────────────

import {
  switchMilestoneKey,
  insightMilestoneKey,
  hasMilestoneSeen,
  markMilestoneSeen,
  statusToMilestoneType,
  getPendingSwitchMilestones,
} from "../lib/milestone-storage";

describe("milestone-storage: key helpers", () => {
  it("switchMilestoneKey formats correctly", () => {
    expect(switchMilestoneKey("body", "stable")).toBe("body:stable");
    expect(switchMilestoneKey("mind", "powered")).toBe("mind:powered");
  });

  it("insightMilestoneKey formats correctly", () => {
    expect(insightMilestoneKey("first")).toBe("insight:first");
  });
});

describe("milestone-storage: seen tracking", () => {
  beforeEach(() => localStorageMock.clear());

  it("hasMilestoneSeen returns false initially", () => {
    expect(hasMilestoneSeen("body:stable")).toBe(false);
  });

  it("hasMilestoneSeen returns true after markMilestoneSeen", () => {
    markMilestoneSeen("body:stable");
    expect(hasMilestoneSeen("body:stable")).toBe(true);
  });

  it("markMilestoneSeen is idempotent", () => {
    markMilestoneSeen("body:stable");
    markMilestoneSeen("body:stable");
    const stored = JSON.parse(localStorageMock.getItem("dw_milestones_seen") ?? "[]");
    expect(stored.filter((k: string) => k === "body:stable")).toHaveLength(1);
  });

  it("tracks multiple milestones independently", () => {
    markMilestoneSeen("body:stable");
    markMilestoneSeen("mind:powered");
    expect(hasMilestoneSeen("body:stable")).toBe(true);
    expect(hasMilestoneSeen("mind:powered")).toBe(true);
    expect(hasMilestoneSeen("time:stable")).toBe(false);
  });
});

describe("milestone-storage: statusToMilestoneType", () => {
  it("maps flickering → switch-flickering", () => {
    expect(statusToMilestoneType("flickering")).toBe("switch-flickering");
  });

  it("maps stable → switch-stable", () => {
    expect(statusToMilestoneType("stable")).toBe("switch-stable");
  });

  it("maps powered → switch-powered", () => {
    expect(statusToMilestoneType("powered")).toBe("switch-powered");
  });

  it("returns null for off status", () => {
    expect(statusToMilestoneType("off")).toBeNull();
  });
});

describe("milestone-storage: getPendingSwitchMilestones", () => {
  beforeEach(() => localStorageMock.clear());

  it("returns milestones for active unseen statuses", () => {
    const switches = [
      { switchId: "body" as const, status: "stable" as const },
      { switchId: "mind" as const, status: "off" as const },
    ];
    const pending = getPendingSwitchMilestones(switches);
    expect(pending).toHaveLength(1);
    expect(pending[0].switchId).toBe("body");
    expect(pending[0].status).toBe("stable");
    expect(pending[0].milestoneType).toBe("switch-stable");
  });

  it("excludes already-seen milestones", () => {
    markMilestoneSeen("body:stable");
    const switches = [
      { switchId: "body" as const, status: "stable" as const },
      { switchId: "mind" as const, status: "powered" as const },
    ];
    const pending = getPendingSwitchMilestones(switches);
    expect(pending).toHaveLength(1);
    expect(pending[0].switchId).toBe("mind");
  });

  it("returns empty array when all milestones seen", () => {
    markMilestoneSeen("body:stable");
    markMilestoneSeen("mind:powered");
    const switches = [
      { switchId: "body" as const, status: "stable" as const },
      { switchId: "mind" as const, status: "powered" as const },
    ];
    expect(getPendingSwitchMilestones(switches)).toHaveLength(0);
  });

  it("returns empty array when all switches are off", () => {
    const switches = [
      { switchId: "body" as const, status: "off" as const },
      { switchId: "mind" as const, status: "off" as const },
    ];
    expect(getPendingSwitchMilestones(switches)).toHaveLength(0);
  });
});
