/**
 * Projects — bounded initiatives with a defined outcome and clearer finish state.
 *
 * Spec 13 distinction:
 *   Plans  — directional and adaptive, can evolve continuously.
 *   Projects — scoped and outcome-focused, usually have a clearer completion point.
 *
 * Route: /projects
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  FolderOpen,
  Plus,
  CheckCircle,
  Clock,
  Archive,
  Sparkles,
  MoreHorizontal,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, parseApiError, queryClient } from "@/lib/queryClient";
import type { Project, ProjectStatus } from "@shared/schema";

type StatusFilter = "all" | ProjectStatus;

const STATUS_LABEL: Record<ProjectStatus, string> = {
  active: "Active",
  parked: "Parked",
  done: "Done",
};

const STATUS_ICON: Record<ProjectStatus, typeof Clock> = {
  active: Clock,
  parked: Archive,
  done: CheckCircle,
};

const STATUS_COLOR: Record<ProjectStatus, string> = {
  active: "text-emerald-500",
  parked: "text-muted-foreground",
  done: "text-blue-500",
};

function projectStatus(p: Project): ProjectStatus {
  return (p.status as ProjectStatus | null) ?? "active";
}

function relativeTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "just now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}

// ─── Project card ─────────────────────────────────────────────────────────────

interface ProjectCardProps {
  project: Project;
  onStatusChange: (id: string, status: ProjectStatus) => void;
}

function ProjectCard({ project, onStatusChange }: ProjectCardProps) {
  const status = projectStatus(project);
  const StatusIcon = STATUS_ICON[status];
  return (
    <Card data-testid={`project-card-${project.id}`}>
      <CardContent className="flex items-start gap-3 p-4">
        <div className="mt-0.5 flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-muted">
          <FolderOpen className="h-4 w-4 text-amber-500" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground leading-snug">{project.name}</p>
            <Badge
              variant="secondary"
              className={`text-[10px] h-4 px-1.5 flex items-center gap-0.5 ${STATUS_COLOR[status]}`}
            >
              <StatusIcon className="h-2.5 w-2.5" aria-hidden="true" />
              {STATUS_LABEL[status]}
            </Badge>
          </div>
          {project.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{project.description}</p>
          )}
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            Updated {relativeTime(project.lastActivityAt)}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex-shrink-0 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label={`Options for ${project.name}`}
              data-testid={`project-menu-${project.id}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {status !== "active" && (
              <DropdownMenuItem onClick={() => onStatusChange(project.id, "active")}>
                <Clock className="h-3.5 w-3.5 mr-2 text-emerald-500" />
                Mark active
              </DropdownMenuItem>
            )}
            {status !== "parked" && (
              <DropdownMenuItem onClick={() => onStatusChange(project.id, "parked")}>
                <Archive className="h-3.5 w-3.5 mr-2" />
                Park
              </DropdownMenuItem>
            )}
            {status !== "done" && (
              <DropdownMenuItem onClick={() => onStatusChange(project.id, "done")}>
                <CheckCircle className="h-3.5 w-3.5 mr-2 text-blue-500" />
                Mark done
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  usePageMeta("Projects", "Bounded initiatives with a defined outcome and clearer finish state.");
  const { toast } = useToast();
  const [filter, setFilter] = useState<StatusFilter>("active");
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/projects", {
        name: name.trim(),
        description: description.trim() || null,
        status: "active",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setCreateOpen(false);
      setName("");
      setDescription("");
      toast({ title: "Project created" });
    },
    onError: async (err) => {
      toast({ title: "Couldn't create project", description: await parseApiError(err), variant: "destructive" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ProjectStatus }) =>
      apiRequest("PATCH", `/api/projects/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
    onError: async (err) => {
      toast({ title: "Couldn't update project", description: await parseApiError(err), variant: "destructive" });
    },
  });

  const handleStatusChange = (id: string, status: ProjectStatus) => {
    statusMutation.mutate({ id, status });
  };

  const filtered = projects.filter((p) => filter === "all" || projectStatus(p) === filter);

  const filterOptions: { value: StatusFilter; label: string }[] = [
    { value: "active", label: "Active" },
    { value: "parked", label: "Parked" },
    { value: "done", label: "Done" },
    { value: "all", label: "All" },
  ];

  return (
    <div className="pb-28">
      <PageHeader title="Projects" showBack />

      <div className="px-4 space-y-5">
        {/* Intro */}
        <div className="flex items-center gap-2 pt-1">
          <Sparkles className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            Bounded initiatives with a defined outcome — scoped, focused, and built to finish.
          </p>
        </div>

        {/* Filter + create */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1.5 flex-wrap flex-1">
            {filterOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFilter(opt.value)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  filter === opt.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "text-muted-foreground border-border hover:border-primary/50"
                }`}
                data-testid={`filter-${opt.value}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5"
            data-testid="btn-create-project"
          >
            <Plus className="h-3.5 w-3.5" />
            New project
          </Button>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-2.5">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="h-16 p-4 bg-muted/30 rounded-lg" />
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
              <FolderOpen className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              {filter === "all"
                ? "No projects yet. A project is a scoped initiative with a clear finish line."
                : `No ${STATUS_LABEL[filter as ProjectStatus]?.toLowerCase()} projects.`}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Create your first project
            </Button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((project) => (
              <ProjectCard key={project.id} project={project} onStatusChange={handleStatusChange} />
            ))}
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
            <DialogDescription>
              A project is a bounded initiative with a defined outcome and a clearer finish state.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="project-name">Name</Label>
              <Input
                id="project-name"
                placeholder="e.g. Launch my portfolio site"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && name.trim()) createMutation.mutate();
                }}
                data-testid="input-project-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="project-desc">Description (optional)</Label>
              <Textarea
                id="project-desc"
                placeholder="What does success look like for this project?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                data-testid="input-project-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!name.trim() || createMutation.isPending}
              data-testid="btn-submit-project"
            >
              {createMutation.isPending ? "Creating…" : "Create project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
