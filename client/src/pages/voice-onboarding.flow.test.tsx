// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  Element.prototype.scrollIntoView = vi.fn();
  window.history.replaceState({}, "", "/voice-onboarding");
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
});
