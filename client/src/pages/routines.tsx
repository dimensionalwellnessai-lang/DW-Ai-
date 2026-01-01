import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dumbbell, 
  Utensils, 
  Wind,
  Play, 
  Trash2,
  FolderOpen
} from "lucide-react";
import { 
  getSavedRoutinesByType,
  deleteRoutine,
  updateRoutineLastUsed,
  type SavedRoutine,
  type RoutineType
} from "@/lib/guest-storage";
import { useLocation } from "wouter";

const TYPE_ICONS: Record<RoutineType, typeof Dumbbell> = {
  workout: Dumbbell,
  meal_plan: Utensils,
  meditation: Wind,
};

const TYPE_LABELS: Record<RoutineType, string> = {
  workout: "Workouts",
  meal_plan: "Meal Plans",
  meditation: "Meditations",
};

export default function RoutinesPage() {
  const [, setLocation] = useLocation();
  const [workouts, setWorkouts] = useState<SavedRoutine[]>(getSavedRoutinesByType("workout"));
  const [mealPlans, setMealPlans] = useState<SavedRoutine[]>(getSavedRoutinesByType("meal_plan"));
  const [meditations, setMeditations] = useState<SavedRoutine[]>(getSavedRoutinesByType("meditation"));

  const handleDelete = (type: RoutineType, id: string) => {
    deleteRoutine(id);
    if (type === "workout") setWorkouts(workouts.filter(r => r.id !== id));
    if (type === "meal_plan") setMealPlans(mealPlans.filter(r => r.id !== id));
    if (type === "meditation") setMeditations(meditations.filter(r => r.id !== id));
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
        {routines.map((routine) => (
          <Card key={routine.id} className="hover-elevate" data-testid={`card-routine-${routine.id}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-10 h-10 bg-primary/10 rounded-md flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
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
        ))}
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

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Routines</h1>
          <p className="text-muted-foreground">
            Your saved workouts, meal plans, and meditations
          </p>
        </div>

        <Tabs defaultValue="workouts" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="workouts" className="flex items-center gap-2" data-testid="tab-workouts">
              <Dumbbell className="w-4 h-4" />
              <span className="hidden sm:inline">Workouts</span>
              {workouts.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                  {workouts.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="meals" className="flex items-center gap-2" data-testid="tab-meals">
              <Utensils className="w-4 h-4" />
              <span className="hidden sm:inline">Meals</span>
              {mealPlans.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                  {mealPlans.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="meditations" className="flex items-center gap-2" data-testid="tab-meditations">
              <Wind className="w-4 h-4" />
              <span className="hidden sm:inline">Meditations</span>
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

          <TabsContent value="meditations" className="mt-4">
            {renderRoutineList(meditations, "meditation", "/")}
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
}
