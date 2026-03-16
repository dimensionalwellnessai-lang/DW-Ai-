import { Sun, Moon, Coffee, Briefcase, type LucideIcon } from "lucide-react";
import type { RoutineType } from "@/lib/guest-storage";

export interface RoutineTemplate {
  id: string;
  title: string;
  icon: LucideIcon;
  description: string;
  defaultSteps: string[];
  color: string;
  bgColor: string;
  tags: string[];
  routineType: RoutineType;
}

/**
 * Canonical list of suggested routine templates.
 * Both `routines.tsx` and `routine-template-detail.tsx` import from here
 * so there is a single source of truth.
 */
export const SUGGESTED_ROUTINES: RoutineTemplate[] = [
  {
    id: "morning",
    title: "Morning Routine",
    icon: Sun,
    description: "Start your day with intention",
    defaultSteps: [
      "Wake up gently",
      "Hydrate with water",
      "5-min stretch",
      "Set daily intention",
      "Light breakfast",
    ],
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    tags: ["morning", "energy", "mindfulness"],
    routineType: "workout", // closest type: physical morning wake-up
  },
  {
    id: "work",
    title: "Work Routine",
    icon: Briefcase,
    description: "Stay focused and productive",
    defaultSteps: [
      "Clear workspace",
      "Review priorities",
      "Deep work block",
      "Short break every 90 min",
      "End-of-day review",
    ],
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    tags: ["productivity", "focus", "work"],
    routineType: "spiritual_practice", // mindset/discipline practice
  },
  {
    id: "lunch",
    title: "Lunch Routine",
    icon: Coffee,
    description: "Recharge midday",
    defaultSteps: [
      "Step away from work",
      "Mindful eating",
      "Brief walk",
      "Quick reset meditation",
    ],
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    tags: ["lunch", "reset", "mindfulness"],
    routineType: "meal_plan", // nutrition/meal-based
  },
  {
    id: "evening",
    title: "Evening Routine",
    icon: Moon,
    description: "Wind down peacefully",
    defaultSteps: [
      "Limit screens 1hr before bed",
      "Light stretching",
      "Gratitude reflection",
      "Prepare for tomorrow",
      "Relaxing activity",
    ],
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    tags: ["evening", "relaxation", "sleep"],
    routineType: "meditation", // wind-down/relaxation practice
  },
];
