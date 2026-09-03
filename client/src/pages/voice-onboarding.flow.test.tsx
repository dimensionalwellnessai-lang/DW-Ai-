// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const hoisted = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  setLocation: vi.fn(),
  markOnboardingComplete: vi.fn(),
  enabledFlags: new Set<string>(),
  fetch: vi.fn(),
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

vi.mock("@/config/featureFlags", () => ({
  isFeatureEnabled: (flag: string) => hoisted.enabledFlags.has(flag),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/hooks/use-page-meta", () => ({
  usePageMeta: () => undefined,
}));

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
  OnboardingValuePreview: ({ onBegin }: { onBegin: () => void }) => (
    <button data-testid="value-preview-begin" onClick={onBegin}>
      Begin
    </button>
  ),
}));

import VoiceOnboardingPage from "./voice-onboarding";

function jsonResponse(payload: unknown) {
  return { json: async () => payload };
}

function renderPage(queryFn: (queryKey: readonly unknown[]) => Promise<unknown>) {
  const qc = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        queryFn: async ({ queryKey }) => queryFn(queryKey),
      },
    },
  });

  return render(
    <QueryClientProvider client={qc}>
      <VoiceOnboardingPage />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  hoisted.enabledFlags.clear();
  Element.prototype.scrollIntoView = vi.fn();
  window.history.replaceState({}, "", "/voice-onboarding");
  vi.stubGlobal("fetch", hoisted.fetch);
});

afterEach(() => {
  window.history.replaceState({}, "", "/voice-onboarding");
});

describe("voice onboarding flow updates", () => {
  it("shows the reduced 3-phase progress label during the thread", async () => {
    hoisted.apiRequest.mockImplementation(async (_method: string, url: string) => {
      if (url === "/api/chat/smart") {
        return jsonResponse({ response: "What feels most important right now?" });
      }
      throw new Error(`Unexpected apiRequest: ${url}`);
    });

    renderPage(async () => null);

    fireEvent.click(screen.getByTestId("button-use-text-instead"));

    await waitFor(() => expect(screen.getByTestId("voice-onboarding-thread")).toBeTruthy());
    expect(screen.getByText("1 of 3")).toBeTruthy();
    expect(screen.getByText("Getting to know you")).toBeTruthy();
  });

  it("lands on Today when suggestions are accepted", async () => {
    hoisted.apiRequest.mockImplementation(async (_method: string, url: string) => {
      if (url === "/api/profile/lifestyle-preferences") {
        return jsonResponse({ success: true });
      }
      if (url === "/api/onboarding/accept-suggestions") {
        return jsonResponse({ success: true });
      }
      throw new Error(`Unexpected apiRequest: ${url}`);
    });

    renderPage(async (queryKey) => {
      if (queryKey[0] === "/api/onboarding/profile") {
        return {
          profile: {
            generatedSummary: "You want calmer days.",
            generatedDirection: "Toward calmer, steadier days.",
            suggestedStructure: [
              {
                id: "sys-1",
                type: "system",
                title: "Morning reset",
                description: "A short routine to settle into the day.",
                sourceReason: "Suggested because mornings feel scattered.",
                status: "pending",
              },
            ],
          },
        };
      }
      if (queryKey[0] === "/api/profile/lifestyle-preferences") {
        return {};
      }
      return null;
    });

    await waitFor(() => expect(screen.getByTestId("voice-onboarding-summary")).toBeTruthy());
    fireEvent.click(screen.getByTestId("button-accept-suggestions"));

    await waitFor(() => expect(hoisted.setLocation).toHaveBeenCalledWith("/command-center"));
    expect(hoisted.markOnboardingComplete).toHaveBeenCalled();
  });

  it("lands on Today when suggestions are deferred", async () => {
    hoisted.apiRequest.mockImplementation(async (_method: string, url: string) => {
      if (url === "/api/profile/lifestyle-preferences") {
        return jsonResponse({ success: true });
      }
      if (url === "/api/onboarding/accept-suggestions") {
        return jsonResponse({ success: true });
      }
      throw new Error(`Unexpected apiRequest: ${url}`);
    });

    renderPage(async (queryKey) => {
      if (queryKey[0] === "/api/onboarding/profile") {
        return {
          profile: {
            generatedSummary: "You want calmer days.",
            generatedDirection: "Toward calmer, steadier days.",
            suggestedStructure: [
              {
                id: "plan-1",
                type: "plan",
                title: "Weekly planning",
                description: "A simple weekly reset.",
                sourceReason: "Suggested because you want more clarity.",
                status: "pending",
              },
            ],
          },
        };
      }
      if (queryKey[0] === "/api/profile/lifestyle-preferences") {
        return {};
      }
      return null;
    });

    await waitFor(() => expect(screen.getByTestId("voice-onboarding-summary")).toBeTruthy());
    fireEvent.click(screen.getByTestId("button-defer-all"));

    await waitFor(() => expect(hoisted.setLocation).toHaveBeenCalledWith("/command-center"));
    expect(hoisted.markOnboardingComplete).toHaveBeenCalled();
  });

  it("renders recommendation explanations in the v2 prioritization summary", async () => {
    hoisted.enabledFlags.add("onboarding_prioritization_v2");
    window.history.replaceState({}, "", "/voice-onboarding?v=2");
    const now = Date.now();

    renderPage(async (queryKey) => {
      if (queryKey[0] === "/api/onboarding/profile") {
        return {
          profile: {
            generatedSummary: "You need steadier energy and clearer focus.",
            generatedDirection: "Toward a calmer, more protected week.",
            suggestedStructure: [
              {
                id: "sys-1",
                type: "system",
                title: "Morning reset",
                description: "A short routine to settle into the day.",
                sourceReason: "Suggested because mornings feel scattered.",
                status: "pending",
              },
            ],
            profileContext: {
              intents: ["reset"],
              selectedReasons: ["clarify_focus"],
              reasonFreeText: "I need help deciding what to protect.",
              userLanguageInputs: {
                reasonNarrative: "I need help deciding what to protect.",
                lastUpdatedAt: new Date().toISOString(),
              },
            },
            prioritySnapshot: {
              mode: "choose_for_me",
              formula: "score = ...",
              signals: [],
              assignments: [
                {
                  areaId: "physical",
                  bucket: "protect",
                  score: 8.9,
                  why: "Physical health scored 8.90 from importance 10/10 and current state 3/10.",
                  recommended: true,
                },
                {
                  areaId: "mental",
                  bucket: "protect",
                  score: 8.4,
                  why: "Mental & emotional scored 8.40 from importance 9/10 and current state 4/10.",
                  recommended: true,
                },
                {
                  areaId: "rest",
                  bucket: "protect",
                  score: 8.2,
                  why: "Rest & recovery scored 8.20 from importance 9/10 and current state 4/10.",
                  recommended: true,
                },
                {
                  areaId: "financial",
                  bucket: "active_growth",
                  score: 7.6,
                  why: "Money scored 7.60 from importance 8/10 and current state 4/10.",
                  recommended: true,
                },
                {
                  areaId: "relationships",
                  bucket: "active_growth",
                  score: 7.1,
                  why: "Relationships scored 7.10 from importance 8/10 and current state 5/10.",
                  recommended: true,
                },
              ],
              focusWindow: {
                startAt: new Date(now - 9 * 24 * 60 * 60 * 1000).toISOString(),
                endAt: new Date(now + 5 * 24 * 60 * 60 * 1000).toISOString(),
                adjustments: [
                  {
                    weekIndex: 0,
                    count: 1,
                    changedAreaIds: ["physical"],
                    adjustedAt: new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString(),
                  },
                  {
                    weekIndex: 1,
                    count: 1,
                    changedAreaIds: ["mental"],
                    adjustedAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
                  },
                ],
                overrideCount: 0,
                lastAdjustedAt: null,
              },
              recommendedAt: new Date(now - 9 * 24 * 60 * 60 * 1000).toISOString(),
            },
          },
        };
      }
      if (queryKey[0] === "/api/profile/lifestyle-preferences") {
        return {};
      }
      return null;
    });

    await waitFor(() => expect(screen.getByTestId("voice-onboarding-summary")).toBeTruthy());
    expect(screen.getByTestId("recommendation-why-physical").textContent).toContain("scored 8.90");
    expect(screen.getByTestId("focus-window-banner").textContent).toContain(
      "Focus window active until"
    );
    expect(screen.getByTestId("focus-window-banner").textContent).toContain(
      "Weekly micro-adjustments used: 1"
    );
  });

  it("hides expired focus window banners and exposes pressed state for prioritization toggles", async () => {
    hoisted.enabledFlags.add("onboarding_prioritization_v2");
    window.history.replaceState({}, "", "/voice-onboarding?v=2");
    const now = Date.now();

    renderPage(async (queryKey) => {
      if (queryKey[0] === "/api/onboarding/profile") {
        return {
          profile: {
            generatedSummary: "You want calmer days.",
            generatedDirection: "Toward calmer, steadier days.",
            suggestedStructure: [
              {
                id: "sys-1",
                type: "system",
                title: "Morning reset",
                description: "A short routine to settle into the day.",
                sourceReason: "Suggested because mornings feel scattered.",
                status: "pending",
              },
            ],
            profileContext: {
              intents: ["reset"],
              selectedReasons: ["clarify_focus"],
              reasonFreeText: "I need help deciding what to protect.",
              userLanguageInputs: {
                reasonNarrative: "I need help deciding what to protect.",
                lastUpdatedAt: new Date(now).toISOString(),
              },
            },
            prioritySnapshot: {
              mode: "manual",
              formula: "score = ...",
              signals: [],
              assignments: [],
              focusWindow: {
                startAt: new Date(now - 21 * 24 * 60 * 60 * 1000).toISOString(),
                endAt: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
                adjustments: [
                  {
                    weekIndex: 1,
                    count: 1,
                    changedAreaIds: ["physical"],
                    adjustedAt: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(),
                  },
                ],
                overrideCount: 0,
                lastAdjustedAt: null,
              },
              recommendedAt: new Date(now - 21 * 24 * 60 * 60 * 1000).toISOString(),
            },
          },
        };
      }
      if (queryKey[0] === "/api/profile/lifestyle-preferences") {
        return {};
      }
      return null;
    });

    await waitFor(() => expect(screen.getByTestId("voice-onboarding-summary")).toBeTruthy());
    expect(screen.queryByTestId("focus-window-banner")).toBeNull();
    expect(screen.getByTestId("intent-reset").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("intent-maintain").getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByTestId("reason-clarify_focus").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("reason-overwhelmed").getAttribute("aria-pressed")).toBe("false");
  });

  it("shows recovery guidance when prioritization save fails during skip", async () => {
    hoisted.enabledFlags.add("onboarding_prioritization_v2");
    window.history.replaceState({}, "", "/voice-onboarding?v=2");
    hoisted.apiRequest.mockImplementation(async (_method: string, url: string) => {
      if (url === "/api/profile/lifestyle-preferences") {
        return jsonResponse({ success: true });
      }
      throw new Error(`Unexpected apiRequest: ${url}`);
    });
    hoisted.fetch.mockRejectedValue(new Error("network down"));

    renderPage(async (queryKey) => {
      if (queryKey[0] === "/api/onboarding/profile") {
        return {
          profile: {
            generatedSummary: "You want calmer days.",
            generatedDirection: "Toward calmer, steadier days.",
            suggestedStructure: [
              {
                id: "sys-1",
                type: "system",
                title: "Morning reset",
                description: "A short routine to settle into the day.",
                sourceReason: "Suggested because mornings feel scattered.",
                status: "pending",
              },
            ],
            profileContext: {
              intents: ["reset"],
              selectedReasons: ["clarify_focus"],
              reasonFreeText: "I need help deciding what to protect.",
              userLanguageInputs: {
                reasonNarrative: "I need help deciding what to protect.",
                lastUpdatedAt: new Date().toISOString(),
              },
            },
            prioritySnapshot: {
              mode: "manual",
              formula: "score = ...",
              signals: [],
              assignments: [],
              focusWindow: {
                startAt: new Date().toISOString(),
                endAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
                adjustments: [],
                overrideCount: 0,
                lastAdjustedAt: null,
              },
              recommendedAt: new Date().toISOString(),
            },
          },
        };
      }
      if (queryKey[0] === "/api/profile/lifestyle-preferences") {
        return {};
      }
      return null;
    });

    await waitFor(() => expect(screen.getByTestId("voice-onboarding-summary")).toBeTruthy());
    fireEvent.click(screen.getByTestId("button-skip-summary"));

    await waitFor(() =>
      expect(
        screen.getByText(
          "Couldn't save your priority map right now. Check your connection and try again."
        )
      ).toBeTruthy()
    );
    expect(hoisted.setLocation).not.toHaveBeenCalledWith("/command-center");
  });
});
