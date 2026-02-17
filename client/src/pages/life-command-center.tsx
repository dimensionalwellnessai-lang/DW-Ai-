import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/page-header";
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
  Plus,
} from "lucide-react";
import { getSwitchData, type SwitchId, type SwitchStatus } from "@/lib/switch-storage";
import { SWITCH_COLORS } from "@/lib/switch-colors";

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

// Helper function to get time-based greeting
function getTimeBasedGreeting(userName?: string): string {
  const hour = new Date().getHours();
  const name = userName || "";
  
  if (hour < 12) {
    return `Good Morning${name ? `, ${name}` : ""}`;
  } else if (hour < 17) {
    return `Good Afternoon${name ? `, ${name}` : ""}`;
  } else {
    return `Good Evening${name ? `, ${name}` : ""}`;
  }
}

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
  const [showWelcome, setShowWelcome] = useState(() => {
    return !localStorage.getItem('dw_welcome_dismissed');
  });

  // Helper function for keyboard navigation
  const handleKeyPress = (e: React.KeyboardEvent, callback: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      callback();
    }
  };

  // Fetch today's water logs
  const { data: waterLogs = [] } = useQuery<any[]>({
    queryKey: ['/api/water-logs'],
  });

  // Fetch today's meal logs
  const { data: mealLogs = [] } = useQuery<any[]>({
    queryKey: ['/api/meal-logs'],
  });

  // Fetch active goals
  const { data: goals = [] } = useQuery<any[]>({
    queryKey: ['/api/goals'],
  });

  // Fetch today's habits
  const { data: habits = [] } = useQuery<any[]>({
    queryKey: ['/api/habits'],
  });

  // Fetch upcoming calendar events
  const { data: calendarEvents = [], isLoading: eventsLoading } = useQuery<any[]>({
    queryKey: ['/api/calendar'],
  });

  // Get user data for personalized greeting
  const { data: authData } = useQuery<{ user: any } | null>({
    queryKey: ["/api/auth/me"],
    retry: false
  });
  const user = authData?.user;

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

  // Calculate "Focus Now" - most relevant next action
  const getFocusNowCard = () => {
    // Priority 1: Next calendar event in the next 2 hours
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const upcomingEvent = calendarEvents.find((event: any) => {
      const eventTime = event.startTime ? new Date(event.startTime) : null;
      return eventTime && eventTime > now && eventTime < twoHoursFromNow;
    });
    
    if (upcomingEvent) {
      return {
        title: "Next on your schedule",
        description: upcomingEvent.title,
        time: upcomingEvent.startTime,
        action: () => navigate('/calendar'),
        icon: Calendar,
        color: "text-blue-500",
        bg: "bg-blue-500/10"
      };
    }

    // Priority 2: Incomplete habit for today
    const incompleteHabit = habits.find((h: any) => h.isActive && !h.completedToday);
    if (incompleteHabit) {
      return {
        title: "Build your streak",
        description: incompleteHabit.title,
        time: null,
        action: () => navigate('/habits'),
        icon: CheckCircle2,
        color: "text-purple-500",
        bg: "bg-purple-500/10"
      };
    }

    // Priority 3: Active goal with lowest progress (use copy to avoid mutation)
    const lowestProgressGoal = [...activeGoals]
      .sort((a: any, b: any) => (a.progress || 0) - (b.progress || 0))[0];
    
    if (lowestProgressGoal) {
      return {
        title: "Continue your progress",
        description: lowestProgressGoal.title,
        time: null,
        action: () => navigate('/goals'),
        icon: Target,
        color: "text-green-500",
        bg: "bg-green-500/10"
      };
    }

    // Default: Encourage using DW
    return {
      title: "Ask DW for guidance",
      description: "Get personalized suggestions for what to focus on",
      time: null,
      action: () => navigate('/talk'),
      icon: Sparkles,
      color: "text-primary",
      bg: "bg-primary/10"
    };
  };

  const focusNow = getFocusNowCard();

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-background to-muted/20">
      <PageHeader title="Home" showBack={false} />
      <div className="flex-1 overflow-auto">
        <div className="container max-w-7xl mx-auto p-4 space-y-6">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2 pt-2 pb-2"
        >
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {getTimeBasedGreeting(user?.firstName || user?.systemName)}
          </h2>
          <p className="text-muted-foreground text-sm">{todayDate}</p>
        </motion.div>

        {/* Welcome Banner */}
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <h3 className="font-semibold">Welcome to DW.ai! 👋</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  This is your Life Command Center. Tap any card to explore, or start by building your Life Blueprint.
                </p>
                <div className="flex gap-2 mt-3 flex-wrap">
                  <Button size="sm" onClick={() => navigate('/life-blueprint')}>
                    Start Life Blueprint
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigate('/app-tour')}>
                    Take a Tour
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => {
                    localStorage.setItem('dw_welcome_dismissed', 'true');
                    setShowWelcome(false);
                  }}>
                    Dismiss
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Quick Stats Row - Compact Version */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card 
            onClick={() => navigate('/tracking')}
            className="cursor-pointer hover:bg-muted/50 transition-colors"
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Droplets className="h-5 w-5 text-blue-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Water</p>
                  <p className="text-lg font-bold">{todayWater} oz</p>
                </div>
              </div>
              <Progress value={(todayWater / 64) * 100} className="mt-2 h-1" />
            </CardContent>
          </Card>

          <Card 
            onClick={() => navigate('/tracking')}
            className="cursor-pointer hover:bg-muted/50 transition-colors"
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Utensils className="h-5 w-5 text-orange-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Calories</p>
                  <p className="text-lg font-bold">{todayCalories}</p>
                </div>
              </div>
              <Progress value={(todayCalories / 2000) * 100} className="mt-2 h-1" />
            </CardContent>
          </Card>

          <Card 
            onClick={() => navigate('/goals')}
            className="cursor-pointer hover:bg-muted/50 transition-colors"
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-green-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Goals</p>
                  <p className="text-lg font-bold">{activeGoals.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            onClick={() => navigate('/habits')}
            className="cursor-pointer hover:bg-muted/50 transition-colors"
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-purple-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Habits</p>
                  <p className="text-lg font-bold">{habits.filter((h: any) => h.isActive).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="today" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="goals">Goals</TabsTrigger>
            <TabsTrigger value="habits">Habits</TabsTrigger>
          </TabsList>

          {/* TODAY TAB */}
          <TabsContent value="today" className="space-y-6">
            {/* Today's Schedule with integrated Focus Now */}
            <Card className="hover:bg-muted/50 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Today's Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Focus Now - Integrated at top of schedule */}
                <div 
                  onClick={focusNow.action}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      focusNow.action();
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label="Focus Now: Click to view recommended next action"
                  className="cursor-pointer p-3 rounded-lg bg-primary/5 border border-primary/20 hover:border-primary/30 transition-all focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${focusNow.bg}`}>
                      <focusNow.icon className={`h-5 w-5 ${focusNow.color}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Focus Now
                      </p>
                      <h4 className="text-sm font-bold mt-0.5">{focusNow.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{focusNow.description}</p>
                    </div>
                    {focusNow.time && (
                      <Badge variant="outline" className="text-xs">
                        {new Date(focusNow.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* Schedule Events */}
                {eventsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : calendarEvents.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground mb-3">No events scheduled today</p>
                    <div className="flex gap-2 justify-center">
                      <Button size="sm" onClick={(e) => { e.stopPropagation(); navigate('/calendar'); }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Event
                      </Button>
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); navigate('/talk'); }}>
                        Ask DW
                      </Button>
                    </div>
                  </div>
                ) : (
                  <ScrollArea className="h-[250px]">
                    <div className="space-y-2">
                      {calendarEvents.slice(0, 5).map((event: any) => (
                        <div
                          key={event.id}
                          onClick={() => navigate('/calendar')}
                          className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted cursor-pointer transition-colors"
                        >
                          <div className="text-xs font-semibold text-muted-foreground min-w-[55px]">
                            {event.startTime || 'All day'}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{event.title}</p>
                            {event.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">{event.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* GOALS TAB */}
          <TabsContent value="goals" className="space-y-6">
            <Card onClick={() => navigate('/goals')} className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Active Goals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {activeGoals.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">No active goals yet</p>
                      <Button onClick={() => navigate('/goals')}>Create First Goal</Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activeGoals.map((goal: any) => (
                        <div key={goal.id} className="space-y-2">
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
          </TabsContent>

          {/* HABITS TAB */}
          <TabsContent value="habits" className="space-y-6">
            <Card onClick={() => navigate('/habits')} className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Today's Habits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {habits.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">No habits set up yet</p>
                      <div className="flex gap-2 justify-center">
                        <Button onClick={() => navigate('/habits')}>Create First Habit</Button>
                        <Button variant="outline" onClick={() => navigate('/browse')}>
                          Browse Suggested Habits
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {habits.slice(0, 8).map((habit: any) => (
                        <div
                          key={habit.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
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
          </TabsContent>

          
        </Tabs>

        {/* Quick Actions - Improved positioning */}
        <Card className="sticky bottom-4 shadow-lg">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap gap-2 justify-center">
              <Button onClick={() => navigate('/talk')} size="sm">
                <Sparkles className="h-4 w-4 mr-2" />
                Ask DW
              </Button>
              <Button variant="outline" onClick={() => navigate('/meal-prep')} size="sm">
                <Utensils className="h-4 w-4 mr-2" />
                Log Meal
              </Button>
              <Button variant="outline" onClick={() => navigate('/workout')} size="sm">
                <Zap className="h-4 w-4 mr-2" />
                Workout
              </Button>
              <Button variant="outline" onClick={() => navigate('/life-blueprint')} size="sm">
                <TrendingUp className="h-4 w-4 mr-2" />
                Blueprint
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}
