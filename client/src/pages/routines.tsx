import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/hooks/use-toast";
import { 
  Dumbbell, 
  Utensils, 
  Wind,
  Play, 
  Trash2,
  FolderOpen,
  Wallet,
  Sparkles,
  Sun,
  Moon,
  Coffee,
  Briefcase
} from "lucide-react";
import { 
  getSavedRoutinesByType,
  deleteRoutine,
  updateRoutineLastUsed,
  getGettingToKnowYou,
  type SavedRoutine,
  type RoutineType
} from "@/lib/guest-storage";
import { useLocation, useSearch } from "wouter";
import { useTutorialStart } from "@/contexts/tutorial-context";

const TYPE_ICONS: Record<RoutineType, typeof Dumbbell> = {
  workout: Dumbbell,
  meal_plan: Utensils,
  meditation: Wind,
  budget_plan: Wallet,
  spiritual_practice: Sparkles,
};

const TYPE_LABELS: Record<RoutineType, string> = {
  workout: "Workouts",
  meal_plan: "Meal Plans",
  meditation: "Meditations",
  budget_plan: "Budget Tools",
  spiritual_practice: "Spiritual Practices",
};

const SUGGESTED_ROUTINES = [
  {
    id: "morning",
    title: "Morning Routine",
    icon: Sun,
    description: "Start your day with intention",
    defaultSteps: ["Wake up gently", "Hydrate with water", "5-min stretch", "Set daily intention", "Light breakfast"],
    personalizable: true,
  },
  {
    id: "work",
    title: "Work Routine",
    icon: Briefcase,
    description: "Stay focused and productive",
    defaultSteps: ["Clear workspace", "Review priorities", "Deep work block", "Short break every 90 min", "End-of-day review"],
    personalizable: true,
  },
  {
    id: "lunch",
    title: "Lunch Routine",
    icon: Coffee,
    description: "Recharge midday",
    defaultSteps: ["Step away from work", "Mindful eating", "Brief walk", "Quick reset meditation"],
    personalizable: true,
  },
  {
    id: "evening",
    title: "Evening Routine",
    icon: Moon,
    description: "Wind down peacefully",
    defaultSteps: ["Limit screens 1hr before bed", "Light stretching", "Gratitude reflection", "Prepare for tomorrow", "Relaxing activity"],
    personalizable: true,
  },
];

export default function RoutinesPage() {
  useTutorialStart("routines", 1000);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const selectedRoutineParam = searchParams.get("selected");
  
  const [workouts, setWorkouts] = useState<SavedRoutine[]>(getSavedRoutinesByType("workout"));
  const [mealPlans, setMealPlans] = useState<SavedRoutine[]>(getSavedRoutinesByType("meal_plan"));
  const [meditations, setMeditations] = useState<SavedRoutine[]>(getSavedRoutinesByType("meditation"));
  const [budgetPlans, setBudgetPlans] = useState<SavedRoutine[]>(getSavedRoutinesByType("budget_plan"));
  const [spiritualPractices, setSpiritualPractices] = useState<SavedRoutine[]>(getSavedRoutinesByType("spiritual_practice"));
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const highlightedRef = useRef<HTMLDivElement>(null);
  const gtky = getGettingToKnowYou();

  useEffect(() => {
    if (selectedRoutineParam) {
      const decodedId = decodeURIComponent(selectedRoutineParam);
      setHighlightedId(decodedId);
      
      setTimeout(() => {
        highlightedRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      
      toast({
        title: "Routine highlighted",
        description: "Scrolled to your selected routine.",
      });
      
      setTimeout(() => setHighlightedId(null), 5000);
    }
  }, [selectedRoutineParam, toast]);

  const handleDelete = (type: RoutineType, id: string) => {
    deleteRoutine(id);
    if (type === "workout") setWorkouts(workouts.filter(r => r.id !== id));
    if (type === "meal_plan") setMealPlans(mealPlans.filter(r => r.id !== id));
    if (type === "meditation") setMeditations(meditations.filter(r => r.id !== id));
    if (type === "budget_plan") setBudgetPlans(budgetPlans.filter(r => r.id !== id));
    if (type === "spiritual_practice") setSpiritualPractices(spiritualPractices.filter(r => r.id !== id));
  };

  const handleUse = (routine: SavedRoutine) => {
    updateRoutineLastUsed(routine.id);
  };

  const renderRoutineList = (routines: SavedRoutine[], type: RoutineType, browseLink: string) => {
    const Icon = TYPE_ICONS[type];

    if (routines.length === 0) {
      return (
        <div className="text-center py-12 space-y-4">
          <div className="w-12 h-12 mx-auto bg-muted rounded-full flex items-center justify-center">
            <FolderOpen className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-muted-foreground mb-2">No saved {TYPE_LABELS[type].toLowerCase()} yet</p>
            <Button variant="outline" onClick={() => setLocation(browseLink)} data-testid={`button-browse-${type}`}>
              Browse {TYPE_LABELS[type]}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {routines.map((routine) => {
          const isHighlighted = highlightedId === routine.id;
          return (
          <Card 
            key={routine.id} 
            ref={isHighlighted ? highlightedRef : undefined}
            className={`hover-elevate transition-all duration-300 ${isHighlighted ? 'ring-2 ring-primary shadow-lg' : ''}`} 
            data-testid={`card-routine-${routine.id}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${isHighlighted ? 'bg-primary text-primary-foreground' : 'bg-primary/10'}`}>
                    <Icon className={`w-5 h-5 ${isHighlighted ? '' : 'text-primary'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{routine.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {routine.description}
                    </p>
                    {routine.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {routine.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="icon" 
                    variant="ghost"
                    onClick={() => handleDelete(type, routine.id)}
                    data-testid={`button-delete-${routine.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="icon"
                    onClick={() => handleUse(routine)}
                    data-testid={`button-use-${routine.id}`}
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          );
        })}
        <div className="pt-2">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setLocation(browseLink)}
            data-testid={`button-browse-more-${type}`}
          >
            Browse more {TYPE_LABELS[type].toLowerCase()}
          </Button>
        </div>
      </div>
    );
  };

  const getPersonalizedSteps = (routineId: string) => {
    const routine = SUGGESTED_ROUTINES.find(r => r.id === routineId);
    if (!routine) return [];
    
    let steps = [...routine.defaultSteps];
    
    if (gtky?.peakEnergyTime === "morning" && routineId === "morning") {
      steps = ["Quick energizing workout", ...steps.slice(1)];
    }
    if (gtky?.peakEnergyTime === "evening" && routineId === "evening") {
      steps = ["Light exercise", ...steps];
    }
    if (gtky?.dayStructure === "scattered" && routineId === "work") {
      steps = ["Time block your day", ...steps];
    }
    
    return steps;
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Routines" />
      
      <ScrollArea className="h-[calc(100vh-57px)]">
        <div className="p-4 max-w-2xl mx-auto space-y-6 pb-8">
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">Suggested Daily Routines</h2>
            <div className="grid grid-cols-2 gap-3">
              {SUGGESTED_ROUTINES.map((routine) => {
                const Icon = routine.icon;
                const steps = getPersonalizedSteps(routine.id);
                return (
                  <Card key={routine.id} className="hover-elevate cursor-pointer" data-testid={`card-suggested-${routine.id}`}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Icon className="w-5 h-5 text-primary" />
                        <h3 className="font-medium text-sm">{routine.title}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground">{routine.description}</p>
                      <div className="space-y-1 pt-2">
                        {steps.slice(0, 3).map((step, idx) => (
                          <div key={idx} className="text-xs text-muted-foreground flex items-start gap-1">
                            <span className="text-primary">-</span>
                            <span>{step}</span>
                          </div>
                        ))}
                        {steps.length > 3 && (
                          <span className="text-xs text-muted-foreground">+{steps.length - 3} more</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <div className="pt-2">
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Your Saved Routines</h2>
          </div>

          <Tabs defaultValue="workouts" className="w-full">
          <TabsList className="w-full flex flex-wrap gap-1 h-auto p-1">
            <TabsTrigger value="workouts" className="flex items-center gap-1.5 flex-1 min-w-0" data-testid="tab-workouts">
              <Dumbbell className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline text-xs">Workouts</span>
              {workouts.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                  {workouts.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="meals" className="flex items-center gap-1.5 flex-1 min-w-0" data-testid="tab-meals">
              <Utensils className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline text-xs">Meals</span>
              {mealPlans.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                  {mealPlans.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="budget" className="flex items-center gap-1.5 flex-1 min-w-0" data-testid="tab-budget">
              <Wallet className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline text-xs">Budget</span>
              {budgetPlans.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                  {budgetPlans.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="spiritual" className="flex items-center gap-1.5 flex-1 min-w-0" data-testid="tab-spiritual">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline text-xs">Spiritual</span>
              {spiritualPractices.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                  {spiritualPractices.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="meditations" className="flex items-center gap-1.5 flex-1 min-w-0" data-testid="tab-meditations">
              <Wind className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline text-xs">Calm</span>
              {meditations.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                  {meditations.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workouts" className="mt-4">
            {renderRoutineList(workouts, "workout", "/workout")}
          </TabsContent>

          <TabsContent value="meals" className="mt-4">
            {renderRoutineList(mealPlans, "meal_plan", "/meal-prep")}
          </TabsContent>

          <TabsContent value="budget" className="mt-4">
            {renderRoutineList(budgetPlans, "budget_plan", "/finances")}
          </TabsContent>

          <TabsContent value="spiritual" className="mt-4">
            {renderRoutineList(spiritualPractices, "spiritual_practice", "/spiritual")}
          </TabsContent>

          <TabsContent value="meditations" className="mt-4">
            {renderRoutineList(meditations, "meditation", "/")}
          </TabsContent>
        </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}
