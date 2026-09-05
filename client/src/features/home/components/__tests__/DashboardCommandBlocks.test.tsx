import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DashboardCommandBlocks } from "../DashboardCommandBlocks";
import type { DashboardAdaptiveState } from "../../dashboard-adaptation";

function makeState(overrides: Partial<DashboardAdaptiveState> = {}): DashboardAdaptiveState {
  return {
    mode: "maintain",
    whereIStand: { title: "Momentum Mode", body: "You have momentum.", pulse: "steady" },
    whatToDoNow: {
      id: "task-triage",
      title: "Triage tasks",
      description: "Keep only what matters.",
      path: "/tasks",
      lane: "plan",
      score: 80,
    },
    whyItMatters: "Aligned with your direction and calendar timing.",
    realign: { quickPath: "/voice-onboarding?review=1", resetPath: "/voice-onboarding?refresh=1" },
    calendar: {
      type: "upcoming_prep",
      title: "Prep for team sync",
      body: "Starts at 10:00 AM.",
      path: "/calendar?view=day",
    },
    lanes: [
      {
        lane: "plan",
        label: "Plan",
        cards: [
          {
            id: "calendar-plan",
            title: "Shape today's calendar",
            description: "Turn priorities into blocks.",
            path: "/calendar?view=day",
            lane: "plan",
            score: 90,
          },
        ],
      },
    ],
    telemetry: { topLane: "plan", cardCount: 1, calendarState: "connected" },
    ...overrides,
  };
}

describe("DashboardCommandBlocks", () => {
  it("renders the core dashboard blocks with user context", () => {
    render(<DashboardCommandBlocks state={makeState()} onNavigate={vi.fn()} onRealign={vi.fn()} />);
    expect(screen.getByTestId("dashboard-block-where-i-stand")).toBeTruthy();
    expect(screen.getByTestId("dashboard-block-what-to-do-now")).toBeTruthy();
    expect(screen.getByTestId("dashboard-block-why-it-matters")).toBeTruthy();
    expect(screen.getByTestId("dashboard-block-realign")).toBeTruthy();
    expect(screen.getByText("Aligned with your direction and calendar timing.")).toBeTruthy();
  });

  it("renders no-calendar fallback copy when calendar context is unavailable", () => {
    render(
      <DashboardCommandBlocks
        state={makeState({
          calendar: {
            type: "no_calendar",
            title: "No calendar context yet",
            body: "Connect or map your day to unlock prep prompts and focus windows.",
            path: "/calendar",
          },
        })}
        onNavigate={vi.fn()}
        onRealign={vi.fn()}
      />,
    );
    expect(screen.getByText("No calendar context yet")).toBeTruthy();
    expect(screen.getByText(/Connect or map your day/i)).toBeTruthy();
  });

  it("fires realign callback with quick-update mode", () => {
    const onRealign = vi.fn();
    render(<DashboardCommandBlocks state={makeState()} onNavigate={vi.fn()} onRealign={onRealign} />);
    fireEvent.click(screen.getByText("Realign now"));
    expect(onRealign).toHaveBeenCalledWith("/voice-onboarding?review=1", "quick_update");
  });

  it("uses accessible realign action labels and touch targets", () => {
    render(<DashboardCommandBlocks state={makeState()} onNavigate={vi.fn()} onRealign={vi.fn()} />);

    const realignButton = screen.getByRole("button", { name: "Realign now" });
    const refreshButton = screen.getByRole("button", { name: /Full refresh/i });

    expect(realignButton.className).toContain("h-11");
    expect(refreshButton.className).toContain("h-11");
    expect(screen.queryByText("Full reset")).toBeNull();
  });
});
