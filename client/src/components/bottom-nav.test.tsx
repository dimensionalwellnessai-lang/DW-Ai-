// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

let mockLocation = "/command-center";
let mockHabits: any[] = [];
let mockOnboardingProfile: { profile?: { suggestedStructure?: Array<{ id?: string; status?: string }> } | null } | undefined;

vi.mock("wouter", () => ({
  useLocation: () => [mockLocation, vi.fn()],
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey }: { queryKey: unknown[] }) => ({
    data: queryKey[0] === "/api/onboarding/profile" ? mockOnboardingProfile : mockHabits,
  }),
}));

import { BottomNav } from "./bottom-nav";

describe("BottomNav", () => {
  it("shows a habits attention dot on Shortcuts only when tab is inactive", () => {
    mockLocation = "/feed";
    mockHabits = [{ id: 1, isActive: true, completedToday: false }];
    mockOnboardingProfile = undefined;

    render(<BottomNav />);

    expect(screen.getByLabelText("Shortcuts, Habits need attention")).toBeTruthy();
  });

  it("shows a setup attention dot on Shortcuts when pending suggestions exist and tab is inactive", () => {
    mockLocation = "/talk";
    mockHabits = [];
    mockOnboardingProfile = {
      profile: {
        suggestedStructure: [{ id: "s1", status: "pending" }],
      },
    };

    render(<BottomNav />);

    expect(screen.getByLabelText("Shortcuts, Setup suggestions are waiting")).toBeTruthy();
  });

  it("does not show the setup attention dot when Shortcuts is active", () => {
    mockLocation = "/zones";
    mockHabits = [];
    mockOnboardingProfile = {
      profile: {
        suggestedStructure: [{ id: "s1", status: "pending" }],
      },
    };

    render(<BottomNav />);

    expect(screen.queryByLabelText("Shortcuts, Setup suggestions are waiting")).toBeNull();
  });

  it("renders the 5-tab navigation with Dashboard, Talk to DW, Explore, Calendar, and Shortcuts", () => {
    mockLocation = "/talk";
    mockHabits = [];
    mockOnboardingProfile = undefined;
    render(<BottomNav />);

    expect(screen.getByTestId("nav-bottom")).toBeTruthy();
    expect(screen.getByTestId("nav-dashboard")).toBeTruthy();
    expect(screen.getByTestId("nav-talk")).toBeTruthy();
    expect(screen.getByTestId("nav-explore")).toBeTruthy();
    expect(screen.getByTestId("nav-calendar")).toBeTruthy();
    expect(screen.getByTestId("nav-shortcuts")).toBeTruthy();
    expect(screen.getByText("Dashboard")).toBeTruthy();
    expect(screen.getByText("Talk to DW")).toBeTruthy();
    expect(screen.getByText("Explore")).toBeTruthy();
    expect(screen.getByText("Calendar")).toBeTruthy();
    expect(screen.getByText("Shortcuts")).toBeTruthy();
  });
});
