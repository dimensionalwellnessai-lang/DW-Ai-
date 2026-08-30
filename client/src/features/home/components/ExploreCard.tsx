/**
 * ExploreCard – "Explore — Hobbies & curiosities" doorway card.
 *
 * All CTAs route through the Action Engine.
 * "Watch with DW" is gated by both `exploreCard` and `sharedAttention` flags.
 */

import { useState } from "react";
import { Compass } from "lucide-react";
import { DWCardContainer } from "./DWCardContainer";
import { isFeatureEnabled } from "@/config/featureFlags";
import {
  proposeAction,
  requestConsent,
  executeAction,
} from "@/lib/agent-actions";
import { SharedAttentionProvider } from "@/components/shared-attention/shared-attention-context";
import { CoWatchSheet } from "@/components/shared-attention/co-watch-sheet";
import { useSharedAttention } from "@/components/shared-attention/use-shared-attention";

// ── Rotating prompts ──────────────────────────────────────────────────────────

const EXPLORE_PROMPTS = [
  "What have you always wanted to try?",
  "Any corners of the world you haven't explored yet?",
  "Curiosity is its own reward.",
  "What would you do if you had a free afternoon?",
  "Something small and new can shift everything.",
];

function getDailyPrompt(): string {
  const day = new Date().getDate();
  return EXPLORE_PROMPTS[day % EXPLORE_PROMPTS.length];
}

// ── Inner component (needs SharedAttentionProvider context) ───────────────────

function ExploreCardInner() {
  const { coWatchOpen, startCoWatchDW, closeAll } = useSharedAttention();
  const sharedAttentionEnabled = isFeatureEnabled("sharedAttention");

  async function handleOpen(route: string) {
    const action = proposeAction({ type: "open", label: "Explore something new", consentTier: "silent", targetUrl: route });
    const consented = requestConsent(action);
    await executeAction(consented);
  }

  function handleCoWatch() {
    startCoWatchDW(
      "https://www.youtube-nocookie.com/results?search_query=learn+something+new",
      "Explore with DW",
    );
  }

  return (
    <>
      <DWCardContainer chatPrefill="I want to explore something new">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-primary" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Explore
            </span>
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground leading-snug">
              Hobbies &amp; curiosities
            </h3>
            <p className="mt-0.5 text-sm text-muted-foreground">{getDailyPrompt()}</p>
          </div>
          <div className="flex flex-col gap-1.5 pt-1">
            <button
              className="w-full text-left text-sm text-primary font-medium py-1.5 px-3 rounded-lg hover:bg-muted/60 transition-colors"
              onClick={() => handleOpen("/feed")}
            >
              Explore a hobby →
            </button>
            <button
              className="w-full text-left text-sm text-primary font-medium py-1.5 px-3 rounded-lg hover:bg-muted/60 transition-colors"
              onClick={() => handleOpen("/library")}
            >
              Find something new →
            </button>
            {sharedAttentionEnabled && (
              <button
                className="w-full text-left text-sm text-primary font-medium py-1.5 px-3 rounded-lg hover:bg-muted/60 transition-colors"
                onClick={handleCoWatch}
              >
                Watch with DW →
              </button>
            )}
          </div>
        </div>
      </DWCardContainer>
      {sharedAttentionEnabled && (
        <CoWatchSheet open={coWatchOpen} onOpenChange={(open) => { if (!open) closeAll(); }} />
      )}
    </>
  );
}

// ── Public export (wraps with provider) ──────────────────────────────────────

export function ExploreCard() {
  if (!isFeatureEnabled("exploreCard")) return null;
  return (
    <SharedAttentionProvider>
      <ExploreCardInner />
    </SharedAttentionProvider>
  );
}
