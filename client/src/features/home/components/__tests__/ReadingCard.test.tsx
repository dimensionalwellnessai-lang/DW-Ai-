/**
 * ReadingCard – unit tests
 *
 * Covers:
 *  - Empty state (data === null): message + "Start a conversation" CTA
 *  - Data state: headline, summary, category badge
 *  - Bullets (full mode only)
 *  - Tags / momentum opportunities (full mode only)
 *  - Recommended actions from switchTag (full mode only)
 *  - Compact mode hides extended sections
 *  - "View all insights" nav button
 *  - "Continue with DW" CTA routing (insightId + prefill)
 *  - Embedded variant renders without Card shell
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReadingCard, type ReadingCardData } from "../ReadingCard";

// ── wouter mock ───────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock("wouter", () => ({
  useLocation: () => ["/", mockNavigate],
}));

// ── DWOrb mock ────────────────────────────────────────────────────────────────
// Renders a simple button so we can test onTap without the actual orb animation.
vi.mock("@/components/dw-orb", () => ({
  DWOrb: ({ onTap, label }: { onTap?: () => void; label?: string }) =>
    onTap ? (
      <button type="button" onClick={onTap} aria-label={label ?? "DW Orb"}>
        orb
      </button>
    ) : (
      <div aria-hidden>orb</div>
    ),
}));

// ── helpers ───────────────────────────────────────────────────────────────────

function makeData(overrides: Partial<ReadingCardData> = {}): ReadingCardData {
  return {
    id: "ins-1",
    headline: "You avoid difficult conversations until they explode",
    summary: "A recurring pattern noticed across three sessions.",
    ...overrides,
  };
}

// ── EMPTY STATE ───────────────────────────────────────────────────────────────

describe("ReadingCard – empty state (data === null)", () => {
  beforeEach(() => mockNavigate.mockClear());

  it("renders empty-state test id", () => {
    render(<ReadingCard data={null} />);
    expect(document.querySelector("[data-testid='reading-card-empty']")).toBeTruthy();
  });

  it("shows 'DW Reading' label", () => {
    render(<ReadingCard data={null} />);
    expect(screen.getByText(/dw reading/i)).toBeTruthy();
  });

  it("shows 'No reading yet' message", () => {
    render(<ReadingCard data={null} />);
    expect(screen.getByText(/no reading yet/i)).toBeTruthy();
  });

  it("shows 'Start a conversation' CTA", () => {
    render(<ReadingCard data={null} />);
    expect(screen.getByRole("button", { name: /start a conversation/i })).toBeTruthy();
  });

  it("navigates to /talk when empty-state CTA is clicked", () => {
    render(<ReadingCard data={null} />);
    fireEvent.click(screen.getByRole("button", { name: /start a conversation/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/talk");
  });

  it("renders embedded empty state without Card shell", () => {
    const { container } = render(<ReadingCard data={null} variant="embedded" />);
    // Should NOT have a <section> or card wrapper – just a plain div
    const root = container.firstChild as HTMLElement;
    expect(root.tagName).toBe("DIV");
  });
});

// ── DATA STATE – full mode (compact=false) ────────────────────────────────────

describe("ReadingCard – data state, full mode", () => {
  beforeEach(() => mockNavigate.mockClear());

  it("renders data test id", () => {
    render(<ReadingCard data={makeData()} />);
    expect(document.querySelector("[data-testid='reading-card']")).toBeTruthy();
  });

  it("shows the headline", () => {
    render(<ReadingCard data={makeData()} />);
    expect(screen.getByTestId("reading-card-headline").textContent).toContain(
      "You avoid difficult conversations"
    );
  });

  it("shows the summary", () => {
    render(<ReadingCard data={makeData()} />);
    expect(screen.getByTestId("reading-card-summary").textContent).toContain(
      "A recurring pattern"
    );
  });

  it("shows category badge when category is provided", () => {
    render(<ReadingCard data={makeData({ category: "Relationships" })} />);
    expect(screen.getByText("Relationships")).toBeTruthy();
  });

  it("does not show category badge when category is omitted", () => {
    render(<ReadingCard data={makeData({ category: undefined })} />);
    expect(screen.queryByText("Relationships")).toBeNull();
  });

  it("renders 'Continue with DW' CTA", () => {
    render(<ReadingCard data={makeData()} />);
    expect(screen.getByTestId("reading-card-cta")).toBeTruthy();
  });

  it("navigates to /talk with insightId on CTA click", () => {
    render(<ReadingCard data={makeData()} />);
    fireEvent.click(screen.getByTestId("reading-card-cta"));
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringContaining("/talk?")
    );
    const call = mockNavigate.mock.calls[0][0] as string;
    expect(call).toContain("insightId=ins-1");
  });

  it("navigates to /insights on the chevron button", () => {
    render(<ReadingCard data={makeData()} />);
    fireEvent.click(screen.getByLabelText("View all insights"));
    expect(mockNavigate).toHaveBeenCalledWith("/insights");
  });

  it("shows insight bullets when bullets are provided", () => {
    render(
      <ReadingCard
        data={makeData({ bullets: ["First quote", "Second quote"] })}
      />
    );
    expect(screen.getByTestId("reading-card-bullets")).toBeTruthy();
    expect(screen.getByText(/"First quote"/)).toBeTruthy();
    expect(screen.getByText(/"Second quote"/)).toBeTruthy();
  });

  it("caps bullets at 3 even when more are supplied", () => {
    render(
      <ReadingCard
        data={makeData({
          bullets: ["A", "B", "C", "D", "E"],
        })}
      />
    );
    const bullets = screen
      .getByTestId("reading-card-bullets")
      .querySelectorAll("p.italic");
    expect(bullets.length).toBe(3);
  });

  it("shows momentum tags section when tags are provided", () => {
    render(
      <ReadingCard data={makeData({ tags: ["energy", "clarity"] })} />
    );
    expect(screen.getByTestId("reading-card-tags")).toBeTruthy();
    expect(screen.getByText(/momentum opportunities/i)).toBeTruthy();
    expect(screen.getByText("energy")).toBeTruthy();
  });

  it("shows recommended actions for a known switchTag", () => {
    render(<ReadingCard data={makeData({ switchTag: "body" })} />);
    expect(screen.getByTestId("reading-card-actions")).toBeTruthy();
    expect(screen.getByText(/recommended actions/i)).toBeTruthy();
    expect(screen.getByText("Track your energy today")).toBeTruthy();
  });

  it("does not show actions section for unknown switchTag", () => {
    render(<ReadingCard data={makeData({ switchTag: "unknownDimension" })} />);
    expect(screen.queryByTestId("reading-card-actions")).toBeNull();
  });

  it("does not show bullets section when no bullets", () => {
    render(<ReadingCard data={makeData({ bullets: [] })} />);
    expect(screen.queryByTestId("reading-card-bullets")).toBeNull();
  });
});

// ── COMPACT MODE ──────────────────────────────────────────────────────────────

describe("ReadingCard – compact mode", () => {
  it("does not show bullets in compact mode", () => {
    render(
      <ReadingCard
        data={makeData({ bullets: ["Some quote"] })}
        compact
      />
    );
    expect(screen.queryByTestId("reading-card-bullets")).toBeNull();
  });

  it("does not show tags in compact mode", () => {
    render(
      <ReadingCard data={makeData({ tags: ["focus"] })} compact />
    );
    expect(screen.queryByTestId("reading-card-tags")).toBeNull();
  });

  it("does not show recommended actions in compact mode", () => {
    render(<ReadingCard data={makeData({ switchTag: "mind" })} compact />);
    expect(screen.queryByTestId("reading-card-actions")).toBeNull();
  });

  it("still shows headline and summary in compact mode", () => {
    render(<ReadingCard data={makeData()} compact />);
    expect(screen.getByTestId("reading-card-headline")).toBeTruthy();
    expect(screen.getByTestId("reading-card-summary")).toBeTruthy();
  });

  it("still shows the CTA in compact mode", () => {
    render(<ReadingCard data={makeData()} compact />);
    expect(screen.getByTestId("reading-card-cta")).toBeTruthy();
  });
});

// ── EMBEDDED VARIANT ──────────────────────────────────────────────────────────

describe("ReadingCard – embedded variant", () => {
  it("renders with data-testid reading-card", () => {
    render(<ReadingCard data={makeData()} variant="embedded" />);
    expect(document.querySelector("[data-testid='reading-card']")).toBeTruthy();
  });

  it("renders headline in embedded mode", () => {
    render(<ReadingCard data={makeData()} variant="embedded" />);
    expect(screen.getByTestId("reading-card-headline")).toBeTruthy();
  });
});

// ── ACCESSIBILITY ─────────────────────────────────────────────────────────────

describe("ReadingCard – accessibility", () => {
  it("has aria-label on the view-all button", () => {
    render(<ReadingCard data={makeData()} />);
    expect(screen.getByLabelText("View all insights")).toBeTruthy();
  });

  it("DW Orb tap navigates to /talk", () => {
    render(<ReadingCard data={makeData({ id: "abc-123" })} />);
    // The mocked DWOrb renders as a <button aria-label="Talk to DW">
    fireEvent.click(screen.getByLabelText("Talk to DW"));
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringContaining("insightId=abc-123")
    );
  });
});
