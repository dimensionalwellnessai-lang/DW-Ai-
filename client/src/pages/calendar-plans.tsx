import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  X,
  Check,
  MapPin,
  Link as LinkIcon,
  Loader2,
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
  setHours,
  setMinutes,
} from "date-fns";
import type { CalendarEvent } from "@shared/schema";
import {
  getCalendarEvents,
  saveCalendarEvent,
  type CalendarEvent as LocalCalendarEvent,
  type WellnessDimension,
} from "@/lib/guest-storage";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DIMENSION_OPTIONS: { id: WellnessDimension; label: string }[] = [
  { id: "body", label: "Body" },
  { id: "workout", label: "Workout" },
  { id: "mealPrep", label: "Meal Prep" },
  { id: "finances", label: "Finances" },
  { id: "spiritual", label: "Spiritual" },
  { id: "mental", label: "Mental" },
  { id: "emotional", label: "Emotional" },
  { id: "social", label: "Social" },
  { id: "community", label: "Community" },
];

export function CalendarPlansPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [localEvents, setLocalEvents] = useState<LocalCalendarEvent[]>(getCalendarEvents());

  const { data: events = [], isLoading, isError } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar"],
    retry: false,
  });

  const allEvents = [...events, ...localEvents.map(e => ({
    id: parseInt(e.id) || Math.random(),
    userId: 0,
    title: e.title,
    description: e.description,
    startTime: new Date(e.startTime),
    endTime: e.endTime ? new Date(e.endTime) : null,
    isAllDay: e.isAllDay,
    dimensionTags: e.dimension ? [e.dimension] : [],
    location: e.location,
    meetingLink: e.virtualLink,
    reminders: [],
    recurrence: null,
    relatedFoundationIds: e.relatedFoundationIds,
  } as CalendarEvent))];

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const selectedDateEvents = allEvents.filter((event) => {
    const eventDate = new Date(event.startTime);
    return isSameDay(eventDate, selectedDate);
  });

  const getEventsForDay = (day: Date) => {
    return allEvents.filter((event) => {
      const eventDate = new Date(event.startTime);
      return isSameDay(eventDate, day);
    });
  };

  const handleAddEvent = (event: Omit<LocalCalendarEvent, "id" | "createdAt" | "updatedAt">) => {
    saveCalendarEvent(event);
    setLocalEvents(getCalendarEvents());
    setAddEventOpen(false);
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
        <Button size="sm" onClick={() => setAddEventOpen(true)} data-testid="button-add-event">
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
      <AddEventDialog
        open={addEventOpen}
        onOpenChange={setAddEventOpen}
        selectedDate={selectedDate}
        onSave={handleAddEvent}
      />
    </div>
  );
}

interface AddEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
  onSave: (event: Omit<LocalCalendarEvent, "id" | "createdAt" | "updatedAt">) => void;
}

function AddEventDialog({ open, onOpenChange, selectedDate, onSave }: AddEventDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dimension, setDimension] = useState<WellnessDimension | "">("");
  const [startHour, setStartHour] = useState("09");
  const [startMinute, setStartMinute] = useState("00");
  const [endHour, setEndHour] = useState("10");
  const [endMinute, setEndMinute] = useState("00");
  const [isAllDay, setIsAllDay] = useState(false);
  const [location, setLocation] = useState("");
  const [virtualLink, setVirtualLink] = useState("");
  const { toast } = useToast();

  const handleSave = () => {
    if (!title.trim()) {
      toast({
        title: "Please add a title",
        variant: "destructive",
      });
      return;
    }

    const startTime = isAllDay
      ? new Date(selectedDate.setHours(0, 0, 0, 0)).getTime()
      : setMinutes(setHours(selectedDate, parseInt(startHour)), parseInt(startMinute)).getTime();

    const endTime = isAllDay
      ? new Date(selectedDate.setHours(23, 59, 59, 999)).getTime()
      : setMinutes(setHours(selectedDate, parseInt(endHour)), parseInt(endMinute)).getTime();

    onSave({
      title: title.trim(),
      description: description.trim(),
      dimension: dimension || null,
      startTime,
      endTime,
      isAllDay,
      location: location.trim() || null,
      virtualLink: virtualLink.trim() || null,
      reminders: [],
      recurring: false,
      recurrencePattern: null,
      relatedFoundationIds: [],
      tags: [],
    });

    setTitle("");
    setDescription("");
    setDimension("");
    setStartHour("09");
    setStartMinute("00");
    setEndHour("10");
    setEndMinute("00");
    setIsAllDay(false);
    setLocation("");
    setVirtualLink("");

    toast({
      title: "Event added",
      description: "Your appointment has been saved to the calendar.",
    });
  };

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
  const minutes = ["00", "15", "30", "45"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Event</DialogTitle>
          <DialogDescription>
            {format(selectedDate, "EEEE, MMMM d, yyyy")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="What's happening?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-testid="input-event-title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Add details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
              data-testid="input-event-description"
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="all-day"
              checked={isAllDay}
              onCheckedChange={setIsAllDay}
              data-testid="switch-all-day"
            />
            <Label htmlFor="all-day">All day</Label>
          </div>

          {!isAllDay && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start time</Label>
                <div className="flex gap-1">
                  <Select value={startHour} onValueChange={setStartHour}>
                    <SelectTrigger className="w-[70px]" data-testid="select-start-hour">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {hours.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="self-center">:</span>
                  <Select value={startMinute} onValueChange={setStartMinute}>
                    <SelectTrigger className="w-[70px]" data-testid="select-start-minute">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {minutes.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>End time</Label>
                <div className="flex gap-1">
                  <Select value={endHour} onValueChange={setEndHour}>
                    <SelectTrigger className="w-[70px]" data-testid="select-end-hour">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {hours.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="self-center">:</span>
                  <Select value={endMinute} onValueChange={setEndMinute}>
                    <SelectTrigger className="w-[70px]" data-testid="select-end-minute">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {minutes.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Dimension (optional)</Label>
            <Select value={dimension} onValueChange={(v) => setDimension(v as WellnessDimension)}>
              <SelectTrigger data-testid="select-dimension">
                <SelectValue placeholder="Link to a wellness dimension" />
              </SelectTrigger>
              <SelectContent>
                {DIMENSION_OPTIONS.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location (optional)</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="location"
                placeholder="Add location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="pl-9"
                data-testid="input-event-location"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="virtual-link">Meeting link (optional)</Label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="virtual-link"
                placeholder="Add video call link"
                value={virtualLink}
                onChange={(e) => setVirtualLink(e.target.value)}
                className="pl-9"
                data-testid="input-event-link"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-event">
              Cancel
            </Button>
            <Button onClick={handleSave} data-testid="button-save-event">
              <Check className="h-4 w-4 mr-1" />
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
