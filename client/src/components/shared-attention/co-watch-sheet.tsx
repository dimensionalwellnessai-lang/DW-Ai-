/**
 * co-watch-sheet.tsx
 *
 * Bottom sheet hosting a co-watch Shared Attention session.
 * Embeds YouTube content (youtube-nocookie) or falls back to an external-open
 * link if the browser/CSP does not support framing.
 */

import { useState, useEffect } from "react";
import { ExternalLink, MessageCircle, X } from "lucide-react";
import { useLocation } from "wouter";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useSharedAttentionContext } from "./shared-attention-context";

// ── DW reaction prompts shown in rotation ────────────────────────────────────

const DW_REACTIONS = [
  "How's this landing for you?",
  "Want me to pause here?",
  "Anything standing out so far?",
  "Take your time — I'm here.",
  "Let me know when you're ready to talk about it.",
  "Notice anything that resonates?",
  "What's coming up for you right now?",
];

function YOUTUBE_NOCOOKIE_EMBED(url: string): string | null {
  // Match standard YouTube watch URLs and youtu.be short links
  const watchMatch = url.match(/youtube\.com\/watch\?v=([A-Za-z0-9_-]+)/);
  const shortMatch = url.match(/youtu\.be\/([A-Za-z0-9_-]+)/);
  const id = (watchMatch ?? shortMatch)?.[1];
  if (!id) return null;
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface CoWatchSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CoWatchSheet({ open, onOpenChange }: CoWatchSheetProps) {
  const [, navigate] = useLocation();
  const { session, endSession } = useSharedAttentionContext();
  const [reactionIndex, setReactionIndex] = useState(0);
  const [embedError, setEmbedError] = useState(false);

  // Rotate DW reaction prompts every 45 s during an active session
  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => {
      setReactionIndex((i) => (i + 1) % DW_REACTIONS.length);
    }, 45_000);
    return () => clearInterval(timer);
  }, [open]);

  function handleEnd() {
    endSession();
    onOpenChange(false);
  }

  function handleTalkAboutIt() {
    const prefill = session?.title
      ? `I was just watching "${session.title}" — `
      : "I was just watching something with DW — ";
    navigate(`/talk?prefill=${encodeURIComponent(prefill)}&src=co-watch`);
    handleEnd();
  }

  const contentUrl = session?.contentUrl ?? "";
  const embedUrl = !embedError ? YOUTUBE_NOCOOKIE_EMBED(contentUrl) : null;
  const title = session?.title ?? "Watching together";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-2xl p-0">
        <SheetHeader className="px-5 pt-5 pb-3">
          <div className="flex items-start justify-between gap-3">
            <SheetTitle className="text-base font-semibold leading-snug">{title}</SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 -mt-1 -mr-2"
              onClick={handleEnd}
              aria-label="End session"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        {/* Content area */}
        <div className="px-4 pb-2">
          {embedUrl ? (
            <div className="relative w-full overflow-hidden rounded-xl bg-black" style={{ aspectRatio: "16/9" }}>
              <iframe
                src={embedUrl}
                title={title}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full border-0"
                onError={() => setEmbedError(true)}
              />
            </div>
          ) : contentUrl ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-muted/40 p-6 text-center">
              <ExternalLink className="h-7 w-7 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                This content can't be embedded here. Open it in a new tab to watch together.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(contentUrl, "_blank", "noopener,noreferrer")}
              >
                Open content
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-muted/40 p-6 text-center">
              <p className="text-sm text-muted-foreground">No content loaded yet.</p>
            </div>
          )}
        </div>

        {/* DW reactions strip */}
        <div className="mx-4 my-3 rounded-xl bg-muted/50 px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">DW says</p>
          <p className="text-sm text-foreground leading-relaxed">{DW_REACTIONS[reactionIndex]}</p>
        </div>

        {/* CTAs */}
        <div className="flex gap-2 px-4 pb-6 pt-1">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={handleTalkAboutIt}
          >
            <MessageCircle className="h-4 w-4" />
            Talk about it
          </Button>
          <Button
            variant="ghost"
            className="flex-1 text-muted-foreground"
            onClick={handleEnd}
          >
            End session
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
