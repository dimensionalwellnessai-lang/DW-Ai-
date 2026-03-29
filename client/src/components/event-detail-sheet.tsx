import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import {
  Check,
  Plus,
  Sparkles,
  ExternalLink,
  Clock,
  MapPin,
  Pencil,
  X,
  Loader2,
  RefreshCw,
  Tv,
  BookOpen,
  Navigation,
  Zap,
  Headphones,
  Palette,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { CalendarEventTask } from "@shared/schema";

// ── Keyword → app section mapping ────────────────────────────────────────────
const SECTION_MAP: { keywords: string[]; route: string; label: string; color: string }[] = [
  { keywords: ["meditation", "mindful", "spiritual", "breathe", "breath", "sit still", "silence", "prayer"], route: "/insights", label: "Insights", color: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  { keywords: ["workout", "exercise", "gym", "lift", "run", "jog", "cardio", "upper body", "lower body", "stretch", "yoga", "movement", "light workout"], route: "/workout", label: "Workout", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  { keywords: ["breakfast", "lunch", "dinner", "meal", "cook", "prep", "eat", "food", "nutrition", "snack"], route: "/browse", label: "Nutrition", color: "bg-green-500/10 text-green-600 dark:text-green-400" },
  { keywords: ["journal", "write", "reflect", "journaling"], route: "/talk?topic=journal", label: "Journal", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  { keywords: ["work", "commute", "meeting", "deep work", "focus", "office", "productive"], route: "/goals", label: "Goals", color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" },
  { keywords: ["habit", "routine", "morning", "wind down", "night"], route: "/habits", label: "Habits", color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" },
  { keywords: ["mood", "check-in", "checkin", "energy"], route: "/mood-tracker", label: "Mood", color: "bg-pink-500/10 text-pink-600 dark:text-pink-400" },
  { keywords: ["free", "relax", "unwind", "rest", "chill", "leisure", "downtime", "watch", "tv", "movie"], route: "/browse", label: "For You", color: "bg-teal-500/10 text-teal-600 dark:text-teal-400" },
  { keywords: ["talk", "chat", "dw", "ai"], route: "/talk", label: "Talk to DW", color: "bg-primary/10 text-primary" },
];

const FREE_TIME_KEYWORDS = ["free", "relax", "tv", "television", "chill", "leisure", "downtime", "unwind", "rest", "watch", "movie", "read", "hang", "game", "play", "scroll", "browse", "free time"];

function detectSection(title: string, tags?: string[]) {
  const haystack = [title, ...(tags ?? [])].join(" ").toLowerCase();
  for (const entry of SECTION_MAP) {
    if (entry.keywords.some((kw) => haystack.includes(kw))) return entry;
  }
  return null;
}

function isFreeTimeEvent(title: string) {
  if (!title?.trim()) return true;
  const lower = title.toLowerCase();
  return FREE_TIME_KEYWORDS.some((kw) => lower.includes(kw));
}

function fmtTime(d: Date) { return format(d, "h:mm a"); }

// ── Category config ──────────────────────────────────────────────────────────
const CATEGORY_CONFIG: Record<string, { icon: typeof Tv; color: string; bg: string }> = {
  Watch:   { icon: Tv,         color: "text-violet-500",  bg: "bg-violet-500/10" },
  Read:    { icon: BookOpen,   color: "text-blue-500",    bg: "bg-blue-500/10" },
  Go:      { icon: Navigation, color: "text-green-500",   bg: "bg-green-500/10" },
  Do:      { icon: Zap,        color: "text-orange-500",  bg: "bg-orange-500/10" },
  Listen:  { icon: Headphones, color: "text-pink-500",    bg: "bg-pink-500/10" },
  Create:  { icon: Palette,    color: "text-yellow-500",  bg: "bg-yellow-500/10" },
  Prepare: { icon: Check,      color: "text-teal-500",    bg: "bg-teal-500/10" },
  Track:   { icon: Zap,        color: "text-indigo-500",  bg: "bg-indigo-500/10" },
  Reflect: { icon: BookOpen,   color: "text-violet-400",  bg: "bg-violet-400/10" },
  Connect: { icon: Sparkles,   color: "text-pink-400",    bg: "bg-pink-400/10" },
};

type Suggestion = { title: string; category: string; why: string; linkedRoute: string | null };

// ── Task row ─────────────────────────────────────────────────────────────────
function TaskRow({ task, onToggle, onDelete }: { task: CalendarEventTask; onToggle: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-start gap-2 group py-1.5" data-testid={`task-row-${task.id}`}>
      <button
        type="button"
        onClick={onToggle}
        className={`mt-0.5 shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${task.isCompleted ? "bg-primary border-primary" : "border-muted-foreground/40 hover:border-primary"}`}
        aria-label={task.isCompleted ? "Mark incomplete" : "Mark complete"}
        data-testid={`checkbox-task-${task.id}`}
      >
        {task.isCompleted && <Check className="h-3 w-3 text-primary-foreground" />}
      </button>
      <div className="flex-1 min-w-0">
        <span className={`text-sm leading-snug ${task.isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
          {task.title}
        </span>
        {task.dwSuggested && !task.isCompleted && (
          <span className="ml-1.5 text-[10px] text-primary/60 font-medium">DW</span>
        )}
      </div>
      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {task.linkedRoute && (
          <a href={task.linkedRoute} className="p-1 text-muted-foreground/50 hover:text-primary transition-colors" title="Open in app" data-testid={`link-task-${task.id}`}>
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
        <button type="button" onClick={onDelete} className="p-1 text-muted-foreground/30 hover:text-destructive transition-colors" aria-label="Delete task" data-testid={`delete-task-${task.id}`}>
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ── Suggestion card (free time) ───────────────────────────────────────────────
function FreeTimeSuggestionCard({ s, onAccept, onDismiss, index }: { s: Suggestion; onAccept: () => void; onDismiss: () => void; index: number }) {
  const cfg = CATEGORY_CONFIG[s.category] ?? CATEGORY_CONFIG["Do"];
  const Icon = cfg.icon;
  return (
    <div className="rounded-xl border border-border/50 bg-card p-3 flex gap-3 items-start" data-testid={`suggestion-card-${index}`}>
      <div className={`shrink-0 h-8 w-8 rounded-lg flex items-center justify-center ${cfg.bg}`}>
        <Icon className={`h-4 w-4 ${cfg.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={`text-[10px] font-bold uppercase tracking-wide ${cfg.color}`}>{s.category}</span>
        </div>
        <p className="text-sm font-medium text-foreground leading-snug">{s.title}</p>
        {s.why && <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{s.why}</p>}
      </div>
      <div className="flex flex-col gap-1 shrink-0">
        <Button size="sm" variant="outline" className="h-7 w-7 p-0 border-primary/30 text-primary hover:bg-primary/10" onClick={onAccept} data-testid={`button-accept-suggestion-${index}`}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground/50" onClick={onDismiss} data-testid={`button-dismiss-suggestion-${index}`}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// ── Suggestion row (structured event) ────────────────────────────────────────
function TaskSuggestionRow({ s, onAccept, onDismiss, index }: { s: Suggestion; onAccept: () => void; onDismiss: () => void; index: number }) {
  return (
    <div className="flex items-start gap-2 py-1.5 group" data-testid={`suggestion-row-${index}`}>
      <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground leading-snug">{s.title}</p>
        {s.why && <p className="text-xs text-muted-foreground">{s.why}</p>}
      </div>
      <div className="flex gap-1 shrink-0">
        <Button size="sm" variant="outline" className="h-6 px-2 border-primary/30 text-primary hover:bg-primary/10" onClick={onAccept} data-testid={`button-accept-suggestion-${index}`}>
          <Plus className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground/40" onClick={onDismiss} data-testid={`button-dismiss-suggestion-${index}`}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export interface DisplayEventLike {
  id: string;
  title: string;
  description?: string | null;
  startTime: Date;
  endTime?: Date | null;
  dimensionTags?: string[];
  location?: string | null;
  source: "db" | "local";
}

interface EventDetailSheetProps {
  event: DisplayEventLike | null;
  onClose: () => void;
  onEdit: () => void;
}

export function EventDetailSheet({ event, onClose, onEdit }: EventDetailSheetProps) {
  const [, setLocation] = useLocation();
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [addMode, setAddMode] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isFreeTime, setIsFreeTime] = useState(false);
  const [hasLifestylePrefs, setHasLifestylePrefs] = useState(true);
  const [showPrefsForm, setShowPrefsForm] = useState(false);
  const [prefsForm, setPrefsForm] = useState({
    watchLikes: "",
    doLikes: "",
    musicLikes: "",
    readLikes: "",
    goLikes: "",
    styleLikes: "",
    identityVision: "",
  });
  const [savingPrefs, setSavingPrefs] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isOpen = !!event;
  const isDbEvent = event?.source === "db";
  const section = event ? detectSection(event.title, event.dimensionTags) : null;

  // Reset state when event changes
  useEffect(() => {
    setAddMode(false);
    setSuggestions([]);
    setNewTaskTitle("");
    setIsFreeTime(event ? isFreeTimeEvent(event.title) : false);
  }, [event?.id]);

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<CalendarEventTask[]>({
    queryKey: ["/api/calendar", event?.id, "tasks"],
    queryFn: () => fetch(`/api/calendar/${event!.id}/tasks`, { credentials: "include" }).then((r) => r.json()),
    enabled: isOpen && isDbEvent,
  });

  const addTaskMutation = useMutation({
    mutationFn: (task: { title: string; dwSuggested?: boolean; linkedRoute?: string | null }) =>
      apiRequest("POST", `/api/calendar/${event!.id}/tasks`, task),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar", event?.id, "tasks"] });
      setNewTaskTitle("");
    },
    onError: () => toast({ title: "Couldn't add task", variant: "destructive" }),
  });

  const toggleTaskMutation = useMutation({
    mutationFn: ({ id, isCompleted }: { id: string; isCompleted: boolean }) =>
      apiRequest("PATCH", `/api/calendar/tasks/${id}`, { isCompleted }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/calendar", event?.id, "tasks"] }),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/calendar/tasks/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/calendar", event?.id, "tasks"] }),
  });

  // Fetch DW suggestions — called automatically when Add is tapped (or manually refreshed)
  const fetchSuggestions = async () => {
    if (!event || !isDbEvent) return;
    setSuggestLoading(true);
    try {
      const res = await apiRequest("POST", `/api/calendar/${event.id}/suggest-tasks`, {
        title: event.title,
        description: event.description,
        startTime: event.startTime ? fmtTime(event.startTime) : null,
        endTime: event.endTime ? fmtTime(event.endTime) : null,
        dimensionTags: event.dimensionTags,
        location: event.location,
      });
      const data = await res.json();
      setSuggestions(data.suggestions ?? []);
      setIsFreeTime(data.isFreeTime ?? isFreeTimeEvent(event.title));
      setHasLifestylePrefs(!!data.hasLifestylePrefs);
    } catch {
      // silent — user can still type manually
    } finally {
      setSuggestLoading(false);
    }
  };

  // Save lifestyle preferences then refresh suggestions
  const saveLifestylePrefs = async () => {
    const hasAny = Object.values(prefsForm).some((v) => v.trim());
    if (!hasAny) return;
    setSavingPrefs(true);
    try {
      await apiRequest("POST", "/api/profile/lifestyle-preferences", prefsForm);
      setHasLifestylePrefs(true);
      setShowPrefsForm(false);
      await fetchSuggestions();
      toast({ title: "DW now knows your style", description: "Suggestions will be tailored to you." });
    } catch {
      toast({ title: "Couldn't save preferences", variant: "destructive" });
    } finally {
      setSavingPrefs(false);
    }
  };

  // When "Add" is tapped: open input AND auto-load suggestions
  const handleOpenAdd = () => {
    setAddMode(true);
    if (suggestions.length === 0) fetchSuggestions();
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const handleAddCustomTask = () => {
    if (!newTaskTitle.trim()) return;
    addTaskMutation.mutate({ title: newTaskTitle.trim(), dwSuggested: false, linkedRoute: section?.route ?? null });
  };

  const acceptSuggestion = (s: Suggestion) => {
    addTaskMutation.mutate({ title: s.title, dwSuggested: true, linkedRoute: s.linkedRoute });
    setSuggestions((prev) => prev.filter((x) => x.title !== s.title));
  };

  const acceptAll = () => {
    suggestions.forEach((s) => addTaskMutation.mutate({ title: s.title, dwSuggested: true, linkedRoute: s.linkedRoute }));
    setSuggestions([]);
  };

  if (!event) return null;

  const completedCount = tasks.filter((t) => t.isCompleted).length;
  const totalCount = tasks.length;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
        data-testid="event-sheet-backdrop"
      />

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-[61] bg-background rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out ${isOpen ? "translate-y-0" : "translate-y-full"}`}
        style={{ maxHeight: "90vh", display: "flex", flexDirection: "column" }}
        data-testid="event-detail-sheet"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 pb-10">

          {/* ── Header ── */}
          <div className="flex items-start justify-between gap-2 mb-3 pt-1">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-foreground leading-snug">{event.title || "Free Time"}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {fmtTime(event.startTime)}{event.endTime && ` – ${fmtTime(event.endTime)}`}
                </span>
                {event.location && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />{event.location}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button type="button" onClick={onEdit} className="p-2 rounded-full hover:bg-muted transition-colors" aria-label="Edit event" data-testid="button-edit-event">
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </button>
              <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors" aria-label="Close" data-testid="button-close-sheet">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* ── Section shortcut ── */}
          {section && (
            <button
              type="button"
              onClick={() => { if (section.route) setLocation(section.route); }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium mb-4 transition-opacity hover:opacity-80 ${section.color}`}
              data-testid="button-section-link"
            >
              <ExternalLink className="h-3 w-3" />
              Open {section.label}
            </button>
          )}

          {/* ── Description ── */}
          {event.description && (
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{event.description}</p>
          )}

          {/* ── Tags ── */}
          {(event.dimensionTags ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {(event.dimensionTags ?? []).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs capitalize">{tag}</Badge>
              ))}
            </div>
          )}

          {/* ── Guest notice ── */}
          {!isDbEvent && (
            <div className="rounded-xl border border-border/50 bg-muted/30 p-4 text-center mb-4">
              <p className="text-xs text-muted-foreground">Sign in so DW can personalize suggestions and save your tasks.</p>
            </div>
          )}

          {/* ── Task list ── */}
          {isDbEvent && (
            <div className="mb-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    {isFreeTime ? "Ideas & Plans" : "Tasks"}
                  </h3>
                  {totalCount > 0 && (
                    <span className="text-xs text-muted-foreground">{completedCount}/{totalCount}</span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2.5 text-xs gap-1"
                  onClick={handleOpenAdd}
                  data-testid="button-add-task"
                >
                  <Plus className="h-3 w-3" />
                  Add
                </Button>
              </div>

              {tasksLoading ? (
                <div className="flex items-center justify-center py-5">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onToggle={() => toggleTaskMutation.mutate({ id: task.id, isCompleted: !task.isCompleted })}
                      onDelete={() => deleteTaskMutation.mutate(task.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Add mode: input + suggestions together ── */}
          {isDbEvent && addMode && (
            <div className="mt-3 space-y-4">

              {/* Type your own */}
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder={isFreeTime ? "Add your own idea..." : "Type exactly what you want..."}
                  className="h-9 text-sm"
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddCustomTask(); if (e.key === "Escape") setAddMode(false); }}
                  data-testid="input-new-task"
                />
                <Button
                  size="sm"
                  className="h-9 px-3 shrink-0"
                  onClick={handleAddCustomTask}
                  disabled={!newTaskTitle.trim() || addTaskMutation.isPending}
                  data-testid="button-save-task"
                >
                  {addTaskMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                </Button>
              </div>

              {/* DW suggestions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-semibold text-primary">
                      {suggestLoading ? "DW is thinking..." : "DW suggests"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {suggestions.length > 1 && !suggestLoading && (
                      <button
                        type="button"
                        className="text-xs text-primary underline underline-offset-2"
                        onClick={acceptAll}
                        data-testid="button-accept-all-suggestions"
                      >
                        Add all
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={fetchSuggestions}
                      disabled={suggestLoading}
                      className="p-1 text-muted-foreground/50 hover:text-primary transition-colors"
                      aria-label="Refresh suggestions"
                      data-testid="button-refresh-suggestions"
                    >
                      <RefreshCw className={`h-3 w-3 ${suggestLoading ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                </div>

                {suggestLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-14 rounded-xl bg-muted/40 animate-pulse" />
                    ))}
                  </div>
                ) : suggestions.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">No suggestions yet — tap refresh to try again.</p>
                ) : (
                  <>
                    {/* "Tell DW what you like" nudge for free-time without prefs */}
                    {isFreeTime && !hasLifestylePrefs && !showPrefsForm && (
                      <button
                        type="button"
                        onClick={() => setShowPrefsForm(true)}
                        className="w-full flex items-center gap-2 rounded-xl bg-primary/8 border border-primary/15 px-3 py-2.5 mb-3 text-left hover:bg-primary/12 transition-colors group"
                        data-testid="button-tell-dw-preferences"
                      >
                        <Heart className="h-3.5 w-3.5 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-primary">Make these more personal</p>
                          <p className="text-[11px] text-muted-foreground">Tell DW what you actually like — once, and it remembers</p>
                        </div>
                        <Plus className="h-3.5 w-3.5 text-primary shrink-0" />
                      </button>
                    )}

                    {/* Quick preferences capture */}
                    {showPrefsForm && (
                      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 mb-3" data-testid="prefs-form">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
                              <Heart className="h-3 w-3" />
                              Tell DW who you are
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Fill in what applies — DW remembers this forever</p>
                          </div>
                          <button type="button" onClick={() => setShowPrefsForm(false)} className="text-muted-foreground/40 hover:text-foreground p-1">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="space-y-2.5">
                          {/* Identity Vision — most important, shown first */}
                          <div>
                            <label className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium flex items-center gap-1 mb-1">
                              <Sparkles className="h-2.5 w-2.5 text-primary" /> Who I'm becoming
                            </label>
                            <Input
                              value={prefsForm.identityVision}
                              onChange={(e) => setPrefsForm((p) => ({ ...p, identityVision: e.target.value }))}
                              placeholder="e.g. disciplined, healthy, financially free, confident"
                              className="h-8 text-xs"
                              data-testid="input-identity-vision"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium flex items-center gap-1 mb-1">
                              <Palette className="h-2.5 w-2.5" /> My style / aesthetic
                            </label>
                            <Input
                              value={prefsForm.styleLikes}
                              onChange={(e) => setPrefsForm((p) => ({ ...p, styleLikes: e.target.value }))}
                              placeholder="e.g. minimal, streetwear, clean girl, dark academia"
                              className="h-8 text-xs"
                              data-testid="input-style-likes"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium flex items-center gap-1 mb-1">
                              <Tv className="h-2.5 w-2.5" /> What I like to watch
                            </label>
                            <Input
                              value={prefsForm.watchLikes}
                              onChange={(e) => setPrefsForm((p) => ({ ...p, watchLikes: e.target.value }))}
                              placeholder="e.g. crime dramas, anime, reality TV, documentaries"
                              className="h-8 text-xs"
                              data-testid="input-watch-likes"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium flex items-center gap-1 mb-1">
                              <Headphones className="h-2.5 w-2.5" /> Music & podcasts
                            </label>
                            <Input
                              value={prefsForm.musicLikes}
                              onChange={(e) => setPrefsForm((p) => ({ ...p, musicLikes: e.target.value }))}
                              placeholder="e.g. R&B, true crime pods, lo-fi, motivational"
                              className="h-8 text-xs"
                              data-testid="input-music-likes"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium flex items-center gap-1 mb-1">
                              <Zap className="h-2.5 w-2.5" /> Activities I enjoy
                            </label>
                            <Input
                              value={prefsForm.doLikes}
                              onChange={(e) => setPrefsForm((p) => ({ ...p, doLikes: e.target.value }))}
                              placeholder="e.g. cooking, journaling, going out, exploring"
                              className="h-8 text-xs"
                              data-testid="input-do-likes"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium flex items-center gap-1 mb-1">
                              <Navigation className="h-2.5 w-2.5" /> Places I like to go
                            </label>
                            <Input
                              value={prefsForm.goLikes}
                              onChange={(e) => setPrefsForm((p) => ({ ...p, goLikes: e.target.value }))}
                              placeholder="e.g. coffee shops, nature, markets, new restaurants"
                              className="h-8 text-xs"
                              data-testid="input-go-likes"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium flex items-center gap-1 mb-1">
                              <BookOpen className="h-2.5 w-2.5" /> What I like to read
                            </label>
                            <Input
                              value={prefsForm.readLikes}
                              onChange={(e) => setPrefsForm((p) => ({ ...p, readLikes: e.target.value }))}
                              placeholder="e.g. self-help, sci-fi, business, spiritual growth"
                              className="h-8 text-xs"
                              data-testid="input-read-likes"
                            />
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="w-full h-8 text-xs mt-3"
                          onClick={saveLifestylePrefs}
                          disabled={savingPrefs || !Object.values(prefsForm).some((v) => v.trim())}
                          data-testid="button-save-lifestyle-prefs"
                        >
                          {savingPrefs ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                          {savingPrefs ? "Saving..." : "Save & refresh suggestions"}
                        </Button>
                      </div>
                    )}

                    {isFreeTime ? (
                      <div className="space-y-2">
                        {suggestions.map((s, i) => (
                          <FreeTimeSuggestionCard
                            key={i}
                            s={s}
                            index={i}
                            onAccept={() => acceptSuggestion(s)}
                            onDismiss={() => setSuggestions((prev) => prev.filter((_, j) => j !== i))}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-primary/15 bg-primary/5 divide-y divide-primary/10 px-3">
                        {suggestions.map((s, i) => (
                          <TaskSuggestionRow
                            key={i}
                            s={s}
                            index={i}
                            onAccept={() => acceptSuggestion(s)}
                            onDismiss={() => setSuggestions((prev) => prev.filter((_, j) => j !== i))}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Empty state (no tasks, not in add mode) ── */}
          {isDbEvent && !addMode && tasks.length === 0 && !tasksLoading && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="w-full rounded-xl border border-dashed border-border/60 py-5 text-center hover:border-primary/40 hover:bg-primary/5 transition-all group mt-1"
              data-testid="button-empty-add"
            >
              <Sparkles className="h-5 w-5 text-muted-foreground/40 group-hover:text-primary mx-auto mb-1.5 transition-colors" />
              <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                {isFreeTime ? "Tap to get personalized ideas from DW" : "Tap to add tasks — DW will suggest steps"}
              </p>
            </button>
          )}

          {/* ── Talk to DW CTA ── */}
          {isDbEvent && (
            <button
              type="button"
              className="mt-5 w-full text-center text-xs text-muted-foreground/50 hover:text-primary transition-colors py-1"
              onClick={() => setLocation(`/talk?topic=${encodeURIComponent(event.title || "free time")}`)}
              data-testid="button-talk-dw-about-event"
            >
              <Sparkles className="h-3 w-3 inline mr-1" />
              Talk to DW about this
            </button>
          )}
        </div>
      </div>
    </>
  );
}
