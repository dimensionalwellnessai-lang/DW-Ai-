/**
 * Zones — The House
 *
 * 13 life areas displayed as rooms. Each Zone surfaces the tools relevant
 * to that area and shows personalized state only when that data is available.
 */

import { useLocation } from "wouter";
import { PageHeader } from "@/components/page-header";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Constellation } from "@/components/constellation";
import { cn } from "@/lib/utils";
import type { ZoneId } from "@/components/constellation";

// ── Zone definitions ──────────────────────────────────────────────────────────

export interface ZoneMeta {
  id: ZoneId;
  name: string;
  tagline: string;
  color: string;
  bg: string;
  border: string;
  tools: { label: string; path: string }[];
  current: string; // Which energy Current powers this Zone
}

export const ZONES: ZoneMeta[] = [
  {
    id: "physical",
    name: "Physical",
    tagline: "The foundation everything runs on",
    color: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/25",
    tools: [
      { label: "Workouts", path: "/workout" },
      { label: "Nutrition", path: "/meal-prep" },
      { label: "Recovery", path: "/recovery" },
      { label: "Tracking", path: "/tracking" },
      { label: "Health Data", path: "/health-data" },
    ],
    current: "Drive",
  },
  {
    id: "mental",
    name: "Mental",
    tagline: "Where clarity lives when it's well-fed",
    color: "text-sky-700 dark:text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/25",
    tools: [
      { label: "Journal", path: "/journal" },
      { label: "Meditation", path: "/spiritual" },
      { label: "Mood", path: "/mood-tracker" },
      { label: "Insights", path: "/insights" },
    ],
    current: "Mind",
  },
  {
    id: "spiritual",
    name: "Spiritual",
    tagline: "The signal beneath the noise",
    color: "text-violet-700 dark:text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/25",
    tools: [
      { label: "Energy Transmutation", path: "/energy-transmutation" },
      { label: "Cosmic Hub", path: "/cosmic" },
      { label: "Astrology", path: "/cosmic-insights" },
    ],
    current: "Light",
  },
  {
    id: "financial",
    name: "Financial",
    tagline: "Resources that expand your options",
    color: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/25",
    tools: [
      { label: "Finances", path: "/finances" },
    ],
    current: "Will",
  },
  {
    id: "relationships",
    name: "Relationships",
    tagline: "The web you're woven into",
    color: "text-rose-700 dark:text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/25",
    tools: [
      { label: "Relationships", path: "/relationships" },
      { label: "Accountability", path: "/accountability" },
    ],
    current: "Wave",
  },
  {
    id: "career",
    name: "Career",
    tagline: "How your gifts meet the world",
    color: "text-orange-700 dark:text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/25",
    tools: [
      { label: "Plans", path: "/plans" },
      { label: "Tasks", path: "/tasks" },
      { label: "Role Map", path: "/role-map" },
      { label: "Goals", path: "/goals" },
    ],
    current: "Will",
  },
  {
    id: "learning",
    name: "Learning",
    tagline: "Curiosity in motion",
    color: "text-cyan-700 dark:text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/25",
    tools: [
      { label: "Library", path: "/library" },
      { label: "The Current", path: "/feed" },
      { label: "Challenges", path: "/challenges" },
    ],
    current: "Spark",
  },
  {
    id: "environment",
    name: "Environment",
    tagline: "The space that shapes your state",
    color: "text-teal-700 dark:text-teal-400",
    bg: "bg-teal-500/10",
    border: "border-teal-500/25",
    tools: [
      { label: "Routines", path: "/routines" },
      { label: "Daily Schedule", path: "/daily-schedule" },
    ],
    current: "Flow",
  },
  {
    id: "creativity",
    name: "Creativity",
    tagline: "The part of you that needs no reason",
    color: "text-fuchsia-700 dark:text-fuchsia-400",
    bg: "bg-fuchsia-500/10",
    border: "border-fuchsia-500/25",
    tools: [
      { label: "The Current", path: "/feed" },
      { label: "Projects", path: "/projects" },
    ],
    current: "Spark",
  },
  {
    id: "fun",
    name: "Fun",
    tagline: "The Zone that recharges all others",
    color: "text-yellow-700 dark:text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/25",
    tools: [
      { label: "The Current", path: "/feed" },
      { label: "Challenges", path: "/challenges" },
    ],
    current: "Gut",
  },
  {
    id: "community",
    name: "Community",
    tagline: "Belonging without performance",
    color: "text-indigo-700 dark:text-indigo-400",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/25",
    tools: [
      { label: "Community", path: "/community" },
      { label: "Group Challenges", path: "/group-challenges" },
    ],
    current: "Flow",
  },
  {
    id: "rest",
    name: "Rest",
    tagline: "Not nothing — regeneration",
    color: "text-blue-700 dark:text-blue-300",
    bg: "bg-blue-500/10",
    border: "border-blue-500/25",
    tools: [
      { label: "Recovery", path: "/recovery" },
      { label: "Mood", path: "/mood-tracker" },
    ],
    current: "Wave",
  },
  {
    id: "identity",
    name: "Identity",
    tagline: "Who you are beneath all the roles",
    color: "text-purple-700 dark:text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/25",
    tools: [
      { label: "Blueprint", path: "/blueprint" },
      { label: "Life Blueprint", path: "/life-blueprint" },
      { label: "Settings", path: "/settings" },
    ],
    current: "Mind",
  },
];

// ── Energy level helper ───────────────────────────────────────────────────────

type EnergyLevel = "dim" | "low" | "steady" | "bright" | "unavailable";

function getLevelLabel(level: EnergyLevel) {
  return {
    dim: "Dim",
    low: "Low",
    steady: "Steady",
    bright: "Bright",
    unavailable: "Unavailable",
  }[level];
}

function getLevelColor(level: EnergyLevel) {
  return {
    dim: "bg-zinc-600",
    low: "bg-amber-500",
    steady: "bg-sky-500",
    bright: "bg-emerald-500",
    unavailable: "bg-zinc-400",
  }[level];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ZonesPage() {
  usePageMeta("Zones — The House", "Your 13 life areas, each a room in the house you're building.");

  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader
        title="The House"
        subtitle="Your 13 life zones — each a room worth tending"
        icon={
          <Constellation state="idle" size={28} className="opacity-80" />
        }
      />

      <div className="px-4 pt-2 pb-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ZONES.map((zone) => {
            const level: EnergyLevel = "unavailable";

            return (
              <button
                type="button"
                key={zone.id}
                onClick={() => setLocation(`/zones/${zone.id}`)}
                className={cn(
                  "group relative flex flex-col gap-2 rounded-2xl border p-4 text-left",
                  "transition-all duration-200",
                  "hover:scale-[1.01] active:scale-[0.99]",
                  zone.bg,
                  zone.border,
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
                aria-label={`${zone.name} Zone — ${getLevelLabel(level)}`}
              >
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Constellation
                      zone={zone.id}
                      state="idle"
                      size={22}
                      className="opacity-75 group-hover:opacity-100 transition-opacity"
                    />
                    <span className={cn("font-semibold text-sm", zone.color)}>
                      {zone.name}
                    </span>
                  </div>

                  {/* Energy level badge */}
                  <span className="flex items-center gap-1.5">
                    <span
                      className={cn("h-2 w-2 rounded-full", getLevelColor(level))}
                      aria-hidden="true"
                    />
                    <span className="text-xs text-muted-foreground">
                      {getLevelLabel(level)}
                    </span>
                  </span>
                </div>

                {/* Tagline */}
                <p className="text-xs text-muted-foreground leading-snug">
                  {zone.tagline}
                </p>

                {/* Current label */}
                <p className="text-[11px] text-muted-foreground/60 mt-auto pt-1">
                  Powered by {zone.current} Current
                </p>

                <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground/50">
                  <p>Personalized state unavailable right now</p>
                  <p>
                    {zone.tools.length} tool{zone.tools.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
