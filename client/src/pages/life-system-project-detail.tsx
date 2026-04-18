// /life-system/project/:id — per-project workspace.
//
// Reached by tapping a project node on the home command-center orbit (and
// linkable from /life-system). Shows the project's focus, weekly cadence and
// next action, plus tasks assigned to the project. Falls back gracefully if
// the project no longer exists (deleted, wrong id, signed-out preview).
import { useMemo } from "react";
import { Link, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Circle, CheckCircle2, Compass, Sparkles, Calendar, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLifeSystem } from "@/lib/life-system";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { usePageMeta } from "@/hooks/use-page-meta";
import type { Task } from "@shared/schema";

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

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6" data-testid="page-project-detail">
      {/* ── Top bar ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" data-testid="link-back">
          <Link href="/life-system">
            <ArrowLeft className="w-4 h-4 mr-1" /> Life System
          </Link>
        </Button>
        <StatusBadge status={project.status} />
      </div>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="space-y-2">
        <h1
          className="text-3xl font-bold tracking-tight"
          data-testid="text-project-name"
        >
          {project.name}
        </h1>
        {project.description && (
          <p className="text-muted-foreground" data-testid="text-project-description">
            {project.description}
          </p>
        )}
      </header>

      {/* ── Focus ─────────────────────────────────────────────────────── */}
      <Card className="p-5 space-y-3" data-testid="card-project-focus">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          <Compass className="w-4 h-4" /> Current focus
        </div>
        {project.currentFocus ? (
          <p className="text-base leading-relaxed" data-testid="text-project-focus">
            {project.currentFocus}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            No focus set yet. Add one from the Life System list to keep this project pointed.
          </p>
        )}
        {project.nextAction && (
          <div className="pt-2 border-t flex gap-2 items-start">
            <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Next action
              </div>
              <p className="text-sm" data-testid="text-project-next-action">{project.nextAction}</p>
            </div>
          </div>
        )}
        {project.weeklyCadence && (
          <div className="pt-2 border-t flex gap-2 items-start">
            <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Weekly cadence
              </div>
              <p className="text-sm" data-testid="text-project-cadence">{project.weeklyCadence}</p>
            </div>
          </div>
        )}
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
