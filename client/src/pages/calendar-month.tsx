import { useState } from "react";
import type { ComponentType } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth,
  isSameDay, addMonths, subMonths, addDays, startOfWeek, endOfWeek,
  addWeeks, subWeeks, isToday, getHours,
} from "date-fns";
import type { CalendarEvent, CalendarEventTask } from "@shared/schema";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  ChevronLeft, ChevronRight, ChevronDown, Plus, Dumbbell, Utensils,
  Brain, Clock, Calendar, Sparkles, Check, Loader2,
} from "lucide-react";

type CalendarView = "day" | "week" | "month";

const EVENT_CONFIG: Record<string, { dot: string; pill: string; icon: ComponentType<{ className?: string }> }> = {
  workout:  { dot: "bg-green-500",  pill: "bg-green-500/15 border border-green-500/30 text-green-700 dark:text-green-300",  icon: Dumbbell },
  meal:     { dot: "bg-orange-500", pill: "bg-orange-500/15 border border-orange-500/30 text-orange-700 dark:text-orange-300", icon: Utensils },
  work:     { dot: "bg-violet-500", pill: "bg-violet-500/15 border border-violet-500/30 text-violet-700 dark:text-violet-300", icon: Brain },
  event:    { dot: "bg-blue-500",   pill: "bg-blue-500/15 border border-blue-500/30 text-blue-700 dark:text-blue-300",   icon: Calendar },
  routine:  { dot: "bg-purple-500", pill: "bg-purple-500/15 border border-purple-500/30 text-purple-700 dark:text-purple-300", icon: Sparkles },
};
const defaultConfig = EVENT_CONFIG.event;

const DIM_COLORS: Record<string, string> = {
  physical:      "text-emerald-600 bg-emerald-500/10",
  intellectual:  "text-violet-600 bg-violet-500/10",
  environmental: "text-sky-600 bg-sky-500/10",
  spiritual:     "text-indigo-600 bg-indigo-500/10",
  financial:     "text-amber-600 bg-amber-500/10",
  social:        "text-pink-600 bg-pink-500/10",
  emotional:     "text-rose-600 bg-rose-500/10",
};

function eventConfig(type?: string | null) {
  return EVENT_CONFIG[type ?? ""] ?? defaultConfig;
}

function formatTime(isoStr: string) {
  const d = new Date(isoStr);
  return format(d, "h:mm a");
}

// ─── Month View ──────────────────────────────────────────────────────────────
function MonthView({
  currentDate, events, onDayClick,
}: { currentDate: Date; events: CalendarEvent[]; onDayClick: (d: Date) => void }) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const paddingDays = Array(monthStart.getDay()).fill(null);

  const getEventsForDay = (day: Date) =>
    events.filter(e => isSameDay(new Date(e.startTime), day));

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {paddingDays.map((_, i) => <div key={`p-${i}`} />)}
        {days.map(day => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isDayToday = isToday(day);
          return (
            <button
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              data-testid={`day-${format(day, "yyyy-MM-dd")}`}
              className={`
                flex flex-col items-center py-1.5 rounded-xl transition-all active:scale-95
                ${isDayToday ? "bg-primary text-primary-foreground" : isCurrentMonth ? "hover:bg-muted" : "opacity-30"}
              `}
            >
              <span className={`text-sm font-medium leading-none mb-1 ${isDayToday ? "text-primary-foreground" : "text-foreground"}`}>
                {format(day, "d")}
              </span>
              <div className="flex gap-0.5 justify-center flex-wrap min-h-[8px]">
                {dayEvents.slice(0, 3).map((e, i) => (
                  <span key={i} className={`w-1.5 h-1.5 rounded-full ${eventConfig(e.eventType).dot}`} />
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-[9px] text-muted-foreground leading-none">+{dayEvents.length - 3}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Week View ───────────────────────────────────────────────────────────────
function WeekView({
  currentDate, events, onDayClick,
}: { currentDate: Date; events: CalendarEvent[]; onDayClick: (d: Date) => void }) {
  const weekStart = startOfWeek(currentDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getEventsForDay = (day: Date) =>
    events.filter(e => isSameDay(new Date(e.startTime), day))
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  return (
    <div className="space-y-1">
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {days.map(day => {
          const isDayToday = isToday(day);
          return (
            <button
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className={`flex flex-col items-center py-2 rounded-xl transition-all ${isDayToday ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              <span className={`text-[10px] font-medium uppercase ${isDayToday ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                {format(day, "EEE")}
              </span>
              <span className={`text-sm font-semibold mt-0.5 ${isDayToday ? "text-primary-foreground" : "text-foreground"}`}>
                {format(day, "d")}
              </span>
            </button>
          );
        })}
      </div>

      {/* Events per day column */}
      <div className="grid grid-cols-7 gap-1 items-start">
        {days.map(day => {
          const dayEvents = getEventsForDay(day);
          return (
            <div key={day.toISOString()} className="space-y-1 min-h-[60px]">
              {dayEvents.map(evt => {
                const cfg = eventConfig(evt.eventType);
                return (
                  <div
                    key={evt.id}
                    onClick={() => onDayClick(day)}
                    className={`${cfg.pill} rounded-md px-1 py-0.5 cursor-pointer text-[10px] font-medium leading-tight truncate`}
                  >
                    {format(new Date(evt.startTime), "h:mma")}
                    <br />
                    <span className="opacity-90">{evt.title}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Day View ────────────────────────────────────────────────────────────────
function DayView({ currentDate, events }: { currentDate: Date; events: CalendarEvent[] }) {
  const dayEvents = events
    .filter(e => isSameDay(new Date(e.startTime), currentDate))
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  if (dayEvents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Calendar className="w-10 h-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">Nothing scheduled</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Tap + to add an event</p>
      </div>
    );
  }

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const firstEvent = dayEvents[0];
  const firstHour = Math.max(0, getHours(new Date(firstEvent.startTime)) - 1);

  return (
    <div className="space-y-0">
      {hours.filter(h => h >= firstHour).map(hour => {
        const hourEvents = dayEvents.filter(e => getHours(new Date(e.startTime)) === hour);
        return (
          <div key={hour} className="flex gap-3 min-h-[52px]">
            <span className="w-10 text-right text-xs text-muted-foreground pt-1 shrink-0">
              {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
            </span>
            <div className="flex-1 border-t border-border/40 pt-1 space-y-1">
              {hourEvents.map(evt => {
                const cfg = eventConfig(evt.eventType);
                const Icon = cfg.icon;
                const dim = evt.dimensionTags?.[0];
                return (
                  <div key={evt.id} className={`${cfg.pill} rounded-lg px-3 py-2 flex items-start gap-2`}>
                    <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-70" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{evt.title}</p>
                      <p className="text-[10px] opacity-70 mt-0.5">
                        {formatTime(evt.startTime)} – {evt.endTime ? formatTime(evt.endTime) : "–"}
                      </p>
                    </div>
                    {dim && (
                      <Badge variant="outline" className={`text-[9px] shrink-0 ${DIM_COLORS[dim] ?? ""}`}>
                        {dim}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Event Tasks (loaded lazily when an event is expanded) ───────────────────
function EventTasksSection({ eventId }: { eventId: string }) {
  const { data: tasks = [], isLoading } = useQuery<CalendarEventTask[]>({
    queryKey: ["/api/calendar", eventId, "tasks"],
    queryFn: async () => {
      const res = await fetch(`/api/calendar/${eventId}/tasks`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2 opacity-50">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span className="text-xs">Loading steps…</span>
      </div>
    );
  }
  if (tasks.length === 0) {
    return <p className="text-xs opacity-50 py-2">No steps recorded for this block.</p>;
  }
  return (
    <ul className="mt-2 space-y-1.5">
      {tasks.map((task, i) => (
        <li key={task.id} className="flex items-start gap-2">
          <div className="mt-0.5 w-4 h-4 rounded-full border border-current/25 flex items-center justify-center shrink-0">
            {task.isCompleted
              ? <Check className="w-2.5 h-2.5 opacity-70" />
              : <span className="text-[9px] font-bold opacity-40">{i + 1}</span>
            }
          </div>
          <span className="text-xs opacity-80 leading-snug">{task.title}</span>
        </li>
      ))}
    </ul>
  );
}

// ─── Day Sheet ───────────────────────────────────────────────────────────────
function DaySheet({
  date, events, navigate, onClose,
}: { date: Date; events: CalendarEvent[]; navigate: (path: string) => void; onClose: () => void }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <>
      <SheetHeader className="px-4 pt-2 pb-3 border-b shrink-0">
        <SheetTitle className="text-left">{format(date, "EEEE, MMMM d")}</SheetTitle>
        <SheetDescription className="text-left text-xs text-muted-foreground">
          {events.length === 0 ? "No events scheduled" : `${events.length} event${events.length === 1 ? "" : "s"} · Tap any to see steps`}
        </SheetDescription>
      </SheetHeader>

      {/* iOS-compatible scroll: native overflow-y-auto with -webkit touch */}
      <div
        className="px-4 py-3 space-y-2"
        style={{
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          maxHeight: "calc(75vh - 72px)",
        }}
      >
        {events.length === 0 ? (
          <div className="py-10 text-center">
            <Calendar className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nothing scheduled for this day.</p>
            <p className="text-xs text-muted-foreground/50 mt-1">Re-import your life system to populate your schedule.</p>
          </div>
        ) : (
          events.map(evt => {
            const cfg = eventConfig(evt.eventType);
            const Icon = cfg.icon;
            const dim = evt.dimensionTags?.[0];
            const hasLink = !!evt.linkedRoute;
            const isExpanded = expandedId === String(evt.id);
            return (
              <div
                key={evt.id}
                className={`${cfg.pill} rounded-xl overflow-hidden transition-all`}
                data-testid={`event-card-${evt.id}`}
              >
                {/* Tap row — toggles expanded steps */}
                <button
                  className="w-full text-left px-4 py-3 flex items-start gap-3"
                  onClick={() => setExpandedId(isExpanded ? null : String(evt.id))}
                >
                  <div className="mt-0.5 shrink-0">
                    <Icon className="w-4 h-4 opacity-70" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-snug">{evt.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 opacity-60 shrink-0" />
                      <span className="text-xs opacity-70">
                        {formatTime(evt.startTime)}{evt.endTime ? ` – ${formatTime(evt.endTime)}` : ""}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {dim && (
                      <Badge variant="outline" className={`text-[10px] ${DIM_COLORS[dim] ?? ""}`}>
                        {dim}
                      </Badge>
                    )}
                    <ChevronDown className={`w-3.5 h-3.5 opacity-40 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                  </div>
                </button>

                {/* Expanded: show bullet-point steps + optional nav link */}
                {isExpanded && (
                  <div className="px-4 pb-3 border-t border-black/[0.06] dark:border-white/[0.06]">
                    <EventTasksSection eventId={String(evt.id)} />
                    {hasLink && (
                      <button
                        className="mt-3 flex items-center gap-1 text-xs font-medium opacity-60 hover:opacity-100 transition-opacity"
                        onClick={() => { onClose(); navigate(evt.linkedRoute!); }}
                        data-testid={`event-nav-${evt.id}`}
                      >
                        Open in section
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
        {/* Bottom padding so last item clears the rounded sheet edge */}
        <div className="h-4" />
      </div>
    </>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function CalendarMonthPage() {
  const [, navigate] = useLocation();
  const [view, setView] = useState<CalendarView>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: events = [] } = useQuery<CalendarEvent[]>({ queryKey: ["/api/calendar"] });

  const getEventsForDay = (day: Date) =>
    events
      .filter(e => isSameDay(new Date(e.startTime), day))
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const handleDayClick = (day: Date) => {
    if (view === "day") return;
    setSelectedDate(day);
    setSheetOpen(true);
  };

  const goBack = () => {
    if (view === "month") setCurrentDate(prev => subMonths(prev, 1));
    else if (view === "week") setCurrentDate(prev => subWeeks(prev, 1));
    else setCurrentDate(prev => addDays(prev, -1));
  };
  const goForward = () => {
    if (view === "month") setCurrentDate(prev => addMonths(prev, 1));
    else if (view === "week") setCurrentDate(prev => addWeeks(prev, 1));
    else setCurrentDate(prev => addDays(prev, 1));
  };

  const headerLabel =
    view === "month" ? format(currentDate, "MMMM yyyy") :
    view === "week"  ? `${format(startOfWeek(currentDate), "MMM d")} – ${format(endOfWeek(currentDate), "MMM d")}` :
    format(currentDate, "EEE, MMM d");

  return (
    <div className="flex flex-col h-full bg-background">
      <PageHeader
        title="Calendar"
        rightContent={
          <Button
            size="icon"
            variant="ghost"
            onClick={() => navigate("/calendar/manage")}
            data-testid="button-manage-calendar"
          >
            <Plus className="w-5 h-5" />
          </Button>
        }
      />

      {/* View toggle + nav */}
      <div className="px-4 py-2 flex items-center justify-between gap-2 border-b border-border/40">
        {/* Segmented control */}
        <div className="flex bg-muted rounded-lg p-0.5 gap-0.5">
          {(["day", "week", "month"] as CalendarView[]).map(v => (
            <button
              key={v}
              onClick={() => { setView(v); if (v === "day") { setCurrentDate(new Date()); } }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                view === v ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`toggle-view-${v}`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        {/* Month/Week/Day nav */}
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={goBack} data-testid="button-prev">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs font-medium text-muted-foreground min-w-[100px] text-center">{headerLabel}</span>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={goForward} data-testid="button-next">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar body */}
      <ScrollArea className="flex-1">
        <div className="px-3 py-3">
          {view === "month" && (
            <MonthView currentDate={currentDate} events={events} onDayClick={handleDayClick} />
          )}
          {view === "week" && (
            <WeekView currentDate={currentDate} events={events} onDayClick={handleDayClick} />
          )}
          {view === "day" && (
            <DayView currentDate={currentDate} events={events} />
          )}
        </div>
      </ScrollArea>

      {/* Day events bottom sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl p-0 max-h-[80vh]">
          {selectedDate && (
            <DaySheet
              date={selectedDate}
              events={getEventsForDay(selectedDate)}
              navigate={navigate}
              onClose={() => setSheetOpen(false)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
