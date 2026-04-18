import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow, parseISO } from "date-fns";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { usePageMeta } from "@/hooks/use-page-meta";
import type { Person, PeopleInteraction, AlivenessMoment } from "@shared/schema";

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

const WEEKLY_RHYTHM = [
  { day: "Mon", focus: "Light social only", tone: "muted", icon: Moon },
  { day: "Tue", focus: "Light social only", tone: "muted", icon: Moon },
  { day: "Wed", focus: "Light social only", tone: "muted", icon: Moon },
  { day: "Thu", focus: "Light social only", tone: "muted", icon: Moon },
  { day: "Fri", focus: "Optional connection / solo reset", tone: "warm", icon: Wind },
  { day: "Sat", focus: "Main social window — feel alive", tone: "bright", icon: Sun },
  { day: "Sun", focus: "Low social, calm check-in", tone: "calm", icon: Moon },
];

const SOCIAL_RADAR = [
  "Do I feel lighter or heavier after that?",
  "More clear or more confused?",
  "More like myself or less?",
  "What's mine vs what's theirs?",
  "What deserves a response — and what deserves silence?",
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const cat = (key: string | null | undefined) =>
  CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[2];

const relLabel = (value: string | null | undefined) =>
  RELATIONSHIPS.find((r) => r.value === value)?.label ?? "Friend";

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

// ── Page ─────────────────────────────────────────────────────────────────────

export default function RelationshipsPage() {
  usePageMeta(
    "Relationships — DW Wellness",
    "Track the people in your life — categorize, log how interactions land, and see your weekly social rhythm.",
  );

  const { toast } = useToast();
  const [tab, setTab] = useState<"people" | "interactions" | "rhythm" | "aliveness">(
    "people",
  );
  const [filterCategory, setFilterCategory] = useState<CategoryKey | "all">("all");

  // Dialog state
  const [personDialog, setPersonDialog] = useState<{ mode: "new" | "edit"; person?: Person } | null>(
    null,
  );
  const [interactionDialog, setInteractionDialog] = useState<{ personId?: string } | null>(null);
  const [alivenessDialog, setAlivenessDialog] = useState<boolean>(false);
  const [confirmDelete, setConfirmDelete] = useState<{ kind: "person" | "interaction" | "aliveness"; id: string; label: string } | null>(null);

  const { data: peopleList = [], isLoading: peopleLoading } = useQuery<Person[]>({
    queryKey: ["/api/people"],
  });

  const { data: interactions = [] } = useQuery<PeopleInteraction[]>({
    queryKey: ["/api/people/interactions"],
  });

  const { data: alivenessList = [] } = useQuery<AlivenessMoment[]>({
    queryKey: ["/api/aliveness"],
  });

  // Group people by category for People tab
  const peopleByCategory = useMemo(() => {
    const filtered =
      filterCategory === "all"
        ? peopleList
        : peopleList.filter((p) => (p.category ?? "neutral") === filterCategory);
    const groups: Record<CategoryKey, Person[]> = {
      aligned: [],
      growth: [],
      neutral: [],
      draining: [],
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

  // Counts for category overview at the top
  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryKey, number> = {
      aligned: 0,
      growth: 0,
      neutral: 0,
      draining: 0,
    };
    for (const p of peopleList) {
      const k = (p.category ?? "neutral") as CategoryKey;
      if (k in counts) counts[k] += 1;
    }
    return counts;
  }, [peopleList]);

  async function handleDeletePerson(id: string) {
    try {
      await apiRequest("DELETE", `/api/people/${id}`);
      await queryClient.invalidateQueries({ queryKey: ["/api/people"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/people/interactions"] });
      toast({ title: "Person removed" });
    } catch (e: any) {
      toast({ title: "Couldn't remove", description: e?.message, variant: "destructive" });
    }
  }
  async function handleDeleteInteraction(id: string) {
    try {
      await apiRequest("DELETE", `/api/people/interactions/${id}`);
      await queryClient.invalidateQueries({ queryKey: ["/api/people/interactions"] });
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

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Relationships" />
      <div className="page-header-spacer" />

      <div className="container max-w-3xl mx-auto px-4 pb-24 pt-2 space-y-4">
        {/* Intro / why this exists */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex gap-3 items-start">
            <Heart className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-sm text-foreground/80 leading-relaxed">
              Your environment includes <span className="font-medium text-foreground">people</span>, not
              just your space. Track who's around you, how each connection lands, and where your real
              aliveness shows up.
            </div>
          </CardContent>
        </Card>

        {/* Category overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.key}
                onClick={() => {
                  setFilterCategory(filterCategory === c.key ? "all" : c.key);
                  setTab("people");
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

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="people" data-testid="tab-people">
              <Users className="h-4 w-4 mr-1.5" />
              People
            </TabsTrigger>
            <TabsTrigger value="interactions" data-testid="tab-interactions">
              <Coffee className="h-4 w-4 mr-1.5" />
              Log
            </TabsTrigger>
            <TabsTrigger value="rhythm" data-testid="tab-rhythm">
              <CalendarIcon className="h-4 w-4 mr-1.5" />
              Rhythm
            </TabsTrigger>
            <TabsTrigger value="aliveness" data-testid="tab-aliveness">
              <Sparkles className="h-4 w-4 mr-1.5" />
              Aliveness
            </TabsTrigger>
          </TabsList>

          {/* ── People ── */}
          <TabsContent value="people" className="space-y-3 mt-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                {filterCategory !== "all" && (
                  <Badge variant="outline" className="cursor-pointer" onClick={() => setFilterCategory("all")}>
                    <Filter className="h-3 w-3 mr-1" /> {cat(filterCategory).label}
                    <span className="ml-1.5 opacity-70">×</span>
                  </Badge>
                )}
              </div>
              <Button
                size="sm"
                onClick={() => setPersonDialog({ mode: "new" })}
                data-testid="button-add-person"
              >
                <Plus className="h-4 w-4 mr-1" /> Add person
              </Button>
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
                            onLog={() => setInteractionDialog({ personId: p.id })}
                            onEdit={() => setPersonDialog({ mode: "edit", person: p })}
                            onDelete={() =>
                              setConfirmDelete({
                                kind: "person",
                                id: p.id,
                                label: p.name,
                              })
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

          {/* ── Interactions log ── */}
          <TabsContent value="interactions" className="space-y-3 mt-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                After each interaction, ask yourself: lighter or heavier?
              </div>
              <Button
                size="sm"
                onClick={() => setInteractionDialog({})}
                disabled={peopleList.length === 0}
                data-testid="button-add-interaction"
              >
                <Plus className="h-4 w-4 mr-1" /> Log
              </Button>
            </div>

            {interactions.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  No interactions logged yet.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {interactions.map((i) => {
                  const person = peopleById.get(i.personId);
                  const kind = INTERACTION_KINDS.find((k) => k.value === (i.kind ?? "in-person"));
                  const KindIcon = kind?.icon ?? Coffee;
                  return (
                    <Card key={i.id} data-testid={`interaction-${i.id}`}>
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <KindIcon className="h-4 w-4 text-primary flex-shrink-0" />
                            <div className="min-w-0">
                              <div className="font-medium text-sm truncate">
                                {person?.name ?? "Unknown person"}
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                {kind?.label ?? "Interaction"} ·{" "}
                                {i.occurredAt
                                  ? formatDistanceToNow(new Date(i.occurredAt), { addSuffix: true })
                                  : "recent"}
                              </div>
                            </div>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground"
                            onClick={() =>
                              setConfirmDelete({
                                kind: "interaction",
                                id: i.id,
                                label: person?.name ?? "this interaction",
                              })
                            }
                            data-testid={`button-delete-interaction-${i.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                          <ScoreScale
                            value={i.energyAfter}
                            label="Energy"
                            positive="Lighter"
                            negative="Heavier"
                          />
                          <ScoreScale
                            value={i.clarityAfter}
                            label="Clarity"
                            positive="Clearer"
                            negative="Foggier"
                          />
                          <ScoreScale
                            value={i.selfAfter}
                            label="Self"
                            positive="More me"
                            negative="Less me"
                          />
                        </div>
                        {i.notes && (
                          <div className="text-xs text-muted-foreground/90 italic border-l-2 border-primary/30 pl-2">
                            {i.notes}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Social radar reference */}
            <Card className="border-primary/20 bg-muted/30 mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" /> Social Radar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-xs space-y-1.5 text-foreground/80">
                  {SOCIAL_RADAR.map((q) => (
                    <li key={q} className="flex gap-2">
                      <span className="text-primary mt-0.5">›</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Weekly Rhythm ── */}
          <TabsContent value="rhythm" className="space-y-3 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Your weekly social shape</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {WEEKLY_RHYTHM.map((d) => {
                  const Icon = d.icon;
                  const tint =
                    d.tone === "bright"
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
                      : d.tone === "warm"
                      ? "bg-violet-500/10 border-violet-500/30 text-violet-700 dark:text-violet-300"
                      : d.tone === "calm"
                      ? "bg-sky-500/10 border-sky-500/30 text-sky-700 dark:text-sky-300"
                      : "bg-muted/40 border-border text-muted-foreground";
                  return (
                    <div
                      key={d.day}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border px-3 py-2.5",
                        tint,
                      )}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <div className="font-semibold text-sm w-12">{d.day}</div>
                      <div className="text-sm">{d.focus}</div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="border-dashed">
              <CardContent className="p-4 text-xs text-muted-foreground space-y-1.5">
                <div className="font-medium text-foreground/90">Personal rules</div>
                <div>· Not everyone gets access to your full energy.</div>
                <div>· Connection should not cost your peace.</div>
                <div>· Distance is sometimes alignment, not conflict.</div>
                <div>· You can be kind without being available.</div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Aliveness moments ── */}
          <TabsContent value="aliveness" className="space-y-3 mt-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                Rooftops, music, real conversations — the moments you actually live.
              </div>
              <Button
                size="sm"
                onClick={() => setAlivenessDialog(true)}
                data-testid="button-add-aliveness"
              >
                <Plus className="h-4 w-4 mr-1" /> Capture
              </Button>
            </div>

            {alivenessList.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center text-sm text-muted-foreground space-y-3">
                  <Sparkles className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                  <div>No moments yet. Capture one when you next feel alive.</div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {alivenessList.map((m) => (
                  <Card key={m.id} data-testid={`aliveness-${m.id}`}>
                    <CardContent className="p-3 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-medium text-sm">{m.title}</div>
                        <div className="flex items-center gap-1">
                          <div className="flex" aria-label={`Aliveness ${m.alivenessLevel ?? 3}/5`}>
                            {[1, 2, 3, 4, 5].map((n) => (
                              <Sparkles
                                key={n}
                                className={cn(
                                  "h-3 w-3",
                                  n <= (m.alivenessLevel ?? 3)
                                    ? "text-primary fill-primary/40"
                                    : "text-muted-foreground/30",
                                )}
                              />
                            ))}
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground"
                            onClick={() =>
                              setConfirmDelete({
                                kind: "aliveness",
                                id: m.id,
                                label: m.title,
                              })
                            }
                            data-testid={`button-delete-aliveness-${m.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      {m.description && (
                        <div className="text-xs text-muted-foreground">{m.description}</div>
                      )}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {(m.tags ?? []).map((t) => (
                          <Badge key={t} variant="secondary" className="text-[10px]">
                            {t}
                          </Badge>
                        ))}
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {m.occurredAt
                            ? formatDistanceToNow(new Date(m.occurredAt), { addSuffix: true })
                            : ""}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
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

      {/* Aliveness dialog */}
      {alivenessDialog && (
        <AlivenessDialog open={alivenessDialog} onClose={() => setAlivenessDialog(false)} />
      )}

      {/* Delete confirm */}
      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {confirmDelete?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.kind === "person"
                ? "This also removes all logged interactions with them."
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
                else handleDeleteAliveness(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function PersonCard({
  person,
  onLog,
  onEdit,
  onDelete,
}: {
  person: Person;
  onLog: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta = cat(person.category);
  const initials = person.name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <Card data-testid={`person-${person.id}`}>
      <CardContent className="p-3 flex items-start gap-3">
        <div
          className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0",
            meta.className,
          )}
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
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium truncate" data-testid={`text-person-name-${person.id}`}>
              {person.name}
            </div>
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
              <Plus className="h-3 w-3 mr-1" /> Log interaction
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
  const [name, setName] = useState(person?.name ?? "");
  const [relationship, setRelationship] = useState(person?.relationship ?? "friend");
  const [category, setCategory] = useState<CategoryKey>(
    (person?.category as CategoryKey) ?? "neutral",
  );
  const [notes, setNotes] = useState(person?.notes ?? "");
  const [birthday, setBirthday] = useState(person?.birthday ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        relationship,
        category,
        notes: notes.trim() || null,
        birthday: birthday.trim() || null,
      };
      if (mode === "new") {
        await apiRequest("POST", "/api/people", body);
        toast({ title: "Added", description: name });
      } else if (person) {
        await apiRequest("PATCH", `/api/people/${person.id}`, body);
        toast({ title: "Updated" });
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/people"] });
      onClose();
    } catch (e: any) {
      toast({ title: "Couldn't save", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "new" ? "Add person" : "Edit person"}</DialogTitle>
          <DialogDescription>
            Name them, place them, capture what matters about how they show up.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="person-name" className="text-xs">Name</Label>
            <Input
              id="person-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Their name"
              data-testid="input-person-name"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Relationship</Label>
              <Select value={relationship ?? "friend"} onValueChange={setRelationship}>
                <SelectTrigger data-testid="select-person-relationship">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIPS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as CategoryKey)}>
                <SelectTrigger data-testid="select-person-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.key} value={c.key}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground italic">
            {cat(category).description}
          </div>
          <div>
            <Label htmlFor="person-bday" className="text-xs">Birthday (optional)</Label>
            <Input
              id="person-bday"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              placeholder="e.g. March 14 or 1991-03-14"
              data-testid="input-person-birthday"
            />
          </div>
          <div>
            <Label htmlFor="person-notes" className="text-xs">Notes</Label>
            <Textarea
              id="person-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What matters about them — patterns, what they need, what you appreciate."
              rows={3}
              data-testid="input-person-notes"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving} data-testid="button-save-person">
            {saving ? "Saving…" : mode === "new" ? "Add person" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
  const [personId, setPersonId] = useState<string>(defaultPersonId ?? people[0]?.id ?? "");
  const [kind, setKind] = useState("in-person");
  const [energy, setEnergy] = useState<number>(0);
  const [clarity, setClarity] = useState<number>(0);
  const [self, setSelf] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!personId) {
      toast({ title: "Choose a person first", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await apiRequest("POST", "/api/people/interactions", {
        personId,
        kind,
        energyAfter: energy,
        clarityAfter: clarity,
        selfAfter: self,
        notes: notes.trim() || null,
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/people/interactions"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/people"] });
      toast({ title: "Logged" });
      onClose();
    } catch (e: any) {
      toast({ title: "Couldn't save", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log an interaction</DialogTitle>
          <DialogDescription>
            How did it land? Lighter or heavier — clearer or foggier — more like you or less.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Person</Label>
              <Select value={personId} onValueChange={setPersonId}>
                <SelectTrigger data-testid="select-interaction-person">
                  <SelectValue placeholder="Pick a person" />
                </SelectTrigger>
                <SelectContent>
                  {people.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Kind</Label>
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger data-testid="select-interaction-kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERACTION_KINDS.map((k) => (
                    <SelectItem key={k.value} value={k.value}>
                      {k.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <ScoreRow label="Energy after" left="Heavier" right="Lighter" value={energy} setValue={setEnergy} testId="energy" />
          <ScoreRow label="Clarity after" left="Foggier" right="Clearer" value={clarity} setValue={setClarity} testId="clarity" />
          <ScoreRow label="Self after" left="Less me" right="More me" value={self} setValue={setSelf} testId="self" />

          <div>
            <Label htmlFor="interaction-notes" className="text-xs">Notes (optional)</Label>
            <Textarea
              id="interaction-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Anything to remember about this one."
              data-testid="input-interaction-notes"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving} data-testid="button-save-interaction">
            {saving ? "Saving…" : "Log it"}
          </Button>
        </DialogFooter>
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
        <span className="text-[10px] text-muted-foreground">
          {left} ↔ {right}
        </span>
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

function AlivenessDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [level, setLevel] = useState(4);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim()) {
      toast({ title: "Add a short title", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await apiRequest("POST", "/api/aliveness", {
        title: title.trim(),
        description: description.trim() || null,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 12),
        alivenessLevel: level,
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/aliveness"] });
      toast({ title: "Captured" });
      onClose();
    } catch (e: any) {
      toast({ title: "Couldn't save", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Capture an aliveness moment</DialogTitle>
          <DialogDescription>
            Rooftops, music, real conversations — the moments outside your head.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="aliveness-title" className="text-xs">What was it</Label>
            <Input
              id="aliveness-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. rooftop with Maya"
              data-testid="input-aliveness-title"
            />
          </div>
          <div>
            <Label htmlFor="aliveness-desc" className="text-xs">Notes</Label>
            <Textarea
              id="aliveness-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="What made it feel alive."
              data-testid="input-aliveness-description"
            />
          </div>
          <div>
            <Label htmlFor="aliveness-tags" className="text-xs">Tags (comma-separated)</Label>
            <Input
              id="aliveness-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="music, outside, rooftop"
              data-testid="input-aliveness-tags"
            />
          </div>
          <div>
            <Label className="text-xs">How alive did it feel?</Label>
            <div className="flex gap-1.5 mt-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setLevel(n)}
                  className={cn(
                    "flex-1 h-10 rounded-md border transition-colors flex items-center justify-center",
                    level >= n
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
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving} data-testid="button-save-aliveness">
            {saving ? "Saving…" : "Capture"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
