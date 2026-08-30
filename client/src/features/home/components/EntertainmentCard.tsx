/**
 * EntertainmentCard – "Entertainment — unwind & enjoy" doorway card.
 */

import { Tv2 } from "lucide-react";
import { DWCardContainer } from "./DWCardContainer";
import { isFeatureEnabled } from "@/config/featureFlags";
import { proposeAction, requestConsent, executeAction } from "@/lib/agent-actions";
import { SharedAttentionProvider } from "@/components/shared-attention/shared-attention-context";
import { CoWatchSheet } from "@/components/shared-attention/co-watch-sheet";
import { useSharedAttention } from "@/components/shared-attention/use-shared-attention";

const ENTERTAINMENT_PROMPTS = [
  "You've earned a moment to unwind.",
  "Something enjoyable is a valid plan.",
  "Rest is productive. Really.",
  "What sounds good right now?",
  "A little escape can restore a lot.",
];

function getDailyPrompt(): string {
  const day = new Date().getDate();
  return ENTERTAINMENT_PROMPTS[day % ENTERTAINMENT_PROMPTS.length];
}

function EntertainmentCardInner() {
  const { coWatchOpen, startCoWatchDW, closeAll } = useSharedAttention();
  const sharedAttentionEnabled = isFeatureEnabled("sharedAttention");

  async function handleWatch() {
    const action = proposeAction({
      type: "open",
      label: "Find something to watch",
      consentTier: "silent",
      targetUrl: "https://www.youtube.com/results?search_query=relaxing+videos",
    });
    await executeAction(requestConsent(action));
  }

  async function handleListen() {
    const action = proposeAction({
      type: "open",
      label: "Find something to listen to",
      consentTier: "silent",
      targetUrl: "/spiritual",
    });
    await executeAction(requestConsent(action));
  }

  function handleCoWatch() {
    startCoWatchDW(
      "https://www.youtube-nocookie.com/results?search_query=relaxing+ambient+music",
      "Unwind with DW",
    );
  }

  return (
    <>
      <DWCardContainer chatPrefill="I want to unwind and enjoy something">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Tv2 className="h-4 w-4 text-primary" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Entertainment
            </span>
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground leading-snug">
              Unwind &amp; enjoy
            </h3>
            <p className="mt-0.5 text-sm text-muted-foreground">{getDailyPrompt()}</p>
          </div>
          <div className="flex flex-col gap-1.5 pt-1">
            <button
              className="w-full text-left text-sm text-primary font-medium py-1.5 px-3 rounded-lg hover:bg-muted/60 transition-colors"
              onClick={handleWatch}
            >
              Something to watch →
            </button>
            <button
              className="w-full text-left text-sm text-primary font-medium py-1.5 px-3 rounded-lg hover:bg-muted/60 transition-colors"
              onClick={handleListen}
            >
              Something to listen to →
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

export function EntertainmentCard() {
  if (!isFeatureEnabled("entertainmentCard")) return null;
  return (
    <SharedAttentionProvider>
      <EntertainmentCardInner />
    </SharedAttentionProvider>
  );
}
