import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, MessageSquareText, Upload, ChefHat, Utensils, Clock } from "lucide-react";
import { MealPlanImport } from "@/components/meal-plan-import";
import { useSelectedItem } from "@/hooks/use-selected-item";
import type { MealPlan, Meal } from "@shared/schema";

export function MealsPage() {
  const [importOpen, setImportOpen] = useState(false);

  const { data: mealPlans, isLoading: plansLoading } = useQuery<MealPlan[]>({
    queryKey: ["/api/meal-plans"],
  });

  const activePlan = mealPlans?.find(p => p.isActive);

  const { data: activeMeals } = useQuery<Meal[]>({
    queryKey: ["/api/meal-plans", activePlan?.id, "meals"],
    enabled: !!activePlan?.id,
  });

  const { isHighlighted, getHighlightProps } = useSelectedItem(activeMeals);

  const mealsByType = activeMeals?.reduce((acc, meal) => {
    const type = meal.mealType || "other";
    if (!acc[type]) acc[type] = [];
    acc[type].push(meal);
    return acc;
  }, {} as Record<string, Meal[]>) || {};

  const mealTypeOrder = ["breakfast", "lunch", "dinner", "snack", "other"];

  return (
    <div className="min-h-screen">
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-background via-background to-muted/30" />
      
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
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
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <ChefHat className="w-5 h-5 text-primary" />
                  <CardTitle className="font-display">{activePlan.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {activePlan.summary && (
                  <p className="text-sm text-muted-foreground mb-4">{activePlan.summary}</p>
                )}
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Added {new Date(activePlan.createdAt!).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>

            {/* Meals grouped by type */}
            {Object.keys(mealsByType).length > 0 && (
              <div className="space-y-4">
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
                                  <span className="text-xs text-muted-foreground">
                                    {meal.tags[0]}
                                  </span>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
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
                <Card key={plan.id} className="hover-elevate cursor-pointer">
                  <CardContent className="py-3 flex items-center gap-3">
                    <ChefHat className="w-4 h-4 text-muted-foreground" />
                    <p className="font-medium text-sm">{plan.title}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <MealPlanImport open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
