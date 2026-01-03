import { useState, useEffect } from "react";
import { 
  getDimensionAssessments, 
  saveDimensionAssessment,
  getFoundationsProfile,
  saveFoundationsProfile,
  hasFoundations,
  type DimensionAssessment,
  type FoundationsProfile,
  type WellnessDimension,
} from "@/lib/guest-storage";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  ArrowLeft,
  Heart,
  AlertCircle,
  RefreshCw,
  Users,
  BookOpen,
  Plus,
  X,
  Check,
  Trash2,
  Edit2,
  Clock,
  ExternalLink,
  Loader2,
  Compass,
  ChevronRight,
  ChevronDown,
  Activity,
  Smile,
  Brain,
  Flower2,
  TreePine,
  Briefcase,
  Wallet,
  Sparkles,
  SkipForward,
  MessageCircle,
  Anchor,
} from "lucide-react";
import type {
  WellnessBlueprint,
  BaselineProfile,
  StressSignals as StressSignalsType,
  StabilizingAction,
  SupportPreferences as SupportPreferencesType,
  RecoveryReflection,
} from "@shared/schema";

const WELLNESS_DIMENSIONS = [
  { 
    name: "Physical", 
    description: "Body health, exercise, nutrition, sleep, and physical self-care",
    color: "bg-red-500/10 text-red-600 dark:text-red-400",
    icon: Activity
  },
  { 
    name: "Emotional", 
    description: "Understanding and managing feelings, stress, and emotional awareness",
    color: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    icon: Smile
  },
  { 
    name: "Mental", 
    description: "Cognitive stimulation, learning, creativity, and intellectual growth",
    color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    icon: Brain
  },
  { 
    name: "Social", 
    description: "Relationships, community, belonging, and meaningful connections",
    color: "bg-green-500/10 text-green-600 dark:text-green-400",
    icon: Users
  },
  { 
    name: "Spiritual", 
    description: "Purpose, meaning, values, mindfulness, and inner peace",
    color: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
    icon: Flower2
  },
  { 
    name: "Environmental", 
    description: "Surroundings, nature, living space, and harmony with your environment",
    color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    icon: TreePine
  },
  { 
    name: "Occupational", 
    description: "Career satisfaction, work-life balance, and professional fulfillment",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    icon: Briefcase
  },
  { 
    name: "Financial", 
    description: "Money management, security, stability, and financial peace of mind",
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    icon: Wallet
  },
];

const DIMENSION_OPTIONS = WELLNESS_DIMENSIONS.map(d => d.name);

const PACE_OPTIONS = [
  { value: "gentle", label: "Gentle", description: "Take it slow, one thing at a time" },
  { value: "steady", label: "Steady", description: "Balanced rhythm, sustainable pace" },
  { value: "focused", label: "Focused", description: "Clear objectives, purposeful action" },
];

interface BlueprintData {
  blueprint: WellnessBlueprint;
  baseline: BaselineProfile | null;
  signals: StressSignalsType | null;
  actions: StabilizingAction[];
  support: SupportPreferencesType | null;
  reflections: RecoveryReflection[];
}

export function BlueprintPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("foundations");

  const { data, isLoading } = useQuery<BlueprintData>({
    queryKey: ["/api/blueprint"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-display font-semibold">Wellness Blueprint</h1>
              <p className="text-sm text-muted-foreground">Your personal wellness framework</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 sm:grid-cols-7 h-auto p-1 gap-1">
            <TabsTrigger value="foundations" className="flex flex-col gap-1 py-3 data-[state=active]:bg-amber-500/20" data-testid="tab-foundations">
              <Anchor className="w-4 h-4" />
              <span className="text-xs">Foundations</span>
            </TabsTrigger>
            <TabsTrigger value="baseline" className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary/10" data-testid="tab-baseline">
              <Heart className="w-4 h-4" />
              <span className="text-xs">Baseline</span>
            </TabsTrigger>
            <TabsTrigger value="dimensions" className="flex flex-col gap-1 py-3 data-[state=active]:bg-sky-500/20" data-testid="tab-dimensions">
              <Compass className="w-4 h-4" />
              <span className="text-xs">Dimensions</span>
            </TabsTrigger>
            <TabsTrigger value="signals" className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary/10" data-testid="tab-signals">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs">Signals</span>
            </TabsTrigger>
            <TabsTrigger value="actions" className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary/10" data-testid="tab-actions">
              <RefreshCw className="w-4 h-4" />
              <span className="text-xs">Reset</span>
            </TabsTrigger>
            <TabsTrigger value="support" className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary/10" data-testid="tab-support">
              <Users className="w-4 h-4" />
              <span className="text-xs">Support</span>
            </TabsTrigger>
            <TabsTrigger value="reflection" className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary/10" data-testid="tab-reflection">
              <BookOpen className="w-4 h-4" />
              <span className="text-xs">Reflect</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="foundations" className="space-y-6">
            <FoundationsSection />
          </TabsContent>

          <TabsContent value="baseline" className="space-y-6">
            <BaselineSection baseline={data?.baseline} />
          </TabsContent>

          <TabsContent value="dimensions" className="space-y-6">
            <DimensionsSection />
          </TabsContent>

          <TabsContent value="signals" className="space-y-6">
            <SignalsSection signals={data?.signals} />
          </TabsContent>

          <TabsContent value="actions" className="space-y-6">
            <ActionsSection actions={data?.actions || []} />
          </TabsContent>

          <TabsContent value="support" className="space-y-6">
            <SupportSection support={data?.support} />
          </TabsContent>

          <TabsContent value="reflection" className="space-y-6">
            <ReflectionSection reflections={data?.reflections || []} />
          </TabsContent>
        </Tabs>

        <footer className="mt-12 pt-8 border-t">
          <p className="text-xs text-muted-foreground text-center max-w-xl mx-auto">
            Flip the Switch provides general wellness and self-reflection tools. It is not medical, psychological, or therapeutic treatment and is not affiliated with or endorsed by any proprietary program or trademarked system.
          </p>
        </footer>
      </main>
    </div>
  );
}

function BaselineSection({ baseline }: { baseline: BaselineProfile | null | undefined }) {
  const { toast } = useToast();
  const [baselineSigns, setBaselineSigns] = useState<string[]>(baseline?.baselineSigns || []);
  const [dailySupports, setDailySupports] = useState<string[]>(baseline?.dailySupports || []);
  const [preferredPace, setPreferredPace] = useState(baseline?.preferredPace || "steady");
  const [notes, setNotes] = useState(baseline?.notes || "");
  const [newSign, setNewSign] = useState("");
  const [newSupport, setNewSupport] = useState("");

  const mutation = useMutation({
    mutationFn: async (data: Partial<BaselineProfile>) => {
      const res = await apiRequest("POST", "/api/blueprint/baseline", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blueprint"] });
      toast({ title: "Saved", description: "Your baseline profile has been updated." });
    },
  });

  const addSign = () => {
    if (newSign.trim()) {
      setBaselineSigns([...baselineSigns, newSign.trim()]);
      setNewSign("");
    }
  };

  const addSupport = () => {
    if (newSupport.trim()) {
      setDailySupports([...dailySupports, newSupport.trim()]);
      setNewSupport("");
    }
  };

  const save = () => {
    mutation.mutate({ baselineSigns, dailySupports, preferredPace, notes });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">How You Know You're Okay</CardTitle>
          <CardDescription>Signs that tell you you're in a balanced state</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {baselineSigns.map((sign, i) => (
              <Badge key={i} variant="secondary" className="gap-1 pr-1">
                {sign}
                <button
                  onClick={() => setBaselineSigns(baselineSigns.filter((_, idx) => idx !== i))}
                  className="ml-1 hover:bg-muted rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add a baseline sign..."
              value={newSign}
              onChange={(e) => setNewSign(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSign()}
              data-testid="input-baseline-sign"
            />
            <Button onClick={addSign} size="icon" variant="outline" data-testid="button-add-sign">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">What Supports You Daily</CardTitle>
          <CardDescription>Things that help maintain your balance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {dailySupports.map((support, i) => (
              <Badge key={i} variant="secondary" className="gap-1 pr-1">
                {support}
                <button
                  onClick={() => setDailySupports(dailySupports.filter((_, idx) => idx !== i))}
                  className="ml-1 hover:bg-muted rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add a daily support..."
              value={newSupport}
              onChange={(e) => setNewSupport(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSupport()}
              data-testid="input-daily-support"
            />
            <Button onClick={addSupport} size="icon" variant="outline" data-testid="button-add-support">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Preferred Pace</CardTitle>
          <CardDescription>How you like to move through your day</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {PACE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setPreferredPace(option.value)}
                className={`flex items-start gap-4 p-4 rounded-lg border text-left transition-colors ${
                  preferredPace === option.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover-elevate"
                }`}
                data-testid={`button-pace-${option.value}`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                  preferredPace === option.value ? "border-primary" : "border-muted-foreground"
                }`}>
                  {preferredPace === option.value && (
                    <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  )}
                </div>
                <div>
                  <div className="font-medium">{option.label}</div>
                  <div className="text-sm text-muted-foreground">{option.description}</div>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Notes</CardTitle>
          <CardDescription>Anything else about your baseline</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Optional notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-24"
            data-testid="input-baseline-notes"
          />
        </CardContent>
      </Card>

      <Button onClick={save} disabled={mutation.isPending} className="w-full" data-testid="button-save-baseline">
        {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
        Save Baseline
      </Button>
    </div>
  );
}

function DimensionsSection() {
  const { toast } = useToast();
  const [selectedDimension, setSelectedDimension] = useState<string | null>(null);
  const [assessments, setAssessments] = useState<Record<string, { level: number; notes: string; supports: string[] }>>({});
  const [newSupport, setNewSupport] = useState("");

  useEffect(() => {
    const stored = getDimensionAssessments();
    const map: Record<string, { level: number; notes: string; supports: string[] }> = {};
    stored.forEach(a => {
      map[a.dimension] = { level: a.level, notes: a.notes, supports: a.supports };
    });
    setAssessments(map);
  }, []);

  const selectedData = selectedDimension ? WELLNESS_DIMENSIONS.find(d => d.name === selectedDimension) : null;
  const currentAssessment = selectedDimension ? assessments[selectedDimension] : null;

  const updateLevel = (level: number) => {
    if (!selectedDimension) return;
    const updated = {
      ...assessments,
      [selectedDimension]: {
        level,
        notes: currentAssessment?.notes || "",
        supports: currentAssessment?.supports || [],
      }
    };
    setAssessments(updated);
    saveDimensionAssessment({
      dimension: selectedDimension,
      level,
      notes: currentAssessment?.notes || "",
      supports: currentAssessment?.supports || [],
      lastUpdated: Date.now(),
    });
  };

  const updateNotes = (notes: string) => {
    if (!selectedDimension) return;
    const updated = {
      ...assessments,
      [selectedDimension]: {
        level: currentAssessment?.level || 3,
        notes,
        supports: currentAssessment?.supports || [],
      }
    };
    setAssessments(updated);
  };

  const saveNotes = () => {
    if (!selectedDimension || !currentAssessment) return;
    saveDimensionAssessment({
      dimension: selectedDimension,
      level: currentAssessment.level || 3,
      notes: currentAssessment.notes,
      supports: currentAssessment.supports,
      lastUpdated: Date.now(),
    });
    toast({ title: "Saved", description: "Your reflection has been saved." });
  };

  const addSupport = () => {
    if (!selectedDimension || !newSupport.trim()) return;
    const supports = [...(currentAssessment?.supports || []), newSupport.trim()];
    const updated = {
      ...assessments,
      [selectedDimension]: {
        level: currentAssessment?.level || 3,
        notes: currentAssessment?.notes || "",
        supports,
      }
    };
    setAssessments(updated);
    saveDimensionAssessment({
      dimension: selectedDimension,
      level: currentAssessment?.level || 3,
      notes: currentAssessment?.notes || "",
      supports,
      lastUpdated: Date.now(),
    });
    setNewSupport("");
  };

  const removeSupport = (idx: number) => {
    if (!selectedDimension || !currentAssessment) return;
    const supports = currentAssessment.supports.filter((_, i) => i !== idx);
    const updated = {
      ...assessments,
      [selectedDimension]: { ...currentAssessment, supports }
    };
    setAssessments(updated);
    saveDimensionAssessment({
      dimension: selectedDimension,
      ...currentAssessment,
      supports,
      lastUpdated: Date.now(),
    });
  };

  const LEVEL_LABELS = [
    { level: 1, label: "Struggling", description: "This area needs attention" },
    { level: 2, label: "Challenged", description: "Some difficulty here" },
    { level: 3, label: "Balanced", description: "Feeling okay in this area" },
    { level: 4, label: "Strong", description: "This area feels good" },
    { level: 5, label: "Thriving", description: "Really flourishing here" },
  ];

  if (selectedDimension && selectedData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedDimension(null)} data-testid="button-back-dimensions">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-xl font-display font-semibold">{selectedData.name}</h2>
            <p className="text-sm text-muted-foreground">{selectedData.description}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">How do you feel in this area right now?</CardTitle>
            <CardDescription>There is no right or wrong answer. Just notice where you are today.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {LEVEL_LABELS.map((item) => (
              <button
                key={item.level}
                onClick={() => updateLevel(item.level)}
                className={`w-full flex items-center gap-4 p-4 rounded-lg border text-left transition-colors ${
                  currentAssessment?.level === item.level
                    ? "border-sky-500 bg-sky-500/10"
                    : "border-border hover-elevate"
                }`}
                data-testid={`button-level-${item.level}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  currentAssessment?.level === item.level ? "bg-sky-500 text-white" : "bg-muted"
                }`}>
                  {item.level}
                </div>
                <div>
                  <div className="font-medium">{item.label}</div>
                  <div className="text-sm text-muted-foreground">{item.description}</div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">What supports you in this area?</CardTitle>
            <CardDescription>Things, people, or practices that help you feel well here</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(currentAssessment?.supports || []).map((support, i) => (
                <Badge key={i} variant="secondary" className="gap-1 pr-1">
                  {support}
                  <button onClick={() => removeSupport(i)} className="ml-1 hover:bg-muted rounded-full p-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add something that helps..."
                value={newSupport}
                onChange={(e) => setNewSupport(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSupport()}
                data-testid="input-support"
              />
              <Button onClick={addSupport} size="icon" variant="outline" data-testid="button-add-support">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Personal Reflection</CardTitle>
            <CardDescription>Any thoughts, patterns, or insights you want to remember</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="What do you notice about this area of your life?"
              value={currentAssessment?.notes || ""}
              onChange={(e) => updateNotes(e.target.value)}
              className="min-h-24"
              data-testid="input-dimension-notes"
            />
            <Button onClick={saveNotes} size="sm" data-testid="button-save-notes">
              <Check className="w-4 h-4 mr-2" />
              Save Reflection
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getLevelColor = (level: number | undefined) => {
    if (!level) return "bg-muted";
    if (level <= 2) return "bg-amber-500/20 border-amber-500/40";
    if (level === 3) return "bg-sky-500/10 border-sky-500/30";
    return "bg-emerald-500/20 border-emerald-500/40";
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-display font-semibold mb-2">The 8 Wellness Dimensions</h2>
        <p className="text-sm text-muted-foreground">
          Tap any dimension to check in. You are the expert on yourself.
        </p>
      </div>

      <div className="space-y-2">
        {WELLNESS_DIMENSIONS.map((dimension) => {
          const assessment = assessments[dimension.name];
          const levelLabel = LEVEL_LABELS.find(l => l.level === assessment?.level)?.label;
          return (
            <button
              key={dimension.name}
              onClick={() => setSelectedDimension(dimension.name)}
              className="w-full text-left"
              data-testid={`dimension-${dimension.name.toLowerCase()}`}
            >
              <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors hover-elevate ${
                assessment ? getLevelColor(assessment.level) : "border-border"
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${dimension.color}`}>
                  <dimension.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm">{dimension.name}</h3>
                </div>
                <div className="flex items-center gap-2">
                  {levelLabel && (
                    <span className="text-xs text-muted-foreground">{levelLabel}</span>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="pt-4 border-t">
        <p className="text-xs text-center text-muted-foreground">
          Wellness is about awareness and self-compassion, not perfection.
        </p>
      </div>
    </div>
  );
}

function SignalsSection({ signals }: { signals: StressSignalsType | null | undefined }) {
  const { toast } = useToast();
  const [drainingPatterns, setDrainingPatterns] = useState<string[]>(signals?.drainingPatterns || []);
  const [earlySignals, setEarlySignals] = useState<string[]>(signals?.earlySignals || []);
  const [contextTags, setContextTags] = useState<string[]>(signals?.contextTags || []);
  const [notes, setNotes] = useState(signals?.notes || "");
  const [newDraining, setNewDraining] = useState("");
  const [newSignal, setNewSignal] = useState("");
  const [newContext, setNewContext] = useState("");

  const mutation = useMutation({
    mutationFn: async (data: Partial<StressSignalsType>) => {
      const res = await apiRequest("POST", "/api/blueprint/signals", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blueprint"] });
      toast({ title: "Saved", description: "Your signals have been updated." });
    },
  });

  const save = () => {
    mutation.mutate({ drainingPatterns, earlySignals, contextTags, notes });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Things That Drain You</CardTitle>
          <CardDescription>Patterns or situations that tend to deplete your energy</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {drainingPatterns.map((pattern, i) => (
              <Badge key={i} variant="secondary" className="gap-1 pr-1">
                {pattern}
                <button
                  onClick={() => setDrainingPatterns(drainingPatterns.filter((_, idx) => idx !== i))}
                  className="ml-1 hover:bg-muted rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add a draining pattern..."
              value={newDraining}
              onChange={(e) => setNewDraining(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newDraining.trim()) {
                  setDrainingPatterns([...drainingPatterns, newDraining.trim()]);
                  setNewDraining("");
                }
              }}
              data-testid="input-draining-pattern"
            />
            <Button
              onClick={() => {
                if (newDraining.trim()) {
                  setDrainingPatterns([...drainingPatterns, newDraining.trim()]);
                  setNewDraining("");
                }
              }}
              size="icon"
              variant="outline"
              data-testid="button-add-draining"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Early Warning Signs</CardTitle>
          <CardDescription>Signals that your balance is shifting</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {earlySignals.map((signal, i) => (
              <Badge key={i} variant="secondary" className="gap-1 pr-1">
                {signal}
                <button
                  onClick={() => setEarlySignals(earlySignals.filter((_, idx) => idx !== i))}
                  className="ml-1 hover:bg-muted rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add an early signal..."
              value={newSignal}
              onChange={(e) => setNewSignal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newSignal.trim()) {
                  setEarlySignals([...earlySignals, newSignal.trim()]);
                  setNewSignal("");
                }
              }}
              data-testid="input-early-signal"
            />
            <Button
              onClick={() => {
                if (newSignal.trim()) {
                  setEarlySignals([...earlySignals, newSignal.trim()]);
                  setNewSignal("");
                }
              }}
              size="icon"
              variant="outline"
              data-testid="button-add-signal"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Context Tags</CardTitle>
          <CardDescription>Areas of life where these patterns tend to show up</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {contextTags.map((tag, i) => (
              <Badge key={i} variant="outline" className="gap-1 pr-1">
                {tag}
                <button
                  onClick={() => setContextTags(contextTags.filter((_, idx) => idx !== i))}
                  className="ml-1 hover:bg-muted rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add a context (e.g., work, family, sleep)..."
              value={newContext}
              onChange={(e) => setNewContext(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newContext.trim()) {
                  setContextTags([...contextTags, newContext.trim()]);
                  setNewContext("");
                }
              }}
              data-testid="input-context-tag"
            />
            <Button
              onClick={() => {
                if (newContext.trim()) {
                  setContextTags([...contextTags, newContext.trim()]);
                  setNewContext("");
                }
              }}
              size="icon"
              variant="outline"
              data-testid="button-add-context"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Notes</CardTitle>
          <CardDescription>Anything else about your signals</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Optional notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-24"
            data-testid="input-signals-notes"
          />
        </CardContent>
      </Card>

      <Button onClick={save} disabled={mutation.isPending} className="w-full" data-testid="button-save-signals">
        {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
        Save Signals
      </Button>
    </div>
  );
}

function ActionsSection({ actions }: { actions: StabilizingAction[] }) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [actionName, setActionName] = useState("");
  const [actionType, setActionType] = useState<"routine" | "suggestion" | "resource_link">("suggestion");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dimensionTags, setDimensionTags] = useState<string[]>([]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/blueprint/actions", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blueprint"] });
      toast({ title: "Created", description: "Reset action added." });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/blueprint/actions/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blueprint"] });
      toast({ title: "Deleted", description: "Reset action removed." });
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setActionName("");
    setActionType("suggestion");
    setDurationMinutes("");
    setInstructions("");
    setDimensionTags([]);
  };

  const handleCreate = () => {
    if (!actionName.trim()) return;
    createMutation.mutate({
      actionName: actionName.trim(),
      actionType,
      durationMinutes: durationMinutes ? parseInt(durationMinutes) : null,
      instructions: instructions.trim() || null,
      dimensionTags: dimensionTags.length > 0 ? dimensionTags : null,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Reset Actions</h2>
          <p className="text-sm text-muted-foreground">Things that help you return to balance</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} variant="outline" data-testid="button-add-action">
          <Plus className="w-4 h-4 mr-2" />
          Add Action
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <label className="text-sm font-medium">Action Name</label>
              <Input
                placeholder="e.g., 5-minute breathing exercise"
                value={actionName}
                onChange={(e) => setActionName(e.target.value)}
                className="mt-1"
                data-testid="input-action-name"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Type</label>
              <div className="flex gap-2 mt-1">
                {["suggestion", "routine", "resource_link"].map((type) => (
                  <Button
                    key={type}
                    variant={actionType === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActionType(type as any)}
                    data-testid={`button-type-${type}`}
                  >
                    {type === "resource_link" ? "Resource" : type.charAt(0).toUpperCase() + type.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Duration (minutes)</label>
              <Input
                type="number"
                placeholder="Optional"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="mt-1 w-32"
                data-testid="input-action-duration"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Instructions</label>
              <Textarea
                placeholder="Step-by-step instructions or notes..."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="mt-1 min-h-20"
                data-testid="input-action-instructions"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Wellness Dimensions</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {DIMENSION_OPTIONS.map((dim) => (
                  <Badge
                    key={dim}
                    variant={dimensionTags.includes(dim) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      if (dimensionTags.includes(dim)) {
                        setDimensionTags(dimensionTags.filter((d) => d !== dim));
                      } else {
                        setDimensionTags([...dimensionTags, dim]);
                      }
                    }}
                    data-testid={`badge-dim-${dim.toLowerCase()}`}
                  >
                    {dim}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleCreate} disabled={createMutation.isPending || !actionName.trim()} data-testid="button-create-action">
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                Create
              </Button>
              <Button variant="ghost" onClick={resetForm} data-testid="button-cancel-action">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {actions.length === 0 && !showForm && (
          <Card>
            <CardContent className="py-12 text-center">
              <RefreshCw className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No reset actions yet.</p>
              <p className="text-sm text-muted-foreground mt-1">Add actions that help you return to balance.</p>
            </CardContent>
          </Card>
        )}
        {actions.map((action) => (
          <Card key={action.id}>
            <CardContent className="py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{action.actionName}</span>
                    {action.durationMinutes && (
                      <Badge variant="outline" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        {action.durationMinutes}m
                      </Badge>
                    )}
                  </div>
                  {action.instructions && (
                    <p className="text-sm text-muted-foreground mt-1">{action.instructions}</p>
                  )}
                  {action.dimensionTags && action.dimensionTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {action.dimensionTags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate(action.id)}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-action-${action.id}`}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SupportSection({ support }: { support: SupportPreferencesType | null | undefined }) {
  const { toast } = useToast();
  const [helpfulSupport, setHelpfulSupport] = useState<string[]>(support?.helpfulSupport || []);
  const [unhelpfulSupport, setUnhelpfulSupport] = useState<string[]>(support?.unhelpfulSupport || []);
  const [boundaries, setBoundaries] = useState<string[]>(support?.boundaries || []);
  const [environmentNeeds, setEnvironmentNeeds] = useState<string[]>(support?.environmentNeeds || []);
  const [notes, setNotes] = useState(support?.notes || "");

  const [newHelpful, setNewHelpful] = useState("");
  const [newUnhelpful, setNewUnhelpful] = useState("");
  const [newBoundary, setNewBoundary] = useState("");
  const [newEnvironment, setNewEnvironment] = useState("");

  const mutation = useMutation({
    mutationFn: async (data: Partial<SupportPreferencesType>) => {
      const res = await apiRequest("POST", "/api/blueprint/support", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blueprint"] });
      toast({ title: "Saved", description: "Your support preferences have been updated." });
    },
  });

  const save = () => {
    mutation.mutate({ helpfulSupport, unhelpfulSupport, boundaries, environmentNeeds, notes });
  };

  const addItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, value: string, clearFn: () => void) => {
    if (value.trim()) {
      setter((prev) => [...prev, value.trim()]);
      clearFn();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">What Helps</CardTitle>
          <CardDescription>Types of support that work well for you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {helpfulSupport.map((item, i) => (
              <Badge key={i} variant="secondary" className="gap-1 pr-1 bg-green-100 dark:bg-green-900/30">
                {item}
                <button
                  onClick={() => setHelpfulSupport(helpfulSupport.filter((_, idx) => idx !== i))}
                  className="ml-1 hover:bg-muted rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add what helps..."
              value={newHelpful}
              onChange={(e) => setNewHelpful(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addItem(setHelpfulSupport, newHelpful, () => setNewHelpful(""))}
              data-testid="input-helpful"
            />
            <Button onClick={() => addItem(setHelpfulSupport, newHelpful, () => setNewHelpful(""))} size="icon" variant="outline" data-testid="button-add-helpful">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">What Doesn't Help</CardTitle>
          <CardDescription>Types of support that don't work for you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {unhelpfulSupport.map((item, i) => (
              <Badge key={i} variant="secondary" className="gap-1 pr-1 bg-red-100 dark:bg-red-900/30">
                {item}
                <button
                  onClick={() => setUnhelpfulSupport(unhelpfulSupport.filter((_, idx) => idx !== i))}
                  className="ml-1 hover:bg-muted rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add what doesn't help..."
              value={newUnhelpful}
              onChange={(e) => setNewUnhelpful(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addItem(setUnhelpfulSupport, newUnhelpful, () => setNewUnhelpful(""))}
              data-testid="input-unhelpful"
            />
            <Button onClick={() => addItem(setUnhelpfulSupport, newUnhelpful, () => setNewUnhelpful(""))} size="icon" variant="outline" data-testid="button-add-unhelpful">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Boundaries</CardTitle>
          <CardDescription>Limits you need others to respect</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {boundaries.map((item, i) => (
              <Badge key={i} variant="outline" className="gap-1 pr-1">
                {item}
                <button
                  onClick={() => setBoundaries(boundaries.filter((_, idx) => idx !== i))}
                  className="ml-1 hover:bg-muted rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add a boundary..."
              value={newBoundary}
              onChange={(e) => setNewBoundary(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addItem(setBoundaries, newBoundary, () => setNewBoundary(""))}
              data-testid="input-boundary"
            />
            <Button onClick={() => addItem(setBoundaries, newBoundary, () => setNewBoundary(""))} size="icon" variant="outline" data-testid="button-add-boundary">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Environment Needs</CardTitle>
          <CardDescription>What your space needs to feel right</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {environmentNeeds.map((item, i) => (
              <Badge key={i} variant="outline" className="gap-1 pr-1">
                {item}
                <button
                  onClick={() => setEnvironmentNeeds(environmentNeeds.filter((_, idx) => idx !== i))}
                  className="ml-1 hover:bg-muted rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add an environment need (e.g., quiet, low light)..."
              value={newEnvironment}
              onChange={(e) => setNewEnvironment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addItem(setEnvironmentNeeds, newEnvironment, () => setNewEnvironment(""))}
              data-testid="input-environment"
            />
            <Button onClick={() => addItem(setEnvironmentNeeds, newEnvironment, () => setNewEnvironment(""))} size="icon" variant="outline" data-testid="button-add-environment">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Notes</CardTitle>
          <CardDescription>Anything else about your support preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Optional notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-24"
            data-testid="input-support-notes"
          />
        </CardContent>
      </Card>

      <Button onClick={save} disabled={mutation.isPending} className="w-full" data-testid="button-save-support">
        {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
        Save Support Preferences
      </Button>
    </div>
  );
}

function ReflectionSection({ reflections }: { reflections: RecoveryReflection[] }) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [lessonsLearned, setLessonsLearned] = useState<string[]>([]);
  const [adjustmentsToMake, setAdjustmentsToMake] = useState<string[]>([]);
  const [newLesson, setNewLesson] = useState("");
  const [newAdjustment, setNewAdjustment] = useState("");

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/blueprint/reflections", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blueprint"] });
      toast({ title: "Created", description: "Reflection added." });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/blueprint/reflections/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blueprint"] });
      toast({ title: "Deleted", description: "Reflection removed." });
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setTitle("");
    setContent("");
    setLessonsLearned([]);
    setAdjustmentsToMake([]);
  };

  const handleCreate = () => {
    createMutation.mutate({
      title: title.trim() || `Reflection - ${new Date().toLocaleDateString()}`,
      content: content.trim() || null,
      lessonsLearned: lessonsLearned.length > 0 ? lessonsLearned : null,
      adjustmentsToMake: adjustmentsToMake.length > 0 ? adjustmentsToMake : null,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Recovery Reflections</h2>
          <p className="text-sm text-muted-foreground">Looking back to move forward</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} variant="outline" data-testid="button-add-reflection">
          <Plus className="w-4 h-4 mr-2" />
          Add Reflection
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                placeholder="Optional title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1"
                data-testid="input-reflection-title"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Reflection</label>
              <Textarea
                placeholder="What happened? How did you navigate it?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="mt-1 min-h-24"
                data-testid="input-reflection-content"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Lessons Learned</label>
              <div className="flex flex-wrap gap-2 mt-2 mb-2">
                {lessonsLearned.map((lesson, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 pr-1">
                    {lesson}
                    <button
                      onClick={() => setLessonsLearned(lessonsLearned.filter((_, idx) => idx !== i))}
                      className="ml-1 hover:bg-muted rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a lesson..."
                  value={newLesson}
                  onChange={(e) => setNewLesson(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newLesson.trim()) {
                      setLessonsLearned([...lessonsLearned, newLesson.trim()]);
                      setNewLesson("");
                    }
                  }}
                  data-testid="input-lesson"
                />
                <Button
                  onClick={() => {
                    if (newLesson.trim()) {
                      setLessonsLearned([...lessonsLearned, newLesson.trim()]);
                      setNewLesson("");
                    }
                  }}
                  size="icon"
                  variant="outline"
                  data-testid="button-add-lesson"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Adjustments to Make</label>
              <div className="flex flex-wrap gap-2 mt-2 mb-2">
                {adjustmentsToMake.map((adj, i) => (
                  <Badge key={i} variant="outline" className="gap-1 pr-1">
                    {adj}
                    <button
                      onClick={() => setAdjustmentsToMake(adjustmentsToMake.filter((_, idx) => idx !== i))}
                      className="ml-1 hover:bg-muted rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add an adjustment..."
                  value={newAdjustment}
                  onChange={(e) => setNewAdjustment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newAdjustment.trim()) {
                      setAdjustmentsToMake([...adjustmentsToMake, newAdjustment.trim()]);
                      setNewAdjustment("");
                    }
                  }}
                  data-testid="input-adjustment"
                />
                <Button
                  onClick={() => {
                    if (newAdjustment.trim()) {
                      setAdjustmentsToMake([...adjustmentsToMake, newAdjustment.trim()]);
                      setNewAdjustment("");
                    }
                  }}
                  size="icon"
                  variant="outline"
                  data-testid="button-add-adjustment"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleCreate} disabled={createMutation.isPending} data-testid="button-create-reflection">
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                Save Reflection
              </Button>
              <Button variant="ghost" onClick={resetForm} data-testid="button-cancel-reflection">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {reflections.length === 0 && !showForm && (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No reflections yet.</p>
              <p className="text-sm text-muted-foreground mt-1">After a challenging time, reflect on what you learned.</p>
            </CardContent>
          </Card>
        )}
        {reflections.map((reflection) => (
          <Card key={reflection.id}>
            <CardContent className="py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{reflection.title || "Reflection"}</span>
                    <span className="text-xs text-muted-foreground">
                      {reflection.createdAt ? new Date(reflection.createdAt).toLocaleDateString() : ""}
                    </span>
                  </div>
                  {reflection.content && (
                    <p className="text-sm text-muted-foreground mt-1">{reflection.content}</p>
                  )}
                  {reflection.lessonsLearned && reflection.lessonsLearned.length > 0 && (
                    <div className="mt-3">
                      <span className="text-xs font-medium text-muted-foreground">Lessons:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {reflection.lessonsLearned.map((lesson, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {lesson}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {reflection.adjustmentsToMake && reflection.adjustmentsToMake.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs font-medium text-muted-foreground">Adjustments:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {reflection.adjustmentsToMake.map((adj, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {adj}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate(reflection.id)}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-reflection-${reflection.id}`}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

const FOUNDATIONS_QUESTIONS = [
  {
    id: "overall_philosophy",
    question: "How would you describe how you want to live your life?",
    subtext: "This is your personal philosophy - there's no right answer",
    type: "text" as const,
    field: "overallPhilosophy",
  },
  {
    id: "what_matters",
    question: "What matters most to you right now?",
    subtext: "Think about what you'd protect even if it's inconvenient",
    type: "choice" as const,
    field: "whatMattersMost",
    options: [
      "Peace of mind",
      "Health and energy",
      "Meaningful relationships",
      "Financial security",
      "Personal growth",
      "Creative expression",
      "Making a difference",
    ],
  },
  {
    id: "core_values",
    question: "What values guide your decisions?",
    subtext: "Pick the ones that feel most true to who you are",
    type: "multi" as const,
    field: "coreValues",
    options: [
      "Authenticity",
      "Compassion",
      "Growth",
      "Balance",
      "Connection",
      "Freedom",
      "Integrity",
      "Creativity",
      "Gratitude",
      "Courage",
    ],
  },
  {
    id: "non_negotiables",
    question: "What will you not compromise on?",
    subtext: "These are your personal boundaries",
    type: "multi" as const,
    field: "whatWontCompromise",
    options: [
      "My sleep and rest",
      "Time with loved ones",
      "My physical health",
      "My mental peace",
      "My values and ethics",
      "My creative time",
      "My financial boundaries",
      "My spiritual practices",
    ],
  },
  {
    id: "misaligned",
    question: "What currently feels out of alignment for you?",
    subtext: "Areas where your life doesn't match how you want to live",
    type: "text" as const,
    field: "whatFeelsMisaligned",
  },
];

function FoundationsSection() {
  const { toast } = useToast();
  const [foundations, setFoundations] = useState<FoundationsProfile | null>(getFoundationsProfile());
  const [isExploring, setIsExploring] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [customInput, setCustomInput] = useState("");
  const [showOther, setShowOther] = useState(false);

  const currentQuestion = FOUNDATIONS_QUESTIONS[currentQuestionIndex];
  const hasFoundationsData = foundations && foundations.confidence > 0.3;
  const isLastQuestion = currentQuestionIndex === FOUNDATIONS_QUESTIONS.length - 1;

  const handleSelect = (value: string) => {
    if (currentQuestion.type === "multi") {
      const current = (answers[currentQuestion.field] as string[]) || [];
      if (current.includes(value)) {
        setAnswers({ ...answers, [currentQuestion.field]: current.filter(v => v !== value) });
      } else {
        setAnswers({ ...answers, [currentQuestion.field]: [...current, value] });
      }
    } else {
      setAnswers({ ...answers, [currentQuestion.field]: value });
    }
  };

  const handleNext = () => {
    if (isLastQuestion) {
      const newProfile: FoundationsProfile = {
        overallPhilosophy: (answers.overallPhilosophy as string) || "",
        coreValues: (answers.coreValues as string[]) || [],
        whatMattersMost: (answers.whatMattersMost as string) || "",
        whatFeelsMisaligned: (answers.whatFeelsMisaligned as string) || "",
        whatWontCompromise: (answers.whatWontCompromise as string[]) || [],
        dimensionFoundations: [],
        confidence: 0.7,
        clarifyingPrompts: [],
        inferredFromConversations: false,
        updatedAt: Date.now(),
      };
      saveFoundationsProfile(newProfile);
      setFoundations(newProfile);
      setIsExploring(false);
      toast({ title: "Foundations saved", description: "Your personal philosophy has been captured." });
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setShowOther(false);
      setCustomInput("");
    }
  };

  const handleSkip = () => {
    if (isLastQuestion) {
      handleNext();
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setShowOther(false);
      setCustomInput("");
    }
  };

  const handleAddOther = () => {
    if (customInput.trim()) {
      handleSelect(customInput.trim());
      setCustomInput("");
      setShowOther(false);
    }
  };

  const startExploring = () => {
    setIsExploring(true);
    setCurrentQuestionIndex(0);
    setAnswers({});
  };

  if (isExploring) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Question {currentQuestionIndex + 1} of {FOUNDATIONS_QUESTIONS.length}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsExploring(false)} data-testid="button-cancel-foundations">
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>
        </div>

        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-amber-500 transition-all duration-300"
            style={{ width: `${((currentQuestionIndex + 1) / FOUNDATIONS_QUESTIONS.length) * 100}%` }}
          />
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-display font-semibold">{currentQuestion.question}</h2>
              <p className="text-muted-foreground">{currentQuestion.subtext}</p>
            </div>

            {currentQuestion.type === "text" && (
              <Textarea
                placeholder="Share your thoughts..."
                value={(answers[currentQuestion.field] as string) || ""}
                onChange={(e) => setAnswers({ ...answers, [currentQuestion.field]: e.target.value })}
                className="min-h-[120px]"
                data-testid={`input-${currentQuestion.id}`}
              />
            )}

            {(currentQuestion.type === "choice" || currentQuestion.type === "multi") && (
              <div className="space-y-3">
                <div className="grid gap-2">
                  {currentQuestion.options?.map((option) => {
                    const isSelected = currentQuestion.type === "multi"
                      ? ((answers[currentQuestion.field] as string[]) || []).includes(option)
                      : answers[currentQuestion.field] === option;

                    return (
                      <Button
                        key={option}
                        variant={isSelected ? "default" : "outline"}
                        className="justify-start text-left h-auto py-3 px-4"
                        onClick={() => handleSelect(option)}
                        data-testid={`option-${option.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        {isSelected && <Check className="w-4 h-4 mr-2 flex-shrink-0" />}
                        {option}
                      </Button>
                    );
                  })}
                </div>

                {!showOther ? (
                  <Button variant="ghost" size="sm" onClick={() => setShowOther(true)} className="w-full" data-testid="button-show-other">
                    <Plus className="w-4 h-4 mr-1" />
                    Add your own
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type your answer..."
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddOther()}
                      data-testid="input-custom-answer"
                    />
                    <Button onClick={handleAddOther} size="icon" data-testid="button-add-custom">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="ghost" onClick={handleSkip} data-testid="button-skip-question">
                <SkipForward className="w-4 h-4 mr-2" />
                Skip
              </Button>
              <Button onClick={handleNext} data-testid="button-next-question">
                {isLastQuestion ? "Complete" : "Continue"}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Anchor className="w-5 h-5 text-amber-500" />
            Your Foundations
          </CardTitle>
          <CardDescription>
            Your personal philosophy, values, and non-negotiables that guide how you want to live
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasFoundationsData ? (
            <>
              {foundations.overallPhilosophy && (
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-muted-foreground">Philosophy</h4>
                  <p className="text-sm">{foundations.overallPhilosophy}</p>
                </div>
              )}

              {foundations.whatMattersMost && (
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-muted-foreground">What Matters Most</h4>
                  <Badge variant="secondary">{foundations.whatMattersMost}</Badge>
                </div>
              )}

              {foundations.coreValues && foundations.coreValues.length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-muted-foreground">Core Values</h4>
                  <div className="flex flex-wrap gap-1">
                    {foundations.coreValues.map((value, i) => (
                      <Badge key={i} variant="outline">{value}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {foundations.whatWontCompromise && foundations.whatWontCompromise.length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-muted-foreground">Non-Negotiables</h4>
                  <div className="flex flex-wrap gap-1">
                    {foundations.whatWontCompromise.map((item, i) => (
                      <Badge key={i} className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {foundations.whatFeelsMisaligned && (
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-muted-foreground">Feeling Misaligned</h4>
                  <p className="text-sm text-muted-foreground">{foundations.whatFeelsMisaligned}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-500"
                      style={{ width: `${foundations.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(foundations.confidence * 100)}% understood
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={startExploring} data-testid="button-refine-foundations">
                  <Edit2 className="w-4 h-4 mr-1" />
                  Refine
                </Button>
              </div>

              {foundations.confidence < 0.7 && (
                <Card className="bg-amber-500/5 border-amber-500/20">
                  <CardContent className="p-4 flex items-start gap-3">
                    <MessageCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-2">We'd love to understand you better</p>
                      <p className="text-sm text-muted-foreground mb-3">
                        A few more questions would help us give you more aligned suggestions.
                      </p>
                      <Button size="sm" onClick={startExploring} data-testid="button-clarify-foundations">
                        <Sparkles className="w-4 h-4 mr-1" />
                        Answer a few questions
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 mx-auto bg-amber-500/10 rounded-full flex items-center justify-center">
                <Anchor className="w-8 h-8 text-amber-500" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Discover Your Foundations</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Take a moment to reflect on what matters most to you. This helps us understand how you want to live, 
                  so we can offer guidance that truly fits.
                </p>
              </div>
              <Button onClick={startExploring} data-testid="button-start-foundations">
                <Sparkles className="w-4 h-4 mr-2" />
                Explore My Foundations
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
