import { useEffect, useRef, useState } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Send,
  Plus,
  Sparkles,
  Trash2,
  Paperclip,
  Loader2,
  Check,
  Link2,
  FileDown,
  Edit2,
  Upload,
  Download,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { PageHeader } from "@/components/page-header";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, parseApiError, queryClient } from "@/lib/queryClient";
import type {
  ImportedConversation,
  Project,
  ProjectArtifact,
  ProjectMilestone,
  ProjectStatus,
} from "@shared/schema";

type ChatMessage = { role: "user" | "assistant"; content: string };

const STATUS_LABEL: Record<ProjectStatus, string> = {
  active: "Active",
  parked: "Parked",
  done: "Done",
};

function PlanChatPanel({ planId }: { planId: string }) {
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery<{ messages: ChatMessage[] }>({
    queryKey: ["/api/plans", planId, "chat"],
  });
  const messages = data?.messages ?? [];

  const sendMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", `/api/plans/${planId}/chat`, { message });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans", planId, "chat"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plans", planId] });
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      setInput("");
    },
    onError: (err) => {
      toast({ title: "Couldn't send", description: parseApiError(err), variant: "destructive" });
    },
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sendMutation.isPending]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    sendMutation.mutate(text);
  };

  return (
    <div className="flex flex-col h-full min-h-[400px]">
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">Loading conversation…</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 space-y-2">
            <Sparkles className="w-8 h-8 mx-auto opacity-50" />
            <p className="text-sm">DW knows this plan. Start the conversation.</p>
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "flex justify-end"
                  : "flex justify-start"
              }
              data-testid={`chat-message-${i}`}
            >
              <div
                className={
                  "rounded-lg px-3 py-2 max-w-[85%] text-sm whitespace-pre-wrap " +
                  (m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground")
                }
              >
                {m.role === "assistant" ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                ) : (
                  m.content
                )}
              </div>
            </div>
          ))
        )}
        {sendMutation.isPending && (
          <div className="flex justify-start">
            <div className="rounded-lg px-3 py-2 bg-muted text-sm flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" /> DW is thinking…
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="border-t p-3 flex items-end gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Talk to DW about this plan…"
          rows={2}
          className="resize-none"
          data-testid="input-plan-chat"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button
          onClick={handleSend}
          disabled={sendMutation.isPending || !input.trim()}
          size="icon"
          data-testid="button-send-plan-chat"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function MilestonesPanel({ planId }: { planId: string }) {
  const { toast } = useToast();
  const [newTitle, setNewTitle] = useState("");
  const [newDue, setNewDue] = useState("");
  const [proposals, setProposals] = useState<{ title: string }[] | null>(null);

  const { data: milestones = [] } = useQuery<ProjectMilestone[]>({
    queryKey: ["/api/plans", planId, "milestones"],
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { title: string; dueDate?: string | null }) => {
      const res = await apiRequest("POST", `/api/plans/${planId}/milestones`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans", planId, "milestones"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      setNewTitle("");
      setNewDue("");
    },
    onError: (err) => toast({ title: "Couldn't add", description: parseApiError(err), variant: "destructive" }),
  });

  const updateDueMutation = useMutation({
    mutationFn: async ({ id, dueDate }: { id: string; dueDate: string | null }) => {
      const res = await apiRequest("PATCH", `/api/plans/${planId}/milestones/${id}`, { dueDate });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans", planId, "milestones"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
    },
    onError: (err) => toast({ title: "Couldn't update", description: parseApiError(err), variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const res = await apiRequest("PATCH", `/api/plans/${planId}/milestones/${id}`, { done });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans", planId, "milestones"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
    },
    onError: (err) => toast({ title: "Couldn't update", description: parseApiError(err), variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/plans/${planId}/milestones/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans", planId, "milestones"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
    },
  });

  const suggestMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/plans/${planId}/suggest-milestones`);
      return res.json() as Promise<{ proposals: { title: string }[] }>;
    },
    onSuccess: (data) => {
      setProposals(data.proposals);
      if (data.proposals.length === 0) {
        toast({ title: "Nothing to suggest yet", description: "Chat with DW about the plan first." });
      }
    },
    onError: (err) =>
      toast({ title: "Couldn't suggest", description: parseApiError(err), variant: "destructive" }),
  });

  const acceptProposal = (title: string) => {
    createMutation.mutate({ title });
    setProposals((prev) => (prev ? prev.filter((p) => p.title !== title) : prev));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Milestones</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => suggestMutation.mutate()}
          disabled={suggestMutation.isPending}
          data-testid="button-suggest-milestones"
        >
          {suggestMutation.isPending ? (
            <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
          ) : (
            <Sparkles className="w-3 h-3 mr-1.5" />
          )}
          Suggest next
        </Button>
      </div>

      {proposals && proposals.length > 0 && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <p className="text-xs text-muted-foreground">DW proposes:</p>
            {proposals.map((p) => (
              <div key={p.title} className="flex items-center gap-2" data-testid={`proposal-${p.title}`}>
                <span className="flex-1 text-sm">{p.title}</span>
                <Button size="sm" variant="ghost" onClick={() => acceptProposal(p.title)}>
                  <Check className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setProposals((prev) => (prev ? prev.filter((x) => x.title !== p.title) : prev))}
                >
                  Skip
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add a milestone…"
          data-testid="input-new-milestone"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (newTitle.trim())
                createMutation.mutate({ title: newTitle.trim(), dueDate: newDue || null });
            }
          }}
        />
        <Input
          type="date"
          value={newDue}
          onChange={(e) => setNewDue(e.target.value)}
          className="w-[140px]"
          aria-label="Due date (optional)"
          data-testid="input-new-milestone-due"
        />
        <Button
          size="icon"
          onClick={() =>
            newTitle.trim() &&
            createMutation.mutate({ title: newTitle.trim(), dueDate: newDue || null })
          }
          disabled={createMutation.isPending || !newTitle.trim()}
          data-testid="button-add-milestone"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {milestones.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No milestones yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {milestones.map((m) => (
            <li
              key={m.id}
              className="flex items-center gap-2 group"
              data-testid={`milestone-${m.id}`}
            >
              <Checkbox
                checked={!!m.doneAt}
                onCheckedChange={(checked) => toggleMutation.mutate({ id: m.id, done: !!checked })}
                data-testid={`checkbox-milestone-${m.id}`}
              />
              <span className={"flex-1 text-sm " + (m.doneAt ? "line-through text-muted-foreground" : "")}>
                {m.title}
              </span>
              <Input
                type="date"
                value={m.dueDate ? new Date(m.dueDate).toISOString().slice(0, 10) : ""}
                onChange={(e) =>
                  updateDueMutation.mutate({ id: m.id, dueDate: e.target.value || null })
                }
                className="w-[140px] h-7 text-xs"
                aria-label="Due date"
                data-testid={`input-milestone-due-${m.id}`}
              />
              <Button
                size="icon"
                variant="ghost"
                className="opacity-0 group-hover:opacity-100"
                onClick={() => deleteMutation.mutate(m.id)}
                data-testid={`button-delete-milestone-${m.id}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ArtifactsPanel({ planId }: { planId: string }) {
  const { toast } = useToast();
  const [attachOpen, setAttachOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pickedImportId, setPickedImportId] = useState<string>("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");

  const { data: artifacts = [] } = useQuery<ProjectArtifact[]>({
    queryKey: ["/api/plans", planId, "artifacts"],
  });

  const { data: imports = [] } = useQuery<ImportedConversation[]>({
    queryKey: ["/api/imports"],
    enabled: attachOpen,
  });

  type AttachArtifactPayload =
    | { kind: "import"; refId: string; title?: string }
    | { kind: "link"; url: string; title: string };
  const attachMutation = useMutation({
    mutationFn: async (payload: AttachArtifactPayload) => {
      const res = await apiRequest("POST", `/api/plans/${planId}/artifacts`, payload);
      return (await res.json()) as ProjectArtifact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans", planId, "artifacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/imports"] });
      setAttachOpen(false);
      setLinkOpen(false);
      setPickedImportId("");
      setLinkUrl("");
      setLinkTitle("");
      toast({ title: "Attached" });
    },
    onError: (err) => toast({ title: "Couldn't attach", description: parseApiError(err), variant: "destructive" }),
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, title }: { file: File; title: string }) => {
      const form = new FormData();
      form.append("file", file);
      if (title) form.append("title", title);
      const res = await fetch(`/api/plans/${planId}/artifacts/upload`, {
        method: "POST",
        body: form,
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || `Upload failed (${res.status})`);
      }
      return (await res.json()) as ProjectArtifact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans", planId, "artifacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      setUploadOpen(false);
      setUploadFile(null);
      setUploadTitle("");
      toast({ title: "File uploaded" });
    },
    onError: (err) =>
      toast({ title: "Couldn't upload", description: parseApiError(err), variant: "destructive" }),
  });

  const detachMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/plans/${planId}/artifacts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans", planId, "artifacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/imports"] });
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Artifacts</h3>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => setAttachOpen(true)} data-testid="button-attach-import">
            <Paperclip className="w-3 h-3 mr-1.5" /> Import
          </Button>
          <Button size="sm" variant="outline" onClick={() => setLinkOpen(true)} data-testid="button-attach-link">
            <Link2 className="w-3 h-3 mr-1.5" /> Link
          </Button>
          <Button size="sm" variant="outline" onClick={() => setUploadOpen(true)} data-testid="button-attach-upload">
            <Upload className="w-3 h-3 mr-1.5" /> Upload
          </Button>
        </div>
      </div>

      {artifacts.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Attach an imported chat, a link, or upload a file to ground DW in source material.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {artifacts.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-2 p-2 rounded border group"
              data-testid={`artifact-${a.id}`}
            >
              {a.kind === "import" ? (
                <FileDown className="w-3.5 h-3.5 text-muted-foreground" />
              ) : a.kind === "link" ? (
                <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
              ) : (
                <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
              )}
              <span className="flex-1 text-sm truncate">
                {a.url ? (
                  <a href={a.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {a.title}
                  </a>
                ) : a.kind === "upload" ? (
                  <a
                    href={`/api/plans/${planId}/artifacts/${a.id}/file`}
                    className="hover:underline"
                    data-testid={`link-download-${a.id}`}
                  >
                    {a.title}
                  </a>
                ) : (
                  a.title
                )}
                {a.kind === "upload" && a.fileSize ? (
                  <span className="ml-2 text-[11px] text-muted-foreground">
                    {formatFileSize(a.fileSize)}
                  </span>
                ) : null}
              </span>
              <Badge variant="outline" className="text-[10px]">
                {a.kind}
              </Badge>
              {a.kind === "upload" ? (
                <Button
                  size="icon"
                  variant="ghost"
                  className="opacity-0 group-hover:opacity-100"
                  asChild
                  data-testid={`button-download-${a.id}`}
                >
                  <a href={`/api/plans/${planId}/artifacts/${a.id}/file`}>
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </Button>
              ) : null}
              <Button
                size="icon"
                variant="ghost"
                className="opacity-0 group-hover:opacity-100"
                onClick={() => detachMutation.mutate(a.id)}
                data-testid={`button-detach-${a.id}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={attachOpen} onOpenChange={setAttachOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attach an imported conversation</DialogTitle>
            <DialogDescription>
              DW will use the import's summary as ongoing context for this plan.
            </DialogDescription>
          </DialogHeader>
          {imports.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No imports yet. Import a ChatGPT conversation first from the Imports page.
            </p>
          ) : (
            <Select value={pickedImportId} onValueChange={setPickedImportId}>
              <SelectTrigger data-testid="select-import">
                <SelectValue placeholder="Pick an import…" />
              </SelectTrigger>
              <SelectContent>
                {imports.map((imp) => (
                  <SelectItem key={imp.id} value={imp.id}>
                    {imp.originalTitle.slice(0, 80)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttachOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => pickedImportId && attachMutation.mutate({ kind: "import", refId: pickedImportId })}
              disabled={!pickedImportId || attachMutation.isPending}
              data-testid="button-confirm-attach-import"
            >
              Attach
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attach a link</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="link-title">Title</Label>
              <Input
                id="link-title"
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                placeholder="What is it?"
                data-testid="input-link-title"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://…"
                data-testid="input-link-url"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                linkUrl &&
                linkTitle &&
                attachMutation.mutate({ kind: "link", url: linkUrl, title: linkTitle })
              }
              disabled={!linkUrl || !linkTitle || attachMutation.isPending}
              data-testid="button-confirm-attach-link"
            >
              Attach
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload a file</DialogTitle>
            <DialogDescription>
              Drop in a PDF, image, or notes file (≤ 25 MB). DW will use it as
              source material for this plan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="upload-file">File</Label>
              <Input
                id="upload-file"
                type="file"
                accept=".pdf,.txt,.md,.csv,.doc,.docx,image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setUploadFile(f);
                  if (f && !uploadTitle) setUploadTitle(f.name);
                }}
                data-testid="input-upload-file"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="upload-title">Title (optional)</Label>
              <Input
                id="upload-title"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder={uploadFile?.name ?? "What is it?"}
                data-testid="input-upload-title"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                uploadFile &&
                uploadMutation.mutate({ file: uploadFile, title: uploadTitle.trim() })
              }
              disabled={!uploadFile || uploadMutation.isPending}
              data-testid="button-confirm-upload"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Uploading…
                </>
              ) : (
                "Upload"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PlanDetailPage() {
  const [, params] = useRoute<{ planId: string }>("/plans/:planId");
  const [, navigate] = useLocation();
  const planId = params?.planId || "";
  usePageMeta("Plan", "Plan workspace with DW conversation, milestones, and artifacts.");
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editStatus, setEditStatus] = useState<ProjectStatus>("active");

  const { data: plan, isLoading, error } = useQuery<Project>({
    queryKey: ["/api/plans", planId],
    enabled: !!planId,
  });

  type UpdatePlanPayload = {
    name?: string;
    description?: string | null;
    status?: ProjectStatus;
  };
  const updateMutation = useMutation({
    mutationFn: async (payload: UpdatePlanPayload) => {
      const res = await apiRequest("PATCH", `/api/plans/${planId}`, payload);
      return (await res.json()) as Project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans", planId] });
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      setEditOpen(false);
      toast({ title: "Plan updated" });
    },
    onError: (err) => toast({ title: "Couldn't update", description: parseApiError(err), variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/plans/${planId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      toast({ title: "Plan deleted" });
      navigate("/plans");
    },
  });

  if (!planId) return null;
  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground">Loading plan…</div>
    );
  }
  if (error || !plan) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-muted-foreground">Plan not found.</p>
        <Link href="/plans">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to plans
          </Button>
        </Link>
      </div>
    );
  }

  const openEdit = () => {
    setEditName(plan.name);
    setEditDesc(plan.description || "");
    setEditStatus((plan.status as ProjectStatus | null) ?? "active");
    setEditOpen(true);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <PageHeader
        title={plan.name}
        backPath="/plans"
        rightContent={
          <Button size="sm" variant="outline" onClick={openEdit} data-testid="button-edit-plan">
            <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit
          </Button>
        }
      />

      <div className="flex-1 overflow-hidden">
        {/* Mobile: tabbed */}
        <div className="lg:hidden h-full">
          <Tabs defaultValue="chat" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3 mx-4 mt-3" style={{ width: "auto" }}>
              <TabsTrigger value="chat" data-testid="tab-chat">Chat</TabsTrigger>
              <TabsTrigger value="milestones" data-testid="tab-milestones">Milestones</TabsTrigger>
              <TabsTrigger value="artifacts" data-testid="tab-artifacts">Artifacts</TabsTrigger>
            </TabsList>
            <TabsContent value="chat" className="flex-1 overflow-hidden m-0">
              <PlanChatPanel planId={planId} />
            </TabsContent>
            <TabsContent value="milestones" className="flex-1 overflow-auto p-4">
              <MilestonesPanel planId={planId} />
            </TabsContent>
            <TabsContent value="artifacts" className="flex-1 overflow-auto p-4">
              <ArtifactsPanel planId={planId} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Desktop: 3-panel grid */}
        <div className="hidden lg:grid h-full grid-cols-[1fr_360px] gap-0">
          <div className="border-r flex flex-col">
            <PlanChatPanel planId={planId} />
          </div>
          <div className="flex flex-col overflow-hidden">
            <div className="p-4 border-b overflow-auto max-h-[40%]">
              <ArtifactsPanel planId={planId} />
            </div>
            <div className="p-4 overflow-auto flex-1">
              <MilestonesPanel planId={planId} />
            </div>
          </div>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                data-testid="input-edit-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-desc">Description</Label>
              <Textarea
                id="edit-desc"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={3}
                data-testid="input-edit-description"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-status">Status</Label>
              <Select value={editStatus} onValueChange={(v) => setEditStatus(v as ProjectStatus)}>
                <SelectTrigger id="edit-status" data-testid="select-edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["active", "parked", "done"] as ProjectStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-wrap gap-2">
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm("Delete this plan and its conversation? This can't be undone.")) {
                  deleteMutation.mutate();
                }
              }}
              data-testid="button-delete-plan"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
            </Button>
            <div className="flex-1" />
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                updateMutation.mutate({
                  name: editName,
                  description: editDesc || null,
                  status: editStatus,
                })
              }
              disabled={updateMutation.isPending}
              data-testid="button-save-plan"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
