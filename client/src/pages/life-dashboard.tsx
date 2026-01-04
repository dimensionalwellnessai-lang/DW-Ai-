import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Link } from "wouter";
import { 
  Sparkles, 
  Dumbbell, 
  Heart,
  Users,
  ChevronRight,
  ChevronDown,
  Sun,
  AlertCircle,
  Check,
  TrendingUp,
  Compass,
  Edit3,
  X,
  Plus,
  Shield,
  Brain,
  Briefcase,
  Wallet,
  Leaf,
  Utensils,
  User,
  Bot,
  FileDown,
  Target,
  RefreshCw,
  Clock,
  Info,
} from "lucide-react";
import type { Goal, Habit, Routine } from "@shared/schema";
import { PageHeader } from "@/components/page-header";
import { 
  getBodyProfile, 
  getMealPrepPreferences,
  getFinanceProfile,
  getSpiritualProfile,
  getCommunityProfile,
  getDimensionSignals,
  getDimensionWellnessProfile,
  saveDimensionWellnessProfile,
  respondToAiSuggestion,
  hasCompletedBodyScan,
  hasCompletedFinanceProfile,
  hasCompletedSpiritualProfile,
  hasCompletedCommunityProfile,
  type BodyProfile,
  type MealPrepPreferences,
  type FinanceProfile,
  type SpiritualProfile,
  type CommunityProfile,
  type DimensionSignals,
  type DimensionWellnessProfile,
  type WellnessDimension,
} from "@/lib/guest-storage";

const DIMENSION_CONFIGS = [
  {
    id: "physical" as WellnessDimension,
    name: "Physical",
    icon: Dumbbell,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    path: "/workout",
    description: "Movement, exercise & body care",
    defaultPhrase: "How I care for my physical self",
  },
  {
    id: "emotional" as WellnessDimension,
    name: "Emotional",
    icon: Heart,
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
    path: "/talk",
    description: "Feelings, coping & self-awareness",
    defaultPhrase: "How I process my emotions",
  },
  {
    id: "social" as WellnessDimension,
    name: "Social",
    icon: Users,
    color: "text-teal-500",
    bgColor: "bg-teal-500/10",
    path: "/community",
    description: "Relationships & connection",
    defaultPhrase: "How I connect with others",
  },
  {
    id: "intellectual" as WellnessDimension,
    name: "Intellectual",
    icon: Brain,
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10",
    path: "/challenges",
    description: "Learning, creativity & growth",
    defaultPhrase: "How I keep my mind engaged",
  },
  {
    id: "spiritual" as WellnessDimension,
    name: "Spiritual",
    icon: Sun,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    path: "/spiritual",
    description: "Inner peace, purpose & meaning",
    defaultPhrase: "What grounds and centers me",
  },
  {
    id: "occupational" as WellnessDimension,
    name: "Occupational",
    icon: Briefcase,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    path: "/projects",
    description: "Work, purpose & contribution",
    defaultPhrase: "How I find meaning in my work",
  },
  {
    id: "financial" as WellnessDimension,
    name: "Financial",
    icon: Wallet,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    path: "/finances",
    description: "Money, security & abundance",
    defaultPhrase: "My relationship with money",
  },
  {
    id: "environmental" as WellnessDimension,
    name: "Environmental",
    icon: Leaf,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    path: "/routines",
    description: "Surroundings, space & nature",
    defaultPhrase: "How my environment supports me",
  },
];

function getDimensionStatus(dimensionId: string, signals: DimensionSignals) {
  switch (dimensionId) {
    case "physical":
      return signals.movementFocus ? "active" : "not_started";
    case "emotional":
      return "not_started";
    case "social":
      return hasCompletedCommunityProfile() ? "active" : "not_started";
    case "intellectual":
      return "not_started";
    case "spiritual":
      return signals.mindfulState ? "active" : "not_started";
    case "occupational":
      return "not_started";
    case "financial":
      return signals.costTier ? "active" : "not_started";
    case "environmental":
      return "not_started";
    default:
      return "not_started";
  }
}

function getConnectionInsights(signals: DimensionSignals): string[] {
  const insights: string[] = [];
  
  if (signals.financialStress && signals.mindfulState) {
    insights.push("Your spiritual practices can help ease financial stress");
  }
  
  if (signals.costTier === "frugal" && signals.nutritionFocus) {
    insights.push("Budget-friendly meal options are prioritized for you");
  }
  
  if (signals.bodyEnergy === "low" && signals.mindfulState === "energy") {
    insights.push("Your spiritual practice preference for energy aligns with your body's needs");
  }
  
  if (signals.movementFocus === "slim_fit" && signals.nutritionFocus) {
    insights.push("Your body goals are synced with your nutrition preferences");
  }
  
  if (signals.mindfulState === "calm" && signals.bodyEnergy === "scattered") {
    insights.push("Calming practices may help when you're feeling scattered");
  }
  
  return insights;
}

function getDataSourceIcon(source: string | null | undefined) {
  switch (source) {
    case "ai":
      return <Bot className="w-3 h-3" />;
    case "imported":
      return <FileDown className="w-3 h-3" />;
    default:
      return <User className="w-3 h-3" />;
  }
}

function getDataSourceLabel(source: string | null | undefined) {
  switch (source) {
    case "ai":
      return "AI Suggested";
    case "imported":
      return "Imported";
    default:
      return "You Created";
  }
}

function getDataSourceBadgeVariant(source: string | null | undefined): "default" | "secondary" | "outline" {
  switch (source) {
    case "ai":
      return "secondary";
    case "imported":
      return "outline";
    default:
      return "default";
  }
}

interface LifeSystemItemProps {
  title: string;
  dataSource?: string | null;
  explainWhy?: string | null;
}

function LifeSystemItem({ title, dataSource, explainWhy }: LifeSystemItemProps) {
  const [showWhy, setShowWhy] = useState(false);
  
  return (
    <div className="border rounded-md p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium flex-1">{title}</span>
        <Badge variant={getDataSourceBadgeVariant(dataSource)} className="text-xs gap-1">
          {getDataSourceIcon(dataSource)}
          {getDataSourceLabel(dataSource)}
        </Badge>
      </div>
      {explainWhy && (
        <Collapsible open={showWhy} onOpenChange={setShowWhy}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground gap-1">
              <Info className="w-3 h-3" />
              {showWhy ? "Hide why" : "Why this?"}
              <ChevronDown className={`w-3 h-3 transition-transform ${showWhy ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-1">
            <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              {explainWhy}
            </p>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

function MyLifeSystemSection() {
  const { data: goals = [] } = useQuery<Goal[]>({ queryKey: ["/api/goals"] });
  const { data: habits = [] } = useQuery<Habit[]>({ queryKey: ["/api/habits"] });
  const { data: routines = [] } = useQuery<Routine[]>({ queryKey: ["/api/routines"] });

  const hasAnyItems = goals.length > 0 || habits.length > 0 || routines.length > 0;

  if (!hasAnyItems) return null;

  const countsBySource = (items: { dataSource?: string | null }[]) => {
    const counts = { user: 0, ai: 0, imported: 0 };
    items.forEach((item) => {
      const source = item.dataSource || "user";
      if (source === "ai") counts.ai++;
      else if (source === "imported") counts.imported++;
      else counts.user++;
    });
    return counts;
  };

  const goalCounts = countsBySource(goals);
  const habitCounts = countsBySource(habits);
  const routineCounts = countsBySource(routines);

  const totalCounts = {
    user: goalCounts.user + habitCounts.user + routineCounts.user,
    ai: goalCounts.ai + habitCounts.ai + routineCounts.ai,
    imported: goalCounts.imported + habitCounts.imported + routineCounts.imported,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">My Life System</h2>
        <div className="flex gap-2">
          {totalCounts.user > 0 && (
            <Badge variant="default" className="text-xs gap-1">
              <User className="w-3 h-3" />
              {totalCounts.user}
            </Badge>
          )}
          {totalCounts.ai > 0 && (
            <Badge variant="secondary" className="text-xs gap-1">
              <Bot className="w-3 h-3" />
              {totalCounts.ai}
            </Badge>
          )}
          {totalCounts.imported > 0 && (
            <Badge variant="outline" className="text-xs gap-1">
              <FileDown className="w-3 h-3" />
              {totalCounts.imported}
            </Badge>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Everything here is yours to keep, edit, or remove. The badges show where each item came from.
      </p>

      {goals.length > 0 && (
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Goals ({goals.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-2">
            {goals.slice(0, 5).map((goal) => (
              <LifeSystemItem
                key={goal.id}
                title={goal.title}
                dataSource={goal.dataSource}
                explainWhy={goal.explainWhy}
              />
            ))}
            {goals.length > 5 && (
              <Link href="/goals">
                <Button variant="ghost" size="sm" className="w-full text-xs">
                  View all {goals.length} goals
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {habits.length > 0 && (
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-primary" />
              Habits ({habits.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-2">
            {habits.slice(0, 5).map((habit) => (
              <LifeSystemItem
                key={habit.id}
                title={habit.title}
                dataSource={habit.dataSource}
                explainWhy={habit.explainWhy}
              />
            ))}
            {habits.length > 5 && (
              <Link href="/routines">
                <Button variant="ghost" size="sm" className="w-full text-xs">
                  View all {habits.length} habits
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {routines.length > 0 && (
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Routines ({routines.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-2">
            {routines.slice(0, 5).map((routine) => (
              <LifeSystemItem
                key={routine.id}
                title={routine.name}
                dataSource={routine.dataSource}
                explainWhy={routine.explainWhy}
              />
            ))}
            {routines.length > 5 && (
              <Link href="/routines">
                <Button variant="ghost" size="sm" className="w-full text-xs">
                  View all {routines.length} routines
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function LifeDashboardPage() {
  const [bodyProfile] = useState<BodyProfile | null>(getBodyProfile());
  const [mealPrefs] = useState<MealPrepPreferences | null>(getMealPrepPreferences());
  const [financeProfile] = useState<FinanceProfile | null>(getFinanceProfile());
  const [spiritualProfile] = useState<SpiritualProfile | null>(getSpiritualProfile());
  const [dimensionsOpen, setDimensionsOpen] = useState(false);
  const [selectedDimension, setSelectedDimension] = useState<typeof DIMENSION_CONFIGS[0] | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const signals = getDimensionSignals();
  
  const completedDimensions = [
    hasCompletedBodyScan(),
    hasCompletedFinanceProfile(),
    hasCompletedSpiritualProfile(),
    hasCompletedCommunityProfile(),
  ].filter(Boolean).length;
  
  const totalDimensions = DIMENSION_CONFIGS.length;
  const completionPercent = (completedDimensions / totalDimensions) * 100;
  const connectionInsights = getConnectionInsights(signals);

  const getQuickSummary = () => {
    const parts: string[] = [];
    
    if (bodyProfile?.energyLevel) {
      parts.push(`Energy: ${bodyProfile.energyLevel}`);
    }
    if (financeProfile?.moneyEmotion) {
      const emotions: Record<string, string> = {
        anxious: "Money feels stressful",
        neutral: "Money feels okay",
        confident: "Feeling good about finances",
        empowered: "Financially empowered",
      };
      parts.push(emotions[financeProfile.moneyEmotion] || "");
    }
    if (spiritualProfile?.groundingNeeds?.length) {
      parts.push(`Seeking: ${spiritualProfile.groundingNeeds[0]}`);
    }
    
    return parts;
  };

  const quickSummary = getQuickSummary();

  const openDimensionDetail = (dimension: typeof DIMENSION_CONFIGS[0]) => {
    setSelectedDimension(dimension);
    setDetailSheetOpen(true);
  };

  return (
    <div className="min-h-screen bg-background gradient-bg">
      <PageHeader title="Life Dashboard" />
      
      <ScrollArea className="h-[calc(100vh-57px)]">
        <div className="p-4 max-w-2xl mx-auto space-y-6 pb-8">
          <div className="flex items-center justify-between gap-4">
            <p className="text-muted-foreground">
              Your wellness dimensions, all connected
            </p>
            <Button 
              onClick={() => setDimensionsOpen(true)} 
              data-testid="button-wellness-dimensions"
            >
              <Compass className="w-4 h-4 mr-2" />
              Dimensions
            </Button>
          </div>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">Dimensions Set Up</span>
              <span className="text-sm text-muted-foreground">{completedDimensions}/{totalDimensions}</span>
            </div>
            <Progress value={completionPercent} className="h-2" />
            {completedDimensions < totalDimensions && (
              <p className="text-xs text-muted-foreground">
                Complete more dimensions to unlock personalized cross-dimension insights
              </p>
            )}
          </CardContent>
        </Card>

        {quickSummary.length > 0 && (
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-500" />
                Your Current State
              </h3>
              <div className="flex flex-wrap gap-2">
                {quickSummary.map((item, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {item}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {connectionInsights.length > 0 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Cross-Dimension Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {connectionInsights.map((insight, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>{insight}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Your Dimensions</h2>
          
          {DIMENSION_CONFIGS.map((dimension) => {
            const Icon = dimension.icon;
            const status = getDimensionStatus(dimension.id, signals);
            const isActive = status === "active";
            const profile = getDimensionWellnessProfile(dimension.id);
            const phrase = profile?.shortPhrase || dimension.defaultPhrase;
            
            return (
              <Card 
                key={dimension.id}
                className="hover-elevate cursor-pointer"
                onClick={() => openDimensionDetail(dimension)}
                data-testid={`card-dimension-${dimension.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full ${dimension.bgColor} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-6 h-6 ${dimension.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{dimension.name}</h3>
                        {isActive ? (
                          <Badge variant="secondary" className="text-xs">
                            <Check className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Set up
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {phrase}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {signals.financialStress && (
          <Card className="bg-amber-500/5 border-amber-500/20">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-sm mb-1">We notice you're feeling some financial stress</h4>
                <p className="text-sm text-muted-foreground">
                  We're being mindful of this across all your recommendations. Budget-friendly options are prioritized, and calming practices are suggested.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <MyLifeSystemSection />

        <Card className="bg-muted/30">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              The more dimensions you set up, the more personalized and connected your experience becomes.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {!hasCompletedBodyScan() && (
                <Link href="/workout">
                  <Button variant="outline" size="sm" data-testid="button-setup-body">
                    <Dumbbell className="w-4 h-4 mr-1" />
                    Body
                  </Button>
                </Link>
              )}
              {!mealPrefs?.dietaryStyle && (
                <Link href="/meal-prep">
                  <Button variant="outline" size="sm" data-testid="button-setup-nutrition">
                    <Utensils className="w-4 h-4 mr-1" />
                    Nutrition
                  </Button>
                </Link>
              )}
              {!hasCompletedFinanceProfile() && (
                <Link href="/finances">
                  <Button variant="outline" size="sm" data-testid="button-setup-finances">
                    <Wallet className="w-4 h-4 mr-1" />
                    Finances
                  </Button>
                </Link>
              )}
              {!hasCompletedSpiritualProfile() && (
                <Link href="/spiritual">
                  <Button variant="outline" size="sm" data-testid="button-setup-spiritual">
                    <Heart className="w-4 h-4 mr-1" />
                    Spiritual
                  </Button>
                </Link>
              )}
            </div>
            <Link href="/blueprint">
              <Button variant="ghost" size="sm" className="mt-3 text-xs text-muted-foreground" data-testid="link-full-blueprint">
                Advanced: Full Blueprint Configuration
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <WellnessDimensionsSheet 
        open={dimensionsOpen} 
        onOpenChange={setDimensionsOpen}
        onSelectDimension={openDimensionDetail}
        signals={signals}
      />

      {selectedDimension && (
        <DimensionDetailSheet
          key={selectedDimension.id}
          open={detailSheetOpen}
          onOpenChange={setDetailSheetOpen}
          dimension={selectedDimension}
        />
      )}
      </ScrollArea>
    </div>
  );
}

interface WellnessDimensionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectDimension: (dimension: typeof DIMENSION_CONFIGS[0]) => void;
  signals: DimensionSignals;
}

function WellnessDimensionsSheet({ open, onOpenChange, onSelectDimension, signals }: WellnessDimensionsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Compass className="w-5 h-5" />
            Wellness Dimensions
          </SheetTitle>
          <SheetDescription>
            Tap any dimension to view your Anchor Plan and assessment
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-3">
          {DIMENSION_CONFIGS.map((dimension) => {
            const Icon = dimension.icon;
            const status = getDimensionStatus(dimension.id, signals);
            const isActive = status === "active";
            const profile = getDimensionWellnessProfile(dimension.id);
            const phrase = profile?.shortPhrase || dimension.defaultPhrase;
            
            return (
              <div
                key={dimension.id}
                className="p-4 rounded-md border hover-elevate cursor-pointer"
                onClick={() => {
                  onOpenChange(false);
                  setTimeout(() => onSelectDimension(dimension), 200);
                }}
                data-testid={`dimension-item-${dimension.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${dimension.bgColor} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${dimension.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{dimension.name}</span>
                      {isActive && (
                        <Check className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {phrase}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface DimensionDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dimension: typeof DIMENSION_CONFIGS[0];
}

function DimensionDetailSheet({ open, onOpenChange, dimension }: DimensionDetailSheetProps) {
  const [profile, setProfile] = useState(() => getDimensionWellnessProfile(dimension.id));
  const [isEditing, setIsEditing] = useState(false);
  const [shortPhrase, setShortPhrase] = useState(profile?.shortPhrase || dimension.defaultPhrase);
  const [coreIntention, setCoreIntention] = useState(profile?.anchorPlan.coreIntention || "");
  const [earlySignals, setEarlySignals] = useState(profile?.anchorPlan.earlySignals.join(", ") || "");
  const [stabilizers, setStabilizers] = useState(profile?.anchorPlan.stabilizers.join(", ") || "");
  const [safetyNet, setSafetyNet] = useState(profile?.anchorPlan.safetyNet || "");
  const [usageStory, setUsageStory] = useState(profile?.usageStory || "");
  const [assessmentLevel, setAssessmentLevel] = useState(profile?.assessmentLevel || 3);
  const [assessmentNotes, setAssessmentNotes] = useState(profile?.assessmentNotes || "");

  const handleSave = () => {
    const saved = saveDimensionWellnessProfile({
      dimension: dimension.id,
      shortPhrase,
      anchorPlan: {
        coreIntention,
        earlySignals: earlySignals.split(",").map(t => t.trim()).filter(Boolean),
        stabilizers: stabilizers.split(",").map(s => s.trim()).filter(Boolean),
        safetyNet,
      },
      usageStory,
      rituals: profile?.rituals || [],
      assessmentLevel,
      assessmentNotes,
      evidence: profile?.evidence || [],
      aiSuggestions: profile?.aiSuggestions || [],
    });
    setProfile(saved);
    setIsEditing(false);
  };

  const handleSuggestionResponse = (suggestionId: string, accept: boolean) => {
    respondToAiSuggestion(dimension.id, suggestionId, accept);
    setProfile(getDimensionWellnessProfile(dimension.id));
  };

  const Icon = dimension.icon;
  const pendingSuggestions = profile?.aiSuggestions.filter(s => s.status === "pending") || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full ${dimension.bgColor} flex items-center justify-center`}>
              <Icon className={`w-6 h-6 ${dimension.color}`} />
            </div>
            <div>
              <SheetTitle>{dimension.name}</SheetTitle>
              <SheetDescription>{shortPhrase}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6">
          <Tabs defaultValue="anchor" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="anchor" className="flex-1">Anchor Plan</TabsTrigger>
              <TabsTrigger value="usage" className="flex-1">How I Use It</TabsTrigger>
              <TabsTrigger value="assessment" className="flex-1">Assessment</TabsTrigger>
            </TabsList>

            <TabsContent value="anchor" className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Personal Anchor Plan
                </h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsEditing(!isEditing)}
                  data-testid="button-edit-anchor"
                >
                  {isEditing ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                </Button>
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Short phrase for this dimension</Label>
                    <Input 
                      value={shortPhrase} 
                      onChange={(e) => setShortPhrase(e.target.value)}
                      placeholder="How I describe this dimension"
                      data-testid="input-short-phrase"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Core Intention</Label>
                    <Textarea 
                      value={coreIntention} 
                      onChange={(e) => setCoreIntention(e.target.value)}
                      placeholder="Why is this dimension important to me?"
                      className="resize-none"
                      data-testid="input-intention"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Early Signals (comma-separated)</Label>
                    <Input 
                      value={earlySignals} 
                      onChange={(e) => setEarlySignals(e.target.value)}
                      placeholder="Signs that tell me I need to focus here"
                      data-testid="input-signals"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Stabilizers (comma-separated)</Label>
                    <Input 
                      value={stabilizers} 
                      onChange={(e) => setStabilizers(e.target.value)}
                      placeholder="What helps me stay grounded"
                      data-testid="input-stabilizers"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Safety Net</Label>
                    <Textarea 
                      value={safetyNet} 
                      onChange={(e) => setSafetyNet(e.target.value)}
                      placeholder="What I do when I'm really struggling"
                      className="resize-none"
                      data-testid="input-safety"
                    />
                  </div>
                  <Button onClick={handleSave} className="w-full" data-testid="button-save-anchor">
                    Save Anchor Plan
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {coreIntention ? (
                    <>
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Core Intention</h4>
                        <p className="text-sm">{coreIntention}</p>
                      </div>
                      {earlySignals && (
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Early Signals</h4>
                          <div className="flex flex-wrap gap-1">
                            {earlySignals.split(",").map((t, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{t.trim()}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {stabilizers && (
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Stabilizers</h4>
                          <div className="flex flex-wrap gap-1">
                            {stabilizers.split(",").map((s, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">{s.trim()}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {safetyNet && (
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Safety Net</h4>
                          <p className="text-sm">{safetyNet}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm mb-3">No anchor plan yet</p>
                      <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} data-testid="button-create-anchor">
                        <Plus className="w-4 h-4 mr-1" />
                        Create Anchor Plan
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="usage" className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">How I Use This Dimension</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                </Button>
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>My story with this dimension</Label>
                    <Textarea 
                      value={usageStory} 
                      onChange={(e) => setUsageStory(e.target.value)}
                      placeholder="How this dimension shows up in my daily life..."
                      className="resize-none min-h-[120px]"
                      data-testid="input-usage-story"
                    />
                  </div>
                  <Button onClick={handleSave} className="w-full">
                    Save
                  </Button>
                </div>
              ) : (
                <>
                  {usageStory ? (
                    <p className="text-sm">{usageStory}</p>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm mb-3">Tell your story with this dimension</p>
                      <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                        <Plus className="w-4 h-4 mr-1" />
                        Add Your Story
                      </Button>
                    </div>
                  )}
                </>
              )}

              <Link href={dimension.path}>
                <Button variant="outline" className="w-full mt-4" data-testid="button-go-to-dimension">
                  Go to {dimension.name} Page
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </TabsContent>

            <TabsContent value="assessment" className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Current Assessment</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                </Button>
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Wellness Level (1-5)</Label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <Button
                          key={level}
                          variant={assessmentLevel === level ? "default" : "outline"}
                          size="sm"
                          onClick={() => setAssessmentLevel(level)}
                          data-testid={`button-level-${level}`}
                        >
                          {level}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea 
                      value={assessmentNotes} 
                      onChange={(e) => setAssessmentNotes(e.target.value)}
                      placeholder="How I'm feeling about this dimension..."
                      className="resize-none"
                      data-testid="input-assessment-notes"
                    />
                  </div>
                  <Button onClick={handleSave} className="w-full">
                    Save Assessment
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Level:</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                            level <= assessmentLevel 
                              ? `${dimension.bgColor} ${dimension.color}` 
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {level}
                        </div>
                      ))}
                    </div>
                  </div>
                  {assessmentNotes && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Notes</h4>
                      <p className="text-sm">{assessmentNotes}</p>
                    </div>
                  )}
                </div>
              )}

              {pendingSuggestions.length > 0 && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      AI Suggestions
                    </h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      The AI noticed something from your conversations that might be relevant
                    </p>
                    {pendingSuggestions.map((suggestion) => (
                      <div key={suggestion.id} className="p-3 bg-background rounded-md mb-2">
                        <p className="text-sm mb-2">{suggestion.content}</p>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleSuggestionResponse(suggestion.id, true)}
                            data-testid={`button-accept-${suggestion.id}`}
                          >
                            <Check className="w-3 h-3 mr-1" />
                            Add
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleSuggestionResponse(suggestion.id, false)}
                            data-testid={`button-decline-${suggestion.id}`}
                          >
                            <X className="w-3 h-3 mr-1" />
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
