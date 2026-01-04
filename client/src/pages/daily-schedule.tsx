import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Calendar,
  Clock,
  Sun,
  Moon,
  Utensils,
  Dumbbell,
  Plus,
  ChevronRight,
  Sparkles,
  Edit,
  Trash2
} from "lucide-react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSystemPreferences, useScheduleEvents } from "@/hooks/use-systems-data";
import { type ScheduleEvent, type SystemType } from "@/lib/guest-storage";
import type { CalendarEvent } from "@shared/schema";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const SYSTEM_INFO: Record<SystemType, { name: string; icon: typeof Sun; route: string; color: string }> = {
  wake_up: { name: "Morning Anchor", icon: Sun, route: "/systems/wake-up", color: "text-amber-500" },
  meals: { name: "Nourishment", icon: Utensils, route: "/meal-prep", color: "text-emerald-500" },
  meal_prep: { name: "Meal Prep", icon: Utensils, route: "/meal-prep", color: "text-emerald-500" },
  training: { name: "Movement", icon: Dumbbell, route: "/systems/training", color: "text-blue-500" },
  wind_down: { name: "Wind Down", icon: Moon, route: "/systems/wind-down", color: "text-indigo-500" },
  meditation: { name: "Meditation", icon: Sparkles, route: "/spiritual", color: "text-purple-500" },
  spiritual: { name: "Spiritual", icon: Sparkles, route: "/spiritual", color: "text-pink-500" },
};

const LINKED_TYPE_ICONS: Record<string, typeof Dumbbell> = {
  workout: Dumbbell,
  meal: Utensils,
  routine: Sparkles,
  meditation: Sparkles,
  none: Calendar,
};

const LINKED_TYPE_COLORS: Record<string, string> = {
  workout: "text-blue-500",
  meal: "text-emerald-500",
  routine: "text-purple-500",
  meditation: "text-pink-500",
  none: "text-muted-foreground",
};

interface DisplayScheduleEvent {
  id: string;
  title: string;
  description?: string | null;
  startTime: string;
  endTime?: string | null;
  linkedType?: string | null;
  linkedId?: string | null;
  linkedRoute?: string | null;
  systemType?: SystemType | null;
  scheduledTime: string;
  source: "db" | "local";
}

export default function DailySchedulePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const today = new Date().getDay();
  const [selectedDay, setSelectedDay] = useState(today);
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [eventDetailOpen, setEventDetailOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: "",
    scheduledTime: "09:00",
    endTime: "",
    systemType: "" as SystemType | "",
    notes: "",
  });
  
  const { prefs, isLoading: prefsLoading, isSystemEnabled: checkSystemEnabled } = useSystemPreferences();
  const { events: localEvents, isLoading: eventsLoading, createEvent } = useScheduleEvents(selectedDay);
  
  const { data: dbEvents = [], isLoading: dbEventsLoading } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar"],
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/calendar/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar"] });
      toast({ title: "Event deleted" });
      setEventDetailOpen(false);
      setSelectedEvent(null);
    },
  });

  const todaysDbEvents = dbEvents.filter(e => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    if (e.startTime.includes("T") || e.startTime.includes("-")) {
      return e.startTime.startsWith(todayStr);
    }
    return true;
  });

  const allEvents: DisplayScheduleEvent[] = [
    ...todaysDbEvents.map(e => ({
      id: e.id,
      title: e.title,
      description: e.description,
      startTime: e.startTime,
      endTime: e.endTime,
      linkedType: e.linkedType,
      linkedId: e.linkedId,
      linkedRoute: e.linkedRoute,
      source: "db" as const,
      scheduledTime: e.startTime.includes(":") ? e.startTime.split("T").pop()?.slice(0, 5) || e.startTime : e.startTime,
    })),
    ...localEvents.map(e => ({
      id: e.id,
      title: e.title,
      description: e.notes || "",
      startTime: e.scheduledTime,
      endTime: e.endTime || "",
      linkedType: e.systemType || "none",
      linkedRoute: e.systemReference || null,
      systemType: e.systemType,
      source: "local" as const,
      scheduledTime: e.scheduledTime,
    })),
  ].sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

  const handleAddEvent = () => {
    if (!newEvent.title || !newEvent.scheduledTime) return;
    
    createEvent({
      title: newEvent.title,
      scheduledTime: newEvent.scheduledTime,
      endTime: newEvent.endTime || null,
      dayOfWeek: selectedDay,
      systemReference: newEvent.systemType ? SYSTEM_INFO[newEvent.systemType]?.route || null : null,
      systemType: (newEvent.systemType as SystemType) || null,
      isRecurring: false,
      notes: newEvent.notes,
      createdAt: Date.now(),
    });
    
    setAddEventOpen(false);
    setNewEvent({ title: "", scheduledTime: "09:00", endTime: "", systemType: "", notes: "" });
  };

  const handleEventClick = (event: DisplayScheduleEvent) => {
    if (event.linkedRoute) {
      setLocation(event.linkedRoute);
      return;
    }
    
    if (event.linkedType && event.linkedType !== "none") {
      const typeRoutes: Record<string, string> = {
        workout: "/workout",
        meal: "/meal-prep",
        routine: "/routines",
        meditation: "/spiritual",
      };
      const route = typeRoutes[event.linkedType];
      if (route) {
        const targetRoute = event.linkedId ? `${route}?selected=${event.linkedId}` : route;
        setLocation(targetRoute);
        return;
      }
    }
    
    if (event.systemType && SYSTEM_INFO[event.systemType]) {
      setLocation(SYSTEM_INFO[event.systemType].route);
      return;
    }
    
    if (event.source === "db") {
      const dbEvent = dbEvents.find(e => e.id === event.id);
      if (dbEvent) {
        setSelectedEvent(dbEvent);
        setEventDetailOpen(true);
      }
    }
  };

  const suggestedSchedule = [
    { time: prefs.preferredWakeTime || "07:00", system: "wake_up" as SystemType, title: "Morning Anchor" },
    { time: "08:00", system: "meals" as SystemType, title: "Breakfast" },
    { time: "12:30", system: "meals" as SystemType, title: "Lunch" },
    { time: "17:00", system: "training" as SystemType, title: "Movement Practice" },
    { time: "19:00", system: "meals" as SystemType, title: "Dinner" },
    { time: (parseInt(prefs.preferredSleepTime?.split(":")[0] || "22") - 1).toString().padStart(2, "0") + ":00", system: "wind_down" as SystemType, title: "Wind Down" },
  ].filter(s => checkSystemEnabled(s.system));

  const getEventIcon = (event: DisplayScheduleEvent) => {
    if (event.systemType && SYSTEM_INFO[event.systemType]) {
      return SYSTEM_INFO[event.systemType].icon;
    }
    const linkedType = event.linkedType || "none";
    return LINKED_TYPE_ICONS[linkedType] || Calendar;
  };

  const getEventColor = (event: DisplayScheduleEvent) => {
    if (event.systemType && SYSTEM_INFO[event.systemType]) {
      return SYSTEM_INFO[event.systemType].color;
    }
    const linkedType = event.linkedType || "none";
    return LINKED_TYPE_COLORS[linkedType] || "text-muted-foreground";
  };

  const hasDeepLink = (event: DisplayScheduleEvent) => {
    return !!(event.linkedRoute || (event.linkedType && event.linkedType !== "none") || event.systemType);
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold">Daily Schedule</h1>
            <p className="text-muted-foreground">
              Your reference-based daily flow
            </p>
          </div>
          <Button onClick={() => setAddEventOpen(true)} data-testid="button-add-event">
            <Plus className="w-4 h-4 mr-2" />
            Add Event
          </Button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {DAYS.map((day, idx) => (
            <Button
              key={day}
              variant={selectedDay === idx ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedDay(idx)}
              className="flex-shrink-0"
              data-testid={`button-day-${idx}`}
            >
              {day.slice(0, 3)}
              {idx === today && <Badge variant="secondary" className="ml-1 text-xs">Today</Badge>}
            </Button>
          ))}
        </div>

        {allEvents.length === 0 && !dbEventsLoading && !eventsLoading && (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center space-y-4">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="font-semibold mb-1">Nothing scheduled yet</h3>
                <p className="text-sm text-muted-foreground">
                  Want help planning your day?
                </p>
              </div>
              <div className="flex justify-center gap-2 flex-wrap">
                <Button onClick={() => setAddEventOpen(true)} data-testid="button-add-event-empty">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Event
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Ask AI
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {allEvents.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              {DAYS[selectedDay]}'s Schedule
            </h2>
            <div className="space-y-2">
              {allEvents.map((event) => {
                const Icon = getEventIcon(event);
                const color = getEventColor(event);
                const isClickable = hasDeepLink(event) || event.source === "db";
                
                return (
                  <Card 
                    key={event.id}
                    className={`hover-elevate ${isClickable ? "cursor-pointer" : ""}`}
                    onClick={() => handleEventClick(event)}
                    data-testid={`card-event-${event.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="text-center min-w-[50px]">
                          <p className="text-lg font-semibold">{event.scheduledTime}</p>
                          {event.endTime && (
                            <p className="text-xs text-muted-foreground">to {event.endTime}</p>
                          )}
                        </div>
                        <div className={`w-10 h-10 rounded-full bg-muted flex items-center justify-center`}>
                          <Icon className={`w-5 h-5 ${color}`} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium">{event.title}</h3>
                          {event.linkedType && event.linkedType !== "none" && (
                            <p className="text-sm text-muted-foreground capitalize">
                              {event.linkedType}
                            </p>
                          )}
                        </div>
                        {isClickable && (
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Suggested Schedule
            </h2>
          </div>
          <Card>
            <CardContent className="p-4 space-y-3">
              {suggestedSchedule.map((item, idx) => {
                const systemInfo = SYSTEM_INFO[item.system];
                const Icon = systemInfo.icon;
                
                return (
                  <div 
                    key={idx}
                    className="flex items-center gap-4 p-2 rounded-md hover-elevate cursor-pointer"
                    onClick={() => setLocation(systemInfo.route)}
                    data-testid={`suggested-${item.system}-${idx}`}
                  >
                    <p className="text-sm font-medium min-w-[50px]">{item.time}</p>
                    <Icon className={`w-4 h-4 ${systemInfo.color}`} />
                    <p className="text-sm">{item.title}</p>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <Dialog open={addEventOpen} onOpenChange={setAddEventOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Schedule Event</DialogTitle>
              <DialogDescription>
                Create an event that references a life system
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Event Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Morning Routine"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  data-testid="input-event-title"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="time">Start Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={newEvent.scheduledTime}
                    onChange={(e) => setNewEvent({ ...newEvent, scheduledTime: e.target.value })}
                    data-testid="input-event-time"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time (optional)</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={newEvent.endTime}
                    onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                    data-testid="input-event-end-time"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Link to System (optional)</Label>
                <Select
                  value={newEvent.systemType}
                  onValueChange={(v) => setNewEvent({ ...newEvent, systemType: v as SystemType })}
                >
                  <SelectTrigger data-testid="select-system">
                    <SelectValue placeholder="Select a system" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wake_up">Morning Anchor</SelectItem>
                    <SelectItem value="meals">Nourishment</SelectItem>
                    <SelectItem value="training">Movement Practice</SelectItem>
                    <SelectItem value="wind_down">Wind Down</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setAddEventOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleAddEvent} className="flex-1" data-testid="button-save-event">
                Add Event
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={eventDetailOpen} onOpenChange={setEventDetailOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Event Details</DialogTitle>
              <DialogDescription>
                View or manage this event
              </DialogDescription>
            </DialogHeader>
            {selectedEvent && (
              <div className="space-y-4 py-4">
                <div>
                  <h3 className="font-semibold text-lg">{selectedEvent.title}</h3>
                  {selectedEvent.description && (
                    <p className="text-sm text-muted-foreground mt-1">{selectedEvent.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{selectedEvent.startTime}</span>
                  {selectedEvent.endTime && (
                    <>
                      <span>-</span>
                      <span>{selectedEvent.endTime}</span>
                    </>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => deleteEventMutation.mutate(selectedEvent.id)}
                    data-testid="button-delete-event"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ScrollArea>
  );
}
