import { useState, useRef, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageHeader } from "@/components/page-header";
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
  
  const { toast } = useToast();
  
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

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Workout" />
      
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
                <p className="text-xs text-muted-foreground">Focusing your training scope supports steady progress.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={rotateWorkouts} data-testid="button-rotate-workouts">
                <Sparkles className="h-3 w-3 mr-1.5" />
                Shift Energy
              </Button>
              <Button size="sm" className="h-8 text-xs" onClick={showScopeDialog} data-testid="button-change-horizon">
                Change Horizon
              </Button>
            </div>
          </section>

          {seeksCalmOrMindfulness && (
          <Card className="bg-violet-500/5 border-violet-500/20">
            <CardContent className="p-4 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-violet-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-sm mb-1">Mindfulness mode active</h4>
                <p className="text-sm text-muted-foreground">
                  Based on your spiritual practices, we're suggesting calming, grounding workouts.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {!hasBodyScan ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Start with a Body Scan</h3>
                <p className="text-sm text-muted-foreground">
                  Tell us about your body and goals so we can personalize your workouts
                </p>
              </div>
              <Button onClick={() => setBodyScanOpen(true)} data-testid="button-start-body-scan">
                <Target className="w-4 h-4 mr-2" />
                Begin Body Scan
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">Your Profile</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setBodyScanOpen(true)}
                  data-testid="button-update-body-scan"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Update
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {bodyProfile?.bodyGoal && (
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Goal: {GOAL_LABELS[bodyProfile.bodyGoal]}</span>
                </div>
              )}
              {bodyProfile?.focusAreas && bodyProfile.focusAreas.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {bodyProfile.focusAreas.map((area) => (
                    <Badge key={area} variant="secondary" className="text-xs">
                      {area}
                    </Badge>
                  ))}
                </div>
              )}
              {bodyProfile?.energyLevel && (
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm capitalize">Energy: {bodyProfile.energyLevel.replace("_", " ")}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {(hasBodyScan || seeksCalmOrMindfulness) && recommendedWorkout && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h2 className="font-semibold">Picked for You</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedPickedWorkout ? "Tap Save to add this workout" : "Pick 1 option to save."}
            </p>
            <Card 
              className={`cursor-pointer transition-all ${selectedPickedWorkout?.title === recommendedWorkout.title ? "ring-2 ring-primary bg-primary/5" : "hover-elevate"}`}
              data-testid="card-recommended-workout"
              onClick={() => setSelectedPickedWorkout(selectedPickedWorkout?.title === recommendedWorkout.title ? null : recommendedWorkout)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {selectedPickedWorkout?.title === recommendedWorkout.title && (
                    <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-medium mb-1">{recommendedWorkout.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      {recommendedWorkout.description}
                    </p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {recommendedWorkout.duration} min
                      </span>
                      <span className="capitalize">{recommendedWorkout.intensity}</span>
                    </div>
                    {recommendedWhy && (
                      <p className="text-xs text-primary mt-2 italic">{recommendedWhy}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                disabled={!selectedPickedWorkout}
                onClick={() => {
                  if (selectedPickedWorkout) {
                    handleSaveWorkout(selectedPickedWorkout);
                    toast({
                      title: "Added to your system.",
                      description: `"${selectedPickedWorkout.title}" added. Notice how this matches your current energy.`,
                    });
                    setSelectedPickedWorkout(null);
                  }
                }}
                data-testid="button-save-picked-workout"
              >
                <Check className="w-4 h-4 mr-1" />
                Save
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                disabled={!selectedPickedWorkout}
                onClick={() => {
                  if (selectedPickedWorkout) {
                    promptAddToCalendar(selectedPickedWorkout);
                  }
                }}
                data-testid="button-calendar-picked-workout"
              >
                <Calendar className="w-4 h-4 mr-1" />
                Add to Calendar
              </Button>
            </div>
          </section>
        )}

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Pick my workout</h3>
                  <p className="text-sm text-muted-foreground">
                    Let me suggest something based on how you feel
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => {
                  setPickStep("energy");
                  setEnergyLevel(null);
                  setTimeAvailable(null);
                  setPickWorkoutOpen(true);
                }}
                data-testid="button-pick-workout"
              >
                Start
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold flex items-center gap-2">
              <Dumbbell className="w-4 h-4" />
              Browse Workouts
            </h2>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              data-testid="button-toggle-filters"
            >
              <Filter className="w-4 h-4 mr-1" />
              Filters
            </Button>
          </div>

          {/* Search input with AI help and online search */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search workouts (yoga, strength, cardio...)"
                value={workoutSearch}
                onChange={(e) => {
                  setWorkoutSearch(e.target.value);
                  setAiWorkoutSuggestion(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && workoutSearch.trim()) {
                    workoutAiMutation.reset();
                    workoutAiMutation.mutate(workoutSearch.trim());
                  }
                }}
                className="pl-10"
                data-testid="input-workout-search"
              />
              {workoutSearch && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={() => {
                    setWorkoutSearch("");
                    setAiWorkoutSuggestion(null);
                    workoutAiMutation.reset();
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => {
                const query = workoutSearch.trim() || "workout";
                window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(query + " workout")}`, "_blank");
              }}
              data-testid="button-online-search-workout"
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Online
            </Button>
          </div>
          
          {showFilters && (
            <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-md">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Time:</span>
                {(["any", "10", "20", "30"] as TimeFilter[]).map((t) => (
                  <Button
                    key={t}
                    variant={timeFilter === t ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimeFilter(t)}
                    data-testid={`button-time-${t}`}
                  >
                    {t === "any" ? "Any" : `${t}min`}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Goal:</span>
                {(["any", "calm", "strength", "cardio"] as GoalFilter[]).map((g) => (
                  <Button
                    key={g}
                    variant={goalFilter === g ? "default" : "outline"}
                    size="sm"
                    onClick={() => setGoalFilter(g)}
                    data-testid={`button-goal-${g}`}
                  >
                    {g === "any" ? "Any" : g.charAt(0).toUpperCase() + g.slice(1)}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Equipment:</span>
                {(["any", "none", "dumbbells"] as EquipmentFilter[]).map((e) => (
                  <Button
                    key={e}
                    variant={equipmentFilter === e ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEquipmentFilter(e)}
                    data-testid={`button-equip-${e}`}
                  >
                    {e === "any" ? "Any" : e === "none" ? "No Equipment" : "Dumbbells"}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* AI Workout Suggestions - inline help */}
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
                  onClick={() => {
                    setAiWorkoutSuggestion(null);
                    workoutAiMutation.reset();
                  }}
                  data-testid="button-dismiss-workout-ai"
                >
                  <X className="w-3 h-3 mr-1" />
                  Dismiss
                </Button>
              </CardContent>
            </Card>
          )}

          {/* No results prompt */}
          {workoutSearch.trim() && filteredWorkouts.length === 0 && !aiWorkoutSuggestion && !workoutAiMutation.isPending && (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center space-y-3">
                <Search className="w-8 h-8 mx-auto text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No matches for "{workoutSearch}"
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    workoutAiMutation.reset();
                    workoutAiMutation.mutate(workoutSearch.trim());
                  }}
                  data-testid="button-ask-ai-workout"
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  Get suggestions
                </Button>
              </CardContent>
            </Card>
          )}
          
          <div className="space-y-2">
            {filteredWorkouts.map((workout, index) => (
              <Card 
                key={index}
                ref={(el) => { workoutRefs.current[workout.title] = el; }}
                className={`hover-elevate cursor-pointer transition-all duration-300 ${highlightedWorkout === workout.title ? "ring-2 ring-primary ring-offset-2" : ""}`}
                data-testid={`card-workout-${index}`}
                onClick={() => setExpandedWorkout(expandedWorkout === index ? null : index)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{workout.title}</h3>
                        {expandedWorkout === index ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {workout.description}
                      </p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {workout.duration} min
                        </span>
                        <span className="capitalize">{workout.intensity}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          promptAddToCalendar(workout);
                        }}
                        data-testid={`button-add-today-${index}`}
                      >
                        <Calendar className="w-3.5 h-3.5 mr-1" />
                        Add to Today
                      </Button>
                      <Button 
                        size="icon" 
                        data-testid={`button-play-workout-${index}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          openYouTubeSearch(workout);
                        }}
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {expandedWorkout === index && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Workout Steps</h4>
                        <ol className="space-y-1 list-decimal list-inside">
                          {workout.steps.map((step, stepIdx) => (
                            <li key={stepIdx} className="text-sm text-muted-foreground">
                              {step}
                            </li>
                          ))}
                        </ol>
                      </div>
                      
                      {workout.equipment && workout.equipment.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Equipment Needed</h4>
                          <div className="flex flex-wrap gap-1">
                            {workout.equipment.map((item, eqIdx) => (
                              <Badge key={eqIdx} variant="secondary" className="text-xs">
                                {item}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {workout.tips && workout.tips.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Tips</h4>
                          <ul className="space-y-1">
                            {workout.tips.map((tip, tipIdx) => (
                              <li key={tipIdx} className="text-sm text-muted-foreground flex items-start gap-2">
                                <Sparkles className="w-3 h-3 text-primary mt-1 shrink-0" />
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      <div className="flex gap-2 pt-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openYouTubeSearch(workout);
                          }}
                          data-testid={`button-youtube-${index}`}
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Find on YouTube
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

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
                data-testid="button-import-document"
              >
                <Sparkles className="w-4 h-4 mr-1" />
                Import
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setResourceDialogOpen(true)}
                data-testid="button-add-resource"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
          </div>
          
          {userResources.length === 0 ? (
            <Card>
              <CardContent className="p-4 text-center text-muted-foreground">
                <p className="text-sm">Save your own workout plans, links, or documents here.</p>
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

        <BodyScanDialog
          open={bodyScanOpen}
          onClose={() => setBodyScanOpen(false)}
          onComplete={handleBodyScanComplete}
        />
        
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
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {selectedWorkout.duration} min
                    </span>
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
                      <Play className="w-4 h-4 mr-2" />
                      Find Videos
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        promptAddToCalendar(selectedWorkout);
                        setSelectedWorkout(null);
                      }}
                    >
                      <Calendar className="w-4 h-4 mr-1" />
                      Add to Today
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
                {pickStep === "time" && "No pressure - even 10 minutes counts"}
                {pickStep === "results" && "Pick one that feels right, or ask for different options"}
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
                    onClick={() => {
                      setEnergyLevel(option.level);
                      setPickStep("time");
                    }}
                    data-testid={`button-energy-${option.level}`}
                  >
                    <span className="font-medium">{option.label}</span>
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
                    onClick={() => {
                      setTimeAvailable(option.time);
                      setPickStep("results");
                    }}
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
                    onClick={() => {
                      setSelectedWorkout(workout);
                      setPickWorkoutOpen(false);
                    }}
                    data-testid={`card-ai-suggestion-${idx}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h4 className="font-medium">{workout.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {workout.duration} min - {workout.intensity}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              promptAddToCalendar(workout);
                            }}
                            data-testid={`button-add-suggestion-${idx}`}
                          >
                            Add to Today
                          </Button>
                          <Button
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              openYouTubeSearch(workout);
                            }}
                            data-testid={`button-start-suggestion-${idx}`}
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                <Button 
                  variant="ghost" 
                  className="w-full"
                  onClick={() => {
                    setPickStep("energy");
                    setEnergyLevel(null);
                    setTimeAvailable(null);
                  }}
                  data-testid="button-different-options"
                >
                  Different options
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={confirmAddOpen} onOpenChange={setConfirmAddOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Add to schedule</DialogTitle>
              <DialogDescription>
                {pendingWorkout?.title} - {pendingWorkout?.duration} minutes
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <p className="text-sm text-muted-foreground">
                Choose where to add this workout:
              </p>
              <div className="flex flex-col gap-2">
                <Button onClick={confirmAddToCalendar} data-testid="button-add-today">
                  <Calendar className="w-4 h-4 mr-2" />
                  Add to Today
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setConfirmAddOpen(false);
                    setLocation("/calendar");
                  }}
                  data-testid="button-add-week"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Add to Week
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setConfirmAddOpen(false);
                    setLocation("/routines");
                  }}
                  data-testid="button-add-routine"
                >
                  <History className="w-4 h-4 mr-2" />
                  Add to Routine
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setConfirmAddOpen(false);
                    setPendingWorkout(null);
                  }}
                  data-testid="button-not-now"
                >
                  Not Now
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <PlanningScopeDialog {...PlanningScopeDialogProps} />
      </div>
    </ScrollArea>
    </div>
  );
}
