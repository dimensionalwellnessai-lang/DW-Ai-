/**
 * HomeModuleDock – unit tests
 *
 * Covers:
 *  - Renders all 5 module icons
 *  - Calls onSelect with correct module id when tapped
 *  - Shows/hides badge text
 *  - Highlights the active module via aria-pressed
 *  - Truncates badge to 4 chars
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HomeModuleDock, MODULES, type ModuleId } from "../HomeModuleDock";

const mockOnSelect = vi.fn();

function renderDock(props: Partial<React.ComponentProps<typeof HomeModuleDock>> = {}) {
  return render(
    <HomeModuleDock
      onSelect={mockOnSelect}
      {...props}
    />
  );
}

beforeEach(() => {
  mockOnSelect.mockClear();
});

describe("HomeModuleDock – rendering", () => {
  it("renders all 5 module buttons", () => {
    renderDock();
    for (const mod of MODULES) {
      expect(screen.getByRole("button", { name: new RegExp(mod.label, "i") })).toBeTruthy();
    }
  });

  it("renders the toolbar container with accessible label", () => {
    renderDock();
    expect(screen.getByRole("toolbar", { name: /module shortcuts/i })).toBeTruthy();
  });

  it("renders badge text in aria-label when badge provided", () => {
    renderDock({ badges: { insight: "Rel" } });
    expect(screen.getByRole("button", { name: /open insight.*rel/i })).toBeTruthy();
  });

  it("does not include badge in aria-label when no badge provided", () => {
    renderDock({ badges: {} });
    const insightBtn = screen.getByRole("button", { name: /open insight$/i });
    expect(insightBtn).toBeTruthy();
  });

  it("truncates badge to 4 chars", () => {
    renderDock({ badges: { plan: "12345" } });
    const btn = screen.getByRole("button", { name: /open plan/i });
    expect(btn).toBeTruthy();
    // The visual badge text rendered inside aria-hidden span is "1234"
    expect(btn.textContent).toContain("1234");
  });
});

describe("HomeModuleDock – interaction", () => {
  it("calls onSelect with 'insight' when Insight button is tapped", () => {
    renderDock();
    fireEvent.click(screen.getByRole("button", { name: /open insight/i }));
    expect(mockOnSelect).toHaveBeenCalledWith("insight");
  });

  it("calls onSelect with each module id when tapped", () => {
    renderDock();
    const ids: ModuleId[] = ["insight", "plan", "health", "momentum", "followup"];
    for (const id of ids) {
      const btn = screen.getByRole("button", { name: new RegExp(`open ${id === "followup" ? "follow-up" : id}`, "i") });
      fireEvent.click(btn);
      expect(mockOnSelect).toHaveBeenCalledWith(id);
    }
    expect(mockOnSelect).toHaveBeenCalledTimes(ids.length);
  });
});

describe("HomeModuleDock – active state", () => {
  it("sets aria-pressed=true on the active module button", () => {
    renderDock({ activeModule: "plan" });
    const planBtn = screen.getByRole("button", { name: /open plan/i });
    expect(planBtn.getAttribute("aria-pressed")).toBe("true");
  });

  it("sets aria-pressed=false on inactive module buttons", () => {
    renderDock({ activeModule: "plan" });
    const insightBtn = screen.getByRole("button", { name: /open insight/i });
    expect(insightBtn.getAttribute("aria-pressed")).toBe("false");
  });

  it("all buttons aria-pressed=false when no activeModule", () => {
    renderDock({ activeModule: null });
    for (const mod of MODULES) {
      const btn = screen.getByRole("button", { name: new RegExp(`open ${mod.label}`, "i") });
      expect(btn.getAttribute("aria-pressed")).toBe("false");
    }
  });
});
