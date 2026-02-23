import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageHeader } from "@/components/page-header";
import {
  Calendar,
  Clock,
  ChevronRight,
  Dumbbell,
  Utensils,
  Heart,
  CheckSquare,
  Sparkles,
  Sun,
  Moon,
} from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  format,
  startOfWeek,
  addDays,
  isToday,
  parseISO,
} from "date-fns";
import type { CalendarEvent } from "@shared/schema";

const DAY_ABBREV = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const EVENT_TYPE_CONFIG: Record<string, { icon: typeof Calendar; colorClass: string; label: string }> = {
  workout: { icon: Dumbbell, colorClass: "text-blue-500", label: "Workout" },
  meal: { icon: Utensils, colorClass: "text-emerald-500", label: "Meal" },
  routine: { icon: Heart, colorClass: "text-purple-500", label: "Routine" },
  event: { icon: Calendar, colorClass: "text-sky-500", label: "Event" },
  task: { icon: CheckSquare, colorClass: "text-yellow-500", label: "Task" },
  wake_up: { icon: Sun, colorClass: "text-amber-500", label: "Morning" },
  wind_down: { icon: Moon, colorClass: "text-indigo-500", label: "Evening" },
  meditation: { icon: Sparkles, colorClass: "text-pink-500", label: "Meditation" },
};

/** Max blocks shown per day in the overview grid */
const MAX_BLOCKS_PER_DAY = 3;

function getEventConfig(type: string | null | undefined) {
  return EVENT_TYPE_CONFIG[type ?? "event"] ?? EVENT_TYPE_CONFIG.event;
}

function formatShortTime(isoOrTime: string): string {
  try {
    const d = parseISO(isoOrTime);
    return format(d, "h:mma");
  } catch {
    // Not an ISO string – try treating as "HH:mm"
    const parts = isoOrTime.split(":");
    if (parts.length >= 2) {
      const h = parseInt(parts[0], 10);
      const m = parts[1].padStart(2, "0");
      if (!Number.isNaN(h)) {
        const period = h >= 12 ? "pm" : "am";
        const h12 = h % 12 || 12;
        return `${h12}:${m}${period}`;
      }
    }
    return "—";
  }
}

function dateKeyOf(isoOrTime: string): string {
  try {
    return format(parseISO(isoOrTime), "yyyy-MM-dd");
  } catch {
    // If the value is not a parseable ISO datetime, return empty so it is
    // excluded from day-keyed grouping rather than silently placed on a wrong day.
    return "";
  }
}

export default function WeekSchedulePage() {
  const [, setLocation] = useLocation();
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 0 })
  );

  const { data: events = [], isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar"],
  });

  /** The 7 days of the current week */
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  /** Map of "yyyy-MM-dd" → CalendarEvent[] (sorted by start time) */
  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const day of weekDays) {
      const key = format(day, "yyyy-MM-dd");
      map[key] = [];
    }
    for (const ev of events) {
      const key = dateKeyOf(ev.startTime);
      if (map[key]) {
        map[key].push(ev);
      }
    }
    // Sort each day by start time
    for (const key of Object.keys(map)) {
      map[key].sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
    }
    return map;
  }, [events, weekDays]);

  const prevWeek = () => setWeekStart((d) => addDays(d, -7));
  const nextWeek = () => setWeekStart((d) => addDays(d, 7));
  const goToday = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));

  const handleDayClick = (day: Date) => {
    // Navigate to daily-schedule with the day index (0=Sun, 6=Sat)
    const dayIndex = day.getDay();
    setLocation(`/daily-schedule?day=${dayIndex}`);
  };

  const handleEventClick = (ev: CalendarEvent) => {
    if (ev.linkedRoute) {
      setLocation(
        ev.linkedId
          ? `${ev.linkedRoute}?selected=${ev.linkedId}`
          : ev.linkedRoute
      );
      return;
    }
    // Fall back: go to daily-schedule focused on this event
    // Guard against time-only strings (e.g. "09:00") that parseISO can't resolve to a full date
    const looksLikeIsoDate =
      typeof ev.startTime === "string" &&
      (/\d{4}-\d{2}-\d{2}/.test(ev.startTime) || ev.startTime.includes("T"));
    let dayIndex: number;
    if (looksLikeIsoDate) {
      try {
        const parsed = parseISO(ev.startTime);
        dayIndex = isNaN(parsed.getTime()) ? new Date().getDay() : parsed.getDay();
      } catch {
        dayIndex = new Date().getDay();
      }
    } else {
      dayIndex = new Date().getDay();
    }
    setLocation(`/daily-schedule?day=${dayIndex}&selected=${ev.id}`);
  };

  const weekLabel = `${format(weekStart, "MMM d")} – ${format(addDays(weekStart, 6), "MMM d, yyyy")}`;

  return (
    <div className="flex flex-col h-full bg-background">
      <PageHeader
        title="Week Overview"
        rightContent={
          <Button size="sm" variant="outline" onClick={goToday} data-testid="button-go-today">
            Today
          </Button>
        }
      />

      <ScrollArea className="flex-1 overflow-auto">
        <div className="p-4 max-w-2xl mx-auto space-y-4 pb-8">

          {/* Week navigation */}
          <div className="flex items-center justify-between">
            <Button size="icon" variant="ghost" onClick={prevWeek} data-testid="button-prev-week">
              <ChevronRight className="w-4 h-4 rotate-180" />
            </Button>
            <span className="text-sm font-medium text-muted-foreground">{weekLabel}</span>
            <Button size="icon" variant="ghost" onClick={nextWeek} data-testid="button-next-week">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* 7-day overview grid */}
          {isLoading ? (
            <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-28 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-7 gap-1.5" data-testid="week-grid">
              {weekDays.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const dayEvents = eventsByDay[key] ?? [];
                const topBlocks = dayEvents.slice(0, MAX_BLOCKS_PER_DAY);
                const overflow = dayEvents.length - MAX_BLOCKS_PER_DAY;
                const today = isToday(day);

                return (
                  <button
                    key={key}
                    className={`flex flex-col gap-1 p-1.5 rounded-xl border text-left transition-all hover:bg-accent/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                      ${today ? "border-primary bg-primary/5" : "border-border bg-card"}`}
                    onClick={() => handleDayClick(day)}
                    data-testid={`day-cell-${key}`}
                  >
                    {/* Day label */}
                    <div className="flex flex-col items-center mb-0.5">
                      <span className={`text-[10px] font-semibold uppercase ${today ? "text-primary" : "text-muted-foreground"}`}>
                        {DAY_ABBREV[day.getDay()]}
                      </span>
                      <span className={`text-sm font-bold leading-none ${today ? "text-primary" : "text-foreground"}`}>
                        {format(day, "d")}
                      </span>
                    </div>

                    {/* Top blocks */}
                    <div className="space-y-0.5 flex-1 min-h-0">
                      {topBlocks.map((ev) => {
                        const cfg = getEventConfig(ev.eventType);
                        const Icon = cfg.icon;
                        return (
                          <div
                            key={ev.id}
                            className="flex items-center gap-0.5 overflow-hidden"
                            title={ev.title}
                          >
                            <Icon
                              className={`w-2.5 h-2.5 shrink-0 ${cfg.colorClass}`}
                              aria-hidden="true"
                            />
                            <span className="sr-only">{cfg.label} event</span>
                            <span className="text-[9px] leading-tight truncate text-foreground/80">
                              {ev.title}
                            </span>
                          </div>
                        );
                      })}
                      {overflow > 0 && (
                        <span className="text-[9px] text-muted-foreground">+{overflow} more</span>
                      )}
                      {dayEvents.length === 0 && (
                        <span className="text-[9px] text-muted-foreground/50">—</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Day detail panels (expanded day timeline summary) */}
          <div className="space-y-3" data-testid="day-detail-list">
            {weekDays.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayEvents = eventsByDay[key] ?? [];
              if (dayEvents.length === 0) return null;

              return (
                <Card key={key} data-testid={`day-panel-${key}`}>
                  <CardContent className="p-3 space-y-2">
                    {/* Day header */}
                    <button
                      className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
                      onClick={() => handleDayClick(day)}
                      data-testid={`day-panel-header-${key}`}
                    >
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={isToday(day) ? "default" : "outline"}
                          className="text-xs"
                        >
                          {format(day, "EEE, MMM d")}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {dayEvents.length} block{dayEvents.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>

                    {/* Top blocks with time */}
                    {dayEvents.slice(0, MAX_BLOCKS_PER_DAY).map((ev) => {
                      const cfg = getEventConfig(ev.eventType);
                      const Icon = cfg.icon;
                      const hasLink = !!(ev.linkedRoute || ev.linkedId);

                      return (
                        <button
                          key={ev.id}
                          className={`w-full flex items-center gap-2 py-1 rounded-md transition-colors text-left ${hasLink ? "hover:bg-accent/50 cursor-pointer" : "cursor-default"}`}
                          onClick={() => hasLink && handleEventClick(ev)}
                          data-testid={`event-row-${ev.id}`}
                        >
                          <Icon className={`w-4 h-4 shrink-0 ${cfg.colorClass}`} />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium truncate block">{ev.title}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {formatShortTime(ev.startTime)}
                          </div>
                          {hasLink && (
                            <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                          )}
                        </button>
                      );
                    })}

                    {dayEvents.length > MAX_BLOCKS_PER_DAY && (
                      <button
                        className="text-xs text-primary hover:underline w-full text-left pl-6"
                        onClick={() => handleDayClick(day)}
                        data-testid={`see-all-${key}`}
                      >
                        See all {dayEvents.length} blocks →
                      </button>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {!isLoading && weekDays.every((d) => (eventsByDay[format(d, "yyyy-MM-dd")] ?? []).length === 0) && (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="mb-1">Nothing scheduled this week</p>
                <p className="text-sm">
                  Add events via{" "}
                  <button
                    className="underline text-primary"
                    onClick={() => setLocation("/daily-schedule")}
                  >
                    Daily Schedule
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
