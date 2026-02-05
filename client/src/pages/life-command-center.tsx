import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import {
  Zap,
  Brain,
  Clock,
  Compass,
  Wallet,
  Users,
  Home,
  Sprout,
  Droplets,
  Utensils,
  Calendar,
  Target,
  CheckCircle2,
  Circle,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { getSwitchData, type SwitchId, type SwitchStatus } from "@/lib/switch-storage";

const SWITCH_ICONS: Record<SwitchId, typeof Zap> = {
  body: Zap,
  mind: Brain,
  time: Clock,
  purpose: Compass,
  money: Wallet,
  relationships: Users,
  environment: Home,
  identity: Sprout,
};

const SWITCH_COLORS: Record<SwitchId, { text: string; bg: string }> = {
  body: { text: "text-red-400", bg: "bg-red-500/10" },
  mind: { text: "text-purple-400", bg: "bg-purple-500/10" },
  time: { text: "text-blue-400", bg: "bg-blue-500/10" },
  purpose: { text: "text-amber-400", bg: "bg-amber-500/10" },
  money: { text: "text-green-400", bg: "bg-green-500/10" },
  relationships: { text: "text-pink-400", bg: "bg-pink-500/10" },
  environment: { text: "text-cyan-400", bg: "bg-cyan-500/10" },
  identity: { text: "text-emerald-400", bg: "bg-emerald-500/10" },
};

export default function LifeCommandCenter() {
  const [, navigate] = useLocation();
  const [switchData, setSwitchData] = useState(getSwitchData);
  const [showIntroBanner, setShowIntroBanner] = useState(
    !localStorage.getItem('dw_command_center_intro_dismissed')
  );
  const [todayDate] = useState(new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }));

  // Helper function for keyboard navigation
  const handleKeyPress = (e: React.KeyboardEvent, callback: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      callback();
    }
  };

  // Fetch today's water logs
  const { data: waterLogs = [] } = useQuery({
    queryKey: ['/api/water-logs'],
  });

  // Fetch today's meal logs
  const { data: mealLogs = [] } = useQuery({
    queryKey: ['/api/meal-logs'],
  });

  // Fetch active goals
  const { data: goals = [] } = useQuery({
    queryKey: ['/api/goals'],
  });

  // Fetch today's habits
  const { data: habits = [] } = useQuery({
    queryKey: ['/api/habits'],
  });

  // Fetch upcoming calendar events
  const { data: calendarEvents = [] } = useQuery({
    queryKey: ['/api/calendar/events'],
  });

  // Calculate water intake today
  const todayWater = waterLogs
    .filter((log: any) => new Date(log.loggedAt).toDateString() === new Date().toDateString())
    .reduce((sum: number, log: any) => sum + (log.amount || 0), 0);

  // Calculate calories today
  const todayCalories = mealLogs
    .filter((log: any) => new Date(log.loggedAt).toDateString() === new Date().toDateString())
    .reduce((sum: number, log: any) => sum + (log.calories || 0), 0);

  // Get active goals with progress
  const activeGoals = goals.filter((g: any) => g.status !== 'completed' && g.status !== 'archived').slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container max-w-7xl mx-auto p-4 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2 pt-6 pb-4"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Life Command Center
          </h1>
          <p className="text-muted-foreground">{todayDate}</p>
        </motion.div>

        {/* First-Time Banner */}
        {showIntroBanner && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Welcome to your Command Center
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tap any card to dive deeper. Ask DW anything. 
                    Start with your Life Blueprint to define who you are.
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    localStorage.setItem('dw_command_center_intro_dismissed', 'true');
                    setShowIntroBanner(false);
                  }}
                  aria-label="Dismiss welcome banner"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={() => navigate('/life-blueprint')}>
                  Start Life Blueprint
                </Button>
                <Button size="sm" variant="outline" onClick={() => navigate('/app-tour')}>
                  Take a Tour
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/tracking')}
            onKeyDown={(e) => handleKeyPress(e, () => navigate('/tracking'))}
            tabIndex={0}
            role="button"
            aria-label="View water and calorie tracking"
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Water</p>
                  <p className="text-2xl font-bold">{todayWater} oz</p>
                </div>
                <Droplets className="h-8 w-8 text-blue-500" />
              </div>
              <Progress value={(todayWater / 64) * 100} className="mt-2" />
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/tracking')}
            onKeyDown={(e) => handleKeyPress(e, () => navigate('/tracking'))}
            tabIndex={0}
            role="button"
            aria-label="View calorie tracking"
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Calories</p>
                  <p className="text-2xl font-bold">{todayCalories}</p>
                </div>
                <Utensils className="h-8 w-8 text-orange-500" />
              </div>
              <Progress value={(todayCalories / 2000) * 100} className="mt-2" />
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/goals')}
            onKeyDown={(e) => handleKeyPress(e, () => navigate('/goals'))}
            tabIndex={0}
            role="button"
            aria-label="View goals"
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Goals</p>
                  <p className="text-2xl font-bold">{activeGoals.length}</p>
                </div>
                <Target className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/habits')}
            onKeyDown={(e) => handleKeyPress(e, () => navigate('/habits'))}
            tabIndex={0}
            role="button"
            aria-label="View habits"
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Habits</p>
                  <p className="text-2xl font-bold">{habits.filter((h: any) => h.isActive).length}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Today's Schedule */}
          <Card>
            <CardHeader 
              className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg"
              onClick={() => navigate('/calendar')}
              onKeyDown={(e) => handleKeyPress(e, () => navigate('/calendar'))}
              tabIndex={0}
              role="button"
              aria-label="View calendar"
            >
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Today's Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                {calendarEvents.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No events scheduled today
                  </p>
                ) : (
                  <div className="space-y-3">
                    {calendarEvents.slice(0, 5).map((event: any) => (
                      <div
                        key={event.id}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                        onClick={() => navigate('/calendar')}
                        onKeyDown={(e) => handleKeyPress(e, () => navigate('/calendar'))}
                        tabIndex={0}
                        role="button"
                        aria-label={`View ${event.title} in calendar`}
                      >
                        <div className="text-xs font-semibold text-muted-foreground min-w-[60px]">
                          {event.startTime || 'All day'}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{event.title}</p>
                          {event.description && (
                            <p className="text-sm text-muted-foreground">{event.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Active Goals */}
          <Card>
            <CardHeader 
              className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg"
              onClick={() => navigate('/goals')}
              onKeyDown={(e) => handleKeyPress(e, () => navigate('/goals'))}
              tabIndex={0}
              role="button"
              aria-label="View goals"
            >
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Active Goals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                {activeGoals.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No active goals yet</p>
                    <Button onClick={() => navigate('/goals')}>Create First Goal</Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeGoals.map((goal: any) => (
                      <div 
                        key={goal.id} 
                        className="space-y-2 cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors"
                        onClick={() => navigate('/goals')}
                        onKeyDown={(e) => handleKeyPress(e, () => navigate('/goals'))}
                        tabIndex={0}
                        role="button"
                        aria-label={`View goal: ${goal.title}`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{goal.title}</p>
                          <Badge variant="secondary">{goal.progress}%</Badge>
                        </div>
                        <Progress value={goal.progress} className="h-2" />
                        {goal.wellnessDimension && (
                          <Badge variant="outline" className="text-xs">
                            {goal.wellnessDimension}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Dimension Status */}
          <Card>
            <CardHeader 
              className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg"
              onClick={() => navigate('/life-blueprint')}
              onKeyDown={(e) => handleKeyPress(e, () => navigate('/life-blueprint'))}
              tabIndex={0}
              role="button"
              aria-label="View life blueprint"
            >
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                8 Dimensions Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(SWITCH_ICONS) as SwitchId[]).map((switchId) => {
                  const Icon = SWITCH_ICONS[switchId];
                  const colors = SWITCH_COLORS[switchId];
                  const data = switchData[switchId];

                  return (
                    <div
                      key={switchId}
                      onClick={() => navigate("/life-blueprint")}
                      onKeyDown={(e) => handleKeyPress(e, () => navigate("/life-blueprint"))}
                      tabIndex={0}
                      role="button"
                      aria-label={`View ${switchId} dimension`}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                    >
                      <div className={`p-2 rounded-lg ${colors.bg}`}>
                        <Icon className={`h-4 w-4 ${colors.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm capitalize truncate">{switchId}</p>
                        <p className="text-xs text-muted-foreground capitalize">{data.status}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Today's Habits */}
          <Card>
            <CardHeader 
              className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg"
              onClick={() => navigate('/habits')}
              onKeyDown={(e) => handleKeyPress(e, () => navigate('/habits'))}
              tabIndex={0}
              role="button"
              aria-label="View habits"
            >
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Today's Habits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                {habits.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No habits set up yet</p>
                    <Button onClick={() => navigate('/habits')}>Create First Habit</Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {habits.slice(0, 8).map((habit: any) => (
                      <div
                        key={habit.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                        onClick={() => navigate('/habits')}
                        onKeyDown={(e) => handleKeyPress(e, () => navigate('/habits'))}
                        tabIndex={0}
                        role="button"
                        aria-label={`View habit: ${habit.title}`}
                      >
                        <div className="h-5 w-5 rounded border-2 border-primary" />
                        <div className="flex-1">
                          <p className="font-medium">{habit.title}</p>
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
        </div>

        {/* Quick Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-3 justify-center">
              <Button onClick={() => navigate('/talk')}>
                <Sparkles className="h-4 w-4 mr-2" />
                Ask DW
              </Button>
              <Button variant="outline" onClick={() => navigate('/meal-prep')}>
                <Utensils className="h-4 w-4 mr-2" />
                Log Meal
              </Button>
              <Button variant="outline" onClick={() => navigate('/workout')}>
                <Zap className="h-4 w-4 mr-2" />
                Start Workout
              </Button>
              <Button variant="outline" onClick={() => navigate('/life-blueprint')}>
                <TrendingUp className="h-4 w-4 mr-2" />
                Life Blueprint
              </Button>
              <Button variant="outline" onClick={() => navigate('/tracking')}>
                <Target className="h-4 w-4 mr-2" />
                Tracking Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
