/**
 * Accountability Dashboard
 * Shows user's accountability stats, streaks, and follow-through rate
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2,
  Circle,
  Flame,
  TrendingUp,
  Calendar,
  Target,
  Clock,
  BarChart3,
  Award,
  MessageSquare,
  Users,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { AccountabilityPartner } from "@/components/accountability-partner";
import type { AccountabilityStats, TaskAccountability } from "@shared/schema";

interface AccountabilitySynopsis {
  weekStart: Date;
  weekEnd: Date;
  totalTasks: number;
  committed: number;
  completed: number;
  partial: number;
  skipped: number;
  followThroughRate: number;
  currentStreak: number;
  longestStreak: number;
  bestDays: string[];
  patterns: string[];
}

interface TodaySummary {
  tasksScheduled: number;
  tasksCommitted: number;
  tasksCompleted: number;
  tasksPartial: number;
  tasksSkipped: number;
  followThroughRate: number;
}

export function AccountabilityDashboard() {
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week');

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useQuery<AccountabilityStats>({
    queryKey: ['/api/accountability/stats'],
  });

  // Fetch synopsis
  const { data: synopsis, isLoading: synopsisLoading } = useQuery<AccountabilitySynopsis>({
    queryKey: ['/api/accountability/synopsis'],
  });

  // Fetch today's summary
  const { data: todaySummary } = useQuery<TodaySummary>({
    queryKey: ['/api/accountability/today'],
  });

  if (statsLoading || synopsisLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading your accountability stats...</p>
        </div>
      </div>
    );
  }

  const followThroughRate = stats?.followThroughRate || 0;
  const currentStreak = stats?.currentStreak || 0;
  const longestStreak = stats?.longestStreak || 0;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Accountability Dashboard</h1>
        <p className="text-muted-foreground">
          Track your commitment follow-through and build momentum
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Follow-Through Rate */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Follow-Through Rate</CardTitle>
              <Target className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold">
                {Math.round(followThroughRate)}%
              </div>
              <Progress value={followThroughRate} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {followThroughRate >= 75 ? 'Excellent consistency!' : 
                 followThroughRate >= 50 ? 'Good progress' : 
                 'Building momentum'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Current Streak */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
              <Flame className="w-4 h-4 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold flex items-baseline gap-2">
                {currentStreak}
                <span className="text-lg text-muted-foreground">days</span>
              </div>
              {longestStreak > 0 && (
                <p className="text-xs text-muted-foreground">
                  Best: {longestStreak} days
                </p>
              )}
              {currentStreak >= 3 && (
                <Badge variant="default" className="bg-orange-500">
                  🔥 On fire!
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Today's Progress */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Today's Progress</CardTitle>
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold">
                {todaySummary?.tasksCompleted || 0}/{todaySummary?.tasksScheduled || 0}
              </div>
              <Progress 
                value={todaySummary && todaySummary.tasksScheduled > 0 
                  ? (todaySummary.tasksCompleted / todaySummary.tasksScheduled) * 100 
                  : 0} 
                className="h-2" 
              />
              <p className="text-xs text-muted-foreground">
                {todaySummary?.tasksCommitted || 0} committed
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Synopsis */}
      {synopsis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Weekly Synopsis
            </CardTitle>
            <CardDescription>
              Your accountability insights for this week
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Week Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Tasks</p>
                <p className="text-2xl font-bold">{synopsis.totalTasks}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{synopsis.completed}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Partial</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{synopsis.partial}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Skipped</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{synopsis.skipped}</p>
              </div>
            </div>

            {/* Patterns & Insights */}
            {synopsis.patterns.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Patterns
                </h4>
                <div className="space-y-2">
                  {synopsis.patterns.map((pattern, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      <span>{pattern}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Best Days */}
            {synopsis.bestDays.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Your Best Days
                </h4>
                <div className="flex gap-2">
                  {synopsis.bestDays.map((day, idx) => (
                    <Badge key={idx} variant="secondary">
                      {day}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Encouragement */}
            {synopsis.followThroughRate >= 75 && (
              <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-start gap-3">
                  <Award className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-green-900 dark:text-green-100">
                      Outstanding follow-through!
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      You're completing {Math.round(synopsis.followThroughRate)}% of your commitments. 
                      Keep up this amazing consistency!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Commitment Stats</CardTitle>
          <CardDescription>
            Your commitment and completion history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Circle className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-muted-foreground">Committed</span>
                </div>
                <p className="text-2xl font-bold">{stats?.tasksCommitted || 0}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">Completed</span>
                </div>
                <p className="text-2xl font-bold">{stats?.tasksCompleted || 0}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm text-muted-foreground">Partial</span>
                </div>
                <p className="text-2xl font-bold">{stats?.tasksPartial || 0}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Circle className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-muted-foreground">Skipped</span>
                </div>
                <p className="text-2xl font-bold">{stats?.tasksSkipped || 0}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accountability Partner */}
      <AccountabilityPartner />
    </div>
  );
}
