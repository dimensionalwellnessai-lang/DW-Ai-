import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, Search, Filter, Dumbbell, Utensils, Heart, CheckSquare, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { CalendarEvent } from "@shared/schema";
import { format, parseISO, isAfter, isBefore, startOfToday } from "date-fns";

const EVENT_TYPE_CONFIG: Record<string, { icon: typeof Calendar; color: string; label: string }> = {
  workout: { icon: Dumbbell, color: "bg-green-500", label: "Workout" },
  meal: { icon: Utensils, color: "bg-orange-500", label: "Meal" },
  routine: { icon: Heart, color: "bg-purple-500", label: "Routine" },
  event: { icon: Calendar, color: "bg-blue-500", label: "Event" },
  task: { icon: CheckSquare, color: "bg-yellow-500", label: "Task" },
};

export default function CalendarSchedulePage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);

  const { data: events, isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar/events"],
  });

  const today = startOfToday();
  
  const filteredEvents = (events || [])
    .filter(event => {
      if (searchQuery && !event.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (filterType && event.eventType !== filterType) {
        return false;
      }
      if (!showPast) {
        const eventDate = parseISO(event.startTime);
        if (isBefore(eventDate, today)) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const groupedEvents: Record<string, CalendarEvent[]> = {};
  filteredEvents.forEach(event => {
    const dateKey = format(parseISO(event.startTime), 'yyyy-MM-dd');
    if (!groupedEvents[dateKey]) {
      groupedEvents[dateKey] = [];
    }
    groupedEvents[dateKey].push(event);
  });

  const handleEventClick = (event: CalendarEvent) => {
    if (event.linkedType && event.linkedId && event.linkedRoute) {
      setLocation(`${event.linkedRoute}?selected=${event.linkedId}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Schedule" />
      
      <ScrollArea className="h-[calc(100vh-57px)]">
        <div className="p-4 max-w-lg mx-auto space-y-4 pb-8">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-events"
              />
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button
              size="sm"
              variant={filterType === null ? "default" : "outline"}
              onClick={() => setFilterType(null)}
              data-testid="filter-all"
            >
              All
            </Button>
            {Object.entries(EVENT_TYPE_CONFIG).map(([type, config]) => (
              <Button
                key={type}
                size="sm"
                variant={filterType === type ? "default" : "outline"}
                onClick={() => setFilterType(filterType === type ? null : type)}
                className="gap-1 shrink-0"
                data-testid={`filter-${type}`}
              >
                <config.icon className="w-3 h-3" />
                {config.label}
              </Button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowPast(!showPast)}
              data-testid="button-toggle-past"
            >
              {showPast ? "Hide" : "Show"} past events
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="mb-2">No events found</p>
              <p className="text-sm">
                {searchQuery || filterType ? "Try adjusting your filters" : "Add events to see them here"}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedEvents).map(([dateKey, dayEvents]) => (
                <div key={dateKey} className="space-y-2">
                  <div className="flex items-center gap-2 sticky top-0 bg-background py-2 z-10">
                    <Badge variant="outline">{format(parseISO(dateKey), 'EEE, MMM d')}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  {dayEvents.map(event => {
                    const config = EVENT_TYPE_CONFIG[event.eventType || 'event'];
                    const Icon = config?.icon || Calendar;
                    const hasLink = event.linkedType && event.linkedId;
                    
                    return (
                      <Card
                        key={event.id}
                        className={`${hasLink ? 'cursor-pointer hover-elevate' : ''}`}
                        onClick={() => hasLink && handleEventClick(event)}
                        data-testid={`card-event-${event.id}`}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg ${config?.color || 'bg-gray-500'} flex items-center justify-center shrink-0`}>
                              <Icon className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{event.title}</div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                <span>
                                  {format(parseISO(event.startTime), 'h:mm a')} - {format(parseISO(event.endTime), 'h:mm a')}
                                </span>
                              </div>
                            </div>
                            {hasLink && (
                              <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
