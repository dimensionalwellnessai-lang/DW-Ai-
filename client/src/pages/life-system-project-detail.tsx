// /life-system/project/:id — per-project workspace.
//
// Reached by tapping a project node on the home command-center orbit (and
// linkable from /life-system). Shows the project's focus, weekly cadence and
// next action, plus tasks assigned to the project. All headline fields are
// inline-editable here so users don't have to bounce back to the Life System
// list to update them.
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  Circle,
  CheckCircle2,
  Compass,
  Sparkles,
  Calendar,
  ListTodo,
  Loader2,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLifeSystem, updateProject } from "@/lib/life-system";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { usePageMeta } from "@/hooks/use-page-meta";
import type { Task } from "@shared/schema";

type ProjectStatus = "vision" | "active" | "paused" | "done";
const STATUS_OPTIONS: ProjectStatus[] = ["vision", "active", "paused", "done"];

function StatusBadge({ status }: { status: string | null | undefined }) {
  const label = status ?? "active";
  const tone =
    label === "active" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" :
    label === "paused" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" :
    label === "done"   ? "bg-blue-500/15 text-blue-600 dark:text-blue-400" :
                          "bg-muted text-muted-foreground";
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${tone}`}
      data-testid="badge-project-status"
    >
      {label}
    </span>
  );
}

export default function LifeSystemProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const { data, isLoading } = useLifeSystem();
  const { toast } = useToast();
  const project = useMemo(
    () => (data?.projects ?? []).find(p => p.id === projectId),
    [data, projectId],
  );

  usePageMeta(
    project ? `${project.name} — Project` : "Project Workspace",
    project ? `Focus, cadence and tasks for ${project.name}.` : "Project workspace.",
  );

  const { data: allTasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    enabled: !!project,
  });

  const projectTasks = useMemo(
    () => (allTasks ?? []).filter(t => t.projectId === projectId),
    [allTasks, projectId],
  );

  const toggleTask = useMutation({
    mutationFn: (task: Task) =>
      apiRequest("PATCH", `/api/tasks/${task.id}`, {
        isCompleted: !task.isCompleted,
        status: task.isCompleted ? "todo" : "done",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const saveProject = useMutation({
    mutationFn: (patch: Parameters<typeof updateProject>[1]) =>
      updateProject(projectId!, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/life-system/pillars"] });
    },
    onError: () => {
      toast({
        title: "Couldn't save",
        description: "Try again in a moment.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4" data-testid="page-project-loading">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-32 bg-muted rounded animate-pulse" />
        <div className="h-24 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center space-y-4" data-testid="page-project-missing">
        <h1 className="text-2xl font-semibold">This project isn't here yet</h1>
        <p className="text-muted-foreground">
          It may have been removed, or its workspace hasn't been set up. Open your Life System
          to see what's active.
        </p>
        <div className="flex justify-center gap-2">
          <Button asChild variant="outline" data-testid="link-back-life-system">
            <Link href="/life-system">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Life System
            </Link>
          </Button>
          <Button asChild data-testid="link-back-home">
            <Link href="/command-center">Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const todoTasks = projectTasks.filter(t => !t.isCompleted);
  const doneTasks = projectTasks.filter(t => t.isCompleted);
  const updated = project.updatedAt ? new Date(project.updatedAt) : null;

  async function onChangeStatus(next: ProjectStatus) {
    if (!project || next === project.status) return;
    try {
      await saveProject.mutateAsync({ status: next });
      toast({ title: "Status updated", description: `Now ${next}.` });
    } catch {
      // saveProject.onError already toasts; swallow to avoid unhandled rejection.
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6" data-testid="page-project-detail">
      {/* ── Top bar ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm" data-testid="link-back">
          <Link href="/life-system">
            <ArrowLeft className="w-4 h-4 mr-1" /> Life System
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <StatusBadge status={project.status} />
          <Select
            value={(project.status as ProjectStatus | null) ?? "active"}
            onValueChange={v => { void onChangeStatus(v as ProjectStatus); }}
          >
            <SelectTrigger
              className="h-8 w-[120px] text-xs"
              aria-label="Change project status"
              data-testid="select-project-status"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(s => (
                <SelectItem key={s} value={s} data-testid={`option-status-${s}`}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Header (name + description) ────────────────────────────────── */}
      <header className="space-y-2">
        <InlineText
          value={project.name}
          onSave={v => saveProject.mutateAsync({ name: v })}
          required
          renderDisplay={v => (
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-project-name">
              {v}
            </h1>
          )}
          inputClassName="text-3xl font-bold tracking-tight"
          editLabel="Edit project name"
          testId="project-name"
        />
        <InlineText
          value={project.description ?? ""}
          onSave={v => saveProject.mutateAsync({ description: v ? v : null })}
          multiline
          placeholder="Add a short description so you remember why this matters."
          renderDisplay={v =>
            v ? (
              <p className="text-muted-foreground" data-testid="text-project-description">{v}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic" data-testid="text-project-description-empty">
                Add a short description so you remember why this matters.
              </p>
            )
          }
          editLabel="Edit description"
          testId="project-description"
        />
      </header>

      {/* ── Focus / Next action / Cadence ─────────────────────────────── */}
      <Card className="p-5 space-y-4" data-testid="card-project-focus">
        <FieldBlock
          icon={<Compass className="w-4 h-4" />}
          label="Current focus"
          value={project.currentFocus ?? ""}
          placeholder="What this project is pointed at right now."
          onSave={v => saveProject.mutateAsync({ currentFocus: v ? v : null })}
          testId="focus"
          multiline
        />
        <div className="border-t" />
        <FieldBlock
          icon={<Sparkles className="w-4 h-4 text-primary" />}
          label="Next action"
          value={project.nextAction ?? ""}
          placeholder="The very next concrete step."
          onSave={v => saveProject.mutateAsync({ nextAction: v ? v : null })}
          testId="next-action"
        />
        <div className="border-t" />
        <FieldBlock
          icon={<Calendar className="w-4 h-4 text-muted-foreground" />}
          label="Weekly cadence"
          value={project.weeklyCadence ?? ""}
          placeholder="e.g. 2 build blocks Mon/Wed, review Friday."
          onSave={v => saveProject.mutateAsync({ weeklyCadence: v ? v : null })}
          testId="cadence"
        />
      </Card>

      {/* ── Recent activity ───────────────────────────────────────────── */}
      <Card className="p-5 space-y-2" data-testid="card-project-activity">
        <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Recent activity
        </div>
        <ul className="text-sm space-y-1.5">
          {updated && (
            <li className="flex justify-between" data-testid="activity-updated">
              <span className="text-muted-foreground">Project last updated</span>
              <span>{updated.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
            </li>
          )}
          <li className="flex justify-between" data-testid="activity-task-counts">
            <span className="text-muted-foreground">Open tasks</span>
            <span>{todoTasks.length}</span>
          </li>
          <li className="flex justify-between" data-testid="activity-done-counts">
            <span className="text-muted-foreground">Completed tasks</span>
            <span>{doneTasks.length}</span>
          </li>
        </ul>
      </Card>

      {/* ── Tasks ─────────────────────────────────────────────────────── */}
      <section className="space-y-3" data-testid="section-project-tasks">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          <ListTodo className="w-4 h-4" /> Tasks
        </div>
        {projectTasks.length === 0 ? (
          <Card className="p-5 text-center text-sm text-muted-foreground" data-testid="empty-project-tasks">
            No tasks linked to this project yet. Tasks created with this project will show up here.
          </Card>
        ) : (
          <div className="space-y-2">
            {todoTasks.map(task => (
              <Card
                key={task.id}
                className="p-3 flex items-center gap-3 hover-elevate"
                data-testid={`card-project-task-${task.id}`}
              >
                <button
                  type="button"
                  onClick={() => toggleTask.mutate(task)}
                  aria-label={`Mark ${task.title} complete`}
                  className="text-muted-foreground hover:text-primary transition-colors"
                  data-testid={`button-toggle-task-${task.id}`}
                >
                  <Circle className="w-5 h-5" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate" data-testid={`text-task-title-${task.id}`}>
                    {task.title}
                  </div>
                  {task.description && (
                    <div className="text-xs text-muted-foreground truncate">{task.description}</div>
                  )}
                </div>
              </Card>
            ))}
            {doneTasks.map(task => (
              <Card
                key={task.id}
                className="p-3 flex items-center gap-3 hover-elevate opacity-70"
                data-testid={`card-project-task-${task.id}`}
              >
                <button
                  type="button"
                  onClick={() => toggleTask.mutate(task)}
                  aria-label={`Mark ${task.title} not complete`}
                  className="text-primary"
                  data-testid={`button-toggle-task-${task.id}`}
                >
                  <CheckCircle2 className="w-5 h-5" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="font-medium line-through truncate" data-testid={`text-task-title-${task.id}`}>
                    {task.title}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Inline edit helpers ──────────────────────────────────────────────────

interface InlineTextProps {
  value: string;
  onSave: (v: string) => Promise<unknown>;
  renderDisplay: (v: string) => React.ReactNode;
  placeholder?: string;
  multiline?: boolean;
  required?: boolean;
  inputClassName?: string;
  editLabel: string;
  testId: string;
}

function InlineText({
  value,
  onSave,
  renderDisplay,
  placeholder,
  multiline,
  required,
  inputClassName,
  editLabel,
  testId,
}: InlineTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setDraft(value); }, [value]);

  if (!editing) {
    return (
      <div className="group flex items-start gap-2">
        <div className="flex-1 min-w-0">{renderDisplay(value)}</div>
        <Button
          variant="ghost"
          size="icon"
          aria-label={editLabel}
          onClick={() => setEditing(true)}
          className="opacity-60 hover:opacity-100"
          data-testid={`button-edit-${testId}`}
        >
          <Pencil className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  async function commit() {
    const trimmed = draft.trim();
    if (required && !trimmed) {
      setEditing(false);
      setDraft(value);
      return;
    }
    if (trimmed === (value ?? "").trim()) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(trimmed);
      setEditing(false);
    } catch {
      // Parent mutation handles toast; keep the editor open so the user can retry.
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  return (
    <div className="space-y-2">
      {multiline ? (
        <Textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder={placeholder}
          rows={3}
          autoFocus
          data-testid={`textarea-edit-${testId}`}
        />
      ) : (
        <Input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder={placeholder}
          autoFocus
          className={inputClassName}
          onKeyDown={e => {
            if (e.key === "Enter") { e.preventDefault(); void commit(); }
            if (e.key === "Escape") { e.preventDefault(); cancel(); }
          }}
          data-testid={`input-edit-${testId}`}
        />
      )}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={cancel} disabled={saving} data-testid={`button-cancel-${testId}`}>
          Cancel
        </Button>
        <Button size="sm" onClick={() => { void commit(); }} disabled={saving} data-testid={`button-save-${testId}`}>
          {saving && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
          Save
        </Button>
      </div>
    </div>
  );
}

interface FieldBlockProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  placeholder: string;
  onSave: (v: string) => Promise<unknown>;
  testId: string;
  multiline?: boolean;
}

function FieldBlock({ icon, label, value, placeholder, onSave, testId, multiline }: FieldBlockProps) {
  return (
    <div className="space-y-2" data-testid={`field-${testId}`}>
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {icon} {label}
      </div>
      <InlineText
        value={value}
        onSave={onSave}
        placeholder={placeholder}
        multiline={multiline}
        renderDisplay={v =>
          v ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap" data-testid={`text-${testId}`}>{v}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic" data-testid={`text-${testId}-empty`}>
              {placeholder}
            </p>
          )
        }
        editLabel={`Edit ${label.toLowerCase()}`}
        testId={testId}
      />
    </div>
  );
}
