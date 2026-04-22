import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Plus, ArrowRight, Trash2, Sparkles, Folder, FolderPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ImportedConversation, Project } from "@shared/schema";

const TALK_MESSAGES_KEY = "dw_talk_messages";
const TALK_SYSTEM_OVERRIDE_KEY = "dw_talk_system_override";

type ContinueResponse = {
  sessionId: string;
  openingMessage: string;
  recentMessages: { role: "user" | "assistant" | "unknown"; content: string }[];
  systemContext: string;
};

function sourceLabel(source: ImportedConversation["source"]): string {
  switch (source) {
    case "chatgpt_export":
      return "ChatGPT export";
    case "raw_paste":
      return "Pasted text";
    default:
      return "Other";
  }
}

export function continueWithImport(
  data: ContinueResponse,
  navigate: (to: string) => void,
  toast: ReturnType<typeof useToast>["toast"],
): void {
  try {
    const seeded = [
      ...data.recentMessages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "assistant" as const, content: data.openingMessage },
    ];
    localStorage.setItem(TALK_MESSAGES_KEY, JSON.stringify(seeded));
    localStorage.setItem(TALK_SYSTEM_OVERRIDE_KEY, data.systemContext);
    navigate(`/talk?jumpToMessageIndex=${Math.max(0, seeded.length - 1)}`);
  } catch (err) {
    console.error(err);
    toast({ title: "Couldn't open chat", description: "Please try again.", variant: "destructive" });
  }
}

export default function ImportsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [attachTarget, setAttachTarget] = useState<ImportedConversation | null>(null);
  const [attachProjectId, setAttachProjectId] = useState<string>("");

  const { data: imports, isLoading } = useQuery<ImportedConversation[]>({
    queryKey: ["/api/imports"],
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });
  const hasPlans = !!projects && projects.length > 0;

  const continueMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/imports/${id}/continue`, {});
      return (await res.json()) as ContinueResponse;
    },
    onSuccess: (data) => continueWithImport(data, navigate, toast),
    onError: () => toast({ title: "Couldn't continue", description: "Please try again.", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/imports/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/imports"] });
      toast({ title: "Removed" });
    },
  });

  const attachMutation = useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string | null }) => {
      const res = await apiRequest("PATCH", `/api/imports/${id}/project`, { projectId });
      return (await res.json()) as ImportedConversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/imports"] });
      toast({ title: "Attached to plan" });
      setAttachTarget(null);
      setAttachProjectId("");
    },
    onError: () => toast({ title: "Couldn't attach", variant: "destructive" }),
  });

  const projectsById = new Map((projects || []).map((p) => [p.id, p]));

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 space-y-6" data-testid="page-imports">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Imported chats</h1>
          <p className="text-sm text-muted-foreground">
            Conversations you brought in from ChatGPT or pasted from elsewhere. Pick one to keep going.
          </p>
        </div>
        <Link href="/imports/new">
          <Button data-testid="button-new-import">
            <Plus className="mr-2 h-4 w-4" />
            Import a chat
          </Button>
        </Link>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : !imports || imports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">No imports yet</p>
              <p className="text-sm text-muted-foreground">
                Drop in a ChatGPT export or paste a thread to keep working with DW.
              </p>
            </div>
            <Link href="/imports/new">
              <Button data-testid="button-empty-import">Import a chat</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {imports.map((imp) => {
            const linkedProject = imp.projectId ? projectsById.get(imp.projectId) : null;
            return (
              <Card key={imp.id} data-testid={`card-import-${imp.id}`} className="hover-elevate">
                <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                  <div className="space-y-1">
                    <CardTitle className="text-base" data-testid={`text-title-${imp.id}`}>
                      {imp.originalTitle}
                    </CardTitle>
                    <CardDescription className="flex flex-wrap items-center gap-2 text-xs">
                      <Badge variant="secondary">{sourceLabel(imp.source)}</Badge>
                      <span>
                        {Array.isArray(imp.messages) ? imp.messages.length : 0} messages
                        {imp.importedAt
                          ? ` · imported ${formatDistanceToNow(new Date(imp.importedAt), { addSuffix: true })}`
                          : ""}
                      </span>
                      {linkedProject && (
                        <Badge variant="outline" className="gap-1" data-testid={`badge-plan-${imp.id}`}>
                          <Folder className="h-3 w-3" />
                          {linkedProject.name}
                        </Badge>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(imp.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${imp.id}`}
                      aria-label="Delete import"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {imp.summary && (
                    <p className="text-sm text-muted-foreground" data-testid={`text-summary-${imp.id}`}>
                      {imp.summary}
                    </p>
                  )}
                  {imp.topics && imp.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {imp.topics.map((t) => (
                        <Badge key={t} variant="outline" className="text-xs">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {Array.isArray(imp.suggestedActions) && imp.suggestedActions.length > 0 && (
                    <div className="rounded-md border bg-muted/30 p-3 space-y-1.5">
                      <p className="text-xs font-medium flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5" />
                        Suggested next steps
                      </p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {(imp.suggestedActions as { title: string; description?: string }[])
                          .slice(0, 3)
                          .map((a, i) => (
                            <li key={i} data-testid={`text-action-${imp.id}-${i}`}>
                              • <span className="font-medium text-foreground">{a.title}</span>
                              {a.description ? ` — ${a.description}` : ""}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAttachTarget(imp);
                        setAttachProjectId(imp.projectId || "");
                      }}
                      disabled={!hasPlans}
                      title={hasPlans ? "Attach to a plan" : "Create a plan first to attach this conversation"}
                      data-testid={`button-attach-${imp.id}`}
                    >
                      <FolderPlus className="mr-2 h-4 w-4" />
                      {linkedProject ? "Change plan" : "Attach to a plan"}
                    </Button>
                    <Button
                      onClick={() => continueMutation.mutate(imp.id)}
                      disabled={continueMutation.isPending}
                      data-testid={`button-continue-${imp.id}`}
                    >
                      Continue with DW
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={!!attachTarget}
        onOpenChange={(open) => {
          if (!open) {
            setAttachTarget(null);
            setAttachProjectId("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attach to a plan</DialogTitle>
            <DialogDescription>
              Link this conversation to one of your plans so it shows up in the Plans workspace.
            </DialogDescription>
          </DialogHeader>
          {hasPlans ? (
            <Select value={attachProjectId} onValueChange={setAttachProjectId}>
              <SelectTrigger data-testid="select-attach-project">
                <SelectValue placeholder="Pick a plan…" />
              </SelectTrigger>
              <SelectContent>
                {(projects || []).map((p) => (
                  <SelectItem key={p.id} value={p.id} data-testid={`option-project-${p.id}`}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-muted-foreground">You don't have any plans yet.</p>
          )}
          <DialogFooter className="gap-2">
            {attachTarget?.projectId && (
              <Button
                variant="ghost"
                onClick={() => attachTarget && attachMutation.mutate({ id: attachTarget.id, projectId: null })}
                disabled={attachMutation.isPending}
                data-testid="button-detach"
              >
                Detach
              </Button>
            )}
            <Button
              onClick={() =>
                attachTarget && attachMutation.mutate({ id: attachTarget.id, projectId: attachProjectId })
              }
              disabled={!attachProjectId || attachMutation.isPending}
              data-testid="button-confirm-attach"
            >
              Attach
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
