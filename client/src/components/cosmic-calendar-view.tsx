// Cosmic calendar — a real day/week/month calendar (like the main Life
// Timeline calendar) showing per-day moon phases and celestial events from
// /api/cosmic/calendar. Tapping a day opens a detail sheet.
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface CosmicEvent {
  date: string;
  type: string;
  label: string;
  description: string;
  planet?: string;
  sign?: string;
  prompt: string;
}

interface CosmicDay {
  date: string;
  phase: string;
  emoji: string;
  illumination: number;
}

interface CalendarResponse {
  start: string;
  end: string;
  events: CosmicEvent[];
  days?: CosmicDay[];
}

type CalView = "day" | "week" | "month";

function iso(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function eventBadgeVariant(type: string): "secondary" | "destructive" | "outline" {
  if (type === "new_moon" || type === "full_moon" || type === "first_quarter" || type === "last_quarter") return "secondary";
  if (type === "retrograde_start") return "destructive";
  return "outline";
}

function eventBadgeLabel(type: string): string {
  const MAP: Record<string, string> = {
    new_moon: "moon", full_moon: "moon", first_quarter: "moon", last_quarter: "moon",
    retrograde_start: "retrograde", retrograde_end: "direct",
    ingress: "ingress", major_aspect: "aspect", season: "season",
  };
  return MAP[type] ?? type;
}

export function CosmicCalendarView() {
  const today = new Date();
  const [view, setView] = useState<CalView>("month");
  const [anchor, setAnchor] = useState<Date>(today);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Visible range per view
  const { rangeStart, rangeEnd } = useMemo(() => {
    if (view === "month") {
      return { rangeStart: startOfMonth(anchor), rangeEnd: endOfMonth(anchor) };
    }
    if (view === "week") {
      return { rangeStart: startOfWeek(anchor), rangeEnd: endOfWeek(anchor) };
    }
    return { rangeStart: anchor, rangeEnd: anchor };
  }, [view, anchor]);

  const startStr = iso(rangeStart);
  const endStr = iso(rangeEnd);

  // Viewer's UTC offset (minutes) so the server samples moon phases at the
  // viewer's local noon, keeping phases aligned with their calendar day.
  const tzOffset = new Date().getTimezoneOffset();

  const { data, isLoading, isError, refetch } = useQuery<CalendarResponse>({
    queryKey: ["/api/cosmic/calendar", startStr, endStr, tzOffset],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/cosmic/calendar?start=${startStr}&end=${endStr}&tz=${tzOffset}`);
      return res.json();
    },
    staleTime: 60 * 60 * 1000,
    retry: 2,
  });

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CosmicEvent[]>();
    for (const e of data?.events ?? []) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return map;
  }, [data]);

  const daysByDate = useMemo(() => {
    const map = new Map<string, CosmicDay>();
    for (const d of data?.days ?? []) map.set(d.date, d);
    return map;
  }, [data]);

  const navigate = (dir: 1 | -1) => {
    if (view === "month") setAnchor(a => addMonths(a, dir));
    else if (view === "week") setAnchor(a => addWeeks(a, dir));
    else setAnchor(a => addDays(a, dir));
  };

  const headerLabel =
    view === "month"
      ? format(anchor, "MMMM yyyy")
      : view === "week"
        ? `${format(rangeStart, "MMM d")} – ${format(rangeEnd, "MMM d")}`
        : format(anchor, "EEE, MMM d");

  const renderDayDetail = (dateStr: string) => {
    const day = daysByDate.get(dateStr);
    const events = eventsByDate.get(dateStr) ?? [];
    return (
      <div className="space-y-3">
        {day && (
          <div className="flex items-center gap-3 rounded-xl bg-primary/5 border border-primary/20 p-3">
            <span className="text-3xl" aria-hidden="true">{day.emoji}</span>
            <div>
              <p className="font-semibold text-sm">{day.phase}</p>
              <p className="text-xs text-muted-foreground">{Math.round(day.illumination * 100)}% illuminated</p>
            </div>
          </div>
        )}
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No major celestial events this day.</p>
        ) : (
          events.map(evt => (
            <div key={`${evt.date}-${evt.type}-${evt.planet ?? ""}-${evt.label}`} className="rounded-xl border p-3 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-sm">{evt.label}</p>
                <Badge variant={eventBadgeVariant(evt.type)} className="text-xs capitalize shrink-0">
                  {eventBadgeLabel(evt.type)}
                </Badge>
              </div>
              <p className="text-xs">{evt.description}</p>
              <p className="text-xs text-primary italic">✦ {evt.prompt}</p>
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3" data-testid="cosmic-calendar-view">
      {/* View toggle + navigation, mirroring the main calendar */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1 rounded-lg bg-muted p-0.5" role="group" aria-label="Calendar view">
          {(["day", "week", "month"] as const).map(v => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors",
                view === v ? "bg-background shadow-sm text-foreground" : "text-muted-foreground",
              )}
              aria-pressed={view === v}
              data-testid={`cosmic-cal-view-${v}`}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 flex-1 justify-end">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)} aria-label="Previous" data-testid="cosmic-cal-prev">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <button
            type="button"
            className="text-sm font-medium min-w-[110px] text-center"
            onClick={() => setAnchor(new Date())}
            aria-label="Go to today"
            data-testid="cosmic-cal-label"
          >
            {headerLabel}
          </button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(1)} aria-label="Next" data-testid="cosmic-cal-next">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-72 w-full rounded-xl" />
      ) : isError ? (
        <div className="text-center py-6 space-y-2">
          <p className="text-sm text-muted-foreground">Could not load the cosmic calendar.</p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>Try again</Button>
        </div>
      ) : view === "month" ? (
        <div>
          <div className="grid grid-cols-7 text-center text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i}>{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-y-1">
            {/* Leading blanks */}
            {Array.from({ length: rangeStart.getDay() }).map((_, i) => <span key={`b${i}`} />)}
            {Array.from({ length: rangeEnd.getDate() }).map((_, i) => {
              const d = addDays(rangeStart, i);
              const dStr = iso(d);
              const day = daysByDate.get(dStr);
              const hasEvents = (eventsByDate.get(dStr)?.length ?? 0) > 0;
              const isToday = isSameDay(d, today);
              return (
                <button
                  key={dStr}
                  type="button"
                  onClick={() => setSelectedDate(dStr)}
                  className={cn(
                    "flex flex-col items-center gap-0.5 py-1.5 rounded-lg transition-colors hover-elevate",
                    isToday && "bg-primary text-primary-foreground",
                  )}
                  aria-label={`${format(d, "MMMM d")}${day ? `, ${day.phase}` : ""}`}
                  data-testid={`cosmic-cal-day-${dStr}`}
                >
                  <span className="text-sm font-medium leading-none">{d.getDate()}</span>
                  <span className="text-[13px] leading-none" aria-hidden="true">{day?.emoji ?? ""}</span>
                  <span className={cn("h-1 w-1 rounded-full", hasEvents ? (isToday ? "bg-primary-foreground" : "bg-primary") : "bg-transparent")} />
                </button>
              );
            })}
          </div>
        </div>
      ) : view === "week" ? (
        <div className="space-y-2">
          {Array.from({ length: 7 }).map((_, i) => {
            const d = addDays(rangeStart, i);
            const dStr = iso(d);
            const day = daysByDate.get(dStr);
            const events = eventsByDate.get(dStr) ?? [];
            const isToday = isSameDay(d, today);
            return (
              <button
                key={dStr}
                type="button"
                onClick={() => setSelectedDate(dStr)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-xl border p-3 text-left hover-elevate",
                  isToday && "border-primary/50 bg-primary/5",
                )}
                data-testid={`cosmic-cal-week-${dStr}`}
              >
                <div className="w-10 text-center shrink-0">
                  <p className="text-[10px] uppercase text-muted-foreground">{format(d, "EEE")}</p>
                  <p className={cn("text-lg font-semibold leading-tight", isToday && "text-primary")}>{d.getDate()}</p>
                </div>
                <span className="text-xl shrink-0" aria-hidden="true">{day?.emoji ?? ""}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">{day?.phase ?? ""}</p>
                  {events.length > 0 && (
                    <p className="text-[11px] text-muted-foreground truncate">
                      {events.map(e => e.label).join(" · ")}
                    </p>
                  )}
                </div>
                {events.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      ) : (
        // Day view — full detail inline
        renderDayDetail(iso(anchor))
      )}

      {/* Day detail sheet (month/week taps) */}
      <Sheet open={!!selectedDate} onOpenChange={(open) => { if (!open) setSelectedDate(null); }}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto">
          <SheetHeader className="text-left mb-3">
            <SheetTitle>
              {selectedDate ? format(new Date(selectedDate + "T12:00:00"), "EEEE, MMMM d") : ""}
            </SheetTitle>
            <SheetDescription className="sr-only">Moon phase and celestial events for this day</SheetDescription>
          </SheetHeader>
          {selectedDate && renderDayDetail(selectedDate)}
        </SheetContent>
      </Sheet>
    </div>
  );
}
