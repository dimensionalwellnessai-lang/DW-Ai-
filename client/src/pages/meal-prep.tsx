import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import { useTutorialStart } from "@/contexts/tutorial-context";
import { useToast } from "@/hooks/use-toast";
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
  Heart,
  Calendar,
  Zap,
  Plus,
  Link2,
  FileText,
  Trash2,
  ExternalLink,
  History,
  Loader2,
  Wand2
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
  saveCalendarEvent,
  getUserResourcesByType,
  deleteUserResource,
  getSavedRecipes,
  saveRecipe,
  deleteRecipe,
  toggleRecipeFavorite,
  getActiveGroceryList,
  createGroceryList,
  addItemToGroceryList,
  toggleGroceryItemChecked,
  toggleGroceryItemPantry,
  removeGroceryItem,
  addRecipeIngredientsToGroceryList,
  type MealPrepPreferences,
  type DietaryStyle,
  type SavedRoutine,
  type UserResource,
  type SavedRecipe,
  type GroceryList,
  type GroceryItem
} from "@/lib/guest-storage";
import { ResourceFormDialog } from "@/components/resource-form-dialog";
import { DocumentImportFlow } from "@/components/document-import-flow";
import { PlanningScopeDialog, usePlanningScope } from "@/components/planning-scope-dialog";
import { 
  rotateContent, 
  getRotationIndex,
  getSoftOnboardingMood,
  type PlanningHorizon
} from "@/lib/guest-storage";
import { getCurrentEnergyContext, type EnergyLevel } from "@/lib/energy-context";

interface NutritionAIPick {
  id: string;
  title: string;
  duration: number;
  tag: string;
  why: string;
}

const NUTRITION_AI_PICKS: Record<EnergyLevel, NutritionAIPick[]> = {
  low: [
    {
      id: "low-1",
      title: "Quick Smoothie Bowl",
      duration: 5,
      tag: "Quick",
      why: "Notice if your energy feels low. This takes minimal effort and still supports your nutrition."
    },
    {
      id: "low-2", 
      title: "Overnight Oats",
      duration: 5,
      tag: "Prep Ahead",
      why: "Notice if tomorrow feels heavy. Prep the night before so it's one less thing to think about."
    },
    {
      id: "low-3",
      title: "Simple Grain Bowl",
      duration: 10,
      tag: "Balanced",
      why: "Notice how a quick, balanced meal can restore your energy without demanding too much."
    }
  ],
  medium: [
    {
      id: "med-1",
      title: "Balanced Protein Bowl",
      duration: 20,
      tag: "Balanced",
      why: "Notice that you have enough energy to engage without pushing. This keeps things balanced."
    },
    {
      id: "med-2",
      title: "Sheet Pan Dinner",
      duration: 25,
      tag: "Easy",
      why: "Notice if you want something easy. One pan, minimal cleanup works for steady energy days."
    },
    {
      id: "med-3",
      title: "Mediterranean Salad",
      duration: 15,
      tag: "Fresh",
      why: "Notice how fresh ingredients can support your energy throughout the day."
    }
  ],
  high: [
    {
      id: "high-1",
      title: "High-Protein Meal Prep",
      duration: 30,
      tag: "Protein",
      why: "Notice that your energy is up. Use it to prep meals that support your goals."
    },
    {
      id: "high-2",
      title: "Buddha Bowl with Tofu",
      duration: 25,
      tag: "Plant-Based",
      why: "Notice if you have capacity for something more involved. This recipe is worth the effort."
    },
    {
      id: "high-3",
      title: "Batch Cooking Session",
      duration: 45,
      tag: "Prep Ahead",
      why: "Notice how channeling high energy into batch prep sets you up for the week ahead."
    }
  ]
};

// Categories for Nutrition guided experience
interface NutritionCategory {
  id: string;
  title: string;
  description: string;
  icon: string;
}

const NUTRITION_CATEGORIES: NutritionCategory[] = [
  { id: "meal-plans", title: "Meal Plans", description: "Full day meal planning", icon: "calendar" },
  { id: "meal-prep", title: "Meal Prep Ideas", description: "Batch cooking & prep tips", icon: "chef" },
  { id: "alternatives", title: "Ingredient Alternatives", description: "Swap suggestions", icon: "swap" },
  { id: "grocery", title: "Grocery Builder", description: "Build your shopping list", icon: "cart" },
];

// Filter types for Nutrition
type DietFilter = "any" | "vegan" | "vegetarian" | "gluten-free";
type PrepTimeFilter = "any" | "quick" | "medium" | "longer";
type FocusFilter = "any" | "high-protein" | "balanced" | "light";

type EffortLevel = "any" | "minimal" | "moderate" | "involved";
type MealType = "any" | "breakfast" | "lunch" | "dinner";

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
  youtubeVideoId?: string;
  youtubeSearch: string;
  tags: string[];
}

// Helper to construct YouTube thumbnail URL from video ID
const getYouTubeThumbnail = (videoId: string, size: "default" | "medium" | "high" = "medium") => {
  const sizeMap = { default: "default", medium: "mqdefault", high: "hqdefault" };
  return `https://i.ytimg.com/vi/${videoId}/${sizeMap[size]}.jpg`;
};

const COOKING_VIDEOS: CookingVideo[] = [
  {
    id: "meal-prep-basics",
    title: "Weekly Meal Prep Basics",
    description: "Learn the fundamentals of preparing a week's worth of healthy meals in 2 hours",
    duration: "15:00",
    difficulty: "beginner",
    servings: 5,
    category: "Meal Prep",
    youtubeVideoId: "86dLBiKpuUw",
    youtubeSearch: "weekly meal prep basics healthy beginner",
    tags: ["beginner", "time-saving", "batch-cooking"],
  },
  {
    id: "overnight-oats-5-ways",
    title: "Overnight Oats 5 Ways",
    description: "Quick breakfast ideas that take 5 minutes to prepare the night before",
    duration: "8:30",
    difficulty: "beginner",
    servings: 1,
    category: "Breakfast",
    youtubeVideoId: "hLYofk9gkGc",
    youtubeSearch: "overnight oats recipe easy breakfast",
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
    youtubeVideoId: "aQvpPxQxoqo",
    youtubeSearch: "healthy protein bowl recipe meal prep",
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
    youtubeVideoId: "UErCfP2OEMY",
    youtubeSearch: "sheet pan dinner recipes easy healthy",
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
    youtubeVideoId: "RKiDKRo_1ec",
    youtubeSearch: "plant based protein cooking tofu tempeh",
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
    youtubeVideoId: "H2fL2BjpPkM",
    youtubeSearch: "healthy smoothie recipes energy boost",
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
    youtubeVideoId: "UJXADdPDq6U",
    youtubeSearch: "budget meal prep cheap healthy eating",
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
    youtubeVideoId: "Ka_c8fQ3mJU",
    youtubeSearch: "quick stir fry recipe healthy dinner",
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
    youtubeVideoId: "NxGSPmXnGKM",
    youtubeSearch: "healthy snack ideas energy boost",
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
    youtubeVideoId: "P_BUWA1eTsU",
    youtubeSearch: "homemade salad dressing recipes healthy",
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
  const [, setLocation] = useLocation();
  useTutorialStart("meal-prep", 1000);
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
  const [suggestMealsOpen, setSuggestMealsOpen] = useState(false);
  const [suggestStep, setSuggestStep] = useState<"energy" | "mealType" | "results">("energy");
  const [suggestEnergy, setSuggestEnergy] = useState<"low" | "medium" | "high" | null>(null);
  const [suggestMealType, setSuggestMealType] = useState<MealType>("any");
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
  const [confirmMealOpen, setConfirmMealOpen] = useState(false);
  const [aiPickSelectedId, setAiPickSelectedId] = useState<string | null>(null);
  const [aiPickCalendarOpen, setAiPickCalendarOpen] = useState(false);
  const [pendingAIPick, setPendingAIPick] = useState<NutritionAIPick | null>(null);
  // Wave 6A filters
  const [dietFilter, setDietFilter] = useState<DietFilter>("any");
  const [prepTimeFilter, setPrepTimeFilter] = useState<PrepTimeFilter>("any");
  const [focusFilter, setFocusFilter] = useState<FocusFilter>("any");
  const [selectedNutritionCategory, setSelectedNutritionCategory] = useState<string | null>(null);
  
  const energyContext = getCurrentEnergyContext();
  const currentEnergy = energyContext?.energy || "medium";
  const nutritionAIPicks = NUTRITION_AI_PICKS[currentEnergy];
  
  const { 
    horizon: planningHorizon, 
    showScopeDialog, 
    PlanningScopeDialogProps 
  } = usePlanningScope("meals");

  const [rotationIndex, setRotationIndex] = useState(() => getRotationIndex("meals"));

  const rotateMeals = () => {
    const mood = getSoftOnboardingMood();
    const rotation = rotateContent("meals", "", mood || undefined);
    setRotationIndex(rotation.currentIndex);
    toast({
      title: "Content Shifted",
      description: "Notice the new options tailored to your energy.",
    });
  };

  const [pendingMeal, setPendingMeal] = useState<{ name: string; mealType: string; prepTime: number } | null>(null);
  const [resourceDialogOpen, setResourceDialogOpen] = useState(false);
  const [documentImportOpen, setDocumentImportOpen] = useState(false);
  const [userResources, setUserResources] = useState<UserResource[]>(getUserResourcesByType("meal_plan"));
  const [aiIngredientSuggestion, setAiIngredientSuggestion] = useState<string | null>(null);
  const ingredientRequestId = useRef(0);
  
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>(getSavedRecipes());
  const [groceryList, setGroceryList] = useState<GroceryList | null>(getActiveGroceryList());
  const [quickAddItem, setQuickAddItem] = useState("");
  const [recipeBoxOpen, setRecipeBoxOpen] = useState(false);
  
  const { toast } = useToast();

  // AI-powered ingredient suggestion when search has no results
  const ingredientAiMutation = useMutation({
    mutationKey: ["ai-ingredient-swap"],
    mutationFn: async (query: string) => {
      const requestId = ++ingredientRequestId.current;
      const restrictions = prefs?.restrictions?.join(", ") || "none specified";
      const response = await apiRequest("POST", "/api/chat/smart", {
        message: `The user is looking for ingredient substitutions for "${query}". Their dietary restrictions are: ${restrictions}.

Provide 2-3 helpful alternatives in a calm, supportive tone. Format as a brief list. Max 60 words total. Don't say "you should" - use "notice" or "try" instead.`,
        conversationHistory: [],
      });
      const data = await response.json();
      return { ...data, requestId };
    },
    onMutate: () => {
      setAiIngredientSuggestion(null);
    },
    onSuccess: (data) => {
      if (data.requestId === ingredientRequestId.current) {
        setAiIngredientSuggestion(data.response);
      }
    },
    onError: () => {
      setAiIngredientSuggestion(null);
      toast({
        title: "Could not get suggestions",
        description: "We can try again in a moment.",
        variant: "destructive",
      });
    },
  });
  const bodyProfile = getBodyProfile();
  const signals = getDimensionSignals();
  const hasPreferences = prefs?.dietaryStyle != null;
  const isBudgetConscious = signals.costTier === "frugal" || signals.costTier === "moderate";

  const promptAddMealToCalendar = (mealName: string, mealType: string, prepTime: number) => {
    setPendingMeal({ name: mealName, mealType, prepTime });
    setConfirmMealOpen(true);
  };

  const confirmAddMealToCalendar = () => {
    if (!pendingMeal) return;
    
    const now = new Date();
    let startHour = 12;
    if (pendingMeal.mealType === "breakfast" || pendingMeal.name.toLowerCase().includes("oat") || pendingMeal.name.toLowerCase().includes("smoothie") || pendingMeal.name.toLowerCase().includes("egg")) {
      startHour = 8;
    } else if (pendingMeal.name.toLowerCase().includes("lunch") || pendingMeal.name.toLowerCase().includes("salad") || pendingMeal.name.toLowerCase().includes("wrap")) {
      startHour = 12;
    } else if (pendingMeal.name.toLowerCase().includes("dinner") || pendingMeal.name.toLowerCase().includes("salmon") || pendingMeal.name.toLowerCase().includes("beef") || pendingMeal.name.toLowerCase().includes("curry")) {
      startHour = 18;
    }
    
    const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startHour, 0).getTime();
    const endTime = startTime + pendingMeal.prepTime * 60 * 1000;
    
    saveCalendarEvent({
      title: pendingMeal.name,
      description: `${pendingMeal.prepTime} min prep time`,
      dimension: "physical",
      startTime,
      endTime,
      isAllDay: false,
      location: null,
      virtualLink: null,
      reminders: [],
      recurring: false,
      recurrencePattern: null,
      relatedFoundationIds: [],
      tags: ["meal", pendingMeal.mealType],
    });
    
    toast({
      title: "Added to calendar.",
      description: `"${pendingMeal.name}" scheduled for today. Notice how planning meals ahead shifts the mental load.`,
    });
    
    setConfirmMealOpen(false);
    setPendingMeal(null);
  };

  const getMealSuggestions = () => {
    let allMeals: { id: string; name: string; prepTime: number; planTitle: string; ingredients: string[] }[] = [];
    
    SAMPLE_MEAL_PLANS.forEach(plan => {
      plan.meals.forEach(meal => {
        allMeals.push({
          id: `${plan.title}-${meal.name}`.replace(/\s+/g, '-').toLowerCase(),
          name: meal.name,
          prepTime: meal.prepTime,
          planTitle: plan.title,
          ingredients: meal.ingredients,
        });
      });
    });
    
    if (suggestEnergy === "low") {
      allMeals = allMeals.filter(m => m.prepTime <= 10);
    } else if (suggestEnergy === "medium") {
      allMeals = allMeals.filter(m => m.prepTime <= 20);
    }
    
    return allMeals.slice(0, 3);
  };

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

  const handleAIPickSelect = (pick: NutritionAIPick) => {
    if (aiPickSelectedId === pick.id) {
      setAiPickSelectedId(null);
    } else {
      setAiPickSelectedId(pick.id);
    }
  };

  const handleSaveAIPick = () => {
    const selectedPick = nutritionAIPicks.find(p => p.id === aiPickSelectedId);
    if (!selectedPick) return;
    setPendingAIPick(selectedPick);
    setAiPickCalendarOpen(true);
  };

  const confirmSaveAIPick = () => {
    if (!pendingAIPick) return;
    
    const now = new Date();
    const startHour = pendingAIPick.title.toLowerCase().includes("breakfast") || pendingAIPick.title.toLowerCase().includes("oat") || pendingAIPick.title.toLowerCase().includes("smoothie") ? 8 :
                      pendingAIPick.title.toLowerCase().includes("dinner") ? 18 : 12;
    
    const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startHour, 0).getTime();
    const endTime = startTime + pendingAIPick.duration * 60 * 1000;
    
    saveCalendarEvent({
      title: pendingAIPick.title,
      description: `${pendingAIPick.duration} min prep - ${pendingAIPick.tag}`,
      dimension: "physical",
      startTime,
      endTime,
      isAllDay: false,
      location: null,
      virtualLink: null,
      reminders: [],
      recurring: false,
      recurrencePattern: null,
      relatedFoundationIds: [],
      tags: ["meal", "ai-pick", pendingAIPick.tag.toLowerCase()],
    });
    
    toast({
      title: "Added to calendar.",
      description: `"${pendingAIPick.title}" scheduled for today. Notice how nourishing yourself shifts your energy.`,
    });
    
    setAiPickCalendarOpen(false);
    setPendingAIPick(null);
    setAiPickSelectedId(null);
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
    toast({
      title: "Saved.",
      description: `"${plan.title}" added. Notice how meal planning supports your energy throughout the day.`,
    });
  };

  const handleSaveMealAsRecipe = (meal: { name: string; prepTime: number; ingredients: string[] }, planTitle: string) => {
    const newRecipe = saveRecipe({
      title: meal.name,
      description: `From ${planTitle}`,
      source: planTitle,
      sourceUrl: null,
      servings: 2,
      prepTime: meal.prepTime,
      cookTime: 0,
      ingredients: meal.ingredients.map(ing => ({
        name: ing,
        amount: "1",
        unit: "",
        category: "Other",
      })),
      instructions: [],
      tags: [],
      dietaryTags: [],
      notes: "",
      isFavorite: false,
    });
    setSavedRecipes([newRecipe, ...savedRecipes]);
    toast({
      title: "Recipe saved",
      description: `"${meal.name}" added to your Recipe Box.`,
    });
  };

  const isRecipeSaved = (mealName: string) => {
    return savedRecipes.some(r => r.title === mealName);
  };

  const isMealPlanSaved = (planTitle: string) => {
    return savedMeals.some(s => s.title === planTitle);
  };

  // Wave 6A: Filter meal plans based on selected filters
  const filteredMealPlans = SAMPLE_MEAL_PLANS.filter(plan => {
    // Diet filter
    if (dietFilter !== "any") {
      const isDietMatch = 
        (dietFilter === "vegan" && plan.tags.includes("plant-based")) ||
        (dietFilter === "vegetarian" && (plan.tags.includes("plant-based") || plan.tags.includes("vegetarian"))) ||
        (dietFilter === "gluten-free" && plan.tags.includes("gluten-free"));
      if (!isDietMatch) return false;
    }
    
    // Prep time filter (based on average meal prep time)
    const avgPrepTime = plan.meals.reduce((sum, m) => sum + m.prepTime, 0) / plan.meals.length;
    if (prepTimeFilter !== "any") {
      if (prepTimeFilter === "quick" && avgPrepTime > 10) return false;
      if (prepTimeFilter === "medium" && avgPrepTime > 20) return false;
      // "longer" shows all
    }
    
    // Focus filter
    if (focusFilter !== "any") {
      const isFocusMatch = 
        (focusFilter === "high-protein" && plan.tags.includes("high-protein")) ||
        (focusFilter === "balanced" && plan.tags.includes("balanced")) ||
        (focusFilter === "light" && (plan.tags.includes("quick") || plan.tags.includes("minimal-prep")));
      if (!isFocusMatch) return false;
    }
    
    return true;
  });

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

  const handleQuickAddGroceryItem = () => {
    if (!quickAddItem.trim()) return;
    
    let list = groceryList;
    if (!list) {
      list = createGroceryList("Shopping List");
    }
    
    addItemToGroceryList(list.id, {
      name: quickAddItem.trim(),
      amount: "1",
      unit: "",
      category: "Other",
      isChecked: false,
      isInPantry: false,
      sourceRecipeIds: [],
      sourceMealPlanIds: [],
      notes: "",
    });
    
    setGroceryList(getActiveGroceryList());
    setQuickAddItem("");
    toast({ title: "Added to list", description: `"${quickAddItem}" added to your grocery list.` });
  };

  const handleToggleGroceryCheck = (itemId: string) => {
    if (!groceryList) return;
    toggleGroceryItemChecked(groceryList.id, itemId);
    setGroceryList(getActiveGroceryList());
  };

  const handleTogglePantry = (itemId: string) => {
    if (!groceryList) return;
    toggleGroceryItemPantry(groceryList.id, itemId);
    setGroceryList(getActiveGroceryList());
  };

  const handleRemoveGroceryItem = (itemId: string) => {
    if (!groceryList) return;
    removeGroceryItem(groceryList.id, itemId);
    setGroceryList(getActiveGroceryList());
    toast({ title: "Removed", description: "Item removed from your list." });
  };

  const handleAddMealPlanToGrocery = (plan: typeof SAMPLE_MEAL_PLANS[0]) => {
    let list = groceryList;
    if (!list) {
      list = createGroceryList("Shopping List");
    }
    
    for (const meal of plan.meals) {
      for (const ing of meal.ingredients) {
        addItemToGroceryList(list.id, {
          name: ing,
          amount: "1",
          unit: "",
          category: "Other",
          isChecked: false,
          isInPantry: false,
          sourceRecipeIds: [],
          sourceMealPlanIds: [plan.title],
          notes: `From ${meal.name}`,
        });
      }
    }
    
    setGroceryList(getActiveGroceryList());
    toast({ 
      title: "Added to grocery list", 
      description: `Ingredients from "${plan.title}" added to your list.` 
    });
  };

  const groceryItemsByCategory = groceryList?.items.reduce((acc, item) => {
    const cat = item.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, GroceryItem[]>) || {};

  const uncheckedCount = groceryList?.items.filter(i => !i.isChecked && !i.isInPantry).length || 0;
  const checkedCount = groceryList?.items.filter(i => i.isChecked).length || 0;
  const pantryCount = groceryList?.items.filter(i => i.isInPantry).length || 0;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Meal Plans" />
      
      <ScrollArea className="h-[calc(100vh-57px)]">
        <div className="p-4 max-w-2xl mx-auto space-y-6 pb-24">
          {/* Planning Horizon & Energy Shift */}
          <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-primary/5 p-4 rounded-xl border border-primary/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-medium">Planning Horizon: {planningHorizon === "today" ? "Just Today" : planningHorizon === "week" ? "This Week" : "This Month"}</h2>
                <p className="text-xs text-muted-foreground">Adjusting your focus helps reduce cognitive load.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={rotateMeals} data-testid="button-rotate-meals">
                <Sparkles className="h-3 w-3 mr-1.5" />
                Shift Energy
              </Button>
              <Button size="sm" className="h-8 text-xs" onClick={showScopeDialog} data-testid="button-change-horizon">
                Change Horizon
              </Button>
            </div>
          </section>

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
            {/* Wave 6A: Category Thumbnails */}
            <section className="space-y-3">
              <h2 className="font-display font-semibold text-sm">Browse by Category</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: "meal-plans", label: "Meal Plans", icon: Calendar, color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
                  { id: "meal-prep", label: "Meal Prep Ideas", icon: ChefHat, color: "text-amber-500", bgColor: "bg-amber-500/10" },
                  { id: "alternatives", label: "Ingredient Alternatives", icon: ArrowRightLeft, color: "text-blue-500", bgColor: "bg-blue-500/10" },
                  { id: "grocery", label: "Grocery Builder", icon: ShoppingBag, color: "text-purple-500", bgColor: "bg-purple-500/10" },
                ].map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedNutritionCategory === cat.id;
                  return (
                    <Card
                      key={cat.id}
                      className={`cursor-pointer transition-all ${
                        isSelected 
                          ? "ring-2 ring-primary bg-primary/5" 
                          : "hover-elevate"
                      }`}
                      onClick={() => setSelectedNutritionCategory(isSelected ? null : cat.id)}
                      data-testid={`card-nutrition-category-${cat.id}`}
                    >
                      <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                        <div className={`w-12 h-12 rounded-lg ${cat.bgColor} flex items-center justify-center`}>
                          <Icon className={`h-6 w-6 ${cat.color}`} />
                        </div>
                        <span className="text-sm font-medium">{cat.label}</span>
                        {isSelected && (
                          <Badge variant="default" className="text-xs">Selected</Badge>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>

            {/* Wave 6A: Filters */}
            <section className="space-y-3">
              <h3 className="text-xs font-medium text-muted-foreground">Filters</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Leaf className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs text-muted-foreground flex-shrink-0">Diet:</span>
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {(["any", "vegan", "vegetarian", "gluten-free"] as DietFilter[]).map((d) => (
                      <Button
                        key={d}
                        variant={dietFilter === d ? "default" : "outline"}
                        size="sm"
                        className="flex-shrink-0"
                        onClick={() => setDietFilter(d)}
                        data-testid={`button-diet-${d}`}
                      >
                        {d === "any" ? "Any" : d.charAt(0).toUpperCase() + d.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs text-muted-foreground flex-shrink-0">Time:</span>
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {(["any", "quick", "medium", "longer"] as PrepTimeFilter[]).map((t) => (
                      <Button
                        key={t}
                        variant={prepTimeFilter === t ? "default" : "outline"}
                        size="sm"
                        className="flex-shrink-0"
                        onClick={() => setPrepTimeFilter(t)}
                        data-testid={`button-prep-time-${t}`}
                      >
                        {t === "any" ? "Any" : t === "quick" ? "Quick" : t === "medium" ? "Medium" : "Longer"}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs text-muted-foreground flex-shrink-0">Focus:</span>
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {(["any", "high-protein", "balanced", "light"] as FocusFilter[]).map((f) => (
                      <Button
                        key={f}
                        variant={focusFilter === f ? "default" : "outline"}
                        size="sm"
                        className="flex-shrink-0"
                        onClick={() => setFocusFilter(f)}
                        data-testid={`button-focus-${f}`}
                      >
                        {f === "any" ? "Any" : f === "high-protein" ? "High-Protein" : f === "balanced" ? "Balanced" : "Light"}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Grocery Builder Section - Shows when category selected */}
            {selectedNutritionCategory === "grocery" && (
              <section className="space-y-4" data-testid="section-grocery-builder">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-purple-500/10 rounded-lg">
                      <ShoppingBag className="h-4 w-4 text-purple-500" />
                    </div>
                    <h2 className="font-semibold">Grocery Builder</h2>
                  </div>
                  {groceryList && groceryList.items.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {uncheckedCount} to buy
                    </Badge>
                  )}
                </div>
                
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Quick add item..."
                        value={quickAddItem}
                        onChange={(e) => setQuickAddItem(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleQuickAddGroceryItem()}
                        className="flex-1"
                        data-testid="input-quick-add-grocery"
                      />
                      <Button onClick={handleQuickAddGroceryItem} size="icon" data-testid="button-add-grocery-item">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {savedMeals.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Add from saved plans:</p>
                        <div className="flex flex-wrap gap-2">
                          {savedMeals.slice(0, 3).map((meal) => (
                            <Button
                              key={meal.id}
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const plan = SAMPLE_MEAL_PLANS.find(p => p.title === meal.title);
                                if (plan) handleAddMealPlanToGrocery(plan);
                              }}
                              data-testid={`button-add-plan-${meal.id}`}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              {meal.title.substring(0, 20)}{meal.title.length > 20 ? "..." : ""}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {(!groceryList || groceryList.items.length === 0) ? (
                      <div className="text-center py-6 text-muted-foreground">
                        <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Your grocery list is empty.</p>
                        <p className="text-xs mt-1">Add items above or generate from meal plans.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {uncheckedCount > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                              To Buy ({uncheckedCount})
                            </h4>
                            <div className="space-y-1">
                              {groceryList.items.filter(i => !i.isChecked && !i.isInPantry).map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover-elevate group"
                                >
                                  <button
                                    onClick={() => handleToggleGroceryCheck(item.id)}
                                    className="w-5 h-5 rounded border-2 border-muted-foreground/30 flex items-center justify-center hover:border-primary transition-colors"
                                    data-testid={`button-check-${item.id}`}
                                  />
                                  <span className="flex-1 text-sm">{item.name}</span>
                                  {item.amount !== "1" && (
                                    <Badge variant="outline" className="text-xs">{item.amount} {item.unit}</Badge>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleTogglePantry(item.id)}
                                    data-testid={`button-pantry-${item.id}`}
                                  >
                                    <Check className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                                    onClick={() => handleRemoveGroceryItem(item.id)}
                                    data-testid={`button-remove-${item.id}`}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {checkedCount > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                              Got It ({checkedCount})
                            </h4>
                            <div className="space-y-1">
                              {groceryList.items.filter(i => i.isChecked).map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 group"
                                >
                                  <button
                                    onClick={() => handleToggleGroceryCheck(item.id)}
                                    className="w-5 h-5 rounded border-2 border-primary bg-primary flex items-center justify-center"
                                    data-testid={`button-uncheck-${item.id}`}
                                  >
                                    <Check className="h-3 w-3 text-primary-foreground" />
                                  </button>
                                  <span className="flex-1 text-sm line-through text-muted-foreground">{item.name}</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                                    onClick={() => handleRemoveGroceryItem(item.id)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {pantryCount > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                              Already in Pantry ({pantryCount})
                            </h4>
                            <div className="space-y-1">
                              {groceryList.items.filter(i => i.isInPantry).map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/5 group"
                                >
                                  <div className="w-5 h-5 rounded bg-emerald-500/20 flex items-center justify-center">
                                    <Check className="h-3 w-3 text-emerald-600" />
                                  </div>
                                  <span className="flex-1 text-sm text-muted-foreground">{item.name}</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleTogglePantry(item.id)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </section>
            )}
            
            {/* Recipe Box Section */}
            {selectedNutritionCategory === "meal-prep" && (
              <section className="space-y-4" data-testid="section-recipe-box">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-amber-500/10 rounded-lg">
                      <ChefHat className="h-4 w-4 text-amber-500" />
                    </div>
                    <h2 className="font-semibold">Recipe Box</h2>
                  </div>
                  {savedRecipes.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {savedRecipes.length} saved
                    </Badge>
                  )}
                </div>
                
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Save recipes from meal plans or add your own favorites. 
                      Add ingredients directly to your grocery list.
                    </p>
                    
                    {savedRecipes.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        <Heart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No saved recipes yet.</p>
                        <p className="text-xs mt-1">Save recipes from meal plans to see them here.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {savedRecipes.slice(0, 5).map((recipe) => (
                          <Card key={recipe.id} className="hover-elevate">
                            <CardContent className="p-3 flex items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium text-sm truncate">{recipe.title}</h4>
                                  {recipe.isFavorite && (
                                    <Heart className="h-3 w-3 text-red-500 fill-red-500 flex-shrink-0" />
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                  <Clock className="h-3 w-3" />
                                  <span>{recipe.prepTime + recipe.cookTime} min</span>
                                  <span className="text-muted-foreground/50">|</span>
                                  <span>{recipe.ingredients.length} ingredients</span>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  addRecipeIngredientsToGroceryList(recipe.id);
                                  setGroceryList(getActiveGroceryList());
                                  toast({ 
                                    title: "Added to grocery list", 
                                    description: `${recipe.ingredients.length} ingredients added.` 
                                  });
                                }}
                                data-testid={`button-add-recipe-to-grocery-${recipe.id}`}
                              >
                                <ShoppingBag className="h-3 w-3 mr-1" />
                                Add
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </section>
            )}

            {/* Wave 6.3: AI Picks Section */}
            <section className="space-y-4" data-testid="section-ai-picks-nutrition">
              <div className="flex flex-wrap items-center gap-2">
                <div className="p-1.5 bg-primary/10 rounded-lg flex-shrink-0">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <h2 className="font-semibold flex-shrink-0">Picked for You</h2>
                <span className="text-xs text-muted-foreground">
                  Based on your {currentEnergy} energy
                </span>
              </div>
              
              <div className="grid gap-3">
                {nutritionAIPicks.map((pick) => {
                  const isSelected = aiPickSelectedId === pick.id;
                  return (
                    <Card
                      key={pick.id}
                      className={`cursor-pointer transition-all ${
                        isSelected 
                          ? "ring-2 ring-primary bg-primary/5" 
                          : "hover-elevate"
                      }`}
                      onClick={() => handleAIPickSelect(pick)}
                      data-testid={`card-ai-pick-${pick.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium">{pick.title}</h3>
                              <Badge variant="secondary" className="text-xs">
                                {pick.tag}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {pick.why}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{pick.duration} min</span>
                            </div>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected 
                              ? "border-primary bg-primary" 
                              : "border-muted-foreground/30"
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              
              <div className="flex items-center justify-between gap-4">
                {!aiPickSelectedId && (
                  <span className="text-sm text-muted-foreground">Pick 1 option to save</span>
                )}
                <Button
                  disabled={!aiPickSelectedId}
                  onClick={handleSaveAIPick}
                  className={aiPickSelectedId ? "" : "ml-auto"}
                  data-testid="button-save-ai-pick-nutrition"
                >
                  <Heart className="h-4 w-4 mr-2" />
                  Add to Today
                </Button>
              </div>
            </section>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">Suggest meals for today</h3>
                      <p className="text-sm text-muted-foreground">
                        Quick ideas based on your energy and time
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => {
                      setSuggestStep("energy");
                      setSuggestEnergy(null);
                      setSuggestMealType("any");
                      setSuggestMealsOpen(true);
                    }}
                    data-testid="button-suggest-meals"
                  >
                    Start
                  </Button>
                </div>
              </CardContent>
            </Card>
            
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
                {filteredMealPlans.map((plan, index) => (
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
                          variant={isMealPlanSaved(plan.title) ? "secondary" : "outline"}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isMealPlanSaved(plan.title)) {
                              handleSaveMealPlan(plan);
                            }
                          }}
                          disabled={isMealPlanSaved(plan.title)}
                          data-testid={`button-save-meal-${index}`}
                        >
                          {isMealPlanSaved(plan.title) ? (
                            <><Check className="h-4 w-4 mr-1" /> Saved</>
                          ) : (
                            "Save"
                          )}
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
                                  
                                  <div className="flex flex-wrap gap-2 pt-2 border-t border-dashed">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSaveMealAsRecipe(meal, plan.title);
                                      }}
                                      disabled={isRecipeSaved(meal.name)}
                                      data-testid={`button-save-recipe-${index}-${mealIdx}`}
                                    >
                                      {isRecipeSaved(meal.name) ? (
                                        <><Check className="h-3 w-3 mr-1" /> In Recipe Box</>
                                      ) : (
                                        <><Heart className="h-3 w-3 mr-1" /> Save Recipe</>
                                      )}
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        let list = groceryList;
                                        if (!list) {
                                          list = createGroceryList("Shopping List");
                                        }
                                        for (const ing of meal.ingredients) {
                                          addItemToGroceryList(list.id, {
                                            name: ing,
                                            amount: "1",
                                            unit: "",
                                            category: "Other",
                                            isChecked: false,
                                            isInPantry: false,
                                            sourceRecipeIds: [],
                                            sourceMealPlanIds: [plan.title],
                                            notes: `From ${meal.name}`,
                                          });
                                        }
                                        setGroceryList(getActiveGroceryList());
                                        toast({
                                          title: "Added to grocery list",
                                          description: `${meal.ingredients.length} ingredients added.`,
                                        });
                                      }}
                                      data-testid={`button-add-ingredients-${index}-${mealIdx}`}
                                    >
                                      <ShoppingBag className="h-3 w-3 mr-1" />
                                      Add Ingredients
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        promptAddMealToCalendar(meal.name, "meal", meal.prepTime);
                                      }}
                                      data-testid={`button-schedule-meal-${index}-${mealIdx}`}
                                    >
                                      <Calendar className="h-3 w-3 mr-1" />
                                      Schedule
                                    </Button>
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
            <div className="flex flex-wrap gap-2">
              {VIDEO_CATEGORIES.map((cat) => (
                <Badge
                  key={cat}
                  variant={videoCategory === cat ? "default" : "outline"}
                  className="cursor-pointer"
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
                        {video.youtubeVideoId ? (
                          <img 
                            src={getYouTubeThumbnail(video.youtubeVideoId)} 
                            alt={video.title}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
                        )}
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
                        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Timer className="w-3 h-3" />
                            {video.duration}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {video.servings}
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
                          {video.youtubeVideoId ? (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(`https://www.youtube.com/watch?v=${video.youtubeVideoId}`, '_blank');
                              }}
                              data-testid={`button-watch-video-${video.id}`}
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Watch on YouTube
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(video.youtubeSearch)}`, '_blank');
                              }}
                              data-testid={`button-search-video-${video.id}`}
                            >
                              <Search className="w-4 h-4 mr-2" />
                              Find on YouTube
                            </Button>
                          )}
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
                    onChange={(e) => {
                      setIngredientSearch(e.target.value);
                      setAiIngredientSuggestion(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && ingredientSearch.trim()) {
                        ingredientAiMutation.reset();
                        ingredientAiMutation.mutate(ingredientSearch.trim());
                      }
                    }}
                    className="pl-10"
                    data-testid="input-ingredient-search"
                  />
                  {ingredientSearch && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2"
                      onClick={() => {
                        setIngredientSearch("");
                        setAiIngredientSuggestion(null);
                        ingredientAiMutation.reset();
                      }}
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

            {/* AI Ingredient Suggestions - inline help */}
            {ingredientAiMutation.isPending && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  <span className="text-sm">Looking up alternatives...</span>
                </CardContent>
              </Card>
            )}
            
            {aiIngredientSuggestion && !ingredientAiMutation.isPending && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Suggestions for "{ingredientSearch}"</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
                    {aiIngredientSuggestion}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAiIngredientSuggestion(null);
                      ingredientAiMutation.reset();
                    }}
                    data-testid="button-dismiss-ai-suggestion"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Dismiss
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* No results prompt */}
            {ingredientSearch.trim() && filteredIngredients.length === 0 && !aiIngredientSuggestion && !ingredientAiMutation.isPending && (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center space-y-3">
                  <Search className="w-8 h-8 mx-auto text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    No matches for "{ingredientSearch}"
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      ingredientAiMutation.reset();
                      ingredientAiMutation.mutate(ingredientSearch.trim());
                    }}
                    data-testid="button-ask-ai-ingredient"
                  >
                    <Wand2 className="w-4 h-4 mr-2" />
                    Ask for suggestions
                  </Button>
                </CardContent>
              </Card>
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

        {/* Your Resources Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Your Resources
            </h2>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setDocumentImportOpen(true)}
                data-testid="button-import-meal-document"
              >
                <Sparkles className="w-4 h-4 mr-1" />
                Import
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setResourceDialogOpen(true)}
                data-testid="button-add-meal-resource"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
          </div>
          
          {userResources.length === 0 ? (
            <Card>
              <CardContent className="p-4 text-center text-muted-foreground">
                <p className="text-sm">Save your own recipes, meal plans, or links here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {userResources.map((resource) => (
                <Card key={resource.id} className="hover-elevate" data-testid={`card-meal-resource-${resource.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                          {resource.variant === "link" ? (
                            <Link2 className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <FileText className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-medium truncate">{resource.title}</h4>
                          {resource.description && (
                            <p className="text-sm text-muted-foreground truncate">{resource.description}</p>
                          )}
                          {resource.variant === "link" && resource.url && (
                            <a 
                              href={resource.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline truncate block"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {resource.url}
                            </a>
                          )}
                          {resource.variant === "file" && resource.fileData && (
                            <p className="text-xs text-muted-foreground">
                              {resource.fileData.fileName}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {resource.variant === "link" && resource.url && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => window.open(resource.url, "_blank")}
                            data-testid={`button-open-meal-resource-${resource.id}`}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            deleteUserResource(resource.id);
                            setUserResources(getUserResourcesByType("meal_plan"));
                            toast({ title: "Resource removed" });
                          }}
                          data-testid={`button-delete-meal-resource-${resource.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <ResourceFormDialog
          open={resourceDialogOpen}
          onOpenChange={setResourceDialogOpen}
          resourceType="meal_plan"
          onSaved={() => {
            setUserResources(getUserResourcesByType("meal_plan"));
            toast({ title: "Resource saved" });
          }}
        />

        <DocumentImportFlow
          open={documentImportOpen}
          onClose={() => setDocumentImportOpen(false)}
          context="nutrition"
          onComplete={() => {
            setUserResources(getUserResourcesByType("meal_plan"));
            toast({ title: "Items imported to your meal library" });
          }}
        />

        <MealPreferencesDialog
          open={prefsOpen}
          onClose={() => setPrefsOpen(false)}
          onSave={handleSavePreferences}
          initialPrefs={prefs}
          hasBodyProfile={!!bodyProfile?.bodyGoal}
        />

        <Dialog open={suggestMealsOpen} onOpenChange={setSuggestMealsOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {suggestStep === "energy" && "How much energy for cooking today?"}
                {suggestStep === "mealType" && "What meal are we planning?"}
                {suggestStep === "results" && "Here are some ideas for you"}
              </DialogTitle>
              <DialogDescription>
                {suggestStep === "energy" && "This helps me suggest the right prep level"}
                {suggestStep === "mealType" && "Just to narrow things down a bit"}
                {suggestStep === "results" && "Pick one that feels doable, or browse for more"}
              </DialogDescription>
            </DialogHeader>
            
            {suggestStep === "energy" && (
              <div className="grid grid-cols-3 gap-3 py-4">
                {([
                  { level: "low" as const, label: "Low", desc: "Quick & easy" },
                  { level: "medium" as const, label: "Medium", desc: "Some effort" },
                  { level: "high" as const, label: "High", desc: "Ready to cook" },
                ]).map((option) => (
                  <Button
                    key={option.level}
                    variant={suggestEnergy === option.level ? "default" : "outline"}
                    className="h-auto py-4 flex flex-col gap-1"
                    onClick={() => {
                      setSuggestEnergy(option.level);
                      setSuggestStep("results");
                    }}
                    data-testid={`button-meal-energy-${option.level}`}
                  >
                    <span className="font-medium">{option.label}</span>
                    <span className="text-xs opacity-70">{option.desc}</span>
                  </Button>
                ))}
              </div>
            )}
            
            {suggestStep === "results" && (
              <div className="space-y-3 py-4">
                <p className="text-xs text-muted-foreground text-center">
                  {selectedSuggestionId ? "Tap Save to add to calendar" : "Pick 1 option to save."}
                </p>
                {getMealSuggestions().map((meal) => {
                  const isSelected = selectedSuggestionId === meal.id;
                  return (
                    <Card 
                      key={meal.id} 
                      className={`hover-elevate cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary bg-primary/5' : ''}`}
                      onClick={() => setSelectedSuggestionId(isSelected ? null : meal.id)}
                      data-testid={`card-meal-suggestion-${meal.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            {isSelected && <Check className="h-5 w-5 text-primary flex-shrink-0" />}
                            <div>
                              <h4 className="font-medium">{meal.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {meal.prepTime} min prep - {meal.planTitle}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="ghost" 
                    className="flex-1"
                    onClick={() => {
                      setSuggestStep("energy");
                      setSuggestEnergy(null);
                      setSelectedSuggestionId(null);
                    }}
                    data-testid="button-different-meals"
                  >
                    Different options
                  </Button>
                  <Button 
                    className="flex-1"
                    disabled={!selectedSuggestionId}
                    onClick={() => {
                      const suggestions = getMealSuggestions();
                      const selected = suggestions.find(m => m.id === selectedSuggestionId);
                      if (selected) {
                        promptAddMealToCalendar(selected.name, "meal", selected.prepTime);
                        setSuggestMealsOpen(false);
                        setSelectedSuggestionId(null);
                        setSuggestStep("energy");
                        setSuggestEnergy(null);
                      }
                    }}
                    data-testid="button-save-meal-suggestion"
                  >
                    <Calendar className="w-4 h-4 mr-1" />
                    Save
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={confirmMealOpen} onOpenChange={setConfirmMealOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Add to schedule</DialogTitle>
              <DialogDescription>
                {pendingMeal?.name} - {pendingMeal?.prepTime} min prep
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <p className="text-sm text-muted-foreground">
                Choose where to add this meal:
              </p>
              <div className="flex flex-col gap-2">
                <Button onClick={confirmAddMealToCalendar} data-testid="button-add-meal-today">
                  <Calendar className="w-4 h-4 mr-2" />
                  Add to Today
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setConfirmMealOpen(false);
                    setLocation("/calendar");
                  }}
                  data-testid="button-add-meal-week"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Add to Week
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setConfirmMealOpen(false);
                    setLocation("/routines");
                  }}
                  data-testid="button-add-meal-routine"
                >
                  <History className="w-4 h-4 mr-2" />
                  Add to Routine
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setConfirmMealOpen(false);
                    setPendingMeal(null);
                  }}
                  data-testid="button-meal-not-now"
                >
                  Not Now
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Wave 6.3: AI Pick Calendar Confirmation Dialog */}
        <Dialog open={aiPickCalendarOpen} onOpenChange={setAiPickCalendarOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add to Your Calendar</DialogTitle>
              <DialogDescription>
                This will schedule "{pendingAIPick?.title}" for today. You can always adjust it later.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-3">
              {pendingAIPick && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{pendingAIPick.title}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      {pendingAIPick.duration} min prep time
                    </div>
                  </div>
                  <Badge variant="secondary">{pendingAIPick.tag}</Badge>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setAiPickCalendarOpen(false);
                  setPendingAIPick(null);
                }}
                data-testid="button-ai-pick-nutrition-cancel"
              >
                Not Now
              </Button>
              <Button
                className="flex-1"
                onClick={confirmSaveAIPick}
                data-testid="button-ai-pick-nutrition-confirm"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Add to Today
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <PlanningScopeDialog {...PlanningScopeDialogProps} />
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
