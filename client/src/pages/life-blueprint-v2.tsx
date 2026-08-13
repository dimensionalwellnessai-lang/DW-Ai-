import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/page-header";
import {
  ArrowLeft,
  Plus,
  X,
  Save,
  Edit2,
  ChevronRight,
  Anchor,
  Sunrise,
  Heart,
  Brain,
  Home,
  Users,
  ShieldCheck,
  Waves,
  Sprout,
  LifeBuoy,
  Sparkles,
  Briefcase,
  Wallet,
  Flame,
  Compass,
  Hammer,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  PILLARS_BY_LEVEL,
  LEVEL_META,
  LEGACY_TO_PILLAR_MAP,
  PILLAR_STATUSES,
  type PillarDefinition,
  type PillarStatus,
} from "../../../shared/lifeSystemTaxonomy";
import { motion } from "framer-motion";
import { usePageMeta } from "@/hooks/use-page-meta";
import { DWContextPrompt } from "@/components/dw-context-prompt";
import { apiRequest } from "@/lib/queryClient";
import type { LifeSystemLevel } from "@shared/schema";

// ── Icon lookup ───────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Anchor, Sunrise, Heart, Brain, Home, Users, ShieldCheck, Waves, Sprout,
  LifeBuoy, Sparkles, Briefcase, Wallet, Flame, Compass, Hammer,
};

function PillarIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] ?? Anchor;
  return <Icon className={className} />;
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface PillarCheckin {
  id: string;
  pillarId: string;
  status: PillarStatus;
  note: string | null;
  checkedAt: string;
}

/** Legacy assessment row — kept for backwards-compat display only */
interface LegacyAssessment {
  id: string;
  dimension: string;
  score: number;
  answers: Record<string, number>;
  assessedAt: string;
}

interface DimensionSystem {
  id: string;
  dimension: string;
  name: string;
  description: string | null;
  components: string[] | null;
  relatedGoals: string[] | null;
  isActive: boolean;
}

interface Goal {
  id: string;
  title: string;
  dimension?: string;
  status: string;
}

// ── Status helpers ────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<PillarStatus, string> = {
  "Powered": "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  "Stable": "bg-blue-500/15 text-blue-600 border-blue-500/30",
  "Building": "bg-amber-500/15 text-amber-600 border-amber-500/30",
  "Needs Attention": "bg-rose-500/15 text-rose-600 border-rose-500/30",
};

function StatusBadge({ status }: { status: PillarStatus }) {
  return (
    <Badge
      variant="outline"
      className={`text-xs font-medium border ${STATUS_COLORS[status]}`}
    >
      {status}
    </Badge>
  );
}

// ── Resolve status from legacy score (1-5) ────────────────────────────────────
function scoreToStatus(score: number): PillarStatus {
  if (score >= 4.5) return "Powered";
  if (score >= 3.5) return "Stable";
  if (score >= 2.5) return "Building";
  return "Needs Attention";
}

// ── Main component ────────────────────────────────────────────────────────────
export default function LifeBlueprintV2() {
  usePageMeta("Life Blueprint", "Explore your life system pillars.");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedPillar, setSelectedPillar] = useState<PillarDefinition | null>(null);
  const [checkinPillar, setCheckinPillar] = useState<PillarDefinition | null>(null);
  const [checkinStatus, setCheckinStatus] = useState<PillarStatus>("Stable");
  const [checkinNote, setCheckinNote] = useState("");
  const [editingResetProtocol, setEditingResetProtocol] = useState(false);
  const [newSystemName, setNewSystemName] = useState("");
  const [newSystemDescription, setNewSystemDescription] = useState("");
  const [showAddSystem, setShowAddSystem] = useState(false);
  const [addSystemPillar, setAddSystemPillar] = useState<string | null>(null);

  // ── Data fetching ───────────────────────────────────────────────────────────
  const { data: pillarCheckins = [] } = useQuery<PillarCheckin[]>({
    queryKey: ["/api/pillar-checkins"],
  });

  const { data: legacyAssessments = [] } = useQuery<LegacyAssessment[]>({
    queryKey: ["/api/life-dimension-assessments"],
  });

  const { data: allSystems = [] } = useQuery<DimensionSystem[]>({
    queryKey: ["/api/dimension-systems"],
  });

  const { data: goals = [] } = useQuery<Goal[]>({
    queryKey: ["/api/goals"],
  });

  const { data: resetProtocol } = useQuery({
    queryKey: ["/api/reset-protocol"],
  });

  // ── Mutations ───────────────────────────────────────────────────────────────
  const createCheckinMutation = useMutation({
    mutationFn: async (data: { pillarId: string; status: PillarStatus; note?: string }) => {
      const res = await apiRequest("POST", "/api/pillar-checkins", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pillar-checkins"] });
      toast({ title: "Check-in saved.", description: "Your reflection has been recorded." });
      setCheckinPillar(null);
      setCheckinNote("");
      setCheckinStatus("Stable");
    },
  });

  const createSystemMutation = useMutation({
    mutationFn: async (data: { dimension: string; name: string; description: string }) => {
      const res = await apiRequest("POST", "/api/dimension-systems", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dimension-systems"] });
      toast({ title: "System created." });
      setShowAddSystem(false);
      setNewSystemName("");
      setNewSystemDescription("");
    },
  });

  const deleteSystemMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/dimension-systems/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dimension-systems"] });
      toast({ title: "System removed." });
    },
  });

  const updateResetProtocolMutation = useMutation({
    mutationFn: async (data: {
      redFlags?: string[];
      howIReset?: string[];
      whenThingsGetHard?: string[];
    }) => {
      const typedProtocol = resetProtocol as any;
      if (typedProtocol?.id) {
        const res = await apiRequest("PATCH", `/api/reset-protocol/${typedProtocol.id}`, data);
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/reset-protocol", data);
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reset-protocol"] });
      setEditingResetProtocol(false);
      toast({ title: "Reset Protocol updated." });
    },
  });

  // ── Helpers ─────────────────────────────────────────────────────────────────
  /** Best available status for a pillar: new check-in → legacy assessment → undefined */
  const getPillarStatus = (pillarId: string): PillarStatus | undefined => {
    const recent = pillarCheckins
      .filter((c) => c.pillarId === pillarId)
      .sort((a, b) => new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime())[0];
    if (recent) return recent.status as PillarStatus;

    // Fall back to legacy assessment via mapping
    const legacyId = Object.entries(LEGACY_TO_PILLAR_MAP).find(([, pid]) => pid === pillarId)?.[0];
    if (legacyId) {
      const legacyRow = legacyAssessments
        .filter((a) => a.dimension === legacyId)
        .sort((a, b) => new Date(b.assessedAt).getTime() - new Date(a.assessedAt).getTime())[0];
      if (legacyRow) return scoreToStatus(legacyRow.score);
    }
    return undefined;
  };

  const getSystemsForPillar = (pillarId: string): DimensionSystem[] => {
    // Match by pillar id OR by legacy dimension name
    const legacyIds = Object.entries(LEGACY_TO_PILLAR_MAP)
      .filter(([, pid]) => pid === pillarId)
      .map(([lid]) => lid);
    return allSystems.filter(
      (s) => s.dimension === pillarId || legacyIds.includes(s.dimension),
    );
  };

  const getGoalsForPillar = (pillarId: string): Goal[] => {
    const legacyIds = Object.entries(LEGACY_TO_PILLAR_MAP)
      .filter(([, pid]) => pid === pillarId)
      .map(([lid]) => lid);
    return goals.filter(
      (g) => g.dimension === pillarId || (g.dimension && legacyIds.includes(g.dimension)),
    );
  };

  // ── Pillar detail view ──────────────────────────────────────────────────────
  if (selectedPillar) {
    const status = getPillarStatus(selectedPillar.id);
    const systems = getSystemsForPillar(selectedPillar.id);
    const pillarGoals = getGoalsForPillar(selectedPillar.id);
    const levelMeta = LEVEL_META[selectedPillar.level];

    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedPillar(null)}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `hsl(${selectedPillar.color} / 0.15)` }}
            >
              <PillarIcon
                name={selectedPillar.icon}
                className="w-6 h-6"
                style={{ color: `hsl(${selectedPillar.color})` } as React.CSSProperties}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-semibold text-foreground">{selectedPillar.label}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{selectedPillar.summary}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  {levelMeta.label}
                </Badge>
                {status && <StatusBadge status={status} />}
              </div>
            </div>
          </div>

          {/* DW opening question */}
          <Card className="mb-6 border-dashed">
            <CardContent className="pt-4 pb-4">
              <p className="text-sm italic text-muted-foreground">
                "{selectedPillar.openingQuestion}"
              </p>
              <p className="text-xs text-muted-foreground/60 mt-2">{levelMeta.toneSentence}</p>
            </CardContent>
          </Card>

          {/* Check-in */}
          {checkinPillar?.id === selectedPillar.id ? (
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">How's this area right now?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {PILLAR_STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setCheckinStatus(s)}
                      className={`px-3 py-2 rounded-lg text-sm border transition-colors text-left ${
                        checkinStatus === s
                          ? STATUS_COLORS[s] + " border"
                          : "border-border text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <div>
                  <Label htmlFor="checkin-note" className="text-xs text-muted-foreground mb-1 block">
                    Anything you want to note? (optional)
                  </Label>
                  <Textarea
                    id="checkin-note"
                    placeholder="A few words is enough…"
                    value={checkinNote}
                    onChange={(e) => setCheckinNote(e.target.value)}
                    rows={3}
                    className="text-sm resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      createCheckinMutation.mutate({
                        pillarId: selectedPillar.id,
                        status: checkinStatus,
                        note: checkinNote || undefined,
                      })
                    }
                    disabled={createCheckinMutation.isPending}
                  >
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setCheckinPillar(null);
                      setCheckinNote("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button
              variant="outline"
              className="w-full mb-6"
              onClick={() => setCheckinPillar(selectedPillar)}
            >
              Check in on this area
            </Button>
          )}

          {/* Systems & Frameworks */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-foreground">Systems & Frameworks</h2>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => {
                  setAddSystemPillar(selectedPillar.id);
                  setShowAddSystem(true);
                }}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add
              </Button>
            </div>

            {showAddSystem && addSystemPillar === selectedPillar.id && (
              <Card className="mb-3 border-dashed">
                <CardContent className="pt-4 pb-3 space-y-3">
                  <Input
                    placeholder="System name"
                    value={newSystemName}
                    onChange={(e) => setNewSystemName(e.target.value)}
                    className="text-sm"
                  />
                  <Textarea
                    placeholder="What is this system for? (optional)"
                    value={newSystemDescription}
                    onChange={(e) => setNewSystemDescription(e.target.value)}
                    rows={2}
                    className="text-sm resize-none"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        createSystemMutation.mutate({
                          dimension: selectedPillar.id,
                          name: newSystemName,
                          description: newSystemDescription,
                        })
                      }
                      disabled={!newSystemName.trim() || createSystemMutation.isPending}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setShowAddSystem(false);
                        setNewSystemName("");
                        setNewSystemDescription("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {systems.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                No systems yet. Add one to track how you manage this area.
              </p>
            ) : (
              <div className="space-y-2">
                {systems.map((sys) => (
                  <Card key={sys.id} className="relative">
                    <CardContent className="py-3 px-4 pr-10">
                      <p className="text-sm font-medium text-foreground">{sys.name}</p>
                      {sys.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{sys.description}</p>
                      )}
                    </CardContent>
                    <button
                      className="absolute top-3 right-3 text-muted-foreground hover:text-destructive transition-colors"
                      onClick={() => deleteSystemMutation.mutate(sys.id)}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Related goals */}
          {pillarGoals.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-foreground mb-3">Related Goals</h2>
              <div className="space-y-2">
                {pillarGoals.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg bg-accent/40 text-sm"
                  >
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-foreground">{g.title}</span>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {g.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Overview ─────────────────────────────────────────────────────────────────
  const typedProtocol = resetProtocol as any;

  const levels: LifeSystemLevel[] = ["core", "expression", "creation"];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <PageHeader
          title="Life Blueprint"
          description="Your Life System, one pillar at a time."
        />

        <Tabs defaultValue="pillars" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pillars">Pillars</TabsTrigger>
            <TabsTrigger value="reset">Reset Protocol</TabsTrigger>
          </TabsList>

          {/* ── Pillars tab ───────────────────────────────────────────────── */}
          <TabsContent value="pillars" className="mt-4 space-y-8">
            {levels.map((level) => {
              const meta = LEVEL_META[level];
              const pillars = PILLARS_BY_LEVEL[level];
              return (
                <section key={level}>
                  <div className="mb-3">
                    <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                      {meta.label}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{meta.tagline}</p>
                  </div>
                  <div className="space-y-2">
                    {pillars.map((pillar) => {
                      const status = getPillarStatus(pillar.id);
                      return (
                        <motion.button
                          key={pillar.id}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => setSelectedPillar(pillar)}
                          className="w-full text-left"
                        >
                          <Card className="hover:bg-accent/30 transition-colors cursor-pointer">
                            <CardContent className="py-4 px-4 flex items-center gap-3">
                              <div
                                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ background: `hsl(${pillar.color} / 0.12)` }}
                              >
                                <PillarIcon
                                  name={pillar.icon}
                                  className="w-4.5 h-4.5"
                                  style={{ color: `hsl(${pillar.color})` } as React.CSSProperties}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground leading-snug">
                                  {pillar.label}
                                </p>
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                  {pillar.summary}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {status ? (
                                  <StatusBadge status={status} />
                                ) : (
                                  <span className="text-xs text-muted-foreground/60">
                                    Not checked in
                                  </span>
                                )}
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              </div>
                            </CardContent>
                          </Card>
                        </motion.button>
                      );
                    })}
                  </div>
                  {level !== "creation" && <Separator className="mt-6" />}
                </section>
              );
            })}
          </TabsContent>

          {/* ── Reset Protocol tab ───────────────────────────────────────────── */}
          <TabsContent value="reset" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Reset Protocol</CardTitle>
                    <CardDescription className="text-xs mt-1">
                      What you do when things get hard — your personal recovery system.
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingResetProtocol(!editingResetProtocol)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {editingResetProtocol ? (
                  <ResetProtocolEditor
                    protocol={typedProtocol}
                    onSave={(data) => updateResetProtocolMutation.mutate(data)}
                    isSaving={updateResetProtocolMutation.isPending}
                    onCancel={() => setEditingResetProtocol(false)}
                  />
                ) : typedProtocol?.id ? (
                  <ResetProtocolReadOnly protocol={typedProtocol} />
                ) : (
                  <p className="text-sm text-muted-foreground py-2">
                    You haven't set up a Reset Protocol yet.{" "}
                    <button
                      className="underline text-foreground"
                      onClick={() => setEditingResetProtocol(true)}
                    >
                      Set one up
                    </button>
                    .
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ── Reset Protocol sub-components ─────────────────────────────────────────────
function ResetProtocolReadOnly({ protocol }: { protocol: any }) {
  const sections: Array<{ key: string; label: string }> = [
    { key: "redFlags", label: "Red Flags" },
    { key: "howIReset", label: "How I Reset" },
    { key: "whenThingsGetHard", label: "When Things Get Hard" },
  ];

  return (
    <div className="space-y-4">
      {sections.map(({ key, label }) => {
        const items: string[] = protocol[key] ?? [];
        return items.length > 0 ? (
          <div key={key}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              {label}
            </p>
            <ul className="space-y-1">
              {items.map((item: string, i: number) => (
                <li key={i} className="text-sm text-foreground flex gap-2">
                  <span className="text-muted-foreground">–</span> {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null;
      })}
    </div>
  );
}

function ResetProtocolEditor({
  protocol,
  onSave,
  isSaving,
  onCancel,
}: {
  protocol: any;
  onSave: (data: any) => void;
  isSaving: boolean;
  onCancel: () => void;
}) {
  const [redFlags, setRedFlags] = useState<string[]>(protocol?.redFlags ?? [""]);
  const [howIReset, setHowIReset] = useState<string[]>(protocol?.howIReset ?? [""]);
  const [whenThingsGetHard, setWhenThingsGetHard] = useState<string[]>(
    protocol?.whenThingsGetHard ?? [""],
  );

  const updateList = (
    list: string[],
    setter: (v: string[]) => void,
    idx: number,
    val: string,
  ) => {
    const updated = [...list];
    updated[idx] = val;
    setter(updated);
  };

  const addItem = (list: string[], setter: (v: string[]) => void) =>
    setter([...list, ""]);

  const removeItem = (list: string[], setter: (v: string[]) => void, idx: number) =>
    setter(list.filter((_, i) => i !== idx));

  const clean = (arr: string[]) => arr.filter((s) => s.trim());

  return (
    <div className="space-y-5">
      {[
        { label: "Red Flags", list: redFlags, setter: setRedFlags, placeholder: "A sign you're off-track…" },
        { label: "How I Reset", list: howIReset, setter: setHowIReset, placeholder: "What actually helps…" },
        { label: "When Things Get Hard", list: whenThingsGetHard, setter: setWhenThingsGetHard, placeholder: "Your go-to move…" },
      ].map(({ label, list, setter, placeholder }) => (
        <div key={label}>
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {label}
          </Label>
          <div className="mt-2 space-y-2">
            {list.map((item, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={item}
                  onChange={(e) => updateList(list, setter, i, e.target.value)}
                  placeholder={placeholder}
                  className="text-sm flex-1"
                />
                {list.length > 1 && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 flex-shrink-0"
                    onClick={() => removeItem(list, setter, i)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs pl-0"
              onClick={() => addItem(list, setter)}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add
            </Button>
          </div>
        </div>
      ))}

      <div className="flex gap-2 pt-2">
        <Button
          size="sm"
          onClick={() =>
            onSave({
              redFlags: clean(redFlags),
              howIReset: clean(howIReset),
              whenThingsGetHard: clean(whenThingsGetHard),
            })
          }
          disabled={isSaving}
        >
          <Save className="w-3.5 h-3.5 mr-1.5" />
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
