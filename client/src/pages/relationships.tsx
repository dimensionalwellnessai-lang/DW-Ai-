import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, formatDistanceToNow } from "date-fns";
import {
  Heart,
  Plus,
  Sparkles,
  Users,
  Trash2,
  Pencil,
  Cake,
  Calendar as CalendarIcon,
  Coffee,
  Phone,
  MessageCircle,
  Video,
  UsersRound,
  Sun,
  Moon,
  Wind,
  Compass,
  Shield,
  Star,
  AlertTriangle,
  Sprout,
  Filter,
  Activity,
  Lightbulb,
  Home,
  X,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { usePageMeta } from "@/hooks/use-page-meta";
import type {
  Person,
  PeopleInteraction,
  AlivenessMoment,
  RelationshipBoundary,
  RelationshipRepair,
  RelationshipAppreciation,
  PeopleGroup,
  PeopleGroupMember,
  GroupSharedItem,
  RelationshipInsight,
} from "@shared/schema";

// ── Constants ────────────────────────────────────────────────────────────────

const RELATIONSHIPS = [
  { value: "family", label: "Family" },
  { value: "partner", label: "Partner" },
  { value: "close-friend", label: "Close friend" },
  { value: "friend", label: "Friend" },
  { value: "coworker", label: "Coworker" },
  { value: "mentor", label: "Mentor" },
  { value: "acquaintance", label: "Acquaintance" },
  { value: "other", label: "Other" },
] as const;

type CategoryKey = "aligned" | "neutral" | "draining" | "growth";

const CATEGORIES: Array<{
  key: CategoryKey;
  label: string;
  description: string;
  icon: typeof Star;
  className: string;
  badgeClass: string;
}> = [
  {
    key: "aligned",
    label: "Aligned",
    description: "Respect your growth, hold real conversation, don't drain you.",
    icon: Star,
    className:
      "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-300",
    badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  },
  {
    key: "growth",
    label: "Growth",
    description: "Challenge you, inspire you, expand your vision.",
    icon: Sprout,
    className:
      "border-violet-500/30 bg-violet-500/5 text-violet-600 dark:text-violet-300",
    badgeClass: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
  },
  {
    key: "neutral",
    label: "Neutral",
    description: "Coworkers, classmates, acquaintances. Engage respectfully, don't overinvest.",
    icon: Compass,
    className:
      "border-slate-500/30 bg-slate-500/5 text-slate-600 dark:text-slate-300",
    badgeClass: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30",
  },
  {
    key: "draining",
    label: "Draining",
    description: "Limit exposure. Don't try to fix them.",
    icon: AlertTriangle,
    className:
      "border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-300",
    badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  },
];

const INTERACTION_KINDS = [
  { value: "in-person", label: "In person", icon: Coffee },
  { value: "call", label: "Call", icon: Phone },
  { value: "text", label: "Text", icon: MessageCircle },
  { value: "video", label: "Video", icon: Video },
  { value: "group", label: "Group", icon: UsersRound },
  { value: "other", label: "Other", icon: Sparkles },
];

const FREQUENCY_OPTIONS = [
  { value: "", label: "No target" },
  { value: "3", label: "Every few days" },
  { value: "7", label: "Weekly" },
  { value: "14", label: "Every 2 weeks" },
  { value: "30", label: "Monthly" },
  { value: "90", label: "Every 3 months" },
];

const GROUP_KINDS = [
  { value: "household", label: "Household" },
  { value: "core-family", label: "Core family" },
  { value: "couple", label: "Couple" },
  { value: "friends", label: "Friend group" },
  { value: "other", label: "Other" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const cat = (key: string | null | undefined) =>
  CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[2];

const relLabel = (value: string | null | undefined) =>
  RELATIONSHIPS.find((r) => r.value === value)?.label ?? "Friend";

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

function ScoreScale({
  value,
  label,
  positive,
  negative,
}: {
  value: number | null | undefined;
  label: string;
  positive: string;
  negative: string;
}) {
  if (value === null || value === undefined) return null;
  const v = Math.max(-2, Math.min(2, value));
  const color =
    v > 0 ? "text-emerald-600 dark:text-emerald-400"
    : v < 0 ? "text-amber-600 dark:text-amber-400"
    : "text-muted-foreground";
  const labelText = v > 0 ? positive : v < 0 ? negative : label;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs", color)}>
      <span className="font-medium">{labelText}</span>
      <span className="opacity-70">({v > 0 ? `+${v}` : v})</span>
    </span>
  );
}

function HealthBar({ score }: { score: number }) {
  const tone =
    score >= 70 ? "bg-emerald-500"
    : score >= 45 ? "bg-amber-500"
    : "bg-rose-500";
  return (
    <div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden">
      <div className={cn("h-full transition-all", tone)} style={{ width: `${score}%` }} />
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

type TabKey = "crm" | "health" | "hub" | "insights";

export default function RelationshipsPage() {
  usePageMeta(
    "Relationships — DW Wellness",
    "CRM, health tracker, family hub, and DW insights for the people in your life.",
  );

  const { toast } = useToast();
  const [tab, setTab] = useState<TabKey>("crm");
  const [filterCategory, setFilterCategory] = useState<CategoryKey | "all">("all");

  // Dialog state
  const [personDialog, setPersonDialog] = useState<{ mode: "new" | "edit"; person?: Person } | null>(null);
  const [interactionDialog, setInteractionDialog] = useState<{ personId?: string } | null>(null);
  const [alivenessDialog, setAlivenessDialog] = useState(false);
  const [groupDialog, setGroupDialog] = useState<{ mode: "new" | "edit"; group?: PeopleGroup } | null>(null);
  const [openPersonId, setOpenPersonId] = useState<string | null>(null);
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    kind: "person" | "interaction" | "aliveness" | "group";
    id: string;
    label: string;
  } | null>(null);

  const { data: peopleList = [], isLoading: peopleLoading } = useQuery<Person[]>({
    queryKey: ["/api/people"],
  });

  const { data: interactions = [] } = useQuery<PeopleInteraction[]>({
    queryKey: ["/api/people/interactions"],
  });

  const { data: alivenessList = [] } = useQuery<AlivenessMoment[]>({
    queryKey: ["/api/aliveness"],
  });

  type HealthRow = {
    personId: string;
    name: string;
    category: string | null;
    score: number;
    factors: Array<{ label: string; impact: number; detail?: string }>;
    daysSinceContact: number | null;
  };
  const { data: health = [] } = useQuery<HealthRow[]>({
    queryKey: ["/api/relationships/health"],
  });

  const { data: groups = [] } = useQuery<Array<PeopleGroup & { members: PeopleGroupMember[] }>>({
    queryKey: ["/api/relationships/groups"],
  });

  const { data: insights = [] } = useQuery<RelationshipInsight[]>({
    queryKey: ["/api/relationships/insights"],
  });

  const peopleByCategory = useMemo(() => {
    const filtered =
      filterCategory === "all"
        ? peopleList
        : peopleList.filter((p) => (p.category ?? "neutral") === filterCategory);
    const groups: Record<CategoryKey, Person[]> = {
      aligned: [], growth: [], neutral: [], draining: [],
    };
    for (const p of filtered) {
      const k = (p.category ?? "neutral") as CategoryKey;
      if (k in groups) groups[k].push(p);
    }
    return groups;
  }, [peopleList, filterCategory]);

  const peopleById = useMemo(() => {
    const m = new Map<string, Person>();
    peopleList.forEach((p) => m.set(p.id, p));
    return m;
  }, [peopleList]);

  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryKey, number> = { aligned: 0, growth: 0, neutral: 0, draining: 0 };
    for (const p of peopleList) {
      const k = (p.category ?? "neutral") as CategoryKey;
      if (k in counts) counts[k] += 1;
    }
    return counts;
  }, [peopleList]);

  async function handleDeletePerson(id: string) {
    try {
      await apiRequest("DELETE", `/api/people/${id}`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/people"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/people/interactions"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/relationships/health"] }),
      ]);
      toast({ title: "Person removed" });
    } catch (e: any) {
      toast({ title: "Couldn't remove", description: e?.message, variant: "destructive" });
    }
  }
  async function handleDeleteInteraction(id: string) {
    try {
      await apiRequest("DELETE", `/api/people/interactions/${id}`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/people/interactions"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/relationships/health"] }),
      ]);
      toast({ title: "Interaction removed" });
    } catch (e: any) {
      toast({ title: "Couldn't remove", description: e?.message, variant: "destructive" });
    }
  }
  async function handleDeleteAliveness(id: string) {
    try {
      await apiRequest("DELETE", `/api/aliveness/${id}`);
      await queryClient.invalidateQueries({ queryKey: ["/api/aliveness"] });
      toast({ title: "Moment removed" });
    } catch (e: any) {
      toast({ title: "Couldn't remove", description: e?.message, variant: "destructive" });
    }
  }
  async function handleDeleteGroup(id: string) {
    try {
      await apiRequest("DELETE", `/api/relationships/groups/${id}`);
      await queryClient.invalidateQueries({ queryKey: ["/api/relationships/groups"] });
      toast({ title: "Group removed" });
    } catch (e: any) {
      toast({ title: "Couldn't remove", description: e?.message, variant: "destructive" });
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Relationships" />
      <div className="page-header-spacer" />

      <div className="container max-w-3xl mx-auto px-4 pb-24 pt-2 space-y-4">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex gap-3 items-start">
            <Heart className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-sm text-foreground/80 leading-relaxed">
              The people in your life are part of your wellness. Track who's around you,
              how each connection lands, and where the real work lives.
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.key}
                onClick={() => {
                  setFilterCategory(filterCategory === c.key ? "all" : c.key);
                  setTab("crm");
                }}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all hover:scale-[1.02]",
                  c.className,
                  filterCategory === c.key && "ring-2 ring-primary/40",
                )}
                data-testid={`button-filter-${c.key}`}
              >
                <div className="flex items-center justify-between w-full">
                  <Icon className="h-4 w-4" />
                  <span className="text-lg font-semibold">{categoryCounts[c.key]}</span>
                </div>
                <div className="text-xs font-medium">{c.label}</div>
              </button>
            );
          })}
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="w-full">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="crm" data-testid="tab-crm">
              <Users className="h-4 w-4 mr-1.5" /> CRM
            </TabsTrigger>
            <TabsTrigger value="health" data-testid="tab-health">
              <Activity className="h-4 w-4 mr-1.5" /> Health
            </TabsTrigger>
            <TabsTrigger value="hub" data-testid="tab-hub">
              <Home className="h-4 w-4 mr-1.5" /> Hub
            </TabsTrigger>
            <TabsTrigger value="insights" data-testid="tab-insights">
              <Lightbulb className="h-4 w-4 mr-1.5" /> Insights
            </TabsTrigger>
          </TabsList>

          {/* ── CRM ── */}
          <TabsContent value="crm" className="space-y-3 mt-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                {filterCategory !== "all" && (
                  <Badge variant="outline" className="cursor-pointer" onClick={() => setFilterCategory("all")}>
                    <Filter className="h-3 w-3 mr-1" /> {cat(filterCategory).label}
                    <span className="ml-1.5 opacity-70">×</span>
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setInteractionDialog({})}
                  disabled={peopleList.length === 0}
                  data-testid="button-quick-log"
                >
                  <Plus className="h-4 w-4 mr-1" /> Log
                </Button>
                <Button
                  size="sm"
                  onClick={() => setPersonDialog({ mode: "new" })}
                  data-testid="button-add-person"
                >
                  <Plus className="h-4 w-4 mr-1" /> Add person
                </Button>
              </div>
            </div>

            {peopleLoading ? (
              <div className="text-sm text-muted-foreground py-12 text-center">Loading…</div>
            ) : peopleList.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center space-y-3">
                  <Users className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                  <div className="text-sm text-muted-foreground">
                    No one tracked yet. Start with the people who matter most.
                  </div>
                  <Button onClick={() => setPersonDialog({ mode: "new" })}>
                    <Plus className="h-4 w-4 mr-1" /> Add your first person
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {(["aligned", "growth", "neutral", "draining"] as CategoryKey[]).map((catKey) => {
                  const group = peopleByCategory[catKey];
                  if (group.length === 0) return null;
                  const meta = cat(catKey);
                  return (
                    <div key={catKey} className="space-y-2" data-testid={`group-${catKey}`}>
                      <div className="flex items-center gap-2 px-1">
                        <meta.icon className="h-4 w-4" />
                        <span className="text-sm font-semibold">{meta.label}</span>
                        <span className="text-xs text-muted-foreground">({group.length})</span>
                      </div>
                      <div className="grid gap-2">
                        {group.map((p) => (
                          <PersonCard
                            key={p.id}
                            person={p}
                            onOpen={() => setOpenPersonId(p.id)}
                            onLog={() => setInteractionDialog({ personId: p.id })}
                            onEdit={() => setPersonDialog({ mode: "edit", person: p })}
                            onDelete={() =>
                              setConfirmDelete({ kind: "person", id: p.id, label: p.name })
                            }
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── Health ── */}
          <TabsContent value="health" className="space-y-3 mt-4">
            <div className="text-xs text-muted-foreground">
              Each person's score blends contact rhythm, recent sentiment, open repairs, and appreciation.
            </div>
            {health.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  Add people and log a few interactions to see their health.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {[...health]
                  .sort((a, b) => a.score - b.score)
                  .map((h) => {
                    const p = peopleById.get(h.personId);
                    if (!p) return null;
                    return (
                      <Card
                        key={h.personId}
                        className="cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => setOpenPersonId(h.personId)}
                        data-testid={`health-${h.personId}`}
                      >
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium text-sm truncate">{h.name}</div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold tabular-nums">{h.score}</span>
                              <Badge variant="outline" className={cn("text-[10px]", cat(h.category).badgeClass)}>
                                {cat(h.category).label}
                              </Badge>
                            </div>
                          </div>
                          <HealthBar score={h.score} />
                          <div className="text-[11px] text-muted-foreground">
                            {h.daysSinceContact === null
                              ? "No interactions logged"
                              : `${h.daysSinceContact}d since last contact`}
                            {p.contactFrequencyDays ? ` · target every ${p.contactFrequencyDays}d` : ""}
                          </div>
                          {h.factors.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {h.factors.slice(0, 3).map((f, i) => (
                                <Badge
                                  key={i}
                                  variant="outline"
                                  className={cn(
                                    "text-[10px]",
                                    f.impact > 0
                                      ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                                      : f.impact < 0
                                      ? "border-amber-500/30 text-amber-700 dark:text-amber-300"
                                      : "",
                                  )}
                                >
                                  {f.label}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            )}
          </TabsContent>

          {/* ── Hub ── */}
          <TabsContent value="hub" className="space-y-3 mt-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                Family, household, couples — shared rules, events, and appreciations.
              </div>
              <Button
                size="sm"
                onClick={() => setGroupDialog({ mode: "new" })}
                data-testid="button-add-group"
              >
                <Plus className="h-4 w-4 mr-1" /> New group
              </Button>
            </div>

            {groups.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center text-sm text-muted-foreground space-y-3">
                  <Home className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                  <div>No groups yet. Make one for your household, family, or close circle.</div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-2">
                {groups.map((g) => (
                  <Card
                    key={g.id}
                    className="cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setOpenGroupId(g.id)}
                    data-testid={`group-card-${g.id}`}
                  >
                    <CardContent className="p-3 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium">{g.name}</div>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {GROUP_KINDS.find((k) => k.value === g.kind)?.label ?? g.kind}
                        </Badge>
                      </div>
                      {g.description && (
                        <div className="text-xs text-muted-foreground">{g.description}</div>
                      )}
                      <div className="text-[11px] text-muted-foreground">
                        {g.members.length} member{g.members.length === 1 ? "" : "s"}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-border/50">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-medium">Aliveness moments</div>
                <Button size="sm" variant="ghost" onClick={() => setAlivenessDialog(true)} data-testid="button-add-aliveness">
                  <Plus className="h-3 w-3 mr-1" /> Capture
                </Button>
              </div>
              {alivenessList.length === 0 ? (
                <div className="text-xs text-muted-foreground py-4 text-center">
                  Capture a moment when you next feel alive.
                </div>
              ) : (
                <div className="grid gap-2">
                  {alivenessList.slice(0, 5).map((m) => (
                    <Card key={m.id} data-testid={`aliveness-${m.id}`}>
                      <CardContent className="p-3 flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm">{m.title}</div>
                          {m.description && (
                            <div className="text-xs text-muted-foreground">{m.description}</div>
                          )}
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground"
                          onClick={() =>
                            setConfirmDelete({ kind: "aliveness", id: m.id, label: m.title })
                          }
                          data-testid={`button-delete-aliveness-${m.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Insights ── */}
          <TabsContent value="insights" className="space-y-3 mt-4">
            <InsightsTab insights={insights} peopleById={peopleById} setTab={setTab} setOpenPersonId={setOpenPersonId} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Person dialog */}
      {personDialog && (
        <PersonDialog
          open={!!personDialog}
          mode={personDialog.mode}
          person={personDialog.person}
          onClose={() => setPersonDialog(null)}
        />
      )}

      {/* Interaction dialog */}
      {interactionDialog && (
        <InteractionDialog
          open={!!interactionDialog}
          people={peopleList}
          defaultPersonId={interactionDialog.personId}
          onClose={() => setInteractionDialog(null)}
        />
      )}

      {alivenessDialog && (
        <AlivenessDialog open={alivenessDialog} onClose={() => setAlivenessDialog(false)} />
      )}

      {groupDialog && (
        <GroupDialog
          open={!!groupDialog}
          mode={groupDialog.mode}
          group={groupDialog.group}
          onClose={() => setGroupDialog(null)}
        />
      )}

      {/* Person sheet */}
      {openPersonId && (
        <PersonSheet
          personId={openPersonId}
          person={peopleById.get(openPersonId)}
          onClose={() => setOpenPersonId(null)}
          onEdit={() => {
            const p = peopleById.get(openPersonId);
            if (p) setPersonDialog({ mode: "edit", person: p });
          }}
          onLog={() => setInteractionDialog({ personId: openPersonId })}
        />
      )}

      {/* Group sheet */}
      {openGroupId && (
        <GroupSheet
          groupId={openGroupId}
          group={groups.find((g) => g.id === openGroupId) ?? null}
          peopleList={peopleList}
          onClose={() => setOpenGroupId(null)}
          onDelete={() => {
            const g = groups.find((gg) => gg.id === openGroupId);
            if (g) {
              setOpenGroupId(null);
              setConfirmDelete({ kind: "group", id: g.id, label: g.name });
            }
          }}
        />
      )}

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {confirmDelete?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.kind === "person"
                ? "This also removes all interactions, boundaries, repairs and appreciations linked to them."
                : "This can't be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirmDelete) return;
                if (confirmDelete.kind === "person") handleDeletePerson(confirmDelete.id);
                else if (confirmDelete.kind === "interaction") handleDeleteInteraction(confirmDelete.id);
                else if (confirmDelete.kind === "aliveness") handleDeleteAliveness(confirmDelete.id);
                else if (confirmDelete.kind === "group") handleDeleteGroup(confirmDelete.id);
                setConfirmDelete(null);
              }}
              data-testid="button-confirm-delete"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Person card ──────────────────────────────────────────────────────────────

function PersonCard({
  person,
  onOpen,
  onLog,
  onEdit,
  onDelete,
}: {
  person: Person;
  onOpen: () => void;
  onLog: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta = cat(person.category);
  const initials = initialsOf(person.name);
  return (
    <Card data-testid={`person-${person.id}`}>
      <CardContent className="p-3 flex items-start gap-3">
        <button
          onClick={onOpen}
          className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0",
            meta.className,
          )}
          aria-label={`Open ${person.name}`}
          data-testid={`button-open-${person.id}`}
        >
          {person.photoUrl ? (
            <img
              src={person.photoUrl}
              alt={person.name}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            initials || "?"
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={onOpen}
              className="font-medium truncate text-left hover:underline"
              data-testid={`text-person-name-${person.id}`}
            >
              {person.name}
            </button>
            <Badge variant="outline" className={cn("text-[10px]", meta.badgeClass)}>
              {meta.label}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap mt-0.5">
            <span>{relLabel(person.relationship)}</span>
            {person.birthday && (
              <span className="inline-flex items-center gap-0.5">
                <Cake className="h-3 w-3" />
                {person.birthday}
              </span>
            )}
            {person.lastInteractionAt && (
              <span>
                · last seen{" "}
                {formatDistanceToNow(new Date(person.lastInteractionAt), { addSuffix: true })}
              </span>
            )}
            {person.contactFrequencyDays && (
              <span>· every {person.contactFrequencyDays}d</span>
            )}
          </div>
          {person.notes && (
            <div className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{person.notes}</div>
          )}
          <div className="flex items-center gap-1 mt-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={onLog}
              data-testid={`button-log-${person.id}`}
            >
              <Plus className="h-3 w-3 mr-1" /> Log
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground"
              onClick={onEdit}
              data-testid={`button-edit-${person.id}`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground"
              onClick={onDelete}
              data-testid={`button-delete-${person.id}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Person dialog ────────────────────────────────────────────────────────────

const FREQ_NONE = "none";

const personFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  relationship: z.string().min(1),
  category: z.enum(["aligned", "growth", "neutral", "draining"]),
  notes: z.string().max(2000).optional().default(""),
  birthday: z.string().max(60).optional().default(""),
  frequency: z.string().optional().default(FREQ_NONE),
});
type PersonFormValues = z.infer<typeof personFormSchema>;

function PersonDialog({
  open,
  mode,
  person,
  onClose,
}: {
  open: boolean;
  mode: "new" | "edit";
  person?: Person;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const form = useForm<PersonFormValues>({
    resolver: zodResolver(personFormSchema),
    defaultValues: {
      name: person?.name ?? "",
      relationship: person?.relationship ?? "friend",
      category: ((person?.category as CategoryKey) ?? "neutral"),
      notes: person?.notes ?? "",
      birthday: person?.birthday ?? "",
      frequency: person?.contactFrequencyDays ? String(person.contactFrequencyDays) : FREQ_NONE,
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: PersonFormValues) => {
      const body = {
        name: values.name.trim(),
        relationship: values.relationship,
        category: values.category,
        notes: values.notes?.trim() || null,
        birthday: values.birthday?.trim() || null,
        contactFrequencyDays:
          values.frequency && values.frequency !== FREQ_NONE
            ? parseInt(values.frequency, 10)
            : null,
      };
      if (mode === "new") {
        const res = await apiRequest("POST", "/api/people", body);
        return { created: (await res.json()) as Person };
      }
      if (person) {
        await apiRequest("PATCH", `/api/people/${person.id}`, body);
      }
      return { created: null };
    },
    onSuccess: async (_, values) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/people"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/relationships/health"] }),
      ]);
      toast({ title: mode === "new" ? "Added" : "Updated", description: values.name });
      onClose();
    },
    onError: (e: any) => {
      toast({ title: "Couldn't save", description: e?.message, variant: "destructive" });
    },
  });

  const watchedCategory = form.watch("category");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "new" ? "Add person" : "Edit person"}</DialogTitle>
          <DialogDescription>
            Name them, place them, capture what matters about how they show up.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
            className="space-y-3"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Their name" data-testid="input-person-name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="relationship"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Relationship</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-person-relationship">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RELATIONSHIPS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Category</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-person-category">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="text-[11px] text-muted-foreground italic">
              {cat(watchedCategory).description}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="birthday"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Birthday (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="March 14" data-testid="input-person-birthday" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Contact target</FormLabel>
                    <Select value={field.value || FREQ_NONE} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-person-frequency">
                          <SelectValue placeholder="No target" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FREQUENCY_OPTIONS.map((o) => (
                          <SelectItem key={o.value || FREQ_NONE} value={o.value || FREQ_NONE}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What matters about them — patterns, what they need, what you appreciate."
                      rows={3}
                      data-testid="input-person-notes"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-save-person">
                {mutation.isPending ? "Saving…" : mode === "new" ? "Add person" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Interaction dialog ───────────────────────────────────────────────────────

const interactionFormSchema = z.object({
  personId: z.string().min(1, "Choose a person"),
  kind: z.string().min(1),
  energyAfter: z.number().int().min(-2).max(2),
  clarityAfter: z.number().int().min(-2).max(2),
  selfAfter: z.number().int().min(-2).max(2),
  notes: z.string().max(2000).optional().default(""),
});
type InteractionFormValues = z.infer<typeof interactionFormSchema>;

function InteractionDialog({
  open,
  people,
  defaultPersonId,
  onClose,
}: {
  open: boolean;
  people: Person[];
  defaultPersonId?: string;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const form = useForm<InteractionFormValues>({
    resolver: zodResolver(interactionFormSchema),
    defaultValues: {
      personId: defaultPersonId ?? people[0]?.id ?? "",
      kind: "in-person",
      energyAfter: 0,
      clarityAfter: 0,
      selfAfter: 0,
      notes: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: InteractionFormValues) => {
      await apiRequest("POST", "/api/people/interactions", {
        personId: values.personId,
        kind: values.kind,
        energyAfter: values.energyAfter,
        clarityAfter: values.clarityAfter,
        selfAfter: values.selfAfter,
        notes: values.notes?.trim() || null,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/people/interactions"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/people"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/relationships/health"] }),
      ]);
      toast({ title: "Logged" });
      onClose();
    },
    onError: (e: any) =>
      toast({ title: "Couldn't save", description: e?.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log an interaction</DialogTitle>
          <DialogDescription>
            How did it land? Lighter or heavier — clearer or foggier — more like you or less.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
            className="space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="personId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Person</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-interaction-person">
                          <SelectValue placeholder="Pick a person" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {people.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="kind"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Kind</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-interaction-kind">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {INTERACTION_KINDS.map((k) => (
                          <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="energyAfter"
              render={({ field }) => (
                <FormItem>
                  <ScoreRow
                    label="Energy after"
                    left="Heavier"
                    right="Lighter"
                    value={field.value}
                    setValue={field.onChange}
                    testId="energy"
                  />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="clarityAfter"
              render={({ field }) => (
                <FormItem>
                  <ScoreRow
                    label="Clarity after"
                    left="Foggier"
                    right="Clearer"
                    value={field.value}
                    setValue={field.onChange}
                    testId="clarity"
                  />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="selfAfter"
              render={({ field }) => (
                <FormItem>
                  <ScoreRow
                    label="Self after"
                    left="Less me"
                    right="More me"
                    value={field.value}
                    setValue={field.onChange}
                    testId="self"
                  />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      placeholder="Anything to remember about this one."
                      data-testid="input-interaction-notes"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-save-interaction">
                {mutation.isPending ? "Saving…" : "Log it"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function ScoreRow({
  label,
  left,
  right,
  value,
  setValue,
  testId,
}: {
  label: string;
  left: string;
  right: string;
  value: number;
  setValue: (n: number) => void;
  testId: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <Label className="text-xs">{label}</Label>
        <span className="text-[10px] text-muted-foreground">{left} ↔ {right}</span>
      </div>
      <div className="flex gap-1.5">
        {[-2, -1, 0, 1, 2].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setValue(n)}
            className={cn(
              "flex-1 h-9 rounded-md border text-xs font-medium transition-colors",
              value === n
                ? n > 0
                  ? "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  : n < 0
                  ? "border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300"
                  : "border-primary bg-primary/15 text-primary"
                : "border-border bg-muted/30 text-muted-foreground hover:text-foreground",
            )}
            data-testid={`score-${testId}-${n}`}
            aria-label={`${label} ${n}`}
          >
            {n > 0 ? `+${n}` : n}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Aliveness dialog ─────────────────────────────────────────────────────────

const alivenessFormSchema = z.object({
  title: z.string().trim().min(1, "Add a short title").max(120),
  description: z.string().max(2000).optional().default(""),
  tags: z.string().max(500).optional().default(""),
  alivenessLevel: z.number().int().min(1).max(5),
});
type AlivenessFormValues = z.infer<typeof alivenessFormSchema>;

function AlivenessDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const form = useForm<AlivenessFormValues>({
    resolver: zodResolver(alivenessFormSchema),
    defaultValues: { title: "", description: "", tags: "", alivenessLevel: 4 },
  });

  const mutation = useMutation({
    mutationFn: async (values: AlivenessFormValues) => {
      await apiRequest("POST", "/api/aliveness", {
        title: values.title.trim(),
        description: values.description?.trim() || null,
        tags: (values.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean).slice(0, 12),
        alivenessLevel: values.alivenessLevel,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/aliveness"] });
      toast({ title: "Captured" });
      onClose();
    },
    onError: (e: any) =>
      toast({ title: "Couldn't save", description: e?.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Capture an aliveness moment</DialogTitle>
          <DialogDescription>
            Rooftops, music, real conversations — the moments outside your head.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
            className="space-y-3"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">What was it</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. rooftop with Maya" data-testid="input-aliveness-title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Notes</FormLabel>
                  <FormControl>
                    <Textarea rows={2} data-testid="input-aliveness-description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Tags (comma-separated)</FormLabel>
                  <FormControl>
                    <Input placeholder="music, outside" data-testid="input-aliveness-tags" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="alivenessLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">How alive did it feel?</FormLabel>
                  <div className="flex gap-1.5 mt-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => field.onChange(n)}
                        className={cn(
                          "flex-1 h-10 rounded-md border transition-colors flex items-center justify-center",
                          field.value >= n
                            ? "border-primary bg-primary/15 text-primary"
                            : "border-border bg-muted/30 text-muted-foreground",
                        )}
                        data-testid={`aliveness-level-${n}`}
                        aria-label={`Level ${n}`}
                      >
                        <Sparkles className="h-4 w-4" />
                      </button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-save-aliveness">
                {mutation.isPending ? "Saving…" : "Capture"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Person sheet (notes / interactions / boundaries / repairs / appreciations)

function PersonSheet({
  personId,
  person,
  onClose,
  onEdit,
  onLog,
}: {
  personId: string;
  person: Person | undefined;
  onClose: () => void;
  onEdit: () => void;
  onLog: () => void;
}) {
  const { toast } = useToast();

  const { data: personInteractions = [] } = useQuery<PeopleInteraction[]>({
    queryKey: ["/api/people/interactions", { personId }],
    queryFn: async () => {
      const r = await fetch(`/api/people/interactions?personId=${personId}`, { credentials: "include" });
      if (!r.ok) throw new Error("load");
      return r.json();
    },
  });

  const { data: boundaries = [] } = useQuery<RelationshipBoundary[]>({
    queryKey: ["/api/relationships/boundaries", { personId }],
    queryFn: async () => {
      const r = await fetch(`/api/relationships/boundaries?personId=${personId}`, { credentials: "include" });
      if (!r.ok) throw new Error("load");
      return r.json();
    },
  });

  const { data: repairs = [] } = useQuery<RelationshipRepair[]>({
    queryKey: ["/api/relationships/repairs", { personId }],
    queryFn: async () => {
      const r = await fetch(`/api/relationships/repairs?personId=${personId}`, { credentials: "include" });
      if (!r.ok) throw new Error("load");
      return r.json();
    },
  });

  const { data: appreciations = [] } = useQuery<RelationshipAppreciation[]>({
    queryKey: ["/api/relationships/appreciations", { personId }],
    queryFn: async () => {
      const r = await fetch(`/api/relationships/appreciations?personId=${personId}`, { credentials: "include" });
      if (!r.ok) throw new Error("load");
      return r.json();
    },
  });

  const { data: healthDetail } = useQuery<{ score: number; factors: { label: string; impact: number; detail?: string }[]; daysSinceContact: number | null }>({
    queryKey: ["/api/relationships/health", personId],
    queryFn: async () => {
      const r = await fetch(`/api/relationships/health/${personId}`, { credentials: "include" });
      if (!r.ok) throw new Error("load");
      return r.json();
    },
  });

  const [newBoundary, setNewBoundary] = useState("");
  const [newRepairIssue, setNewRepairIssue] = useState("");
  const [newRepairAction, setNewRepairAction] = useState("");
  const [newAppreciation, setNewAppreciation] = useState("");

  async function invalidatePerson() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/relationships/boundaries", { personId }] }),
      queryClient.invalidateQueries({ queryKey: ["/api/relationships/repairs", { personId }] }),
      queryClient.invalidateQueries({ queryKey: ["/api/relationships/appreciations", { personId }] }),
      queryClient.invalidateQueries({ queryKey: ["/api/relationships/health", personId] }),
      queryClient.invalidateQueries({ queryKey: ["/api/relationships/health"] }),
    ]);
  }

  async function addBoundary() {
    if (!newBoundary.trim()) return;
    try {
      await apiRequest("POST", "/api/relationships/boundaries", { personId, rule: newBoundary.trim() });
      setNewBoundary("");
      await invalidatePerson();
    } catch (e: any) {
      toast({ title: "Couldn't add", description: e?.message, variant: "destructive" });
    }
  }

  async function deleteBoundary(id: string) {
    try {
      await apiRequest("DELETE", `/api/relationships/boundaries/${id}`);
      await invalidatePerson();
    } catch (e: any) {
      toast({ title: "Couldn't remove", description: e?.message, variant: "destructive" });
    }
  }

  async function addRepair() {
    if (!newRepairIssue.trim()) return;
    try {
      await apiRequest("POST", "/api/relationships/repairs", {
        personId,
        issue: newRepairIssue.trim(),
        plannedAction: newRepairAction.trim() || null,
      });
      setNewRepairIssue("");
      setNewRepairAction("");
      await invalidatePerson();
    } catch (e: any) {
      toast({ title: "Couldn't add", description: e?.message, variant: "destructive" });
    }
  }

  async function setRepairStatus(id: string, status: "open" | "done" | "dropped") {
    try {
      await apiRequest("PATCH", `/api/relationships/repairs/${id}`, { status });
      await invalidatePerson();
    } catch (e: any) {
      toast({ title: "Couldn't update", description: e?.message, variant: "destructive" });
    }
  }

  async function deleteRepair(id: string) {
    try {
      await apiRequest("DELETE", `/api/relationships/repairs/${id}`);
      await invalidatePerson();
    } catch (e: any) {
      toast({ title: "Couldn't remove", description: e?.message, variant: "destructive" });
    }
  }

  async function addAppreciation() {
    if (!newAppreciation.trim()) return;
    try {
      await apiRequest("POST", "/api/relationships/appreciations", {
        personId,
        note: newAppreciation.trim(),
      });
      setNewAppreciation("");
      await invalidatePerson();
    } catch (e: any) {
      toast({ title: "Couldn't add", description: e?.message, variant: "destructive" });
    }
  }

  async function deleteAppreciation(id: string) {
    try {
      await apiRequest("DELETE", `/api/relationships/appreciations/${id}`);
      await invalidatePerson();
    } catch (e: any) {
      toast({ title: "Couldn't remove", description: e?.message, variant: "destructive" });
    }
  }

  if (!person) return null;
  const meta = cat(person.category);

  return (
    <Sheet open={!!personId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto" data-testid="sheet-person">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className={cn("h-12 w-12 rounded-full flex items-center justify-center font-semibold", meta.className)}>
              {initialsOf(person.name) || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="truncate">{person.name}</SheetTitle>
              <SheetDescription className="text-xs">
                {relLabel(person.relationship)} · <span className="capitalize">{meta.label}</span>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {healthDetail && (
          <div className="mt-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Health</span>
              <span className="text-sm font-semibold tabular-nums">{healthDetail.score}/100</span>
            </div>
            <HealthBar score={healthDetail.score} />
            <div className="text-[11px] text-muted-foreground">
              {healthDetail.daysSinceContact === null
                ? "No interactions logged"
                : `${healthDetail.daysSinceContact}d since last contact`}
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <Button size="sm" onClick={onLog} data-testid="button-sheet-log">
            <Plus className="h-3.5 w-3.5 mr-1" /> Log interaction
          </Button>
          <Button size="sm" variant="outline" onClick={onEdit} data-testid="button-sheet-edit">
            <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
          </Button>
        </div>

        <Tabs defaultValue="notes" className="mt-4">
          <TabsList className="grid grid-cols-5">
            <TabsTrigger value="notes" data-testid="tab-sheet-notes">Notes</TabsTrigger>
            <TabsTrigger value="log" data-testid="tab-sheet-log">Log</TabsTrigger>
            <TabsTrigger value="bounds" data-testid="tab-sheet-bounds">Bounds</TabsTrigger>
            <TabsTrigger value="repair" data-testid="tab-sheet-repair">Repair</TabsTrigger>
            <TabsTrigger value="thanks" data-testid="tab-sheet-thanks">Thanks</TabsTrigger>
          </TabsList>

          <TabsContent value="notes" className="mt-3 space-y-2 text-sm">
            {person.notes ? (
              <div className="text-foreground/90 whitespace-pre-wrap">{person.notes}</div>
            ) : (
              <div className="text-xs text-muted-foreground italic">No notes. Tap edit to add some.</div>
            )}
            <div className="text-xs text-muted-foreground space-y-1 pt-2">
              {person.birthday && (
                <div className="flex items-center gap-1.5"><Cake className="h-3 w-3" /> {person.birthday}</div>
              )}
              {person.contactFrequencyDays && (
                <div className="flex items-center gap-1.5"><CalendarIcon className="h-3 w-3" /> Aim for every {person.contactFrequencyDays} days</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="log" className="mt-3 space-y-2">
            {personInteractions.length === 0 ? (
              <div className="text-xs text-muted-foreground italic">No interactions yet.</div>
            ) : (
              personInteractions.slice(0, 30).map((i) => {
                const kind = INTERACTION_KINDS.find((k) => k.value === (i.kind ?? "in-person"));
                const KindIcon = kind?.icon ?? Coffee;
                return (
                  <Card key={i.id} data-testid={`sheet-interaction-${i.id}`}>
                    <CardContent className="p-3 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <KindIcon className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-medium">{kind?.label}</span>
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {i.occurredAt ? format(new Date(i.occurredAt), "MMM d, yyyy") : ""}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        <ScoreScale value={i.energyAfter} label="Energy" positive="Lighter" negative="Heavier" />
                        <ScoreScale value={i.clarityAfter} label="Clarity" positive="Clearer" negative="Foggier" />
                        <ScoreScale value={i.selfAfter} label="Self" positive="More me" negative="Less me" />
                      </div>
                      {i.notes && <div className="text-xs italic text-muted-foreground">{i.notes}</div>}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="bounds" className="mt-3 space-y-2">
            <div className="flex gap-2">
              <Input
                value={newBoundary}
                onChange={(e) => setNewBoundary(e.target.value)}
                placeholder="e.g. don't discuss money with mom"
                data-testid="input-new-boundary"
              />
              <Button size="sm" onClick={addBoundary} data-testid="button-add-boundary">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            {boundaries.length === 0 ? (
              <div className="text-xs text-muted-foreground italic">No boundaries set.</div>
            ) : (
              boundaries.map((b) => (
                <Card key={b.id} data-testid={`boundary-${b.id}`}>
                  <CardContent className="p-3 flex items-start justify-between gap-2">
                    <div className="text-sm flex-1">
                      <Shield className="h-3.5 w-3.5 inline mr-1.5 text-primary" />
                      {b.rule}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground"
                      onClick={() => deleteBoundary(b.id)}
                      data-testid={`button-delete-boundary-${b.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="repair" className="mt-3 space-y-2">
            <div className="space-y-2 p-3 rounded-lg border border-dashed">
              <Input
                value={newRepairIssue}
                onChange={(e) => setNewRepairIssue(e.target.value)}
                placeholder="What needs repairing"
                data-testid="input-new-repair-issue"
              />
              <Input
                value={newRepairAction}
                onChange={(e) => setNewRepairAction(e.target.value)}
                placeholder="Planned action (optional)"
                data-testid="input-new-repair-action"
              />
              <Button size="sm" onClick={addRepair} data-testid="button-add-repair">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add repair
              </Button>
            </div>
            {repairs.length === 0 ? (
              <div className="text-xs text-muted-foreground italic">No open repair items.</div>
            ) : (
              repairs.map((r) => (
                <Card key={r.id} data-testid={`repair-${r.id}`}>
                  <CardContent className="p-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{r.issue}</div>
                        {r.plannedAction && (
                          <div className="text-xs text-muted-foreground">→ {r.plannedAction}</div>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] capitalize",
                          r.status === "open" ? "border-amber-500/30 text-amber-700 dark:text-amber-300" : "",
                          r.status === "done" ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-300" : "",
                        )}
                      >
                        {r.status}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      {r.status !== "done" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => setRepairStatus(r.id, "done")}
                          data-testid={`button-repair-done-${r.id}`}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Done
                        </Button>
                      )}
                      {r.status === "open" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => setRepairStatus(r.id, "dropped")}
                          data-testid={`button-repair-drop-${r.id}`}
                        >
                          Drop
                        </Button>
                      )}
                      {r.status !== "open" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => setRepairStatus(r.id, "open")}
                          data-testid={`button-repair-reopen-${r.id}`}
                        >
                          Reopen
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 ml-auto text-muted-foreground"
                        onClick={() => deleteRepair(r.id)}
                        data-testid={`button-delete-repair-${r.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="thanks" className="mt-3 space-y-2">
            <div className="flex gap-2">
              <Input
                value={newAppreciation}
                onChange={(e) => setNewAppreciation(e.target.value)}
                placeholder="What you appreciated about them"
                data-testid="input-new-appreciation"
              />
              <Button size="sm" onClick={addAppreciation} data-testid="button-add-appreciation">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            {appreciations.length === 0 ? (
              <div className="text-xs text-muted-foreground italic">No appreciations logged.</div>
            ) : (
              appreciations.map((a) => (
                <Card key={a.id} data-testid={`appreciation-${a.id}`}>
                  <CardContent className="p-3 flex items-start justify-between gap-2">
                    <div className="text-sm flex-1">
                      <Heart className="h-3.5 w-3.5 inline mr-1.5 text-rose-500" />
                      {a.note}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground"
                      onClick={() => deleteAppreciation(a.id)}
                      data-testid={`button-delete-appreciation-${a.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

// ── Group dialog & sheet ─────────────────────────────────────────────────────

const groupFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  kind: z.string().min(1),
  description: z.string().max(2000).optional().default(""),
});
type GroupFormValues = z.infer<typeof groupFormSchema>;

function GroupDialog({
  open,
  mode,
  group,
  onClose,
}: {
  open: boolean;
  mode: "new" | "edit";
  group?: PeopleGroup;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      name: group?.name ?? "",
      kind: group?.kind ?? "household",
      description: group?.description ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: GroupFormValues) => {
      const body = {
        name: values.name.trim(),
        kind: values.kind,
        description: values.description?.trim() || null,
      };
      if (mode === "new") await apiRequest("POST", "/api/relationships/groups", body);
      else if (group) await apiRequest("PATCH", `/api/relationships/groups/${group.id}`, body);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/relationships/groups"] });
      toast({ title: mode === "new" ? "Group created" : "Updated" });
      onClose();
    },
    onError: (e: any) =>
      toast({ title: "Couldn't save", description: e?.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "new" ? "New group" : "Edit group"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
            className="space-y-3"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Household, Core family" data-testid="input-group-name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="kind"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Kind</FormLabel>
                  <Select value={field.value || "household"} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger data-testid="select-group-kind"><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {GROUP_KINDS.map((k) => (
                        <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea rows={2} data-testid="input-group-description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-save-group">
                {mutation.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

type ItemKind = "rule" | "event" | "appreciation" | "note";
type SharedItemWithAuthor = GroupSharedItem & {
  authorName?: string | null;
  authorEmail?: string | null;
};

const itemFormSchema = z.object({
  kind: z.enum(["rule", "event", "appreciation", "note"]),
  text: z.string().trim().min(1, "Add some text").max(2000),
});
type ItemFormValues = z.infer<typeof itemFormSchema>;

function GroupSheet({
  groupId,
  group,
  peopleList,
  onClose,
  onDelete,
}: {
  groupId: string;
  group: (PeopleGroup & { members: PeopleGroupMember[] }) | null;
  peopleList: Person[];
  onClose: () => void;
  onDelete: () => void;
}) {
  const { toast } = useToast();
  const itemsKey = ["/api/relationships/groups", groupId, "items"] as const;
  const groupsKey = ["/api/relationships/groups"] as const;

  const { data: items = [] } = useQuery<SharedItemWithAuthor[]>({
    queryKey: itemsKey,
    queryFn: async () => {
      const r = await fetch(`/api/relationships/groups/${groupId}/items`, { credentials: "include" });
      if (!r.ok) throw new Error("load");
      return r.json();
    },
  });

  const [memberPersonId, setMemberPersonId] = useState("");

  const itemForm = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: { kind: "rule", text: "" },
  });

  const peopleById = useMemo(() => {
    const m = new Map<string, Person>();
    peopleList.forEach((p) => m.set(p.id, p));
    return m;
  }, [peopleList]);

  // Optimistic member add
  const addMemberMutation = useMutation({
    mutationFn: async (personId: string) => {
      const res = await apiRequest("POST", `/api/relationships/groups/${groupId}/members`, { personId });
      return (await res.json()) as PeopleGroupMember;
    },
    onMutate: async (personId) => {
      await queryClient.cancelQueries({ queryKey: groupsKey });
      const prev = queryClient.getQueryData<Array<PeopleGroup & { members: PeopleGroupMember[] }>>(groupsKey);
      const optimistic: PeopleGroupMember = {
        id: `tmp-${Date.now()}`,
        groupId,
        personId,
        partnerUserId: null,
        addedByUserId: null,
        createdAt: new Date(),
      } as PeopleGroupMember;
      queryClient.setQueryData<Array<PeopleGroup & { members: PeopleGroupMember[] }>>(groupsKey, (old) =>
        (old ?? []).map((g) => (g.id === groupId ? { ...g, members: [...g.members, optimistic] } : g)),
      );
      return { prev };
    },
    onError: (e: any, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(groupsKey, ctx.prev);
      toast({ title: "Couldn't add", description: e?.message, variant: "destructive" });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: groupsKey }),
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await apiRequest("DELETE", `/api/relationships/groups/${groupId}/members/${memberId}`);
    },
    onMutate: async (memberId) => {
      await queryClient.cancelQueries({ queryKey: groupsKey });
      const prev = queryClient.getQueryData<Array<PeopleGroup & { members: PeopleGroupMember[] }>>(groupsKey);
      queryClient.setQueryData<Array<PeopleGroup & { members: PeopleGroupMember[] }>>(groupsKey, (old) =>
        (old ?? []).map((g) =>
          g.id === groupId ? { ...g, members: g.members.filter((m) => m.id !== memberId) } : g,
        ),
      );
      return { prev };
    },
    onError: (e: any, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(groupsKey, ctx.prev);
      toast({ title: "Couldn't remove", description: e?.message, variant: "destructive" });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: groupsKey }),
  });

  const addItemMutation = useMutation({
    mutationFn: async (values: ItemFormValues) => {
      const res = await apiRequest("POST", `/api/relationships/groups/${groupId}/items`, {
        kind: values.kind,
        payload: { text: values.text.trim() },
      });
      return (await res.json()) as SharedItemWithAuthor;
    },
    onMutate: async (values) => {
      await queryClient.cancelQueries({ queryKey: itemsKey });
      const prev = queryClient.getQueryData<SharedItemWithAuthor[]>(itemsKey);
      const optimistic: SharedItemWithAuthor = {
        id: `tmp-${Date.now()}`,
        groupId,
        authorUserId: null,
        kind: values.kind,
        payload: { text: values.text.trim() },
        createdAt: new Date(),
        authorName: "You",
      } as unknown as SharedItemWithAuthor;
      queryClient.setQueryData<SharedItemWithAuthor[]>(itemsKey, (old) => [optimistic, ...(old ?? [])]);
      itemForm.reset({ kind: values.kind, text: "" });
      return { prev };
    },
    onError: (e: any, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(itemsKey, ctx.prev);
      toast({ title: "Couldn't add", description: e?.message, variant: "destructive" });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: itemsKey }),
  });

  const removeItemMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/relationships/groups/${groupId}/items/${id}`);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: itemsKey });
      const prev = queryClient.getQueryData<SharedItemWithAuthor[]>(itemsKey);
      queryClient.setQueryData<SharedItemWithAuthor[]>(itemsKey, (old) =>
        (old ?? []).filter((it) => it.id !== id),
      );
      return { prev };
    },
    onError: (e: any, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(itemsKey, ctx.prev);
      toast({ title: "Couldn't remove", description: e?.message, variant: "destructive" });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: itemsKey }),
  });

  if (!group) return null;
  const availablePeople = peopleList.filter((p) => !group.members.some((m) => m.personId === p.id));

  return (
    <Sheet open={!!groupId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto" data-testid="sheet-group">
        <SheetHeader>
          <SheetTitle>{group.name}</SheetTitle>
          <SheetDescription className="capitalize">
            {GROUP_KINDS.find((k) => k.value === group.kind)?.label ?? group.kind}
          </SheetDescription>
        </SheetHeader>

        {group.description && (
          <div className="text-sm text-foreground/80 mt-3">{group.description}</div>
        )}

        <div className="mt-4">
          <div className="text-xs font-semibold mb-2">Members</div>
          {group.members.length === 0 ? (
            <div className="text-xs text-muted-foreground italic">No members yet.</div>
          ) : (
            <div className="space-y-1">
              {group.members.map((m) => {
                const p = peopleById.get(m.personId);
                return (
                  <div key={m.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-muted/30 text-sm" data-testid={`member-${m.id}`}>
                    <span>
                      {p?.name ?? "Removed person"}
                      {m.partnerUserId && (
                        <Badge variant="outline" className="ml-2 text-[10px]">linked</Badge>
                      )}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-muted-foreground"
                      onClick={() => removeMemberMutation.mutate(m.id)}
                      data-testid={`button-remove-member-${m.id}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
          {availablePeople.length > 0 && (
            <div className="flex gap-2 mt-2">
              <Select value={memberPersonId} onValueChange={setMemberPersonId}>
                <SelectTrigger data-testid="select-add-member"><SelectValue placeholder="Add a person" /></SelectTrigger>
                <SelectContent>
                  {availablePeople.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={() => {
                  if (!memberPersonId) return;
                  addMemberMutation.mutate(memberPersonId);
                  setMemberPersonId("");
                }}
                disabled={!memberPersonId || addMemberMutation.isPending}
                data-testid="button-add-member"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        <div className="mt-5">
          <div className="text-xs font-semibold mb-2">Shared items</div>
          <Form {...itemForm}>
            <form
              onSubmit={itemForm.handleSubmit((v) => addItemMutation.mutate(v))}
              className="space-y-2 p-3 rounded-lg border border-dashed"
            >
              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={itemForm.control}
                  name="kind"
                  render={({ field }) => (
                    <FormItem>
                      <Select value={field.value} onValueChange={(v) => field.onChange(v as ItemKind)}>
                        <FormControl>
                          <SelectTrigger data-testid="select-item-kind"><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="rule">Rule</SelectItem>
                          <SelectItem value="event">Event</SelectItem>
                          <SelectItem value="appreciation">Appreciation</SelectItem>
                          <SelectItem value="note">Note</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" size="sm" disabled={addItemMutation.isPending} data-testid="button-add-item">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </div>
              <FormField
                control={itemForm.control}
                name="text"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="e.g. no phones at dinner" data-testid="input-item-text" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
          <div className="mt-2 space-y-1.5">
            {items.length === 0 ? (
              <div className="text-xs text-muted-foreground italic">No shared items yet.</div>
            ) : (
              items.map((it) => {
                const payloadText = (it.payload as { text?: unknown } | null)?.text;
                const text: string = typeof payloadText === "string" ? payloadText : JSON.stringify(it.payload);
                const author = it.authorName?.trim() || it.authorEmail || "Unknown";
                return (
                  <Card key={it.id} data-testid={`item-${it.id}`}>
                    <CardContent className="p-3 flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <Badge variant="outline" className="text-[10px] capitalize mb-1">{it.kind}</Badge>
                        <div className="text-sm">{text}</div>
                        <div className="text-[10px] text-muted-foreground mt-1" data-testid={`item-author-${it.id}`}>
                          by {author}
                          {it.createdAt && ` · ${formatDistanceToNow(new Date(it.createdAt), { addSuffix: true })}`}
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground"
                        onClick={() => removeItemMutation.mutate(it.id)}
                        data-testid={`button-delete-item-${it.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-border/50 flex justify-end">
          <Button size="sm" variant="ghost" className="text-rose-600 dark:text-rose-400" onClick={onDelete} data-testid="button-delete-group">
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete group
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Insights tab ─────────────────────────────────────────────────────────────

function InsightsTab({
  insights,
  peopleById,
  setTab,
  setOpenPersonId,
}: {
  insights: RelationshipInsight[];
  peopleById: Map<string, Person>;
  setTab: (t: TabKey) => void;
  setOpenPersonId: (id: string | null) => void;
}) {
  const { toast } = useToast();
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    try {
      const res = await apiRequest("POST", "/api/relationships/insights/refresh");
      const data = await res.json();
      await queryClient.invalidateQueries({ queryKey: ["/api/relationships/insights"] });
      toast({ title: data.created > 0 ? `${data.created} fresh insight${data.created === 1 ? "" : "s"}` : "Nothing new to surface" });
    } catch (e: any) {
      toast({ title: "Couldn't refresh", description: e?.message, variant: "destructive" });
    } finally {
      setRefreshing(false);
    }
  }

  async function dismiss(id: string) {
    try {
      await apiRequest("POST", `/api/relationships/insights/${id}/dismiss`);
      await queryClient.invalidateQueries({ queryKey: ["/api/relationships/insights"] });
    } catch (e: any) {
      toast({ title: "Couldn't dismiss", description: e?.message, variant: "destructive" });
    }
  }

  function actOnCta(insight: RelationshipInsight) {
    const cta = insight.cta as { tab?: string; personId?: string } | null;
    if (cta?.personId) {
      setOpenPersonId(cta.personId);
    } else if (cta?.tab === "health" || cta?.tab === "crm" || cta?.tab === "hub") {
      setTab(cta.tab as TabKey);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          DW reads your interaction graph and surfaces what needs attention.
        </div>
        <Button size="sm" variant="outline" onClick={refresh} disabled={refreshing} data-testid="button-refresh-insights">
          <RefreshCw className={cn("h-3.5 w-3.5 mr-1", refreshing && "animate-spin")} /> Refresh
        </Button>
      </div>

      {insights.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground space-y-3">
            <Lightbulb className="h-10 w-10 text-muted-foreground/40 mx-auto" />
            <div>No insights yet. Tap refresh once you've added a few people and interactions.</div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {insights.map((i) => {
            const person = i.personId ? peopleById.get(i.personId) : null;
            return (
              <Card key={i.id} data-testid={`insight-${i.id}`}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1">
                      <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <div className="flex-1 text-sm">{i.message}</div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-muted-foreground"
                      onClick={() => dismiss(i.id)}
                      data-testid={`button-dismiss-${i.id}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] capitalize">{i.kind}</Badge>
                    {person && <span className="text-[11px] text-muted-foreground">{person.name}</span>}
                    {!!i.cta && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs ml-auto"
                        onClick={() => actOnCta(i)}
                        data-testid={`button-cta-${i.id}`}
                      >
                        Open
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
