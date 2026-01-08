import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import {
  Zap,
  Heart,
  MessageSquare,
  Sun,
  Moon,
  Calendar,
  Circle,
  Clock,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import type { MoodLog, CalendarEvent, Routine, ScheduleBlock } from "@shared/schema";

function formatTime12Hour(time24: string): string {
  if (!time24) return "";
  const [hours, minutes] = time24.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
}

function TodayHubSkeleton() {
  return (
    <div className="space-y-6 p-4 md:p-6 max-w-4xl mx-auto">
      <Skeleton className="h-10 w-48" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-48" />
      <Skeleton className="h-32" />
    </div>
  );
}

export default function TodayHubPage() {
  const today = new Date();
  const dayOfWeek = today.getDay();

  const { data: moodData } = useQuery<MoodLog | null>({
    queryKey: ["/api/mood/today"],
  });

  const { data: calendarEvents = [] } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar"],
  });

  const { data: scheduleBlocks = [] } = useQuery<ScheduleBlock[]>({
    queryKey: ["/api/schedule"],
  });

  const { data: routines = [] } = useQuery<Routine[]>({
    queryKey: ["/api/routines"],
  });

  const { data: dashboardData, isLoading } = useQuery<{ systemName: string }>({
    queryKey: ["/api/dashboard"],
  });

  if (isLoading) {
    return <TodayHubSkeleton />;
  }

  const energyLevel = moodData?.energyLevel ?? null;
  const moodLevel = moodData?.moodLevel ?? null;

  const todaysBlocks = scheduleBlocks.filter((block) => block.dayOfWeek === dayOfWeek);

  const todaysEvents = calendarEvents.filter((event) => {
    const eventDate = new Date(event.startTime);
    return (
      eventDate.getDate() === today.getDate() &&
      eventDate.getMonth() === today.getMonth() &&
      eventDate.getFullYear() === today.getFullYear()
    );
  });

  const morningRoutines = routines.filter((r) => {
    const tags = r.dimensionTags || [];
    return r.isActive && (tags.includes("morning") || r.name.toLowerCase().includes("morning"));
  });
  
  const eveningRoutines = routines.filter((r) => {
    const tags = r.dimensionTags || [];
    return r.isActive && (tags.includes("evening") || tags.includes("wind-down") || r.name.toLowerCase().includes("wind") || r.name.toLowerCase().includes("evening"));
  });

  const getEnergyColor = (level: number | null) => {
    if (level === null) return "text-muted-foreground";
    if (level >= 7) return "text-emerald-500";
    if (level >= 4) return "text-amber-500";
    return "text-rose-500";
  };

  const getEnergyLabel = (level: number | null) => {
    if (level === null) return "Not checked in";
    if (level >= 7) return "High energy";
    if (level >= 4) return "Moderate";
    return "Low energy";
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-4xl mx-auto">
      <PageHeader title="Today" />
      
      <p className="text-muted-foreground -mt-4">
        {today.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
      </p>

      <div className="grid grid-cols-2 gap-4">
        <Card data-testid="card-today-energy">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-chart-4/10 flex items-center justify-center">
                <Zap className={`h-5 w-5 ${getEnergyColor(energyLevel)}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Energy</p>
                <p className={`text-xl font-bold ${getEnergyColor(energyLevel)}`}>
                  {energyLevel !== null ? `${energyLevel}/10` : "--"}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {getEnergyLabel(energyLevel)}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-today-mood">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-chart-5/10 flex items-center justify-center">
                <Heart className="h-5 w-5 text-chart-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mood</p>
                <p className="text-xl font-bold">
                  {moodLevel !== null ? `${moodLevel}/10` : "--"}
                </p>
              </div>
            </div>
            {!moodData && (
              <Link href="/weekly-checkin">
                <Button variant="ghost" size="sm" className="mt-2 w-full" data-testid="button-checkin">
                  Check in
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-today-schedule">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today's Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {todaysBlocks.length === 0 && todaysEvents.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No scheduled blocks for today</p>
              <Link href="/calendar/schedule">
                <Button variant="outline" size="sm" className="mt-3" data-testid="button-add-schedule">
                  Add to schedule
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {todaysBlocks.map((block) => (
                <div
                  key={block.id}
                  className="flex items-center gap-3 p-3 rounded-md bg-muted/50"
                  data-testid={`schedule-block-${block.id}`}
                >
                  <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{block.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatTime12Hour(block.startTime)}
                      {block.endTime && ` - ${formatTime12Hour(block.endTime)}`}
                    </p>
                  </div>
                </div>
              ))}
              {todaysEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 p-3 rounded-md bg-muted/50"
                  data-testid={`calendar-event-${event.id}`}
                >
                  <div className="w-8 h-8 rounded-md bg-chart-1/10 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-chart-1" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{event.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatTime12Hour(event.startTime)}
                    </p>
                  </div>
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card data-testid="card-morning-routine">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sun className="h-5 w-5 text-amber-500" />
              Morning Routine
            </CardTitle>
          </CardHeader>
          <CardContent>
            {morningRoutines.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No morning routine set</p>
            ) : (
              <div className="space-y-2">
                {morningRoutines.slice(0, 3).map((routine) => (
                  <div key={routine.id} className="flex items-center gap-2">
                    <Circle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{routine.name}</span>
                  </div>
                ))}
                {morningRoutines.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    +{morningRoutines.length - 3} more
                  </p>
                )}
              </div>
            )}
            <Link href="/routines">
              <Button variant="ghost" size="sm" className="mt-2 w-full" data-testid="button-view-routines">
                View routines
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card data-testid="card-evening-routine">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Moon className="h-5 w-5 text-indigo-500" />
              Wind Down
            </CardTitle>
          </CardHeader>
          <CardContent>
            {eveningRoutines.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No evening routine set</p>
            ) : (
              <div className="space-y-2">
                {eveningRoutines.slice(0, 3).map((routine) => (
                  <div key={routine.id} className="flex items-center gap-2">
                    <Circle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{routine.name}</span>
                  </div>
                ))}
                {eveningRoutines.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    +{eveningRoutines.length - 3} more
                  </p>
                )}
              </div>
            )}
            <Link href="/routines">
              <Button variant="ghost" size="sm" className="mt-2 w-full" data-testid="button-view-wind-down">
                View routines
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-primary/5 border-primary/20" data-testid="card-talk-it-out">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Need to process something?</h3>
                <p className="text-sm text-muted-foreground">
                  Talk it out with DW and turn thoughts into action
                </p>
              </div>
            </div>
            <Link href="/">
              <Button data-testid="button-talk-it-out">
                Talk it out
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
