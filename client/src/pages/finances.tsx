import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageHeader } from "@/components/page-header";
import { 
  Wallet, 
  Settings2, 
  TrendingUp, 
  PiggyBank,
  ChevronRight,
  Sparkles,
  AlertCircle,
  DollarSign,
  Target
} from "lucide-react";
import { FinanceProfileDialog } from "@/components/finance-profile-dialog";
import { 
  getFinanceProfile, 
  hasCompletedFinanceProfile,
  getSavedRoutinesByType,
  saveRoutine,
  type FinanceProfile,
  type SavedRoutine
} from "@/lib/guest-storage";

const BUDGET_TIER_LABELS: Record<string, string> = {
  frugal: "Watching closely",
  moderate: "Balanced",
  comfortable: "Comfortable",
  flexible: "Flexible",
};

const EMOTION_LABELS: Record<string, string> = {
  anxious: "A bit anxious",
  neutral: "Neutral",
  confident: "Confident",
  empowered: "Empowered",
};

const SAMPLE_BUDGET_TIPS = [
  {
    title: "Mindful Spending Check",
    description: "A quick pause before purchases to check in with yourself",
    tags: ["mindfulness", "budgeting", "daily"],
    forTier: ["frugal", "moderate"],
  },
  {
    title: "Weekly Budget Review",
    description: "Gentle weekly reflection on spending patterns",
    tags: ["planning", "review", "weekly"],
    forTier: ["frugal", "moderate", "comfortable"],
  },
  {
    title: "Savings Goal Tracker",
    description: "Visual progress toward your savings goals",
    tags: ["savings", "motivation", "long-term"],
    forTier: ["all"],
  },
  {
    title: "Stress-Free Spending Days",
    description: "Designated days where guilt-free spending is allowed",
    tags: ["balance", "self-care", "budgeting"],
    forTier: ["frugal", "moderate"],
  },
];

export default function FinancesPage() {
  const [profileOpen, setProfileOpen] = useState(false);
  const [financeProfile, setFinanceProfile] = useState<FinanceProfile | null>(getFinanceProfile());
  const [savedBudgetPlans, setSavedBudgetPlans] = useState<SavedRoutine[]>(getSavedRoutinesByType("budget_plan"));
  const [hasProfile, setHasProfile] = useState(hasCompletedFinanceProfile());

  const handleProfileComplete = () => {
    setProfileOpen(false);
    setFinanceProfile(getFinanceProfile());
    setHasProfile(hasCompletedFinanceProfile());
  };

  const handleSaveTip = (tip: typeof SAMPLE_BUDGET_TIPS[0]) => {
    const saved = saveRoutine({
      type: "budget_plan",
      title: tip.title,
      description: tip.description,
      data: { forTier: tip.forTier },
      tags: tip.tags,
    });
    setSavedBudgetPlans([saved, ...savedBudgetPlans]);
  };

  const getRelevantTips = () => {
    if (!financeProfile?.budgetTier) return SAMPLE_BUDGET_TIPS;
    return SAMPLE_BUDGET_TIPS.filter(
      tip => tip.forTier.includes("all") || tip.forTier.includes(financeProfile.budgetTier!)
    );
  };

  const relevantTips = getRelevantTips();

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Financial Wellness" />
      <ScrollArea className="flex-1">
        <div className="p-6 max-w-2xl mx-auto space-y-6">
          <p className="text-muted-foreground">
            Budget-aware suggestions that respect where you are
          </p>

        {!hasProfile ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-12 h-12 mx-auto bg-emerald-500/10 rounded-full flex items-center justify-center">
                <Wallet className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Share your financial context</h3>
                <p className="text-sm text-muted-foreground">
                  Help us suggest budget-friendly options and be mindful of financial stress
                </p>
              </div>
              <Button onClick={() => setProfileOpen(true)} data-testid="button-open-finance-profile">
                Get started
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-base font-medium">Your Financial Profile</CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setProfileOpen(true)}
                data-testid="button-edit-finance-profile"
              >
                <Settings2 className="w-4 h-4 mr-1" />
                Edit
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  Budget: <span className="font-medium">{BUDGET_TIER_LABELS[financeProfile?.budgetTier || ""] || "Not set"}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  Feeling: <span className="font-medium">{EMOTION_LABELS[financeProfile?.moneyEmotion || ""] || "Not set"}</span>
                </span>
              </div>
              {financeProfile?.financialPriorities && financeProfile.financialPriorities.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-2">
                  {financeProfile.financialPriorities.slice(0, 4).map((priority) => (
                    <Badge key={priority} variant="secondary" className="text-xs">
                      {priority}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {hasProfile && financeProfile?.moneyEmotion === "anxious" && (
          <Card className="bg-amber-500/5 border-amber-500/20">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-sm mb-1">We hear you</h4>
                <p className="text-sm text-muted-foreground">
                  Financial stress is real. We'll prioritize budget-friendly suggestions and avoid anything that might add pressure.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {hasProfile && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Suggested for you</h2>
              <Badge variant="outline" className="text-xs">
                <Sparkles className="w-3 h-3 mr-1" />
                Personalized
              </Badge>
            </div>

            <div className="space-y-3">
              {relevantTips.map((tip, index) => (
                <Card 
                  key={index} 
                  className="hover-elevate cursor-pointer"
                  data-testid={`card-budget-tip-${index}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="font-medium mb-1">{tip.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {tip.description}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {tip.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveTip(tip);
                        }}
                        data-testid={`button-save-tip-${index}`}
                      >
                        Save
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">All Budget Tools</h2>
          <div className="space-y-3">
            {SAMPLE_BUDGET_TIPS.map((tip, index) => (
              <Card 
                key={index} 
                className="hover-elevate cursor-pointer"
                data-testid={`card-all-budget-tip-${index}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="font-medium mb-1">{tip.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {tip.description}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {tip.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveTip(tip);
                      }}
                      data-testid={`button-save-all-tip-${index}`}
                    >
                      Save
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <FinanceProfileDialog
          open={profileOpen}
          onClose={() => setProfileOpen(false)}
          onComplete={handleProfileComplete}
        />
        </div>
      </ScrollArea>
    </div>
  );
}
