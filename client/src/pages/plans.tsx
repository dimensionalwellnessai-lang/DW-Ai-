import { useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, FileText, Archive, CheckCircle, Sparkles, Clock } from "lucide-react";

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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, parseApiError, queryClient } from "@/lib/queryClient";
import type { Project, ProjectStatus } from "@shared/schema";
import { PLAN_TEMPLATES } from "@shared/planTemplates";

type StatusFilter = "all" | ProjectStatus;

const TEMPLATES = PLAN_TEMPLATES;

const STATUS_LABEL: Record<ProjectStatus, string> = {
  active: "Active",
  parked: "Parked",
  done: "Done",
};

function statusOf(p: Project): ProjectStatus {
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

function daysSince(date: Date | string | null | undefined): number {
  if (!date) return 0;
  return Math.floor((Date.now() - new Date(date).getTime()) / (24 * 60 * 60 * 1000));
}

export default function PlansPage() {
  usePageMeta("Plans", "Your ongoing plans, each with its own DW conversation.");
  const { toast } = useToast();
  const [filter, setFilter] = useState<StatusFilter>("active");
  const [showArchived, setShowArchived] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [template, setTemplate] = useState("custom");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { data: plans = [], isLoading } = useQuery<Project[]>({
    queryKey: ["/api/plans"],
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { name: string; description?: string; dimensionTags?: string[]; templateId?: string }) => {
      const res = await apiRequest("POST", "/api/plans", payload);
      return res.json() as Promise<Project>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      toast({ title: "Plan created", description: "Open it to start a conversation with DW." });
      setCreateOpen(false);
      setName("");
      setDescription("");
      setTemplate("custom");
    },
    onError: (err) => {
      toast({ title: "Couldn't create plan", description: parseApiError(err), variant: "destructive" });
    },
  });

  const handleCreate = () => {
    if (!name.trim()) {
      toast({ title: "Give your plan a name", variant: "destructive" });
      return;
    }
    const tpl = TEMPLATES.find((t) => t.id === template);
    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      dimensionTags: tpl && tpl.tags.length > 0 ? tpl.tags : undefined,
      templateId: tpl && tpl.id !== "custom" ? tpl.id : undefined,
    });
  };

  const visible = plans.filter((p) => {
    const s = statusOf(p);
    if (!showArchived && s === "done") return false;
    if (filter === "all") return true;
    return s === filter;
  });

  const counts = {
    active: plans.filter((p) => statusOf(p) === "active").length,
    parked: plans.filter((p) => statusOf(p) === "parked").length,
    done: plans.filter((p) => statusOf(p) === "done").length,
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <PageHeader
        title="Plans"
        rightContent={
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="gap-2"
            data-testid="button-new-plan"
          >
            <Plus className="w-4 h-4" />
            New plan
          </Button>
        }
      />

      <div className="flex-1 overflow-auto">
        <div className="p-4 max-w-3xl mx-auto pb-12 space-y-4">
          {/* Filter chips */}
          <div className="flex flex-wrap items-center gap-2">
            {(["active", "parked", "all"] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? "default" : "outline"}
                onClick={() => setFilter(f)}
                data-testid={`filter-${f}`}
              >
                {f === "active" && <CheckCircle className="w-3.5 h-3.5 mr-1.5" />}
                {f === "parked" && <Clock className="w-3.5 h-3.5 mr-1.5" />}
                {f === "all" && <FileText className="w-3.5 h-3.5 mr-1.5" />}
                {f === "all"
                  ? `All (${plans.length})`
                  : `${STATUS_LABEL[f]} (${counts[f]})`}
              </Button>
            ))}
            <Button
              size="sm"
              variant={showArchived ? "default" : "outline"}
              onClick={() => setShowArchived((v) => !v)}
              data-testid="toggle-archived"
            >
              <Archive className="w-3.5 h-3.5 mr-1.5" />
              {showArchived ? "Hiding done" : `Show done (${counts.done})`}
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center text-muted-foreground py-12">Loading your plans…</div>
          ) : visible.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground space-y-3">
              <FileText className="w-12 h-12 mx-auto opacity-50" />
              <p>No plans here yet.</p>
              <Button onClick={() => setCreateOpen(true)} className="gap-2" data-testid="button-empty-create">
                <Plus className="w-4 h-4" /> Create your first plan
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {visible.map((p) => {
                const s = statusOf(p);
                const stalled = s === "active" && daysSince(p.lastActivityAt) >= 6;
                return (
                  <Link key={p.id} href={`/plans/${p.id}`}>
                    <Card
                      className="cursor-pointer hover-elevate transition-all"
                      data-testid={`card-plan-${p.id}`}
                    >
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-foreground truncate" data-testid={`text-plan-name-${p.id}`}>
                              {p.name}
                            </h3>
                            {p.summary ? (
                              <p
                                className="text-sm text-muted-foreground line-clamp-2 mt-0.5 italic"
                                data-testid={`text-plan-summary-${p.id}`}
                              >
                                {p.summary}
                              </p>
                            ) : p.description ? (
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                                {p.description}
                              </p>
                            ) : null}
                          </div>
                          <Badge
                            variant={s === "active" ? "default" : s === "done" ? "outline" : "secondary"}
                            className="shrink-0"
                            data-testid={`status-plan-${p.id}`}
                          >
                            {STATUS_LABEL[s]}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>Last activity {relativeTime(p.lastActivityAt)}</span>
                          {p.dimensionTags && p.dimensionTags.length > 0 && (
                            <span className="flex gap-1">
                              {p.dimensionTags.slice(0, 3).map((t) => (
                                <span key={t} className="px-1.5 py-0.5 rounded bg-muted">
                                  {t}
                                </span>
                              ))}
                            </span>
                          )}
                        </div>
                        {stalled && (
                          <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                            <Sparkles className="w-3 h-3" />
                            Hasn't moved in {daysSince(p.lastActivityAt)} days — pick it back up?
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New plan</DialogTitle>
            <DialogDescription>
              Each plan has its own DW conversation, milestones, and attached docs.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="plan-template">Template</Label>
              <Select value={template} onValueChange={setTemplate}>
                <SelectTrigger id="plan-template" data-testid="select-template">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-name">Name</Label>
              <Input
                id="plan-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. DW wellness workshop"
                data-testid="input-plan-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-desc">Description (optional)</Label>
              <Textarea
                id="plan-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this plan about? What does success look like?"
                rows={3}
                data-testid="input-plan-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              data-testid="button-create-plan"
            >
              {createMutation.isPending ? "Creating…" : "Create plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
