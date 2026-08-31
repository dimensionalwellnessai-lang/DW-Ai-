/**
 * CreatorsCard – "Creators — people you follow" doorway card.
 */

import { Users } from "lucide-react";
import { DWCardContainer } from "./DWCardContainer";
import { isFeatureEnabled } from "@/config/featureFlags";
import { proposeAction, requestConsent, executeAction } from "@/lib/agent-actions";
import { SharedAttentionProvider } from "@/components/shared-attention/shared-attention-context";
import { CoWatchSheet } from "@/components/shared-attention/co-watch-sheet";
import { useSharedAttention } from "@/components/shared-attention/use-shared-attention";

const CREATORS_PROMPTS = [
  "Anyone you've been meaning to catch up with?",
  "The people you follow are making things right now.",
  "Fresh uploads might be waiting.",
  "Who inspires you lately?",
  "Stay in the loop with the creators you care about.",
];

function getDailyPrompt(): string {
  const day = new Date().getDate();
  return CREATORS_PROMPTS[day % CREATORS_PROMPTS.length];
}

function CreatorsCardInner() {
  const { coWatchOpen, startCoWatchDW, closeAll } = useSharedAttention();
  const sharedAttentionEnabled = isFeatureEnabled("sharedAttention");

  async function handleCheckUploads() {
    const action = proposeAction({
      type: "open",
      label: "Check new uploads",
      consentTier: "silent",
      targetUrl: "https://www.youtube.com/feed/subscriptions",
    });
    await executeAction(requestConsent(action));
  }

  async function handleSaveLater() {
    const action = proposeAction({
      type: "schedule",
      label: "Check creator uploads later",
      consentTier: "notify",
      scheduledFor: (() => {
        const t = new Date();
        t.setHours(t.getHours() + 2, 0, 0, 0);
        return t.toISOString();
      })(),
      undoable: true,
    });
    await executeAction(requestConsent(action));
  }

  function handleCoWatch() {
    startCoWatchDW(
      "https://www.youtube.com/watch?v=jfKfPfyJRdk",
      "Watch with DW",
    );
  }

  return (
    <>
      <DWCardContainer chatPrefill="Tell me about the creators I follow">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Creators
            </span>
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground leading-snug">
              People you follow
            </h3>
            <p className="mt-0.5 text-sm text-muted-foreground">{getDailyPrompt()}</p>
          </div>
          <div className="flex flex-col gap-1.5 pt-1">
            <button
              className="w-full text-left text-sm text-primary font-medium py-1.5 px-3 rounded-lg hover:bg-muted/60 transition-colors"
              onClick={handleCheckUploads}
            >
              Check new uploads →
            </button>
            <button
              className="w-full text-left text-sm text-primary font-medium py-1.5 px-3 rounded-lg hover:bg-muted/60 transition-colors"
              onClick={handleSaveLater}
            >
              Save for later →
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

export function CreatorsCard() {
  if (!isFeatureEnabled("creatorsCard")) return null;
  return (
    <SharedAttentionProvider>
      <CreatorsCardInner />
    </SharedAttentionProvider>
  );
}
