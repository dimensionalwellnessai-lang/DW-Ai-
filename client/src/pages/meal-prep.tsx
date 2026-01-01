import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  Utensils, 
  Settings2, 
  Leaf, 
  Clock, 
  ChevronRight,
  Sparkles,
  AlertCircle,
  Check
} from "lucide-react";
import { 
  getMealPrepPreferences, 
  saveMealPrepPreferences,
  getBodyProfile,
  getSavedRoutinesByType,
  saveRoutine,
  getDimensionSignals,
  type MealPrepPreferences,
  type DietaryStyle,
  type SavedRoutine
} from "@/lib/guest-storage";

const DIETARY_STYLES: { id: DietaryStyle; label: string; description: string }[] = [
  { id: "omnivore", label: "Omnivore", description: "All foods" },
  { id: "vegetarian", label: "Vegetarian", description: "No meat" },
  { id: "vegan", label: "Vegan", description: "Plant-based only" },
  { id: "pescatarian", label: "Pescatarian", description: "Fish & vegetables" },
  { id: "keto", label: "Keto", description: "Low carb, high fat" },
  { id: "paleo", label: "Paleo", description: "Whole foods focus" },
];

const COMMON_RESTRICTIONS = [
  "Gluten-free",
  "Dairy-free",
  "Nut-free",
  "Soy-free",
  "Low sodium",
  "No red meat",
  "No shellfish",
  "Low sugar",
];

const SAMPLE_MEAL_PLANS = [
  {
    title: "Balanced Day",
    description: "Nutritious meals for steady energy",
    meals: ["Overnight oats with berries", "Grilled chicken salad", "Salmon with quinoa"],
    tags: ["balanced", "high-protein", "meal-prep-friendly"],
  },
  {
    title: "Quick & Easy",
    description: "Simple meals under 30 minutes",
    meals: ["Smoothie bowl", "Wrap with hummus", "Stir-fry vegetables"],
    tags: ["quick", "beginner-friendly", "minimal-prep"],
  },
  {
    title: "High Protein",
    description: "For muscle building and recovery",
    meals: ["Egg white omelette", "Turkey & avocado bowl", "Lean beef stir-fry"],
    tags: ["high-protein", "muscle-building", "post-workout"],
  },
  {
    title: "Plant Power",
    description: "Delicious plant-based options",
    meals: ["Acai bowl", "Buddha bowl with tofu", "Lentil curry"],
    tags: ["vegan", "plant-based", "high-fiber"],
  },
  {
    title: "Budget Friendly",
    description: "Nutritious meals that are easy on the wallet",
    meals: ["Rice and beans bowl", "Egg fried rice", "Lentil soup with bread"],
    tags: ["budget-friendly", "affordable", "pantry-staples"],
  },
];

export default function MealPrepPage() {
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [prefs, setPrefs] = useState<MealPrepPreferences | null>(getMealPrepPreferences());
  const [savedMeals, setSavedMeals] = useState<SavedRoutine[]>(getSavedRoutinesByType("meal_plan"));
  const bodyProfile = getBodyProfile();
  const signals = getDimensionSignals();
  const hasPreferences = prefs?.dietaryStyle != null;
  const isBudgetConscious = signals.costTier === "frugal" || signals.costTier === "moderate";

  const handleSavePreferences = (newPrefs: MealPrepPreferences) => {
    saveMealPrepPreferences(newPrefs);
    setPrefs(newPrefs);
    setPrefsOpen(false);
  };

  const handleSaveMealPlan = (plan: typeof SAMPLE_MEAL_PLANS[0]) => {
    const saved = saveRoutine({
      type: "meal_plan",
      title: plan.title,
      description: plan.description,
      data: { meals: plan.meals },
      tags: plan.tags,
    });
    setSavedMeals([saved, ...savedMeals]);
  };

  const getPersonalizedRecommendation = () => {
    if (!prefs?.dietaryStyle && !bodyProfile?.bodyGoal && !isBudgetConscious) return null;
    
    if (isBudgetConscious) {
      return SAMPLE_MEAL_PLANS.find(p => p.tags.includes("budget-friendly"));
    }
    if (prefs?.dietaryStyle === "vegan" || prefs?.dietaryStyle === "vegetarian") {
      return SAMPLE_MEAL_PLANS.find(p => p.tags.includes("plant-based"));
    }
    if (bodyProfile?.bodyGoal === "build_muscle" || bodyProfile?.bodyGoal === "tone") {
      return SAMPLE_MEAL_PLANS.find(p => p.tags.includes("high-protein"));
    }
    return SAMPLE_MEAL_PLANS[0];
  };

  const recommendedPlan = getPersonalizedRecommendation();

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Meal Prep</h1>
          <p className="text-muted-foreground">
            Personalized meal plans based on your diet and goals
          </p>
        </div>

        {isBudgetConscious && (
          <Card className="bg-emerald-500/5 border-emerald-500/20">
            <CardContent className="p-4 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-sm mb-1">Budget-conscious mode active</h4>
                <p className="text-sm text-muted-foreground">
                  We're prioritizing affordable, pantry-friendly meal options for you.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {!hasPreferences ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <Utensils className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Set Your Preferences</h3>
                <p className="text-sm text-muted-foreground">
                  Tell us about your dietary needs so we can personalize your meal plans
                </p>
              </div>
              <Button onClick={() => setPrefsOpen(true)} data-testid="button-set-preferences">
                <Settings2 className="w-4 h-4 mr-2" />
                Set Preferences
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">Your Preferences</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setPrefsOpen(true)}
                  data-testid="button-edit-preferences"
                >
                  <Settings2 className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {prefs?.dietaryStyle && (
                <div className="flex items-center gap-2">
                  <Leaf className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm capitalize">{prefs.dietaryStyle}</span>
                </div>
              )}
              {prefs?.restrictions && prefs.restrictions.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {prefs.restrictions.map((r) => (
                    <Badge key={r} variant="secondary" className="text-xs">
                      {r}
                    </Badge>
                  ))}
                </div>
              )}
              {bodyProfile?.bodyGoal && prefs?.syncWithBodyGoal && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-emerald-500" />
                  Synced with your body goal
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {hasPreferences && recommendedPlan && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h2 className="font-semibold">Recommended for You</h2>
            </div>
            <Card className="hover-elevate cursor-pointer" data-testid="card-recommended-meal">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="font-medium mb-1">{recommendedPlan.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      {recommendedPlan.description}
                    </p>
                    <div className="text-sm text-muted-foreground">
                      {recommendedPlan.meals.length} meals included
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Utensils className="w-4 h-4" />
            Browse Meal Plans
          </h2>
          <div className="space-y-2">
            {SAMPLE_MEAL_PLANS.map((plan, index) => (
              <Card 
                key={index} 
                className="hover-elevate cursor-pointer"
                data-testid={`card-meal-plan-${index}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="font-medium mb-1">{plan.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {plan.description}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {plan.tags.slice(0, 3).map((tag) => (
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
                        handleSaveMealPlan(plan);
                      }}
                      data-testid={`button-save-meal-${index}`}
                    >
                      Save
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <MealPreferencesDialog
          open={prefsOpen}
          onClose={() => setPrefsOpen(false)}
          onSave={handleSavePreferences}
          initialPrefs={prefs}
          hasBodyProfile={!!bodyProfile?.bodyGoal}
        />
      </div>
    </ScrollArea>
  );
}

interface MealPreferencesDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (prefs: MealPrepPreferences) => void;
  initialPrefs: MealPrepPreferences | null;
  hasBodyProfile: boolean;
}

function MealPreferencesDialog({ open, onClose, onSave, initialPrefs, hasBodyProfile }: MealPreferencesDialogProps) {
  const [prefs, setPrefs] = useState<MealPrepPreferences>({
    dietaryStyle: null,
    restrictions: [],
    allergies: [],
    dislikedIngredients: [],
    caloricTarget: null,
    mealsPerDay: 3,
    syncWithBodyGoal: true,
    notes: "",
    updatedAt: Date.now(),
  });

  useEffect(() => {
    if (open && initialPrefs) {
      setPrefs(initialPrefs);
    }
  }, [open, initialPrefs]);

  const toggleRestriction = (r: string) => {
    const restrictions = prefs.restrictions.includes(r)
      ? prefs.restrictions.filter(x => x !== r)
      : [...prefs.restrictions, r];
    setPrefs({ ...prefs, restrictions });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Meal Preferences</DialogTitle>
          <DialogDescription>
            Tell us about your dietary needs
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Dietary Style</h4>
            <div className="grid grid-cols-2 gap-2">
              {DIETARY_STYLES.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setPrefs({ ...prefs, dietaryStyle: style.id })}
                  className={`p-3 rounded-md text-left transition-colors ${
                    prefs.dietaryStyle === style.id 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted/50 hover-elevate"
                  }`}
                  data-testid={`button-diet-${style.id}`}
                >
                  <div className="font-medium text-sm">{style.label}</div>
                  <div className={`text-xs ${prefs.dietaryStyle === style.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    {style.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Restrictions & Preferences</h4>
            <div className="flex flex-wrap gap-2">
              {COMMON_RESTRICTIONS.map((r) => (
                <Badge
                  key={r}
                  variant={prefs.restrictions.includes(r) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleRestriction(r)}
                  data-testid={`badge-restriction-${r.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {r}
                </Badge>
              ))}
            </div>
          </div>

          {hasBodyProfile && (
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
              <div className="flex items-center gap-2">
                <Check className={`w-4 h-4 ${prefs.syncWithBodyGoal ? "text-emerald-500" : "text-muted-foreground"}`} />
                <span className="text-sm">Sync with my body goals</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPrefs({ ...prefs, syncWithBodyGoal: !prefs.syncWithBodyGoal })}
                data-testid="button-toggle-sync"
              >
                {prefs.syncWithBodyGoal ? "On" : "Off"}
              </Button>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1" data-testid="button-cancel-prefs">
            Cancel
          </Button>
          <Button onClick={() => onSave(prefs)} className="flex-1" data-testid="button-save-prefs">
            Save Preferences
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
