import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Moon, Star, Orbit, Sparkles } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from "date-fns";

interface CelestialEvent {
  type: "moon_phase" | "retrograde" | "transit" | "alignment";
  name: string;
  description: string;
  impact: "high" | "medium" | "low";
  suggestion?: string;
}

interface DayData {
  date: Date;
  moonPhase: string;
  moonPhaseEmoji: string;
  events: CelestialEvent[];
  energyLevel: number; // 1-10
  moodAlignment: string;
}

// Mock celestial data - In production, this would come from an API
function getCelestialDataForDate(date: Date): DayData {
  const dayOfMonth = date.getDate();
  const lunarCycle = 29.53;
  const dayInCycle = (dayOfMonth % lunarCycle);
  
  const moonPhases = [
    { name: "New Moon", emoji: "🌑", range: [0, 3.7] },
    { name: "Waxing Crescent", emoji: "🌒", range: [3.7, 7.4] },
    { name: "First Quarter", emoji: "🌓", range: [7.4, 11.1] },
    { name: "Waxing Gibbous", emoji: "🌔", range: [11.1, 14.8] },
    { name: "Full Moon", emoji: "🌕", range: [14.8, 18.4] },
    { name: "Waning Gibbous", emoji: "🌖", range: [18.4, 22.1] },
    { name: "Last Quarter", emoji: "🌗", range: [22.1, 25.8] },
    { name: "Waning Crescent", emoji: "🌘", range: [25.8, 29.53] },
  ];

  const currentPhase = moonPhases.find(phase => 
    dayInCycle >= phase.range[0] && dayInCycle < phase.range[1]
  );
  
  // Default to New Moon if not found (edge case at cycle boundary)
  const moonPhase = currentPhase || moonPhases[0];

  const events: CelestialEvent[] = [];
  
  // Add moon phase events
  if (currentPhase.name === "New Moon" || currentPhase.name === "Full Moon") {
    events.push({
      type: "moon_phase",
      name: currentPhase.name,
      description: `The ${currentPhase.name.toLowerCase()} brings powerful energy for ${currentPhase.name === "New Moon" ? "new beginnings and setting intentions" : "completion and release"}`,
      impact: "high",
      suggestion: currentPhase.name === "New Moon" 
        ? "Set new intentions, start fresh projects" 
        : "Reflect on achievements, let go of what no longer serves you",
    });
  }
  
  // Simulate retrogrades
  if (dayOfMonth % 13 === 0) {
    events.push({
      type: "retrograde",
      name: "Mercury Retrograde",
      description: "Communication and technology may face disruptions",
      impact: "medium",
      suggestion: "Double-check messages, back up important data, review contracts carefully",
    });
  }
  
  // Simulate transits
  if (dayOfMonth % 7 === 0) {
    events.push({
      type: "transit",
      name: "Venus in Harmony",
      description: "Favorable transit for relationships and creative pursuits",
      impact: "medium",
      suggestion: "Focus on relationships, engage in creative activities, appreciate beauty",
    });
  }

  // Calculate energy level based on moon phase
  const energyLevel = Math.round(5 + Math.sin((dayInCycle / lunarCycle) * 2 * Math.PI) * 4);
  
  const moodAlignments = ["Reflective", "Energetic", "Balanced", "Intuitive", "Creative"];
  const moodAlignment = moodAlignments[Math.floor(energyLevel / 2)];

  return {
    date,
    moonPhase: currentPhase.name,
    moonPhaseEmoji: currentPhase.emoji,
    events,
    energyLevel,
    moodAlignment,
  };
}

interface AstrologyCalendarProps {
  birthChart?: {
    sunSign?: string;
    moonSign?: string;
    risingSign?: string;
  };
}

export function AstrologyCalendar({ birthChart }: AstrologyCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const previousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleDayClick = (day: Date) => {
    const dayData = getCelestialDataForDate(day);
    setSelectedDay(dayData);
    setShowDetails(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Moon className="h-5 w-5 text-primary" />
              Celestial Calendar
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={previousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-semibold min-w-[150px] text-center">
                {format(currentMonth, "MMMM yyyy")}
              </span>
              <Button variant="ghost" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {birthChart && (
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary">☉ {birthChart.sunSign}</Badge>
              <Badge variant="secondary">☽ {birthChart.moonSign}</Badge>
              <Badge variant="secondary">↑ {birthChart.risingSign}</Badge>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-4">
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center text-xs font-semibold text-muted-foreground p-2">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {daysInMonth.map((day) => {
              const dayData = getCelestialDataForDate(day);
              const isToday = isSameDay(day, new Date());
              const hasEvents = dayData.events.length > 0;

              return (
                <motion.button
                  key={day.toISOString()}
                  onClick={() => handleDayClick(day)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`
                    relative p-2 rounded-lg border text-sm transition-all
                    ${isToday ? "border-primary bg-primary/10 font-bold" : "border-border"}
                    ${!isSameMonth(day, currentMonth) ? "opacity-30" : ""}
                    ${hasEvents ? "ring-1 ring-accent/50" : ""}
                    hover:bg-accent/10
                  `}
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <span>{format(day, "d")}</span>
                    <span className="text-xs">{dayData.moonPhaseEmoji}</span>
                    {hasEvents && (
                      <div className="absolute top-1 right-1">
                        <Sparkles className="h-2.5 w-2.5 text-accent" />
                      </div>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 pt-4 border-t flex flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-accent" />
              <span className="text-muted-foreground">Celestial Events</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded border-primary border-2" />
              <span className="text-muted-foreground">Today</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Day Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Moon className="h-5 w-5 text-primary" />
              {selectedDay && format(selectedDay.date, "MMMM d, yyyy")}
            </DialogTitle>
            <DialogDescription>
              {selectedDay && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-2xl">{selectedDay.moonPhaseEmoji}</span>
                  <span className="font-medium">{selectedDay.moonPhase}</span>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedDay && (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-4">
                {/* Energy & Mood */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Energy Level</span>
                    <Badge variant="outline">{selectedDay.energyLevel}/10</Badge>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${selectedDay.energyLevel * 10}%` }}
                      className="bg-primary h-2 rounded-full"
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Mood Alignment: <span className="font-medium text-foreground">{selectedDay.moodAlignment}</span>
                  </div>
                </div>

                {/* Celestial Events */}
                {selectedDay.events.length > 0 ? (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Orbit className="h-4 w-4" />
                      Celestial Events
                    </h4>
                    {selectedDay.events.map((event, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="p-3 rounded-lg bg-accent/10 border border-accent/20"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="font-semibold text-sm">{event.name}</h5>
                          <Badge 
                            variant={event.impact === "high" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {event.impact}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {event.description}
                        </p>
                        {event.suggestion && (
                          <div className="text-sm bg-primary/5 p-2 rounded border-l-2 border-primary">
                            <span className="font-medium">Suggestion: </span>
                            {event.suggestion}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-sm text-muted-foreground py-4">
                    <Star className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No major celestial events today. A good day for routine activities.
                  </div>
                )}

                {/* Personalized Insights (if birth chart available) */}
                {birthChart && (
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <h5 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Personal Insight
                    </h5>
                    <p className="text-sm text-muted-foreground">
                      As a {birthChart.sunSign} sun with {birthChart.moonSign} moon, 
                      today's energy supports your natural {selectedDay.moodAlignment.toLowerCase()} tendencies.
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
