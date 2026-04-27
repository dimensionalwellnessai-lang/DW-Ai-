/**
 * WearableInfluenceBadge
 *
 * Small badge / footnote shown on cards where DW silently weaves yesterday's
 * wearable data (sleep, HRV, resting HR, steps, screen time) into its output —
 * morning briefing, evening reflection, workout suggestions, meditation
 * suggestions. Tapping the badge opens a popover that lists the actual
 * numbers DW referenced so the user can learn what their wearable is
 * contributing.
 *
 * Renders nothing when no wearable is connected or no headline metrics exist.
 *
 * Pass `onlyWhenInfluential` to limit display to cases where DW likely
 * steered the recommendation (low recovery or high screen time). The
 * morning briefing and evening reflection always show whenever metrics
 * exist; workout/meditation only show when DW pivoted toward something
 * gentler.
 */

import { useQuery } from "@tanstack/react-query";
import { Activity, Moon, HeartPulse, Footprints, Smartphone } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface WearableYesterdayMetrics {
  sleepMinutes?: number;
  hrv?: number;
  restingHr?: number;
  steps?: number;
  screenTimeMinutes?: number;
}

export interface YesterdayHeadline {
  metrics: WearableYesterdayMetrics;
  isLowRecovery: boolean;
  isHighScreenTime: boolean;
}

function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h <= 0) return `${m}m`;
  if (m <= 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Returns the short list of metric labels DW would surface in a tooltip
 * (e.g. "sleep + HRV"). Used for the badge text and read by screen readers.
 */
function summarizeFields(m: WearableYesterdayMetrics): string {
  const present: string[] = [];
  if (m.sleepMinutes != null) present.push("sleep");
  if (m.hrv != null) present.push("HRV");
  if (m.restingHr != null) present.push("resting HR");
  if (m.steps != null) present.push("steps");
  if (m.screenTimeMinutes != null) present.push("screen time");
  if (present.length === 0) return "wearable data";
  if (present.length === 1) return present[0];
  if (present.length === 2) return `${present[0]} + ${present[1]}`;
  return `${present.slice(0, 2).join(", ")} + ${present.length - 2} more`;
}

export interface WearableInfluenceBadgeProps {
  /**
   * Pre-loaded metrics. When omitted, the badge fetches them itself via
   * `/api/wearables/yesterday-headline`.
   */
  data?: YesterdayHeadline | null;
  /**
   * When true, only render if DW likely steered the recommendation toward
   * something gentler (low recovery or high screen time). Used on workout
   * and meditation screens.
   */
  onlyWhenInfluential?: boolean;
  className?: string;
  /** Test id suffix to disambiguate when multiple badges render on a page. */
  testIdSuffix?: string;
}

export function WearableInfluenceBadge({
  data,
  onlyWhenInfluential = false,
  className = "",
  testIdSuffix = "",
}: WearableInfluenceBadgeProps) {
  const fetchEnabled = data === undefined;
  const headlineQ = useQuery<YesterdayHeadline | null>({
    queryKey: ["/api/wearables/yesterday-headline"],
    queryFn: async () => {
      const res = await fetch("/api/wearables/yesterday-headline", {
        credentials: "include",
      });
      if (res.status === 401) return null;
      if (!res.ok) return null;
      const body = await res.json();
      return body as YesterdayHeadline | null;
    },
    enabled: fetchEnabled,
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

  const headline = data === undefined ? headlineQ.data ?? null : data;
  if (!headline) return null;
  // Edge case: backend can return an empty metrics object if no fields were
  // populated for yesterday. Without any concrete numbers to show, the badge
  // would just say "based on your wearable data from yesterday" with an
  // empty popover — which is more confusing than helpful, so we hide it.
  const m = headline.metrics;
  const hasAnyField =
    m.sleepMinutes != null ||
    m.hrv != null ||
    m.restingHr != null ||
    m.steps != null ||
    m.screenTimeMinutes != null;
  if (!hasAnyField) return null;
  if (onlyWhenInfluential && !headline.isLowRecovery && !headline.isHighScreenTime) {
    return null;
  }

  const fields = summarizeFields(headline.metrics);
  const label = `Based on your ${fields} from yesterday`;
  const testId = testIdSuffix
    ? `badge-wearable-influence-${testIdSuffix}`
    : "badge-wearable-influence";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary/90 hover:bg-primary/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`}
          aria-label={`${label}. Tap to see the numbers.`}
          data-testid={testId}
        >
          <Activity className="h-3 w-3" aria-hidden="true" />
          <span className="truncate max-w-[260px]">{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-3"
        align="start"
        data-testid={`${testId}-popover`}
      >
        <p className="text-xs font-medium text-foreground mb-2">
          Yesterday's signals DW used
        </p>
        <ul className="space-y-1.5 text-xs text-muted-foreground">
          {headline.metrics.sleepMinutes != null && (
            <MetricRow
              icon={Moon}
              label="Sleep"
              value={formatMinutes(headline.metrics.sleepMinutes)}
              testId="text-wearable-metric-sleep"
            />
          )}
          {headline.metrics.hrv != null && (
            <MetricRow
              icon={HeartPulse}
              label="HRV"
              value={`${headline.metrics.hrv} ms`}
              testId="text-wearable-metric-hrv"
            />
          )}
          {headline.metrics.restingHr != null && (
            <MetricRow
              icon={HeartPulse}
              label="Resting HR"
              value={`${headline.metrics.restingHr} bpm`}
              testId="text-wearable-metric-resting-hr"
            />
          )}
          {headline.metrics.steps != null && (
            <MetricRow
              icon={Footprints}
              label="Steps"
              value={headline.metrics.steps.toLocaleString()}
              testId="text-wearable-metric-steps"
            />
          )}
          {headline.metrics.screenTimeMinutes != null && (
            <MetricRow
              icon={Smartphone}
              label="Screen time"
              value={formatMinutes(headline.metrics.screenTimeMinutes)}
              testId="text-wearable-metric-screen-time"
            />
          )}
        </ul>
        {(headline.isLowRecovery || headline.isHighScreenTime) && (
          <p
            className="mt-2 pt-2 border-t border-border text-[11px] text-muted-foreground leading-snug"
            data-testid="text-wearable-influence-note"
          >
            {headline.isLowRecovery
              ? "DW leaned toward something gentler because recovery looks low."
              : "DW added a wind-down nudge because screen time was high."}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

function MetricRow({
  icon: Icon,
  label,
  value,
  testId,
}: {
  icon: typeof Moon;
  label: string;
  value: string;
  testId: string;
}) {
  return (
    <li className="flex items-center justify-between gap-2" data-testid={testId}>
      <span className="flex items-center gap-1.5">
        <Icon className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
        {label}
      </span>
      <span className="font-medium text-foreground">{value}</span>
    </li>
  );
}
