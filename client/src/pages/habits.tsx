import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import {
  CheckSquare, Plus, CheckCircle2, Circle, Trash2, ChevronDown, ChevronUp,
  Dumbbell, Brain, Heart, Wallet, Sparkles, Users, Leaf, Briefcase, Compass,
  Flame, Bell, BellOff, X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePageMeta } from "@/hooks/use-page-meta";

const DIMENSIONS = [
  { value: "physical",     label: "Physical",     icon: Dumbbell,  color: "text-blue-600 dark:text-blue-400" },
  { value: "mental",       label: "Mental",       icon: Brain,     color: "text-violet-600 dark:text-violet-400" },
  { value: "emotional",    label: "Emotional",    icon: Heart,     color: "text-rose-600 dark:text-rose-400" },
  { value: "financial",    label: "Financial",    icon: Wallet,    color: "text-emerald-600 dark:text-emerald-400" },
  { value: "spiritual",    label: "Spiritual",    icon: Sparkles,  color: "text-purple-600 dark:text-purple-400" },
  { value: "social",       label: "Social",       icon: Users,     color: "text-amber-600 dark:text-amber-400" },
  { value: "environmental",label: "Environmental",icon: Leaf,      color: "text-teal-600 dark:text-teal-400" },
  { value: "occupational", label: "Occupational", icon: Briefcase, color: "text-orange-600 dark:text-orange-400" },
  { value: "purpose",      label: "Purpose",      icon: Compass,   color: "text-indigo-600 dark:text-indigo-400" },
];

const FREQUENCY_OPTIONS = [
  { value: "daily",     label: "Every day" },
  { value: "weekdays",  label: "Weekdays (Mon–Fri)" },
  { value: "3x_week",   label: "3× per week" },
  { value: "weekly",    label: "Once a week" },
];

function frequencyLabel(freq: string) {
  return FREQUENCY_OPTIONS.find(f => f.value === freq)?.label ?? freq;
}

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

function WeekDots({ streak, completedToday }: { streak: number; completedToday: boolean }) {
  return (
    <div className="flex gap-1 items-center" aria-label={`${streak} day streak`}>
      {DAYS.map((d, i) => {
        const daysSinceMonday = (new Date().getDay() + 6) % 7;
        const positionFromToday = daysSinceMonday - i;
        const isToday = positionFromToday === 0;
        const inStreak = completedToday
          ? positionFromToday >= 0 && positionFromToday < streak
          : positionFromToday > 0 && positionFromToday <= streak;
        const isCompleted = isToday ? completedToday : inStreak;
        return (
          <div
            key={i}
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-medium transition-all
              ${isToday && completedToday ? "bg-green-500 text-white" : ""}
              ${isToday && !completedToday ? "ring-2 ring-primary/50 bg-primary/10 text-primary" : ""}
              ${!isToday && isCompleted ? "bg-primary/70 text-primary-foreground" : ""}
              ${!isToday && !isCompleted ? "bg-muted text-muted-foreground" : ""}
            `}
          >
            {d}
          </div>
        );
      })}
    </div>
  );
}

export default function HabitsPage() {
  usePageMeta("Habits", "Track and build your daily habits for lasting wellness progress.");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterDimension, setFilterDimension] = useState("all");

  const [form, setForm] = useState({
    title: "",
    frequency: "daily",
    reminderTime: "",
    wellnessDimension: "",
  });

  const { data: habits = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/habits"] });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/habits", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      setShowForm(false);
      setForm({ title: "", frequency: "daily", reminderTime: "", wellnessDimension: "" });
      toast({ title: "Habit created" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PATCH", `/api/habits/${id}`, data).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/habits"] }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ habitId }: { habitId: string }) =>
      fetch(`/api/habits/${habitId}/toggle`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include" }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/habits"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/habits/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      toast({ title: "Habit removed" });
    },
  });

  const handleCreate = () => {
    if (!form.title.trim()) return;
    createMutation.mutate({
      title: form.title.trim(),
      frequency: form.frequency,
      reminderTime: form.reminderTime || undefined,
      wellnessDimension: form.wellnessDimension || undefined,
      isActive: true,
    });
  };

  const filteredHabits = filterDimension === "all"
    ? habits
    : habits.filter((h: any) => h.wellnessDimension === filterDimension);

  const activeHabits = filteredHabits.filter((h: any) => h.isActive !== false);
  const inactiveHabits = filteredHabits.filter((h: any) => h.isActive === false);

  const completedToday = activeHabits.filter((h: any) => h.completedToday).length;

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-background to-muted/20">
      <PageHeader
        title="My Habits"
        rightContent={
          <Button onClick={() => setShowForm(!showForm)} size="sm" data-testid="button-new-habit">
            <Plus className="h-4 w-4 mr-1" />
            New Habit
          </Button>
        }
      />

      <div className="flex-1 overflow-auto">
        <div className="container max-w-2xl mx-auto p-4 space-y-5 pb-24">

          {/* Create form */}
          {showForm && (
            <Card className="border-primary/30 shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">New Habit</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="habit-title">Habit name <span className="text-destructive">*</span></Label>
                  <Input
                    id="habit-title"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Drink 8 glasses of water, Read 20 pages"
                    data-testid="input-habit-title"
                    onKeyDown={e => e.key === "Enter" && handleCreate()}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="habit-frequency">How often?</Label>
                    <Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v }))}>
                      <SelectTrigger id="habit-frequency" data-testid="select-habit-frequency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FREQUENCY_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="habit-reminder">Reminder time</Label>
                    <Input
                      id="habit-reminder"
                      type="time"
                      value={form.reminderTime}
                      onChange={e => setForm(f => ({ ...f, reminderTime: e.target.value }))}
                      data-testid="input-habit-reminder"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="habit-dimension">Wellness area</Label>
                  <Select value={form.wellnessDimension} onValueChange={v => setForm(f => ({ ...f, wellnessDimension: v }))}>
                    <SelectTrigger id="habit-dimension" data-testid="select-habit-dimension">
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

                <div className="flex gap-2 pt-1">
                  <Button onClick={handleCreate} disabled={!form.title.trim() || createMutation.isPending} data-testid="button-save-habit">
                    {createMutation.isPending ? "Saving…" : "Save Habit"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Progress summary */}
          {activeHabits.length > 0 && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{completedToday} / {activeHabits.length} done today</p>
                  <p className="text-xs text-muted-foreground">
                    {completedToday === activeHabits.length
                      ? "All habits completed! 🎉"
                      : `${activeHabits.length - completedToday} remaining`}
                  </p>
                </div>
                <div className="w-14 h-14 rounded-full border-4 border-primary/20 flex items-center justify-center relative">
                  <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle cx="27" cy="27" r="22" fill="none" stroke="currentColor" strokeWidth="4" className="text-primary/20" />
                    <circle
                      cx="27" cy="27" r="22" fill="none" stroke="currentColor" strokeWidth="4"
                      className="text-primary transition-all"
                      strokeDasharray={`${activeHabits.length > 0 ? (completedToday / activeHabits.length) * 138.2 : 0} 138.2`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="text-xs font-bold text-primary relative z-10">
                    {activeHabits.length > 0 ? Math.round((completedToday / activeHabits.length) * 100) : 0}%
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dimension filter */}
          {habits.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              <Button variant={filterDimension === "all" ? "default" : "outline"} size="sm" onClick={() => setFilterDimension("all")} className="h-7 text-xs px-3">All</Button>
              {DIMENSIONS.filter(d => habits.some((h: any) => h.wellnessDimension === d.value)).map(d => {
                const Icon = d.icon;
                return (
                  <Button key={d.value} variant={filterDimension === d.value ? "default" : "outline"} size="sm" onClick={() => setFilterDimension(d.value)} className="h-7 text-xs px-2 gap-1">
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
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && habits.length === 0 && !showForm && (
            <Card>
              <CardContent className="text-center py-14">
                <CheckSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="font-semibold text-foreground mb-1">No habits yet</p>
                <p className="text-muted-foreground text-sm mb-4">Small consistent actions create lasting change.</p>
                <Button size="sm" onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Add your first habit
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Active Habits */}
          {activeHabits.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-0.5">Today's Habits</h3>
              {activeHabits.map((habit: any) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  expanded={expandedId === habit.id}
                  onToggleExpand={() => setExpandedId(expandedId === habit.id ? null : habit.id)}
                  onToggleComplete={() => toggleMutation.mutate({ habitId: habit.id })}
                  onDeactivate={() => updateMutation.mutate({ id: habit.id, data: { isActive: false } })}
                  onDelete={() => deleteMutation.mutate(habit.id)}
                  isPending={toggleMutation.isPending || updateMutation.isPending}
                />
              ))}
            </div>
          )}

          {/* Inactive Habits */}
          {inactiveHabits.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-0.5">Paused</h3>
              {inactiveHabits.map((habit: any) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  expanded={expandedId === habit.id}
                  onToggleExpand={() => setExpandedId(expandedId === habit.id ? null : habit.id)}
                  onToggleComplete={() => {}}
                  onDeactivate={() => updateMutation.mutate({ id: habit.id, data: { isActive: true } })}
                  onDelete={() => deleteMutation.mutate(habit.id)}
                  isPending={updateMutation.isPending}
                  paused
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface HabitCardProps {
  habit: any;
  expanded: boolean;
  paused?: boolean;
  isPending: boolean;
  onToggleExpand: () => void;
  onToggleComplete: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
}

function HabitCard({ habit, expanded, paused, isPending, onToggleExpand, onToggleComplete, onDeactivate, onDelete }: HabitCardProps) {
  const dim = DIMENSIONS.find(d => d.value === habit.wellnessDimension);
  const DimIcon = dim?.icon;
  const streak = habit.streak ?? 0;
  const completedToday = !!habit.completedToday;

  return (
    <Card className={`transition-all ${paused ? "opacity-60" : ""}`} data-testid={`card-habit-${habit.id}`}>
      <CardContent className="p-0">
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Check button */}
          {!paused && (
            <button
              onClick={onToggleComplete}
              disabled={isPending}
              className="shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
              aria-label={completedToday ? `Mark ${habit.title} incomplete` : `Complete ${habit.title}`}
              aria-pressed={completedToday}
              data-testid={`button-toggle-habit-${habit.id}`}
            >
              {completedToday ? (
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              ) : (
                <Circle className="h-6 w-6 text-muted-foreground/50 hover:text-primary transition-colors" />
              )}
            </button>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className={`font-medium text-sm leading-snug ${completedToday ? "line-through text-muted-foreground" : ""}`}>
              {habit.title}
            </p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {dim && DimIcon && (
                <span className={`flex items-center gap-0.5 text-[10px] font-medium ${dim.color}`}>
                  <DimIcon className="h-3 w-3" />
                  {dim.label}
                </span>
              )}
              <span className="text-[10px] text-muted-foreground">{frequencyLabel(habit.frequency ?? "daily")}</span>
              {habit.reminderTime && (
                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <Bell className="h-2.5 w-2.5" />
                  {habit.reminderTime}
                </span>
              )}
            </div>
          </div>

          {/* Streak badge */}
          {streak > 0 && (
            <div className="flex items-center gap-0.5 shrink-0">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-bold text-orange-500">{streak}</span>
            </div>
          )}

          {/* Expand */}
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onToggleExpand}>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {/* 7-day dots */}
        {!paused && (
          <div className="px-4 pb-2.5">
            <WeekDots streak={streak} completedToday={completedToday} />
          </div>
        )}

        {/* Expanded */}
        {expanded && (
          <div className="px-4 pb-3 border-t pt-3 space-y-3">
            {habit.description && (
              <p className="text-sm text-muted-foreground">{habit.description}</p>
            )}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={onDeactivate}
                data-testid={`button-${paused ? "activate" : "pause"}-habit-${habit.id}`}
              >
                {paused ? (
                  <><CheckCircle2 className="h-3.5 w-3.5" /> Resume</>
                ) : (
                  <><BellOff className="h-3.5 w-3.5" /> Pause</>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1.5 text-destructive/70 hover:text-destructive"
                onClick={onDelete}
                data-testid={`button-delete-habit-${habit.id}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
