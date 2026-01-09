import { 
  Utensils, 
  Dumbbell, 
  Heart, 
  Sparkles, 
  LucideIcon,
  Users,
  Moon,
  Sun,
  Brain
} from "lucide-react";

export type AlternativesDomain = "meals" | "workouts" | "recovery" | "spiritual" | "community";

export interface AlternativeOption {
  name: string;
  ratio?: string;
  duration?: string;
  intensity?: string;
  notes: string;
  tags?: string[];
}

export interface AlternativesResult {
  original: string;
  alternatives: AlternativeOption[];
  reason: string;
}

export interface DomainConfig {
  id: AlternativesDomain;
  label: string;
  singularLabel: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  searchPlaceholder: string;
  exclusionsLabel: string;
  exclusionsDescription: string;
  commonExclusions: string[];
  constraintTypes: string[];
  itemLabel: string;
  alternativeLabel: string;
}

export const DOMAIN_CONFIGS: Record<AlternativesDomain, DomainConfig> = {
  meals: {
    id: "meals",
    label: "Meals & Ingredients",
    singularLabel: "Ingredient",
    icon: Utensils,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    searchPlaceholder: "Search ingredient (milk, eggs, chicken...)",
    exclusionsLabel: "Excluded Ingredients",
    exclusionsDescription: "Ingredients you want to avoid in all meal suggestions",
    commonExclusions: [
      "peanuts", "tree nuts", "milk", "eggs", "wheat", "soy", "fish", "shellfish",
      "sesame", "gluten", "meat", "pork", "beef", "chicken", "dairy", "sugar"
    ],
    constraintTypes: ["allergy", "dietary", "preference", "availability"],
    itemLabel: "ingredient",
    alternativeLabel: "substitute"
  },
  workouts: {
    id: "workouts",
    label: "Workouts & Exercises",
    singularLabel: "Exercise",
    icon: Dumbbell,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    searchPlaceholder: "Search exercise (squats, running, pushups...)",
    exclusionsLabel: "Exercise Limitations",
    exclusionsDescription: "Exercises to avoid due to injuries, equipment, or preference",
    commonExclusions: [
      "running", "jumping", "squats", "lunges", "pushups", "pullups", 
      "burpees", "high-impact", "weights", "cardio", "ab exercises", "overhead movements"
    ],
    constraintTypes: ["injury", "equipment", "time", "intensity", "preference"],
    itemLabel: "exercise",
    alternativeLabel: "alternative"
  },
  recovery: {
    id: "recovery",
    label: "Recovery & Rest",
    singularLabel: "Recovery Practice",
    icon: Moon,
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10",
    searchPlaceholder: "Search practice (meditation, stretching, sleep...)",
    exclusionsLabel: "Recovery Limitations",
    exclusionsDescription: "Practices to avoid due to constraints or preference",
    commonExclusions: [
      "seated meditation", "floor stretches", "cold exposure", "hot bath",
      "foam rolling", "massage", "guided visualization", "breathing exercises"
    ],
    constraintTypes: ["physical", "time", "space", "equipment", "preference"],
    itemLabel: "practice",
    alternativeLabel: "alternative"
  },
  spiritual: {
    id: "spiritual",
    label: "Spiritual Practices",
    singularLabel: "Practice",
    icon: Sparkles,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    searchPlaceholder: "Search practice (prayer, gratitude, journaling...)",
    exclusionsLabel: "Practice Preferences",
    exclusionsDescription: "Practices you'd prefer to avoid or substitute",
    commonExclusions: [
      "prayer", "meditation", "chanting", "journaling", "gratitude",
      "fasting", "silence", "group practice", "reading", "nature walks"
    ],
    constraintTypes: ["belief", "time", "environment", "preference"],
    itemLabel: "practice",
    alternativeLabel: "alternative"
  },
  community: {
    id: "community",
    label: "Community Activities",
    singularLabel: "Activity",
    icon: Users,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    searchPlaceholder: "Search activity (group class, meetup, volunteer...)",
    exclusionsLabel: "Activity Preferences",
    exclusionsDescription: "Activities you'd prefer to avoid",
    commonExclusions: [
      "large groups", "online events", "in-person events", "speaking",
      "competitive activities", "team sports", "one-on-one"
    ],
    constraintTypes: ["social", "time", "location", "preference"],
    itemLabel: "activity",
    alternativeLabel: "alternative"
  }
};

export function getDomainConfig(domain: AlternativesDomain): DomainConfig {
  return DOMAIN_CONFIGS[domain];
}
