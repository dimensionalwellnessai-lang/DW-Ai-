// /life-blueprint — the user's three-level system at a glance.
//
// This page is mounted at /life-blueprint (and /life-system redirects here
// for back-compat). It is the canonical "Life Blueprint" surface.
//
// Layout (top → bottom):
// 1. Compact title strip (no oversized hero).
// 2. Snapshot card: small orbit + counts (Core / Expression / Creation)
//    + the two primary actions (View Document, Adopt/Refresh).
// 3. One-time backfill banner (when applicable).
// 4. Three sections — Core / Expression / Creation — each with a clean
//    divider, a short tagline, and a "X of Y" status pill.
//
// - Core pillars (9)         → always shown, status dot, edit affordance.
// - Expression pillars (5)   → toggleable (only "on" ones light the orbit).
// - Creation                 → list of user-defined Projects + "Add Project".
//
// Empty state: "Adopt the Starter Template" CTA inside the snapshot card.
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  PILLARS_BY_LEVEL,
  LEVEL_META,
  type LifeSystemPillarId,
} from "@shared/lifeSystemTaxonomy";
import type { PillarConversationMessage } from "@shared/lifeSystemContent";
import {
  useLifeSystem,
  adoptStarterTemplate,
  upsertPillar,
  createProject,
  deleteProject,
  findPillarRow,
} from "@/lib/life-system";
import type { LifeSystemBackfillCarriedItem } from "@/lib/life-system";
import { useLanguage } from "@/lib/i18n";
import {
  formatCarriedEntry,
  getBackfillBannerStrings,
} from "@/lib/life-system-backfill-i18n";
import { ThreeRingOrbit } from "@/components/life-system/three-ring-orbit";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Loader2, FileText, Plus, Trash2, Sparkles, MessageCircle, X } from "lucide-react";
import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diff = Math.max(0, Date.now() - then);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

function ConversationHint({ messages, testId }: { messages?: PillarConversationMessage[]; testId: string }) {
  if (!messages || messages.length === 0) return null;
  const last = [...messages].reverse().find(m => m.ts) ?? messages[messages.length - 1];
  const when = last?.ts ? relativeTime(last.ts) : "";
  const count = messages.length;
  return (
    <div
      className="text-xs mt-1.5 text-muted-foreground flex items-center gap-1"
      data-testid={testId}
    >
      <MessageCircle className="w-3 h-3" aria-hidden />
      <span>
        {count} {count === 1 ? "message" : "messages"}
        {when ? ` · last ${when}` : ""}
      </span>
    </div>
  );
}

function PillarIcon({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) {
  const registry = LucideIcons as unknown as Record<string, LucideIcon>;
  const Icon = registry[name];
  if (!Icon) return null;
  return <Icon className={className} style={style} aria-hidden />;
}

function backfillStorageKey(userId: string): string {
  return `life-system:backfill-note:${userId}`;
}

/**
 * The carried list is stored as either structured tags (current shape) or
 * plain strings (legacy shape persisted by older client builds before the
 * banner became localizable). Both are accepted on read so existing users
 * don't lose their note across the upgrade.
 */
type StoredCarriedEntry = LifeSystemBackfillCarriedItem | string;

interface StoredBackfillNote {
  carried: StoredCarriedEntry[];
  dismissed: boolean;
}

function isCarriedTag(value: unknown): value is LifeSystemBackfillCarriedItem {
  return !!value && typeof value === "object" && typeof (value as { kind?: unknown }).kind === "string";
}

function readBackfillNote(userId: string | undefined): StoredBackfillNote | null {
  if (!userId || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(backfillStorageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredBackfillNote>;
    if (!parsed || !Array.isArray(parsed.carried)) return null;
    const carried = parsed.carried.filter(
      (x): x is StoredCarriedEntry => typeof x === "string" || isCarriedTag(x),
    );
    return { carried, dismissed: !!parsed.dismissed };
  } catch {
    return null;
  }
}

function writeBackfillNote(userId: string, note: StoredBackfillNote): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(backfillStorageKey(userId), JSON.stringify(note));
  } catch {
    // localStorage may be unavailable (private mode, quota); ignore.
  }
}

export default function LifeSystemPage() {
  usePageMeta(
    "Life Blueprint",
    "Your three-layer operating system at a glance — Core, Expression, and Creation in one place.",
  );
  const { data, isLoading } = useLifeSystem();
  const { user } = useAuth();
  const userId = user?.id;
  const { toast } = useToast();
  const [adopting, setAdopting] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [savingProject, setSavingProject] = useState(false);
  const [backfillNote, setBackfillNote] = useState<StoredBackfillNote | null>(null);
  const language = useLanguage();
  const bannerStrings = getBackfillBannerStrings(language);

  // Hydrate the persisted backfill note once we know who the user is.
  useEffect(() => {
    if (!userId) return;
    setBackfillNote(readBackfillNote(userId));
  }, [userId]);

  // When the GET response signals a fresh backfill, persist the carried items
  // so the note survives a reload until the user dismisses it.
  useEffect(() => {
    if (!userId) return;
    if (!data?.wasBackfilled) return;
    const carried = data.backfillSummary?.carried ?? [];
    const existing = readBackfillNote(userId);
    if (existing && existing.dismissed) return; // user already dismissed it earlier
    const next: StoredBackfillNote = { carried, dismissed: false };
    writeBackfillNote(userId, next);
    setBackfillNote(next);
  }, [userId, data?.wasBackfilled, data?.backfillSummary]);

  function dismissBackfillNote() {
    if (!userId) return;
    const next: StoredBackfillNote = { carried: backfillNote?.carried ?? [], dismissed: true };
    writeBackfillNote(userId, next);
    setBackfillNote(next);
  }

  const pillars = data?.pillars ?? [];
  const projects = data?.projects ?? [];
  const isEmpty = pillars.length === 0;
  const showBackfillNote = !!backfillNote && !backfillNote.dismissed && !isEmpty;

  // Build lit set for orbit (enabled pillars + active projects)
  const litPillars = new Set<LifeSystemPillarId>();
  for (const def of [...PILLARS_BY_LEVEL.core, ...PILLARS_BY_LEVEL.expression, ...PILLARS_BY_LEVEL.creation]) {
    const row = findPillarRow(data, def.id);
    const enabled = row ? row.enabled !== false : !isEmpty && def.defaultOn;
    if (enabled) litPillars.add(def.id);
  }
  const litProjects = new Set(projects.filter(p => p.status === "active").map(p => p.id));

  // Snapshot counts powering the status pills + summary stats. Core
  // counts as "set up" when its pillar row exists and isn't disabled
  // (so a fresh user with no rows reads as 0, not 9). Expression counts
  // as "on" only when the row is explicitly enabled. Projects count
  // only the active ones.
  const coreEnabledCount = PILLARS_BY_LEVEL.core.filter(def => {
    const row = findPillarRow(data, def.id);
    return !!row && row.enabled !== false;
  }).length;
  const expressionOnCount = PILLARS_BY_LEVEL.expression.filter(def => {
    const row = findPillarRow(data, def.id);
    return !!row && row.enabled !== false;
  }).length;
  const activeProjectsCount = projects.filter(p => p.status === "active").length;

  async function onAdopt() {
    setAdopting(true);
    try {
      await adoptStarterTemplate(false);
      await queryClient.invalidateQueries({ queryKey: ["/api/life-system/pillars"] });
      toast({ title: "Starter Template adopted", description: "Your three layers are seeded. Edit anything." });
    } catch (e) {
      toast({ title: "Couldn't adopt template", description: "Try again in a moment.", variant: "destructive" });
    } finally {
      setAdopting(false);
    }
  }

  async function togglePillar(id: LifeSystemPillarId, enabled: boolean) {
    try {
      await upsertPillar(id, { enabled });
      await queryClient.invalidateQueries({ queryKey: ["/api/life-system/pillars"] });
    } catch {
      toast({ title: "Couldn't update", variant: "destructive" });
    }
  }

  async function addProject() {
    const name = newProjectName.trim();
    if (!name) return;
    setSavingProject(true);
    try {
      await createProject({ name, status: "active" });
      setNewProjectName("");
      await queryClient.invalidateQueries({ queryKey: ["/api/life-system/pillars"] });
    } catch {
      toast({ title: "Couldn't add project", variant: "destructive" });
    } finally {
      setSavingProject(false);
    }
  }

  async function removeProject(id: string) {
    try {
      await deleteProject(id);
      await queryClient.invalidateQueries({ queryKey: ["/api/life-system/pillars"] });
    } catch {
      toast({ title: "Couldn't remove project", variant: "destructive" });
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8" data-testid="page-life-system">
      {/* ── Title strip ─────────────────────────────────────────────────
          Compact, left-aligned. The big centered hero from the previous
          layout was pushing the actual pillar list below the fold; the
          snapshot card immediately below carries the visual weight. */}
      <header className="space-y-1">
        <h1
          className="text-2xl md:text-3xl font-bold tracking-tight font-display"
          data-testid="text-page-title"
        >
          Life Blueprint
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Three layers — Core holds your life together, Expression makes it
          yours, and Creation puts you into the world.
        </p>
      </header>

      {/* ── Snapshot card ───────────────────────────────────────────────
          Side-by-side on tablet+ (orbit ⇆ stats + actions); stacks on
          mobile. Replaces the old centered hero with a single dense
          summary so the rest of the page can be the actual content. */}
      <Card className="p-5 md:p-6" data-testid="card-blueprint-snapshot">
        <div className="flex flex-col md:flex-row md:items-center md:gap-8">
          <div className="flex justify-center md:shrink-0">
            <ThreeRingOrbit
              litPillars={litPillars}
              projects={projects.filter(p => p.status === "active").map(p => ({ id: p.id, name: p.name }))}
              litProjects={litProjects}
              size={240}
            />
          </div>
          <div className="flex-1 mt-5 md:mt-0 space-y-4 min-w-0">
            <div className="grid grid-cols-3 gap-3">
              <SnapshotStat
                label="Core"
                value={`${coreEnabledCount}/${PILLARS_BY_LEVEL.core.length}`}
                hint="set up"
                testId="stat-core"
              />
              <SnapshotStat
                label="Expression"
                value={`${expressionOnCount}/${PILLARS_BY_LEVEL.expression.length}`}
                hint="active"
                testId="stat-expression"
              />
              <SnapshotStat
                label="Creation"
                value={`${activeProjectsCount}`}
                hint={activeProjectsCount === 1 ? "project" : "projects"}
                testId="stat-creation"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                asChild
                variant="outline"
                size="sm"
                data-testid="link-life-system-document"
              >
                <Link href="/life-system/document">
                  <FileText className="w-4 h-4 mr-2" /> View document
                </Link>
              </Button>
              <Button
                onClick={onAdopt}
                disabled={adopting}
                size="sm"
                data-testid="button-adopt-starter"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {adopting ? "Adopting…" : isEmpty ? "Adopt Starter Template" : "Refresh from template"}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* ── One-time backfill note ─────────────────────────────────────── */}
      {showBackfillNote && (
        <Card
          className="p-4 flex items-start gap-3 bg-primary/5 border-primary/20"
          data-testid="card-backfill-note"
        >
          <Sparkles className="w-5 h-5 mt-0.5 text-primary shrink-0" aria-hidden />
          <div className="flex-1 space-y-1">
            <div className="font-medium" data-testid="text-backfill-note-title">
              {bannerStrings.title}
            </div>
            <p className="text-sm text-muted-foreground">{bannerStrings.body}</p>
            {backfillNote && backfillNote.carried.length > 0 && (
              <ul className="text-sm text-muted-foreground list-disc pl-5 mt-1 space-y-0.5">
                {backfillNote.carried.map((item, i) => (
                  <li key={i} data-testid={`text-backfill-carried-${i}`}>
                    {formatCarriedEntry(item, language)}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={dismissBackfillNote}
            aria-label={bannerStrings.dismiss}
            data-testid="button-dismiss-backfill-note"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </Button>
        </Card>
      )}

      {/* ── Empty hint ─────────────────────────────────────────────────── */}
      {isEmpty && (
        <Card className="p-6 text-center bg-primary/5 border-primary/20" data-testid="card-empty-state">
          <h2 className="text-xl font-semibold">Nothing here yet.</h2>
          <p className="text-muted-foreground mt-2 mb-4">
            Adopt the Starter Template above to seed all three layers in one click — then edit
            anything to make it yours.
          </p>
        </Card>
      )}

      {/* ── Core ───────────────────────────────────────────────────────── */}
      <SectionHeader
        level="core"
        pill={`${coreEnabledCount} of ${PILLARS_BY_LEVEL.core.length}`}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {PILLARS_BY_LEVEL.core.map(def => {
          const row = findPillarRow(data, def.id);
          const enabled = row ? row.enabled !== false : true;
          return (
            <Link
              key={def.id}
              href={`/life-system/pillar/${def.id}`}
              data-testid={`link-pillar-${def.id}`}
            >
              <Card
                className="p-4 flex items-start gap-3 hover-elevate cursor-pointer"
                data-testid={`card-pillar-${def.id}`}
              >
                <span
                  aria-hidden
                  className="w-2.5 h-2.5 rounded-full mt-2"
                  style={{ background: enabled ? `hsl(${def.color})` : "hsl(var(--muted-foreground) / 0.3)" }}
                />
                <PillarIcon name={def.icon} className="w-5 h-5 mt-0.5 text-primary" />
                <div className="flex-1">
                  <div className="font-medium">{def.label}</div>
                  <div className="text-sm text-muted-foreground">{def.summary}</div>
                  <ConversationHint
                    messages={row?.content?.conversation}
                    testId={`text-conversation-hint-${def.id}`}
                  />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* ── Expression ─────────────────────────────────────────────────── */}
      <SectionHeader
        level="expression"
        pill={`${expressionOnCount} of ${PILLARS_BY_LEVEL.expression.length} on`}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {PILLARS_BY_LEVEL.expression.map(def => {
          const row = findPillarRow(data, def.id);
          const enabled = row ? row.enabled !== false : isEmpty ? false : def.defaultOn;
          return (
            <Card
              key={def.id}
              className="p-4 flex items-start gap-3 hover-elevate"
              data-testid={`card-pillar-${def.id}`}
            >
              <PillarIcon name={def.icon} className="w-5 h-5 mt-0.5" style={{ color: `hsl(${def.color})` }} />
              <Link
                href={`/life-system/pillar/${def.id}`}
                className="flex-1 cursor-pointer"
                data-testid={`link-pillar-${def.id}`}
              >
                <div className="font-medium">{def.label}</div>
                <div className="text-sm text-muted-foreground">{def.summary}</div>
                <ConversationHint
                  messages={row?.content?.conversation}
                  testId={`text-conversation-hint-${def.id}`}
                />
              </Link>
              <Switch
                checked={enabled}
                onCheckedChange={(v) => togglePillar(def.id, v)}
                aria-label={`Toggle ${def.label}`}
                data-testid={`switch-pillar-${def.id}`}
              />
            </Card>
          );
        })}
      </div>

      {/* ── Creation ───────────────────────────────────────────────────── */}
      <SectionHeader
        level="creation"
        pill={
          activeProjectsCount === 0
            ? undefined
            : `${activeProjectsCount} active`
        }
      />
      <div className="space-y-3">
        {projects.map(p => (
          <Card key={p.id} className="p-4 flex items-start gap-3" data-testid={`card-project-${p.id}`}>
            <span
              aria-hidden
              className="w-2.5 h-2.5 rounded-full mt-2"
              style={{ background: "hsl(38 92% 60%)" }}
            />
            <Link
              href={`/life-system/project/${p.id}`}
              className="flex-1 hover-elevate rounded-md -m-1 p-1"
              data-testid={`link-project-${p.id}`}
            >
              <div className="font-medium" data-testid={`text-project-name-${p.id}`}>{p.name}</div>
              {p.description && (
                <div className="text-sm text-muted-foreground">{p.description}</div>
              )}
              {p.currentFocus && (
                <div className="text-xs mt-1 text-muted-foreground">
                  <span className="font-medium">Focus:</span> {p.currentFocus}
                </div>
              )}
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeProject(p.id)}
              aria-label={`Remove ${p.name}`}
              data-testid={`button-remove-project-${p.id}`}
            >
              <Trash2 className="w-4 h-4 text-muted-foreground" />
            </Button>
          </Card>
        ))}
        <Card className="p-4 flex gap-2 items-center">
          <Input
            placeholder="Add a project — what are you building?"
            value={newProjectName}
            onChange={e => setNewProjectName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") addProject(); }}
            data-testid="input-new-project-name"
          />
          <Button
            onClick={addProject}
            disabled={savingProject || !newProjectName.trim()}
            data-testid="button-add-project"
          >
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </Card>
      </div>
    </div>
  );
}

function SectionHeader({
  level,
  pill,
}: {
  level: "core" | "expression" | "creation";
  // Optional "X of Y" / "X active" status pill rendered to the right of
  // the section title. Pass `undefined` to hide the pill (e.g. Creation
  // with zero active projects, where the surface already invites the
  // user to add their first one).
  pill?: string;
}) {
  const meta = LEVEL_META[level];
  return (
    <div
      className="flex items-end justify-between gap-3 border-b border-border/60 pb-2"
      data-testid={`section-header-${level}`}
    >
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="w-3 h-3 rounded-full shrink-0"
            style={{ background: meta.ringColor }}
          />
          <h2 className="text-lg md:text-xl font-semibold">{meta.label}</h2>
        </div>
        <p className="text-sm text-muted-foreground">{meta.tagline}</p>
      </div>
      {pill && (
        <span
          className="text-xs font-medium text-muted-foreground bg-muted/60 rounded-full px-2.5 py-1 whitespace-nowrap shrink-0"
          data-testid={`section-pill-${level}`}
        >
          {pill}
        </span>
      )}
    </div>
  );
}

// Compact stat tile used inside the snapshot card. Shows a big value
// (e.g. "7/9") above a small label + hint. Three of these live in a
// 3-column grid so the snapshot card reads at a glance without needing
// to scan the orbit.
function SnapshotStat({
  label,
  value,
  hint,
  testId,
}: {
  label: string;
  value: string;
  hint: string;
  testId: string;
}) {
  return (
    <div
      className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 text-center"
      data-testid={testId}
    >
      <div className="text-xl md:text-2xl font-bold tracking-tight tabular-nums">
        {value}
      </div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground mt-0.5">
        {label}
      </div>
      <div className="text-[11px] text-muted-foreground/80">{hint}</div>
    </div>
  );
}
