/**
 * MomentumCard – unit tests
 *
 * Covers:
 *  - Legacy mode (ELEVATION_ENGINE off): empty state, habit streak, mixed data
 *  - Elevation Engine mode (momentumData present): green / yellow / red status,
 *    loading state, checkNow button, suggestions
 *  - Guest mode (no habits / goals)
 *  - "View habits" navigation button
 *  - "Talk to DW about this" prefill routing
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { HomeSummary, MomentumStatus } from "../../types";
import { MomentumCard } from "../MomentumCard";

// ── wouter mock ───────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock("wouter", () => ({
  useLocation: () => ["/", mockNavigate],
}));

// ── helpers ───────────────────────────────────────────────────────────────────

type CardSummary = Pick<HomeSummary, "activeHabits" | "activeGoals" | "momentumData">;

function makeSummary(overrides: Partial<CardSummary> = {}): CardSummary {
  return {
    activeHabits: [],
    activeGoals: [],
    momentumData: null,
    ...overrides,
  };
}

function makeMomentumData(
  status: MomentumStatus | null = "green",
  reasons: string[] = [],
  extra: Partial<HomeSummary["momentumData"]> = {},
): NonNullable<HomeSummary["momentumData"]> {
  return {
    status,
    reasons,
    suggestedFocus: null,
    isLoading: false,
    checkNow: vi.fn(),
    ...extra,
  };
}

// ── LEGACY MODE (momentumData === null) ───────────────────────────────────────

describe("MomentumCard – legacy mode (no Elevation Engine)", () => {
  beforeEach(() => mockNavigate.mockClear());

  it("renders 'Momentum' heading", () => {
    render(<MomentumCard summary={makeSummary()} />);
    expect(screen.getByText(/momentum/i)).toBeTruthy();
  });

  it("shows empty-state prompt when no habits or goals", () => {
    render(<MomentumCard summary={makeSummary()} />);
    expect(screen.getByText(/every journey starts with one step/i)).toBeTruthy();
  });

  it("shows 'Set up your first habit' CTA in empty state", () => {
    render(<MomentumCard summary={makeSummary()} />);
    expect(screen.getByText(/set up your first habit/i)).toBeTruthy();
  });

  it("navigates to /habits when 'Set up your first habit' is clicked", () => {
    render(<MomentumCard summary={makeSummary()} />);
    fireEvent.click(screen.getByText(/set up your first habit/i));
    expect(mockNavigate).toHaveBeenCalledWith("/habits");
  });

  it("shows streak message for 7+ day streak", () => {
    render(
      <MomentumCard
        summary={makeSummary({
          activeHabits: [{ id: "h1", title: "Meditate", streak: 7 }],
        })}
      />,
    );
    expect(screen.getByText(/7-day streak/i)).toBeTruthy();
    expect(screen.getByText(/consistency is your superpower/i)).toBeTruthy();
  });

  it("shows partial streak message for 1–6 day streak", () => {
    render(
      <MomentumCard
        summary={makeSummary({
          activeHabits: [{ id: "h1", title: "Walk", streak: 3 }],
        })}
      />,
    );
    expect(screen.getByText(/3-day streak/i)).toBeTruthy();
  });

  it("shows habits+goals message when both present but no streak", () => {
    render(
      <MomentumCard
        summary={makeSummary({
          activeHabits: [{ id: "h1", title: "Walk", streak: 0 }],
          activeGoals: [{ id: "g1", title: "Lose weight" }],
        })}
      />,
    );
    expect(screen.getByText(/1 habit.*1 goal/i)).toBeTruthy();
  });

  it("shows goals-only message when no habits", () => {
    render(
      <MomentumCard
        summary={makeSummary({
          activeGoals: [
            { id: "g1", title: "Lose weight" },
            { id: "g2", title: "Sleep better" },
          ],
        })}
      />,
    );
    expect(screen.getByText(/2 active goals/i)).toBeTruthy();
  });

  it("shows 'View habits' button when data is present", () => {
    render(
      <MomentumCard
        summary={makeSummary({
          activeHabits: [{ id: "h1", title: "Run", streak: 2 }],
        })}
      />,
    );
    expect(screen.getByLabelText(/view habits/i)).toBeTruthy();
  });

  it("navigates to /habits when 'View habits' is clicked", () => {
    render(
      <MomentumCard
        summary={makeSummary({
          activeHabits: [{ id: "h1", title: "Run", streak: 2 }],
        })}
      />,
    );
    fireEvent.click(screen.getByLabelText(/view habits/i));
    expect(mockNavigate).toHaveBeenCalledWith("/habits");
  });

  it("does NOT show 'View habits' button in empty state", () => {
    render(<MomentumCard summary={makeSummary()} />);
    expect(screen.queryByLabelText(/view habits/i)).toBeNull();
  });

  it("renders 'Talk to DW about this' button (chatPrefill provided)", () => {
    render(<MomentumCard summary={makeSummary()} />);
    expect(screen.getByText(/talk to dw about this/i)).toBeTruthy();
  });
});

// ── ELEVATION ENGINE MODE (momentumData present) ──────────────────────────────

describe("MomentumCard – Elevation Engine mode", () => {
  beforeEach(() => mockNavigate.mockClear());

  it("shows 'On track' label for green status", () => {
    render(
      <MomentumCard
        summary={makeSummary({ momentumData: makeMomentumData("green") })}
      />,
    );
    expect(screen.getByText(/on track/i)).toBeTruthy();
  });

  it("shows 'Slowing down' label for yellow status", () => {
    render(
      <MomentumCard
        summary={makeSummary({ momentumData: makeMomentumData("yellow") })}
      />,
    );
    expect(screen.getByText(/slowing down/i)).toBeTruthy();
  });

  it("shows 'Stalled' label for red status", () => {
    render(
      <MomentumCard
        summary={makeSummary({ momentumData: makeMomentumData("red") })}
      />,
    );
    expect(screen.getByText(/stalled/i)).toBeTruthy();
  });

  it("renders reason bullets when reasons are provided", () => {
    render(
      <MomentumCard
        summary={makeSummary({
          momentumData: makeMomentumData("yellow", [
            "Habit completion dropped",
            "No goals set",
          ]),
        })}
      />,
    );
    expect(screen.getByText(/habit completion dropped/i)).toBeTruthy();
    expect(screen.getByText(/no goals set/i)).toBeTruthy();
  });

  it("shows suggested focus when present", () => {
    render(
      <MomentumCard
        summary={makeSummary({
          momentumData: makeMomentumData("green", [], {
            suggestedFocus: "Focus on sleep first",
          }),
        })}
      />,
    );
    expect(screen.getByText(/focus on sleep first/i)).toBeTruthy();
  });

  it("shows loading state while checking momentum", () => {
    render(
      <MomentumCard
        summary={makeSummary({
          momentumData: makeMomentumData(null, [], { isLoading: true }),
        })}
      />,
    );
    expect(screen.getByText(/checking momentum/i)).toBeTruthy();
  });

  it("renders 'Check my momentum' button", () => {
    render(
      <MomentumCard
        summary={makeSummary({ momentumData: makeMomentumData("green") })}
      />,
    );
    expect(screen.getByLabelText(/recalculate momentum/i)).toBeTruthy();
  });

  it("calls checkNow when 'Check my momentum' is clicked", () => {
    const checkNow = vi.fn();
    render(
      <MomentumCard
        summary={makeSummary({
          momentumData: makeMomentumData("green", [], { checkNow }),
        })}
      />,
    );
    fireEvent.click(screen.getByLabelText(/recalculate momentum/i));
    expect(checkNow).toHaveBeenCalledOnce();
  });

  it("disables the checkNow button while loading", () => {
    render(
      <MomentumCard
        summary={makeSummary({
          momentumData: makeMomentumData(null, [], { isLoading: true }),
        })}
      />,
    );
    const btn = screen.getByLabelText(/recalculate momentum/i);
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("falls back to legacy message when status is null (no data yet)", () => {
    render(
      <MomentumCard
        summary={makeSummary({
          momentumData: makeMomentumData(null),
          activeHabits: [{ id: "h1", title: "Meditate", streak: 5 }],
        })}
      />,
    );
    // Status is null → shows legacy fallback text
    expect(screen.getByText(/5-day streak/i)).toBeTruthy();
  });
});

// ── GUEST MODE ────────────────────────────────────────────────────────────────

describe("MomentumCard – guest mode", () => {
  it("renders without crashing for a guest (no habits/goals/momentumData)", () => {
    const { container } = render(<MomentumCard summary={makeSummary()} />);
    expect(container).toBeTruthy();
  });

  it("shows empty-state prompt for guests with no data", () => {
    render(<MomentumCard summary={makeSummary()} />);
    expect(screen.getByText(/every journey starts with one step/i)).toBeTruthy();
  });

  it("shows 'Set up your first habit' CTA for guests", () => {
    render(<MomentumCard summary={makeSummary()} />);
    expect(screen.getByText(/set up your first habit/i)).toBeTruthy();
  });
});
