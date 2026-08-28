// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("wouter", () => ({
  useLocation: () => ["/command-center", vi.fn()],
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: [] }),
}));

import { BottomNav } from "./bottom-nav";

describe("BottomNav", () => {
  it("renders the 4-tab navigation with Today and no Calendar tab", () => {
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
