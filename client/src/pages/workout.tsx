import { useState, useRef, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
import { usePageMeta } from "@/hooks/use-page-meta";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  Dumbbell, 
  User, 
  Target, 
  Play, 
  Clock, 
  Flame,
  ChevronDown,
  ChevronUp,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Calendar,
  Zap,
  Filter,
  Plus,
  Link2,
  FileText,
  Trash2,
  History,
  Loader2,
  Wand2,
  Search,
  X,
  Check,
  Heart,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { BodyScanDialog } from "@/components/body-scan-dialog";
import { 
  getBodyProfile, 
  hasCompletedBodyScan,
  getWorkoutPreferences,
  saveWorkoutPreferences,
  getSavedRoutinesByType,
  saveRoutine,
  getSpiritualProfile,
  getDimensionSignals,
  saveCalendarEvent,
  getUserResourcesByType,
  deleteUserResource,
  rotateContent,
  getRotationIndex,
  getSoftOnboardingMood,
  type BodyProfile,
  type WorkoutPreferences,
  type SavedRoutine,
  type UserResource
} from "@/lib/guest-storage";
import { PlanningScopeDialog, usePlanningScope } from "@/components/planning-scope-dialog";
import { ResourceFormDialog } from "@/components/resource-form-dialog";
import { DocumentImportFlow } from "@/components/document-import-flow";
import { InAppSearch, type SearchResult } from "@/components/in-app-search";
import { AlternativesDialog } from "@/components/alternatives-dialog";
import { ExclusionsButton } from "@/components/exclusions-manager";
import { getDomainExclusions } from "@/lib/guest-storage";
import { ArrowRightLeft } from "lucide-react";
import { useTutorialStart } from "@/contexts/tutorial-context";
import { ExerciseAnimation } from "@/components/exercise-animation";
import { WorkoutSessionEngine, type WorkoutSessionConfig, type StepType } from "@/components/workout-session-engine";
import { useUserRole } from "@/hooks/use-user-role";
import { EXERCISE_ANIMATIONS, getExercisesByEquipment, EQUIPMENT_TYPES } from "@/lib/exercise-animations";

type TimeFilter = "any" | "10" | "20" | "30";
type GoalFilter = "any" | "calm" | "strength" | "mobility" | "cardio";
type EquipmentFilter = "any" | "none" | "dumbbells" | "bands";

const GOAL_LABELS: Record<string, string> = {
  slim_fit: "Slim & Fit",
  build_muscle: "Build Muscle",
  tone: "Tone Up",
  maintain: "Maintain",
  endurance: "Endurance",
  custom: "Custom Goal",
};

interface WorkoutData {
  title: string;
  description: string;
  duration: number;
  intensity: string;
  tags: string[];
  youtubeVideoId?: string;
  youtubeSearch: string;
  steps: string[];
  equipment?: string[];
  tips?: string[];
}

interface Exercise {
  id: string;
  name: string;
  sets?: number;
  reps?: string;
  duration?: string;
  restSeconds?: number;
  equipment?: string[];
  animationId: string; // Reference to ExerciseAnimationData.id (e.g., 'push-up', 'squat')
  formTips?: string[];
}

interface WorkoutPlan {
  id: string;
  title: string;
  summary: string;
  source: 'ai-generated' | 'user-created' | 'imported';
  equipment: string[];
  goal: string;
  daysPerWeek: number;
  days: {
    dayOfWeek: string;
    focus: string;
    exercises: Exercise[];
    isRestDay: boolean;
  }[];
  createdAt: string;
  approvedAt?: string;
}

// Helper to construct YouTube thumbnail URL from video ID
const getYouTubeThumbnail = (videoId: string, size: "default" | "medium" | "high" = "medium") => {
  const sizeMap = { default: "default", medium: "mqdefault", high: "hqdefault" };
  return `https://i.ytimg.com/vi/${videoId}/${sizeMap[size]}.jpg`;
};

const SAMPLE_WORKOUTS: WorkoutData[] = [
  {
    title: "Morning Energy Boost",
    description: "Quick full-body workout to start your day with jumping jacks, high knees, and dynamic stretches",
    duration: 15,
    intensity: "gentle",
    tags: ["full-body", "energizing", "no-equipment"],
    youtubeVideoId: "cbKkB3POqaY",
    youtubeSearch: "15 minute morning energy workout no equipment",
    steps: [
      "Warm-up: 2 min light jogging in place",
      "Jumping jacks: 30 seconds x 3 sets",
      "High knees: 30 seconds x 3 sets",
      "Arm circles: 30 seconds each direction",
      "Bodyweight squats: 15 reps x 2 sets",
      "Cool-down: 2 min gentle stretching"
    ],
    tips: ["Stay hydrated", "Focus on form over speed", "Breathe steadily throughout"]
  },
  {
    title: "Core Strength Builder",
    description: "Focus on core stability and strength with planks, crunches, and leg raises",
    duration: 20,
    intensity: "steady",
    tags: ["core", "strength", "beginner-friendly"],
    youtubeVideoId: "AnYl6Nk9QgY",
    youtubeSearch: "20 minute core strength workout beginner",
    steps: [
      "Plank hold: 30 seconds x 3 sets",
      "Bicycle crunches: 15 reps each side x 3 sets",
      "Leg raises: 12 reps x 3 sets",
      "Mountain climbers: 30 seconds x 3 sets",
      "Dead bug: 10 reps each side x 2 sets",
      "Side plank: 20 seconds each side x 2 sets"
    ],
    tips: ["Keep core engaged throughout", "Don't strain your neck during crunches"]
  },
  {
    title: "Upper Body Focus",
    description: "Build strength in arms, chest, and back using dumbbells or bodyweight",
    duration: 30,
    intensity: "focused",
    tags: ["upper-body", "strength", "dumbbells"],
    youtubeVideoId: "UBMk30rjy0o",
    youtubeSearch: "30 minute upper body workout dumbbells",
    steps: [
      "Push-ups: 12 reps x 3 sets",
      "Dumbbell rows: 10 reps each arm x 3 sets",
      "Shoulder press: 12 reps x 3 sets",
      "Bicep curls: 12 reps x 3 sets",
      "Tricep dips: 10 reps x 3 sets",
      "Cool-down stretches"
    ],
    equipment: ["Dumbbells (5-15 lbs)", "Chair or bench for dips"],
    tips: ["Start with lighter weights", "Rest 60 seconds between sets"]
  },
  {
    title: "Lower Body Power",
    description: "Legs, glutes, and lower body conditioning with squats, lunges, and glute bridges",
    duration: 25,
    intensity: "focused",
    tags: ["lower-body", "strength", "toning"],
    youtubeVideoId: "Midk7fMh9rU",
    youtubeSearch: "25 minute lower body workout at home",
    steps: [
      "Bodyweight squats: 15 reps x 3 sets",
      "Walking lunges: 12 each leg x 3 sets",
      "Glute bridges: 15 reps x 3 sets",
      "Calf raises: 20 reps x 3 sets",
      "Wall sit: 30 seconds x 3 sets",
      "Stretch: quads, hamstrings, glutes"
    ],
    tips: ["Keep knees aligned with toes", "Squeeze glutes at top of bridges"]
  },
  {
    title: "Cardio & Endurance",
    description: "Heart-pumping cardio session with burpees, jumping jacks, and high-intensity intervals",
    duration: 20,
    intensity: "athlete",
    tags: ["cardio", "endurance", "high-energy"],
    youtubeVideoId: "ml6cT4AZdqI",
    youtubeSearch: "20 minute HIIT cardio workout",
    steps: [
      "Warm-up: 3 min light cardio",
      "Burpees: 30 seconds on, 30 seconds rest x 4",
      "Jump squats: 30 seconds on, 30 seconds rest x 4",
      "High knees: 30 seconds on, 30 seconds rest x 4",
      "Jumping jacks: 30 seconds on, 30 seconds rest x 4",
      "Cool-down: 2 min walking, stretching"
    ],
    tips: ["Modify intensity as needed", "Take breaks if you feel dizzy"]
  },
  {
    title: "Mindful Yoga Flow",
    description: "Gentle yoga for grounding and calm with sun salutations and relaxation poses",
    duration: 25,
    intensity: "gentle",
    tags: ["yoga", "mindfulness", "flexibility", "calm"],
    youtubeVideoId: "oBu-pQG6sTY",
    youtubeSearch: "25 minute gentle yoga flow relaxation",
    steps: [
      "Child's pose: 1 minute",
      "Cat-cow stretches: 10 breaths",
      "Sun salutation A: 3 rounds",
      "Warrior I and II: hold 30 seconds each side",
      "Triangle pose: 30 seconds each side",
      "Seated forward fold: 1 minute",
      "Savasana: 3 minutes"
    ],
    equipment: ["Yoga mat (optional)"],
    tips: ["Move with your breath", "Honor your body's limits", "Focus on relaxation"]
  },
];

export default function WorkoutPage() {
  usePageMeta("Workouts", "Access personalized workout programs and training plans.");
  useTutorialStart("workout", 1000);
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const selectedWorkoutParam = searchParams.get("selected");
  
  const [bodyScanOpen, setBodyScanOpen] = useState(false);
  const [bodyProfile, setBodyProfile] = useState<BodyProfile | null>(getBodyProfile());
  const [savedWorkouts, setSavedWorkouts] = useState<SavedRoutine[]>(getSavedRoutinesByType("workout"));
  const [hasBodyScan, setHasBodyScan] = useState(hasCompletedBodyScan());
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutData | null>(null);
  const [selectedPickedWorkout, setSelectedPickedWorkout] = useState<WorkoutData | null>(null);
  const [expandedWorkout, setExpandedWorkout] = useState<number | null>(null);
  const [pickWorkoutOpen, setPickWorkoutOpen] = useState(false);
  const [highlightedWorkout, setHighlightedWorkout] = useState<string | null>(null);
  const workoutRefs = useRef<Record<string, HTMLDivElement | null>>({});
  
  const { 
    horizon: planningHorizon, 
    showScopeDialog, 
    PlanningScopeDialogProps 
  } = usePlanningScope("workouts");

  const [rotationIndex, setRotationIndex] = useState(() => getRotationIndex("workouts"));

  const rotateWorkouts = () => {
    const mood = getSoftOnboardingMood();
    const rotation = rotateContent("workouts", "", mood || undefined);
    setRotationIndex(rotation.currentIndex);
    toast({
      title: "Energy Shifted",
      description: "Notice the new workout options tailored to your mood.",
    });
  };

  const [pickStep, setPickStep] = useState<"energy" | "time" | "results">("energy");
  const [energyLevel, setEnergyLevel] = useState<"low" | "medium" | "high" | null>(null);
  const [timeAvailable, setTimeAvailable] = useState<"10" | "20" | "30" | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("any");
  const [goalFilter, setGoalFilter] = useState<GoalFilter>("any");
  const [equipmentFilter, setEquipmentFilter] = useState<EquipmentFilter>("any");
  const [showFilters, setShowFilters] = useState(false);
  const [confirmAddOpen, setConfirmAddOpen] = useState(false);
  const [pendingWorkout, setPendingWorkout] = useState<WorkoutData | null>(null);
  const [resourceDialogOpen, setResourceDialogOpen] = useState(false);
  const [documentImportOpen, setDocumentImportOpen] = useState(false);
  const [userResources, setUserResources] = useState<UserResource[]>(getUserResourcesByType("workout"));
  const [workoutSearch, setWorkoutSearch] = useState("");
  const [aiWorkoutSuggestion, setAiWorkoutSuggestion] = useState<string | null>(null);
  const workoutRequestId = useRef(0);
  
  const [alternativesOpen, setAlternativesOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<string>("");
  const [selectedExerciseContext, setSelectedExerciseContext] = useState<string>("");
  
  // AI-generated workout plans - populated when user creates plans via AI chat
  // Plans will be saved to guest storage or database after user approval
  const [savedWorkoutPlans, setSavedWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<WorkoutPlan | null>(null);
  const [selectedExerciseAnimation, setSelectedExerciseAnimation] = useState<string | null>(null);
  const [showPlanDetails, setShowPlanDetails] = useState(false);
  const [sessionEngineOpen, setSessionEngineOpen] = useState(false);
  const [activeSessionConfig, setActiveSessionConfig] = useState<WorkoutSessionConfig | null>(null);
  const { isAuthenticated } = useUserRole();

  const { toast } = useToast();
  
  const handleFindAlternatives = (exercise: string, workoutTitle: string) => {
    const exerciseName = exercise.replace(/^[^a-zA-Z]*/, '').split(':')[0].trim();
    setSelectedExercise(exerciseName);
    setSelectedExerciseContext(workoutTitle);
    setAlternativesOpen(true);
  };

  const inferSessionTypeFromTags = (tags: string[]): StepType => {
    const normalizedTags = tags.map((tag) => tag.toLowerCase());
    const scores: Record<StepType, number> = {
      strength: 0, mobility: 0, breathwork: 0, timed: 0, distance: 0, custom: 0,
    };
    normalizedTags.forEach((tag) => {
      if (["yoga", "mobility", "stretch", "stretching"].includes(tag)) scores.mobility += 1;
      if (["breathwork", "breathing"].includes(tag)) scores.breathwork += 1;
      if (["cardio", "run", "running", "hiit"].includes(tag)) scores.timed += 1;
      if (["strength", "lifting", "weights", "resistance"].includes(tag)) scores.strength += 1;
    });
    const maxScore = Math.max(...(Object.values(scores) as number[]));
    if (maxScore <= 0) return "strength";
    // Tie-breaker priority: timed > mobility > breathwork > strength
    const priority: StepType[] = ["timed", "mobility", "breathwork", "strength"];
    for (const type of priority) {
      if (scores[type] === maxScore) return type;
    }
    return "strength";
  };

  const extractStepTitle = (stepText: string): string => {
    const cleaned = stepText.replace(/^[0-9]+\.\s*/, "");
    const colonIndex = cleaned.indexOf(":");
    const candidate = colonIndex === -1 ? cleaned : cleaned.slice(0, colonIndex);
    const trimmed = candidate.trim();
    return trimmed.length > 0 ? trimmed : stepText.trim();
  };

  const inferStepType = (stepText: string, fallback: StepType): StepType => {
    const lower = stepText.toLowerCase();
    if (/\b(set|rep|push.?up|pull.?up|squat|curl|press|row|lift|dumbbell|barbell|weight)\b/.test(lower)) return "strength";
    if (/\b(stretch|yoga|pose|mobility|flexibility|foam roll)\b/.test(lower)) return "mobility";
    if (/\b(breath|inhale|exhale|box breath|pranayama)\b/.test(lower)) return "breathwork";
    if (/\b(run|jog|sprint|cycle|bike|swim|row|distance|km|mile|meter)\b/.test(lower)) return "distance";
    if (/\b(min|minute|second|hold|plank|wall sit|timed|interval|hiit|cardio)\b/.test(lower)) return "timed";
    return fallback;
  };

  const handleStartSession = (workout: WorkoutData) => {
    // Determine dominant step type from all tags using scoring
    const sessionType = inferSessionTypeFromTags(workout.tags);

    const sessionConfig: WorkoutSessionConfig = {
      title: workout.title,
      sessionType,
      steps: workout.steps.map((stepText) => ({
        title: extractStepTitle(stepText),
        stepType: inferStepType(stepText, sessionType),
        notes: stepText,
      })),
    };
    setActiveSessionConfig(sessionConfig);
    setSessionEngineOpen(true);
  };
  
  useEffect(() => {
    if (selectedWorkoutParam) {
      const decodedTitle = decodeURIComponent(selectedWorkoutParam);
      const matchingIndex = SAMPLE_WORKOUTS.findIndex(w => w.title === decodedTitle);
      
      if (matchingIndex !== -1) {
        setHighlightedWorkout(decodedTitle);
        setExpandedWorkout(matchingIndex);
        
        setTimeout(() => {
          const ref = workoutRefs.current[decodedTitle];
          if (ref) {
            ref.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 100);
        
        setTimeout(() => {
          setHighlightedWorkout(null);
        }, 3000);
      } else {
        toast({
          title: "Workout not found",
          description: `Could not find "${decodedTitle}"`,
          variant: "destructive",
        });
      }
    }
  }, [selectedWorkoutParam, toast]);
  
  // AI-powered workout suggestion when user asks
  const workoutAiMutation = useMutation({
    mutationKey: ["ai-workout-search"],
    mutationFn: async (query: string) => {
      const requestId = ++workoutRequestId.current;
      const energyDesc = energyLevel || "not specified";
      const bodyInfo = bodyProfile ? `focusing on ${bodyProfile.bodyGoal || "general fitness"}` : "";
      const response = await apiRequest("POST", "/api/chat/smart", {
        message: `The user is looking for a workout: "${query}". Their energy level is: ${energyDesc}. ${bodyInfo}

Suggest 2-3 specific workout ideas in a calm, supportive tone. Keep it brief and actionable. Max 80 words. Don't say "you should" - use "notice" or "try" instead.`,
        conversationHistory: [],
      });
      const data = await response.json();
      return { ...data, requestId };
    },
    onMutate: () => {
      setAiWorkoutSuggestion(null);
    },
    onSuccess: (data) => {
      if (data.requestId === workoutRequestId.current) {
        setAiWorkoutSuggestion(data.response);
      }
    },
    onError: () => {
      setAiWorkoutSuggestion(null);
      toast({
        title: "Could not get suggestions",
        description: "We can try again in a moment.",
        variant: "destructive",
      });
    },
  });
  const spiritualProfile = getSpiritualProfile();
  const signals = getDimensionSignals();
  const seeksCalmOrMindfulness = signals.mindfulState === "calm" || 
    spiritualProfile?.practices?.includes("yoga") || 
    spiritualProfile?.practices?.includes("meditation");

  const openYouTubeSearch = (workout: WorkoutData) => {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(workout.youtubeSearch)}`;
    window.open(searchUrl, "_blank");
  };

  const promptAddToCalendar = (workout: WorkoutData) => {
    setPendingWorkout(workout);
    setConfirmAddOpen(true);
  };

  const addToCalendarMutation = useMutation({
    mutationFn: async (workout: WorkoutData) => {
      const now = new Date();
      const endTime = new Date(now.getTime() + workout.duration * 60 * 1000);
      
      const formatTime = (d: Date) => `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
      
      return apiRequest("POST", "/api/calendar", {
        title: workout.title,
        description: workout.description,
        startTime: formatTime(now),
        endTime: formatTime(endTime),
        eventType: "workout",
        dimensionTags: ["physical"],
        linkedType: "workout",
        linkedId: workout.title,
        linkedRoute: `/workout?selected=${encodeURIComponent(workout.title)}`,
        linkedMeta: { duration: workout.duration, intensity: workout.intensity },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar"] });
      toast({
        title: "Added to calendar.",
        description: `"${pendingWorkout?.title}" scheduled for today. Notice how planning your workout supports momentum.`,
      });
      setConfirmAddOpen(false);
      setPendingWorkout(null);
    },
    onError: () => {
      saveCalendarEvent({
        title: pendingWorkout?.title || "",
        description: pendingWorkout?.description || "",
        dimension: "physical",
        startTime: Date.now(),
        endTime: Date.now() + (pendingWorkout?.duration || 30) * 60 * 1000,
        isAllDay: false,
        location: null,
        virtualLink: null,
        reminders: [],
        recurring: false,
        recurrencePattern: null,
        relatedFoundationIds: [],
        tags: pendingWorkout?.tags || [],
      });
      toast({
        title: "Added to calendar.",
        description: `"${pendingWorkout?.title}" scheduled for today. Notice how planning your workout supports momentum.`,
      });
      setConfirmAddOpen(false);
      setPendingWorkout(null);
    },
  });

  const confirmAddToCalendar = () => {
    if (!pendingWorkout) return;
    addToCalendarMutation.mutate(pendingWorkout);
  };

  const getAISuggestions = (): WorkoutData[] => {
    let suggestions = [...SAMPLE_WORKOUTS];
    
    if (energyLevel === "low") {
      suggestions = suggestions.filter(w => w.intensity === "gentle" || w.tags.includes("yoga"));
    } else if (energyLevel === "high") {
      suggestions = suggestions.filter(w => w.intensity === "athlete" || w.intensity === "focused");
    }
    
    if (timeAvailable) {
      const time = parseInt(timeAvailable);
      suggestions = suggestions.filter(w => w.duration <= time + 5);
    }
    
    return suggestions.slice(0, 3);
  };

  const filteredWorkouts = SAMPLE_WORKOUTS.filter(workout => {
    // Text search filter
    if (workoutSearch.trim()) {
      const searchLower = workoutSearch.toLowerCase();
      const matchesTitle = workout.title.toLowerCase().includes(searchLower);
      const matchesDesc = workout.description.toLowerCase().includes(searchLower);
      const matchesTags = workout.tags.some(tag => tag.toLowerCase().includes(searchLower));
      if (!matchesTitle && !matchesDesc && !matchesTags) return false;
    }
    
    if (timeFilter !== "any") {
      const time = parseInt(timeFilter);
      if (workout.duration > time + 5) return false;
    }
    
    if (goalFilter !== "any") {
      const goalTags: Record<GoalFilter, string[]> = {
        any: [],
        calm: ["yoga", "mindfulness", "calm"],
        strength: ["strength", "upper-body", "lower-body", "core"],
        mobility: ["flexibility", "yoga"],
        cardio: ["cardio", "endurance", "high-energy"],
      };
      if (!goalTags[goalFilter].some(tag => workout.tags.includes(tag))) return false;
    }
    
    if (equipmentFilter !== "any") {
      if (equipmentFilter === "none" && workout.equipment && workout.equipment.length > 0) return false;
      if (equipmentFilter === "dumbbells" && !workout.tags.includes("dumbbells")) return false;
    }
    
    return true;
  });

  const handleBodyScanComplete = () => {
    setBodyScanOpen(false);
    setBodyProfile(getBodyProfile());
    setHasBodyScan(hasCompletedBodyScan());
  };

  const handleSaveWorkout = (workout: typeof SAMPLE_WORKOUTS[0]) => {
    const saved = saveRoutine({
      type: "workout",
      title: workout.title,
      description: workout.description,
      data: { duration: workout.duration, intensity: workout.intensity },
      tags: workout.tags,
    });
    setSavedWorkouts([saved, ...savedWorkouts]);
  };

  const getPersonalizedRecommendation = (): { workout: typeof SAMPLE_WORKOUTS[0]; why: string } | null => {
    if (seeksCalmOrMindfulness) {
      const workout = SAMPLE_WORKOUTS.find(w => w.tags.includes("yoga"));
      if (workout) {
        return { workout, why: "I'm suggesting this because you mentioned wanting calm or mindfulness." };
      }
    }
    
    if (!bodyProfile?.bodyGoal) return null;
    
    const goal = bodyProfile.bodyGoal;
    if (goal === "slim_fit" || goal === "endurance") {
      const workout = SAMPLE_WORKOUTS.find(w => w.tags.includes("cardio"));
      if (workout) {
        return { workout, why: "This aligns with your fitness goal and helps build endurance." };
      }
    }
    if (goal === "build_muscle") {
      const workout = SAMPLE_WORKOUTS.find(w => w.tags.includes("strength"));
      if (workout) {
        return { workout, why: "This supports your goal to build muscle strength." };
      }
    }
    if (goal === "tone") {
      const workout = SAMPLE_WORKOUTS.find(w => w.tags.includes("toning") || w.tags.includes("core"));
      if (workout) {
        return { workout, why: "This matches your toning goals and targets core areas." };
      }
    }
    return { workout: SAMPLE_WORKOUTS[0], why: "A balanced workout to get you moving today." };
  };

  const recommendation = getPersonalizedRecommendation();
  const recommendedWorkout = recommendation?.workout || null;
  const recommendedWhy = recommendation?.why || "";

  const userName = (() => {
    try { return JSON.parse(localStorage.getItem("dw_onboarding_data") || "{}").name || ""; } catch { return ""; }
  })();

  const heroGreeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Morning movement";
    if (h < 17) return "Afternoon session";
    return "Evening workout";
  })();

  return (
    <div className="flex flex-col h-full bg-background">
      <PageHeader title="Workout" />

      <ScrollArea className="flex-1 overflow-auto">
        {/* Atmospheric hero */}
        <div className="relative overflow-hidden bg-gradient-to-b from-primary/8 via-background to-background">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 pointer-events-none" />
          <div className="p-6 max-w-2xl mx-auto flex flex-col items-center text-center gap-4 pt-8">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shadow-lg">
                <Dumbbell className="w-9 h-9 text-primary" />
              </div>
              <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping opacity-20" />
            </div>
            <div>
              <h1 className="text-xl font-display font-semibold text-foreground">
                {heroGreeting}{userName ? `, ${userName}` : ""}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {hasBodyScan
                  ? (bodyProfile?.bodyGoal ? `Goal: ${GOAL_LABELS[bodyProfile.bodyGoal]}` : "Move with intention today.")
                  : "Tell DW about your body to get personalized workouts."}
              </p>
            </div>
            <div className="flex gap-3 flex-wrap justify-center">
              <Button size="sm" onClick={() => setPickWorkoutOpen(true)} data-testid="button-find-workout">
                <Sparkles className="w-4 h-4 mr-1.5" />
                Find My Workout
              </Button>
              <Button size="sm" variant="outline" onClick={() => setBodyScanOpen(true)} data-testid="button-body-scan">
                <User className="w-4 h-4 mr-1.5" />
                {hasBodyScan ? "Update Profile" : "Body Scan"}
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="today" className="max-w-2xl mx-auto w-full px-4 pb-24">
          <TabsList className="w-full grid grid-cols-3 my-4">
            <TabsTrigger value="today" data-testid="tab-today">Today</TabsTrigger>
            <TabsTrigger value="library" data-testid="tab-library">Library</TabsTrigger>
            <TabsTrigger value="plans" data-testid="tab-plans">My Plans</TabsTrigger>
          </TabsList>

          {/* ── Today Tab ───────────────────────────────────── */}
          <TabsContent value="today" className="space-y-4">
            {/* Quick energy check-in */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">How's your energy right now?</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { level: "low" as const, label: "Low", emoji: "🌙", desc: "Rest & restore" },
                  { level: "medium" as const, label: "Medium", emoji: "⚡", desc: "Steady flow" },
                  { level: "high" as const, label: "High", emoji: "🔥", desc: "Push it" },
                ]).map(opt => (
                  <button
                    key={opt.level}
                    onClick={() => setEnergyLevel(energyLevel === opt.level ? null : opt.level)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                      energyLevel === opt.level
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-muted/30 text-muted-foreground hover:border-primary/40"
                    }`}
                    data-testid={`button-energy-${opt.level}`}
                  >
                    <span className="text-xl">{opt.emoji}</span>
                    <span className="text-xs font-semibold">{opt.label}</span>
                    <span className="text-[10px] opacity-70">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {seeksCalmOrMindfulness && (
              <Card className="bg-violet-500/5 border-violet-500/20">
                <CardContent className="p-4 flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-violet-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-sm mb-1">Mindfulness mode active</h4>
                    <p className="text-sm text-muted-foreground">
                      We're prioritizing calming, grounding workouts based on your practices.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {(hasBodyScan || seeksCalmOrMindfulness) && recommendedWorkout ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold text-foreground text-sm">Picked for You</h2>
                </div>
                <Card
                  className={`cursor-pointer transition-all ${selectedPickedWorkout?.title === recommendedWorkout.title ? "ring-2 ring-primary bg-primary/5" : "hover-elevate"}`}
                  data-testid="card-recommended-workout"
                  onClick={() => setSelectedPickedWorkout(
                    selectedPickedWorkout?.title === recommendedWorkout.title ? null : recommendedWorkout
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {selectedPickedWorkout?.title === recommendedWorkout.title && (
                        <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <h3 className="font-medium mb-1 text-foreground">{recommendedWorkout.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{recommendedWorkout.description}</p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />{recommendedWorkout.duration} min
                          </span>
                          <Badge variant="secondary" className="text-xs capitalize">{recommendedWorkout.intensity}</Badge>
                        </div>
                      </div>
                    </div>
                    {recommendedWhy && (
                      <p className="text-xs text-primary/70 mt-2 border-t border-primary/10 pt-2">{recommendedWhy}</p>
                    )}
                  </CardContent>
                </Card>
                {selectedPickedWorkout && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleStartSession(selectedPickedWorkout)}
                      data-testid="button-start-picked"
                    >
                      <Play className="w-4 h-4 mr-1.5" />Start Session
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { handleSaveWorkout(selectedPickedWorkout); setSelectedPickedWorkout(null); }}
                      data-testid="button-save-picked"
                    >
                      Save
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center space-y-4">
                  <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Start with a Body Scan</h3>
                    <p className="text-sm text-muted-foreground">
                      Tell DW your fitness goal, energy level, and focus areas to get personalized recommendations.
                    </p>
                  </div>
                  <Button onClick={() => setBodyScanOpen(true)} data-testid="button-body-scan-cta">
                    <User className="w-4 h-4 mr-2" />Start Body Scan
                  </Button>
                </CardContent>
              </Card>
            )}

            {hasBodyScan && bodyProfile && (
              <Card className="bg-primary/5 border-primary/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Your Profile</span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setBodyScanOpen(true)} data-testid="button-update-profile">
                      <RefreshCw className="w-3 h-3 mr-1" />Update
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {bodyProfile.bodyGoal && (
                      <span className="flex items-center gap-1"><Target className="w-3 h-3" />{GOAL_LABELS[bodyProfile.bodyGoal]}</span>
                    )}
                    {bodyProfile.energyLevel && (
                      <span className="flex items-center gap-1"><Flame className="w-3 h-3" />Energy: {bodyProfile.energyLevel.replace("_", " ")}</span>
                    )}
                    {bodyProfile.focusAreas?.map((a) => (
                      <Badge key={a} variant="secondary" className="text-xs">{a}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex items-center justify-between gap-4 bg-muted/40 p-3 rounded-lg text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Focus: <strong className="text-foreground">
                    {planningHorizon === "today" ? "Today" : planningHorizon === "week" ? "This Week" : "This Month"}
                  </strong>
                </span>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={rotateWorkouts} data-testid="button-rotate-workouts">
                  <Sparkles className="h-3 w-3 mr-1" />Shift
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={showScopeDialog} data-testid="button-change-horizon">
                  Change
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ── Library Tab ─────────────────────────────────── */}
          <TabsContent value="library" className="space-y-4">
            <InAppSearch
              category="workouts"
              placeholder="Search workouts (yoga, strength, cardio...)"
              onResultSave={(result: SearchResult) => {
                const workout: WorkoutData = {
                  title: result.title,
                  description: result.description,
                  duration: parseInt(result.duration?.replace(/\D/g, '') || '0') || 20,
                  intensity: result.tags.find(t => ['gentle', 'moderate', 'intense'].includes(t.toLowerCase())) || 'moderate',
                  tags: result.tags,
                  youtubeSearch: result.title + " workout",
                  steps: result.details || [],
                };
                handleSaveWorkout(workout);
                toast({ title: "Workout saved", description: `${result.title} added to your routines` });
              }}
            />

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => setShowFilters((f) => !f)}
                data-testid="button-toggle-filters"
              >
                <Filter className="w-3.5 h-3.5 mr-1.5" />Filters
              </Button>
              <ExclusionsButton domain="workouts" className="h-8" />
            </div>

            {showFilters && (
              <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-md">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground">Time:</span>
                  {(["any", "10", "20", "30"] as TimeFilter[]).map((t) => (
                    <Button key={t} variant={timeFilter === t ? "default" : "outline"} size="sm" onClick={() => setTimeFilter(t)} data-testid={`button-time-${t}`}>
                      {t === "any" ? "Any" : `${t}min`}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground">Goal:</span>
                  {(["any", "calm", "strength", "cardio"] as GoalFilter[]).map((g) => (
                    <Button key={g} variant={goalFilter === g ? "default" : "outline"} size="sm" onClick={() => setGoalFilter(g)} data-testid={`button-goal-${g}`}>
                      {g === "any" ? "Any" : g.charAt(0).toUpperCase() + g.slice(1)}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground">Equipment:</span>
                  {(["any", "none", "dumbbells"] as EquipmentFilter[]).map((e) => (
                    <Button key={e} variant={equipmentFilter === e ? "default" : "outline"} size="sm" onClick={() => setEquipmentFilter(e)} data-testid={`button-equip-${e}`}>
                      {e === "any" ? "Any" : e === "none" ? "No Equipment" : "Dumbbells"}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {workoutAiMutation.isPending && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  <span className="text-sm">Finding workout ideas...</span>
                </CardContent>
              </Card>
            )}

            {aiWorkoutSuggestion && !workoutAiMutation.isPending && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Ideas for "{workoutSearch}"</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
                    {aiWorkoutSuggestion}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setAiWorkoutSuggestion(null); workoutAiMutation.reset(); }}
                    data-testid="button-dismiss-workout-ai"
                  >
                    <X className="w-3 h-3 mr-1" />Dismiss
                  </Button>
                </CardContent>
              </Card>
            )}

            {filteredWorkouts.length === 0 && !workoutAiMutation.isPending && (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center space-y-3">
                  <Dumbbell className="w-8 h-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No workouts match those filters. Try different options or ask DW for ideas.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setTimeFilter("any"); setGoalFilter("any"); setEquipmentFilter("any"); }}
                  >
                    Clear Filters
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              {filteredWorkouts.map((workout, index) => (
                <Card
                  key={index}
                  ref={(el) => { workoutRefs.current[workout.title] = el; }}
                  className={`transition-all ${highlightedWorkout === workout.title ? "ring-2 ring-primary shadow-md" : "hover-elevate"}`}
                  data-testid={`card-workout-${index}`}
                >
                  <CardContent className="p-4">
                    <div
                      className="flex items-start justify-between gap-3 cursor-pointer"
                      onClick={() => setExpandedWorkout(expandedWorkout === index ? null : index)}
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground truncate">{workout.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{workout.description}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />{workout.duration} min
                          </span>
                          <span className="capitalize">{workout.intensity}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {workout.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <Button
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => { e.stopPropagation(); handleStartSession(workout); }}
                          data-testid={`button-start-session-${index}`}
                        >
                          <Play className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={(e) => { e.stopPropagation(); promptAddToCalendar(workout); }}
                          data-testid={`button-add-today-${index}`}
                        >
                          <Calendar className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {expandedWorkout === index && (
                      <div className="mt-4 pt-4 border-t space-y-4">
                        <div>
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                            Workout Steps
                            <span className="text-xs font-normal text-muted-foreground">(tap for alternatives)</span>
                          </h4>
                          <ol className="space-y-1">
                            {workout.steps.map((step, stepIdx) => (
                              <li
                                key={stepIdx}
                                className="text-sm text-muted-foreground flex items-start gap-2 p-1.5 -ml-1.5 rounded hover-elevate cursor-pointer group"
                                onClick={(e) => { e.stopPropagation(); handleFindAlternatives(step, workout.title); }}
                                data-testid={`step-${index}-${stepIdx}`}
                              >
                                <span className="shrink-0 w-5 text-right">{stepIdx + 1}.</span>
                                <span className="flex-1">{step}</span>
                                <ArrowRightLeft className="w-3.5 h-3.5 opacity-0 group-hover:opacity-70 shrink-0 mt-0.5" />
                              </li>
                            ))}
                          </ol>
                        </div>
                        {workout.equipment && workout.equipment.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">Equipment</h4>
                            <div className="flex flex-wrap gap-1">
                              {workout.equipment.map((item, eqIdx) => (
                                <Badge key={eqIdx} variant="secondary" className="text-xs">{item}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); openYouTubeSearch(workout); }}
                            data-testid={`button-youtube-${index}`}
                          >
                            <ExternalLink className="w-4 h-4 mr-1" />Find on YouTube
                          </Button>
                          <Button
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); handleStartSession(workout); }}
                            data-testid={`button-start-session-expanded-${index}`}
                          >
                            <Play className="w-4 h-4 mr-1" />Start Session
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── My Plans Tab ────────────────────────────────── */}
          <TabsContent value="plans" className="space-y-4">
            {savedWorkoutPlans.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-semibold text-sm flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-primary" />AI Plans
                </h2>
                {savedWorkoutPlans.map((plan) => (
                  <Card
                    key={plan.id}
                    className="hover-elevate cursor-pointer"
                    onClick={() => { setSelectedPlan(plan); setShowPlanDetails(true); }}
                  >
                    <CardContent className="p-4">
                      <h4 className="font-medium text-sm mb-1">{plan.title}</h4>
                      <p className="text-xs text-muted-foreground mb-2">{plan.summary}</p>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">{plan.daysPerWeek} days/week</Badge>
                        {plan.equipment.map((eq) => (
                          <Badge key={eq} variant="secondary" className="text-xs">{eq.replace('-', ' ')}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {savedWorkouts.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-semibold text-sm flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />Saved Workouts
                </h2>
                {savedWorkouts.map((workout, index) => (
                  <Card key={workout.id || index} className="hover-elevate">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-sm">{workout.title}</h4>
                          <p className="text-xs text-muted-foreground">{workout.description}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleStartSession({ title: workout.title, description: workout.description, duration: (workout.data as any)?.duration || 20, intensity: (workout.data as any)?.intensity || "moderate", tags: workout.tags || [], youtubeSearch: workout.title + " workout", steps: (workout.data as any)?.steps || [] })}
                          data-testid={`button-start-saved-${index}`}
                        >
                          <Play className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />My Resources
                </h2>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-8" onClick={() => setResourceDialogOpen(true)} data-testid="button-add-resource">
                    <Plus className="w-3.5 h-3.5 mr-1" />Add
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8" onClick={() => setDocumentImportOpen(true)} data-testid="button-import-document">
                    <FileText className="w-3.5 h-3.5 mr-1" />Import
                  </Button>
                </div>
              </div>
              {userResources.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center space-y-2">
                    <FileText className="w-8 h-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No resources yet. Add links or import a plan.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {userResources.map((resource) => (
                    <Card key={resource.id} className="hover-elevate" data-testid={`card-resource-${resource.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                              {resource.variant === "link"
                                ? <Link2 className="w-4 h-4 text-muted-foreground" />
                                : <FileText className="w-4 h-4 text-muted-foreground" />}
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
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            {resource.variant === "link" && resource.url && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => window.open(resource.url, "_blank")}
                                data-testid={`button-open-resource-${resource.id}`}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                deleteUserResource(resource.id);
                                setUserResources(getUserResourcesByType("workout"));
                                toast({ title: "Resource removed" });
                              }}
                              data-testid={`button-delete-resource-${resource.id}`}
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

            {savedWorkoutPlans.length === 0 && savedWorkouts.length === 0 && userResources.length === 0 && (
              <Card className="border-dashed bg-primary/5 border-primary/20">
                <CardContent className="p-6 text-center space-y-3">
                  <Wand2 className="w-10 h-10 mx-auto text-primary/50" />
                  <div>
                    <h3 className="font-semibold text-sm">No plans yet</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Ask DW to create a personalized workout plan, or save workouts from the Library tab.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recovery surfacing */}
            <Card className="bg-purple-500/5 border-purple-500/20 cursor-pointer hover:shadow-md transition-all" onClick={() => setLocation("/recovery")}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                  <Heart className="w-5 h-5 text-purple-500" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">Recovery & Rest</p>
                  <p className="text-xs text-muted-foreground">Stretching, foam rolling, and rest protocols to support your training</p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ── Dialogs ─────────────────────────────────────── */}
        <PlanningScopeDialog {...PlanningScopeDialogProps} />

        <AlternativesDialog
          open={alternativesOpen}
          onOpenChange={setAlternativesOpen}
          domain="workouts"
          item={selectedExercise}
          context={selectedExerciseContext}
        />

        <ResourceFormDialog
          open={resourceDialogOpen}
          onOpenChange={setResourceDialogOpen}
          resourceType="workout"
          onSaved={() => {
            setUserResources(getUserResourcesByType("workout"));
            toast({ title: "Resource saved" });
          }}
        />

        <DocumentImportFlow
          open={documentImportOpen}
          onClose={() => setDocumentImportOpen(false)}
          context="workout"
          onComplete={() => {
            setUserResources(getUserResourcesByType("workout"));
            toast({ title: "Items imported to your workout library" });
          }}
        />

        <BodyScanDialog open={bodyScanOpen} onClose={() => setBodyScanOpen(false)} onComplete={handleBodyScanComplete} />

        <Dialog open={confirmAddOpen} onOpenChange={setConfirmAddOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Add to Today?</DialogTitle>
              <DialogDescription>Schedule "{pendingWorkout?.title}" on your calendar for today.</DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmAddOpen(false)}>Cancel</Button>
              <Button
                className="flex-1"
                onClick={confirmAddToCalendar}
                disabled={addToCalendarMutation.isPending}
                data-testid="button-confirm-add"
              >
                {addToCalendarMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add to Orbit"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!selectedWorkout} onOpenChange={() => setSelectedWorkout(null)}>
          <DialogContent className="max-w-md">
            {selectedWorkout && (
              <>
                <DialogHeader>
                  <DialogTitle>{selectedWorkout.title}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">{selectedWorkout.description}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{selectedWorkout.duration} min</span>
                    <Badge variant="secondary">{selectedWorkout.intensity}</Badge>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Steps</h4>
                    <ol className="space-y-1 list-decimal list-inside">
                      {selectedWorkout.steps.map((step, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground">{step}</li>
                      ))}
                    </ol>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => openYouTubeSearch(selectedWorkout)} className="flex-1">
                      <Play className="w-4 h-4 mr-2" />Find Videos
                    </Button>
                    <Button variant="outline" onClick={() => { promptAddToCalendar(selectedWorkout); setSelectedWorkout(null); }}>
                      <Calendar className="w-4 h-4 mr-1" />Add to Orbit
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={pickWorkoutOpen} onOpenChange={setPickWorkoutOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {pickStep === "energy" && "How's your energy right now?"}
                {pickStep === "time" && "How much time do you have?"}
                {pickStep === "results" && "Here are some options for you"}
              </DialogTitle>
              <DialogDescription>
                {pickStep === "energy" && "This helps me suggest the right intensity"}
                {pickStep === "time" && "No pressure — even 10 minutes counts"}
                {pickStep === "results" && "Pick one that feels right"}
              </DialogDescription>
            </DialogHeader>
            {pickStep === "energy" && (
              <div className="grid grid-cols-3 gap-3 py-4">
                {([
                  { level: "low" as const, label: "Low", desc: "Need gentle" },
                  { level: "medium" as const, label: "Medium", desc: "Feeling okay" },
                  { level: "high" as const, label: "High", desc: "Ready to go" },
                ]).map((option) => (
                  <Button
                    key={option.level}
                    variant={energyLevel === option.level ? "default" : "outline"}
                    className="h-auto py-4 flex flex-col gap-1"
                    onClick={() => { setEnergyLevel(option.level); setPickStep("time"); }}
                    data-testid={`button-energy-${option.level}`}
                  >
                    <span className="font-medium text-foreground">{option.label}</span>
                    <span className="text-xs opacity-70">{option.desc}</span>
                  </Button>
                ))}
              </div>
            )}
            {pickStep === "time" && (
              <div className="grid grid-cols-3 gap-3 py-4">
                {([
                  { time: "10" as const, label: "10 min" },
                  { time: "20" as const, label: "20 min" },
                  { time: "30" as const, label: "30+ min" },
                ]).map((option) => (
                  <Button
                    key={option.time}
                    variant={timeAvailable === option.time ? "default" : "outline"}
                    className="h-auto py-4"
                    onClick={() => { setTimeAvailable(option.time); setPickStep("results"); }}
                    data-testid={`button-time-pick-${option.time}`}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            )}
            {pickStep === "results" && (
              <div className="space-y-3 py-4">
                {getAISuggestions().map((workout, idx) => (
                  <Card
                    key={idx}
                    className="hover-elevate cursor-pointer"
                    onClick={() => { setSelectedWorkout(workout); setPickWorkoutOpen(false); }}
                    data-testid={`card-ai-suggestion-${idx}`}
                  >
                    <CardContent className="p-4">
                      <h4 className="font-medium text-sm">{workout.title}</h4>
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">{workout.duration} min</span>
                        <Badge variant="secondary" className="text-xs capitalize">{workout.intensity}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={showPlanDetails} onOpenChange={setShowPlanDetails}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedPlan?.title}</DialogTitle>
              <DialogDescription>{selectedPlan?.summary}</DialogDescription>
            </DialogHeader>
            {selectedPlan && (
              <div className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline">{selectedPlan.daysPerWeek} days/week</Badge>
                  <Badge variant="secondary">{selectedPlan.goal}</Badge>
                  {selectedPlan.equipment.map((eq) => (
                    <Badge key={eq} variant="outline" className="text-xs">{eq.replace('-', ' ')}</Badge>
                  ))}
                </div>
                {selectedPlan.days.map((day, idx) => (
                  <Card key={idx}>
                    <CardHeader>
                      <CardTitle className="text-sm">{day.dayOfWeek} — {day.focus}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {day.isRestDay ? (
                        <p className="text-sm text-muted-foreground">Rest Day — Recovery</p>
                      ) : (
                        day.exercises.map((exercise, exIdx) => (
                          <div
                            key={exIdx}
                            className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => setSelectedExerciseAnimation(exercise.animationId)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h5 className="font-medium text-sm">{exercise.name}</h5>
                                <p className="text-xs text-muted-foreground">
                                  {exercise.sets && `${exercise.sets} sets × `}
                                  {exercise.reps || exercise.duration}
                                  {exercise.restSeconds && ` • ${exercise.restSeconds}s rest`}
                                </p>
                              </div>
                              <Button variant="ghost" size="sm"><Play className="h-4 w-4" /></Button>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={!!selectedExerciseAnimation} onOpenChange={() => setSelectedExerciseAnimation(null)}>
          <DialogContent className="max-w-lg">
            {selectedExerciseAnimation && (
              <ExerciseAnimation exerciseId={selectedExerciseAnimation} onClose={() => setSelectedExerciseAnimation(null)} />
            )}
          </DialogContent>
        </Dialog>

        {activeSessionConfig && (
          <WorkoutSessionEngine
            config={activeSessionConfig}
            open={sessionEngineOpen}
            onClose={() => setSessionEngineOpen(false)}
            isAuthenticated={isAuthenticated}
          />
        )}
      </ScrollArea>
    </div>
  );
}
