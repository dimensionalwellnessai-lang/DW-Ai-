import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, MessageSquareText, Dumbbell, Calendar, FileUp, LayoutGrid, Edit2, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useState } from "react";
import type { WorkoutPlan, Exercise } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function WorkoutsPage() {
  const [, setLocation] = useLocation();
  const [viewMode, setViewMode] = useState<"week" | "type">("week");
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Exercise>>({});

  const { data: workoutPlans = [], isLoading: plansLoading } = useQuery<WorkoutPlan[]>({
    queryKey: ["/api/workout-plans"],
  });

  const { data: exercises = [], isLoading: exercisesLoading } = useQuery<Exercise[]>({
    queryKey: ["/api/exercises"],
  });

  const activePlan = workoutPlans.find(p => p.isActive);
  const planExercises = activePlan 
    ? exercises.filter(e => e.workoutPlanId === activePlan.id)
    : exercises;

  const exercisesByDay = DAYS_OF_WEEK.reduce((acc, day) => {
    acc[day] = planExercises.filter(e => e.dayLabel?.toLowerCase() === day.toLowerCase());
    return acc;
  }, {} as Record<string, Exercise[]>);

  const unscheduledExercises = planExercises.filter(e => !e.dayLabel || !DAYS_OF_WEEK.map(d => d.toLowerCase()).includes(e.dayLabel.toLowerCase()));

  const exerciseTypes = [...new Set(planExercises.map(e => e.exerciseType || "other"))];
  const exercisesByType = exerciseTypes.reduce((acc, type) => {
    acc[type] = planExercises.filter(e => (e.exerciseType || "other") === type);
    return acc;
  }, {} as Record<string, Exercise[]>);

  const handleExerciseClick = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setEditForm(exercise);
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!selectedExercise) return;
    try {
      await apiRequest("PATCH", `/api/exercises/${selectedExercise.id}`, editForm);
      queryClient.invalidateQueries({ queryKey: ["/api/exercises"] });
      setIsEditing(false);
      setSelectedExercise(null);
    } catch (error) {
      console.error("Failed to update exercise:", error);
    }
  };

  const hasContent = workoutPlans.length > 0 || exercises.length > 0;
  const isLoading = plansLoading || exercisesLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Workouts" backPath="/" />
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        title="Workouts" 
        backPath="/"
        rightContent={
          <div className="flex gap-2 flex-shrink-0">
            <Link href="/import">
              <Button size="sm" variant="outline" className="gap-2" data-testid="button-import-workout">
                <FileUp className="h-4 w-4" />
                Import
              </Button>
            </Link>
            <Link href="/">
              <Button size="sm" className="gap-2" data-testid="button-ask-ai-workout">
                <MessageSquareText className="h-4 w-4" />
                Ask AI
              </Button>
            </Link>
          </div>
        }
      />
      
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {!hasContent ? (
          <Card className="p-8 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                <Dumbbell className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-lg">No workouts yet</h3>
                <p className="text-muted-foreground font-body mt-1">
                  Upload a workout plan or ask the AI to help you build one.
                </p>
              </div>
              <div className="flex flex-col gap-2 items-center">
                <Link href="/import">
                  <Button className="gap-2" data-testid="button-upload-workout">
                    <FileUp className="h-4 w-4" />
                    Upload Workout Plan
                  </Button>
                </Link>
                <Link href="/">
                  <Button variant="ghost" className="gap-2" data-testid="button-create-workout-ai">
                    <Plus className="h-4 w-4" />
                    Plan Workout with AI
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        ) : (
          <>
            {activePlan && (
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {activePlan.title}
                </Badge>
                {activePlan.summary && (
                  <span className="text-sm text-muted-foreground">{activePlan.summary}</span>
                )}
              </div>
            )}

            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "week" | "type")} className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="week" className="gap-2" data-testid="tab-week-view">
                  <Calendar className="h-4 w-4" />
                  Week
                </TabsTrigger>
                <TabsTrigger value="type" className="gap-2" data-testid="tab-type-view">
                  <LayoutGrid className="h-4 w-4" />
                  By Type
                </TabsTrigger>
              </TabsList>

              <TabsContent value="week" className="space-y-4">
                <div className="grid gap-4">
                  {DAYS_OF_WEEK.map((day) => (
                    <div key={day} className="space-y-2">
                      <h3 className="font-display font-medium text-sm text-muted-foreground">{day}</h3>
                      {exercisesByDay[day].length > 0 ? (
                        <div className="grid gap-2">
                          {exercisesByDay[day].map((exercise) => (
                            <Card 
                              key={exercise.id} 
                              className="p-3 hover-elevate cursor-pointer"
                              onClick={() => handleExerciseClick(exercise)}
                              data-testid={`card-exercise-${exercise.id}`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{exercise.title}</p>
                                  <div className="flex items-center gap-2 flex-wrap mt-1">
                                    {exercise.exerciseType && exercise.exerciseType !== "other" && (
                                      <Badge variant="outline" className="text-xs">{exercise.exerciseType}</Badge>
                                    )}
                                    {exercise.sets && exercise.reps && (
                                      <span className="text-xs text-muted-foreground">{exercise.sets} x {exercise.reps}</span>
                                    )}
                                    {exercise.duration && (
                                      <span className="text-xs text-muted-foreground">{exercise.duration}</span>
                                    )}
                                  </div>
                                </div>
                                <Dumbbell className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              </div>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="border border-dashed rounded-md p-4 text-center text-sm text-muted-foreground">
                          Rest day
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {unscheduledExercises.length > 0 && (
                  <div className="space-y-2 pt-4 border-t">
                    <h3 className="font-display font-medium text-sm text-muted-foreground">Unscheduled</h3>
                    <div className="grid gap-2">
                      {unscheduledExercises.map((exercise) => (
                        <Card 
                          key={exercise.id} 
                          className="p-3 hover-elevate cursor-pointer"
                          onClick={() => handleExerciseClick(exercise)}
                          data-testid={`card-exercise-unscheduled-${exercise.id}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{exercise.title}</p>
                              {exercise.exerciseType && exercise.exerciseType !== "other" && (
                                <Badge variant="outline" className="text-xs mt-1">{exercise.exerciseType}</Badge>
                              )}
                            </div>
                            <Dumbbell className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="type" className="space-y-4">
                {exerciseTypes.map((type) => (
                  <div key={type} className="space-y-2">
                    <h3 className="font-display font-medium text-sm text-muted-foreground capitalize">{type}</h3>
                    <div className="grid gap-2">
                      {exercisesByType[type].map((exercise) => (
                        <Card 
                          key={exercise.id} 
                          className="p-3 hover-elevate cursor-pointer"
                          onClick={() => handleExerciseClick(exercise)}
                          data-testid={`card-exercise-type-${exercise.id}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{exercise.title}</p>
                              <div className="flex items-center gap-2 flex-wrap mt-1">
                                {exercise.dayLabel && (
                                  <Badge variant="outline" className="text-xs">{exercise.dayLabel}</Badge>
                                )}
                                {exercise.sets && exercise.reps && (
                                  <span className="text-xs text-muted-foreground">{exercise.sets} x {exercise.reps}</span>
                                )}
                              </div>
                            </div>
                            <Dumbbell className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      <Dialog open={!!selectedExercise} onOpenChange={(open) => !open && setSelectedExercise(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2">
              <span className="truncate">{selectedExercise?.title}</span>
              {!isEditing && (
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => setIsEditing(true)}
                  data-testid="button-edit-exercise"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
            </DialogTitle>
            {!isEditing && selectedExercise?.exerciseType && (
              <DialogDescription>
                {selectedExercise.exerciseType} {selectedExercise.dayLabel && `- ${selectedExercise.dayLabel}`}
              </DialogDescription>
            )}
          </DialogHeader>

          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Exercise Name</Label>
                <Input
                  id="title"
                  value={editForm.title || ""}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  data-testid="input-exercise-title"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="exerciseType">Type</Label>
                  <Input
                    id="exerciseType"
                    value={editForm.exerciseType || ""}
                    onChange={(e) => setEditForm({ ...editForm, exerciseType: e.target.value })}
                    placeholder="e.g., strength, cardio"
                    data-testid="input-exercise-type"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dayLabel">Day</Label>
                  <Select
                    value={editForm.dayLabel || ""}
                    onValueChange={(value) => setEditForm({ ...editForm, dayLabel: value || null })}
                  >
                    <SelectTrigger data-testid="select-exercise-day">
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Unscheduled</SelectItem>
                      {DAYS_OF_WEEK.map((day) => (
                        <SelectItem key={day} value={day}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sets">Sets</Label>
                  <Input
                    id="sets"
                    value={editForm.sets || ""}
                    onChange={(e) => setEditForm({ ...editForm, sets: e.target.value })}
                    placeholder="3"
                    data-testid="input-exercise-sets"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reps">Reps</Label>
                  <Input
                    id="reps"
                    value={editForm.reps || ""}
                    onChange={(e) => setEditForm({ ...editForm, reps: e.target.value })}
                    placeholder="10"
                    data-testid="input-exercise-reps"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration</Label>
                  <Input
                    id="duration"
                    value={editForm.duration || ""}
                    onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })}
                    placeholder="30s"
                    data-testid="input-exercise-duration"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={editForm.notes || ""}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={3}
                  data-testid="input-exercise-notes"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {(selectedExercise?.sets || selectedExercise?.reps || selectedExercise?.duration) && (
                <div className="flex gap-4 text-sm">
                  {selectedExercise.sets && (
                    <div>
                      <span className="text-muted-foreground">Sets:</span> {selectedExercise.sets}
                    </div>
                  )}
                  {selectedExercise.reps && (
                    <div>
                      <span className="text-muted-foreground">Reps:</span> {selectedExercise.reps}
                    </div>
                  )}
                  {selectedExercise.duration && (
                    <div>
                      <span className="text-muted-foreground">Duration:</span> {selectedExercise.duration}
                    </div>
                  )}
                </div>
              )}

              {selectedExercise?.equipment && selectedExercise.equipment.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Equipment</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedExercise.equipment.map((item, i) => (
                      <Badge key={i} variant="secondary">{item}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedExercise?.instructions && selectedExercise.instructions.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Instructions</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    {selectedExercise.instructions.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}

              {selectedExercise?.notes && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Notes</h4>
                  <p className="text-sm text-muted-foreground">{selectedExercise.notes}</p>
                </div>
              )}
            </div>
          )}

          {isEditing && (
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)} data-testid="button-cancel-edit">
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} data-testid="button-save-exercise">
                Save Changes
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
