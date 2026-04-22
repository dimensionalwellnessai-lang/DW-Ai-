/**
 * Component tests for the guided-meditation audio player inside
 * `SessionTimerDialog`. JSDOM doesn't actually decode audio, so we stub
 * `HTMLMediaElement.prototype.play` / `pause` and use `fireEvent` to
 * simulate the corresponding DOM events the component listens for. That
 * gives us an end-to-end check of:
 *   - The <audio> element renders with the library item's audioUrl as src.
 *   - The toggle button calls play() / pause() and the button label
 *     reflects the resulting `audioPlaying` state.
 *   - "End early" pauses audio and advances the dialog to the log phase.
 */
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ─── Stubs for things SessionTimerDialog touches but don't matter here ──────
vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(async () => ({ json: async () => ({}) })),
  queryClient: { invalidateQueries: vi.fn() },
}));

vi.mock("@/lib/tts-service", () => ({
  ttsService: { stop: vi.fn(), speak: vi.fn(async () => {}) },
}));

// Voice guidance OFF so the autoplay effect doesn't fire — the toggle is
// driven explicitly in the tests below.
vi.mock("@/lib/meditation-voice-pref", () => ({
  useMeditationVoicePref: () => [false, vi.fn()],
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// ─── HTMLMediaElement shims ─────────────────────────────────────────────────
// JSDOM's HTMLMediaElement is a stub: `play`/`pause` aren't implemented and
// `paused` always returns `true`. We swap them for versions that flip an
// internal flag so the component's `el.paused` check in `toggleAudio`
// behaves correctly.
let mediaPlayCalls = 0;
let mediaPauseCalls = 0;
let internalPaused = true;

beforeEach(() => {
  mediaPlayCalls = 0;
  mediaPauseCalls = 0;
  internalPaused = true;

  Object.defineProperty(HTMLMediaElement.prototype, "paused", {
    configurable: true,
    get() {
      return internalPaused;
    },
  });

  HTMLMediaElement.prototype.play = function play() {
    mediaPlayCalls += 1;
    internalPaused = false;
    return Promise.resolve();
  };

  HTMLMediaElement.prototype.pause = function pause() {
    mediaPauseCalls += 1;
    internalPaused = true;
  };
});

// Import AFTER the mocks so the page module picks them up.
import { SessionTimerDialog } from "./spiritual";

const ITEM = {
  id: "med-1",
  slug: "calm-breath",
  title: "Calm Breath",
  theme: "calm",
  durationMinutes: 5,
  scriptText: "Breathe in slowly.",
  audioUrl: "/api/meditations/audio/calm-breath",
};

function renderDialog() {
  const onClose = vi.fn();
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const utils = render(
    <QueryClientProvider client={qc}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <SessionTimerDialog item={ITEM as any} onClose={onClose} />
    </QueryClientProvider>,
  );
  return { ...utils, onClose };
}

describe("SessionTimerDialog – guided audio player", () => {
  it("renders the audio element with the library item's audioUrl as src", async () => {
    renderDialog();
    const audio = await screen.findByTestId("audio-meditation");
    expect(audio).toBeInTheDocument();
    expect(audio.tagName).toBe("AUDIO");
    expect(audio.getAttribute("src")).toBe(ITEM.audioUrl);
  });

  it("toggle button drives play and pause and reflects the playing state", async () => {
    const user = userEvent.setup();
    renderDialog();

    const audio = await screen.findByTestId("audio-meditation");
    const toggle = screen.getByTestId("button-audio-toggle");

    // Starts paused (label says "Play …").
    expect(toggle.getAttribute("aria-label")).toBe("Play guided audio");

    // Click play. The component calls el.play(); we then dispatch the
    // matching `play` DOM event so the React handler updates state.
    await user.click(toggle);
    expect(mediaPlayCalls).toBe(1);
    fireEvent.play(audio);
    expect(toggle.getAttribute("aria-label")).toBe("Pause guided audio");

    // Click pause.
    await user.click(toggle);
    expect(mediaPauseCalls).toBe(1);
    fireEvent.pause(audio);
    expect(toggle.getAttribute("aria-label")).toBe("Play guided audio");
  });

  it("End early pauses audio and switches the dialog into the log phase", async () => {
    const user = userEvent.setup();
    renderDialog();

    expect(screen.getByTestId("text-timer-remaining")).toBeInTheDocument();
    const audio = await screen.findByTestId("audio-meditation");

    // Get audio playing first so End early actually has something to pause.
    await user.click(screen.getByTestId("button-audio-toggle"));
    fireEvent.play(audio);
    const pausesBefore = mediaPauseCalls;

    await user.click(screen.getByTestId("button-end-early"));

    expect(mediaPauseCalls).toBeGreaterThan(pausesBefore);
    // Log phase replaces the audio player and the timer countdown.
    expect(screen.queryByTestId("audio-meditation")).toBeNull();
    expect(screen.queryByTestId("text-timer-remaining")).toBeNull();
  });
});
