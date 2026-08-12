/**
 * PlanInMotionCard – unit tests
 *
 * Covers:
 *  - Empty state (no goals, no elevationData): dashed "no goals" prompt
 *  - Goals present: up to 3 displayed, progress bar, "+N more" overflow
 *  - Elevation Engine CTA (yellow/red status + no goals)
 *  - CTA navigates to /talk with elevation prefill
 *  - "View all goals" button always present
 *  - Guest mode (empty summary)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { HomeSummary, MomentumStatus } from "../../types";
import { PlanInMotionCard } from "../PlanInMotionCard";

// ── wouter mock ───────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock("wouter", () => ({
  useLocation: () => ["/", mockNavigate],
}));

// ── helpers ───────────────────────────────────────────────────────────────────

/** Decode a navigate() URL and return the value of a query param. */
function getParam(url: string, key: string): string {
  const qs = url.includes("?") ? url.slice(url.indexOf("?") + 1) : "";
  return new URLSearchParams(qs).get(key) ?? "";
}

type CardSummary = Pick<HomeSummary, "activeGoals" | "momentumData">;

function makeGoal(id: string, title: string, progress?: number) {
  return { id, title, progress };
}

function makeMomentumData(
  status: MomentumStatus | null,
  reasons: string[] = [],
): NonNullable<HomeSummary["momentumData"]> {
  return {
    status,
    reasons,
    suggestedFocus: null,
    isLoading: false,
    checkNow: vi.fn(),
  };
}

function makeSummary(overrides: Partial<CardSummary> = {}): CardSummary {
  return {
    activeGoals: [],
    momentumData: null,
    ...overrides,
  };
}

// ── EMPTY STATE ───────────────────────────────────────────────────────────────

describe("PlanInMotionCard – empty state", () => {
  beforeEach(() => mockNavigate.mockClear());

  it("renders 'Goals in motion' heading", () => {
    render(<PlanInMotionCard summary={makeSummary()} />);
    expect(screen.getByText(/goals in motion/i)).toBeTruthy();
  });

  it("shows 'no active goals' prompt when goals array is empty", () => {
    render(<PlanInMotionCard summary={makeSummary()} />);
    expect(screen.getByText(/no active goals/i)).toBeTruthy();
  });

  it("navigates to /goals when empty-state prompt is clicked", () => {
    render(<PlanInMotionCard summary={makeSummary()} />);
    fireEvent.click(screen.getByText(/no active goals/i));
    expect(mockNavigate).toHaveBeenCalledWith("/goals");
  });

  it("renders 'View all goals' button", () => {
    render(<PlanInMotionCard summary={makeSummary()} />);
    expect(screen.getByLabelText(/view all goals/i)).toBeTruthy();
  });

  it("navigates to /goals from 'View all goals' button", () => {
    render(<PlanInMotionCard summary={makeSummary()} />);
    fireEvent.click(screen.getByLabelText(/view all goals/i));
    expect(mockNavigate).toHaveBeenCalledWith("/goals");
  });

  it("renders 'Talk to DW about this' footer link", () => {
    render(<PlanInMotionCard summary={makeSummary()} />);
    expect(screen.getByText(/talk to dw about this/i)).toBeTruthy();
  });
});

// ── GOALS PRESENT ─────────────────────────────────────────────────────────────

describe("PlanInMotionCard – goals present", () => {
  beforeEach(() => mockNavigate.mockClear());

  it("renders goal title", () => {
    render(
      <PlanInMotionCard
        summary={makeSummary({
          activeGoals: [makeGoal("g1", "Run a 5K")],
        })}
      />,
    );
    expect(screen.getByText("Run a 5K")).toBeTruthy();
  });

  it("renders progress percentage when available", () => {
    render(
      <PlanInMotionCard
        summary={makeSummary({
          activeGoals: [makeGoal("g1", "Run a 5K", 40)],
        })}
      />,
    );
    expect(screen.getByText("40%")).toBeTruthy();
  });

  it("does not render percentage when progress is undefined", () => {
    render(
      <PlanInMotionCard
        summary={makeSummary({
          activeGoals: [makeGoal("g1", "Sleep better")],
        })}
      />,
    );
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it("renders up to 3 goals", () => {
    render(
      <PlanInMotionCard
        summary={makeSummary({
          activeGoals: [
            makeGoal("g1", "Goal One"),
            makeGoal("g2", "Goal Two"),
            makeGoal("g3", "Goal Three"),
            makeGoal("g4", "Goal Four"),
          ],
        })}
      />,
    );
    expect(screen.getByText("Goal One")).toBeTruthy();
    expect(screen.getByText("Goal Two")).toBeTruthy();
    expect(screen.getByText("Goal Three")).toBeTruthy();
    // 4th goal should not be shown inline
    expect(screen.queryByText("Goal Four")).toBeNull();
  });

  it("shows '+N more goals' when more than 3", () => {
    render(
      <PlanInMotionCard
        summary={makeSummary({
          activeGoals: [
            makeGoal("g1", "G1"),
            makeGoal("g2", "G2"),
            makeGoal("g3", "G3"),
            makeGoal("g4", "G4"),
            makeGoal("g5", "G5"),
          ],
        })}
      />,
    );
    expect(screen.getByText(/\+2 more goals/i)).toBeTruthy();
  });

  it("navigates to /goals when a goal row is clicked", () => {
    render(
      <PlanInMotionCard
        summary={makeSummary({
          activeGoals: [makeGoal("g1", "Run a 5K")],
        })}
      />,
    );
    fireEvent.click(screen.getByText("Run a 5K"));
    expect(mockNavigate).toHaveBeenCalledWith("/goals");
  });
});

// ── ELEVATION ENGINE CTA ──────────────────────────────────────────────────────

describe("PlanInMotionCard – Elevation Engine CTA", () => {
  beforeEach(() => mockNavigate.mockClear());

  it("shows '7-day elevation plan' CTA when yellow status + no goals", () => {
    render(
      <PlanInMotionCard
        summary={makeSummary({
          activeGoals: [],
          momentumData: makeMomentumData("yellow", ["Low habit completion"]),
        })}
      />,
    );
    expect(screen.getByText(/7-day elevation plan/i)).toBeTruthy();
  });

  it("shows '7-day elevation plan' CTA when red status + no goals", () => {
    render(
      <PlanInMotionCard
        summary={makeSummary({
          activeGoals: [],
          momentumData: makeMomentumData("red"),
        })}
      />,
    );
    expect(screen.getByText(/7-day elevation plan/i)).toBeTruthy();
  });

  it("does NOT show elevation CTA for green status", () => {
    render(
      <PlanInMotionCard
        summary={makeSummary({
          activeGoals: [],
          momentumData: makeMomentumData("green"),
        })}
      />,
    );
    expect(screen.queryByText(/7-day elevation plan/i)).toBeNull();
  });

  it("does NOT show elevation CTA when goals are present (even if yellow)", () => {
    render(
      <PlanInMotionCard
        summary={makeSummary({
          activeGoals: [makeGoal("g1", "Run a 5K")],
          momentumData: makeMomentumData("yellow"),
        })}
      />,
    );
    expect(screen.queryByText(/7-day elevation plan/i)).toBeNull();
  });

  it("navigates to /talk with elevation prefill on CTA click", () => {
    render(
      <PlanInMotionCard
        summary={makeSummary({
          activeGoals: [],
          momentumData: makeMomentumData("yellow", ["Not enough sleep"]),
        })}
      />,
    );
    fireEvent.click(screen.getByText(/7-day elevation plan/i));
    expect(mockNavigate).toHaveBeenCalledOnce();
    const url: string = mockNavigate.mock.calls[0][0];
    expect(url).toContain("/talk");
    expect(getParam(url, "src")).toBe("elevation_prompt");
    expect(getParam(url, "prefill")).toContain("Not enough sleep");
  });
});

// ── GUEST MODE ────────────────────────────────────────────────────────────────

describe("PlanInMotionCard – guest mode", () => {
  it("renders without crashing for a guest", () => {
    const { container } = render(<PlanInMotionCard summary={makeSummary()} />);
    expect(container).toBeTruthy();
  });

  it("shows 'no active goals' for guests with no data", () => {
    render(<PlanInMotionCard summary={makeSummary()} />);
    expect(screen.getByText(/no active goals/i)).toBeTruthy();
  });
});
