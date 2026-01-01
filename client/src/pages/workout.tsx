import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Dumbbell, 
  User, 
  Target, 
  Play, 
  Clock, 
  Flame,
  ChevronRight,
  Sparkles,
  RefreshCw
} from "lucide-react";
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
  type BodyProfile,
  type WorkoutPreferences,
  type SavedRoutine
} from "@/lib/guest-storage";

const GOAL_LABELS: Record<string, string> = {
  slim_fit: "Slim & Fit",
  build_muscle: "Build Muscle",
  tone: "Tone Up",
  maintain: "Maintain",
  endurance: "Endurance",
  custom: "Custom Goal",
};

const SAMPLE_WORKOUTS = [
  {
    title: "Morning Energy Boost",
    description: "Quick full-body workout to start your day",
    duration: 15,
    intensity: "gentle",
    tags: ["full-body", "energizing", "no-equipment"],
  },
  {
    title: "Core Strength Builder",
    description: "Focus on core stability and strength",
    duration: 20,
    intensity: "steady",
    tags: ["core", "strength", "beginner-friendly"],
  },
  {
    title: "Upper Body Focus",
    description: "Build strength in arms, chest, and back",
    duration: 30,
    intensity: "focused",
    tags: ["upper-body", "strength", "dumbbells"],
  },
  {
    title: "Lower Body Power",
    description: "Legs, glutes, and lower body conditioning",
    duration: 25,
    intensity: "focused",
    tags: ["lower-body", "strength", "toning"],
  },
  {
    title: "Cardio & Endurance",
    description: "Heart-pumping cardio session",
    duration: 20,
    intensity: "athlete",
    tags: ["cardio", "endurance", "high-energy"],
  },
  {
    title: "Mindful Yoga Flow",
    description: "Gentle yoga for grounding and calm",
    duration: 25,
    intensity: "gentle",
    tags: ["yoga", "mindfulness", "flexibility", "calm"],
  },
];

export default function WorkoutPage() {
  const [bodyScanOpen, setBodyScanOpen] = useState(false);
  const [bodyProfile, setBodyProfile] = useState<BodyProfile | null>(getBodyProfile());
  const [savedWorkouts, setSavedWorkouts] = useState<SavedRoutine[]>(getSavedRoutinesByType("workout"));
  const [hasBodyScan, setHasBodyScan] = useState(hasCompletedBodyScan());
  const spiritualProfile = getSpiritualProfile();
  const signals = getDimensionSignals();
  const seeksCalmOrMindfulness = signals.mindfulState === "calm" || 
    spiritualProfile?.practices?.includes("yoga") || 
    spiritualProfile?.practices?.includes("meditation");

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

  const getPersonalizedRecommendation = () => {
    if (seeksCalmOrMindfulness) {
      return SAMPLE_WORKOUTS.find(w => w.tags.includes("yoga"));
    }
    
    if (!bodyProfile?.bodyGoal) return null;
    
    const goal = bodyProfile.bodyGoal;
    if (goal === "slim_fit" || goal === "endurance") {
      return SAMPLE_WORKOUTS.find(w => w.tags.includes("cardio"));
    }
    if (goal === "build_muscle") {
      return SAMPLE_WORKOUTS.find(w => w.tags.includes("strength"));
    }
    if (goal === "tone") {
      return SAMPLE_WORKOUTS.find(w => w.tags.includes("toning") || w.tags.includes("core"));
    }
    return SAMPLE_WORKOUTS[0];
  };

  const recommendedWorkout = getPersonalizedRecommendation();

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Workout</h1>
          <p className="text-muted-foreground">
            Personalized workouts based on your body goals
          </p>
        </div>

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
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h2 className="font-semibold">Recommended for You</h2>
            </div>
            <Card className="hover-elevate cursor-pointer" data-testid="card-recommended-workout">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
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
                  </div>
                  <Button size="icon" data-testid="button-play-recommended">
                    <Play className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Dumbbell className="w-4 h-4" />
            Browse Workouts
          </h2>
          <div className="space-y-2">
            {SAMPLE_WORKOUTS.map((workout, index) => (
              <Card 
                key={index} 
                className="hover-elevate cursor-pointer"
                data-testid={`card-workout-${index}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="font-medium mb-1">{workout.title}</h3>
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
                          handleSaveWorkout(workout);
                        }}
                        data-testid={`button-save-workout-${index}`}
                      >
                        Save
                      </Button>
                      <Button size="icon" data-testid={`button-play-workout-${index}`}>
                        <Play className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <BodyScanDialog
          open={bodyScanOpen}
          onClose={() => setBodyScanOpen(false)}
          onComplete={handleBodyScanComplete}
        />
      </div>
    </ScrollArea>
  );
}
