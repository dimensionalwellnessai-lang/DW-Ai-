import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Calendar,
  Clock,
  Search,
  Dumbbell,
  Utensils,
  Heart,
  CheckSquare,
  Brain,
  Sparkles,
  BookOpen,
  Leaf,
  DollarSign,
  Users,
  ChevronRight,
  ArrowRight,
  Play,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { CalendarEvent } from "@shared/schema";
import { format, parseISO, isBefore, startOfToday } from "date-fns";
import { usePageMeta } from "@/hooks/use-page-meta";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ── Smart DW route resolver ─────────────────────────────────────────────────

interface DwLink {
  route: string;
  label: string;
  description: string;
  steps: string[];
  Icon: typeof Dumbbell;
  color: string;
}

function getDwLink(event: CalendarEvent): DwLink {
  // Use stored linkedRoute if available
  if (event.linkedRoute) {
    const base = inferFromKeywords(event.title, event.eventType ?? "");
    return { ...base, route: event.linkedRoute };
  }
  return inferFromKeywords(event.title, event.eventType ?? "");
}

function inferFromKeywords(title: string, type: string): DwLink {
  const t = (title + " " + type).toLowerCase();

  if (/meditat|breathwork|breath|mindful|calm|relax|body scan|stress|anxiety/.test(t)) {
    return {
      route: "/talk-it-out",
      label: "Open in DW · Talk It Out",
      description: "DW can guide you through this session with voice, music, and personalized prompts.",
      steps: [
        "Find a comfortable, quiet space",
        "Sit or lie down and close your eyes",
        "Focus on slow, deep breaths for the first minute",
        "Let thoughts come and go without judgment",
        "Return your attention gently to your breath each time it wanders",
      ],
      Icon: Brain,
      color: "bg-purple-500",
    };
  }

  if (/yoga|flow|stretch|flexibility|pilates|mobility|posture/.test(t)) {
    return {
      route: "/workout",
      label: "Open in DW · Movement",
      description: "Browse curated yoga and mobility sessions matched to your level and goals.",
      steps: [
        "Set up your mat in a clear, comfortable space",
        "Start with a few slow breaths to arrive in your body",
        "Move through the flow at your own pace — honor your limits",
        "Hold each pose mindfully, breathing into any tension",
        "Close with a few minutes of stillness (savasana)",
      ],
      Icon: Heart,
      color: "bg-green-500",
    };
  }

  if (/workout|hiit|train|exercise|run|strength|lift|cardio|gym|cycle|bike|swim|walk|jog/.test(t) || type === "workout") {
    return {
      route: "/workout",
      label: "Open in DW · Workout",
      description: "Log this workout, view your progress, or find the right video to follow along.",
      steps: [
        "Warm up for 5–10 minutes with light movement",
        "Complete your planned sets, reps, or cardio intervals",
        "Maintain good form — quality over quantity",
        "Push yourself just past comfortable, but listen to your body",
        "Cool down and stretch for at least 5 minutes after",
      ],
      Icon: Dumbbell,
      color: "bg-blue-500",
    };
  }

  if (/meal|eat|lunch|dinner|breakfast|nutrition|cook|recipe|food|diet|snack/.test(t) || type === "meal") {
    return {
      route: "/meal-prep",
      label: "Open in DW · Meal Prep",
      description: "View your recipe, grocery list, and meal prep schedule in DW.",
      steps: [
        "Gather all ingredients before you start",
        "Prep ingredients (chop, measure, marinate) ahead of time",
        "Follow the recipe steps without rushing",
        "Taste and adjust seasoning as you go",
        "Eat slowly and mindfully — no screens if possible",
      ],
      Icon: Utensils,
      color: "bg-orange-500",
    };
  }

  if (/journal|reflect|write|diary|gratitude|intention/.test(t)) {
    return {
      route: "/journal",
      label: "Open in DW · Journal",
      description: "Open your DW journal to capture thoughts, reflections, and gratitude.",
      steps: [
        "Find a quiet moment with no distractions",
        "Write freely — there's no right or wrong way to start",
        "Reflect on what happened today and how you feel",
        "Note at least one thing you're grateful for",
        "Close with a short intention for tomorrow",
      ],
      Icon: BookOpen,
      color: "bg-amber-500",
    };
  }

  if (/spiritual|prayer|gratit|manifest|affirmation|faith|connect/.test(t)) {
    return {
      route: "/spiritual",
      label: "Open in DW · Spiritual",
      description: "Access readings, affirmations, and cosmic insights in your spiritual hub.",
      steps: [
        "Create a calm, intentional space",
        "Begin with a moment of silence or a deep breath",
        "Speak or write your affirmations with conviction",
        "Visualize the feeling of what you're calling in",
        "Close with gratitude for what is already present",
      ],
      Icon: Sparkles,
      color: "bg-pink-500",
    };
  }

  if (/finance|budget|money|invest|saving|spend|bill|debt/.test(t)) {
    return {
      route: "/finances",
      label: "Open in DW · Finances",
      description: "Review your budget, goals, and financial wellness inside DW.",
      steps: [
        "Open your budget tracker or bank app",
        "Review income vs. spending for this period",
        "Identify one area where you can reduce or redirect",
        "Move any savings automatically if possible",
        "Celebrate small financial wins — momentum matters",
      ],
      Icon: DollarSign,
      color: "bg-emerald-500",
    };
  }

  if (/social|friend|family|connect|call|visit|relationship/.test(t)) {
    return {
      route: "/journal",
      label: "Open in DW · Journal",
      description: "Reflect on this connection and capture what mattered.",
      steps: [
        "Put away devices before the interaction",
        "Be fully present — listen more than you speak",
        "Ask a genuine question about how they're doing",
        "Share something real from your own experience",
        "End with appreciation — even a simple 'I'm glad we talked'",
      ],
      Icon: Users,
      color: "bg-cyan-500",
    };
  }

  if (/nature|outdoor|walk|park|garden|plant|environment|fresh air/.test(t)) {
    return {
      route: "/browse",
      label: "Open in DW · Browse",
      description: "Find inspiration and guidance for your outdoor or environmental practice.",
      steps: [
        "Leave your phone in your pocket or at home if possible",
        "Step outside and take a slow, deliberate first breath",
        "Notice 5 things you can see, 4 you can hear, 3 you can feel",
        "Walk without a destination — explore rather than commute",
        "Return feeling grounded and refreshed",
      ],
      Icon: Leaf,
      color: "bg-lime-500",
    };
  }

  if (/learn|study|read|book|course|class|skill|practice/.test(t)) {
    return {
      route: "/browse",
      label: "Open in DW · Browse",
      description: "Explore articles, videos, and learning content across all wellness dimensions.",
      steps: [
        "Set a timer (Pomodoro: 25 min on, 5 min break works well)",
        "Remove all distractions before you begin",
        "Take notes or highlight key ideas as you go",
        "After reading, recall the main points from memory",
        "Apply one new idea today — even something small",
      ],
      Icon: BookOpen,
      color: "bg-indigo-500",
    };
  }

  // Default fallback
  return {
    route: "/browse",
    label: "Open in DW · Browse",
    description: "Explore related content and resources inside Dimensional Wellness.",
    steps: [
      "Review your intention for this session",
      "Set aside distractions and give it your full attention",
      "Take it at your own pace",
      "Notice how you feel before and after",
      "Log how it went in your DW journal",
    ],
    Icon: Sparkles,
    color: "bg-primary",
  };
}

// ── Event type config (for filter chips + compact icon) ─────────────────────

const EVENT_TYPE_CONFIG: Record<string, { icon: typeof Calendar; color: string; label: string }> = {
  workout:   { icon: Dumbbell,      color: "bg-blue-500",    label: "Workout" },
  meal:      { icon: Utensils,      color: "bg-orange-500",  label: "Meal" },
  routine:   { icon: Heart,         color: "bg-purple-500",  label: "Routine" },
  event:     { icon: Calendar,      color: "bg-sky-500",     label: "Event" },
  task:      { icon: CheckSquare,   color: "bg-yellow-500",  label: "Task" },
  meditation:{ icon: Brain,         color: "bg-purple-600",  label: "Meditation" },
  spiritual: { icon: Sparkles,      color: "bg-pink-500",    label: "Spiritual" },
};

// ── Component ────────────────────────────────────────────────────────────────

export default function CalendarSchedulePage() {
  usePageMeta("Schedule", "View and manage your schedule.");
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const { data: events, isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar"],
  });

  const today = startOfToday();

  const filteredEvents = (events || [])
    .filter(event => {
      if (searchQuery && !event.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterType && event.eventType !== filterType) return false;
      if (!showPast) {
        if (isBefore(parseISO(event.startTime), today)) return false;
      }
      return true;
    })
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const groupedEvents: Record<string, CalendarEvent[]> = {};
  filteredEvents.forEach(event => {
    const dateKey = format(parseISO(event.startTime), "yyyy-MM-dd");
    if (!groupedEvents[dateKey]) groupedEvents[dateKey] = [];
    groupedEvents[dateKey].push(event);
  });

  const handleOpenDw = (dwLink: DwLink) => {
    setSelectedEvent(null);
    setLocation(dwLink.route);
  };

  // Detail modal content
  const detailDw = selectedEvent ? getDwLink(selectedEvent) : null;
  const DetailIcon = detailDw?.Icon ?? Sparkles;

  return (
    <div className="flex flex-col h-full bg-background">
      <PageHeader title="Schedule" />

      <ScrollArea className="flex-1 overflow-auto">
        <div className="p-4 max-w-lg mx-auto space-y-4 pb-8">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-events"
            />
          </div>

          {/* Filter chips */}
          <div className="flex gap-2 flex-wrap">
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
                className="gap-1"
                data-testid={`filter-${type}`}
              >
                <config.icon className="w-3 h-3" />
                {config.label}
              </Button>
            ))}
          </div>

          {/* Count + toggle past */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowPast(!showPast)}
              data-testid="button-toggle-past"
            >
              {showPast ? "Hide" : "Show"} past
            </Button>
          </div>

          {/* Events */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="mb-1 font-medium">No events found</p>
              <p className="text-sm">
                {searchQuery || filterType ? "Try adjusting your filters" : "Events you add will appear here"}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedEvents).map(([dateKey, dayEvents]) => (
                <div key={dateKey} className="space-y-2">
                  <div className="flex items-center gap-2 sticky top-0 bg-background py-2 z-10">
                    <Badge variant="outline">{format(parseISO(dateKey), "EEE, MMM d")}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {dayEvents.length} event{dayEvents.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {dayEvents.map(event => {
                    const config = EVENT_TYPE_CONFIG[event.eventType || "event"];
                    const Icon = config?.icon || Calendar;
                    const dw = getDwLink(event);
                    const DwIcon = dw.Icon;

                    return (
                      <Card
                        key={event.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setSelectedEvent(event)}
                        data-testid={`card-event-${event.id}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            {/* Color dot + icon */}
                            <div className={`w-10 h-10 rounded-xl ${config?.color || dw.color} flex items-center justify-center shrink-0 mt-0.5`}>
                              <Icon className="w-5 h-5 text-white" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm leading-snug">{event.title}</p>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                <Clock className="w-3 h-3" />
                                <span>
                                  {format(parseISO(event.startTime), "h:mm a")} – {format(parseISO(event.endTime), "h:mm a")}
                                </span>
                              </div>
                              {event.description && (
                                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{event.description}</p>
                              )}

                              {/* DW link pill */}
                              <div className="flex items-center gap-1 mt-2">
                                <DwIcon className="w-3 h-3 text-primary" />
                                <span className="text-xs text-primary font-medium">{dw.label.replace("Open in DW · ", "")}</span>
                                <ChevronRight className="w-3 h-3 text-primary" />
                              </div>
                            </div>
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

      {/* ── Event Detail Modal ───────────────────────────────────────────────── */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => { if (!open) setSelectedEvent(null); }}>
        <DialogContent className="max-w-sm">
          {selectedEvent && detailDw && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-1">
                  <div className={`w-10 h-10 rounded-xl ${detailDw.color} flex items-center justify-center shrink-0`}>
                    <DetailIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="text-base leading-snug">{selectedEvent.title}</DialogTitle>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {format(parseISO(selectedEvent.startTime), "h:mm a")} – {format(parseISO(selectedEvent.endTime), "h:mm a")}
                      {" · "}
                      {format(parseISO(selectedEvent.startTime), "EEE, MMM d")}
                    </p>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 pt-1">
                {/* Description */}
                <p className="text-sm text-muted-foreground">
                  {selectedEvent.description || detailDw.description}
                </p>

                {/* Steps */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">How to approach this</p>
                  <ol className="space-y-2">
                    {detailDw.steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center mt-0.5">
                          {i + 1}
                        </span>
                        <span className="text-sm text-foreground/80">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Open in DW CTA */}
                <Button
                  className="w-full gap-2"
                  onClick={() => handleOpenDw(detailDw)}
                  data-testid="button-open-in-dw"
                >
                  <Play className="h-4 w-4 fill-current" />
                  {detailDw.label}
                  <ArrowRight className="h-4 w-4 ml-auto" />
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
