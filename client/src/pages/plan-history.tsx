/**
 * Plan History Page (PR #17 – Multi-plan support + plan history)
 *
 * Shows all elevation plans for the user (active, archived, draft) with:
 * - Per-plan completion rates
 * - Re-activate button for archived plans
 * - Side-by-side comparison of two selected plans
 * - Link to view/edit any plan in full
 */

import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Archive,
  RotateCcw,
  Loader2,
  GitCompare,
  X,
  CheckCircle2,
  Circle,
  ChevronRight,
  Brain,
} from "lucide-react";
import {
  useElevationPlan,
  type ElevationPlanWithStats,
  type ElevationPlanFull,
} from "@/hooks/use-elevation-plan";
import { useAuth } from "@/hooks/use-auth";
import { isFeatureEnabled } from "@/config/featureFlags";
import { getGuestElevationPlansWithStats } from "@/lib/elevation-plan-storage";
import { useToast } from "@/hooks/use-toast";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function completionPercent(plan: ElevationPlanWithStats): number {
  if (plan.totalActions === 0) return 0;
  return Math.round((plan.completedActions / plan.totalActions) * 100);
}

function statusLabel(status: string) {
  switch (status) {
    case "active":
      return { label: "Active", className: "border-green-500/50 text-green-400 bg-green-500/10" };
    case "archived":
      return { label: "Archived", className: "border-muted text-muted-foreground bg-muted/30" };
    default:
      return { label: "Draft", className: "border-yellow-500/50 text-yellow-400 bg-yellow-500/10" };
  }
}

// ─── Plan card ────────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  compareSelected,
  onSelectCompare,
  onReactivate,
  onArchive,
  isReactivating,
  isArchiving,
}: {
  plan: ElevationPlanWithStats;
  compareSelected: boolean;
  onSelectCompare: (id: string) => void;
  onReactivate: (id: string) => void;
  onArchive: (id: string) => void;
  isReactivating: boolean;
  isArchiving: boolean;
}) {
  const pct = completionPercent(plan);
  const { label: statusText, className: statusClass } = statusLabel(plan.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border transition-colors ${compareSelected ? "border-purple-500/60 bg-purple-500/5" : "border-border bg-card"}`}
    >
      <div className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">{plan.title}</p>
            {plan.goal && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">{plan.goal}</p>
            )}
          </div>
          <Badge variant="outline" className={`shrink-0 text-xs ${statusClass}`}>
            {statusText}
          </Badge>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {plan.focusDimension && (
            <span className="flex items-center gap-1 capitalize">
              <Brain className="h-3 w-3" aria-hidden />
              {plan.focusDimension}
            </span>
          )}
          <span>
            {plan.startDate} → {plan.endDate}
          </span>
        </div>

        {/* Completion bar */}
        {plan.totalActions > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Completion</span>
              <span>
                {plan.completedActions}/{plan.totalActions} actions ({pct}%)
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/elevation-plan?id=${plan.id}`}>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
              View
              <ChevronRight className="h-3 w-3" aria-hidden />
            </Button>
          </Link>

          {plan.status === "archived" && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => onReactivate(plan.id)}
              disabled={isReactivating}
            >
              {isReactivating ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              ) : (
                <RotateCcw className="h-3 w-3" aria-hidden />
              )}
              Re-activate
            </Button>
          )}

          {plan.status === "active" && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1 text-muted-foreground"
              onClick={() => onArchive(plan.id)}
              disabled={isArchiving}
            >
              {isArchiving ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              ) : (
                <Archive className="h-3 w-3" aria-hidden />
              )}
              Archive
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            className={`h-7 text-xs gap-1 ml-auto ${compareSelected ? "text-purple-400" : "text-muted-foreground"}`}
            onClick={() => onSelectCompare(plan.id)}
            aria-pressed={compareSelected}
            aria-label={compareSelected ? "Deselect for comparison" : "Select for comparison"}
          >
            <GitCompare className="h-3 w-3" aria-hidden />
            {compareSelected ? "Selected" : "Compare"}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Compare panel ────────────────────────────────────────────────────────────

function ComparePanel({
  plans,
  planDetails,
  onClose,
}: {
  plans: ElevationPlanWithStats[];
  planDetails: (ElevationPlanFull | null)[];
  onClose: () => void;
}) {
  const [a, b] = plans;
  const [detailA, detailB] = planDetails;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-y-auto">
      <div className="p-4 max-w-2xl mx-auto pb-24">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <GitCompare className="h-4 w-4 text-purple-400" aria-hidden />
            Plan Comparison
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close comparison">
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { plan: a, detail: detailA },
            { plan: b, detail: detailB },
          ].map(({ plan, detail }, idx) => {
            const pct = completionPercent(plan);
            return (
              <div key={idx} className="space-y-3">
                <Card className="card-modern">
                  <CardHeader className="p-3 pb-2">
                    <CardTitle className="text-xs font-semibold leading-tight">{plan.title}</CardTitle>
                    {plan.goal && (
                      <p className="text-xs text-muted-foreground leading-snug">{plan.goal}</p>
                    )}
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-2">
                    <div className="text-xs text-muted-foreground">
                      {plan.startDate} → {plan.endDate}
                    </div>
                    {plan.totalActions > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Completed</span>
                          <span className="font-medium text-foreground">{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {plan.completedActions} of {plan.totalActions} actions
                        </div>
                      </div>
                    )}
                    {plan.focusDimension && (
                      <div className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                        <Brain className="h-3 w-3" aria-hidden />
                        {plan.focusDimension}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Day-by-day completion summary */}
                {detail && detail.days.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">By day</p>
                    {detail.days.map((day) => {
                      const dayTotal = day.actions.length;
                      const dayDone = day.actions.filter((a) => a.isCompleted).length;
                      const allDone = dayTotal > 0 && dayDone === dayTotal;
                      return (
                        <div key={day.dayIndex} className="flex items-center gap-2 text-xs">
                          {allDone ? (
                            <CheckCircle2 className="h-3 w-3 text-green-400 shrink-0" aria-hidden />
                          ) : (
                            <Circle className="h-3 w-3 text-muted-foreground shrink-0" aria-hidden />
                          )}
                          <span className="text-muted-foreground truncate">
                            D{day.dayIndex}: {day.theme}
                          </span>
                          {dayTotal > 0 && (
                            <span className="ml-auto text-muted-foreground shrink-0">
                              {dayDone}/{dayTotal}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlanHistoryPage() {
  const { user } = useAuth();
  const isLoggedIn = Boolean(user);
  const { toast } = useToast();

  const {
    allPlans,
    isLoadingAllPlans,
    archivePlan,
    isArchiving,
    reactivatePlan,
    isReactivating,
  } = useElevationPlan();

  // For guest users, derive stats from localStorage
  const guestPlansWithStats = !isLoggedIn ? getGuestElevationPlansWithStats() : [];

  const plans: ElevationPlanWithStats[] = isLoggedIn
    ? allPlans
    : (guestPlansWithStats as ElevationPlanWithStats[]);

  // ─── Compare state ────────────────────────────────────────────────────────

  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const toggleCompare = (id: string) => {
    setCompareIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < 2
        ? [...prev, id]
        : prev
    );
  };

  // Fetch full details for the two compared plans
  const compareA = plans.find((p) => p.id === compareIds[0]) ?? null;
  const compareB = plans.find((p) => p.id === compareIds[1]) ?? null;

  const { data: detailA = null } = useQuery<ElevationPlanFull | null>({
    queryKey: [`/api/elevation-plans/${compareIds[0]}`],
    enabled: showCompare && isLoggedIn && Boolean(compareIds[0]),
    queryFn: async () => {
      const res = await fetch(`/api/elevation-plans/${compareIds[0]}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: detailB = null } = useQuery<ElevationPlanFull | null>({
    queryKey: [`/api/elevation-plans/${compareIds[1]}`],
    enabled: showCompare && isLoggedIn && Boolean(compareIds[1]),
    queryFn: async () => {
      const res = await fetch(`/api/elevation-plans/${compareIds[1]}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleReactivate = async (id: string) => {
    try {
      await reactivatePlan({ id });
      toast({ title: "Plan reactivated", description: "This plan is now your active elevation plan." });
    } catch {
      toast({ title: "Failed to reactivate plan", variant: "destructive" });
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await archivePlan({ id });
      toast({ title: "Plan archived" });
    } catch {
      toast({ title: "Failed to archive plan", variant: "destructive" });
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (!isFeatureEnabled("ELEVATION_PLAN") && !isFeatureEnabled("MULTI_PLAN")) {
    return (
      <div className="bg-background">
        <PageHeader title="Plan History" />
        <div className="p-4 max-w-lg mx-auto text-center">
          <p className="text-muted-foreground">This feature is not yet enabled.</p>
        </div>
      </div>
    );
  }

  if (isLoadingAllPlans) {
    return (
      <div className="bg-background">
        <PageHeader title="Plan History" />
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const activePlans = plans.filter((p) => p.status === "active");
  const archivedPlans = plans.filter((p) => p.status === "archived");
  const draftPlans = plans.filter((p) => p.status === "draft");

  return (
    <div className="bg-background">
      <PageHeader title="Plan History" />

      {showCompare && compareA && compareB && (
        <ComparePanel
          plans={[compareA, compareB]}
          planDetails={[detailA, detailB]}
          onClose={() => setShowCompare(false)}
        />
      )}

      <div className="p-4 pb-24 max-w-lg mx-auto space-y-6">
        {/* Compare bar */}
        {compareIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 rounded-xl border border-purple-500/30 bg-purple-500/10"
          >
            <GitCompare className="h-4 w-4 text-purple-400 shrink-0" aria-hidden />
            <span className="text-sm text-foreground flex-1">
              {compareIds.length === 1
                ? "Select one more plan to compare"
                : "2 plans selected for comparison"}
            </span>
            {compareIds.length === 2 && (
              <Button
                size="sm"
                className="h-7 text-xs bg-purple-600 hover:bg-purple-500 text-white"
                onClick={() => setShowCompare(true)}
              >
                Compare
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground"
              onClick={() => setCompareIds([])}
              aria-label="Clear comparison selection"
            >
              <X className="h-3 w-3" aria-hidden />
            </Button>
          </motion.div>
        )}

        {/* Empty state */}
        {plans.length === 0 && (
          <div className="text-center py-12 space-y-3">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center">
              <TrendingUp className="h-8 w-8 text-purple-400" aria-hidden />
            </div>
            <h3 className="font-semibold text-foreground">No plans yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Generate your first 7-day elevation plan to start tracking your progress.
            </p>
            <Link href="/elevation-plan">
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white">
                Create elevation plan
              </Button>
            </Link>
          </div>
        )}

        {/* Active plans */}
        {activePlans.length > 0 && (
          <section aria-label="Active plans">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Active
            </h2>
            <div className="space-y-3">
              {activePlans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  compareSelected={compareIds.includes(plan.id)}
                  onSelectCompare={toggleCompare}
                  onReactivate={handleReactivate}
                  onArchive={handleArchive}
                  isReactivating={isReactivating}
                  isArchiving={isArchiving}
                />
              ))}
            </div>
          </section>
        )}

        {/* Draft plans */}
        {draftPlans.length > 0 && (
          <section aria-label="Draft plans">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Drafts
            </h2>
            <div className="space-y-3">
              {draftPlans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  compareSelected={compareIds.includes(plan.id)}
                  onSelectCompare={toggleCompare}
                  onReactivate={handleReactivate}
                  onArchive={handleArchive}
                  isReactivating={isReactivating}
                  isArchiving={isArchiving}
                />
              ))}
            </div>
          </section>
        )}

        {/* Archived plans */}
        {archivedPlans.length > 0 && (
          <section aria-label="Archived plans">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Past plans
            </h2>
            <div className="space-y-3">
              {archivedPlans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  compareSelected={compareIds.includes(plan.id)}
                  onSelectCompare={toggleCompare}
                  onReactivate={handleReactivate}
                  onArchive={handleArchive}
                  isReactivating={isReactivating}
                  isArchiving={isArchiving}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
