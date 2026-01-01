import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import { 
  Sparkles, 
  Dumbbell, 
  Utensils, 
  Wallet, 
  Heart,
  ChevronRight,
  Sun,
  Moon,
  Wind,
  AlertCircle,
  Check,
  TrendingUp
} from "lucide-react";
import { 
  getBodyProfile, 
  getMealPrepPreferences,
  getFinanceProfile,
  getSpiritualProfile,
  getDimensionSignals,
  hasCompletedBodyScan,
  hasCompletedFinanceProfile,
  hasCompletedSpiritualProfile,
  type BodyProfile,
  type MealPrepPreferences,
  type FinanceProfile,
  type SpiritualProfile,
  type DimensionSignals
} from "@/lib/guest-storage";

const DIMENSION_CONFIGS = [
  {
    id: "body",
    name: "Body",
    icon: Dumbbell,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    path: "/workout",
    description: "Physical wellness & movement",
  },
  {
    id: "nutrition",
    name: "Nutrition",
    icon: Utensils,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    path: "/meal-prep",
    description: "Food & nourishment",
  },
  {
    id: "finances",
    name: "Finances",
    icon: Wallet,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    path: "/finances",
    description: "Budget & financial peace",
  },
  {
    id: "spiritual",
    name: "Spiritual",
    icon: Heart,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    path: "/spiritual",
    description: "Inner peace & grounding",
  },
];

function getDimensionStatus(dimensionId: string, signals: DimensionSignals) {
  switch (dimensionId) {
    case "body":
      return signals.movementFocus ? "active" : "not_started";
    case "nutrition":
      return signals.nutritionFocus ? "active" : "not_started";
    case "finances":
      return signals.costTier ? "active" : "not_started";
    case "spiritual":
      return signals.mindfulState ? "active" : "not_started";
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

export default function LifeDashboardPage() {
  const [bodyProfile] = useState<BodyProfile | null>(getBodyProfile());
  const [mealPrefs] = useState<MealPrepPreferences | null>(getMealPrepPreferences());
  const [financeProfile] = useState<FinanceProfile | null>(getFinanceProfile());
  const [spiritualProfile] = useState<SpiritualProfile | null>(getSpiritualProfile());
  const signals = getDimensionSignals();
  
  const completedDimensions = [
    hasCompletedBodyScan(),
    mealPrefs?.dietaryStyle != null,
    hasCompletedFinanceProfile(),
    hasCompletedSpiritualProfile(),
  ].filter(Boolean).length;
  
  const completionPercent = (completedDimensions / 4) * 100;
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

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Life Dashboard</h1>
          <p className="text-muted-foreground">
            Your wellness dimensions, all connected
          </p>
        </div>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">Dimensions Set Up</span>
              <span className="text-sm text-muted-foreground">{completedDimensions}/4</span>
            </div>
            <Progress value={completionPercent} className="h-2" />
            {completedDimensions < 4 && (
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
            
            return (
              <Link key={dimension.id} href={dimension.path}>
                <Card 
                  className="hover-elevate cursor-pointer"
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
                          {dimension.description}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
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
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
