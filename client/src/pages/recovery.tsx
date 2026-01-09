import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageHeader } from "@/components/page-header";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageSquareText, 
  Clock, 
  Check, 
  Sparkles,
  Moon,
  Sun,
  Calendar,
  Leaf,
  Heart,
  Waves,
  Wind,
  Bed,
  Droplets
} from "lucide-react";
import { 
  getSavedRoutinesByType, 
  saveRoutine, 
  saveCalendarEvent,
  type SavedRoutine 
} from "@/lib/guest-storage";
import { getCurrentEnergyContext, type EnergyLevel } from "@/lib/energy-context";
import { InAppSearch, type SearchResult } from "@/components/in-app-search";

interface RecoveryItem {
  id: string;
  title: string;
  description: string;
  duration: number;
  category: "rest" | "stretch" | "hydration" | "wind-down" | "massage" | "breathwork";
  tag: string;
}

interface EnergyAdaptivePick {
  id: string;
  title: string;
  duration: number;
  tag: string;
  why: string;
}

const ENERGY_ADAPTIVE_PICKS: Record<EnergyLevel, EnergyAdaptivePick[]> = {
  low: [
    {
      id: "low-1",
      title: "Gentle Rest & Reset",
      duration: 10,
      tag: "Rest",
      why: "Notice if your energy feels low. This gives your body time to recover without effort."
    },
    {
      id: "low-2", 
      title: "Evening Wind-Down",
      duration: 10,
      tag: "Wind-Down",
      why: "Notice if you need nervous system balance. You can shorten or skip if needed."
    },
    {
      id: "low-3",
      title: "Restorative Breathwork",
      duration: 5,
      tag: "Breathwork",
      why: "Notice how a few slow breaths can help your body shift into rest mode."
    }
  ],
  medium: [
    {
      id: "med-1",
      title: "Active Recovery Stretch",
      duration: 15,
      tag: "Stretch",
      why: "Notice that you have enough energy for gentle movement. This keeps things balanced."
    },
    {
      id: "med-2",
      title: "Hydration & Rest Check",
      duration: 5,
      tag: "Hydration",
      why: "Notice your body's basic needs. A quick reset can help."
    },
    {
      id: "med-3",
      title: "Grounding Practice",
      duration: 10,
      tag: "Grounding",
      why: "Notice how reconnecting with your body supports overall recovery."
    }
  ],
  high: [
    {
      id: "high-1",
      title: "Deep Tissue Self-Massage",
      duration: 20,
      tag: "Massage",
      why: "Notice that your energy is up. Use some of it to release tension and support recovery."
    },
    {
      id: "high-2",
      title: "Mobility Flow",
      duration: 15,
      tag: "Stretch",
      why: "Notice if you want to support long-term recovery. This prevents tightness."
    },
    {
      id: "high-3",
      title: "Active Stretching Session",
      duration: 20,
      tag: "Stretch",
      why: "Notice how channeling high energy into flexibility work supports long-term wellness."
    }
  ]
};

// Categories for Recovery guided experience
const RECOVERY_CATEGORIES = [
  { id: "breathwork", label: "Breathwork", icon: Wind },
  { id: "stretch", label: "Stretch & Mobility", icon: Leaf },
  { id: "grounding", label: "Grounding", icon: Waves },
  { id: "wind-down", label: "Sleep Wind-Down", icon: Moon },
  { id: "stress-reset", label: "Stress Reset", icon: Heart },
];

// Filter types for Recovery
type TimeFilter = "any" | "5" | "10" | "20";
type StyleFilter = "any" | "guided" | "text";
type IntensityFilter = "any" | "gentle" | "moderate";

const RECOVERY_LIBRARY: RecoveryItem[] = [
  {
    id: "1",
    title: "Gentle Rest & Reset",
    description: "A quiet pause to let your body recover without effort",
    duration: 10,
    category: "rest",
    tag: "Rest"
  },
  {
    id: "2",
    title: "Evening Wind-Down",
    description: "Prepare for restful sleep with calming activities",
    duration: 10,
    category: "wind-down",
    tag: "Wind-Down"
  },
  {
    id: "3",
    title: "Active Recovery Stretch",
    description: "Gentle movement to ease tension and improve flexibility",
    duration: 15,
    category: "stretch",
    tag: "Stretch"
  },
  {
    id: "4",
    title: "Hydration & Rest Check",
    description: "Check in with your body's basic needs",
    duration: 5,
    category: "hydration",
    tag: "Hydration"
  },
  {
    id: "5",
    title: "Deep Tissue Self-Massage",
    description: "Release tension in tight muscles with targeted pressure",
    duration: 20,
    category: "massage",
    tag: "Massage"
  },
  {
    id: "6",
    title: "Mobility Flow",
    description: "Dynamic stretches to improve range of motion",
    duration: 15,
    category: "stretch",
    tag: "Stretch"
  },
  {
    id: "7",
    title: "Legs Up the Wall",
    description: "Restorative pose to reduce swelling and calm the mind",
    duration: 10,
    category: "rest",
    tag: "Rest"
  },
  {
    id: "8",
    title: "Recovery Breathwork",
    description: "Focused breathing to activate your parasympathetic system",
    duration: 8,
    category: "breathwork",
    tag: "Breathwork"
  },
  {
    id: "9",
    title: "Cold Exposure Prep",
    description: "Mental and physical preparation for cold therapy",
    duration: 5,
    category: "hydration",
    tag: "Hydration"
  },
  {
    id: "10",
    title: "Full Body Foam Rolling",
    description: "Comprehensive self-massage for major muscle groups",
    duration: 25,
    category: "massage",
    tag: "Massage"
  },
];

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "rest": return Bed;
    case "stretch": return Leaf;
    case "hydration": return Droplets;
    case "wind-down": return Moon;
    case "massage": return Heart;
    case "breathwork": return Wind;
    default: return Waves;
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case "rest": return "text-indigo-500";
    case "stretch": return "text-emerald-500";
    case "hydration": return "text-sky-500";
    case "wind-down": return "text-violet-500";
    case "massage": return "text-rose-500";
    case "breathwork": return "text-cyan-500";
    default: return "text-teal-500";
  }
};

const getTagIcon = (tag: string) => {
  switch (tag.toLowerCase()) {
    case "rest": return Bed;
    case "stretch": return Leaf;
    case "hydration": return Droplets;
    case "wind-down": return Moon;
    case "massage": return Heart;
    case "breathwork": return Wind;
    default: return Waves;
  }
};

export function RecoveryPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [savedRecovery, setSavedRecovery] = useState<SavedRoutine[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
  const [calendarConfirmOpen, setCalendarConfirmOpen] = useState(false);
  const [pendingCalendarItem, setPendingCalendarItem] = useState<EnergyAdaptivePick | RecoveryItem | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("any");
  const [styleFilter, setStyleFilter] = useState<StyleFilter>("any");
  const [intensityFilter, setIntensityFilter] = useState<IntensityFilter>("any");
  
  const energyContext = getCurrentEnergyContext();
  const currentEnergy = energyContext?.energy || "medium";

  useEffect(() => {
    const saved = getSavedRoutinesByType("workout").filter(r => 
      r.tags?.some(t => ["recovery", "rest", "stretch", "massage"].includes(t.toLowerCase()))
    );
    setSavedRecovery(saved);
  }, []);

  const handleSaveAIPick = (item: EnergyAdaptivePick) => {
    const saved = saveRoutine({
      type: "workout",
      title: item.title,
      description: item.why,
      data: { duration: item.duration, tag: item.tag },
      tags: [item.tag.toLowerCase(), "recovery"],
    });
    setSavedRecovery([saved, ...savedRecovery]);
    toast({
      title: "Added to your system.",
      description: `"${item.title}" (${item.duration} min). Notice how this matches your current energy and supports recovery.`,
    });
  };

  const handleSaveRecovery = (item: RecoveryItem) => {
    const saved = saveRoutine({
      type: "workout",
      title: item.title,
      description: item.description,
      data: { duration: item.duration, category: item.category },
      tags: [item.tag.toLowerCase(), "recovery"],
    });
    setSavedRecovery([saved, ...savedRecovery]);
    toast({
      title: "Saved.",
      description: `"${item.title}" (${item.duration} min) added. Notice how rest supports your resilience.`,
    });
  };

  const handleAddToCalendar = (item: EnergyAdaptivePick | RecoveryItem) => {
    setPendingCalendarItem(item);
    setCalendarConfirmOpen(true);
  };

  const confirmAddToCalendar = () => {
    if (!pendingCalendarItem) return;
    
    const today = new Date();
    today.setHours(20, 0, 0, 0);
    
    const endTime = new Date(today);
    endTime.setMinutes(endTime.getMinutes() + pendingCalendarItem.duration);
    
    const description = 'why' in pendingCalendarItem 
      ? pendingCalendarItem.why 
      : (pendingCalendarItem as RecoveryItem).description;
    const tags = 'tag' in pendingCalendarItem 
      ? [pendingCalendarItem.tag.toLowerCase(), "recovery"]
      : [(pendingCalendarItem as RecoveryItem).category, "recovery"];
    
    saveCalendarEvent({
      title: pendingCalendarItem.title,
      description,
      dimension: "physical",
      startTime: today.getTime(),
      endTime: endTime.getTime(),
      isAllDay: false,
      location: null,
      virtualLink: null,
      reminders: [],
      recurring: false,
      recurrencePattern: null,
      relatedFoundationIds: [],
      tags,
    });
    
    toast({
      title: "Added to calendar.",
      description: `"${pendingCalendarItem.title}" scheduled for this evening. Notice how planning ahead shifts the mental load.`,
    });
    setCalendarConfirmOpen(false);
    setPendingCalendarItem(null);
    setSelectedSuggestionId(null);
  };

  const isSaved = (title: string) => {
    return savedRecovery.some(s => s.title === title);
  };

  const energyAdaptivePicks = ENERGY_ADAPTIVE_PICKS[currentEnergy];
  
  // Filter recovery items by category, time, and intensity
  const filteredRecovery = RECOVERY_LIBRARY.filter(r => {
    // Category mapping for Wave 6A categories
    const matchesCategory = !selectedCategory || 
      r.category === selectedCategory ||
      (selectedCategory === "breathwork" && r.category === "breathwork") ||
      (selectedCategory === "stretch" && r.category === "stretch") ||
      (selectedCategory === "grounding" && (r.category === "rest" || r.tag.toLowerCase().includes("ground"))) ||
      (selectedCategory === "wind-down" && r.category === "wind-down") ||
      (selectedCategory === "stress-reset" && (r.category === "massage" || r.category === "hydration"));
    
    // Time filter
    const matchesTime = timeFilter === "any" || 
      (timeFilter === "5" && r.duration <= 5) ||
      (timeFilter === "10" && r.duration <= 10) ||
      (timeFilter === "20" && r.duration <= 20);
    
    // Intensity filter (gentle = shorter, moderate = longer)
    const matchesIntensity = intensityFilter === "any" ||
      (intensityFilter === "gentle" && r.duration <= 10) ||
      (intensityFilter === "moderate" && r.duration > 10);
    
    return matchesCategory && matchesTime && matchesIntensity;
  });

  // Wave 6A categories for Recovery
  const categories = [
    { id: "breathwork", label: "Breathwork", icon: Wind },
    { id: "stretch", label: "Stretch & Mobility", icon: Leaf },
    { id: "grounding", label: "Grounding", icon: Waves },
    { id: "wind-down", label: "Sleep Wind-Down", icon: Moon },
    { id: "stress-reset", label: "Stress Reset", icon: Heart },
  ];


  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Recovery" />
      
      <ScrollArea className="h-[calc(100vh-57px)]">
        <div className="p-4 max-w-2xl mx-auto space-y-6 pb-24">
          <section>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="font-display font-semibold text-sm">
                AI Picks
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Recommended based on how you're feeling today.
            </p>
            <p className="text-xs text-muted-foreground mb-2">
              {selectedSuggestionId ? "Tap Save to add this practice" : "Pick 1 option to save."}
            </p>
            <div className="space-y-2">
              {energyAdaptivePicks.map((item) => {
                const Icon = getTagIcon(item.tag);
                const saved = isSaved(item.title);
                const isSelected = selectedSuggestionId === item.id;
                return (
                  <Card 
                    key={item.id} 
                    className={`hover-elevate cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary bg-primary/5' : ''}`}
                    onClick={() => setSelectedSuggestionId(isSelected ? null : item.id)}
                    data-testid={`card-recovery-suggested-${item.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {isSelected && <Check className="h-5 w-5 text-primary flex-shrink-0 mt-1" />}
                        <div className={`p-2 rounded-lg bg-muted ${getCategoryColor(item.tag.toLowerCase())}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm">{item.title}</h3>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {item.duration} min
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {item.tag}
                            </Badge>
                            {saved && (
                              <Badge variant="secondary" className="text-xs">
                                <Check className="h-3 w-3 mr-1" /> Saved
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-primary mt-2 italic">
                            {item.why}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <div className="flex gap-2 mt-3">
              <Button 
                className="flex-1"
                disabled={!selectedSuggestionId}
                onClick={() => {
                  const selected = energyAdaptivePicks.find(r => r.id === selectedSuggestionId);
                  if (selected && !isSaved(selected.title)) {
                    handleSaveAIPick(selected);
                    setSelectedSuggestionId(null);
                  }
                }}
                data-testid="button-save-suggestion"
              >
                <Check className="w-4 h-4 mr-1" />
                Save
              </Button>
              <Button 
                variant="outline"
                className="flex-1"
                disabled={!selectedSuggestionId}
                onClick={() => {
                  const selected = energyAdaptivePicks.find(r => r.id === selectedSuggestionId);
                  if (selected) {
                    handleAddToCalendar(selected);
                  }
                }}
                data-testid="button-calendar-suggestion"
              >
                <Calendar className="w-4 h-4 mr-1" />
                Add to Calendar
              </Button>
            </div>
          </section>

          {/* AI-Powered Recovery Search */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display font-semibold text-sm">Find Recovery Practices</h2>
              <Badge variant="outline" className="text-xs">
                <Sparkles className="w-3 h-3 mr-1" />
                AI-Powered
              </Badge>
            </div>
            <InAppSearch 
              category="recovery"
              placeholder="Search stretches, foam rolling, recovery..."
              onResultSave={(result: SearchResult) => {
                const routine = saveRoutine({
                  type: "recovery",
                  title: result.title,
                  description: result.description,
                  data: { 
                    duration: parseInt(result.duration?.replace(/\D/g, '') || '0') || 10,
                    steps: result.details || []
                  },
                  tags: result.tags,
                });
                setSavedRecovery([routine, ...savedRecovery]);
                toast({ title: "Recovery saved", description: `${result.title} added to your practices` });
              }}
            />
          </section>

          <section>
            <h2 className="font-display font-semibold text-sm mb-3">
              Browse by Category
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedCategory === cat.id;
                const colorMap: Record<string, { color: string; bgColor: string }> = {
                  "breathwork": { color: "text-sky-500", bgColor: "bg-sky-500/10" },
                  "stretch": { color: "text-amber-500", bgColor: "bg-amber-500/10" },
                  "grounding": { color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
                  "wind-down": { color: "text-indigo-500", bgColor: "bg-indigo-500/10" },
                  "stress-reset": { color: "text-rose-500", bgColor: "bg-rose-500/10" },
                };
                const colors = colorMap[cat.id] || { color: "text-muted-foreground", bgColor: "bg-muted" };
                return (
                  <Card
                    key={cat.id}
                    className={`cursor-pointer transition-all ${
                      isSelected 
                        ? "ring-2 ring-primary bg-primary/5" 
                        : "hover-elevate"
                    }`}
                    onClick={() => setSelectedCategory(isSelected ? null : cat.id)}
                    data-testid={`card-recovery-category-${cat.id}`}
                  >
                    <CardContent className="p-3 flex flex-col items-center text-center gap-2">
                      <div className={`w-10 h-10 rounded-lg ${colors.bgColor} flex items-center justify-center`}>
                        <Icon className={`h-5 w-5 ${colors.color}`} />
                      </div>
                      <span className="text-xs font-medium">{cat.label}</span>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Time:</span>
              {(["any", "5", "10", "20"] as TimeFilter[]).map((t) => (
                <Button
                  key={t}
                  variant={timeFilter === t ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeFilter(t)}
                  data-testid={`button-time-${t}`}
                >
                  {t === "any" ? "Any" : `${t} min`}
                </Button>
              ))}
            </div>
            
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <MessageSquareText className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Intensity:</span>
              {(["any", "gentle", "moderate"] as IntensityFilter[]).map((i) => (
                <Button
                  key={i}
                  variant={intensityFilter === i ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIntensityFilter(i)}
                  data-testid={`button-intensity-${i}`}
                >
                  {i === "any" ? "Any" : i.charAt(0).toUpperCase() + i.slice(1)}
                </Button>
              ))}
            </div>
            
            <div className="space-y-2">
              {filteredRecovery.map((item) => {
                const Icon = getCategoryIcon(item.category);
                const saved = isSaved(item.title);
                return (
                  <Card 
                    key={item.id} 
                    className="hover-elevate"
                    data-testid={`card-recovery-${item.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg bg-muted ${getCategoryColor(item.category)}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm">{item.title}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {item.duration} min
                            </Badge>
                            <Badge variant="secondary" className="text-xs capitalize">
                              {item.tag}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button 
                            size="sm" 
                            variant={saved ? "secondary" : "outline"}
                            onClick={() => !saved && handleSaveRecovery(item)}
                            disabled={saved}
                            data-testid={`button-save-recovery-browse-${item.id}`}
                          >
                            {saved ? (
                              <><Check className="h-4 w-4 mr-1" /> Saved</>
                            ) : (
                              "Save"
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAddToCalendar(item)}
                            data-testid={`button-calendar-recovery-browse-${item.id}`}
                          >
                            <Calendar className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          <section className="pt-4">
            <Card className="bg-primary/5 border-primary/10">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <MessageSquareText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-sm">Need something specific?</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Ask DW to find a recovery routine that fits your current state.
                    </p>
                    <Link href="/">
                      <Button size="sm" className="mt-3" data-testid="button-ask-ai-recovery">
                        <MessageSquareText className="h-4 w-4 mr-2" />
                        Ask AI for recovery ideas
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </ScrollArea>

      <Dialog open={calendarConfirmOpen} onOpenChange={setCalendarConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Calendar</DialogTitle>
            <DialogDescription>
              Would you like to schedule "{pendingCalendarItem?.title}" for this evening at 8 PM?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setCalendarConfirmOpen(false)} data-testid="button-cancel-calendar">
              Cancel
            </Button>
            <Button onClick={confirmAddToCalendar} data-testid="button-confirm-calendar">
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
