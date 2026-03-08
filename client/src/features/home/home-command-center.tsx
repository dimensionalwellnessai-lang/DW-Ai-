/**
 * HomeCommandCenter – the DW Home screen.
 *
 * A calm, skimmable command center showing real data across 5–6 cards.
 * Each card shows real data when available, otherwise a logical empty state
 * with a contextual DW chat CTA.
 *
 * Route: /command-center
 */

import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useHomeSummary } from "./useHomeSummary";
import { TodayCard } from "./components/TodayCard";
import { InsightSnapshotCard } from "./components/InsightSnapshotCard";
import { PlanInMotionCard } from "./components/PlanInMotionCard";
import { HealthSnapshotCard } from "./components/HealthSnapshotCard";
import { MomentumCard } from "./components/MomentumCard";
import { FollowUpCard } from "./components/FollowUpCard";

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

  return (
    <div className="flex flex-col h-full bg-background">
      <PageHeader
        title="Home"
        showBack={false}
      />

      <div className="flex-1 overflow-auto">
        <div className="max-w-lg mx-auto px-4 py-4 space-y-3 pb-24">
          {/* Greeting */}
          <div className="pb-1">
            {summary.userName ? (
              <p className="text-base font-semibold text-foreground">
                {getGreeting()}, {summary.userName.split(" ")[0]}
              </p>
            ) : (
              <p className="text-base font-semibold text-foreground">{getGreeting()}</p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">{summary.todayLabel}</p>
          </div>

          {summary.isLoading ? (
            <>
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </>
          ) : (
            <>
              <TodayCard summary={summary} />
              <InsightSnapshotCard summary={summary} />
              <PlanInMotionCard summary={summary} />
              <HealthSnapshotCard summary={summary} />
              <MomentumCard summary={summary} />
              <FollowUpCard summary={summary} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
