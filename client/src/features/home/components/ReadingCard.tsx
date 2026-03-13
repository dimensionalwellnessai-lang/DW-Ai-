/**
 * ReadingCard – reusable DW insight reading card.
 *
 * Renders a premium "reading" for a DW-generated insight with:
 *  - Category / dimension badge
 *  - Headline (insightLine or title)
 *  - Summary
 *  - Up to 3 insight bullets (conversation quotes, when available)
 *  - Momentum opportunity tags (when available)
 *  - Recommended actions derived from switchTag (when available)
 *  - DW Orb CTA → /talk with insightId and prefill
 *
 * Works for both guest and authenticated flows.
 * Use compact=true for smaller contexts (e.g. Home Command Center tile).
 * Use variant="embedded" inside sheets/panels to suppress the Card shell.
 */

import { useLocation } from "wouter";
import { Sparkles, ChevronRight, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DWOrb } from "@/components/dw-orb";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ── Recommended actions per switch/dimension ──────────────────────────────────

const SWITCH_ACTIONS: Record<string, string[]> = {
  body: ["Track your energy today", "Take a movement break", "Stay hydrated"],
  mind: ["Journal for 5 minutes", "Take a mindful pause", "Notice one thought pattern"],
  time: ["Review your schedule", "Block one focus window", "Identify your top priority"],
  purpose: ["Write one aligned action", "Reconnect with your why", "Review a long-term goal"],
  money: ["Check in on your spending", "Set a savings intention", "Review a financial goal"],
  relationships: ["Reach out to someone today", "Express a need clearly", "Schedule quality time"],
  environment: ["Tidy one space", "Assess your workspace", "Create a moment of calm"],
  identity: ["Affirm one belief today", "Take an identity-aligned action", "Explore a core value"],
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ReadingCardData {
  /** Insight record ID – used to build the /talk deep link */
  id: string;
  /** Primary headline (insightLine or title) */
  headline: string;
  /** Summary / body copy */
  summary?: string;
  /** Category or dimension label shown as a badge (e.g. "Relationships") */
  category?: string;
  /** Up to 3 insight bullets (conversation quotes) */
  bullets?: string[];
  /** Momentum opportunity tags */
  tags?: string[];
  /** Switch/dimension key for deriving recommended actions (e.g. "body") */
  switchTag?: string;
}

export interface ReadingCardProps {
  /** Insight data. null → empty-state UI. */
  data: ReadingCardData | null;
  /** Compact layout: hides bullets, tags, and actions for smaller contexts. */
  compact?: boolean;
  /**
   * "card" (default): wrapped in a Card shell with border.
   * "embedded": no Card shell – use inside sheets/panels that provide their own container.
   */
  variant?: "card" | "embedded";
  className?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ReadingCard({
  data,
  compact = false,
  variant = "card",
  className,
}: ReadingCardProps) {
  const [, navigate] = useLocation();

  // ── Empty state ────────────────────────────────────────────────────────────

  if (!data) {
    const emptyContent = (
      <div className={cn("space-y-3", compact && "space-y-2")}>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 flex-shrink-0">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            DW Reading
          </p>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          No reading yet — start a conversation with DW to generate your first insight.
        </p>
        <button
          type="button"
          onClick={() => navigate("/talk")}
          className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          Start a conversation
          <ArrowRight className="h-3 w-3" aria-hidden />
        </button>
      </div>
    );

    if (variant === "embedded") {
      return (
        <div className={cn(className)} data-testid="reading-card-empty">
          {emptyContent}
        </div>
      );
    }

    return (
      <Card
        className={cn("border border-dashed border-border/60 bg-card shadow-none", className)}
        data-testid="reading-card-empty"
      >
        <CardContent className="p-4">{emptyContent}</CardContent>
      </Card>
    );
  }

  // ── Data-driven state ──────────────────────────────────────────────────────

  const bullets = (data.bullets ?? []).slice(0, 3);
  const tags = data.tags ?? [];
  const actions = data.switchTag
    ? (SWITCH_ACTIONS[data.switchTag?.toLowerCase()] ?? []).slice(0, 3)
    : [];

  // Key pattern shared by the talk page to retrieve cached insight data.
  // Must stay in sync with any readers in talk-it-out.tsx / life-command-center.tsx.
  const sessionKey = `dwInsight:${data.id}`;

  function handleContinueWithDW() {
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        window.sessionStorage.setItem(sessionKey, JSON.stringify(data));
      }
    } catch {
      // sessionStorage unavailable – continue without caching
    }
    const params = new URLSearchParams();
    params.set("insightId", data.id);
    params.set("prefill", `Let's explore this reading: "${data.headline}"`);
    params.set("src", "reading_card");
    navigate(`/talk?${params.toString()}`);
  }

  const content = (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="p-1.5 rounded-lg bg-primary/10 flex-shrink-0">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            DW Reading
          </p>
          {data.category && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
              {data.category}
            </Badge>
          )}
        </div>
        <button
          type="button"
          onClick={() => navigate("/insights")}
          aria-label="View all insights"
          className="p-1 rounded hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary flex-shrink-0"
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
        </button>
      </div>

      {/* Headline */}
      <p
        className={cn(
          "text-sm font-medium leading-snug text-foreground",
          compact && "line-clamp-2",
        )}
        data-testid="reading-card-headline"
      >
        {data.headline}
      </p>

      {/* Summary */}
      {data.summary && (
        <p
          className={cn(
            "text-xs text-muted-foreground leading-relaxed",
            compact ? "line-clamp-2" : "line-clamp-3",
          )}
          data-testid="reading-card-summary"
        >
          {data.summary}
        </p>
      )}

      {/* Insight bullets (quotes) – full mode only */}
      {!compact && bullets.length > 0 && (
        <div className="space-y-1.5" data-testid="reading-card-bullets">
          {bullets.map((bullet, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <span className="text-primary mt-0.5 flex-shrink-0 text-xs" aria-hidden>
                ·
              </span>
              <p className="text-xs text-muted-foreground italic leading-snug">"{bullet}"</p>
            </div>
          ))}
        </div>
      )}

      {/* Momentum opportunities (tags) – full mode only */}
      {!compact && tags.length > 0 && (
        <div className="space-y-1" data-testid="reading-card-tags">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Momentum Opportunities
          </p>
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Recommended actions – full mode only */}
      {!compact && actions.length > 0 && (
        <div className="space-y-1.5" data-testid="reading-card-actions">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Recommended Actions
          </p>
          {actions.map((action, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-primary/60 flex-shrink-0" aria-hidden />
              <p className="text-xs text-foreground/70">{action}</p>
            </div>
          ))}
        </div>
      )}

      {/* CTA row */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={handleContinueWithDW}
          className="text-[10px] font-semibold text-primary hover:text-primary/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          data-testid="reading-card-cta"
        >
          Continue with DW →
        </button>
        <DWOrb
          size={28}
          state="suggestion"
          onTap={handleContinueWithDW}
          context={data.headline}
          label="Talk to DW"
        />
      </div>
    </div>
  );

  if (variant === "embedded") {
    return (
      <div className={cn(className)} data-testid="reading-card">
        {content}
      </div>
    );
  }

  return (
    <Card
      className={cn("border border-border/60 bg-card shadow-none", className)}
      data-testid="reading-card"
    >
      <CardContent className="p-4">{content}</CardContent>
    </Card>
  );
}
