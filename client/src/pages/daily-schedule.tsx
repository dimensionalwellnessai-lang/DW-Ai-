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
  Sparkles
} from "lucide-react";
import { useLocation } from "wouter";
import { useSystemPreferences, useScheduleEvents } from "@/hooks/use-systems-data";
import { type ScheduleEvent, type SystemType } from "@/lib/guest-storage";

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

export default function DailySchedulePage() {
  const [, setLocation] = useLocation();
  const today = new Date().getDay();
  const [selectedDay, setSelectedDay] = useState(today);
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    scheduledTime: "09:00",
    endTime: "",
    systemType: "" as SystemType | "",
    notes: "",
  });
  
  const { prefs, isLoading: prefsLoading, isSystemEnabled: checkSystemEnabled } = useSystemPreferences();
  const { events, isLoading: eventsLoading, createEvent } = useScheduleEvents(selectedDay);
  
  const dayEvents = events
    .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

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

  const handleEventClick = (event: ScheduleEvent) => {
    if (event.systemType && SYSTEM_INFO[event.systemType]) {
      setLocation(SYSTEM_INFO[event.systemType].route);
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

        {dayEvents.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center space-y-4">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="font-semibold mb-1">No Events Scheduled</h3>
                <p className="text-sm text-muted-foreground">
                  Add events or use the suggested schedule below
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {dayEvents.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              {DAYS[selectedDay]}'s Schedule
            </h2>
            <div className="space-y-2">
              {dayEvents.map((event) => {
                const systemInfo = event.systemType ? SYSTEM_INFO[event.systemType] : null;
                const Icon = systemInfo?.icon || Calendar;
                
                return (
                  <Card 
                    key={event.id}
                    className={`hover-elevate ${event.systemType ? "cursor-pointer" : ""}`}
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
                          <Icon className={`w-5 h-5 ${systemInfo?.color || "text-muted-foreground"}`} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium">{event.title}</h3>
                          {event.systemType && (
                            <p className="text-sm text-muted-foreground">
                              References: {systemInfo?.name}
                            </p>
                          )}
                        </div>
                        {event.systemType && (
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
      </div>
    </ScrollArea>
  );
}
