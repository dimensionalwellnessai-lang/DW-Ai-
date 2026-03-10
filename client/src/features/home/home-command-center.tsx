/**
 * HomeCommandCenter – the DW Home screen.
 *
 * Minimal "command center" layout:
 *  1) Header (PageHeader with greeting + user name)
 *  2) Today Card — always expanded anchor
 *  3) Module Icon Dock — Insight / Plan / Health / Momentum / Follow-up icons
 *     with micro-metric badges. Tap → opens HomeFocusSheet.
 *  4) HomeFocusSheet — bottom sheet with snap states (collapsed / half / full)
 *     containing a swipeable carousel of module views.
 *
 * Route: /command-center
 */

import { useState, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useHomeSummary } from "./useHomeSummary";
import { TodayCard } from "./components/TodayCard";
import { HomeModuleDock, type ModuleId } from "./HomeModuleDock";
import { HomeFocusSheet } from "./HomeFocusSheet";
import { MOCK_HOME_DATA } from "./homeData";

function CardSkeleton() {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-3 w-24 rounded" />
      </div>
      <Skeleton className="h-16 rounded-lg" />
    </div>
  );
}

export default function HomeCommandCenter() {
  const summary = useHomeSummary();

  // Which module dock icon is currently active / sheet open for
  const [activeModule, setActiveModule] = useState<ModuleId | null>(null);

  // Greeting line
  const firstName = summary.userName ? summary.userName.split(" ")[0] : null;

  const handleDockSelect = useCallback((id: ModuleId) => {
    // Tapping the same icon again toggles closed
    setActiveModule((prev) => (prev === id ? null : id));
  }, []);

  const handleModuleChange = useCallback((id: ModuleId) => {
    setActiveModule(id);
  }, []);

  const handleSheetClose = useCallback(() => {
    setActiveModule(null);
  }, []);

  // Compute micro-metric badges from real data (fall back to mock)
  const mock = MOCK_HOME_DATA;
  const topStreak = summary.activeHabits.reduce((max, h) => Math.max(max, h.streak ?? 0), 0);

  const badges: Partial<Record<ModuleId, string>> = {
    // Use category tag (up to 4 chars) as the insight badge; fall back to "•" if empty
    insight: summary.latestInsight
      ? (summary.latestInsight.category.slice(0, 4) || mock.insight.badge)
      : mock.insight.badge,
    plan: summary.activeGoals[0]?.progress != null
      ? `${summary.activeGoals[0].progress}%`
      : mock.plan.badge,
    // Avoid slicing an emoji mid-character for large streaks; cap at 2 digits + emoji
    health: topStreak > 0
      ? (topStreak > 99 ? "99🔥" : `${topStreak}🔥`)
      : mock.health.badge,
    momentum: topStreak > 0
      ? `${Math.min(topStreak, 99)}d`
      : mock.momentum.badge,
    followup: summary.activeFollowUp
      ? "1"
      : mock.followUp.badge,
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <PageHeader
        title="Home"
        showBack={false}
      />

      <div className="flex-1 overflow-auto">
        <div className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-32">
          {/* Greeting */}
          <div className="pb-0.5">
            <p className="text-base font-semibold text-foreground">
              {getGreeting()}{firstName ? `, ${firstName}` : ""}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{summary.todayLabel}</p>
          </div>

          {summary.isLoading ? (
            <>
              <CardSkeleton />
              <Skeleton className="h-20 rounded-2xl" />
            </>
          ) : (
            <>
              {/* Today Card — always expanded */}
              <TodayCard summary={summary} />

              {/* Module Icon Dock */}
              <HomeModuleDock
                badges={badges}
                activeModule={activeModule}
                onSelect={handleDockSelect}
              />
            </>
          )}
        </div>
      </div>

      {/* Bottom Sheet Focus Panel */}
      <HomeFocusSheet
        activeModule={activeModule}
        summary={summary}
        onModuleChange={handleModuleChange}
        onClose={handleSheetClose}
      />
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
