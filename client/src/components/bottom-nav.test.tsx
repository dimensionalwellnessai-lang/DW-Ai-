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
  it("shows a habits attention dot on Zones only when Zones is inactive", () => {
    mockLocation = "/feed";
    mockHabits = [{ id: 1, isActive: true, completedToday: false }];
    mockOnboardingProfile = undefined;

    render(<BottomNav />);

    expect(screen.getByLabelText("Zones, Habits need attention")).toBeTruthy();
  });

  it("shows a setup attention dot on Zones when pending suggestions exist and tab is inactive", () => {
    mockLocation = "/talk";
    mockHabits = [];
    mockOnboardingProfile = {
      profile: {
        suggestedStructure: [{ id: "s1", status: "pending" }],
      },
    };

    render(<BottomNav />);

    expect(screen.getByLabelText("Zones, Setup suggestions are waiting")).toBeTruthy();
  });

  it("does not show the setup attention dot when Zones is active", () => {
    mockLocation = "/zones";
    mockHabits = [];
    mockOnboardingProfile = {
      profile: {
        suggestedStructure: [{ id: "s1", status: "pending" }],
      },
    };

    render(<BottomNav />);

    expect(screen.queryByLabelText("Zones, Setup suggestions are waiting")).toBeNull();
  });

  it("renders the 4-tab navigation with DW, Current, Zones, and Cosmic", () => {
    mockLocation = "/talk";
    mockHabits = [];
    mockOnboardingProfile = undefined;
    render(<BottomNav />);

    expect(screen.getByTestId("nav-bottom")).toBeTruthy();
    expect(screen.getByTestId("nav-talk")).toBeTruthy();
    expect(screen.getByTestId("nav-feed")).toBeTruthy();
    expect(screen.getByTestId("nav-zones")).toBeTruthy();
    expect(screen.getByTestId("nav-cosmic")).toBeTruthy();
    expect(screen.queryByTestId("nav-calendar")).toBeNull();
    expect(screen.getByText("DW")).toBeTruthy();
    expect(screen.getByText("Current")).toBeTruthy();
    expect(screen.getByText("Zones")).toBeTruthy();
    expect(screen.getByText("Cosmic")).toBeTruthy();
  });
});
