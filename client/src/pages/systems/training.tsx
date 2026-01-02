import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Dumbbell, 
  ChevronLeft,
  Clock,
  Flame,
  Heart,
  Zap,
  Target,
  Play,
  Pause,
  RotateCcw
} from "lucide-react";
import { useLocation } from "wouter";
import { getWorkoutPreferences } from "@/lib/guest-storage";

interface WorkoutType {
  id: string;
  name: string;
  description: string;
  duration: string;
  intensity: string;
  icon: typeof Dumbbell;
  exercises: string[];
}

const WORKOUT_TYPES: WorkoutType[] = [
  {
    id: "strength",
    name: "Strength Training",
    description: "Build muscle and increase power",
    duration: "45-60 min",
    intensity: "Moderate to High",
    icon: Dumbbell,
    exercises: ["Squats", "Deadlifts", "Bench Press", "Rows", "Overhead Press"]
  },
  {
    id: "cardio",
    name: "Cardio Session",
    description: "Improve endurance and heart health",
    duration: "30-45 min",
    intensity: "Moderate",
    icon: Heart,
    exercises: ["Running", "Cycling", "Jump Rope", "Rowing", "Swimming"]
  },
  {
    id: "hiit",
    name: "HIIT Circuit",
    description: "High intensity interval training",
    duration: "20-30 min",
    intensity: "High",
    icon: Zap,
    exercises: ["Burpees", "Mountain Climbers", "Jump Squats", "Push-ups", "Sprints"]
  },
  {
    id: "mobility",
    name: "Mobility & Recovery",
    description: "Stretch and restore your body",
    duration: "20-30 min",
    intensity: "Low",
    icon: Target,
    exercises: ["Hip Openers", "Shoulder Mobility", "Spine Twists", "Foam Rolling", "Deep Stretches"]
  },
];

export default function TrainingSystemPage() {
  const [, setLocation] = useLocation();
  const workoutPrefs = getWorkoutPreferences();
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutType | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);

  const handleStartWorkout = (workout: WorkoutType) => {
    setSelectedWorkout(workout);
    setCurrentExerciseIndex(0);
    setIsActive(true);
  };

  const handleNextExercise = () => {
    if (selectedWorkout && currentExerciseIndex < selectedWorkout.exercises.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
    } else {
      setIsActive(false);
      setSelectedWorkout(null);
    }
  };

  const handleReset = () => {
    setIsActive(false);
    setSelectedWorkout(null);
    setCurrentExerciseIndex(0);
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/systems")}
            data-testid="button-back"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-display font-bold">Movement Practice</h1>
            <p className="text-muted-foreground">
              Exercise routines and recovery
            </p>
          </div>
        </div>

        {workoutPrefs && (
          <Card className="bg-blue-500/5 border-blue-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <Flame className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">
                  {workoutPrefs.frequencyPerWeek}x per week goal
                </p>
                <p className="text-xs text-muted-foreground">
                  {workoutPrefs.sessionLengthMinutes} min sessions, {workoutPrefs.intensity || "moderate"} intensity
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedWorkout && isActive ? (
          <div className="space-y-4">
            <Card className="bg-primary/10 border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <selectedWorkout.icon className="w-5 h-5" />
                  {selectedWorkout.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-2">
                    Exercise {currentExerciseIndex + 1} of {selectedWorkout.exercises.length}
                  </p>
                  <h2 className="text-3xl font-bold mb-4">
                    {selectedWorkout.exercises[currentExerciseIndex]}
                  </h2>
                  <div className="flex justify-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleReset}
                      data-testid="button-reset"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={handleNextExercise}
                      data-testid="button-next"
                    >
                      {currentExerciseIndex < selectedWorkout.exercises.length - 1 
                        ? "Next Exercise" 
                        : "Complete Workout"}
                    </Button>
                  </div>
                </div>
                <div className="flex gap-1">
                  {selectedWorkout.exercises.map((_, idx) => (
                    <div 
                      key={idx}
                      className={`h-1 flex-1 rounded-full ${
                        idx <= currentExerciseIndex ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Choose Your Workout
            </h2>
            <div className="space-y-2">
              {WORKOUT_TYPES.map((workout) => {
                const Icon = workout.icon;
                
                return (
                  <Card 
                    key={workout.id}
                    className="hover-elevate cursor-pointer"
                    onClick={() => handleStartWorkout(workout)}
                    data-testid={`card-workout-${workout.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <Icon className="w-6 h-6 text-blue-500" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium">{workout.name}</h3>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {workout.description}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              <Clock className="w-3 h-3 mr-1" />
                              {workout.duration}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              <Flame className="w-3 h-3 mr-1" />
                              {workout.intensity}
                            </Badge>
                          </div>
                        </div>
                        <Button size="icon" variant="ghost">
                          <Play className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Recovery Tips
          </h2>
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Heart className="w-4 h-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-sm font-medium">Cool Down</p>
                  <p className="text-xs text-muted-foreground">
                    Take 5-10 minutes to gradually lower your heart rate
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Target className="w-4 h-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-sm font-medium">Stretch</p>
                  <p className="text-xs text-muted-foreground">
                    Focus on the muscle groups you worked
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ScrollArea>
  );
}
