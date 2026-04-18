// /life-system — the user's three-level system at a glance.
//
// Three sections in order: Core / Expression / Creation.
// - Core pillars (9)         → always shown, status dot, edit affordance.
// - Expression pillars (5)   → toggleable (only "on" ones light the orbit).
// - Creation                 → list of user-defined Projects + "Add Project".
//
// Header: 3-ring orbit visualization of current state.
// Empty state: "Adopt the Starter Template" CTA.
import { useState } from "react";
import { Link } from "wouter";
import {
  PILLARS_BY_LEVEL,
  LEVEL_META,
  type LifeSystemPillarId,
} from "@shared/lifeSystemTaxonomy";
import {
  useLifeSystem,
  adoptStarterTemplate,
  upsertPillar,
  createProject,
  deleteProject,
  findPillarRow,
} from "@/lib/life-system";
import { ThreeRingOrbit } from "@/components/life-system/three-ring-orbit";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Loader2, FileText, Plus, Trash2, Sparkles } from "lucide-react";
import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";

function PillarIcon({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) {
  const registry = LucideIcons as unknown as Record<string, LucideIcon>;
  const Icon = registry[name];
  if (!Icon) return null;
  return <Icon className={className} style={style} aria-hidden />;
}

export default function LifeSystemPage() {
  usePageMeta("My Life System", "Your personal three-level operating system: Core, Expression, Creation.");
  const { data, isLoading } = useLifeSystem();
  const { toast } = useToast();
  const [adopting, setAdopting] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [savingProject, setSavingProject] = useState(false);

  const pillars = data?.pillars ?? [];
  const projects = data?.projects ?? [];
  const isEmpty = pillars.length === 0;

  // Build lit set for orbit (enabled pillars + active projects)
  const litPillars = new Set<LifeSystemPillarId>();
  for (const def of [...PILLARS_BY_LEVEL.core, ...PILLARS_BY_LEVEL.expression, ...PILLARS_BY_LEVEL.creation]) {
    const row = findPillarRow(data, def.id);
    const enabled = row ? row.enabled !== false : !isEmpty && def.defaultOn;
    if (enabled) litPillars.add(def.id);
  }
  const litProjects = new Set(projects.filter(p => p.status === "active").map(p => p.name));

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
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-10" data-testid="page-life-system">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="flex flex-col items-center text-center space-y-4">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight" data-testid="text-page-title">
          My Life System
        </h1>
        <p className="text-muted-foreground max-w-xl">
          Three layers. The Core that holds your life together, the Expression that makes it yours,
          and the Creation that puts you into the world.
        </p>
        <ThreeRingOrbit
          litPillars={litPillars}
          projects={projects.filter(p => p.status === "active").map(p => ({ name: p.name }))}
          litProjects={litProjects}
          size={320}
        />
        <div className="flex flex-wrap gap-3 justify-center">
          <Button asChild variant="outline" data-testid="link-life-system-document">
            <Link href="/life-system/document">
              <FileText className="w-4 h-4 mr-2" /> View Life System Document
            </Link>
          </Button>
          <Button onClick={onAdopt} disabled={adopting} data-testid="button-adopt-starter">
            <Sparkles className="w-4 h-4 mr-2" />
            {adopting ? "Adopting…" : isEmpty ? "Adopt Starter Template" : "Refresh from Template"}
          </Button>
        </div>
      </header>

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
      <SectionHeader level="core" />
      <div className="grid gap-3 sm:grid-cols-2">
        {PILLARS_BY_LEVEL.core.map(def => {
          const row = findPillarRow(data, def.id);
          const enabled = row ? row.enabled !== false : true;
          return (
            <Card
              key={def.id}
              className="p-4 flex items-start gap-3 hover-elevate"
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
              </div>
            </Card>
          );
        })}
      </div>

      {/* ── Expression ─────────────────────────────────────────────────── */}
      <SectionHeader level="expression" />
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
              <div className="flex-1">
                <div className="font-medium">{def.label}</div>
                <div className="text-sm text-muted-foreground">{def.summary}</div>
              </div>
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
      <SectionHeader level="creation" />
      <div className="space-y-3">
        {projects.map(p => (
          <Card key={p.id} className="p-4 flex items-start gap-3" data-testid={`card-project-${p.id}`}>
            <span
              aria-hidden
              className="w-2.5 h-2.5 rounded-full mt-2"
              style={{ background: "hsl(38 92% 60%)" }}
            />
            <div className="flex-1">
              <div className="font-medium" data-testid={`text-project-name-${p.id}`}>{p.name}</div>
              {p.description && (
                <div className="text-sm text-muted-foreground">{p.description}</div>
              )}
              {p.currentFocus && (
                <div className="text-xs mt-1 text-muted-foreground">
                  <span className="font-medium">Focus:</span> {p.currentFocus}
                </div>
              )}
            </div>
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

function SectionHeader({ level }: { level: "core" | "expression" | "creation" }) {
  const meta = LEVEL_META[level];
  return (
    <div className="space-y-1" data-testid={`section-header-${level}`}>
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="w-3 h-3 rounded-full"
          style={{ background: meta.ringColor }}
        />
        <h2 className="text-xl font-semibold">{meta.label}</h2>
      </div>
      <p className="text-sm text-muted-foreground">{meta.tagline}</p>
    </div>
  );
}
