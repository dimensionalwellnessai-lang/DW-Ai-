/**
 * QA Smoke Tests – Home Command Center Cards
 *
 * Covers Momentum, Follow-ups, Plan in Motion, and Daily Check-in cards.
 * Each card is tested in both empty/guest state and populated/authed state.
 *
 * Pure helper functions are tested directly; component renders use vi.mock
 * to isolate wouter navigation and data-fetching hooks.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

// ── Pure helper imports ───────────────────────────────────────────────────────

import {
  getMomentumMessage,
} from "../features/home/components/MomentumCard";
import {
  buildFollowUpPrefill,
} from "../features/home/components/FollowUpCard";
import { buildElevationPlanPrefill } from "../features/home/elevationUtils";

// ── Component imports ─────────────────────────────────────────────────────────

import { MomentumCard } from "../features/home/components/MomentumCard";
import { FollowUpCard } from "../features/home/components/FollowUpCard";
import { PlanInMotionCard } from "../features/home/components/PlanInMotionCard";
import { DailyCheckinCard } from "../features/home/components/DailyCheckinCard";

// ── Wouter mock ───────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock("wouter", () => ({
  useLocation: () => ["/", mockNavigate],
}));

// ── Hook mocks ────────────────────────────────────────────────────────────────

vi.mock("@/hooks/use-daily-checkin", () => ({
  useDailyCheckin: vi.fn(),
}));

vi.mock("@/hooks/use-learning-profile", () => ({
  useLearningProfile: vi.fn(),
}));

import { useDailyCheckin } from "@/hooks/use-daily-checkin";
import { useLearningProfile } from "@/hooks/use-learning-profile";

// ── Shared test fixtures ──────────────────────────────────────────────────────

const EMPTY_SUMMARY_MOMENTUM = {
  activeHabits: [],
  activeGoals: [],
  momentumData: null,
};

const POPULATED_SUMMARY_MOMENTUM = {
  activeHabits: [
    { id: "h1", title: "Morning run", streak: 7 },
    { id: "h2", title: "Meditation", streak: 3 },
  ],
  activeGoals: [
    { id: "g1", title: "Exercise 3x/week", progress: 60 },
  ],
  momentumData: null,
};

const ELEVATION_SUMMARY_MOMENTUM = {
  activeHabits: [{ id: "h1", title: "Morning run", streak: 2 }],
  activeGoals: [],
  momentumData: {
    status: "yellow" as const,
    reasons: ["Habit streak slowing", "Goal progress stalled"],
    suggestedFocus: "Focus on one habit today",
    isLoading: false,
    checkNow: vi.fn(),
  },
};

const EMPTY_SUMMARY_FOLLOWUP = {
  latestInsight: null,
  activeGoals: [],
  nextEvent: null,
  activeFollowUp: null,
};

const FOLLOWUP_WITH_AI = {
  latestInsight: null,
  activeGoals: [],
  nextEvent: null,
  activeFollowUp: {
    id: "fu1",
    prompt: "How did your meditation session go yesterday?",
  },
};

const FOLLOWUP_WITH_INSIGHT = {
  latestInsight: { id: "i1", title: "Morning habits", summary: "...", category: "health" },
  activeGoals: [],
  nextEvent: null,
  activeFollowUp: null,
};

const FOLLOWUP_WITH_GOALS = {
  latestInsight: null,
  activeGoals: [{ id: "g1", title: "Run a 5K" }],
  nextEvent: null,
  activeFollowUp: null,
};

const FOLLOWUP_WITH_EVENT = {
  latestInsight: null,
  activeGoals: [],
  nextEvent: { id: "e1", title: "Team standup", startTime: null, isAllDay: false },
  activeFollowUp: null,
};

const EMPTY_SUMMARY_PLAN = {
  activeGoals: [],
  momentumData: null,
};

const POPULATED_SUMMARY_PLAN = {
  activeGoals: [
    { id: "g1", title: "Build a morning routine", progress: 45 },
    { id: "g2", title: "Read 2 books this month", progress: 80 },
  ],
  momentumData: null,
};

beforeEach(() => {
  mockNavigate.mockClear();
  (useDailyCheckin as ReturnType<typeof vi.fn>).mockReturnValue({
    todayCheckin: null,
    isLoading: false,
    submitCheckin: vi.fn(),
    isSubmitting: false,
    today: "2026-03-08",
  });
  (useLearningProfile as ReturnType<typeof vi.fn>).mockReturnValue({
    sendLearningEvent: vi.fn(),
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 1. getMomentumMessage – pure function
// ═══════════════════════════════════════════════════════════════════════════════

describe("getMomentumMessage", () => {
  it("returns an empty-state message when no habits or goals exist", () => {
    const msg = getMomentumMessage(0, 0, 0);
    expect(msg).toContain("one step");
  });

  it("highlights a 7+ day streak", () => {
    const msg = getMomentumMessage(1, 7, 0);
    expect(msg).toContain("7-day streak");
  });

  it("highlights a positive shorter streak", () => {
    const msg = getMomentumMessage(1, 3, 0);
    expect(msg).toContain("3-day streak");
  });

  it("mentions both habits and goals when both are present", () => {
    const msg = getMomentumMessage(2, 0, 2);
    expect(msg).toContain("2 habits");
    expect(msg).toContain("2 goals");
  });

  it("uses singular form for exactly 1 habit and 1 goal", () => {
    const msg = getMomentumMessage(1, 0, 1);
    expect(msg).toContain("1 habit");
    expect(msg).toContain("1 goal");
  });

  it("describes active goals when no habits are present", () => {
    const msg = getMomentumMessage(0, 0, 3);
    expect(msg).toContain("3 active goal");
  });

  it("describes active habits when only habits exist (no streak)", () => {
    const msg = getMomentumMessage(4, 0, 0);
    expect(msg).toContain("4 active habit");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. buildFollowUpPrefill – pure function
// ═══════════════════════════════════════════════════════════════════════════════

describe("buildFollowUpPrefill", () => {
  it("returns the AI follow-up prompt when activeFollowUp is set", () => {
    const result = buildFollowUpPrefill({
      latestInsight: null,
      activeGoals: [],
      nextEvent: null,
      activeFollowUp: { id: "fu1", prompt: "How did yesterday go?" },
    });
    expect(result).toBe("How did yesterday go?");
  });

  it("builds insight-based prefill when insight is available and no follow-up", () => {
    const result = buildFollowUpPrefill({
      latestInsight: { id: "i1", title: "Morning habits", summary: "...", category: "health" },
      activeGoals: [],
      nextEvent: null,
      activeFollowUp: null,
    });
    expect(result).toContain("Morning habits");
    expect(result).toContain("follow up");
  });

  it("builds goal-based prefill when a goal exists and no insight or follow-up", () => {
    const result = buildFollowUpPrefill({
      latestInsight: null,
      activeGoals: [{ id: "g1", title: "Run a 5K" }],
      nextEvent: null,
      activeFollowUp: null,
    });
    expect(result).toContain("Run a 5K");
    expect(result).toContain("check in");
  });

  it("builds event-based prefill when an event exists and no other context", () => {
    const result = buildFollowUpPrefill({
      latestInsight: null,
      activeGoals: [],
      nextEvent: { id: "e1", title: "Doctor appointment", startTime: null, isAllDay: false },
      activeFollowUp: null,
    });
    expect(result).toContain("Doctor appointment");
  });

  it("returns a generic check-in message when no context is available (guest empty state)", () => {
    const result = buildFollowUpPrefill({
      latestInsight: null,
      activeGoals: [],
      nextEvent: null,
      activeFollowUp: null,
    });
    expect(result).toContain("check in");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. buildElevationPlanPrefill – pure function
// ═══════════════════════════════════════════════════════════════════════════════

describe("buildElevationPlanPrefill", () => {
  it("returns a prefill with reasons when reasons are provided", () => {
    const result = buildElevationPlanPrefill(["Habit streak slowing", "Goal progress stalled"]);
    expect(result).toContain("Habit streak slowing");
    expect(result).toContain("Goal progress stalled");
    expect(result).toContain("7-day elevation plan");
  });

  it("returns a generic prefill when no reasons are given", () => {
    const result = buildElevationPlanPrefill([]);
    expect(result).toContain("7-day elevation plan");
    expect(result).not.toContain("I'm noticing");
  });

  it("separates multiple reasons with a semicolon", () => {
    const result = buildElevationPlanPrefill(["A", "B"]);
    expect(result).toContain("A; B");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. MomentumCard – component smoke tests
// ═══════════════════════════════════════════════════════════════════════════════

describe("MomentumCard", () => {
  it("renders without crashing (empty/guest state)", () => {
    render(<MomentumCard summary={EMPTY_SUMMARY_MOMENTUM} />);
    expect(screen.getByText(/Momentum/i)).toBeInTheDocument();
  });

  it("shows an empty-state message when no habits or goals exist", () => {
    render(<MomentumCard summary={EMPTY_SUMMARY_MOMENTUM} />);
    expect(screen.getByText(/one step/i)).toBeInTheDocument();
  });

  it("shows a setup CTA button in empty/guest state", () => {
    render(<MomentumCard summary={EMPTY_SUMMARY_MOMENTUM} />);
    expect(screen.getByText(/Set up your first habit/i)).toBeInTheDocument();
  });

  it("renders without crashing (authed state with habits and goals)", () => {
    render(<MomentumCard summary={POPULATED_SUMMARY_MOMENTUM} />);
    expect(screen.getByText(/Momentum/i)).toBeInTheDocument();
  });

  it("shows a View habits navigation button when habits exist", () => {
    render(<MomentumCard summary={POPULATED_SUMMARY_MOMENTUM} />);
    expect(screen.getByRole("button", { name: /View habits/i })).toBeInTheDocument();
  });

  it("navigates to /habits when the View habits button is clicked", () => {
    render(<MomentumCard summary={POPULATED_SUMMARY_MOMENTUM} />);
    fireEvent.click(screen.getByRole("button", { name: /View habits/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/habits");
  });

  it("renders elevation engine status badge when momentumData is present", () => {
    render(<MomentumCard summary={ELEVATION_SUMMARY_MOMENTUM} />);
    expect(screen.getByText(/Slowing down/i)).toBeInTheDocument();
  });

  it("renders reason bullets from elevation engine", () => {
    render(<MomentumCard summary={ELEVATION_SUMMARY_MOMENTUM} />);
    expect(screen.getByText(/Habit streak slowing/i)).toBeInTheDocument();
  });

  it("shows suggested focus from elevation engine", () => {
    render(<MomentumCard summary={ELEVATION_SUMMARY_MOMENTUM} />);
    expect(screen.getByText(/Focus on one habit today/i)).toBeInTheDocument();
  });

  it("renders Check my momentum recalculate button in elevation mode", () => {
    render(<MomentumCard summary={ELEVATION_SUMMARY_MOMENTUM} />);
    expect(screen.getByRole("button", { name: /Recalculate momentum/i })).toBeInTheDocument();
  });

  it("calls checkNow when the recalculate button is clicked", () => {
    render(<MomentumCard summary={ELEVATION_SUMMARY_MOMENTUM} />);
    fireEvent.click(screen.getByRole("button", { name: /Recalculate momentum/i }));
    expect(ELEVATION_SUMMARY_MOMENTUM.momentumData.checkNow).toHaveBeenCalledOnce();
  });

  it("shows loading state when elevation data is loading", () => {
    const loadingSummary = {
      ...ELEVATION_SUMMARY_MOMENTUM,
      momentumData: {
        ...ELEVATION_SUMMARY_MOMENTUM.momentumData,
        isLoading: true,
        status: null,
      },
    };
    render(<MomentumCard summary={loadingSummary} />);
    expect(screen.getByText(/Checking momentum/i)).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. FollowUpCard – component smoke tests
// ═══════════════════════════════════════════════════════════════════════════════

describe("FollowUpCard", () => {
  it("renders without crashing (empty/guest state)", () => {
    render(<FollowUpCard summary={EMPTY_SUMMARY_FOLLOWUP} />);
    expect(screen.getByText(/DW check-in/i)).toBeInTheDocument();
  });

  it("shows the generic CTA when no follow-up or context is available", () => {
    render(<FollowUpCard summary={EMPTY_SUMMARY_FOLLOWUP} />);
    expect(screen.getByText(/Start a conversation/i)).toBeInTheDocument();
  });

  it("renders 'DW Follow-up' label when activeFollowUp is present (authed state)", () => {
    render(<FollowUpCard summary={FOLLOWUP_WITH_AI} />);
    expect(screen.getByText(/DW Follow-up/i)).toBeInTheDocument();
  });

  it("shows the AI follow-up prompt text when activeFollowUp is set", () => {
    render(<FollowUpCard summary={FOLLOWUP_WITH_AI} />);
    expect(screen.getByText(/How did your meditation session go yesterday/i)).toBeInTheDocument();
  });

  it("shows 'Take action' and 'Chat with DW' buttons when follow-up is present", () => {
    render(<FollowUpCard summary={FOLLOWUP_WITH_AI} />);
    expect(screen.getByRole("button", { name: /Take action/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Chat with DW/i })).toBeInTheDocument();
  });

  it("navigates to /action-center when 'Take action' is clicked", () => {
    render(<FollowUpCard summary={FOLLOWUP_WITH_AI} />);
    fireEvent.click(screen.getByRole("button", { name: /Take action/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/action-center");
  });

  it("navigates to /talk with the follow-up prefill when 'Chat with DW' is clicked", () => {
    render(<FollowUpCard summary={FOLLOWUP_WITH_AI} />);
    fireEvent.click(screen.getByRole("button", { name: /Chat with DW/i }));
    expect(mockNavigate).toHaveBeenCalledOnce();
    const url: string = mockNavigate.mock.calls[0][0] as string;
    const params = new URLSearchParams(url.slice(url.indexOf("?") + 1));
    expect(params.get("prefill")).toBe("How did your meditation session go yesterday?");
    expect(params.get("src")).toBe("home_followup_chat");
  });

  it("navigates to /talk with a generic prefill when guest clicks Start a conversation", () => {
    render(<FollowUpCard summary={EMPTY_SUMMARY_FOLLOWUP} />);
    fireEvent.click(screen.getByText(/Start a conversation/i));
    expect(mockNavigate).toHaveBeenCalledOnce();
    const url: string = mockNavigate.mock.calls[0][0] as string;
    expect(url).toContain("/talk");
    const params = new URLSearchParams(url.slice(url.indexOf("?") + 1));
    expect(params.get("src")).toBe("home_followup_chat");
  });

  it("uses insight-based prefill when insight is available", () => {
    render(<FollowUpCard summary={FOLLOWUP_WITH_INSIGHT} />);
    fireEvent.click(screen.getByText(/Start a conversation/i));
    const url: string = mockNavigate.mock.calls[0][0] as string;
    const params = new URLSearchParams(url.slice(url.indexOf("?") + 1));
    expect(params.get("prefill")).toContain("Morning habits");
  });

  it("uses goal-based prefill when goal exists and no insight", () => {
    render(<FollowUpCard summary={FOLLOWUP_WITH_GOALS} />);
    fireEvent.click(screen.getByText(/Start a conversation/i));
    const url: string = mockNavigate.mock.calls[0][0] as string;
    const params = new URLSearchParams(url.slice(url.indexOf("?") + 1));
    expect(params.get("prefill")).toContain("Run a 5K");
  });

  it("uses event-based prefill when event exists and no other context", () => {
    render(<FollowUpCard summary={FOLLOWUP_WITH_EVENT} />);
    fireEvent.click(screen.getByText(/Start a conversation/i));
    const url: string = mockNavigate.mock.calls[0][0] as string;
    const params = new URLSearchParams(url.slice(url.indexOf("?") + 1));
    expect(params.get("prefill")).toContain("Team standup");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. PlanInMotionCard – component smoke tests
// ═══════════════════════════════════════════════════════════════════════════════

describe("PlanInMotionCard", () => {
  it("renders without crashing (empty/guest state)", () => {
    render(<PlanInMotionCard summary={EMPTY_SUMMARY_PLAN} />);
    expect(screen.getByText(/Goals in motion/i)).toBeInTheDocument();
  });

  it("shows empty-state CTA when no active goals (guest state, no elevation)", () => {
    render(<PlanInMotionCard summary={EMPTY_SUMMARY_PLAN} />);
    expect(screen.getByText(/No active goals/i)).toBeInTheDocument();
  });

  it("shows a View all goals navigation button", () => {
    render(<PlanInMotionCard summary={EMPTY_SUMMARY_PLAN} />);
    expect(screen.getByRole("button", { name: /View all goals/i })).toBeInTheDocument();
  });

  it("navigates to /goals when View all goals is clicked", () => {
    render(<PlanInMotionCard summary={EMPTY_SUMMARY_PLAN} />);
    fireEvent.click(screen.getByRole("button", { name: /View all goals/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/goals");
  });

  it("renders goal titles when active goals are present (authed state)", () => {
    render(<PlanInMotionCard summary={POPULATED_SUMMARY_PLAN} />);
    expect(screen.getByText(/Build a morning routine/i)).toBeInTheDocument();
    expect(screen.getByText(/Read 2 books this month/i)).toBeInTheDocument();
  });

  it("renders progress percentages for goals with progress", () => {
    render(<PlanInMotionCard summary={POPULATED_SUMMARY_PLAN} />);
    expect(screen.getByText("45%")).toBeInTheDocument();
    expect(screen.getByText("80%")).toBeInTheDocument();
  });

  it("navigates to /goals when a goal row is clicked", () => {
    render(<PlanInMotionCard summary={POPULATED_SUMMARY_PLAN} />);
    fireEvent.click(screen.getByText(/Build a morning routine/i));
    expect(mockNavigate).toHaveBeenCalledWith("/goals");
  });

  it("shows overflow indicator when more than 3 goals exist", () => {
    const manyGoalsSummary = {
      activeGoals: [
        { id: "g1", title: "Goal One", progress: 10 },
        { id: "g2", title: "Goal Two", progress: 20 },
        { id: "g3", title: "Goal Three", progress: 30 },
        { id: "g4", title: "Goal Four", progress: 40 },
      ],
      momentumData: null,
    };
    render(<PlanInMotionCard summary={manyGoalsSummary} />);
    expect(screen.getByText(/\+1 more goal/i)).toBeInTheDocument();
  });

  it("shows the 7-day elevation plan CTA when momentum is yellow/red and no goals", () => {
    const elevationSummary = {
      activeGoals: [],
      momentumData: {
        status: "red" as const,
        reasons: ["Stalled on habits"],
        suggestedFocus: null,
        isLoading: false,
        checkNow: vi.fn(),
      },
    };
    render(<PlanInMotionCard summary={elevationSummary} />);
    expect(screen.getByText(/Want a 7-day elevation plan/i)).toBeInTheDocument();
  });

  it("navigates to /talk with elevation prefill when 7-day plan CTA is clicked", () => {
    const elevationSummary = {
      activeGoals: [],
      momentumData: {
        status: "yellow" as const,
        reasons: ["Habit streak slowing"],
        suggestedFocus: null,
        isLoading: false,
        checkNow: vi.fn(),
      },
    };
    render(<PlanInMotionCard summary={elevationSummary} />);
    fireEvent.click(screen.getByText(/Want a 7-day elevation plan/i));
    expect(mockNavigate).toHaveBeenCalledOnce();
    const url: string = mockNavigate.mock.calls[0][0] as string;
    const params = new URLSearchParams(url.slice(url.indexOf("?") + 1));
    expect(params.get("prefill")).toContain("Habit streak slowing");
    expect(params.get("src")).toBe("elevation_prompt");
  });

  it("does NOT show elevation CTA when goals exist even with yellow status", () => {
    const summaryWithGoals = {
      activeGoals: [{ id: "g1", title: "Run 5K", progress: 30 }],
      momentumData: {
        status: "yellow" as const,
        reasons: [],
        suggestedFocus: null,
        isLoading: false,
        checkNow: vi.fn(),
      },
    };
    render(<PlanInMotionCard summary={summaryWithGoals} />);
    expect(screen.queryByText(/7-day elevation plan/i)).not.toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. DailyCheckinCard – component smoke tests
// ═══════════════════════════════════════════════════════════════════════════════

describe("DailyCheckinCard", () => {
  it("renders without crashing when loading", () => {
    (useDailyCheckin as ReturnType<typeof vi.fn>).mockReturnValue({
      todayCheckin: null,
      isLoading: true,
      submitCheckin: vi.fn(),
      isSubmitting: false,
      today: "2026-03-08",
    });
    const { container } = render(<DailyCheckinCard />);
    // Returns null while loading — container should be empty
    expect(container.firstChild).toBeNull();
  });

  it("renders the check-in form (guest/unanswered state)", () => {
    render(<DailyCheckinCard />);
    expect(screen.getByText(/Daily Check-in/i)).toBeInTheDocument();
    expect(screen.getByText(/How's your energy today/i)).toBeInTheDocument();
  });

  it("shows mood score buttons 1–5 on the form", () => {
    render(<DailyCheckinCard />);
    [1, 2, 3, 4, 5].forEach((score) => {
      // Buttons display the score as text; aria-label includes the description
      expect(screen.getByText(String(score))).toBeInTheDocument();
    });
  });

  it("advances to step 2 (constraint selection) after selecting a mood score", () => {
    render(<DailyCheckinCard />);
    fireEvent.click(screen.getByText("3"));
    expect(screen.getByText(/Biggest constraint today/i)).toBeInTheDocument();
    expect(screen.getByText(/Energy:/i)).toBeInTheDocument();
  });

  it("allows going back to step 1 via the 'change' link", () => {
    render(<DailyCheckinCard />);
    fireEvent.click(screen.getByText("4"));
    fireEvent.click(screen.getByRole("button", { name: /change/i }));
    expect(screen.getByText(/How's your energy today/i)).toBeInTheDocument();
  });

  it("renders completed state with correct summary text when check-in exists (authed state)", () => {
    (useDailyCheckin as ReturnType<typeof vi.fn>).mockReturnValue({
      todayCheckin: {
        id: "ci1",
        date: "2026-03-08",
        moodScore: 4,
        constraintType: "Focus",
        constraintNote: null,
        createdAt: Date.now(),
      },
      isLoading: false,
      submitCheckin: vi.fn(),
      isSubmitting: false,
      today: "2026-03-08",
    });
    render(<DailyCheckinCard />);
    expect(screen.getByText(/4\/5/i)).toBeInTheDocument();
    expect(screen.getByText(/Focus/i)).toBeInTheDocument();
  });

  it("shows an Edit button when check-in exists", () => {
    (useDailyCheckin as ReturnType<typeof vi.fn>).mockReturnValue({
      todayCheckin: {
        id: "ci1",
        date: "2026-03-08",
        moodScore: 3,
        constraintType: "Stress",
        constraintNote: null,
        createdAt: Date.now(),
      },
      isLoading: false,
      submitCheckin: vi.fn(),
      isSubmitting: false,
      today: "2026-03-08",
    });
    render(<DailyCheckinCard />);
    expect(screen.getByRole("button", { name: /Edit today's check-in/i })).toBeInTheDocument();
  });

  it("shows the form again when Edit is clicked (edit mode)", () => {
    (useDailyCheckin as ReturnType<typeof vi.fn>).mockReturnValue({
      todayCheckin: {
        id: "ci1",
        date: "2026-03-08",
        moodScore: 2,
        constraintType: "Energy",
        constraintNote: null,
        createdAt: Date.now(),
      },
      isLoading: false,
      submitCheckin: vi.fn(),
      isSubmitting: false,
      today: "2026-03-08",
    });
    render(<DailyCheckinCard />);
    fireEvent.click(screen.getByRole("button", { name: /Edit today's check-in/i }));
    expect(screen.getByText(/How's your energy today/i)).toBeInTheDocument();
  });

  it("shows a constraint note in the summary when constraintNote is set", () => {
    (useDailyCheckin as ReturnType<typeof vi.fn>).mockReturnValue({
      todayCheckin: {
        id: "ci1",
        date: "2026-03-08",
        moodScore: 5,
        constraintType: "Other",
        constraintNote: "Busy with family",
        createdAt: Date.now(),
      },
      isLoading: false,
      submitCheckin: vi.fn(),
      isSubmitting: false,
      today: "2026-03-08",
    });
    render(<DailyCheckinCard />);
    expect(screen.getByText(/Busy with family/i)).toBeInTheDocument();
  });

  it("disables the Save button when no constraint is selected", () => {
    render(<DailyCheckinCard />);
    // Advance to step 2
    fireEvent.click(screen.getByText("3"));
    const saveBtn = screen.getByRole("button", { name: /Save check-in/i });
    expect(saveBtn).toBeDisabled();
  });
});
