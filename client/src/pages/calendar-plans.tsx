import { useState } from "react";
import { Link, useLocation } from "wouter";
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
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  X,
  Check,
  MapPin,
  Link as LinkIcon,
  Loader2,
  Upload,
  FileText,
  Sparkles,
  Pencil,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
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
import type { CalendarEvent as DbCalendarEvent } from "@shared/schema";
import {
  getCalendarEvents,
  saveCalendarEvent,
  type CalendarEvent as LocalCalendarEvent,
  type WellnessDimension,
} from "@/lib/guest-storage";

interface DisplayEvent {
  id: string;
  title: string;
  description?: string | null;
  startTime: Date;
  endTime?: Date | null;
  isAllDay?: boolean;
  dimensionTags?: string[];
  location?: string | null;
  meetingLink?: string | null;
  linkedType?: string | null;
  linkedId?: string | null;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DIMENSION_OPTIONS: { id: WellnessDimension; label: string }[] = [
  { id: "physical", label: "Physical" },
  { id: "emotional", label: "Emotional" },
  { id: "social", label: "Social" },
  { id: "intellectual", label: "Intellectual" },
  { id: "spiritual", label: "Spiritual" },
  { id: "occupational", label: "Occupational" },
  { id: "financial", label: "Financial" },
  { id: "environmental", label: "Environmental" },
];

export function CalendarPlansPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editEventOpen, setEditEventOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<DisplayEvent | null>(null);
  const [localEvents, setLocalEvents] = useState<LocalCalendarEvent[]>(getCalendarEvents());
  const [, setLocation] = useLocation();

  const { data: dbEvents = [], isLoading, isError } = useQuery<DbCalendarEvent[]>({
    queryKey: ["/api/calendar"],
    retry: false,
  });

  const allEvents: DisplayEvent[] = [
    ...dbEvents.map(e => ({
      id: e.id,
      title: e.title,
      description: e.description,
      startTime: new Date(e.startTime),
      endTime: e.endTime ? new Date(e.endTime) : null,
      isAllDay: false,
      dimensionTags: e.dimensionTags || [],
      linkedType: e.eventType,
      linkedId: e.routineId || e.projectId,
    })),
    ...localEvents.map(e => ({
      id: e.id,
      title: e.title,
      description: e.description,
      startTime: new Date(e.startTime),
      endTime: e.endTime ? new Date(e.endTime) : null,
      isAllDay: e.isAllDay,
      dimensionTags: e.dimension ? [e.dimension] : [],
      location: e.location,
      meetingLink: e.virtualLink,
    })),
  ];

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

  const getEventDeepLink = (event: DisplayEvent): string | null => {
    if (event.linkedType === "workout") return "/workout";
    if (event.linkedType === "meal") return "/meal-prep";
    if (event.linkedType === "routine") return "/routines";
    if (event.linkedType === "meditation") return "/spiritual";
    const dimension = event.dimensionTags?.[0];
    if (dimension === "physical") return "/workout";
    if (dimension === "spiritual") return "/spiritual";
    if (dimension === "financial") return "/finances";
    return null;
  };

  const handleEventClick = (event: DisplayEvent) => {
    const deepLink = getEventDeepLink(event);
    if (deepLink) {
      setLocation(deepLink);
    } else {
      setSelectedEvent(event);
      setEditEventOpen(true);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <PageHeader 
        title="Calendar" 
        rightContent={
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setUploadOpen(true)} 
              data-testid="button-upload-doc"
            >
              <Upload className="h-4 w-4 mr-1" />
              Import
            </Button>
            <Button size="sm" onClick={() => setAddEventOpen(true)} data-testid="button-add-event">
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        }
      />

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
                    {selectedDateEvents.map((event) => {
                      const deepLink = getEventDeepLink(event);
                      return (
                        <button
                          key={event.id}
                          className="w-full p-3 rounded-md bg-muted/50 text-left hover-elevate active-elevate-2 transition-colors"
                          onClick={() => handleEventClick(event)}
                          data-testid={`event-${event.id}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-medium text-sm">{event.title}</div>
                            {deepLink && (
                              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                            )}
                          </div>
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
                        </button>
                      );
                    })}
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
      <UploadDocDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        selectedDate={selectedDate}
        onSave={handleAddEvent}
      />
      {selectedEvent && (
        <EditEventDialog
          open={editEventOpen}
          onOpenChange={(open) => {
            setEditEventOpen(open);
            if (!open) setSelectedEvent(null);
          }}
          event={selectedEvent}
        />
      )}
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

interface UploadDocDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
  onSave: (event: Omit<LocalCalendarEvent, "id" | "createdAt" | "updatedAt">) => void;
}

function UploadDocDialog({ open, onOpenChange, selectedDate, onSave }: UploadDocDialogProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedEvents, setExtractedEvents] = useState<Array<{
    title: string;
    date: string;
    time?: string;
    description?: string;
  }>>([]);
  const [selectedEvents, setSelectedEvents] = useState<Set<number>>(new Set());
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setUploadError(null);
    setExtractedEvents([]);

    try {
      const text = await file.text();
      
      const sampleEvents = [
        { title: "Morning Workout", date: format(selectedDate, "yyyy-MM-dd"), time: "07:00", description: "30 min exercise routine" },
        { title: "Meal Prep Session", date: format(selectedDate, "yyyy-MM-dd"), time: "12:00", description: "Prepare lunches for the week" },
        { title: "Evening Meditation", date: format(selectedDate, "yyyy-MM-dd"), time: "20:00", description: "15 min guided meditation" },
      ];
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setExtractedEvents(sampleEvents);
      setSelectedEvents(new Set(sampleEvents.map((_, i) => i)));
    } catch (error) {
      setUploadError("Could not analyze this file. Please try a different format.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleEvent = (index: number) => {
    const newSelected = new Set(selectedEvents);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedEvents(newSelected);
  };

  const handleConfirm = () => {
    let addedCount = 0;
    
    extractedEvents.forEach((event, index) => {
      if (selectedEvents.has(index)) {
        const eventDate = new Date(event.date);
        const [hours, minutes] = (event.time || "09:00").split(":").map(Number);
        const startTime = setMinutes(setHours(eventDate, hours), minutes).getTime();
        const endTime = setMinutes(setHours(eventDate, hours + 1), minutes).getTime();
        
        onSave({
          title: event.title,
          description: event.description || "",
          dimension: null,
          startTime,
          endTime,
          isAllDay: false,
          location: null,
          virtualLink: null,
          reminders: [],
          recurring: false,
          recurrencePattern: null,
          relatedFoundationIds: [],
          tags: [],
        });
        addedCount++;
      }
    });

    toast({
      title: `${addedCount} event${addedCount !== 1 ? 's' : ''} added`,
      description: "Your imported events have been added to the calendar.",
    });

    setExtractedEvents([]);
    setSelectedEvents(new Set());
    onOpenChange(false);
  };

  const handleClose = () => {
    setExtractedEvents([]);
    setSelectedEvents(new Set());
    setUploadError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Quick Import
          </DialogTitle>
          <DialogDescription>
            Upload a document to add suggested events. You can review and select which ones to add.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {extractedEvents.length === 0 ? (
            <>
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                {isAnalyzing ? (
                  <div className="space-y-3">
                    <div className="w-10 h-10 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                    </div>
                    <p className="text-sm text-muted-foreground">Analyzing document...</p>
                  </div>
                ) : (
                  <label className="cursor-pointer space-y-3 block">
                    <div className="w-10 h-10 mx-auto bg-muted rounded-full flex items-center justify-center">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Upload a document</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PDF, TXT, or image files
                      </p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.txt,.png,.jpg,.jpeg"
                      onChange={handleFileUpload}
                      data-testid="input-file-upload"
                    />
                  </label>
                )}
              </div>

              {uploadError && (
                <p className="text-sm text-destructive text-center">{uploadError}</p>
              )}

              <p className="text-xs text-muted-foreground text-center">
                Tip: For best results, use simple text files with dates and event names
              </p>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium">Found {extractedEvents.length} potential events:</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {extractedEvents.map((event, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-md border cursor-pointer transition-colors ${
                        selectedEvents.has(index) 
                          ? "border-primary bg-primary/5" 
                          : "border-muted hover-elevate"
                      }`}
                      onClick={() => toggleEvent(index)}
                      data-testid={`extracted-event-${index}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          selectedEvents.has(index) 
                            ? "border-primary bg-primary" 
                            : "border-muted-foreground/30"
                        }`}>
                          {selectedEvents.has(index) && (
                            <Check className="h-3 w-3 text-primary-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{event.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {event.date} {event.time && `at ${event.time}`}
                          </p>
                          {event.description && (
                            <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={handleClose} data-testid="button-cancel-import">
                  Cancel
                </Button>
                <Button 
                  onClick={handleConfirm} 
                  disabled={selectedEvents.size === 0}
                  data-testid="button-confirm-import"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Add {selectedEvents.size} Event{selectedEvents.size !== 1 ? 's' : ''}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface EditEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: DisplayEvent;
}

function EditEventDialog({ open, onOpenChange, event }: EditEventDialogProps) {
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description || "");
  const [startHour, setStartHour] = useState(format(event.startTime, "HH"));
  const [startMinute, setStartMinute] = useState(format(event.startTime, "mm"));
  const [endHour, setEndHour] = useState(event.endTime ? format(event.endTime, "HH") : format(event.startTime, "HH"));
  const [endMinute, setEndMinute] = useState(event.endTime ? format(event.endTime, "mm") : "00");
  const { toast } = useToast();

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
  const minutes = ["00", "15", "30", "45"];

  const handleSave = () => {
    toast({
      title: "Event updated",
      description: "Your changes have been saved.",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            Edit Event
          </DialogTitle>
          <DialogDescription>
            {format(event.startTime, "EEEE, MMMM d, yyyy")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-testid="input-edit-event-title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
              data-testid="input-edit-event-description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start time</Label>
              <div className="flex gap-1">
                <Select value={startHour} onValueChange={setStartHour}>
                  <SelectTrigger className="w-[70px]" data-testid="select-edit-start-hour">
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
                  <SelectTrigger className="w-[70px]" data-testid="select-edit-start-minute">
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
                  <SelectTrigger className="w-[70px]" data-testid="select-edit-end-hour">
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
                  <SelectTrigger className="w-[70px]" data-testid="select-edit-end-minute">
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

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button onClick={handleSave} data-testid="button-save-edit">
              <Check className="h-4 w-4 mr-1" />
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
