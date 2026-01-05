import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, 
  MessageSquareText, 
  Upload, 
  ChefHat, 
  Utensils, 
  Clock, 
  CalendarPlus,
  Calendar,
  Pencil,
  X,
  Check,
  Loader2,
  ChevronRight,
  ListChecks
} from "lucide-react";
import { MealPlanImport } from "@/components/meal-plan-import";
import { useSelectedItem } from "@/hooks/use-selected-item";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { MealPlan, Meal } from "@shared/schema";

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack", "other"];

export function MealsPage() {
  const [importOpen, setImportOpen] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Meal>>({});
  const [viewMode, setViewMode] = useState<"type" | "week">("week");
  const { toast } = useToast();

  const { data: mealPlans, isLoading: plansLoading } = useQuery<MealPlan[]>({
    queryKey: ["/api/meal-plans"],
  });

  const activePlan = mealPlans?.find(p => p.isActive);

  const { data: activeMeals } = useQuery<Meal[]>({
    queryKey: ["/api/meal-plans", activePlan?.id, "meals"],
    enabled: !!activePlan?.id,
  });

  const { isHighlighted, getHighlightProps } = useSelectedItem(activeMeals);

  const addToTodayMutation = useMutation({
    mutationFn: async (meal: Meal) => {
      const now = new Date();
      const mealTimes: Record<string, string> = {
        breakfast: "08:00",
        lunch: "12:30",
        dinner: "19:00",
        snack: "15:00",
        other: "12:00",
      };
      const startTime = mealTimes[meal.mealType || "other"] || "12:00";
      const [hours, minutes] = startTime.split(":").map(Number);
      const endHours = hours + 1;
      const endTime = `${endHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;

      return apiRequest("POST", "/api/calendar", {
        title: meal.title,
        description: meal.notes || `${meal.mealType || "Meal"} from ${activePlan?.title}`,
        startTime,
        endTime,
        eventType: "meal",
        dimensionTags: ["nutrition"],
        linkedType: "meal",
        linkedId: meal.id,
        linkedRoute: `/meals?selected=${meal.id}`,
        linkedMeta: { title: meal.title, mealType: meal.mealType, planId: activePlan?.id, planTitle: activePlan?.title },
      });
    },
    onSuccess: (_, meal) => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar"] });
      toast({
        title: "Added to your schedule",
        description: `${meal.title} has been added to today's calendar.`,
      });
    },
    onError: () => {
      toast({
        title: "Could not add to calendar",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    },
  });

  const updateMealMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Meal> }) => {
      return apiRequest("PATCH", `/api/meals/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meal-plans", activePlan?.id, "meals"] });
      toast({
        title: "Meal updated",
        description: "Your changes have been saved.",
      });
      setEditMode(false);
      setSelectedMeal(null);
    },
    onError: () => {
      toast({
        title: "Could not update meal",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    },
  });

  const activatePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      return apiRequest("PATCH", `/api/meal-plans/${planId}`, { isActive: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meal-plans"] });
      toast({
        title: "Meal plan activated",
        description: "This is now your active meal plan.",
      });
    },
    onError: () => {
      toast({
        title: "Could not activate plan",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const mealsByType = activeMeals?.reduce((acc, meal) => {
    const type = meal.mealType || "other";
    if (!acc[type]) acc[type] = [];
    acc[type].push(meal);
    return acc;
  }, {} as Record<string, Meal[]>) || {};

  const mealsByWeekLabel = activeMeals?.reduce((acc, meal) => {
    const label = meal.weekLabel || "Unscheduled";
    if (!acc[label]) acc[label] = [];
    acc[label].push(meal);
    return acc;
  }, {} as Record<string, Meal[]>) || {};

  const mealTypeOrder = ["breakfast", "lunch", "dinner", "snack", "other"];

  const openMealDetail = (meal: Meal) => {
    setSelectedMeal(meal);
    setEditForm({
      title: meal.title,
      mealType: meal.mealType,
      weekLabel: meal.weekLabel,
      notes: meal.notes,
      ingredients: meal.ingredients,
      instructions: meal.instructions,
    });
    setEditMode(false);
  };

  const handleSaveEdit = () => {
    if (!selectedMeal) return;
    updateMealMutation.mutate({
      id: selectedMeal.id,
      data: editForm,
    });
  };

  const getDayFromLabel = (label: string): string | null => {
    for (const day of DAYS_OF_WEEK) {
      if (label.toLowerCase().includes(day.toLowerCase())) {
        return day;
      }
    }
    return null;
  };

  const weekViewDays = DAYS_OF_WEEK.map(day => {
    const dayMeals = activeMeals?.filter(m => {
      const mealDay = getDayFromLabel(m.weekLabel || "");
      return mealDay === day;
    }) || [];
    return { day, meals: dayMeals };
  });

  const unscheduledMeals = activeMeals?.filter(m => !getDayFromLabel(m.weekLabel || "")) || [];

  return (
    <div className="min-h-screen">
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-background via-background to-muted/30" />
      
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-display font-bold">Meals</h1>
          <p className="text-muted-foreground font-body">
            Your meal plans and recipes, organized and ready.
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Link href="/">
            <Button variant="secondary" className="gap-2" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <Button onClick={() => setImportOpen(true)} className="gap-2" data-testid="button-import-meal-plan">
            <Upload className="h-4 w-4" />
            Upload a meal plan
          </Button>
          <Link href="/shopping-list">
            <Button variant="outline" className="gap-2" data-testid="button-shopping-list">
              <ListChecks className="h-4 w-4" />
              Shopping List
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="gap-2" data-testid="button-ask-ai-meal">
              <MessageSquareText className="h-4 w-4" />
              Ask AI
            </Button>
          </Link>
        </div>

        {/* Active Meal Plan */}
        {plansLoading ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">Loading your meal plans...</p>
            </CardContent>
          </Card>
        ) : activePlan ? (
          <div className="space-y-4">
            {/* Active Plan Header */}
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ChefHat className="w-5 h-5 text-primary" />
                    <CardTitle className="font-display">{activePlan.title}</CardTitle>
                    <Badge variant="default" className="text-xs">Active</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {activePlan.summary && (
                  <p className="text-sm text-muted-foreground mb-4">{activePlan.summary}</p>
                )}
                <div className="flex items-center justify-between gap-4">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Added {new Date(activePlan.createdAt!).toLocaleDateString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {activeMeals?.length || 0} meals
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* View Mode Toggle */}
            {activeMeals && activeMeals.length > 0 && (
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "type" | "week")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="week" data-testid="tab-week-view">
                    <Calendar className="w-4 h-4 mr-2" />
                    Week View
                  </TabsTrigger>
                  <TabsTrigger value="type" data-testid="tab-type-view">
                    <Utensils className="w-4 h-4 mr-2" />
                    By Meal Type
                  </TabsTrigger>
                </TabsList>

                {/* Week View */}
                <TabsContent value="week" className="mt-4 space-y-4">
                  <div className="grid gap-3">
                    {weekViewDays.map(({ day, meals }) => (
                      <Card key={day} className={meals.length === 0 ? "opacity-50" : ""}>
                        <CardHeader className="py-3 pb-2">
                          <div className="flex items-center justify-between gap-2">
                            <CardTitle className="text-sm font-medium">{day}</CardTitle>
                            {meals.length > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {meals.length} meal{meals.length !== 1 ? "s" : ""}
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 pb-3">
                          {meals.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No meals scheduled</p>
                          ) : (
                            <div className="space-y-2">
                              {meals.map(meal => (
                                <div 
                                  key={meal.id}
                                  className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50 cursor-pointer hover-elevate"
                                  onClick={() => openMealDetail(meal)}
                                  data-testid={`meal-week-${meal.id}`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Utensils className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                    <span className="text-sm truncate">{meal.title}</span>
                                    {meal.mealType && (
                                      <Badge variant="outline" className="text-xs flex-shrink-0 capitalize">
                                        {meal.mealType}
                                      </Badge>
                                    )}
                                  </div>
                                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  
                  {unscheduledMeals.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-muted-foreground">Other Meals</h3>
                      <Card>
                        <CardContent className="py-3">
                          <div className="space-y-2">
                            {unscheduledMeals.map(meal => (
                              <div 
                                key={meal.id}
                                className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50 cursor-pointer hover-elevate"
                                onClick={() => openMealDetail(meal)}
                                data-testid={`meal-other-${meal.id}`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <Utensils className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                  <span className="text-sm truncate">{meal.title}</span>
                                  {meal.mealType && (
                                    <Badge variant="outline" className="text-xs flex-shrink-0 capitalize">
                                      {meal.mealType}
                                    </Badge>
                                  )}
                                </div>
                                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </TabsContent>

                {/* Type View */}
                <TabsContent value="type" className="mt-4 space-y-4">
                  {mealTypeOrder.map(type => {
                    const typeMeals = mealsByType[type];
                    if (!typeMeals || typeMeals.length === 0) return null;
                    
                    return (
                      <div key={type}>
                        <h3 className="text-sm font-medium mb-2 capitalize text-muted-foreground">
                          {type}
                        </h3>
                        <div className="grid gap-2">
                          {typeMeals.map(meal => {
                            const highlightProps = getHighlightProps(meal.id);
                            return (
                              <Card 
                                key={meal.id} 
                                ref={highlightProps.ref as React.Ref<HTMLDivElement>}
                                className={`hover-elevate cursor-pointer transition-all ${highlightProps.className}`}
                                onClick={() => openMealDetail(meal)}
                                data-testid={`card-meal-${meal.id}`}
                              >
                                <CardContent className="py-3 flex items-center gap-3">
                                  <Utensils className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{meal.title}</p>
                                    {meal.weekLabel && (
                                      <p className="text-xs text-muted-foreground">{meal.weekLabel}</p>
                                    )}
                                  </div>
                                  {meal.tags && meal.tags.length > 0 && (
                                    <span className="text-xs text-muted-foreground mr-2">
                                      {meal.tags[0]}
                                    </span>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      addToTodayMutation.mutate(meal);
                                    }}
                                    disabled={addToTodayMutation.isPending}
                                    data-testid={`button-add-meal-today-${meal.id}`}
                                  >
                                    <CalendarPlus className="w-4 h-4" />
                                  </Button>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </TabsContent>
              </Tabs>
            )}

            {(!activeMeals || activeMeals.length === 0) && (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">No meals in this plan yet.</p>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center space-y-4">
              <ChefHat className="w-12 h-12 mx-auto text-muted-foreground/50" />
              <div className="space-y-2">
                <p className="font-medium">No meal plans yet</p>
                <p className="text-sm text-muted-foreground">
                  Upload a PDF meal plan and I'll organize it for you.
                </p>
              </div>
              <Button onClick={() => setImportOpen(true)} data-testid="button-upload-first-plan">
                <Upload className="w-4 h-4 mr-2" />
                Upload a meal plan
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Other Meal Plans */}
        {mealPlans && mealPlans.filter(p => !p.isActive).length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Other Plans</h3>
            <div className="grid gap-2">
              {mealPlans.filter(p => !p.isActive).map(plan => (
                <Card 
                  key={plan.id} 
                  className="hover-elevate cursor-pointer"
                  onClick={() => activatePlanMutation.mutate(plan.id)}
                >
                  <CardContent className="py-3 flex items-center gap-3">
                    <ChefHat className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{plan.title}</p>
                      <p className="text-xs text-muted-foreground">Tap to activate</p>
                    </div>
                    {activatePlanMutation.isPending && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <MealPlanImport open={importOpen} onOpenChange={setImportOpen} />

      {/* Meal Detail Dialog */}
      <Dialog open={!!selectedMeal} onOpenChange={(open) => !open && setSelectedMeal(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Utensils className="w-5 h-5" />
              {editMode ? "Edit Meal" : selectedMeal?.title}
            </DialogTitle>
            {!editMode && selectedMeal?.mealType && (
              <DialogDescription className="capitalize">
                {selectedMeal.mealType} {selectedMeal.weekLabel && `- ${selectedMeal.weekLabel}`}
              </DialogDescription>
            )}
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            {editMode ? (
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={editForm.title || ""}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    data-testid="input-meal-title"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Meal Type</label>
                    <Select
                      value={editForm.mealType || "other"}
                      onValueChange={(v) => setEditForm({ ...editForm, mealType: v })}
                    >
                      <SelectTrigger data-testid="select-meal-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MEAL_TYPES.map(type => (
                          <SelectItem key={type} value={type} className="capitalize">
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Day</label>
                    <Select
                      value={getDayFromLabel(editForm.weekLabel || "") || "none"}
                      onValueChange={(v) => setEditForm({ ...editForm, weekLabel: v === "none" ? null : v })}
                    >
                      <SelectTrigger data-testid="select-meal-day">
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No specific day</SelectItem>
                        {DAYS_OF_WEEK.map(day => (
                          <SelectItem key={day} value={day}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes</label>
                  <Textarea
                    value={editForm.notes || ""}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    placeholder="Add any notes about this meal..."
                    className="min-h-[80px]"
                    data-testid="textarea-meal-notes"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ingredients (one per line)</label>
                  <Textarea
                    value={(editForm.ingredients || []).join("\n")}
                    onChange={(e) => setEditForm({ ...editForm, ingredients: e.target.value.split("\n").filter(i => i.trim()) })}
                    placeholder="Enter ingredients, one per line..."
                    className="min-h-[100px]"
                    data-testid="textarea-meal-ingredients"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Instructions (one per line)</label>
                  <Textarea
                    value={(editForm.instructions || []).join("\n")}
                    onChange={(e) => setEditForm({ ...editForm, instructions: e.target.value.split("\n").filter(i => i.trim()) })}
                    placeholder="Enter cooking instructions, one per line..."
                    className="min-h-[100px]"
                    data-testid="textarea-meal-instructions"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-2">
                {selectedMeal?.notes && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Notes</h4>
                    <p className="text-sm text-muted-foreground">{selectedMeal.notes}</p>
                  </div>
                )}
                
                {selectedMeal?.ingredients && selectedMeal.ingredients.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Ingredients</h4>
                    <ul className="space-y-1">
                      {selectedMeal.ingredients.map((ing, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary">•</span>
                          {ing}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {selectedMeal?.instructions && selectedMeal.instructions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Instructions</h4>
                    <ol className="space-y-2 list-decimal list-inside">
                      {selectedMeal.instructions.map((inst, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground">{inst}</li>
                      ))}
                    </ol>
                  </div>
                )}
                
                {(!selectedMeal?.ingredients || selectedMeal.ingredients.length === 0) && 
                 (!selectedMeal?.instructions || selectedMeal.instructions.length === 0) && 
                 !selectedMeal?.notes && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No details added yet. Tap Edit to add ingredients and instructions.
                  </p>
                )}
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="gap-2 mt-4">
            {editMode ? (
              <>
                <Button variant="outline" onClick={() => setEditMode(false)} data-testid="button-cancel-edit">
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveEdit} 
                  disabled={updateMealMutation.isPending}
                  data-testid="button-save-meal"
                >
                  {updateMealMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setEditMode(true)} data-testid="button-edit-meal">
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button
                  onClick={() => selectedMeal && addToTodayMutation.mutate(selectedMeal)}
                  disabled={addToTodayMutation.isPending}
                  data-testid="button-add-to-calendar-dialog"
                >
                  <CalendarPlus className="w-4 h-4 mr-2" />
                  Add to Today
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
