import { useState } from "react";
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import {
  Target, Plus, CheckCircle2, Repeat, Trash2, ChevronDown, ChevronUp,
  Dumbbell, Brain, Heart, Wallet, Sparkles, Users, Leaf, Briefcase,
  Compass, Edit2, TrendingUp, X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePageMeta } from "@/hooks/use-page-meta";
import { DWContextPrompt } from "@/components/dw-context-prompt";

const DIMENSIONS = [
  { value: "physical",     label: "Physical",     icon: Dumbbell,  color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  { value: "mental",       label: "Mental",       icon: Brain,     color: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  { value: "emotional",    label: "Emotional",    icon: Heart,     color: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
  { value: "financial",    label: "Financial",    icon: Wallet,    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  { value: "spiritual",    label: "Spiritual",    icon: Sparkles,  color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  { value: "social",       label: "Social",       icon: Users,     color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  { value: "environmental",label: "Environmental",icon: Leaf,      color: "bg-teal-500/10 text-teal-600 dark:text-teal-400" },
  { value: "occupational", label: "Occupational", icon: Briefcase, color: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  { value: "purpose",      label: "Purpose",      icon: Compass,   color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" },
];

function getDimension(value: string | null | undefined) {
  return DIMENSIONS.find(d => d.value === value) ?? null;
}

export default function GoalsPage() {
  usePageMeta("Goals", "Set and track your wellness goals across every dimension of your life.");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [habitDialogOpen, setHabitDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<any>(null);
  const [filterDimension, setFilterDimension] = useState<string>("all");

  const [form, setForm] = useState({
    title: "",
    description: "",
    wellnessDimension: "",
    targetDate: "",
    explainWhy: "",
    targetValue: 100,
  });

  const { data: goals = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/goals"] });
  const { data: habits = [] } = useQuery<any[]>({ queryKey: ["/api/habits"] });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/goals", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      setShowForm(false);
      resetForm();
      toast({ title: "Goal created" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PATCH", `/api/goals/${id}`, data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      setEditingId(null);
      toast({ title: "Goal updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/goals/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      toast({ title: "Goal removed" });
    },
  });

  const createHabitMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/habits", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      setHabitDialogOpen(false);
      setSelectedGoal(null);
      toast({ title: "Supporting habit created" });
    },
  });

  const resetForm = () => setForm({ title: "", description: "", wellnessDimension: "", targetDate: "", explainWhy: "", targetValue: 100 });

  const handleCreate = () => {
    if (!form.title.trim()) return;
    createMutation.mutate({
      title: form.title,
      description: form.description
        ? `${form.description}${form.targetDate ? ` | Target date: ${form.targetDate}` : ""}`
        : form.targetDate ? `Target date: ${form.targetDate}` : undefined,
      wellnessDimension: form.wellnessDimension || undefined,
      explainWhy: form.explainWhy || undefined,
      targetValue: form.targetValue,
      progress: 0,
      status: "active",
      isActive: true,
    });
  };

  const handleProgressUpdate = (goal: any, newProgress: number) => {
    updateMutation.mutate({
      id: goal.id,
      data: {
        progress: newProgress,
        isActive: newProgress < 100,
      },
    });
  };

  const handleMarkComplete = (goal: any) => {
    updateMutation.mutate({ id: goal.id, data: { progress: 100, isActive: false, status: "completed" } });
    toast({ title: "Goal completed! 🎉" });
  };

  const filteredGoals = filterDimension === "all"
    ? goals
    : goals.filter((g: any) => g.wellnessDimension === filterDimension);

  const activeGoals = filteredGoals.filter((g: any) => g.isActive !== false && (g.progress ?? 0) < 100);
  const completedGoals = filteredGoals.filter((g: any) => g.isActive === false || (g.progress ?? 0) >= 100);

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-background to-muted/20">
      <PageHeader
        title="My Goals"
        rightContent={
          <Button onClick={() => { setShowForm(!showForm); resetForm(); }} size="sm" data-testid="button-new-goal">
            <Plus className="h-4 w-4 mr-1" />
            New Goal
          </Button>
        }
      />

      <div className="flex-1 overflow-auto">
        <div className="container max-w-2xl mx-auto p-4 space-y-5 pb-24">

          <DWContextPrompt
            topic="Help me set a meaningful goal right now"
            placeholder="Help me set a meaningful goal — or review the ones I have"
            context="page:goals"
          />

          {/* Create Form */}
          {showForm && (
            <Card className="border-primary/30 shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">New Goal</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => { setShowForm(false); resetForm(); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="goal-title">What's your goal? <span className="text-destructive">*</span></Label>
                  <Input
                    id="goal-title"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Run a 5K, Save $5,000, Meditate daily"
                    data-testid="input-goal-title"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="goal-dimension">Wellness Dimension</Label>
                  <Select value={form.wellnessDimension} onValueChange={v => setForm(f => ({ ...f, wellnessDimension: v }))}>
                    <SelectTrigger id="goal-dimension" data-testid="select-goal-dimension">
                      <SelectValue placeholder="Choose dimension…" />
                    </SelectTrigger>
                    <SelectContent>
                      {DIMENSIONS.map(d => {
                        const Icon = d.icon;
                        return (
                          <SelectItem key={d.value} value={d.value}>
                            <span className="flex items-center gap-2">
                              <Icon className="h-3.5 w-3.5" />
                              {d.label}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="goal-why">Why does this matter to you?</Label>
                  <Textarea
                    id="goal-why"
                    value={form.explainWhy}
                    onChange={e => setForm(f => ({ ...f, explainWhy: e.target.value }))}
                    placeholder="Your deep reason — this keeps you going when it's hard"
                    rows={2}
                    data-testid="input-goal-why"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="goal-target-date">Target Date</Label>
                  <Input
                    id="goal-target-date"
                    type="date"
                    value={form.targetDate}
                    onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))}
                    data-testid="input-goal-target-date"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="goal-description">Notes (optional)</Label>
                  <Textarea
                    id="goal-description"
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="What does success look like? Any specific milestones?"
                    rows={2}
                    data-testid="input-goal-description"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <Button onClick={handleCreate} disabled={!form.title.trim() || createMutation.isPending} data-testid="button-save-goal">
                    {createMutation.isPending ? "Saving…" : "Save Goal"}
                  </Button>
                  <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dimension filter */}
          {goals.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              <Button
                variant={filterDimension === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterDimension("all")}
                className="h-7 text-xs px-3"
              >
                All
              </Button>
              {DIMENSIONS.filter(d => goals.some((g: any) => g.wellnessDimension === d.value)).map(d => {
                const Icon = d.icon;
                return (
                  <Button
                    key={d.value}
                    variant={filterDimension === d.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterDimension(d.value)}
                    className="h-7 text-xs px-2 gap-1"
                  >
                    <Icon className="h-3 w-3" />
                    {d.label}
                  </Button>
                );
              })}
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && goals.length === 0 && !showForm && (
            <Card>
              <CardContent className="text-center py-14">
                <Target className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="font-semibold text-foreground mb-1">No goals yet</p>
                <p className="text-muted-foreground text-sm mb-4">Every great journey starts with a single intention.</p>
                <Button size="sm" onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Set your first goal
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Active Goals */}
          {activeGoals.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-0.5">Active Goals</h3>
              {activeGoals.map((goal: any) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  expanded={expandedId === goal.id}
                  editing={editingId === goal.id}
                  linkedHabits={(habits as any[]).filter(h => h.description?.includes(`Supports goal: ${goal.title}`))}
                  onToggleExpand={() => setExpandedId(expandedId === goal.id ? null : goal.id)}
                  onEdit={() => setEditingId(editingId === goal.id ? null : goal.id)}
                  onProgressUpdate={p => handleProgressUpdate(goal, p)}
                  onMarkComplete={() => handleMarkComplete(goal)}
                  onDelete={() => deleteMutation.mutate(goal.id)}
                  onCreateHabit={() => { setSelectedGoal(goal); setHabitDialogOpen(true); }}
                  onSaveEdit={(data: any) => updateMutation.mutate({ id: goal.id, data })}
                  isPending={updateMutation.isPending || deleteMutation.isPending}
                />
              ))}
            </div>
          )}

          {/* Completed Goals */}
          {completedGoals.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-0.5">Completed</h3>
              {completedGoals.map((goal: any) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  expanded={expandedId === goal.id}
                  editing={false}
                  onToggleExpand={() => setExpandedId(expandedId === goal.id ? null : goal.id)}
                  onEdit={() => {}}
                  onProgressUpdate={() => {}}
                  onMarkComplete={() => {}}
                  onDelete={() => deleteMutation.mutate(goal.id)}
                  onCreateHabit={() => {}}
                  onSaveEdit={() => {}}
                  isPending={deleteMutation.isPending}
                  completed
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateHabitDialog
        open={habitDialogOpen}
        onOpenChange={setHabitDialogOpen}
        goal={selectedGoal}
        onCreateHabit={data => createHabitMutation.mutate(data)}
        isPending={createHabitMutation.isPending}
      />
    </div>
  );
}

interface GoalCardProps {
  goal: any;
  expanded: boolean;
  editing: boolean;
  completed?: boolean;
  isPending: boolean;
  linkedHabits?: any[];
  onToggleExpand: () => void;
  onEdit: () => void;
  onProgressUpdate: (p: number) => void;
  onMarkComplete: () => void;
  onDelete: () => void;
  onCreateHabit: () => void;
  onSaveEdit: (data: any) => void;
}

function GoalCard({ goal, expanded, editing, completed, isPending, linkedHabits = [], onToggleExpand, onEdit, onProgressUpdate, onMarkComplete, onDelete, onCreateHabit, onSaveEdit }: GoalCardProps) {
  const dim = getDimension(goal.wellnessDimension);
  const DimIcon = dim?.icon ?? Target;
  const progress = goal.progress ?? 0;
  const [editTitle, setEditTitle] = useState(goal.title);
  const [editDesc, setEditDesc] = useState(goal.description ?? "");
  const [editWhy, setEditWhy] = useState(goal.explainWhy ?? "");
  const [progressDraft, setProgressDraft] = useState(progress);

  const targetDate = (() => {
    const match = (goal.description ?? "").match(/Target date: (\d{4}-\d{2}-\d{2})/);
    if (!match) return null;
    return new Date(match[1] + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  })();

  const daysRemaining = (() => {
    const match = (goal.description ?? "").match(/Target date: (\d{4}-\d{2}-\d{2})/);
    if (!match) return null;
    const diff = new Date(match[1]).getTime() - Date.now();
    const days = Math.ceil(diff / 86400000);
    return days;
  })();

  return (
    <Card className={`transition-all ${completed ? "opacity-60" : ""}`} data-testid={`card-goal-${goal.id}`}>
      <CardContent className="p-4">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${dim?.color ?? "bg-primary/10 text-primary"}`}>
            <DimIcon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className={`font-semibold text-sm leading-snug ${completed ? "line-through text-muted-foreground" : ""}`}>
                {goal.title}
              </p>
              {completed && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
            </div>
            {dim && (
              <Badge variant="outline" className={`mt-1 text-[10px] h-5 ${dim.color}`}>
                {dim.label}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!completed && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit} data-testid={`button-edit-goal-${goal.id}`}>
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive" onClick={onDelete} data-testid={`button-delete-goal-${goal.id}`}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleExpand}>
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        {/* Progress bar always visible */}
        {!completed && (
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Progress</span>
              <span className="font-medium text-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            {targetDate && (
              <p className="text-[10px] text-muted-foreground">
                Due {targetDate}
                {daysRemaining !== null && daysRemaining >= 0 && ` · ${daysRemaining}d remaining`}
                {daysRemaining !== null && daysRemaining < 0 && ` · Overdue by ${Math.abs(daysRemaining)}d`}
              </p>
            )}
          </div>
        )}

        {/* Expanded section */}
        {expanded && (
          <div className="mt-4 pt-4 border-t space-y-4">
            {editing ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Goal title</Label>
                  <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Why it matters</Label>
                  <Textarea value={editWhy} onChange={e => setEditWhy(e.target.value)} rows={2} className="text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Progress: {progressDraft}%</Label>
                  <Slider
                    value={[progressDraft]}
                    onValueChange={([v]) => setProgressDraft(v)}
                    min={0} max={100} step={5}
                    className="w-full"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => onSaveEdit({ title: editTitle, explainWhy: editWhy, progress: progressDraft })} disabled={isPending}>
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={onEdit}>Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                {goal.explainWhy && (
                  <div className="bg-muted/40 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-0.5 font-medium">Why this matters</p>
                    <p className="text-sm">{goal.explainWhy}</p>
                  </div>
                )}
                {goal.description && !goal.description.startsWith("Target date:") && (
                  <p className="text-sm text-muted-foreground">{goal.description.replace(/ \| Target date:.*/, "")}</p>
                )}

                {/* DW Thread: linked habits */}
                {linkedHabits.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                      <Repeat className="h-3 w-3" />
                      Supporting Habits
                    </p>
                    {linkedHabits.map((h: any) => (
                      <div key={h.id} className="flex items-center gap-2 bg-muted/30 rounded-lg px-2 py-1.5">
                        <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                        <span className="text-xs">{h.title}</span>
                        {h.completedToday && <CheckCircle2 className="h-3 w-3 text-green-500 ml-auto shrink-0" />}
                      </div>
                    ))}
                  </div>
                )}

                {!completed && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Update progress</Label>
                    <div className="flex gap-1.5 flex-wrap">
                      {[25, 50, 75, 100].map(p => (
                        <Button
                          key={p}
                          variant={progress === p ? "default" : "outline"}
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => onProgressUpdate(p)}
                          disabled={isPending}
                        >
                          {p}%
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {!completed && (
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={onCreateHabit} data-testid={`button-create-habit-${goal.id}`}>
                      <Repeat className="h-3.5 w-3.5" />
                      {linkedHabits.length > 0 ? "Add Another Habit" : "Add Supporting Habit"}
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs text-green-600 border-green-500/30 hover:bg-green-500/10" onClick={onMarkComplete} disabled={isPending} data-testid={`button-complete-goal-${goal.id}`}>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Mark Complete
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface CreateHabitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: any;
  onCreateHabit: (data: any) => void;
  isPending: boolean;
}

function CreateHabitDialog({ open, onOpenChange, goal, onCreateHabit, isPending }: CreateHabitDialogProps) {
  const [title, setTitle] = useState("");
  const [frequency, setFrequency] = useState("daily");

  React.useEffect(() => {
    if (open && goal) {
      setTitle(`Daily action for: ${goal.title}`);
      setFrequency("daily");
    }
    if (!open) setTitle("");
  }, [goal, open]);

  const handleCreate = () => {
    if (!title.trim()) return;
    onCreateHabit({
      title,
      frequency,
      wellnessDimension: goal?.wellnessDimension,
      isActive: true,
      description: `Supports goal: ${goal?.title}`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Supporting Habit</DialogTitle>
          <DialogDescription>Build a daily habit to make progress toward: <strong>{goal?.title}</strong></DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Habit name</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Practice Spanish 15 min" data-testid="input-habit-from-goal" />
          </div>
          <div className="space-y-1.5">
            <Label>Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Every day</SelectItem>
                <SelectItem value="weekdays">Weekdays (Mon–Fri)</SelectItem>
                <SelectItem value="3x_week">3× per week</SelectItem>
                <SelectItem value="weekly">Once a week</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!title.trim() || isPending} data-testid="button-save-habit-from-goal">
              {isPending ? "Creating…" : "Create Habit"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
