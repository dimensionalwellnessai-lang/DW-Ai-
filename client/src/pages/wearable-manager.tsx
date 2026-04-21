import { useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { PageHeader } from "@/components/page-header";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import type { LucideIcon } from "lucide-react";
import {
  Apple, Activity, Smartphone, CircleDot, Mountain, Upload, RefreshCw, Unplug, Plug,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type WearableSource = "apple_health" | "screen_time" | "whoop" | "oura" | "garmin";

interface WearableSourceItem {
  source: WearableSource;
  label: string;
  category: "health" | "screen_time";
  ingestKind: "export" | "oauth";
  description: string;
  configured: boolean;
  connected: boolean;
  lastSyncAt: string | null;
  status: string;
  errorText: string | null;
  recordsImported: number;
}

interface SourcesResponse { sources: WearableSourceItem[]; }

interface MutationError { message?: string; body?: { error?: string; detail?: string } }

function errMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object") {
    const e = err as MutationError;
    return e.body?.detail || e.body?.error || e.message || fallback;
  }
  return fallback;
}

const ICON: Record<WearableSource, LucideIcon> = {
  apple_health: Apple,
  screen_time: Smartphone,
  whoop: Activity,
  oura: CircleDot,
  garmin: Mountain,
};

function formatLastSync(iso: string | null): string {
  if (!iso) return "Never synced";
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`;
  return d.toLocaleDateString();
}

export default function WearableManagerPage() {
  usePageMeta("Wearables & Screen Time | DW Wellness AI");
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [screenTimeText, setScreenTimeText] = useState("");

  const { data, isLoading } = useQuery<SourcesResponse>({
    queryKey: ["/api/wearables/sources"],
  });

  const connectMutation = useMutation({
    mutationFn: (source: string) => apiRequest("POST", `/api/wearables/connect/${source}`),
    onSuccess: async (res, source) => {
      const body = await (res as Response).json().catch(() => ({}));
      if (body?.authUrl) {
        // OAuth source — kick off provider redirect.
        window.location.href = body.authUrl;
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["/api/wearables/sources"] });
      toast({ title: `${source} connected` });
    },
    onError: (err: unknown) => {
      const e = err as MutationError | undefined;
      const msg = e?.body?.error === "not_configured"
        ? "Provider keys aren't configured yet."
        : errMessage(err, "Failed to connect");
      toast({ title: msg, variant: "destructive" });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: (source: string) => apiRequest("POST", `/api/wearables/disconnect/${source}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wearables/sources"] });
      toast({ title: "Disconnected" });
    },
  });

  const syncMutation = useMutation({
    mutationFn: (source: string) => apiRequest("POST", `/api/wearables/sync/${source}`),
    onSuccess: async (res) => {
      const body = await (res as Response).json().catch(() => ({}));
      queryClient.invalidateQueries({ queryKey: ["/api/wearables/sources"] });
      toast({ title: body?.hint || body?.note || "Sync triggered" });
    },
    onError: (err: unknown) => toast({ title: errMessage(err, "Sync failed"), variant: "destructive" }),
  });

  const appleHealthMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/wearables/apple-health/import", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || "Import failed");
      return res.json();
    },
    onSuccess: (body) => {
      queryClient.invalidateQueries({ queryKey: ["/api/wearables/sources"] });
      toast({ title: `Imported ${body?.inserted ?? 0} new records (${body?.parsed ?? 0} parsed)` });
    },
    onError: (err: unknown) => toast({ title: errMessage(err, "Import failed"), variant: "destructive" }),
  });

  const screenTimeMutation = useMutation({
    mutationFn: (text: string) => apiRequest("POST", "/api/wearables/screen-time/import", { text }),
    onSuccess: async (res) => {
      const body = await (res as Response).json().catch(() => ({}));
      queryClient.invalidateQueries({ queryKey: ["/api/wearables/sources"] });
      toast({ title: `Imported ${body?.inserted ?? 0} day(s)` });
      setScreenTimeText("");
    },
    onError: (err: unknown) => toast({ title: errMessage(err, "Import failed"), variant: "destructive" }),
  });

  return (
    <div className="min-h-screen pb-24">
      <PageHeader title="Wearables & Screen Time" />
      <div className="max-w-2xl mx-auto px-4 space-y-4 pt-2 page-enter">
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-xs text-muted-foreground">
            Apple Health and Screen Time are imported from your iPhone export.
            Whoop, Oura and Garmin connect over the provider's account — they're
            shown here so you can wire them up as soon as the keys are set.
            Imported metrics flow into the Body dashboard, mood correlations,
            and DW chat context.{" "}
            <Link href="/health-data" className="underline" data-testid="link-health-data">
              Open Body dashboard →
            </Link>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
        ) : (
          <div className="space-y-3">
            {data?.sources.map((s) => {
              const Icon = ICON[s.source];
              return (
                <Card key={s.source} data-testid={`card-source-${s.source}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Icon className="w-4 h-4 text-primary" />
                      <span className="flex-1">{s.label}</span>
                      {!s.configured && <Badge variant="outline" data-testid={`badge-not-configured-${s.source}`}>Not configured</Badge>}
                      {s.connected && s.configured && <Badge variant="secondary" data-testid={`badge-connected-${s.source}`}>Connected</Badge>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <p className="text-xs text-muted-foreground">{s.description}</p>
                    <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                      <span data-testid={`text-last-sync-${s.source}`}>Last sync: {formatLastSync(s.lastSyncAt)}</span>
                      {s.recordsImported > 0 && <span>{s.recordsImported} records</span>}
                      {s.errorText && <span className="text-destructive">⚠ {s.errorText}</span>}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {s.connected ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => disconnectMutation.mutate(s.source)}
                          disabled={disconnectMutation.isPending}
                          data-testid={`button-disconnect-${s.source}`}
                        >
                          <Unplug className="w-3.5 h-3.5 mr-1" /> Disconnect
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => connectMutation.mutate(s.source)}
                          disabled={!s.configured || connectMutation.isPending}
                          data-testid={`button-connect-${s.source}`}
                        >
                          <Plug className="w-3.5 h-3.5 mr-1" /> Connect
                        </Button>
                      )}

                      {s.ingestKind === "oauth" && s.connected && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => syncMutation.mutate(s.source)}
                          disabled={syncMutation.isPending}
                          data-testid={`button-sync-${s.source}`}
                        >
                          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Sync now
                        </Button>
                      )}

                      {s.source === "apple_health" && (
                        <>
                          <input
                            type="file"
                            accept=".xml,.zip,application/xml,text/xml"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) appleHealthMutation.mutate(f);
                              e.target.value = "";
                            }}
                            data-testid="input-apple-health-file"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={appleHealthMutation.isPending}
                            data-testid="button-import-apple-health"
                          >
                            <Upload className="w-3.5 h-3.5 mr-1" />
                            {appleHealthMutation.isPending ? "Importing…" : "Import export.xml"}
                          </Button>
                        </>
                      )}

                      {s.source === "screen_time" && (
                        <Sheet>
                          <SheetTrigger asChild>
                            <Button size="sm" variant="outline" data-testid="button-import-screen-time">
                              <Upload className="w-3.5 h-3.5 mr-1" /> Paste data
                            </Button>
                          </SheetTrigger>
                          <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
                            <SheetHeader>
                              <SheetTitle>Import Screen Time</SheetTitle>
                            </SheetHeader>
                            <div className="space-y-3 mt-3 text-sm">
                              <p className="text-xs text-muted-foreground">
                                On iPhone, build a Shortcut that reads your Screen Time and outputs JSON like:
                              </p>
                              <pre className="text-[10px] bg-muted/50 p-2 rounded overflow-x-auto">{`{ "days": [
  { "dateKey": "2026-04-20", "totalMinutes": 312,
    "byCategory": { "Social": 88, "Productivity": 35 },
    "byApp":      { "Instagram": 62, "Slack": 22 } }
] }`}</pre>
                              <p className="text-xs text-muted-foreground">
                                CSV is also accepted with a header row of <code>dateKey,totalMinutes,Social,Productivity,…</code>.
                              </p>
                              <Textarea
                                rows={8}
                                placeholder="Paste JSON or CSV here…"
                                value={screenTimeText}
                                onChange={(e) => setScreenTimeText(e.target.value)}
                                data-testid="textarea-screen-time"
                              />
                              <Button
                                onClick={() => screenTimeMutation.mutate(screenTimeText)}
                                disabled={!screenTimeText.trim() || screenTimeMutation.isPending}
                                data-testid="button-submit-screen-time"
                              >
                                {screenTimeMutation.isPending ? "Importing…" : "Import"}
                              </Button>
                            </div>
                          </SheetContent>
                        </Sheet>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Card className="bg-muted/30">
          <CardContent className="p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground mb-1">Apple Health export steps</p>
            <ol className="list-decimal pl-4 space-y-0.5">
              <li>Open the Health app on your iPhone.</li>
              <li>Tap your profile picture → "Export All Health Data".</li>
              <li>AirDrop or share the resulting <code>export.zip</code> to your computer.</li>
              <li>Unzip it and upload the inner <code>export.xml</code> here.</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
