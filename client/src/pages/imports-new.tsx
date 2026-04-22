import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Upload, ClipboardPaste, ArrowLeft, FileJson, Loader2, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ImportedConversation } from "@shared/schema";
import { continueWithImport } from "./imports";

type ExportPreview = {
  index: number;
  title: string;
  messageCount: number;
  createTime: number | null;
  updateTime: number | null;
};

type ExportPreviewResponse = {
  stagingId: string;
  total: number;
  conversations: ExportPreview[];
};

export default function ImportsNewPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [preview, setPreview] = useState<ExportPreviewResponse | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState("");

  const [pasteText, setPasteText] = useState("");
  const [pasteTitle, setPasteTitle] = useState("");

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/imports/chatgpt-export", { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Upload failed");
      }
      return (await res.json()) as ExportPreviewResponse;
    },
    onSuccess: (data) => {
      setPreview(data);
      setSelected(new Set());
      toast({ title: "Export loaded", description: `Found ${data.total} conversations. Pick which ones to import.` });
    },
    onError: (err: Error) => toast({ title: "Couldn't read export", description: err.message, variant: "destructive" }),
  });

  const continueAndGo = async (id: string) => {
    try {
      const res = await apiRequest("POST", `/api/imports/${id}/continue`, {});
      const data = (await res.json()) as Parameters<typeof continueWithImport>[0];
      continueWithImport(data, navigate, toast);
    } catch (err) {
      console.error(err);
      toast({ title: "Couldn't open chat", description: "Open it from the imports list.", variant: "destructive" });
      navigate("/imports");
    }
  };

  const commitMutation = useMutation({
    mutationFn: async () => {
      if (!preview) throw new Error("No staged export");
      const res = await apiRequest("POST", "/api/imports/chatgpt-export/commit", {
        stagingId: preview.stagingId,
        indexes: Array.from(selected),
      });
      return (await res.json()) as { imported: number; conversations: ImportedConversation[] };
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/imports"] });
      toast({ title: `Imported ${data.imported} ${data.imported === 1 ? "conversation" : "conversations"}` });
      // If they imported just one, jump straight into continuing it.
      if (data.imported === 1 && data.conversations[0]) {
        await continueAndGo(data.conversations[0].id);
      } else {
        navigate("/imports");
      }
    },
    onError: (err: Error) => toast({ title: "Import failed", description: err.message, variant: "destructive" }),
  });

  const pasteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/imports/raw-paste", {
        text: pasteText,
        title: pasteTitle || undefined,
      });
      return (await res.json()) as ImportedConversation;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/imports"] });
      toast({ title: "Imported", description: "Picking up where you left off…" });
      await continueAndGo(data.id);
    },
    onError: (err: Error) => toast({ title: "Couldn't import", description: err.message, variant: "destructive" }),
  });

  const filteredPreview = preview?.conversations.filter((c) =>
    filter ? c.title.toLowerCase().includes(filter.toLowerCase()) : true,
  ) || [];

  function toggleAll(visible: ExportPreview[]) {
    const allSelected = visible.every((c) => selected.has(c.index));
    const next = new Set(selected);
    if (allSelected) {
      visible.forEach((c) => next.delete(c.index));
    } else {
      visible.forEach((c) => next.add(c.index));
    }
    setSelected(next);
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 space-y-6" data-testid="page-imports-new">
      <Link href="/imports">
        <Button variant="ghost" size="sm" data-testid="button-back">
          <ArrowLeft className="mr-2 h-4 w-4" /> All imports
        </Button>
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import a chat</h1>
        <p className="text-sm text-muted-foreground">
          Bring in a thread from ChatGPT or paste the text directly. DW will read it and pick up where you left off.
        </p>
      </div>

      <Tabs defaultValue="export">
        <TabsList>
          <TabsTrigger value="export" data-testid="tab-export">
            <FileJson className="mr-2 h-4 w-4" />
            ChatGPT export
          </TabsTrigger>
          <TabsTrigger value="paste" data-testid="tab-paste">
            <ClipboardPaste className="mr-2 h-4 w-4" />
            Paste text
          </TabsTrigger>
        </TabsList>

        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upload conversations.json</CardTitle>
              <CardDescription>
                In ChatGPT: Settings → Data Controls → Export data. You'll get a zip — drop the
                <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">conversations.json</code>
                file here.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                disabled={uploadMutation.isPending}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadMutation.mutate(f);
                }}
                data-testid="input-export-file"
              />
              {uploadMutation.isPending && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Reading export…
                </p>
              )}
            </CardContent>
          </Card>

          {preview && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Pick conversations ({selected.size} selected)
                </CardTitle>
                <CardDescription>
                  Each one gets summarized and indexed so DW can continue it.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Filter by title…"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    data-testid="input-filter"
                  />
                  <Button
                    variant="outline"
                    onClick={() => toggleAll(filteredPreview)}
                    data-testid="button-toggle-all"
                  >
                    {filteredPreview.every((c) => selected.has(c.index)) ? "Deselect all" : "Select all"}
                  </Button>
                </div>
                <ScrollArea className="h-80 rounded-md border">
                  <div className="divide-y">
                    {filteredPreview.map((c) => {
                      const isSel = selected.has(c.index);
                      return (
                        <label
                          key={c.index}
                          className="flex items-start gap-3 p-3 hover-elevate cursor-pointer"
                          data-testid={`row-conversation-${c.index}`}
                        >
                          <Checkbox
                            checked={isSel}
                            onCheckedChange={(v) => {
                              const next = new Set(selected);
                              if (v) next.add(c.index);
                              else next.delete(c.index);
                              setSelected(next);
                            }}
                            data-testid={`checkbox-conversation-${c.index}`}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{c.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {c.messageCount} messages
                              {c.updateTime
                                ? ` · ${new Date(c.updateTime * 1000).toLocaleDateString()}`
                                : ""}
                            </p>
                          </div>
                          {isSel && <Check className="h-4 w-4 text-primary mt-0.5" />}
                        </label>
                      );
                    })}
                    {filteredPreview.length === 0 && (
                      <p className="p-6 text-center text-sm text-muted-foreground">No matches.</p>
                    )}
                  </div>
                </ScrollArea>
                <Button
                  onClick={() => commitMutation.mutate()}
                  disabled={selected.size === 0 || commitMutation.isPending}
                  className="w-full"
                  data-testid="button-commit"
                >
                  {commitMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing & summarizing…
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" /> Import {selected.size}{" "}
                      {selected.size === 1 ? "conversation" : "conversations"}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="paste" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Paste a thread</CardTitle>
              <CardDescription>
                Anything goes — copy/paste a transcript, an email thread, notes from another assistant. DW will
                normalize it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="paste-title">Title (optional)</Label>
                <Input
                  id="paste-title"
                  value={pasteTitle}
                  onChange={(e) => setPasteTitle(e.target.value)}
                  placeholder="What was this about?"
                  data-testid="input-paste-title"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="paste-text">Text</Label>
                <Textarea
                  id="paste-text"
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Paste the conversation here…"
                  rows={14}
                  data-testid="input-paste-text"
                />
                <p className="text-xs text-muted-foreground">{pasteText.length.toLocaleString()} characters</p>
              </div>
              <Button
                onClick={() => pasteMutation.mutate()}
                disabled={pasteText.trim().length === 0 || pasteMutation.isPending}
                className="w-full"
                data-testid="button-import-paste"
              >
                {pasteMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing…
                  </>
                ) : (
                  <>
                    <Badge variant="secondary" className="mr-2">AI</Badge>
                    Normalize & import
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
