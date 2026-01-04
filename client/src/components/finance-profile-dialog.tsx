import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  Wallet, 
  ChevronLeft, 
  Check,
  TrendingUp,
  Shield,
  Sparkles
} from "lucide-react";
import { 
  saveFinanceProfile,
  getFinanceProfile,
  type FinanceProfile,
  type BudgetTier,
  type MoneyEmotion
} from "@/lib/guest-storage";

interface FinanceProfileDialogProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const BUDGET_TIERS: { id: BudgetTier; label: string; description: string }[] = [
  { id: "frugal", label: "Watching closely", description: "Being mindful of every expense" },
  { id: "moderate", label: "Balanced", description: "Some flexibility, some boundaries" },
  { id: "comfortable", label: "Comfortable", description: "Room to breathe" },
  { id: "flexible", label: "Flexible", description: "Open to spending when it matters" },
];

const MONEY_EMOTIONS: { id: MoneyEmotion; label: string; description: string }[] = [
  { id: "anxious", label: "A bit anxious", description: "Money feels stressful right now" },
  { id: "neutral", label: "Neutral", description: "Not great, not bad" },
  { id: "confident", label: "Confident", description: "Feeling good about finances" },
  { id: "empowered", label: "Empowered", description: "Money feels like a tool, not a burden" },
];

const FINANCIAL_PRIORITIES = [
  "Building savings",
  "Paying off debt",
  "Investing",
  "Emergency fund",
  "Big purchase",
  "Travel",
  "Education",
  "Health expenses",
];

const SPENDING_BOUNDARIES = [
  "No impulse purchases",
  "Weekly budget limit",
  "Cash only for extras",
  "Waiting period before buying",
  "Track every expense",
  "Meal planning to save",
];

export function FinanceProfileDialog({ open, onClose, onComplete }: FinanceProfileDialogProps) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<FinanceProfile>({
    budgetTier: null,
    moneyEmotion: null,
    savingsGoal: null,
    monthlyBudget: null,
    spendingBoundaries: [],
    financialPriorities: [],
    stressors: [],
    notes: "",
    updatedAt: Date.now(),
  });

  useEffect(() => {
    if (open) {
      const existing = getFinanceProfile();
      if (existing) {
        setProfile(existing);
      }
      setStep(0);
    }
  }, [open]);

  const handleComplete = () => {
    saveFinanceProfile(profile);
    onComplete();
  };

  const handleSkipToEnd = () => {
    setStep(4);
  };

  const togglePriority = (priority: string) => {
    const priorities = profile.financialPriorities.includes(priority)
      ? profile.financialPriorities.filter(p => p !== priority)
      : [...profile.financialPriorities, priority];
    setProfile({ ...profile, financialPriorities: priorities });
  };

  const toggleBoundary = (boundary: string) => {
    const boundaries = profile.spendingBoundaries.includes(boundary)
      ? profile.spendingBoundaries.filter(b => b !== boundary)
      : [...profile.spendingBoundaries, boundary];
    setProfile({ ...profile, spendingBoundaries: boundaries });
  };

  const showNav = step > 0 && step < 4;

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="text-center space-y-6 py-4">
            <div className="w-16 h-16 mx-auto bg-emerald-500/10 rounded-full flex items-center justify-center">
              <Wallet className="w-8 h-8 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-xl font-display font-semibold mb-2">Financial Wellness</h3>
              <p className="text-muted-foreground">
                Understanding your relationship with money helps us suggest budget-friendly options and reduce financial stress. This is optional and private.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={() => setStep(1)} className="w-full" data-testid="button-start-finance">
                I'm open to that
              </Button>
              <Button variant="ghost" onClick={onClose} className="w-full" data-testid="button-skip-finance">
                Not right now
              </Button>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-display font-semibold">How does your budget feel right now?</h3>
              <p className="text-sm text-muted-foreground">No judgment here - simply understanding where you are</p>
            </div>
            <div className="space-y-2">
              {BUDGET_TIERS.map((tier) => (
                <button
                  key={tier.id}
                  onClick={() => {
                    setProfile({ ...profile, budgetTier: tier.id });
                    setStep(2);
                  }}
                  className={`w-full p-4 rounded-md text-left transition-colors ${
                    profile.budgetTier === tier.id 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted/50 hover-elevate"
                  }`}
                  data-testid={`button-budget-${tier.id}`}
                >
                  <div className="font-medium">{tier.label}</div>
                  <div className={`text-sm ${profile.budgetTier === tier.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    {tier.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-display font-semibold">How do you feel about money lately?</h3>
              <p className="text-sm text-muted-foreground">Your feelings are valid, whatever they are</p>
            </div>
            <div className="space-y-2">
              {MONEY_EMOTIONS.map((emotion) => (
                <button
                  key={emotion.id}
                  onClick={() => {
                    setProfile({ ...profile, moneyEmotion: emotion.id });
                    setStep(3);
                  }}
                  className={`w-full p-4 rounded-md text-left transition-colors ${
                    profile.moneyEmotion === emotion.id 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted/50 hover-elevate"
                  }`}
                  data-testid={`button-emotion-${emotion.id}`}
                >
                  <div className="font-medium">{emotion.label}</div>
                  <div className={`text-sm ${profile.moneyEmotion === emotion.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    {emotion.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-display font-semibold">What matters to you financially?</h3>
              <p className="text-sm text-muted-foreground">Pick any that resonate, or skip ahead</p>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Priorities</Label>
                <div className="flex flex-wrap gap-2">
                  {FINANCIAL_PRIORITIES.map((priority) => (
                    <Badge
                      key={priority}
                      variant={profile.financialPriorities.includes(priority) ? "default" : "outline"}
                      className="cursor-pointer py-2 px-3"
                      onClick={() => togglePriority(priority)}
                      data-testid={`badge-priority-${priority.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {priority}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Boundaries that help</Label>
                <div className="flex flex-wrap gap-2">
                  {SPENDING_BOUNDARIES.map((boundary) => (
                    <Badge
                      key={boundary}
                      variant={profile.spendingBoundaries.includes(boundary) ? "default" : "outline"}
                      className="cursor-pointer py-2 px-3"
                      onClick={() => toggleBoundary(boundary)}
                      data-testid={`badge-boundary-${boundary.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {boundary}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <Button onClick={() => setStep(4)} className="w-full mt-4" data-testid="button-continue-finance">
              Continue
            </Button>
          </div>
        );

      case 4:
        return (
          <div className="text-center space-y-6 py-4">
            <div className="w-16 h-16 mx-auto bg-emerald-500/10 rounded-full flex items-center justify-center">
              <Check className="w-8 h-8 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-xl font-display font-semibold mb-2">Got it</h3>
              <p className="text-muted-foreground">
                We'll use this to suggest budget-friendly options and be mindful of financial stress. You can update this anytime.
              </p>
            </div>
            <Button onClick={handleComplete} className="w-full" data-testid="button-finish-finance">
              Sounds good
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">Financial Wellness</DialogTitle>
          <DialogDescription className="sr-only">
            Tell us about your financial situation and preferences
          </DialogDescription>
        </DialogHeader>

        {showNav && (
          <div className="flex items-center justify-between gap-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep(step - 1)}
              data-testid="button-prev-finance-step"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div className="flex gap-1">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 w-6 rounded-full transition-colors ${
                    s <= step ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={handleSkipToEnd}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-skip-finance-step"
            >
              Skip all
            </button>
          </div>
        )}

        {renderStep()}
      </DialogContent>
    </Dialog>
  );
}
