import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageHeader } from "@/components/page-header";
import { usePageMeta } from "@/hooks/use-page-meta";
import { motion } from "framer-motion";
import {
  Droplets,
  Utensils,
  Zap,
  CheckCircle2,
  Circle,
  Plus,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { COPY } from "@/copy/en";

export default function TrackingDashboard() {
  usePageMeta("Tracking", "Log water, calories, and daily wellness metrics.");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [waterAmount, setWaterAmount] = useState("");

  // Fetch today's water logs
  const { data: waterLogs = [] } = useQuery({
    queryKey: ['/api/water-logs'],
  });

  // Fetch today's meal logs
  const { data: mealLogs = [] } = useQuery({
    queryKey: ['/api/meal-logs'],
  });

  // Fetch today's habits
  const { data: habits = [] } = useQuery({
    queryKey: ['/api/habits'],
  });

  // Toggle habit completion
  const toggleHabitMutation = useMutation({
    mutationFn: async (habitId: string) => {
      const res = await fetch(`/api/habits/${habitId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to toggle habit');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/habits'] });
    },
    onError: () => {
      toast({
        title: "Failed to update habit",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  // Calculate water intake today
  const todayWater = waterLogs
    .filter((log: any) => new Date(log.loggedAt).toDateString() === new Date().toDateString())
    .reduce((sum: number, log: any) => sum + (log.amount || 0), 0);

  // Calculate calories today
  const todayCalories = mealLogs
    .filter((log: any) => new Date(log.loggedAt).toDateString() === new Date().toDateString())
    .reduce((sum: number, log: any) => sum + (log.calories || 0), 0);

  // Log water mutation
  const logWaterMutation = useMutation({
    mutationFn: async (amount: number) => {
      const res = await fetch('/api/water-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ amount, loggedAt: new Date() }),
      });
      if (!res.ok) {
        throw new Error('Failed to log water');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/water-logs'] });
      setWaterAmount("");
      toast({ title: "Water logged successfully!" });
    },
    onError: () => {
      toast({ 
        title: "Failed to log water", 
        description: "Please try again",
        variant: "destructive" 
      });
    },
  });

  const handleLogWater = () => {
    const amount = parseInt(waterAmount, 10);
    if (amount && amount > 0) {
      logWaterMutation.mutate(amount);
    }
  };

  // Quick log water buttons
  const quickLogWater = (amount: number) => {
    logWaterMutation.mutate(amount);
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Daily Tracking" />
      <div className="flex-1 overflow-auto">
        <div className="container max-w-2xl mx-auto p-4 space-y-5 pb-24 page-enter">

        {/* Quick Stats */}
        <div className="grid grid-cols-1 gap-3">
          {/* Water Tracker */}
          <Card className="card-modern">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2.5 text-base">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Droplets className="h-4 w-4 text-blue-500" />
                  </div>
                  Water Intake
                </CardTitle>
                <span className="text-sm font-semibold tabular-nums">
                  {todayWater}<span className="text-xs text-muted-foreground font-normal ml-0.5">/ 64 oz</span>
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Progress value={Math.min((todayWater / 64) * 100, 100)} className="h-2" />
                <p className="text-xs text-muted-foreground text-right">
                  {Math.round(Math.min((todayWater / 64) * 100, 100))}% of daily goal
                </p>
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Amount (oz)"
                  value={waterAmount}
                  onChange={(e) => setWaterAmount(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogWater()}
                  className="text-sm"
                  data-testid="input-water-amount"
                />
                <Button onClick={handleLogWater} size="icon" data-testid="button-log-water">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => quickLogWater(8)} className="flex-1 text-xs h-8" data-testid="button-quick-8oz">+8 oz</Button>
                <Button variant="outline" size="sm" onClick={() => quickLogWater(16)} className="flex-1 text-xs h-8" data-testid="button-quick-16oz">+16 oz</Button>
                <Button variant="outline" size="sm" onClick={() => quickLogWater(24)} className="flex-1 text-xs h-8" data-testid="button-quick-24oz">+24 oz</Button>
              </div>
            </CardContent>
          </Card>

          {/* Calorie Summary */}
          <Card className="card-modern">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2.5 text-base">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <Utensils className="h-4 w-4 text-orange-500" />
                  </div>
                  Calories Today
                </CardTitle>
                <span className="text-sm font-semibold tabular-nums">
                  {todayCalories}<span className="text-xs text-muted-foreground font-normal ml-0.5">/ 2000 kcal</span>
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Progress value={Math.min((todayCalories / 2000) * 100, 100)} className="h-2" />
                <p className="text-xs text-muted-foreground text-right">
                  {Math.round(Math.min((todayCalories / 2000) * 100, 100))}% of daily goal
                </p>
              </div>
              <Button variant="outline" className="w-full" onClick={() => navigate('/meal-prep')} data-testid="button-log-meal">
                <Plus className="h-4 w-4 mr-2" />
                Log Meal
              </Button>
            </CardContent>
          </Card>

          {/* Workout Status */}
          <Card className="card-modern">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2.5 text-base">
                <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-yellow-500" />
                </div>
                Workout Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 py-2">
                <Badge variant="outline" className="text-xs">Not started today</Badge>
              </div>
              <Button className="w-full" onClick={() => navigate('/workout')} data-testid="button-start-workout">
                Start Workout
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Today's Habits */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2.5 text-base">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-primary" />
              </div>
              Today's Habits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {habits.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">{COPY.tracking.habitsEmpty}</p>
                  <Button onClick={() => navigate('/routines')}>{COPY.tracking.habitsEmptyCTA}</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {habits.filter((h: any) => h.isActive).map((habit: any) => (
                    <div
                      key={habit.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <button
                        className="h-6 w-6 rounded-full flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        onClick={() => toggleHabitMutation.mutate(habit.id)}
                        disabled={toggleHabitMutation.isPending}
                        aria-label={habit.completedToday ? `Mark ${habit.title} as incomplete` : `Mark ${habit.title} as complete`}
                        aria-pressed={Boolean(habit.completedToday)}
                      >
                        {habit.completedToday ? (
                          <CheckCircle2 className="h-6 w-6 text-green-500" aria-hidden="true" />
                        ) : (
                          <Circle className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                        )}
                      </button>
                      <div className="flex-1">
                        <p className={`font-medium ${habit.completedToday ? 'text-muted-foreground line-through' : ''}`}>
                          {habit.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {habit.streak > 0 ? `${habit.streak} day streak 🔥` : 'Start today!'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Quick Navigation */}
        <div className="space-y-2">
          <h2 className="section-label">Quick links</h2>
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm" className="h-auto flex-col gap-1.5 py-3" onClick={() => navigate('/meal-prep')} data-testid="link-meal-prep">
              <Utensils className="h-4 w-4 text-orange-500" />
              <span className="text-xs">Meals</span>
            </Button>
            <Button variant="outline" size="sm" className="h-auto flex-col gap-1.5 py-3" onClick={() => navigate('/workout')} data-testid="link-workout">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="text-xs">Workout</span>
            </Button>
            <Button variant="outline" size="sm" className="h-auto flex-col gap-1.5 py-3" onClick={() => navigate('/command-center')} data-testid="link-command-center">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-xs">Overview</span>
            </Button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
