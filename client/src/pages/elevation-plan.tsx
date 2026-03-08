import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import {
  Sparkles,
  CheckCircle2,
  Circle,
  Pencil,
  Check,
  X,
  Zap,
  Brain,
  Apple,
  Calendar,
  BookOpen,
  PlayCircle,
  Loader2,
  ClipboardList,
  History,
  TrendingUp,
} from "lucide-react";
import { useElevationPlan, type ElevationPlanActionItem, type ElevationPlanDayItem, type ElevationPlanFull, type ElevationPlanItem } from "@/hooks/use-elevation-plan";
import { getGuestElevationPlanFull, getGuestDraftPlanForDay, getGuestElevationPlans } from "@/lib/elevation-plan-storage";
import { useAuth } from "@/hooks/use-auth";
import { isFeatureEnabled } from "@/config/featureFlags";
import { isPlanReviewDue } from "@/hooks/use-weekly-review";

// Helper: cast GuestElevationPlanFull (structurally compatible) to ElevationPlanFull
function asElevationPlanFull(v: ReturnType<typeof getGuestElevationPlanFull>): ElevationPlanFull | null {
  return v as ElevationPlanFull | null;
}

// ── History card ──────────────────────────────────────────────────────────────

function PlanHistoryCard({ plan, onReview }: { plan: ElevationPlanItem; onReview: (id: string) => void }) {
  const isArchived = plan.status === "archived";
  return (
    <Card className="card-modern">
      <CardContent className="p-3 flex items-start gap-3">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
          isArchived ? "bg-muted/50" : "bg-purple-500/20"
        }`}>
          <TrendingUp className={`h-3.5 w-3.5 ${isArchived ? "text-muted-foreground" : "text-purple-400"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{plan.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {plan.startDate} → {plan.endDate}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge
            variant="outline"
            className="text-xs"
          >
            {plan.status}
          </Badge>
          {isArchived && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs px-2"
              onClick={() => onReview(plan.id)}
            >
              Review
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const ACTION_TYPE_ICONS: Record<string, typeof Zap> = {
  habit: Zap,
  workout: PlayCircle,
  nutrition: Apple,
  reflection: BookOpen,
  schedule: Calendar,
};

const ACTION_TYPE_LABELS: Record<string, string> = {
  habit: "Habit",
  workout: "Workout",
  nutrition: "Nutrition",
  reflection: "Reflection",
  schedule: "Schedule",
};

function ActionCard({
  action,
  onToggle,
  onUpdate,
}: {
  action: ElevationPlanActionItem;
  onToggle: (id: string, completed: boolean) => void;
  onUpdate: (id: string, title: string, description: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(action.title);
  const [editDesc, setEditDesc] = useState(action.description);

  const Icon = ACTION_TYPE_ICONS[action.actionType] ?? Zap;

  const handleSave = () => {
    onUpdate(action.id, editTitle, editDesc);
    setEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(action.title);
    setEditDesc(action.description);
    setEditing(false);
  };

  return (
    <Card className={`card-modern transition-opacity ${action.isCompleted ? "opacity-60" : ""}`}>
      <CardContent className="p-3">
        {editing ? (
          <div className="space-y-2">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="text-sm font-medium"
            />
            <Textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="text-sm resize-none"
              rows={2}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} className="h-7 text-xs">
                <Check className="h-3 w-3 mr-1" />
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancel} className="h-7 text-xs">
                <X className="h-3 w-3 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <button
              onClick={() => onToggle(action.id, !action.isCompleted)}
              className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={action.isCompleted ? "Mark incomplete" : "Mark complete"}
            >
              {action.isCompleted ? (
                <CheckCircle2 className="h-4 w-4 text-green-400" />
              ) : (
                <Circle className="h-4 w-4" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground">{ACTION_TYPE_LABELS[action.actionType] ?? action.actionType}</span>
                {action.timeOfDay && (
                  <Badge variant="outline" className="text-xs h-4 px-1 border-border text-muted-foreground">
                    {action.timeOfDay}
                  </Badge>
                )}
                {action.durationMinutes && (
                  <Badge variant="outline" className="text-xs h-4 px-1 border-border text-muted-foreground">
                    {action.durationMinutes}m
                  </Badge>
                )}
              </div>
              <p className={`text-sm font-medium ${action.isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
                {action.title}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{action.description}</p>
            </div>
            <button
              onClick={() => setEditing(true)}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Edit action"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DayTab({
  day,
  onToggle,
  onUpdate,
}: {
  day: ElevationPlanDayItem;
  onToggle: (id: string, completed: boolean) => void;
  onUpdate: (id: string, title: string, description: string) => void;
}) {
  const completed = day.actions.filter((a) => a.isCompleted).length;
  const total = day.actions.length;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="font-semibold text-foreground">{day.theme}</h3>
        <p className="text-sm text-muted-foreground italic">{day.intention}</p>
        {total > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all"
                style={{ width: `${(completed / total) * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{completed}/{total}</span>
          </div>
        )}
      </div>
      <div className="space-y-2">
        {day.actions.map((action) => (
          <ActionCard key={action.id} action={action} onToggle={onToggle} onUpdate={onUpdate} />
        ))}
      </div>
    </div>
  );
}

export default function ElevationPlanPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const isLoggedIn = Boolean(user);
  const enabled = isFeatureEnabled("ELEVATION_PLAN");
  const weeklyReviewEnabled = isFeatureEnabled("WEEKLY_REVIEW");
  const { activePlan, isLoadingActive, generateDraft, isGenerating, updatePlan, toggleAction, updateAction } =
    useElevationPlan();

  // Also check for any draft plan in localStorage (guest) or via query param
  const today = new Date().toISOString().slice(0, 10);
  const guestDraftMeta = !isLoggedIn ? getGuestDraftPlanForDay(today) : null;

  // We need a planId to load – either from activePlan or from URL param
  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const planIdParam = searchParams.get("id");
  const tabParam = searchParams.get("tab");

  // Determine which plan to show
  const [localDraft, setLocalDraft] = useState<ElevationPlanFull | null>(
    planIdParam && !isLoggedIn ? asElevationPlanFull(getGuestElevationPlanFull(planIdParam)) : null
  );

  // Top-level tab: "plan" | "history"
  const [mainTab, setMainTab] = useState<string>(tabParam === "history" ? "history" : "plan");

  // Auth plan from API
  const { data: remotePlan, isLoading: isLoadingRemote } = useQuery<ElevationPlanFull | null>({
    queryKey: [planIdParam ? `/api/elevation-plans/${planIdParam}` : "/api/elevation-plans/active"],
    enabled: isLoggedIn && enabled,
    queryFn: async () => {
      const url = planIdParam
        ? `/api/elevation-plans/${planIdParam}`
        : "/api/elevation-plans/active";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) return null;
      return res.json() as Promise<ElevationPlanFull | null>;
    },
  });

  // Fetch plan history (auth users)
  const { data: planHistory = [] } = useQuery<ElevationPlanItem[]>({
    queryKey: ["/api/elevation-plans"],
    enabled: isLoggedIn && enabled,
    queryFn: async () => {
      const res = await fetch("/api/elevation-plans", { credentials: "include" });
      if (!res.ok) return [];
      return res.json() as Promise<ElevationPlanItem[]>;
    },
  });

  // Guest plan history from localStorage
  const guestPlanHistory: ElevationPlanItem[] = !isLoggedIn
    ? (getGuestElevationPlans() as unknown as ElevationPlanItem[])
    : [];

  const allPlans = isLoggedIn ? planHistory : guestPlanHistory;

  const planData: ElevationPlanFull | null =
    isLoggedIn
      ? (remotePlan ?? activePlan)
      : (localDraft ?? (guestDraftMeta ? asElevationPlanFull(getGuestElevationPlanFull(guestDraftMeta.id)) : null));

  const isLoading = isLoadingActive || isLoadingRemote;
  const [activeDay, setActiveDay] = useState("1");

  // Check if active plan needs a weekly review
  const planNeedsReview = weeklyReviewEnabled && planData?.plan && planData.plan.status === "active" && isPlanReviewDue(planData.plan.endDate);

  const handleActivate = async () => {
    if (!planData?.plan) return;
    try {
      await updatePlan({ id: planData.plan.id, status: "active" });
      // For guests, refresh local state to reflect the new active status
      if (!isLoggedIn) {
        setLocalDraft(asElevationPlanFull(getGuestElevationPlanFull(planData.plan.id)));
      }
    } catch (err) {
      console.error("Failed to activate plan:", err);
    }
  };

  const handleToggle = async (id: string, completed: boolean) => {
    try {
      // Find the action in planData to pass actionType/title for guest learning
      const action = planData?.days
        ?.flatMap((d) => d.actions)
        ?.find((a) => a.id === id);
      await toggleAction({
        id,
        isCompleted: completed,
        planId: planData?.plan?.id,
        actionType: action?.actionType,
        title: action?.title,
      });
      // For guests, refresh local state
      if (!isLoggedIn && planData?.plan) {
        setLocalDraft(asElevationPlanFull(getGuestElevationPlanFull(planData.plan.id)));
      }
    } catch (err) {
      console.error("Failed to toggle action:", err);
    }
  };

  const handleUpdateAction = async (id: string, title: string, description: string) => {
    try {
      await updateAction({ id, title, description, planId: planData?.plan?.id });
      if (!isLoggedIn && planData?.plan) {
        setLocalDraft(asElevationPlanFull(getGuestElevationPlanFull(planData.plan.id)));
      }
    } catch (err) {
      console.error("Failed to update action:", err);
    }
  };

  if (!enabled) {
    return (
      <div className="bg-background">
        <PageHeader title="Elevation Plan" />
        <div className="p-4 max-w-lg mx-auto text-center">
          <p className="text-muted-foreground">This feature is not yet enabled.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-background">
        <PageHeader title="Elevation Plan" />
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // No plan found – offer to generate one
  if (!planData) {
    return (
      <div className="bg-background">
        <PageHeader title="Elevation Plan" />
        <div className="p-4 pb-24 max-w-lg mx-auto space-y-4">
          <Tabs value={mainTab} onValueChange={setMainTab}>
            <TabsList className="grid grid-cols-2 h-9 w-full">
              <TabsTrigger value="plan" className="text-xs flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3" />
                Plan
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs flex items-center gap-1.5">
                <History className="h-3 w-3" />
                History
              </TabsTrigger>
            </TabsList>
            <TabsContent value="plan" className="mt-4 space-y-6">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4 pt-8">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-purple-400" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Your Elevation Plan</h2>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  A personalized 7-day plan to lift your wellness across the dimensions that matter most.
                  Generate one after talking with DW about what you'd like to elevate.
                </p>
              </motion.div>
              <Button
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white"
                disabled={isGenerating}
                onClick={async () => {
                  try {
                    const result = await generateDraft({});
                    if (!isLoggedIn) setLocalDraft(result as ElevationPlanFull);
                  } catch {}
                }}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating your plan…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate 7-Day Elevation Plan
                  </>
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                You can review and edit the plan before activating it.
              </p>
            </TabsContent>
            <TabsContent value="history" className="mt-4 space-y-3">
              {allPlans.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <History className="h-8 w-8 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">No plan history yet.</p>
                  <p className="text-xs text-muted-foreground">Completed plans will appear here.</p>
                </div>
              ) : (
                allPlans.map((p) => (
                  <PlanHistoryCard
                    key={p.id}
                    plan={p}
                    onReview={(id) => navigate(`/weekly-review?id=${id}`)}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

  const { plan, days } = planData;
  const isDraft = plan.status === "draft";

  return (
    <div className="bg-background">
      <PageHeader title="Elevation Plan" />
      <div className="p-4 pb-24 max-w-lg mx-auto space-y-4">

        {/* Main tab: Plan / History */}
        <Tabs value={mainTab} onValueChange={setMainTab}>
          <TabsList className="grid grid-cols-2 h-9 w-full">
            <TabsTrigger value="plan" className="text-xs flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3" />
              Plan
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs flex items-center gap-1.5">
              <History className="h-3 w-3" />
              History
            </TabsTrigger>
          </TabsList>

          {/* ── Plan tab ─────────────────────────────────────────────────── */}
          <TabsContent value="plan" className="mt-4 space-y-4">

            {/* Weekly review banner */}
            {planNeedsReview && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="card-modern bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/25">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                      <ClipboardList className="h-3.5 w-3.5 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">Your plan week is done!</p>
                      <p className="text-xs text-muted-foreground">Take 2 min to review your week.</p>
                    </div>
                    <Button
                      size="sm"
                      className="shrink-0 bg-amber-500/80 hover:bg-amber-500 text-white text-xs h-7 px-3"
                      onClick={() => navigate(`/weekly-review?id=${plan.id}`)}
                    >
                      Review
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Plan header */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="card-modern bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/20">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h2 className="font-semibold text-foreground">{plan.title}</h2>
                      {plan.goal && <p className="text-sm text-muted-foreground mt-0.5">{plan.goal}</p>}
                    </div>
                    <Badge
                      variant="outline"
                      className={`shrink-0 ${
                        plan.status === "active"
                          ? "border-green-500/50 text-green-400 bg-green-500/10"
                          : "border-yellow-500/50 text-yellow-400 bg-yellow-500/10"
                      }`}
                    >
                      {plan.status === "active" ? "Active" : "Draft"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {plan.focusDimension && (
                      <span className="capitalize flex items-center gap-1">
                        <Brain className="h-3 w-3" />
                        {plan.focusDimension}
                      </span>
                    )}
                    <span>
                      {plan.startDate} → {plan.endDate}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Activate CTA for drafts */}
            {isDraft && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                <Button
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white"
                  onClick={handleActivate}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Activate Plan
                </Button>
              </motion.div>
            )}

            {/* 7-day tabs */}
            {days && days.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <Tabs value={activeDay} onValueChange={setActiveDay}>
                  <TabsList className="grid grid-cols-7 h-9 w-full">
                    {days.map((day: ElevationPlanDayItem) => {
                      const allDone = day.actions.length > 0 && day.actions.every((a) => a.isCompleted);
                      return (
                        <TabsTrigger key={day.dayIndex} value={String(day.dayIndex)} className="text-xs px-1">
                          {allDone ? <CheckCircle2 className="h-3 w-3 text-green-400" /> : `D${day.dayIndex}`}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                  {days.map((day: ElevationPlanDayItem) => (
                    <TabsContent key={day.dayIndex} value={String(day.dayIndex)} className="mt-4">
                      <DayTab day={day} onToggle={handleToggle} onUpdate={handleUpdateAction} />
                    </TabsContent>
                  ))}
                </Tabs>
              </motion.div>
            )}
          </TabsContent>

          {/* ── History tab ──────────────────────────────────────────────── */}
          <TabsContent value="history" className="mt-4 space-y-3">
            {allPlans.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <History className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">No plan history yet.</p>
                <p className="text-xs text-muted-foreground">Completed plans will appear here.</p>
              </div>
            ) : (
              allPlans.map((p) => (
                <PlanHistoryCard
                  key={p.id}
                  plan={p}
                  onReview={(id) => navigate(`/weekly-review?id=${id}`)}
                />
              ))
            )}
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}
