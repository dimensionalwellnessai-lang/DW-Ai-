/**
 * CompanionshipCard – "Company — you don't have to do this alone" doorway card.
 */

import { Heart } from "lucide-react";
import { DWCardContainer } from "./DWCardContainer";
import { isFeatureEnabled } from "@/config/featureFlags";
import { proposeAction, requestConsent, executeAction } from "@/lib/agent-actions";
import { SharedAttentionProvider } from "@/components/shared-attention/shared-attention-context";
import { CoWatchSheet } from "@/components/shared-attention/co-watch-sheet";
import { useSharedAttention } from "@/components/shared-attention/use-shared-attention";

const GROUNDING_REFLECTION =
  "Take a slow breath in. Notice where you are right now. " +
  "You don't have to figure everything out today. " +
  "One small thing at a time is enough.";

const COMPANIONSHIP_PROMPTS = [
  "You don't have to do this alone.",
  "DW is here — no agenda, no pressure.",
  "Sometimes it helps to just say it out loud.",
  "Company can be quiet. DW is good at quiet.",
  "You can bring whatever's on your mind.",
];

function getDailyPrompt(): string {
  const day = new Date().getDate();
  return COMPANIONSHIP_PROMPTS[day % COMPANIONSHIP_PROMPTS.length];
}

function CompanionshipCardInner() {
  const { coWatchOpen, startCoWatchUser, closeAll } = useSharedAttention();
  const sharedAttentionEnabled = isFeatureEnabled("sharedAttention");

  async function handleTalkItOut() {
    const action = proposeAction({
      type: "open",
      label: "Talk it out with DW",
      consentTier: "silent",
      targetUrl: "/talk?src=companionship_card",
    });
    await executeAction(requestConsent(action));
  }

  function handleWatchTogether() {
    startCoWatchUser(undefined, "Watch together");
  }

  async function handleSitWithMe() {
    const action = proposeAction({
      type: "read",
      label: "A grounding reflection",
      consentTier: "silent",
      readText: GROUNDING_REFLECTION,
      undoable: false,
    });
    await executeAction(requestConsent(action));
  }

  return (
    <>
      <DWCardContainer chatPrefill="I need some company right now">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-primary" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Company
            </span>
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground leading-snug">
              You don't have to do this alone
            </h3>
            <p className="mt-0.5 text-sm text-muted-foreground">{getDailyPrompt()}</p>
          </div>
          <div className="flex flex-col gap-1.5 pt-1">
            <button
              className="w-full text-left text-sm text-primary font-medium py-1.5 px-3 rounded-lg hover:bg-muted/60 transition-colors"
              onClick={handleTalkItOut}
            >
              Talk it out →
            </button>
            {sharedAttentionEnabled && (
              <button
                className="w-full text-left text-sm text-primary font-medium py-1.5 px-3 rounded-lg hover:bg-muted/60 transition-colors"
                onClick={handleWatchTogether}
              >
                Watch together →
              </button>
            )}
            <button
              className="w-full text-left text-sm text-primary font-medium py-1.5 px-3 rounded-lg hover:bg-muted/60 transition-colors"
              onClick={handleSitWithMe}
            >
              Just sit with me →
            </button>
          </div>
        </div>
      </DWCardContainer>
      {sharedAttentionEnabled && (
        <CoWatchSheet open={coWatchOpen} onOpenChange={(open) => { if (!open) closeAll(); }} />
      )}
    </>
  );
}

export function CompanionshipCard() {
  if (!isFeatureEnabled("companionshipCard")) return null;
  return (
    <SharedAttentionProvider>
      <CompanionshipCardInner />
    </SharedAttentionProvider>
  );
}
