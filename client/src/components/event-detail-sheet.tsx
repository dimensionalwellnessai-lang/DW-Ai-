import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import {
  Check,
  Plus,
  Sparkles,
  Trash2,
  ExternalLink,
  Clock,
  MapPin,
  Pencil,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { CalendarEventTask } from "@shared/schema";

// ── Keyword → app route mapping ─────────────────────────────────────────────
const SECTION_MAP: { keywords: string[]; route: string; label: string; color: string }[] = [
  { keywords: ["meditation", "mindful", "spiritual", "breathe", "breath", "sit still", "silence", "prayer"], route: "/insights", label: "Insights", color: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  { keywords: ["workout", "exercise", "gym", "lift", "run", "jog", "cardio", "upper body", "lower body", "stretch", "yoga", "movement", "light workout"], route: "/workout", label: "Workout", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  { keywords: ["breakfast", "lunch", "dinner", "meal", "cook", "prep", "eat", "food", "nutrition", "snack"], route: "/browse", label: "Nutrition", color: "bg-green-500/10 text-green-600 dark:text-green-400" },
  { keywords: ["journal", "write", "reflect", "journaling"], route: "/talk?topic=journal", label: "Journal", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  { keywords: ["work", "commute", "meeting", "deep work", "focus", "office", "productive"], route: "/goals", label: "Goals", color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" },
  { keywords: ["habit", "routine", "morning", "wind down", "night"], route: "/habits", label: "Habits", color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" },
  { keywords: ["mood", "check-in", "checkin", "energy"], route: "/mood-tracker", label: "Mood", color: "bg-pink-500/10 text-pink-600 dark:text-pink-400" },
  { keywords: ["free", "relax", "unwind", "rest", "chill", "leisure", "downtime"], route: "/browse", label: "For You", color: "bg-teal-500/10 text-teal-600 dark:text-teal-400" },
  { keywords: ["shower", "hygiene", "get ready", "dress"], route: null as unknown as string, label: "Self-Care", color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" },
  { keywords: ["talk", "chat", "dw", "ai"], route: "/talk", label: "Talk to DW", color: "bg-primary/10 text-primary" },
];

function detectSection(title: string, tags?: string[]): { route: string | null; label: string; color: string } | null {
  const haystack = [title, ...(tags ?? [])].join(" ").toLowerCase();
  for (const entry of SECTION_MAP) {
    if (entry.keywords.some((kw) => haystack.includes(kw))) {
      return { route: entry.route ?? null, label: entry.label, color: entry.color };
    }
  }
  return null;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function fmtTime(d: Date) {
  return format(d, "h:mm a");
}

// ── Sub-components ───────────────────────────────────────────────────────────
interface TaskRowProps {
  task: CalendarEventTask;
  onToggle: () => void;
  onDelete: () => void;
}

function TaskRow({ task, onToggle, onDelete }: TaskRowProps) {
  return (
    <div className="flex items-start gap-2 group py-1" data-testid={`task-row-${task.id}`}>
      <button
        type="button"
        onClick={onToggle}
        className={`mt-0.5 shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
          task.isCompleted
            ? "bg-primary border-primary"
            : "border-muted-foreground/40 hover:border-primary"
        }`}
        aria-label={task.isCompleted ? "Mark incomplete" : "Mark complete"}
        data-testid={`checkbox-task-${task.id}`}
      >
        {task.isCompleted && <Check className="h-3 w-3 text-primary-foreground" />}
      </button>
      <span className={`flex-1 text-sm leading-snug ${task.isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
        {task.title}
      </span>
      {task.linkedRoute && (
        <a
          href={task.linkedRoute}
          className="shrink-0 text-muted-foreground/50 hover:text-primary transition-colors"
          title="Open in app"
          data-testid={`link-task-${task.id}`}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
      <button
        type="button"
        onClick={onDelete}
        className="shrink-0 text-muted-foreground/30 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
        aria-label="Delete task"
        data-testid={`delete-task-${task.id}`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
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
  const [showAddTask, setShowAddTask] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<{ title: string; linkedRoute: string | null }[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isOpen = !!event;
  const section = event ? detectSection(event.title, event.dimensionTags) : null;

  const isDbEvent = event?.source === "db";

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
      setShowAddTask(false);
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

  const handleAskDW = async () => {
    if (!event) return;
    setSuggestLoading(true);
    setSuggestions([]);
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
    } catch {
      toast({ title: "DW couldn't generate suggestions right now", variant: "destructive" });
    } finally {
      setSuggestLoading(false);
    }
  };

  const acceptSuggestion = (s: { title: string; linkedRoute: string | null }) => {
    addTaskMutation.mutate({ title: s.title, dwSuggested: true, linkedRoute: s.linkedRoute });
    setSuggestions((prev) => prev.filter((x) => x.title !== s.title));
  };

  const acceptAllSuggestions = () => {
    suggestions.forEach((s) => addTaskMutation.mutate({ title: s.title, dwSuggested: true, linkedRoute: s.linkedRoute }));
    setSuggestions([]);
  };

  const handleAddCustomTask = () => {
    if (!newTaskTitle.trim()) return;
    addTaskMutation.mutate({ title: newTaskTitle.trim(), dwSuggested: false, linkedRoute: section?.route ?? null });
  };

  if (!event) return null;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
          onClick={onClose}
          data-testid="event-sheet-backdrop"
        />
      )}

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-[61] bg-background rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ maxHeight: "88vh", display: "flex", flexDirection: "column" }}
        data-testid="event-detail-sheet"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-5 pb-8">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-foreground leading-snug">{event.title}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {fmtTime(event.startTime)}
                  {event.endTime && ` – ${fmtTime(event.endTime)}`}
                </span>
                {event.location && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {event.location}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={onEdit}
                className="p-2 rounded-full hover:bg-muted transition-colors"
                aria-label="Edit event"
                data-testid="button-edit-event"
              >
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full hover:bg-muted transition-colors"
                aria-label="Close"
                data-testid="button-close-sheet"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Section link */}
          {section && (
            <button
              type="button"
              onClick={() => { if (section.route) setLocation(section.route); }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-opacity hover:opacity-80 mb-4 ${section.color}`}
              data-testid="button-section-link"
            >
              <ExternalLink className="h-3 w-3" />
              Open {section.label}
            </button>
          )}

          {/* Description */}
          {event.description && (
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{event.description}</p>
          )}

          {/* Dimension tags */}
          {(event.dimensionTags ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {(event.dimensionTags ?? []).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs capitalize">{tag}</Badge>
              ))}
            </div>
          )}

          {/* Tasks section */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-foreground">Tasks</h3>
              <div className="flex gap-1">
                {isDbEvent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-primary"
                    onClick={handleAskDW}
                    disabled={suggestLoading}
                    data-testid="button-ask-dw"
                  >
                    {suggestLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <Sparkles className="h-3 w-3 mr-1" />
                    )}
                    Ask DW
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setShowAddTask((v) => !v)}
                  data-testid="button-add-task"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
            </div>

            {/* Custom task input */}
            {showAddTask && (
              <div className="flex gap-2 mb-3">
                <Input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="What needs to happen?"
                  className="h-8 text-sm"
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddCustomTask(); }}
                  autoFocus
                  data-testid="input-new-task"
                />
                <Button
                  size="sm"
                  className="h-8 px-3"
                  onClick={handleAddCustomTask}
                  disabled={!newTaskTitle.trim() || addTaskMutation.isPending}
                  data-testid="button-save-task"
                >
                  {addTaskMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                </Button>
              </div>
            )}

            {/* Guest mode notice */}
            {!isDbEvent && (
              <div className="rounded-xl border border-border/50 bg-muted/30 p-3 text-center">
                <p className="text-xs text-muted-foreground">Sign in to add tasks and let DW suggest steps for this event.</p>
              </div>
            )}

            {/* Task list */}
            {isDbEvent && (
              <>
                {tasksLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : tasks.length === 0 && suggestions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/60 p-4 text-center">
                    <p className="text-xs text-muted-foreground">No tasks yet. Tap <strong>Ask DW</strong> for suggestions, or add your own.</p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
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
              </>
            )}
          </div>

          {/* DW Suggestions */}
          {suggestions.length > 0 && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold text-primary">DW Suggestions</span>
                </div>
                <button
                  type="button"
                  className="text-xs text-primary underline underline-offset-2 font-medium"
                  onClick={acceptAllSuggestions}
                  data-testid="button-accept-all-suggestions"
                >
                  Add all
                </button>
              </div>
              <div className="space-y-2">
                {suggestions.map((s, i) => (
                  <div key={i} className="flex items-start gap-2" data-testid={`suggestion-${i}`}>
                    <div className="flex-1">
                      <p className="text-sm text-foreground">{s.title}</p>
                      {s.linkedRoute && (
                        <span className="text-xs text-muted-foreground capitalize">{s.linkedRoute.replace(/\//g, "").replace(/-/g, " ")}</span>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-xs border-primary/30 text-primary hover:bg-primary/10"
                        onClick={() => acceptSuggestion(s)}
                        data-testid={`button-accept-suggestion-${i}`}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs text-muted-foreground"
                        onClick={() => setSuggestions((prev) => prev.filter((_, j) => j !== i))}
                        data-testid={`button-dismiss-suggestion-${i}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Talk to DW CTA */}
          {isDbEvent && (
            <button
              type="button"
              className="mt-4 w-full text-center text-xs text-muted-foreground/60 hover:text-primary transition-colors py-1"
              onClick={() => setLocation(`/talk?topic=${encodeURIComponent(event.title)}`)}
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
