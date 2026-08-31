// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

let mockLocation = "/command-center";
let mockHabits: any[] = [];
let mockOnboardingProfile: { profile?: { suggestedStructure?: Array<{ status?: string }> } | null } | undefined;

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
  it("shows a habits attention dot on Today only when Today is inactive", () => {
    mockLocation = "/my-life";
    mockHabits = [{ id: 1, isActive: true, completedToday: false }];
    mockOnboardingProfile = undefined;

    render(<BottomNav />);

    expect(screen.getByLabelText("Today, Habits need attention")).toBeTruthy();
  });

  it("shows a setup attention dot on My Life when pending suggestions exist and tab is inactive", () => {
    mockLocation = "/command-center";
    mockHabits = [];
    mockOnboardingProfile = {
      profile: {
        suggestedStructure: [{ id: "s1", status: "pending" }],
      },
    };

    render(<BottomNav />);

    expect(screen.getByLabelText("My Life, Setup suggestions are waiting")).toBeTruthy();
  });

  it("does not show the setup attention dot when My Life is active", () => {
    mockLocation = "/my-life";
    mockHabits = [];
    mockOnboardingProfile = {
      profile: {
        suggestedStructure: [{ id: "s1", status: "pending" }],
      },
    };

    render(<BottomNav />);

    expect(screen.queryByLabelText("My Life, Setup suggestions are waiting")).toBeNull();
  });

  it("renders the 4-tab navigation with Today and no Calendar tab", () => {
    mockLocation = "/command-center";
    mockHabits = [];
    mockOnboardingProfile = undefined;
    render(<BottomNav />);

    expect(screen.getByTestId("nav-bottom")).toBeTruthy();
    expect(screen.getByTestId("nav-command-center")).toBeTruthy();
    expect(screen.getByTestId("nav-my-life")).toBeTruthy();
    expect(screen.getByTestId("nav-talk")).toBeTruthy();
    expect(screen.getByTestId("nav-profile")).toBeTruthy();
    expect(screen.queryByTestId("nav-calendar")).toBeNull();
    expect(screen.getByText("Today")).toBeTruthy();
  });
});
