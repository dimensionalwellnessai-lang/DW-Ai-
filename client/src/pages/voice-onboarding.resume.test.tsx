/**
 * Component-level regression test for the Life Check-in "resume" re-entry
 * (/voice-onboarding?resume=1).
 *
 * A user who previously skipped voice onboarding carries the
 * `dw_voice_onboarding_skipped` localStorage flag, which keeps the
 * "Finish setup" nudge visible in the Command Center. When they come back
 * via resume=1 and actually finish the conversation (tap Done →
 * voice-complete succeeds), the page must clear that skip flag and set the
 * completed flag — otherwise the nudge never goes away.
 *
 * Also asserts that resume mode does NOT send mode:"refresh" to
 * /api/onboarding/voice-complete (only refresh=1 triggers the server-side
 * merge-preserving path).
 */
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ─── Mocks ──────────────────────────────────────────────────────────────────

const hoisted = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  setLocation: vi.fn(),
  markOnboardingComplete: vi.fn(),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: hoisted.apiRequest,
  queryClient: { invalidateQueries: vi.fn() },
  getQueryFn: () => async () => null,
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/voice-onboarding", hoisted.setLocation],
}));

vi.mock("@/lib/onboarding", () => ({
  markOnboardingComplete: hoisted.markOnboardingComplete,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/hooks/use-page-meta", () => ({
  usePageMeta: () => undefined,
}));

// framer-motion animations don't play nicely with jsdom timers — replace
// motion.* with plain elements and AnimatePresence with a passthrough.
vi.mock("framer-motion", () => {
  const passthrough =
    (Tag: string) =>
    ({ children, ...rest }: Record<string, unknown> & { children?: React.ReactNode }) => {
      const { initial, animate, exit, transition, whileTap, whileHover, layout, ...dom } =
        rest as Record<string, unknown>;
      const El = Tag as unknown as React.ElementType;
      return <El {...dom}>{children}</El>;
    };
  return {
    motion: new Proxy({}, { get: (_t, tag: string) => passthrough(tag) }),
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  };
});

vi.mock("@/components/onboarding-value-preview", () => ({
  OnboardingValuePreview: () => <div data-testid="value-preview-stub" />,
}));

import VoiceOnboardingPage from "./voice-onboarding";

// ─── Helpers ────────────────────────────────────────────────────────────────

const LS_SKIPPED = "dw_voice_onboarding_skipped";
const LS_COMPLETED = "dw_voice_onboarding_completed";

function jsonResponse(payload: unknown) {
  return { json: async () => payload };
}

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, queryFn: async () => null } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <VoiceOnboardingPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  // jsdom doesn't implement scrollIntoView (the page auto-scrolls the thread).
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  window.history.replaceState({}, "", "/voice-onboarding");
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("voice-onboarding resume=1 completion", () => {
  it("clears dw_voice_onboarding_skipped when a resuming skipper finishes the flow", async () => {
    localStorage.setItem(LS_SKIPPED, "true");
    window.history.replaceState({}, "", "/voice-onboarding?resume=1");

    hoisted.apiRequest.mockImplementation(async (_method: string, url: string) => {
      if (url === "/api/chat/smart") {
        return jsonResponse({ response: "Welcome back! Where did we leave off?" });
      }
      if (url === "/api/onboarding/voice-complete") {
        return jsonResponse({ success: true, suggestions: [] });
      }
      throw new Error(`Unexpected apiRequest: ${url}`);
    });

    renderPage();

    // resume=1 skips the value preview and lands on the intro screen.
    expect(screen.getByTestId("voice-onboarding-intro")).toBeTruthy();
    expect(screen.getByText("Finish your setup")).toBeTruthy();

    // Begin via text input (avoids the SpeechRecognition shims).
    fireEvent.click(screen.getByTestId("button-use-text-instead"));

    // Thread phase — wait for the AI opener so Done is enabled.
    await waitFor(() => expect(screen.getByTestId("voice-onboarding-thread")).toBeTruthy());
    const doneBtn = screen.getByTestId("button-finish-onboarding");
    await waitFor(() => expect((doneBtn as HTMLButtonElement).disabled).toBe(false));

    // Still flagged as a skipper until Done actually succeeds.
    expect(localStorage.getItem(LS_SKIPPED)).toBe("true");

    fireEvent.click(doneBtn);

    await waitFor(() => expect(hoisted.setLocation).toHaveBeenCalledWith("/"));

    // The point of the test: finishing clears the skip flag and sets completed.
    expect(localStorage.getItem(LS_SKIPPED)).toBeNull();
    expect(localStorage.getItem(LS_COMPLETED)).toBe("true");
    expect(hoisted.markOnboardingComplete).toHaveBeenCalled();

    // Resume mode must NOT ask the server for the refresh merge path.
    const completeCall = hoisted.apiRequest.mock.calls.find(
      (c) => c[1] === "/api/onboarding/voice-complete",
    );
    expect(completeCall).toBeTruthy();
    expect((completeCall![2] as Record<string, unknown>).mode).toBeUndefined();
    expect((completeCall![2] as Record<string, unknown>).onboardingVersion).toBe("v1");
  });

  it("refresh=1 sends mode:'refresh' and also clears the skip flag on completion", async () => {
    localStorage.setItem(LS_SKIPPED, "true");
    window.history.replaceState({}, "", "/voice-onboarding?refresh=1");

    hoisted.apiRequest.mockImplementation(async (_method: string, url: string) => {
      if (url === "/api/onboarding/voice-complete") {
        return jsonResponse({ success: true, suggestions: [] });
      }
      throw new Error(`Unexpected apiRequest: ${url}`);
    });

    renderPage();

    expect(screen.getByText("Life refresh")).toBeTruthy();

    // Refresh mode seeds DW's opener locally — no chat call needed to begin.
    fireEvent.click(screen.getByTestId("button-use-text-instead"));
    await waitFor(() => expect(screen.getByTestId("voice-onboarding-thread")).toBeTruthy());

    fireEvent.click(screen.getByTestId("button-finish-onboarding"));
    await waitFor(() => expect(hoisted.setLocation).toHaveBeenCalledWith("/"));

    expect(localStorage.getItem(LS_SKIPPED)).toBeNull();
    expect(localStorage.getItem(LS_COMPLETED)).toBe("true");

    const completeCall = hoisted.apiRequest.mock.calls.find(
      (c) => c[1] === "/api/onboarding/voice-complete",
    );
    expect((completeCall![2] as Record<string, unknown>).mode).toBe("refresh");
    expect((completeCall![2] as Record<string, unknown>).onboardingVersion).toBe("v1");
  });
});
