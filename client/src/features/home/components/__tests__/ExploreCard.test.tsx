/**
 * ExploreCard.test.tsx
 *
 * Unit tests for the ExploreCard doorway card (SPEC_14).
 *
 * Covers:
 *  - Returns null when exploreCard flag is off (default)
 *  - Renders title and subtitle when flag is on
 *  - "Watch with DW" button is hidden when sharedAttention flag is off
 *  - "Watch with DW" button appears when sharedAttention flag is on
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ── Feature flags mock ────────────────────────────────────────────────────────

const flagState: Record<string, boolean> = {
  exploreCard: false,
  sharedAttention: false,
  actionEngine: false,
};

vi.mock("@/config/featureFlags", () => ({
  isFeatureEnabled: (flag: string) => flagState[flag] ?? false,
  FEATURE_FLAGS: flagState,
}));

// ── Navigation mock ───────────────────────────────────────────────────────────

vi.mock("wouter", () => ({
  useLocation: () => ["/", vi.fn()],
}));

// ── Action engine mock ────────────────────────────────────────────────────────

vi.mock("@/lib/agent-actions", () => ({
  proposeAction: vi.fn((a: unknown) => ({ ...a, id: "test-id", status: "proposed", createdAt: new Date().toISOString() })),
  requestConsent: vi.fn((a: unknown) => ({ ...a, status: "executing" })),
  executeAction: vi.fn().mockResolvedValue({ status: "done" }),
}));

// ── SharedAttention mocks ─────────────────────────────────────────────────────

vi.mock("@/components/shared-attention/shared-attention-context", () => ({
  SharedAttentionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSharedAttentionContext: () => ({
    session: null,
    startSession: vi.fn(),
    endSession: vi.fn(),
    updateRecordingConsent: vi.fn(),
  }),
}));

vi.mock("@/components/shared-attention/co-watch-sheet", () => ({
  CoWatchSheet: () => null,
}));

vi.mock("@/components/shared-attention/use-shared-attention", () => ({
  useSharedAttention: () => ({
    coWatchOpen: false,
    dwBroadcastOpen: false,
    userBroadcastOpen: false,
    startCoWatchDW: vi.fn(),
    startCoWatchUser: vi.fn(),
    openDwBroadcast: vi.fn(),
    openUserBroadcast: vi.fn(),
    closeAll: vi.fn(),
  }),
}));

// ── Under test ────────────────────────────────────────────────────────────────

import { ExploreCard } from "../ExploreCard";

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ExploreCard", () => {
  beforeEach(() => {
    flagState.exploreCard = false;
    flagState.sharedAttention = false;
  });

  it("renders nothing when exploreCard flag is off", () => {
    flagState.exploreCard = false;
    const { container } = render(<ExploreCard />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the card title when exploreCard flag is on", () => {
    flagState.exploreCard = true;
    render(<ExploreCard />);
    expect(screen.getByText("Hobbies & curiosities")).toBeDefined();
  });

  it("renders Explore CTAs when flag is on", () => {
    flagState.exploreCard = true;
    render(<ExploreCard />);
    expect(screen.getByText(/Explore a hobby/)).toBeDefined();
    expect(screen.getByText(/Find something new/)).toBeDefined();
  });

  it("does NOT show 'Watch with DW' when sharedAttention is off", () => {
    flagState.exploreCard = true;
    flagState.sharedAttention = false;
    render(<ExploreCard />);
    expect(screen.queryByText(/Watch with DW/)).toBeNull();
  });

  it("shows 'Watch with DW' when both exploreCard and sharedAttention flags are on", () => {
    flagState.exploreCard = true;
    flagState.sharedAttention = true;
    render(<ExploreCard />);
    expect(screen.getByText(/Watch with DW/)).toBeDefined();
  });
});
