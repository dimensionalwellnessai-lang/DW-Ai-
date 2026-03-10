import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
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
import { ScrollArea } from "@/components/ui/scroll-area";

export default function TrackingDashboard() {
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
    <div className="flex flex-col h-full bg-gradient-to-b from-background to-muted/20">
      <PageHeader title="Tracking Dashboard" />
      <div className="flex-1 overflow-auto">
        <div className="container max-w-6xl mx-auto p-4 space-y-6">
        <p className="text-muted-foreground text-center">
          Monitor your daily wellness metrics
        </p>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-3 gap-4">
          {/* Water Tracker */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Droplets className="h-5 w-5 text-blue-500" />
                Water Intake
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold">{todayWater} oz</span>
                  <span className="text-sm text-muted-foreground">/ 64 oz</span>
                </div>
                <Progress value={(todayWater / 64) * 100} className="h-3" />
              </div>
              
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Amount (oz)"
                    value={waterAmount}
                    onChange={(e) => setWaterAmount(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogWater()}
                  />
                  <Button onClick={handleLogWater} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => quickLogWater(8)}
                    className="flex-1"
                  >
                    +8 oz
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => quickLogWater(16)}
                    className="flex-1"
                  >
                    +16 oz
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => quickLogWater(24)}
                    className="flex-1"
                  >
                    +24 oz
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Calorie Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Utensils className="h-5 w-5 text-orange-500" />
                Calories Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-bold">{todayCalories}</span>
                    <span className="text-sm text-muted-foreground">/ 2000 kcal</span>
                  </div>
                  <Progress value={(todayCalories / 2000) * 100} className="h-3" />
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/meal-prep')}
                >
                  Log Meal
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Workout Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Workout Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-2">Today's Workout</p>
                <Badge variant="outline" className="mb-4">Not Started</Badge>
              </div>
              <Button
                className="w-full"
                onClick={() => navigate('/workout')}
              >
                Start Workout
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Today's Habits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
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
                        className="h-6 w-6 rounded border-2 border-primary flex items-center justify-center hover:bg-primary/10 transition-colors"
                        onClick={() => toast({ title: "Habit tracking", description: "Full habit completion coming soon!" })}
                        aria-label={`Mark ${habit.title} as complete`}
                      >
                        <CheckCircle2 className="h-4 w-4 text-primary opacity-0 hover:opacity-100 transition-opacity" />
                      </button>
                      <div className="flex-1">
                        <p className="font-medium">{habit.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {habit.streak > 0 ? `${habit.streak} day streak 🔥` : 'Start today!'}
                        </p>
                      </div>
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4">
          <Button
            variant="outline"
            className="h-20"
            onClick={() => navigate('/meal-prep')}
          >
            <div className="flex flex-col items-center gap-2">
              <Utensils className="h-6 w-6" />
              <span>Log Meal</span>
            </div>
          </Button>
          <Button
            variant="outline"
            className="h-20"
            onClick={() => navigate('/workout')}
          >
            <div className="flex flex-col items-center gap-2">
              <Zap className="h-6 w-6" />
              <span>Log Workout</span>
            </div>
          </Button>
          <Button
            variant="outline"
            className="h-20"
            onClick={() => navigate('/command-center')}
          >
            <div className="flex flex-col items-center gap-2">
              <TrendingUp className="h-6 w-6" />
              <span>Command Center</span>
            </div>
          </Button>
        </div>
      </div>
      </div>
    </div>
  );
}
