import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import type { CalendarEvent } from "@shared/schema";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarPlansPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { data: events = [], isLoading, isError } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar"],
    retry: false,
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const selectedDateEvents = events.filter((event) => {
    const eventDate = new Date(event.startTime);
    return isSameDay(eventDate, selectedDate);
  });

  const getEventsForDay = (day: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.startTime);
      return isSameDay(eventDate, day);
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="flex items-center justify-between gap-4 p-4 border-b">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="font-display font-bold text-xl">Calendar</h1>
        </div>
        <Button size="sm" data-testid="button-add-event">
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row">
        <div className="flex-1 p-4 border-b lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              data-testid="button-prev-month"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="font-display font-semibold text-lg">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              data-testid="button-next-month"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(day)}
                  className={`
                    aspect-square p-1 rounded-md text-sm relative transition-colors
                    ${isCurrentMonth ? "" : "text-muted-foreground/40"}
                    ${isSelected ? "bg-primary text-primary-foreground" : "hover-elevate"}
                    ${isToday && !isSelected ? "ring-1 ring-primary" : ""}
                  `}
                  data-testid={`button-day-${format(day, "yyyy-MM-dd")}`}
                >
                  <span className="block">{format(day, "d")}</span>
                  {dayEvents.length > 0 && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {dayEvents.slice(0, 3).map((_, i) => (
                        <div
                          key={i}
                          className={`w-1 h-1 rounded-full ${
                            isSelected ? "bg-primary-foreground" : "bg-primary"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="w-full lg:w-80 p-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">
                {format(selectedDate, "EEEE, MMMM d")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDateEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No events scheduled
                </p>
              ) : (
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {selectedDateEvents.map((event) => (
                      <div
                        key={event.id}
                        className="p-3 rounded-md bg-muted/50"
                        data-testid={`event-${event.id}`}
                      >
                        <div className="font-medium text-sm">{event.title}</div>
                        {event.startTime && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(event.startTime), "h:mm a")}
                            {event.endTime && (
                              <> - {format(new Date(event.endTime), "h:mm a")}</>
                            )}
                          </div>
                        )}
                        {event.dimensionTags && event.dimensionTags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {event.dimensionTags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
