import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { CalendarEvent } from "@shared/schema";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from "date-fns";

const EVENT_COLORS: Record<string, string> = {
  workout: "bg-green-500",
  meal: "bg-orange-500",
  routine: "bg-purple-500",
  event: "bg-blue-500",
  task: "bg-yellow-500",
};

export default function CalendarMonthPage() {
  const [, setLocation] = useLocation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { data: events } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar/events"],
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const firstDayOfWeek = monthStart.getDay();
  const paddingDays = Array(firstDayOfWeek).fill(null);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setLocation(`/daily-schedule?date=${format(day, 'yyyy-MM-dd')}`);
  };

  const getEventsForDay = (day: Date) => {
    if (!events) return [];
    return events.filter(event => {
      const eventDate = new Date(event.startTime);
      return isSameDay(eventDate, day);
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        title="Month View" 
        rightContent={
          <Button 
            size="icon" 
            variant="ghost"
            onClick={() => setLocation("/calendar")}
            data-testid="button-week-view"
          >
            Week
          </Button>
        }
      />
      
      <ScrollArea className="h-[calc(100vh-57px)]">
        <div className="p-4 max-w-lg mx-auto space-y-4 pb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handlePrevMonth}
                  data-testid="button-prev-month"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                
                <h2 className="text-lg font-display font-semibold">
                  {format(currentDate, 'MMMM yyyy')}
                </h2>
                
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleNextMonth}
                  data-testid="button-next-month"
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {paddingDays.map((_, index) => (
                  <div key={`padding-${index}`} className="aspect-square" />
                ))}
                
                {days.map(day => {
                  const dayEvents = getEventsForDay(day);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isDayToday = isToday(day);
                  
                  return (
                    <div
                      key={day.toString()}
                      onClick={() => handleDayClick(day)}
                      className={`
                        aspect-square p-1 rounded-md cursor-pointer transition-colors
                        ${isDayToday ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}
                        ${isSelected ? 'ring-2 ring-primary' : ''}
                      `}
                      data-testid={`day-${format(day, 'yyyy-MM-dd')}`}
                    >
                      <div className="text-center text-sm font-medium">
                        {format(day, 'd')}
                      </div>
                      {dayEvents.length > 0 && (
                        <div className="flex justify-center gap-0.5 mt-1">
                          {dayEvents.slice(0, 3).map((event, i) => (
                            <div
                              key={i}
                              className={`w-1.5 h-1.5 rounded-full ${EVENT_COLORS[event.eventType || 'event']}`}
                            />
                          ))}
                          {dayEvents.length > 3 && (
                            <span className="text-[8px] text-muted-foreground">+{dayEvents.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-center gap-4 text-sm">
            {Object.entries(EVENT_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1">
                <div className={`w-3 h-3 rounded-full ${color}`} />
                <span className="text-muted-foreground capitalize">{type}</span>
              </div>
            ))}
          </div>

          <Button
            className="w-full gap-2"
            onClick={() => setLocation("/calendar")}
            data-testid="button-add-event"
          >
            <Plus className="w-4 h-4" />
            Add Event
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}
