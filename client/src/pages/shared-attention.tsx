/**
 * shared-attention.tsx
 *
 * Hub page listing the four Shared Attention modes (SPEC_14).
 * Renders only when the `sharedAttention` feature flag is on.
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Eye, MonitorPlay, Tv2, Clapperboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isFeatureEnabled } from "@/config/featureFlags";
import { SHARED_ATTENTION_MODES } from "@shared/sharedAttention";
import type { SharedAttentionMode } from "@shared/sharedAttention";
import { SharedAttentionProvider } from "@/components/shared-attention/shared-attention-context";
import { CoWatchSheet } from "@/components/shared-attention/co-watch-sheet";
import { DwBroadcastPanel } from "@/components/shared-attention/dw-broadcast-panel";
import { UserBroadcastDialog } from "@/components/shared-attention/user-broadcast-dialog";
import { useSharedAttention } from "@/components/shared-attention/use-shared-attention";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

// ── Mode icon map ─────────────────────────────────────────────────────────────

const MODE_ICONS: Record<SharedAttentionMode, React.ElementType> = {
  "dw-broadcast": Eye,
  "user-broadcast": MonitorPlay,
  "co-watch-dw": Tv2,
  "co-watch-user": Clapperboard,
};

// ── Inner page (needs SharedAttentionProvider) ────────────────────────────────

function SharedAttentionHubInner() {
  const [, navigate] = useLocation();
  const {
    coWatchOpen,
    dwBroadcastOpen,
    userBroadcastOpen,
    startCoWatchDW,
    startCoWatchUser,
    openDwBroadcast,
    openUserBroadcast,
    closeAll,
  } = useSharedAttention();

  function handleLaunch(mode: SharedAttentionMode) {
    switch (mode) {
      case "co-watch-dw":
        startCoWatchDW(
          "https://www.youtube-nocookie.com/results?search_query=relaxing+ambient+music",
          "Watch with DW",
        );
        break;
      case "co-watch-user":
        startCoWatchUser(undefined, "Watch together");
        break;
      case "dw-broadcast":
        openDwBroadcast();
        break;
      case "user-broadcast":
        openUserBroadcast();
        break;
    }
  }

  const modes = Object.values(SHARED_ATTENTION_MODES);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-4 border-b border-border/60">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")} aria-label="Back">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-base font-semibold leading-snug">Shared Attention</h1>
          <p className="text-xs text-muted-foreground">Choose how you'd like to be present together</p>
        </div>
      </header>

      {/* Mode cards */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-lg mx-auto px-4 py-6 flex flex-col gap-4">
          {modes.map((info) => {
            const Icon = MODE_ICONS[info.mode];
            return (
              <Card
                key={info.mode}
                className="cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => handleLaunch(info.mode)}
              >
                <CardContent className="px-4 py-4 flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-snug">{info.label}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{info.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* DW Broadcast Panel sheet */}
      <Sheet open={dwBroadcastOpen} onOpenChange={(open) => { if (!open) closeAll(); }}>
        <SheetContent side="bottom" className="max-h-[80dvh] rounded-t-2xl p-0">
          <SheetHeader className="px-5 pt-5 pb-3">
            <SheetTitle>Watch DW Work</SheetTitle>
          </SheetHeader>
          <DwBroadcastPanel live className="h-[50dvh]" />
        </SheetContent>
      </Sheet>

      {/* Co-watch sheet */}
      <CoWatchSheet open={coWatchOpen} onOpenChange={(open) => { if (!open) closeAll(); }} />

      {/* User broadcast dialog */}
      <UserBroadcastDialog
        open={userBroadcastOpen}
        onOpenChange={(open) => { if (!open) closeAll(); }}
      />
    </div>
  );
}

// ── Public export ─────────────────────────────────────────────────────────────

export default function SharedAttentionPage() {
  if (!isFeatureEnabled("sharedAttention")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6 text-center">
        <p className="text-sm text-muted-foreground">This feature isn't available yet.</p>
      </div>
    );
  }

  return (
    <SharedAttentionProvider>
      <SharedAttentionHubInner />
    </SharedAttentionProvider>
  );
}
