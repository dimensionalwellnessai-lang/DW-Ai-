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
  Check,
  ArrowRightLeft,
  ShoppingBag,
  ChefHat,
  Search,
  X,
  Info
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface IngredientAlternative {
  original: string;
  alternatives: {
    name: string;
    type: "homemade" | "store";
    forRestrictions: string[];
    description: string;
    howToMake?: string;
    whereToBuy?: string;
  }[];
}

const INGREDIENT_ALTERNATIVES: IngredientAlternative[] = [
  {
    original: "Milk",
    alternatives: [
      { 
        name: "Oat Milk", 
        type: "homemade", 
        forRestrictions: ["Dairy-free", "Nut-free"],
        description: "Creamy, slightly sweet, great for coffee",
        howToMake: "Blend 1 cup rolled oats with 4 cups water for 30 seconds. Strain through cheesecloth. Add pinch of salt and vanilla."
      },
      { 
        name: "Oat Milk", 
        type: "store", 
        forRestrictions: ["Dairy-free", "Nut-free"],
        description: "Creamy, slightly sweet, great for coffee",
        whereToBuy: "Oatly, Planet Oat, Chobani - available at most grocery stores"
      },
      { 
        name: "Coconut Milk", 
        type: "homemade", 
        forRestrictions: ["Dairy-free", "Nut-free", "Soy-free"],
        description: "Rich and creamy, tropical flavor",
        howToMake: "Blend 2 cups shredded coconut with 4 cups hot water. Strain through cheesecloth. Refrigerate."
      },
      { 
        name: "Rice Milk", 
        type: "store", 
        forRestrictions: ["Dairy-free", "Nut-free", "Soy-free"],
        description: "Light and naturally sweet",
        whereToBuy: "Rice Dream, Pacific Foods - most grocery stores"
      },
    ]
  },
  {
    original: "Chicken",
    alternatives: [
      { 
        name: "Jackfruit", 
        type: "store", 
        forRestrictions: ["Vegetarian", "Vegan"],
        description: "Shredded texture similar to pulled chicken",
        whereToBuy: "Canned in water/brine at Asian markets or Whole Foods"
      },
      { 
        name: "Lion's Mane Mushroom", 
        type: "store", 
        forRestrictions: ["Vegetarian", "Vegan"],
        description: "Meaty texture, absorbs flavors well",
        whereToBuy: "Fresh at specialty stores, dried online"
      },
      { 
        name: "Seitan", 
        type: "homemade", 
        forRestrictions: ["Vegetarian", "Vegan", "Soy-free"],
        description: "High protein wheat gluten with chewy texture",
        howToMake: "Mix vital wheat gluten with broth and seasonings. Knead, shape, and simmer 45 min."
      },
      { 
        name: "Tofu (pressed)", 
        type: "store", 
        forRestrictions: ["Vegetarian", "Vegan", "Gluten-free"],
        description: "Versatile, takes on any flavor",
        whereToBuy: "Extra-firm tofu, press 30 min before cooking"
      },
    ]
  },
  {
    original: "Eggs",
    alternatives: [
      { 
        name: "Flax Egg", 
        type: "homemade", 
        forRestrictions: ["Vegan", "Dairy-free"],
        description: "Great for baking, binding",
        howToMake: "Mix 1 tbsp ground flax + 3 tbsp water. Let sit 5 min until gel-like."
      },
      { 
        name: "Chia Egg", 
        type: "homemade", 
        forRestrictions: ["Vegan", "Dairy-free"],
        description: "Similar to flax, slightly more binding",
        howToMake: "Mix 1 tbsp chia seeds + 3 tbsp water. Let sit 5 min."
      },
      { 
        name: "JUST Egg", 
        type: "store", 
        forRestrictions: ["Vegan", "Dairy-free"],
        description: "Scrambles and cooks like real eggs",
        whereToBuy: "Most grocery stores in refrigerated section"
      },
      { 
        name: "Silken Tofu", 
        type: "store", 
        forRestrictions: ["Vegan", "Dairy-free", "Gluten-free"],
        description: "Blend for creamy dishes, quiches",
        whereToBuy: "Any grocery store, shelf-stable or refrigerated"
      },
    ]
  },
  {
    original: "Butter",
    alternatives: [
      { 
        name: "Coconut Oil", 
        type: "store", 
        forRestrictions: ["Dairy-free", "Vegan"],
        description: "1:1 replacement, slight coconut flavor",
        whereToBuy: "Any grocery store - refined has less coconut taste"
      },
      { 
        name: "Olive Oil", 
        type: "store", 
        forRestrictions: ["Dairy-free", "Vegan"],
        description: "For savory dishes, use 3/4 amount",
        whereToBuy: "Any grocery store"
      },
      { 
        name: "Vegan Butter", 
        type: "store", 
        forRestrictions: ["Dairy-free", "Vegan"],
        description: "Closest to real butter taste",
        whereToBuy: "Earth Balance, Miyoko's - most stores"
      },
    ]
  },
  {
    original: "Cheese",
    alternatives: [
      { 
        name: "Nutritional Yeast", 
        type: "store", 
        forRestrictions: ["Dairy-free", "Vegan", "Gluten-free"],
        description: "Cheesy, nutty flavor for sauces",
        whereToBuy: "Health food stores, Bragg brand common"
      },
      { 
        name: "Cashew Cheese", 
        type: "homemade", 
        forRestrictions: ["Dairy-free", "Vegan"],
        description: "Creamy, spreadable, rich flavor",
        howToMake: "Blend soaked cashews with lemon, garlic, nutritional yeast, salt."
      },
      { 
        name: "Vegan Shreds", 
        type: "store", 
        forRestrictions: ["Dairy-free", "Vegan"],
        description: "Melts for pizza, nachos",
        whereToBuy: "Violife, Daiya, Follow Your Heart - most stores"
      },
    ]
  },
  {
    original: "Wheat Flour",
    alternatives: [
      { 
        name: "Almond Flour", 
        type: "store", 
        forRestrictions: ["Gluten-free"],
        description: "Nutty, moist baked goods",
        whereToBuy: "Bob's Red Mill, any grocery store"
      },
      { 
        name: "Oat Flour", 
        type: "homemade", 
        forRestrictions: ["Gluten-free", "Nut-free"],
        description: "Mild flavor, good for cookies",
        howToMake: "Blend certified gluten-free oats until fine powder."
      },
      { 
        name: "Coconut Flour", 
        type: "store", 
        forRestrictions: ["Gluten-free", "Nut-free"],
        description: "Absorbent - use 1/4 amount, add extra liquid",
        whereToBuy: "Any grocery store baking aisle"
      },
    ]
  },
];

export default function MealPrepPage() {
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [prefs, setPrefs] = useState<MealPrepPreferences | null>(getMealPrepPreferences());
  const [savedMeals, setSavedMeals] = useState<SavedRoutine[]>(getSavedRoutinesByType("meal_plan"));
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [selectedIngredient, setSelectedIngredient] = useState<IngredientAlternative | null>(null);
  const [filterType, setFilterType] = useState<"all" | "homemade" | "store">("all");
  const bodyProfile = getBodyProfile();
  const signals = getDimensionSignals();
  const hasPreferences = prefs?.dietaryStyle != null;
  const isBudgetConscious = signals.costTier === "frugal" || signals.costTier === "moderate";

  const getRelevantAlternatives = (alt: IngredientAlternative) => {
    let alternatives = alt.alternatives;
    if (filterType !== "all") {
      alternatives = alternatives.filter(a => a.type === filterType);
    }
    if (prefs?.restrictions && prefs.restrictions.length > 0) {
      alternatives = alternatives.filter(a => 
        prefs.restrictions.some(r => a.forRestrictions.includes(r))
      );
    }
    return alternatives.length > 0 ? alternatives : alt.alternatives.filter(a => filterType === "all" || a.type === filterType);
  };

  const filteredIngredients = ingredientSearch 
    ? INGREDIENT_ALTERNATIVES.filter(i => 
        i.original.toLowerCase().includes(ingredientSearch.toLowerCase())
      )
    : INGREDIENT_ALTERNATIVES;

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
            Personalized meal plans and ingredient alternatives
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

        <Tabs defaultValue="plans" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="plans" className="flex-1" data-testid="tab-meal-plans">
              <Utensils className="w-4 h-4 mr-2" />
              Meal Plans
            </TabsTrigger>
            <TabsTrigger value="swap" className="flex-1" data-testid="tab-ingredient-swap">
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Ingredient Swap
            </TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="mt-4 space-y-6">
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
          </TabsContent>

          <TabsContent value="swap" className="mt-4 space-y-6">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Info className="w-4 h-4" />
                  <span>Find alternatives based on your dietary restrictions</span>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search ingredient (milk, eggs, chicken...)"
                    value={ingredientSearch}
                    onChange={(e) => setIngredientSearch(e.target.value)}
                    className="pl-10"
                    data-testid="input-ingredient-search"
                  />
                  {ingredientSearch && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2"
                      onClick={() => setIngredientSearch("")}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Badge 
                    variant={filterType === "all" ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setFilterType("all")}
                  >
                    All
                  </Badge>
                  <Badge 
                    variant={filterType === "homemade" ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setFilterType("homemade")}
                  >
                    <ChefHat className="w-3 h-3 mr-1" />
                    Homemade
                  </Badge>
                  <Badge 
                    variant={filterType === "store" ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setFilterType("store")}
                  >
                    <ShoppingBag className="w-3 h-3 mr-1" />
                    Store-bought
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {prefs?.restrictions && prefs.restrictions.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Filtering for:</span>
                {prefs.restrictions.map(r => (
                  <Badge key={r} variant="secondary" className="text-xs">{r}</Badge>
                ))}
              </div>
            )}

            <div className="space-y-3">
              {filteredIngredients.map((ingredient, idx) => (
                <Card 
                  key={idx} 
                  className={`hover-elevate cursor-pointer ${selectedIngredient?.original === ingredient.original ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => setSelectedIngredient(selectedIngredient?.original === ingredient.original ? null : ingredient)}
                  data-testid={`card-ingredient-${ingredient.original.toLowerCase()}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <ArrowRightLeft className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="font-medium">{ingredient.original}</h3>
                          <p className="text-sm text-muted-foreground">
                            {getRelevantAlternatives(ingredient).length} alternatives
                          </p>
                        </div>
                      </div>
                      <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${selectedIngredient?.original === ingredient.original ? 'rotate-90' : ''}`} />
                    </div>

                    {selectedIngredient?.original === ingredient.original && (
                      <div className="mt-4 pt-4 border-t space-y-3">
                        {getRelevantAlternatives(ingredient).map((alt, altIdx) => (
                          <div key={altIdx} className="p-3 bg-muted/30 rounded-md space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-sm">{alt.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {alt.type === "homemade" ? (
                                  <><ChefHat className="w-3 h-3 mr-1" />Homemade</>
                                ) : (
                                  <><ShoppingBag className="w-3 h-3 mr-1" />Store</>
                                )}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{alt.description}</p>
                            <div className="flex flex-wrap gap-1">
                              {alt.forRestrictions.map(r => (
                                <Badge key={r} variant="secondary" className="text-xs">{r}</Badge>
                              ))}
                            </div>
                            {alt.howToMake && (
                              <div className="pt-2 border-t border-muted">
                                <p className="text-xs text-muted-foreground font-medium mb-1">How to make:</p>
                                <p className="text-sm">{alt.howToMake}</p>
                              </div>
                            )}
                            {alt.whereToBuy && (
                              <div className="pt-2 border-t border-muted">
                                <p className="text-xs text-muted-foreground font-medium mb-1">Where to buy:</p>
                                <p className="text-sm">{alt.whereToBuy}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

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
