/**
 * dw-noticed.tsx
 *
 * Proactive "DW noticed…" suggestion card (SPEC_14).
 *
 * Rules:
 * - At most one suggestion is visible at a time.
 * - Dismissal is persisted in localStorage for the calendar day.
 * - The same suggestion will not re-appear within 24 h of dismissal.
 * - Impressions, accepts, and dismissals are tracked via analytics.
 * - Renders nothing unless the `dwProactiveNotices` feature flag is on.
 *
 * v1 heuristics (client-side only, no new server work):
 *   1. Long gap since last daily check-in → suggest a quick check-in
 *   2. Free-time window (no reminder in the next 2 h) → suggest Explore
 *   3. Fallback rotation from a static list of gentle, non-pushy prompts
 */

import { useState, useEffect } from "react";
import { X, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { isFeatureEnabled } from "@/config/featureFlags";
import { useDailyCheckin } from "@/hooks/use-daily-checkin";
import { useReminders } from "@/hooks/use-reminders";
import { trackEvent, EVENTS } from "@/lib/analytics";

// ── localStorage helpers ──────────────────────────────────────────────────────

const STORAGE_KEY = "dw-proactive-dismissed";

type DismissalRecord = Record<string, number>; // suggestionKey → dismissedAt (ms)

function readDismissals(): DismissalRecord {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as DismissalRecord;
  } catch {
    return {};
  }
}

function recordDismissal(key: string): void {
  try {
    const record = readDismissals();
    record[key] = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Storage blocked — fail silently
  }
}

function isRecentlyDismissed(key: string): boolean {
  const record = readDismissals();
  const ts = record[key];
  if (!ts) return false;
  // Suppress for 24 h after dismissal
  return Date.now() - ts < 24 * 60 * 60 * 1000;
}

// ── Fallback suggestion rotation ──────────────────────────────────────────────

const FALLBACK_SUGGESTIONS: Array<{ key: string; text: string; cta: string; route: string }> = [
  {
    key: "fallback-breathe",
    text: "Before anything else — one slow breath.",
    cta: "Take a moment",
    route: "/talk",
  },
  {
    key: "fallback-explore",
    text: "Anything you've been curious about lately?",
    cta: "Explore something",
    route: "/feed",
  },
  {
    key: "fallback-library",
    text: "There might be something in your library worth revisiting.",
    cta: "Open library",
    route: "/library",
  },
  {
    key: "fallback-talk",
    text: "DW is here whenever you're ready to talk.",
    cta: "Say hi",
    route: "/talk",
  },
  {
    key: "fallback-plan",
    text: "Want to take a look at what's ahead?",
    cta: "See today's plan",
    route: "/daily-schedule",
  },
];

function getFallbackSuggestion() {
  // Rotate based on the calendar day so it feels fresh but predictable
  const day = new Date().getDate();
  const idx = day % FALLBACK_SUGGESTIONS.length;
  return FALLBACK_SUGGESTIONS[idx];
}

// ── Hook: resolve which suggestion to show ────────────────────────────────────

interface Suggestion {
  key: string;
  heading: string;
  text: string;
  cta: string;
  route: string;
}

function useSuggestion(enabled: boolean): Suggestion | null {
  const { todayCheckin, isLoading: checkinLoading } = useDailyCheckin();
  const { reminders, isLoading: remindersLoading } = useReminders();

  if (!enabled || checkinLoading || remindersLoading) return null;

  // Heuristic 1: no check-in today
  const checkinKey = "heuristic-no-checkin";
  if (!todayCheckin && !isRecentlyDismissed(checkinKey)) {
    return {
      key: checkinKey,
      heading: "DW noticed…",
      text: "Haven't heard from you today — want a quick check-in?",
      cta: "Quick check-in",
      route: "/talk?prefill=Daily+check-in&src=dw_noticed",
    };
  }

  // Heuristic 2: no reminder in the next 2 hours
  const freeTimeKey = "heuristic-free-time";
  if (!isRecentlyDismissed(freeTimeKey)) {
    const now = Date.now();
    const twoHoursLater = now + 2 * 60 * 60 * 1000;
    const hasUpcoming = reminders.some((r) => {
      const t = new Date(r.scheduledAt ?? "").getTime();
      return t >= now && t <= twoHoursLater;
    });
    if (!hasUpcoming) {
      return {
        key: freeTimeKey,
        heading: "DW noticed…",
        text: "Looks like you have some open space coming up.",
        cta: "Explore something",
        route: "/feed",
      };
    }
  }

  // Fallback rotation
  const fallback = getFallbackSuggestion();
  if (!isRecentlyDismissed(fallback.key)) {
    return {
      key: fallback.key,
      heading: "DW says",
      text: fallback.text,
      cta: fallback.cta,
      route: fallback.route,
    };
  }

  return null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DwNoticed() {
  const [, navigate] = useLocation();
  const proactiveNoticesEnabled = isFeatureEnabled("dwProactiveNotices");
  const [dismissed, setDismissed] = useState(false);
  const suggestion = useSuggestion(proactiveNoticesEnabled);

  useEffect(() => {
    if (proactiveNoticesEnabled && suggestion && !dismissed) {
      trackEvent(EVENTS.PROACTIVE_NOTICE_SHOWN, { suggestionKey: suggestion.key });
    }
  }, [proactiveNoticesEnabled, suggestion?.key, dismissed]);

  if (!proactiveNoticesEnabled) return null;
  if (dismissed || !suggestion) return null;

  function handleAccept() {
    if (!suggestion) return;
    trackEvent(EVENTS.PROACTIVE_NOTICE_ACCEPTED, { suggestionKey: suggestion.key });
    navigate(suggestion.route);
  }

  function handleDismiss() {
    if (!suggestion) return;
    recordDismissal(suggestion.key);
    trackEvent(EVENTS.PROACTIVE_NOTICE_DISMISSED, { suggestionKey: suggestion.key });
    setDismissed(true);
  }

  return (
    <Card className="border-border/60 bg-muted/30">
      <CardContent className="px-4 py-3">
        <div className="flex items-start gap-3">
          <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground mb-0.5">{suggestion.heading}</p>
            <p className="text-sm text-foreground leading-relaxed">{suggestion.text}</p>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 mt-1.5 text-primary text-sm font-medium"
              onClick={handleAccept}
            >
              {suggestion.cta}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-7 w-7 -mt-1 -mr-1"
            onClick={handleDismiss}
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
