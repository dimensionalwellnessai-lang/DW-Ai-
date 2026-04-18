// /life-system/pillar/:id — conversation-first deep dive into a single pillar.
//
// The user fills out their Life System BY TALKING TO DW, not by typing into
// forms. This page is built around that:
//   - DW opens with the pillar's warm opening question.
//   - The user replies, DW listens, and the server quietly captures structured
//     fields (description, userVoice, laws, weeklyRhythm, nonNegotiables) from
//     what was said.
//   - "What DW has gathered so far" is a read-only summary that updates as the
//     conversation progresses, so the user can see their pillar coming alive.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { ArrowLeft, Loader2, MessageCircle, Send, Sparkles } from "lucide-react";
import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { usePageMeta } from "@/hooks/use-page-meta";
import {
  useLifeSystem,
  findPillarRow,
  PILLAR_BY_ID,
  LEVEL_META,
  type LifeSystemPillarId,
} from "@/lib/life-system";
import { isValidPillarId } from "@shared/lifeSystemTaxonomy";
import type { PillarContent, PillarConversationMessage } from "@shared/lifeSystemContent";

function PillarIcon({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) {
  const registry = LucideIcons as unknown as Record<string, LucideIcon>;
  const Icon = registry[name];
  if (!Icon) return null;
  return <Icon className={className} style={style} aria-hidden />;
}

export default function LifeSystemPillarDetailPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const pillarId = params.id;
  const { toast } = useToast();
  const { data, isLoading } = useLifeSystem();

  const def = isValidPillarId(pillarId ?? "") ? PILLAR_BY_ID[pillarId as LifeSystemPillarId] : null;

  usePageMeta(
    def ? `${def.label} — Life System` : "Pillar — Life System",
    def ? `Talk to DW about ${def.label} — your answers fill in this pillar.` : "Pillar detail.",
  );

  const row = def ? findPillarRow(data, def.id) : undefined;
  const savedContent: PillarContent = useMemo(
    () => ((row?.content && typeof row.content === "object") ? (row.content as PillarContent) : {}),
    [row],
  );

  // Local content mirror — updated on every converse round-trip so the
  // "What DW has gathered" summary feels live.
  const [content, setContent] = useState<PillarContent>(savedContent);
  useEffect(() => { setContent(savedContent); }, [savedContent]);

  const [conversation, setConversation] = useState<PillarConversationMessage[]>([]);
  useEffect(() => {
    setConversation(Array.isArray(savedContent.conversation) ? savedContent.conversation : []);
  }, [savedContent.conversation]);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [lastCaptured, setLastCaptured] = useState<string[]>([]);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to the newest message.
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [conversation, sending]);

  if (!def) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center" data-testid="page-pillar-not-found">
        <h1 className="text-2xl font-semibold mb-3">Unknown pillar</h1>
        <p className="text-muted-foreground mb-6">We couldn't find that pillar in your Life System.</p>
        <Button onClick={() => navigate("/life-system")} data-testid="button-back-life-system">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to My Life System
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  async function onSend() {
    if (!def) return;
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setLastCaptured([]);
    const optimistic: PillarConversationMessage = {
      role: "user",
      content: text,
      ts: new Date().toISOString(),
    };
    setConversation(prev => [...prev, optimistic]);
    setDraft("");
    try {
      const res = await apiRequest(
        "POST",
        `/api/life-system/pillars/${def.id}/converse`,
        { message: text },
      );
      const json = (await res.json()) as {
        reply: PillarConversationMessage;
        conversation: PillarConversationMessage[];
        capturedFields?: string[];
        content?: PillarContent;
      };
      setConversation(json.conversation);
      if (json.content) setContent(json.content);
      if (json.capturedFields?.length) setLastCaptured(json.capturedFields);
      // Refresh the source-of-truth cache too so other surfaces see the new
      // structured fields immediately.
      await queryClient.invalidateQueries({ queryKey: ["/api/life-system/pillars"] });
    } catch {
      setConversation(prev => prev.filter(m => m !== optimistic));
      toast({ title: "Couldn't reach DW", description: "Try again in a moment.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  const levelMeta = LEVEL_META[def.level];
  const hasAnyContent = !!(
    content.description || content.userVoice ||
    (content.laws && content.laws.length) ||
    (content.nonNegotiables && content.nonNegotiables.length) ||
    content.weeklyRhythm
  );

  // The conversation always opens with DW's pillar question. We render it as
  // an assistant bubble inline (without persisting) when no real conversation
  // exists yet, so the page never feels empty.
  const displayConversation: PillarConversationMessage[] = conversation.length
    ? conversation
    : [{
        role: "assistant",
        content: def.openingQuestion,
        ts: "opening",
      }];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6" data-testid={`page-pillar-detail-${def.id}`}>
      {/* ── Top bar ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" data-testid="link-back-life-system">
          <Link href="/life-system">
            <ArrowLeft className="w-4 h-4 mr-1" /> My Life System
          </Link>
        </Button>
      </div>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: `hsl(${def.color} / 0.15)` }}
          >
            <PillarIcon name={def.icon} className="w-6 h-6" style={{ color: `hsl(${def.color})` }} />
          </span>
          <div>
            <div className="text-xs uppercase tracking-wide" style={{ color: levelMeta.ringColor }}>
              {levelMeta.label}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight" data-testid="text-pillar-label">
              {def.label}
            </h1>
          </div>
        </div>
        <p className="text-muted-foreground" data-testid="text-pillar-summary">
          Talk to DW about this pillar — your answers fill it in for you. The more you share,
          the more your Life System reflects who you actually are.
        </p>
      </header>

      {/* ── Talk to DW (PRIMARY) ──────────────────────────────────────── */}
      <Card className="p-5 space-y-3" data-testid="card-converse">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Talk to DW about {def.label}</h2>
        </div>

        <div
          ref={chatScrollRef}
          className="rounded-md border bg-muted/30 max-h-[28rem] overflow-y-auto p-3 space-y-3"
          data-testid="list-conversation"
        >
          {displayConversation.map((m, i) => (
            <div
              key={`${m.ts}-${i}`}
              className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
              data-testid={`message-${m.role}-${i}`}
            >
              <div
                className={
                  m.role === "user"
                    ? "rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-3 py-2 max-w-[85%] whitespace-pre-wrap text-sm"
                    : "rounded-2xl rounded-bl-sm bg-background border px-3 py-2 max-w-[85%] whitespace-pre-wrap text-sm"
                }
              >
                {m.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start" data-testid="indicator-sending">
              <div className="rounded-2xl rounded-bl-sm bg-background border px-3 py-2 text-sm text-muted-foreground inline-flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> DW is listening…
              </div>
            </div>
          )}
        </div>

        {lastCaptured.length > 0 && (
          <div
            className="rounded-md bg-primary/5 border border-primary/20 px-3 py-2 text-xs text-primary inline-flex items-center gap-2"
            data-testid="indicator-captured"
          >
            <Sparkles className="w-3.5 h-3.5" />
            DW captured: {lastCaptured.map(prettyField).join(", ")}
          </div>
        )}

        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
            placeholder={conversation.length === 0 ? "Answer DW…" : `Tell DW more about ${def.label.toLowerCase()}…`}
            disabled={sending}
            data-testid="input-converse-message"
          />
          <Button
            onClick={onSend}
            disabled={sending || !draft.trim()}
            data-testid="button-send-converse"
          >
            <Send className="w-4 h-4 mr-1" /> Send
          </Button>
        </div>
      </Card>

      {/* ── What DW has gathered so far (READ-ONLY summary) ───────────── */}
      <Card className="p-5 space-y-4" data-testid="card-summary">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">What DW has gathered so far</h2>
          <span className="text-xs text-muted-foreground">Updated as you talk</span>
        </div>

        {!hasAnyContent && (
          <p className="text-sm text-muted-foreground" data-testid="text-summary-empty">
            Nothing yet. Reply to DW above and your answers will start filling in here.
          </p>
        )}

        {content.description && (
          <SummarySection title="How this pillar shows up in your life" testId="summary-description">
            <p className="text-sm whitespace-pre-wrap">{content.description}</p>
          </SummarySection>
        )}

        {content.userVoice && (
          <SummarySection title="In your own words" testId="summary-user-voice">
            <blockquote className="text-sm italic border-l-2 pl-3 border-primary/40 whitespace-pre-wrap">
              {content.userVoice}
            </blockquote>
          </SummarySection>
        )}

        {Array.isArray(content.laws) && content.laws.length > 0 && (
          <SummarySection title="Laws & principles" testId="summary-laws">
            <ul className="text-sm list-disc pl-5 space-y-1">
              {content.laws.map((law, i) => (
                <li key={i} data-testid={`text-law-${i}`}>{law}</li>
              ))}
            </ul>
          </SummarySection>
        )}

        {Array.isArray(content.nonNegotiables) && content.nonNegotiables.length > 0 && (
          <SummarySection title="Non-negotiables" testId="summary-non-negotiables">
            <ul className="text-sm list-disc pl-5 space-y-1">
              {content.nonNegotiables.map((n, i) => (
                <li key={i} data-testid={`text-non-negotiable-${i}`}>{n}</li>
              ))}
            </ul>
          </SummarySection>
        )}

        {content.weeklyRhythm && (
          <SummarySection title="Weekly rhythm" testId="summary-weekly-rhythm">
            <p className="text-sm whitespace-pre-wrap">{content.weeklyRhythm}</p>
          </SummarySection>
        )}
      </Card>
    </div>
  );
}

function SummarySection({
  title,
  testId,
  children,
}: {
  title: string;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5" data-testid={testId}>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}

function prettyField(field: string): string {
  switch (field) {
    case "description": return "description";
    case "userVoice": return "your voice";
    case "laws": return "laws";
    case "weeklyRhythm": return "weekly rhythm";
    case "nonNegotiables": return "non-negotiables";
    default: return field;
  }
}
