/**
 * Dimension Overview Card
 *
 * A reusable template for surfacing a life dimension's current state in a
 * consistent, premium format. Used across the life dashboard, dimension detail
 * sheets, and any context where a dimension summary is needed.
 *
 * Design principles:
 *  - Clear visual hierarchy: icon → name → status → insight phrase → actions
 *  - DW Orb is the only interactive intelligence entry point
 *  - Supports compact (list) and expanded (detail) layouts
 *  - No gamification — status is descriptive, not scored
 */

import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DWOrb } from "@/components/dw-orb";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export type DimensionStatus = "active" | "needs-attention" | "quiet" | "undefined";

export interface DimensionOverviewCardProps {
  /** Dimension identifier (used in data-testid) */
  id: string;
  /** Display name of the dimension */
  name: string;
  /** Short descriptor, e.g. "Mental & Emotional Clarity" */
  subtitle?: string;
  /** Lucide icon component for this dimension */
  icon: LucideIcon;
  /** Tailwind color class for icon and accents, e.g. "text-purple-400" */
  color: string;
  /** Tailwind bg class for the icon container, e.g. "bg-purple-500/10" */
  bgColor: string;
  /** Current status of this dimension */
  status?: DimensionStatus;
  /** Short phrase or personal statement for this dimension */
  phrase?: string;
  /** Brief supporting detail (e.g. recent goal or pattern) */
  detail?: string;
  /** Path to navigate when tapping "View" */
  path?: string;
  /** Pre-seeded DW chat topic when orb is tapped */
  dwTopic?: string;
  /** Show expanded layout with more detail */
  expanded?: boolean;
  /** Additional tap handler (e.g. open a sheet) */
  onTap?: () => void;
  className?: string;
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  DimensionStatus,
  { label: string; dotColor: string; badgeVariant: "default" | "secondary" | "outline" }
> = {
  active: { label: "Active", dotColor: "bg-emerald-400", badgeVariant: "default" },
  "needs-attention": {
    label: "Needs attention",
    dotColor: "bg-amber-400",
    badgeVariant: "secondary",
  },
  quiet: { label: "Quiet", dotColor: "bg-muted-foreground/40", badgeVariant: "outline" },
  undefined: { label: "Not set up", dotColor: "bg-muted-foreground/20", badgeVariant: "outline" },
};

// ── Component ─────────────────────────────────────────────────────────────────

export function DimensionOverviewCard({
  id,
  name,
  subtitle,
  icon: Icon,
  color,
  bgColor,
  status = "undefined",
  phrase,
  detail,
  path,
  dwTopic,
  expanded = false,
  onTap,
  className,
}: DimensionOverviewCardProps) {
  const [, navigate] = useLocation();
  const statusConfig = STATUS_CONFIG[status];

  const handleViewTap = () => {
    if (onTap) {
      onTap();
    } else if (path) {
      navigate(path);
    }
  };

  const handleDWTap = () => {
    const topic = dwTopic ?? `Talk about my ${name} dimension`;
    navigate(`/talk?topic=${encodeURIComponent(topic)}`);
  };

  return (
    <Card
      className={cn(
        "border-border/30 bg-card/60 backdrop-blur-sm cursor-pointer hover:bg-card/80 transition-colors",
        className,
      )}
      onClick={handleViewTap}
      data-testid={`dimension-overview-card-${id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Dimension icon */}
          <div
            className={cn(
              "w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0",
              bgColor,
            )}
          >
            <Icon className={cn("w-5 h-5", color)} />
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Name + status */}
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-sm font-semibold text-foreground"
                data-testid={`dimension-name-${id}`}
              >
                {name}
              </span>
              <div className="flex items-center gap-1">
                <span
                  className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", statusConfig.dotColor)}
                />
                <Badge
                  variant={statusConfig.badgeVariant}
                  className="text-[10px] h-4 px-1.5"
                  data-testid={`dimension-status-${id}`}
                >
                  {statusConfig.label}
                </Badge>
              </div>
            </div>

            {/* Subtitle */}
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}

            {/* Phrase / personal statement */}
            {phrase && (
              <p
                className="text-sm text-foreground/80 mt-2 leading-snug"
                data-testid={`dimension-phrase-${id}`}
              >
                {phrase}
              </p>
            )}

            {/* Additional detail — only shown in expanded mode */}
            {expanded && detail && (
              <p
                className="text-xs text-muted-foreground mt-1.5 leading-snug"
                data-testid={`dimension-detail-${id}`}
              >
                {detail}
              </p>
            )}

            {/* Action row — only shown in expanded mode */}
            {expanded && (
              <div
                className="flex items-center gap-2 mt-3"
                onClick={(e) => e.stopPropagation()}
              >
                {path && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={handleViewTap}
                    data-testid={`dimension-view-btn-${id}`}
                  >
                    View
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={handleDWTap}
                  data-testid={`dimension-dw-btn-${id}`}
                >
                  <DWOrb size={14} state="idle" />
                  Ask DW
                </Button>
              </div>
            )}
          </div>

          {/* Right: interactive DW Orb — compact mode only */}
          {!expanded && (
            <div className="flex-shrink-0 flex items-center">
              <DWOrb
                size={32}
                state="idle"
                onTap={handleDWTap}
                label={`Talk with DW about ${name}`}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
