import { useEffect, useState, useRef } from "react";
import { useSearch } from "wouter";

export type AssistantSource = "siri" | "widget" | "shortcut" | "android_assistant" | "internal" | "url";
export type AssistantAction =
  | "voice"
  | "day_start"
  | "whats_next"
  | "mood_log"
  | "task_add"
  | "workout_start"
  | "meal_log"
  | "open_app"
  | null;

export interface AssistantLaunchContext {
  source: AssistantSource;
  action: AssistantAction;
  parameters: Record<string, string>;
  autoStartVoice: boolean;
  shouldSpeakResponse: boolean;
  timestamp: number;
}

const VOICE_PREFS_KEY = "dw:voice_prefs";

export interface VoicePreferences {
  autoStartOnAssistantLaunch: boolean;
  speakResponsesAloud: boolean;
  defaultEntryAction: "voice" | "day_start";
}

export const DEFAULT_VOICE_PREFS: VoicePreferences = {
  autoStartOnAssistantLaunch: true,
  speakResponsesAloud: true,
  defaultEntryAction: "voice",
};

export function getVoicePreferences(): VoicePreferences {
  try {
    const raw = localStorage.getItem(VOICE_PREFS_KEY);
    if (!raw) return DEFAULT_VOICE_PREFS;
    return { ...DEFAULT_VOICE_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_VOICE_PREFS;
  }
}

export function saveVoicePreferences(prefs: Partial<VoicePreferences>): void {
  const current = getVoicePreferences();
  localStorage.setItem(VOICE_PREFS_KEY, JSON.stringify({ ...current, ...prefs }));
}

const LAUNCH_CONTEXT_KEY = "dw:assistant_launch_context";
const LAUNCH_CONTEXT_TTL_MS = 30_000;

function storeContext(ctx: AssistantLaunchContext) {
  sessionStorage.setItem(LAUNCH_CONTEXT_KEY, JSON.stringify(ctx));
}

function consumeContext(): AssistantLaunchContext | null {
  try {
    const raw = sessionStorage.getItem(LAUNCH_CONTEXT_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(LAUNCH_CONTEXT_KEY);
    const ctx = JSON.parse(raw) as AssistantLaunchContext;
    if (Date.now() - ctx.timestamp > LAUNCH_CONTEXT_TTL_MS) return null;
    return ctx;
  } catch {
    return null;
  }
}

function parseSearchToContext(search: string): AssistantLaunchContext | null {
  if (!search) return null;
  const params = new URLSearchParams(search);
  const action = params.get("action") as AssistantAction;
  const source = (params.get("source") as AssistantSource) ?? "url";
  if (!action) return null;
  const prefs = getVoicePreferences();
  const parameters: Record<string, string> = {};
  params.forEach((v, k) => {
    if (k !== "action" && k !== "source" && k !== "autoVoice") parameters[k] = v;
  });
  return {
    source,
    action,
    parameters,
    autoStartVoice:
      params.get("autoVoice") === "1" ||
      (source !== "url" && prefs.autoStartOnAssistantLaunch),
    shouldSpeakResponse: prefs.speakResponsesAloud,
    timestamp: Date.now(),
  };
}

export function useAssistantLaunch(): AssistantLaunchContext | null {
  const search = useSearch();
  const [context, setContext] = useState<AssistantLaunchContext | null>(null);
  const consumed = useRef(false);

  useEffect(() => {
    if (consumed.current) return;
    consumed.current = true;

    const fromSearch = parseSearchToContext(search);
    if (fromSearch) {
      setContext(fromSearch);
      return;
    }

    const fromSession = consumeContext();
    if (fromSession) {
      setContext(fromSession);
      return;
    }

    if (typeof window !== "undefined" && (window as any).Capacitor) {
      import("@capacitor/app")
        .then(({ App }) => {
          App.getLaunchUrl()
            .then((result: { url?: string }) => {
              if (result?.url) {
                const url = new URL(result.url);
                const params = url.searchParams;
                const action = (params.get("type") || url.hostname || url.pathname.replace(/^\//, "")) as AssistantAction;
                const source = (params.get("source") as AssistantSource) ?? "widget";
                const prefs = getVoicePreferences();
                const parameters: Record<string, string> = {};
                params.forEach((v, k) => {
                  if (k !== "type" && k !== "source") parameters[k] = v;
                });
                setContext({
                  source,
                  action,
                  parameters,
                  autoStartVoice: prefs.autoStartOnAssistantLaunch,
                  shouldSpeakResponse: prefs.speakResponsesAloud,
                  timestamp: Date.now(),
                });
              }
            })
            .catch(() => {});
        })
        .catch(() => {});
    }
  }, [search]);

  return context;
}

export function buildDeepLink(action: AssistantAction, params?: Record<string, string>, source?: AssistantSource): string {
  const url = new URL(`dwai://action`);
  if (action) url.searchParams.set("type", action);
  if (source) url.searchParams.set("source", source);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  return url.toString();
}

export function buildWebUrl(action: AssistantAction, params?: Record<string, string>, source?: AssistantSource): string {
  const routeMap: Record<NonNullable<AssistantAction>, string> = {
    voice: "/voice",
    day_start: "/day/start",
    whats_next: "/talk?topic=whats+next",
    mood_log: "/mood-tracker",
    task_add: "/tasks",
    workout_start: "/workout",
    meal_log: "/meal-prep",
    open_app: "/command-center",
  };
  const base = action ? (routeMap[action] ?? "/voice") : "/voice";
  const sp = new URLSearchParams({ action: action ?? "voice" });
  if (source) sp.set("source", source);
  if (params) Object.entries(params).forEach(([k, v]) => sp.set(k, v));
  return `${base}${base.includes("?") ? "&" : "?"}${sp}`;
}
