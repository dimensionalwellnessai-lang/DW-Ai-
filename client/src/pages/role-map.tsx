import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUp,
  Check,
  Loader2,
  Map,
  Mic,
  Pencil,
  Plus,
  Send,
  Sparkles,
  Target,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { apiRequest, parseApiError } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePageMeta } from "@/hooks/use-page-meta";
import { cn } from "@/lib/utils";

// ─── Types (mirror server) ───────────────────────────────────────────────────

interface RoleMapLevel {
  level: number;
  title: string;
  description?: string;
  milestones: Array<{ id: string; title: string; done?: boolean }>;
  activities: string[];
  habits: string[];
  mindsets: string[];
}

interface RoleMapDto {
  id: string;
  targetRole: string;
  identityStatement?: string | null;
  gapSummary?: string | null;
  currentLevel: number;
  status: "draft" | "active" | "archived";
  levels: RoleMapLevel[];
  createdAt?: string;
}

interface InterviewMessage {
  role: "assistant" | "user";
  content: string;
}

interface InterviewDto {
  id: string;
  messages: InterviewMessage[];
  answerCount: number;
  canSynthesize: boolean;
}

// ─── Interview view ──────────────────────────────────────────────────────────

function InterviewView({
  interview,
  onSynthesized,
  onAbandoned,
}: {
  interview: InterviewDto;
  onSynthesized: () => void;
  onAbandoned: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<InterviewMessage[]>(interview.messages);
  const [canSynthesize, setCanSynthesize] = useState(interview.canSynthesize);
  const [readySuggested, setReadySuggested] = useState(false);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest(
        "POST",
        `/api/role-maps/interview/${interview.id}/message`,
        { message },
      );
      return res.json() as Promise<{
        reply: string;
        canSynthesize: boolean;
        readySuggested: boolean;
      }>;
    },
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      setCanSynthesize(data.canSynthesize);
      setReadySuggested(data.readySuggested);
    },
    onError: async (err) => {
      // Roll back the optimistic user message so it can be retried.
      setMessages((prev) =>
        prev.length && prev[prev.length - 1].role === "user"
          ? prev.slice(0, -1)
          : prev,
      );
      toast({
        title: "DW couldn't respond",
        description: await parseApiError(err),
        variant: "destructive",
      });
    },
  });

  const synthesizeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        `/api/role-maps/interview/${interview.id}/synthesize`,
        {},
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/role-maps"] });
      queryClient.invalidateQueries({ queryKey: ["/api/role-maps/interview/active"] });
      onSynthesized();
    },
    onError: async (err) => {
      toast({
        title: "Couldn't build your map",
        description: await parseApiError(err),
        variant: "destructive",
      });
    },
  });

  const abandonMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/role-maps/interview/${interview.id}/abandon`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/role-maps/interview/active"] });
      onAbandoned();
    },
  });

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || sendMutation.isPending) return;
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    sendMutation.mutate(trimmed);
  };

  const busy = sendMutation.isPending || synthesizeMutation.isPending;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line",
              m.role === "assistant"
                ? "bg-muted text-foreground"
                : "bg-primary text-primary-foreground ml-auto",
            )}
            data-testid={`interview-message-${i}`}
          >
            {m.content}
          </div>
        ))}
        {sendMutation.isPending && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm px-2">
            <Loader2 className="w-4 h-4 animate-spin" /> DW is thinking…
          </div>
        )}
        {synthesizeMutation.isPending && (
          <div className="flex items-center gap-2 text-primary text-sm px-2">
            <Sparkles className="w-4 h-4 animate-pulse" /> Building your Role Map…
          </div>
        )}
        <div ref={endRef} />
      </div>

      {readySuggested && !synthesizeMutation.isPending && (
        <div className="px-4 pb-2">
          <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
            DW has enough to map your path. Keep going, or build it now.
          </div>
        </div>
      )}

      <div className="border-t bg-background px-4 py-3 space-y-2">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Answer in your own words…"
            className="min-h-[44px] max-h-[140px] resize-none text-sm"
            rows={1}
            disabled={busy}
            data-testid="input-interview-answer"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || busy}
            data-testid="button-send-answer"
            aria-label="Send answer"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <button
            className="text-xs text-muted-foreground underline"
            onClick={() => abandonMutation.mutate()}
            disabled={busy || abandonMutation.isPending}
            data-testid="button-abandon-interview"
          >
            Start over later
          </button>
          <Button
            size="sm"
            variant={readySuggested ? "default" : "outline"}
            onClick={() => synthesizeMutation.mutate()}
            disabled={!canSynthesize || busy}
            data-testid="button-build-map"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Build my Role Map
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1">
          <Mic className="w-3 h-3" />
          Prefer voice? Ask DW to "build my role map" in a voice conversation.
        </p>
      </div>
    </div>
  );
}

// ─── Map view ────────────────────────────────────────────────────────────────

function LevelCard({
  level,
  isCurrent,
  isNext,
  onAdopt,
  onSetCurrent,
  adopting,
}: {
  level: RoleMapLevel;
  isCurrent: boolean;
  isNext: boolean;
  onAdopt: (kind: "goal" | "habit", title: string) => void;
  onSetCurrent: () => void;
  adopting: string | null;
}) {
  const [expanded, setExpanded] = useState(isCurrent || isNext);

  return (
    <div
      className={cn(
        "rounded-2xl border transition-colors",
        isCurrent
          ? "border-primary bg-primary/5"
          : isNext
            ? "border-primary/40"
            : "border-border",
      )}
      data-testid={`level-card-${level.level}`}
    >
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        data-testid={`button-toggle-level-${level.level}`}
      >
        <span
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0",
            isCurrent ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          {level.level}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug">{level.title}</p>
          {level.description && (
            <p className="text-xs text-muted-foreground leading-snug">{level.description}</p>
          )}
        </div>
        {isCurrent && (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary shrink-0">
            You are here
          </span>
        )}
        {isNext && !isCurrent && (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0 flex items-center gap-0.5">
            <ArrowUp className="w-3 h-3" /> Next
          </span>
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {level.milestones.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Milestones
              </p>
              <ul className="space-y-1.5">
                {level.milestones.map((m) => (
                  <li key={m.id} className="flex items-start gap-2 text-sm">
                    <Target className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                    <span className="flex-1">{m.title}</span>
                    <button
                      className="text-[11px] text-primary underline shrink-0 disabled:opacity-50"
                      onClick={() => onAdopt("goal", m.title)}
                      disabled={adopting !== null}
                      data-testid={`button-adopt-goal-${m.id}`}
                    >
                      {adopting === m.title ? "Adding…" : "+ Goal"}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {level.habits.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Habits to build
              </p>
              <ul className="space-y-1.5">
                {level.habits.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="w-3.5 h-3.5 mt-0.5 text-emerald-500 shrink-0" />
                    <span className="flex-1">{h}</span>
                    <button
                      className="text-[11px] text-primary underline shrink-0 disabled:opacity-50"
                      onClick={() => onAdopt("habit", h)}
                      disabled={adopting !== null}
                      data-testid={`button-adopt-habit-${level.level}-${i}`}
                    >
                      {adopting === h ? "Adding…" : "+ Habit"}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {level.activities.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Activities
              </p>
              <p className="text-sm text-muted-foreground">{level.activities.join(" · ")}</p>
            </div>
          )}
          {level.mindsets.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Ways of thinking
              </p>
              <ul className="space-y-1">
                {level.mindsets.map((m, i) => (
                  <li key={i} className="text-sm italic text-muted-foreground">
                    "{m}"
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!isCurrent && (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-muted-foreground"
              onClick={onSetCurrent}
              data-testid={`button-set-current-${level.level}`}
            >
              I'm at this level
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function MapView({
  map,
  onRevisit,
}: {
  map: RoleMapDto;
  onRevisit: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingRole, setEditingRole] = useState(false);
  const [roleDraft, setRoleDraft] = useState(map.targetRole);
  const [adopting, setAdopting] = useState<string | null>(null);

  const patchMutation = useMutation({
    mutationFn: async (patch: Partial<Pick<RoleMapDto, "targetRole" | "currentLevel" | "status">>) => {
      const res = await apiRequest("PATCH", `/api/role-maps/${map.id}`, patch);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/role-maps"] });
    },
    onError: async (err) => {
      toast({ title: "Couldn't save", description: await parseApiError(err), variant: "destructive" });
    },
  });

  const adoptMutation = useMutation({
    mutationFn: async ({ kind, title }: { kind: "goal" | "habit"; title: string }) => {
      const res = await apiRequest("POST", `/api/role-maps/${map.id}/adopt`, { kind, title });
      return res.json();
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      toast({
        title: vars.kind === "goal" ? "Added to your goals" : "Added to your habits",
        description: vars.title,
      });
    },
    onError: async (err) => {
      toast({ title: "Couldn't add", description: await parseApiError(err), variant: "destructive" });
    },
    onSettled: () => setAdopting(null),
  });

  const handleAdopt = (kind: "goal" | "habit", title: string) => {
    setAdopting(title);
    adoptMutation.mutate({ kind, title });
  };

  const levels = [...(map.levels ?? [])].sort((a, b) => b.level - a.level);
  const maxLevel = levels.length ? Math.max(...levels.map((l) => l.level)) : map.currentLevel;
  const isDraft = map.status === "draft";

  return (
    <div className="px-4 py-4 space-y-4 pb-24">
      {isDraft && (
        <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4 space-y-3">
          <p className="text-sm font-medium">Here's the map DW built from your interview.</p>
          <p className="text-xs text-muted-foreground">
            Review it, rename anything, then accept it — DW will use it to guide you in every conversation.
          </p>
          <Button
            size="sm"
            onClick={() => patchMutation.mutate({ status: "active" })}
            disabled={patchMutation.isPending}
            data-testid="button-accept-map"
          >
            <Check className="w-3.5 h-3.5 mr-1.5" />
            Accept my Role Map
          </Button>
        </div>
      )}

      {/* Header card */}
      <div className="rounded-2xl border bg-card p-4 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          You are becoming
        </p>
        {editingRole ? (
          <div className="flex gap-2 items-center">
            <Input
              value={roleDraft}
              onChange={(e) => setRoleDraft(e.target.value)}
              className="text-base font-semibold"
              data-testid="input-edit-target-role"
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                const t = roleDraft.trim();
                if (t && t !== map.targetRole) patchMutation.mutate({ targetRole: t });
                setEditingRole(false);
              }}
              aria-label="Save role name"
              data-testid="button-save-role-name"
            >
              <Check className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => { setRoleDraft(map.targetRole); setEditingRole(false); }} aria-label="Cancel">
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-xl font-bold leading-tight" data-testid="text-target-role">
              {map.targetRole}
            </h2>
            <button
              onClick={() => setEditingRole(true)}
              className="p-1 text-muted-foreground"
              aria-label="Rename role"
              data-testid="button-rename-role"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>
        )}
        {map.identityStatement && (
          <p className="text-sm text-muted-foreground italic">{map.identityStatement}</p>
        )}
        <div className="flex items-center gap-2 pt-1">
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.round((map.currentLevel / Math.max(maxLevel, 1)) * 100)}%` }}
            />
          </div>
          <span className="text-xs font-medium text-muted-foreground shrink-0" data-testid="text-level-position">
            Level {map.currentLevel} of {maxLevel}
          </span>
        </div>
        {map.gapSummary && (
          <p className="text-xs text-muted-foreground leading-relaxed pt-1">{map.gapSummary}</p>
        )}
      </div>

      {/* Ladder — top level first */}
      <div className="space-y-2">
        {levels.map((lvl) => (
          <LevelCard
            key={lvl.level}
            level={lvl}
            isCurrent={lvl.level === map.currentLevel}
            isNext={lvl.level === map.currentLevel + 1}
            onAdopt={handleAdopt}
            onSetCurrent={() => patchMutation.mutate({ currentLevel: lvl.level })}
            adopting={adopting}
          />
        ))}
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={onRevisit}
        data-testid="button-revisit-interview"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        Revisit the interview — evolve my map
      </Button>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function RoleMapPage() {
  usePageMeta("Role Map", "Map who you're becoming and how to get to the next level.");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [view, setView] = useState<"auto" | "interview">("auto");

  const mapsQuery = useQuery<RoleMapDto[]>({ queryKey: ["/api/role-maps"] });
  const interviewQuery = useQuery<{ interview: InterviewDto | null }>({
    queryKey: ["/api/role-maps/interview/active"],
  });

  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/role-maps/interview/start", {});
      return res.json() as Promise<{ interview: InterviewDto }>;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/role-maps/interview/active"], {
        interview: data.interview,
      });
      setView("interview");
    },
    onError: async (err) => {
      toast({
        title: "Couldn't start the interview",
        description: await parseApiError(err),
        variant: "destructive",
      });
    },
  });

  const loading = mapsQuery.isLoading || interviewQuery.isLoading;
  const maps = mapsQuery.data ?? [];
  const activeInterview = interviewQuery.data?.interview ?? null;
  // Prefer draft (fresh from synthesis) so the user reviews it; else active map.
  const draftMap = maps.find((m) => m.status === "draft");
  const activeMap = maps.find((m) => m.status === "active");
  const displayMap = draftMap ?? activeMap ?? null;

  const showInterview =
    view === "interview" || (!!activeInterview && !draftMap);

  return (
    <div className="flex flex-col h-[100dvh] bg-background">
      <PageHeader title="Role Map" />
      <div className="flex-1 overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : showInterview && activeInterview ? (
          <InterviewView
            key={activeInterview.id}
            interview={activeInterview}
            onSynthesized={() => setView("auto")}
            onAbandoned={() => setView("auto")}
          />
        ) : displayMap ? (
          <div className="flex-1 overflow-y-auto">
            <MapView
              map={displayMap}
              onRevisit={() => startMutation.mutate()}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Map className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold">Map your next level</h2>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              DW interviews you about the life you want — the role you're growing
              into, what people living it actually do and how they think — then
              builds your personal ladder to get there.
            </p>
            <Button
              onClick={() => startMutation.mutate()}
              disabled={startMutation.isPending}
              data-testid="button-start-interview"
            >
              {startMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Start my interview
            </Button>
            <AnimatePresence />
          </div>
        )}
      </div>
    </div>
  );
}
