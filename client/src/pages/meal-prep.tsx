import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import { 
  Utensils, 
  Settings2, 
  Leaf, 
  Clock, 
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Sparkles,
  Check,
  ArrowRightLeft,
  ShoppingBag,
  ChefHat,
  Search,
  X,
  Info,
  Play,
  Video,
  Timer,
  Users,
  Heart
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

interface MealPlanData {
  title: string;
  description: string;
  meals: {
    name: string;
    prepTime: number;
    ingredients: string[];
    instructions: string[];
  }[];
  tags: string[];
}

const SAMPLE_MEAL_PLANS: MealPlanData[] = [
  {
    title: "Balanced Day",
    description: "Nutritious meals for steady energy",
    meals: [
      {
        name: "Overnight Oats with Berries",
        prepTime: 5,
        ingredients: ["1/2 cup rolled oats", "1/2 cup milk (or plant milk)", "1/4 cup Greek yogurt", "1 tbsp honey", "1/4 cup mixed berries", "1 tbsp chia seeds"],
        instructions: ["Combine oats, milk, yogurt, and honey in a jar", "Stir in chia seeds", "Top with berries", "Refrigerate overnight (or at least 4 hours)", "Enjoy cold or heat for 2 minutes"]
      },
      {
        name: "Grilled Chicken Salad",
        prepTime: 20,
        ingredients: ["4 oz chicken breast", "2 cups mixed greens", "1/4 cup cherry tomatoes", "1/4 cucumber sliced", "2 tbsp olive oil", "1 tbsp lemon juice", "Salt and pepper"],
        instructions: ["Season chicken with salt and pepper", "Grill chicken 6-7 min per side until cooked through", "Let rest 5 min, then slice", "Arrange greens and vegetables in bowl", "Top with sliced chicken", "Drizzle with olive oil and lemon"]
      },
      {
        name: "Salmon with Quinoa",
        prepTime: 25,
        ingredients: ["4 oz salmon fillet", "1/2 cup quinoa", "1 cup broccoli florets", "1 tbsp olive oil", "Lemon wedge", "Fresh dill", "Salt and pepper"],
        instructions: ["Cook quinoa according to package (about 15 min)", "Season salmon with salt, pepper, dill", "Pan-sear salmon 4 min per side", "Steam broccoli until tender-crisp (5 min)", "Plate quinoa, top with salmon and broccoli", "Squeeze lemon over and serve"]
      }
    ],
    tags: ["balanced", "high-protein", "meal-prep-friendly"],
  },
  {
    title: "Quick & Easy",
    description: "Simple meals under 30 minutes",
    meals: [
      {
        name: "Smoothie Bowl",
        prepTime: 5,
        ingredients: ["1 frozen banana", "1/2 cup frozen berries", "1/4 cup milk", "2 tbsp granola", "1 tbsp nut butter", "Fresh fruit for topping"],
        instructions: ["Blend banana, berries, and milk until thick", "Pour into bowl", "Top with granola, nut butter, and fresh fruit", "Enjoy immediately"]
      },
      {
        name: "Veggie Hummus Wrap",
        prepTime: 10,
        ingredients: ["1 large tortilla", "3 tbsp hummus", "1/4 avocado sliced", "1/4 cup shredded carrots", "1/4 cup cucumber", "Handful spinach", "Sprouts (optional)"],
        instructions: ["Spread hummus on tortilla", "Layer vegetables in center", "Fold sides in, then roll tightly", "Slice in half diagonally", "Wrap in foil for meal prep"]
      },
      {
        name: "Quick Vegetable Stir-Fry",
        prepTime: 15,
        ingredients: ["2 cups mixed vegetables", "2 tbsp soy sauce", "1 tbsp sesame oil", "1 clove garlic minced", "1 tsp ginger", "Cooked rice or noodles"],
        instructions: ["Heat sesame oil in wok or pan over high heat", "Add garlic and ginger, cook 30 seconds", "Add vegetables, stir-fry 5-7 minutes", "Add soy sauce, toss to coat", "Serve over rice or noodles"]
      }
    ],
    tags: ["quick", "beginner-friendly", "minimal-prep"],
  },
  {
    title: "High Protein",
    description: "For muscle building and recovery",
    meals: [
      {
        name: "Egg White Omelette",
        prepTime: 10,
        ingredients: ["4 egg whites", "1/4 cup spinach", "2 tbsp feta cheese", "1/4 cup mushrooms", "Salt and pepper", "Cooking spray"],
        instructions: ["Whisk egg whites with salt and pepper", "Heat pan with cooking spray over medium", "Pour in egg whites, let set 2 min", "Add spinach, mushrooms, and feta to one half", "Fold omelette in half, cook 1 more minute", "Slide onto plate"]
      },
      {
        name: "Turkey & Avocado Bowl",
        prepTime: 15,
        ingredients: ["5 oz ground turkey", "1/2 avocado", "1/2 cup brown rice", "1/4 cup black beans", "Salsa", "Lime juice"],
        instructions: ["Cook brown rice if not prepped", "Brown ground turkey in skillet, season with cumin", "Arrange rice in bowl", "Top with turkey, beans, sliced avocado", "Add salsa and squeeze of lime"]
      },
      {
        name: "Lean Beef Stir-Fry",
        prepTime: 20,
        ingredients: ["5 oz lean beef strips", "1 cup bell peppers", "1/2 cup snap peas", "2 tbsp soy sauce", "1 tbsp oyster sauce", "Garlic and ginger"],
        instructions: ["Slice beef into thin strips", "Heat oil in wok over high heat", "Sear beef 2-3 min, remove and set aside", "Stir-fry vegetables 3-4 min", "Return beef, add sauces", "Toss together and serve over rice"]
      }
    ],
    tags: ["high-protein", "muscle-building", "post-workout"],
  },
  {
    title: "Plant Power",
    description: "Delicious plant-based options",
    meals: [
      {
        name: "Acai Bowl",
        prepTime: 5,
        ingredients: ["1 acai packet (frozen)", "1/2 banana", "1/4 cup plant milk", "Granola", "Coconut flakes", "Fresh berries", "Chia seeds"],
        instructions: ["Blend acai, banana, and milk until thick", "Pour into bowl", "Top with granola, coconut, berries, chia", "Eat immediately while cold"]
      },
      {
        name: "Buddha Bowl with Tofu",
        prepTime: 25,
        ingredients: ["4 oz firm tofu", "1/2 cup quinoa", "1/4 cup chickpeas", "1/2 cup roasted vegetables", "Tahini dressing", "Fresh greens"],
        instructions: ["Press tofu 15 min, cube and bake at 400F for 20 min", "Cook quinoa", "Roast vegetables (sweet potato, broccoli)", "Arrange all in bowl on bed of greens", "Drizzle with tahini dressing"]
      },
      {
        name: "Lentil Curry",
        prepTime: 30,
        ingredients: ["1 cup red lentils", "1 can coconut milk", "2 tbsp curry paste", "1 onion diced", "2 cloves garlic", "1 can diced tomatoes", "Spinach"],
        instructions: ["Saute onion and garlic until soft", "Add curry paste, cook 1 min", "Add lentils, tomatoes, coconut milk, 2 cups water", "Simmer 20-25 min until lentils tender", "Stir in spinach at end", "Serve over rice or with naan"]
      }
    ],
    tags: ["vegan", "plant-based", "high-fiber"],
  },
  {
    title: "Budget Friendly",
    description: "Nutritious meals that are easy on the wallet",
    meals: [
      {
        name: "Rice and Beans Bowl",
        prepTime: 20,
        ingredients: ["1 cup rice", "1 can black beans", "1/2 onion", "Cumin and chili powder", "Salsa", "Cilantro", "Lime"],
        instructions: ["Cook rice according to package", "Saute onion, add beans and spices", "Heat through 5 min", "Serve beans over rice", "Top with salsa, cilantro, lime"]
      },
      {
        name: "Egg Fried Rice",
        prepTime: 15,
        ingredients: ["2 cups day-old rice", "2 eggs", "1/2 cup frozen peas and carrots", "3 tbsp soy sauce", "Sesame oil", "Green onions"],
        instructions: ["Scramble eggs in wok, set aside", "Add more oil, fry cold rice until heated", "Add frozen vegetables", "Return eggs, add soy sauce", "Finish with sesame oil and green onions"]
      },
      {
        name: "Lentil Soup with Bread",
        prepTime: 30,
        ingredients: ["1 cup green lentils", "1 onion", "2 carrots", "2 celery stalks", "4 cups broth", "Crusty bread", "Bay leaf"],
        instructions: ["Saute diced onion, carrots, celery", "Add lentils, broth, bay leaf", "Simmer 25-30 min until lentils soft", "Season with salt and pepper", "Serve with crusty bread for dipping"]
      }
    ],
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

interface CookingVideo {
  id: string;
  title: string;
  description: string;
  duration: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  servings: number;
  category: string;
  thumbnail: string;
  tags: string[];
}

const COOKING_VIDEOS: CookingVideo[] = [
  {
    id: "meal-prep-basics",
    title: "Weekly Meal Prep Basics",
    description: "Learn the fundamentals of preparing a week's worth of healthy meals in just 2 hours",
    duration: "15:00",
    difficulty: "beginner",
    servings: 5,
    category: "Meal Prep",
    thumbnail: "meal-prep",
    tags: ["beginner", "time-saving", "batch-cooking"],
  },
  {
    id: "overnight-oats-5-ways",
    title: "Overnight Oats 5 Ways",
    description: "Quick breakfast ideas that take just 5 minutes to prepare the night before",
    duration: "8:30",
    difficulty: "beginner",
    servings: 1,
    category: "Breakfast",
    thumbnail: "breakfast",
    tags: ["quick", "breakfast", "no-cook"],
  },
  {
    id: "protein-bowl-mastery",
    title: "Build the Perfect Protein Bowl",
    description: "Create balanced, satisfying bowls with lean proteins and fresh vegetables",
    duration: "12:00",
    difficulty: "beginner",
    servings: 2,
    category: "Lunch",
    thumbnail: "protein-bowl",
    tags: ["high-protein", "balanced", "customizable"],
  },
  {
    id: "sheet-pan-dinners",
    title: "One-Pan Dinners for Busy Nights",
    description: "Simple sheet pan meals that cook while you relax - minimal cleanup required",
    duration: "10:45",
    difficulty: "beginner",
    servings: 4,
    category: "Dinner",
    thumbnail: "sheet-pan",
    tags: ["easy", "family-friendly", "minimal-cleanup"],
  },
  {
    id: "plant-based-proteins",
    title: "Cooking with Plant-Based Proteins",
    description: "How to prepare tofu, tempeh, and legumes for maximum flavor and texture",
    duration: "18:00",
    difficulty: "intermediate",
    servings: 4,
    category: "Plant-Based",
    thumbnail: "plant-based",
    tags: ["vegan", "vegetarian", "protein"],
  },
  {
    id: "healthy-smoothies",
    title: "Nutrient-Packed Smoothies",
    description: "Blend delicious smoothies that support energy and wellness throughout the day",
    duration: "7:00",
    difficulty: "beginner",
    servings: 1,
    category: "Smoothies",
    thumbnail: "smoothie",
    tags: ["quick", "breakfast", "energy"],
  },
  {
    id: "budget-friendly-meals",
    title: "Eating Well on a Budget",
    description: "Nutritious meals using affordable pantry staples and seasonal produce",
    duration: "14:30",
    difficulty: "beginner",
    servings: 4,
    category: "Budget",
    thumbnail: "budget",
    tags: ["budget-friendly", "pantry", "affordable"],
  },
  {
    id: "quick-stir-fry",
    title: "15-Minute Stir-Fry Mastery",
    description: "Master the wok for fast, flavorful meals any night of the week",
    duration: "11:00",
    difficulty: "intermediate",
    servings: 2,
    category: "Quick Meals",
    thumbnail: "stir-fry",
    tags: ["quick", "asian-inspired", "vegetables"],
  },
  {
    id: "healthy-snacks",
    title: "Snacks That Fuel Your Day",
    description: "Prepare satisfying snacks that keep energy steady between meals",
    duration: "9:00",
    difficulty: "beginner",
    servings: 4,
    category: "Snacks",
    thumbnail: "snacks",
    tags: ["snacks", "energy", "portable"],
  },
  {
    id: "salad-dressings",
    title: "Homemade Dressings in Minutes",
    description: "Create fresh, flavorful dressings without preservatives or added sugars",
    duration: "6:00",
    difficulty: "beginner",
    servings: 8,
    category: "Basics",
    thumbnail: "dressing",
    tags: ["basics", "homemade", "healthy"],
  },
];

const VIDEO_CATEGORIES = [
  "All",
  "Meal Prep",
  "Breakfast",
  "Lunch",
  "Dinner",
  "Plant-Based",
  "Quick Meals",
  "Snacks",
  "Basics",
  "Budget",
];

export default function MealPrepPage() {
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [prefs, setPrefs] = useState<MealPrepPreferences | null>(getMealPrepPreferences());
  const [savedMeals, setSavedMeals] = useState<SavedRoutine[]>(getSavedRoutinesByType("meal_plan"));
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [selectedIngredient, setSelectedIngredient] = useState<IngredientAlternative | null>(null);
  const [filterType, setFilterType] = useState<"all" | "homemade" | "store">("all");
  const [expandedPlan, setExpandedPlan] = useState<number | null>(null);
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);
  const [videoCategory, setVideoCategory] = useState("All");
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);
  const [savedVideos, setSavedVideos] = useState<string[]>(() => {
    const saved = localStorage.getItem("fts_saved_videos");
    return saved ? JSON.parse(saved) : [];
  });
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

  const toggleSaveVideo = (videoId: string) => {
    const newSaved = savedVideos.includes(videoId)
      ? savedVideos.filter(id => id !== videoId)
      : [...savedVideos, videoId];
    setSavedVideos(newSaved);
    localStorage.setItem("fts_saved_videos", JSON.stringify(newSaved));
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Meal Plans" />
      
      <ScrollArea className="h-[calc(100vh-57px)]">
        <div className="p-4 max-w-2xl mx-auto space-y-6 pb-8">

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
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="plans" data-testid="tab-meal-plans">
              <Utensils className="w-4 h-4 mr-2" />
              Recipes
            </TabsTrigger>
            <TabsTrigger value="videos" data-testid="tab-videos">
              <Video className="w-4 h-4 mr-2" />
              Videos
            </TabsTrigger>
            <TabsTrigger value="swap" data-testid="tab-ingredient-swap">
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Swap
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
                    onClick={() => setExpandedPlan(expandedPlan === index ? null : index)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{plan.title}</h3>
                            {expandedPlan === index ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
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
                      
                      {expandedPlan === index && (
                        <div className="mt-4 pt-4 border-t space-y-4">
                          <h4 className="text-sm font-medium">Meals in this plan:</h4>
                          {plan.meals.map((meal, mealIdx) => (
                            <div 
                              key={mealIdx} 
                              className="bg-muted/50 rounded-lg p-3 space-y-2"
                            >
                              <div 
                                className="flex items-center justify-between cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const mealKey = `${index}-${mealIdx}`;
                                  setExpandedMeal(expandedMeal === mealKey ? null : mealKey);
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <h5 className="font-medium text-sm">{meal.name}</h5>
                                  {expandedMeal === `${index}-${mealIdx}` ? (
                                    <ChevronUp className="w-3 h-3 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {meal.prepTime} min
                                </span>
                              </div>
                              
                              {expandedMeal === `${index}-${mealIdx}` && (
                                <div className="mt-3 space-y-3">
                                  <div>
                                    <h6 className="text-xs font-medium text-muted-foreground mb-1">Ingredients:</h6>
                                    <ul className="space-y-0.5">
                                      {meal.ingredients.map((ing, ingIdx) => (
                                        <li key={ingIdx} className="text-xs text-muted-foreground flex items-start gap-1">
                                          <span className="text-primary">•</span> {ing}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                  
                                  <div>
                                    <h6 className="text-xs font-medium text-muted-foreground mb-1">Instructions:</h6>
                                    <ol className="space-y-1 list-decimal list-inside">
                                      {meal.instructions.map((inst, instIdx) => (
                                        <li key={instIdx} className="text-xs text-muted-foreground">{inst}</li>
                                      ))}
                                    </ol>
                                  </div>
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
            </div>
          </TabsContent>

          <TabsContent value="videos" className="mt-4 space-y-6">
            <div className="flex overflow-x-auto gap-2 pb-2 -mx-1 px-1">
              {VIDEO_CATEGORIES.map((cat) => (
                <Badge
                  key={cat}
                  variant={videoCategory === cat ? "default" : "outline"}
                  className="cursor-pointer whitespace-nowrap"
                  onClick={() => setVideoCategory(cat)}
                  data-testid={`badge-video-category-${cat.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {cat}
                </Badge>
              ))}
            </div>

            <div className="grid gap-4">
              {COOKING_VIDEOS.filter(v => videoCategory === "All" || v.category === videoCategory).map((video) => (
                <Card 
                  key={video.id} 
                  className="hover-elevate cursor-pointer overflow-visible"
                  data-testid={`card-video-${video.id}`}
                  onClick={() => setExpandedVideo(expandedVideo === video.id ? null : video.id)}
                >
                  <CardContent className="p-0">
                    <div className="flex gap-4 p-4">
                      <div className="relative w-28 h-20 bg-muted rounded-md flex-shrink-0 flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
                        <div className="relative z-10 w-10 h-10 rounded-full bg-background/90 flex items-center justify-center">
                          <Play className="w-5 h-5 text-primary ml-0.5" />
                        </div>
                        <div className="absolute bottom-1 right-1 bg-background/90 px-1.5 py-0.5 rounded text-xs font-medium">
                          {video.duration}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-medium text-sm mb-1 line-clamp-1">{video.title}</h3>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="flex-shrink-0 -mt-1 -mr-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSaveVideo(video.id);
                            }}
                            data-testid={`button-save-video-${video.id}`}
                          >
                            <Heart 
                              className={`w-4 h-4 ${savedVideos.includes(video.id) ? 'fill-primary text-primary' : ''}`} 
                            />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{video.description}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Timer className="w-3 h-3" />
                            {video.duration}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {video.servings} serving{video.servings > 1 ? 's' : ''}
                          </span>
                          <Badge variant="secondary" className="text-xs capitalize">
                            {video.difficulty}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    {expandedVideo === video.id && (
                      <div className="px-4 pb-4 pt-2 border-t mt-2 space-y-3">
                        <p className="text-sm text-muted-foreground">{video.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {video.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <div className="pt-2">
                          <p className="text-xs text-muted-foreground italic">
                            Video tutorials coming soon. Save this to revisit later.
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {expandedVideo !== video.id && (
                      <div className="px-4 pb-3">
                        <div className="flex flex-wrap gap-1">
                          {video.tags.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {video.tags.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{video.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {COOKING_VIDEOS.filter(v => videoCategory === "All" || v.category === videoCategory).length === 0 && (
              <div className="text-center py-8">
                <Video className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No videos in this category yet</p>
              </div>
            )}
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
    </div>
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
