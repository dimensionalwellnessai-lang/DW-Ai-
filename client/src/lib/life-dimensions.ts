// PR #3: New 8 Life Dimensions Configuration
import {
  Activity,
  Brain,
  Users,
  Sparkles,
  DollarSign,
  Briefcase,
  Home,
  BookOpen,
  type LucideIcon,
} from "lucide-react";

export interface LifeDimension {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  description: string;
}

export const LIFE_DIMENSIONS: LifeDimension[] = [
  {
    id: "physical",
    label: "Physical",
    icon: Activity,
    color: "text-red-500",
    bg: "bg-red-500/10",
    description: "Body health, fitness, nutrition, sleep"
  },
  {
    id: "mental",
    label: "Mental/Emotional",
    icon: Brain,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    description: "Mental health, emotional regulation, stress"
  },
  {
    id: "social",
    label: "Social",
    icon: Users,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    description: "Relationships, community, connection"
  },
  {
    id: "spiritual",
    label: "Spiritual",
    icon: Sparkles,
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    description: "Purpose, meaning, beliefs, practices"
  },
  {
    id: "financial",
    label: "Financial",
    icon: DollarSign,
    color: "text-green-500",
    bg: "bg-green-500/10",
    description: "Money management, security, goals"
  },
  {
    id: "occupational",
    label: "Occupational",
    icon: Briefcase,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    description: "Career, work satisfaction, purpose"
  },
  {
    id: "environmental",
    label: "Environmental",
    icon: Home,
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
    description: "Living space, surroundings, safety"
  },
  {
    id: "intellectual",
    label: "Intellectual",
    icon: BookOpen,
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
    description: "Learning, growth, creativity"
  },
];

export const getDimensionById = (id: string): LifeDimension | undefined => {
  return LIFE_DIMENSIONS.find(d => d.id === id);
};

// Assessment questions for each dimension (5 questions per dimension)
export const ASSESSMENT_QUESTIONS: Record<string, string[]> = {
  physical: [
    "How satisfied are you with your physical health?",
    "Do you exercise regularly?",
    "Are you happy with your energy levels?",
    "Do you get enough quality sleep?",
    "Are you eating nutritiously?"
  ],
  mental: [
    "How would you rate your mental health?",
    "Can you manage stress effectively?",
    "Do you feel emotionally balanced?",
    "Are you able to regulate your emotions?",
    "Do you have healthy coping mechanisms?"
  ],
  social: [
    "Are you satisfied with your relationships?",
    "Do you have a strong support network?",
    "Do you feel connected to your community?",
    "Do you have meaningful friendships?",
    "Are you able to maintain healthy boundaries?"
  ],
  spiritual: [
    "Do you have a sense of purpose?",
    "Are your spiritual practices meaningful?",
    "Do you feel connected to something greater?",
    "Are your values clear to you?",
    "Do you find meaning in your daily life?"
  ],
  financial: [
    "Are you satisfied with your financial situation?",
    "Do you have a clear financial plan?",
    "Are you managing your money effectively?",
    "Do you feel financially secure?",
    "Are you working toward your financial goals?"
  ],
  occupational: [
    "Are you satisfied with your career?",
    "Does your work feel meaningful?",
    "Do you have work-life balance?",
    "Are you using your skills effectively?",
    "Do you see growth opportunities?"
  ],
  environmental: [
    "Are you happy with your living space?",
    "Do you feel safe in your environment?",
    "Is your home organized and comfortable?",
    "Does your environment support your wellbeing?",
    "Are you satisfied with your surroundings?"
  ],
  intellectual: [
    "Are you learning and growing?",
    "Do you engage your creativity?",
    "Are you intellectually stimulated?",
    "Do you pursue new knowledge?",
    "Are you challenging yourself mentally?"
  ],
};
