import { useState } from "react";
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
} from "lucide-react";
import { useElevationPlan, type ElevationPlanActionItem, type ElevationPlanDayItem, type ElevationPlanFull } from "@/hooks/use-elevation-plan";
import { getGuestElevationPlanFull, getGuestDraftPlanForDay } from "@/lib/elevation-plan-storage";
import { useAuth } from "@/hooks/use-auth";
import { isFeatureEnabled } from "@/config/featureFlags";

// Helper: cast GuestElevationPlanFull (structurally compatible) to ElevationPlanFull
function asElevationPlanFull(v: ReturnType<typeof getGuestElevationPlanFull>): ElevationPlanFull | null {
  return v as ElevationPlanFull | null;
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
  const { user } = useAuth();
  const isLoggedIn = Boolean(user);
  const enabled = isFeatureEnabled("ELEVATION_PLAN");
  const { activePlan, isLoadingActive, generateDraft, isGenerating, updatePlan, toggleAction, updateAction } =
    useElevationPlan();

  // Also check for any draft plan in localStorage (guest) or via query param
  const today = new Date().toISOString().slice(0, 10);
  const guestDraftMeta = !isLoggedIn ? getGuestDraftPlanForDay(today) : null;

  // We need a planId to load – either from activePlan or from URL param
  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const planIdParam = searchParams.get("id");

  // Determine which plan to show
  const [localDraft, setLocalDraft] = useState<ElevationPlanFull | null>(
    planIdParam && !isLoggedIn ? asElevationPlanFull(getGuestElevationPlanFull(planIdParam)) : null
  );

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

  const planData: ElevationPlanFull | null =
    isLoggedIn
      ? (remotePlan ?? activePlan)
      : (localDraft ?? (guestDraftMeta ? asElevationPlanFull(getGuestElevationPlanFull(guestDraftMeta.id)) : null));

  const isLoading = isLoadingActive || isLoadingRemote;
  const [activeDay, setActiveDay] = useState("1");

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
      await toggleAction({ id, isCompleted: completed, planId: planData?.plan?.id });
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
        <div className="p-4 pb-24 max-w-lg mx-auto space-y-6">
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
      </div>
    </div>
  );
}
