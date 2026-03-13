/**
 * FollowUpCard – unit tests
 *
 * Covers:
 *  - Default / guest state (no AI follow-up): CTA, heading, description
 *  - AI follow-up present (auth user): prompt text, action buttons
 *  - buildFollowUpPrefill logic: each fallback branch
 *  - Navigation: chat and action-center routes
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { HomeSummary } from "../../types";
import { FollowUpCard } from "../FollowUpCard";

// ── wouter mock ───────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock("wouter", () => ({
  useLocation: () => ["/", mockNavigate],
}));

// ── prompt-kit / storage mocks ────────────────────────────────────────────────

const MOCK_CONTEXT_PROMPT_TEXT = "Where are you at right now — honestly?";

vi.mock("@/lib/prompt-kit", () => ({
  getDailyPrompt: vi.fn(() => ({
    text: MOCK_CONTEXT_PROMPT_TEXT,
    intent: "reflection",
  })),
}));

vi.mock("@/lib/switch-storage", () => ({
  getSwitchStatuses: vi.fn(() => ({})),
}));

vi.mock("@/lib/energy-context", () => ({
  getCurrentEnergyContext: vi.fn(() => ({ energy: "medium" })),
}));

// ── helpers ───────────────────────────────────────────────────────────────────

/** Decode a navigate() URL string and return the prefill query param value. */
function getPrefill(url: string): string {
  const qs = url.includes("?") ? url.slice(url.indexOf("?") + 1) : "";
  return new URLSearchParams(qs).get("prefill") ?? "";
}

type CardSummary = Pick<
  HomeSummary,
  "latestInsight" | "activeGoals" | "nextEvent" | "activeFollowUp"
>;

function makeSummary(overrides: Partial<CardSummary> = {}): CardSummary {
  return {
    latestInsight: null,
    activeGoals: [],
    nextEvent: null,
    activeFollowUp: null,
    ...overrides,
  };
}

// ── NO ACTIVE FOLLOW-UP (guest / default state) ───────────────────────────────

describe("FollowUpCard – no active follow-up (guest / default)", () => {
  beforeEach(() => mockNavigate.mockClear());

  it("renders 'DW check-in' heading when no follow-up", () => {
    render(<FollowUpCard summary={makeSummary()} />);
    expect(screen.getByText(/dw check-in/i)).toBeTruthy();
  });

  it("shows context-aware prompt from prompt-kit", () => {
    render(<FollowUpCard summary={makeSummary()} />);
    expect(screen.getByText(MOCK_CONTEXT_PROMPT_TEXT)).toBeTruthy();
  });

  it("renders 'Start a conversation' CTA", () => {
    render(<FollowUpCard summary={makeSummary()} />);
    expect(screen.getByText(/start a conversation/i)).toBeTruthy();
  });

  it("navigates to /talk with context-prompt prefill on CTA click (no summary data)", () => {
    render(<FollowUpCard summary={makeSummary()} />);
    fireEvent.click(screen.getByText(/start a conversation/i));
    expect(mockNavigate).toHaveBeenCalledOnce();
    const url: string = mockNavigate.mock.calls[0][0];
    expect(url).toContain("/talk");
    const prefill = getPrefill(url);
    expect(prefill).toBe(MOCK_CONTEXT_PROMPT_TEXT);
  });

  it("uses insight-based prefill when latestInsight is set", () => {
    render(
      <FollowUpCard
        summary={makeSummary({
          latestInsight: {
            id: "i1",
            title: "Morning routine matters",
            summary: "Start with intention.",
            category: "planning",
          },
        })}
      />,
    );
    fireEvent.click(screen.getByText(/start a conversation/i));
    const prefill = getPrefill(mockNavigate.mock.calls[0][0]);
    expect(prefill).toContain("Morning routine matters");
  });

  it("uses goal-based prefill when only activeGoals set", () => {
    render(
      <FollowUpCard
        summary={makeSummary({
          activeGoals: [{ id: "g1", title: "Run a 5K" }],
        })}
      />,
    );
    fireEvent.click(screen.getByText(/start a conversation/i));
    const prefill = getPrefill(mockNavigate.mock.calls[0][0]);
    expect(prefill).toContain("Run a 5K");
  });

  it("uses event-based prefill when only nextEvent set", () => {
    render(
      <FollowUpCard
        summary={makeSummary({
          nextEvent: {
            id: "ev1",
            title: "Team meeting",
            startTime: new Date(),
            isAllDay: false,
          },
        })}
      />,
    );
    fireEvent.click(screen.getByText(/start a conversation/i));
    const prefill = getPrefill(mockNavigate.mock.calls[0][0]);
    expect(prefill).toContain("Team meeting");
  });

  it("appends src=home_followup_chat to the URL", () => {
    render(<FollowUpCard summary={makeSummary()} />);
    fireEvent.click(screen.getByText(/start a conversation/i));
    const url: string = mockNavigate.mock.calls[0][0];
    expect(url).toContain("src=home_followup_chat");
  });
});

// ── ACTIVE FOLLOW-UP (auth user with AI-generated prompt) ────────────────────

describe("FollowUpCard – active AI follow-up", () => {
  beforeEach(() => mockNavigate.mockClear());

  const followUpPrompt = "How did your sleep experiment go this week?";

  function renderWithFollowUp() {
    return render(
      <FollowUpCard
        summary={makeSummary({
          activeFollowUp: { id: "fu1", prompt: followUpPrompt },
        })}
      />,
    );
  }

  it("renders 'DW Follow-up' heading when follow-up is present", () => {
    renderWithFollowUp();
    expect(screen.getByText(/dw follow-up/i)).toBeTruthy();
  });

  it("displays the AI-generated follow-up prompt text", () => {
    renderWithFollowUp();
    expect(screen.getByText(followUpPrompt)).toBeTruthy();
  });

  it("renders 'Take action' button", () => {
    renderWithFollowUp();
    expect(screen.getByText(/take action/i)).toBeTruthy();
  });

  it("renders 'Chat with DW' button", () => {
    renderWithFollowUp();
    expect(screen.getByText(/chat with dw/i)).toBeTruthy();
  });

  it("navigates to /action-center on 'Take action' click", () => {
    renderWithFollowUp();
    fireEvent.click(screen.getByText(/take action/i));
    expect(mockNavigate).toHaveBeenCalledWith("/action-center");
  });

  it("navigates to /talk with the follow-up prompt as prefill on 'Chat with DW' click", () => {
    renderWithFollowUp();
    fireEvent.click(screen.getByText(/chat with dw/i));
    expect(mockNavigate).toHaveBeenCalledOnce();
    const url: string = mockNavigate.mock.calls[0][0];
    expect(url).toContain("/talk");
    expect(getPrefill(url)).toContain(followUpPrompt);
  });

  it("does NOT render 'Start a conversation' CTA when follow-up present", () => {
    renderWithFollowUp();
    expect(screen.queryByText(/start a conversation/i)).toBeNull();
  });
});

// ── GUEST MODE ────────────────────────────────────────────────────────────────

describe("FollowUpCard – guest mode", () => {
  it("renders without crashing for a guest", () => {
    const { container } = render(<FollowUpCard summary={makeSummary()} />);
    expect(container).toBeTruthy();
  });

  it("shows 'DW check-in' heading for guests", () => {
    render(<FollowUpCard summary={makeSummary()} />);
    expect(screen.getByText(/dw check-in/i)).toBeTruthy();
  });

  it("shows context-aware prompt copy (no-data fallback) for guests", () => {
    render(<FollowUpCard summary={makeSummary()} />);
    expect(screen.getByText(MOCK_CONTEXT_PROMPT_TEXT)).toBeTruthy();
  });
});
