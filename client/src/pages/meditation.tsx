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
  Play, 
  Check, 
  Brain,
  Heart,
  Sparkles,
  Moon,
  Sun,
  Wind,
  Calendar,
  Leaf,
  Target
} from "lucide-react";
import { 
  getSavedRoutinesByType, 
  saveRoutine, 
  saveCalendarEvent,
  getSoftOnboardingMood,
  type SavedRoutine 
} from "@/lib/guest-storage";
import { getCurrentEnergyContext, type EnergyLevel } from "@/lib/energy-context";

interface MeditationItem {
  id: string;
  title: string;
  description: string;
  duration: number;
  category: "calm" | "stress" | "grief" | "manifestation" | "sleep" | "grounding" | "focus";
  tag: string;
  mood: string[];
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
      title: "Gentle Grounding Breath",
      duration: 5,
      tag: "Calm",
      why: "Notice if your energy feels low. This helps you settle without needing focus or effort."
    },
    {
      id: "low-2", 
      title: "Body Awareness Reset",
      duration: 10,
      tag: "Grounding",
      why: "Notice if your mind feels busy but your body needs rest. This can help."
    }
  ],
  medium: [
    {
      id: "med-1",
      title: "Balanced Breath & Focus",
      duration: 10,
      tag: "Focus",
      why: "Notice that you have enough energy to engage without pushing. This keeps things balanced."
    },
    {
      id: "med-2",
      title: "Calm Visualization",
      duration: 15,
      tag: "Manifestation",
      why: "Notice if you're open to reflection but want something gentle. This might fit."
    }
  ],
  high: [
    {
      id: "high-1",
      title: "Intentional Focus Meditation",
      duration: 10,
      tag: "Focus",
      why: "Notice that your energy is up. This helps channel it instead of letting it scatter."
    },
    {
      id: "high-2",
      title: "Manifestation Clarity Session",
      duration: 15,
      tag: "Manifestation",
      why: "Notice if you feel ready to engage. This supports direction and intention."
    }
  ]
};

const MEDITATION_LIBRARY: MeditationItem[] = [
  {
    id: "1",
    title: "Gentle Grounding Breath",
    description: "A calming breath pattern to help you settle without effort",
    duration: 5,
    category: "calm",
    tag: "Calm",
    mood: ["anxious", "overwhelmed", "scattered", "tired"]
  },
  {
    id: "2",
    title: "Body Awareness Reset",
    description: "Release tension from head to toe with gentle awareness",
    duration: 10,
    category: "grounding",
    tag: "Grounding",
    mood: ["tired", "tense", "stressed", "busy"]
  },
  {
    id: "3",
    title: "Balanced Breath & Focus",
    description: "Equal breath counts to center and engage your mind",
    duration: 10,
    category: "focus",
    tag: "Focus",
    mood: ["neutral", "steady", "present"]
  },
  {
    id: "4",
    title: "Calm Visualization",
    description: "Gentle imagery to support reflection and openness",
    duration: 15,
    category: "manifestation",
    tag: "Manifestation",
    mood: ["open", "reflective", "curious"]
  },
  {
    id: "5",
    title: "Intentional Focus Meditation",
    description: "Channel your energy with clarity and direction",
    duration: 10,
    category: "focus",
    tag: "Focus",
    mood: ["motivated", "activated", "ready"]
  },
  {
    id: "6",
    title: "Manifestation Clarity Session",
    description: "Set intentions when you feel ready to engage",
    duration: 15,
    category: "manifestation",
    tag: "Manifestation",
    mood: ["energized", "motivated", "clear"]
  },
  {
    id: "7",
    title: "Sleep Wind-Down",
    description: "Ease into rest with a soothing body relaxation",
    duration: 12,
    category: "sleep",
    tag: "Sleep",
    mood: ["tired", "restless", "wired"]
  },
  {
    id: "8",
    title: "Stress Release Breathwork",
    description: "Focused breathing to release accumulated tension",
    duration: 8,
    category: "stress",
    tag: "Stress",
    mood: ["stressed", "anxious", "overwhelmed"]
  },
  {
    id: "9",
    title: "Grief & Loss Meditation",
    description: "Gentle space for processing difficult emotions",
    duration: 15,
    category: "grief",
    tag: "Grief",
    mood: ["sad", "grieving", "heavy"]
  },
  {
    id: "10",
    title: "Deep Calm Practice",
    description: "Extended relaxation for nervous system reset",
    duration: 20,
    category: "calm",
    tag: "Calm",
    mood: ["tense", "overwhelmed", "need rest"]
  },
];

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "calm": return Wind;
    case "stress": return Heart;
    case "grief": return Moon;
    case "manifestation": return Sparkles;
    case "sleep": return Moon;
    case "grounding": return Leaf;
    case "focus": return Target;
    default: return Brain;
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case "calm": return "text-sky-500";
    case "stress": return "text-rose-500";
    case "grief": return "text-indigo-400";
    case "manifestation": return "text-violet-500";
    case "sleep": return "text-indigo-500";
    case "grounding": return "text-emerald-500";
    case "focus": return "text-amber-500";
    default: return "text-violet-500";
  }
};

const getTagIcon = (tag: string) => {
  switch (tag.toLowerCase()) {
    case "calm": return Wind;
    case "grounding": return Leaf;
    case "focus": return Target;
    case "manifestation": return Sparkles;
    case "sleep": return Moon;
    case "stress": return Heart;
    case "grief": return Moon;
    default: return Brain;
  }
};

export function MeditationPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [savedMeditations, setSavedMeditations] = useState<SavedRoutine[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
  const [calendarConfirmOpen, setCalendarConfirmOpen] = useState(false);
  const [pendingCalendarItem, setPendingCalendarItem] = useState<EnergyAdaptivePick | MeditationItem | null>(null);
  
  const energyContext = getCurrentEnergyContext();
  const currentEnergy = energyContext.energy;

  useEffect(() => {
    setSavedMeditations(getSavedRoutinesByType("meditation"));
  }, []);

  const handleSaveAIPick = (item: EnergyAdaptivePick) => {
    const saved = saveRoutine({
      type: "meditation",
      title: item.title,
      description: item.why,
      data: { duration: item.duration, tag: item.tag },
      tags: [item.tag.toLowerCase(), "meditation"],
    });
    setSavedMeditations([saved, ...savedMeditations]);
    toast({
      title: "Added to your system.",
      description: `"${item.title}" (${item.duration} min). Notice how this matches your current energy and supports nervous system balance.`,
    });
  };

  const handleSaveMeditation = (item: MeditationItem) => {
    const saved = saveRoutine({
      type: "meditation",
      title: item.title,
      description: item.description,
      data: { duration: item.duration, category: item.category },
      tags: item.mood,
    });
    setSavedMeditations([saved, ...savedMeditations]);
    toast({
      title: "Saved.",
      description: `"${item.title}" (${item.duration} min) added. Notice how stillness supports your wellbeing.`,
    });
  };

  const handleAddToCalendar = (item: EnergyAdaptivePick | MeditationItem) => {
    setPendingCalendarItem(item);
    setCalendarConfirmOpen(true);
  };

  const confirmAddToCalendar = () => {
    if (!pendingCalendarItem) return;
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(7, 0, 0, 0);
    
    const endTime = new Date(tomorrow);
    endTime.setMinutes(endTime.getMinutes() + pendingCalendarItem.duration);
    
    const description = 'why' in pendingCalendarItem 
      ? pendingCalendarItem.why 
      : (pendingCalendarItem as MeditationItem).description;
    const tags = 'tag' in pendingCalendarItem 
      ? [pendingCalendarItem.tag.toLowerCase(), "meditation"]
      : [(pendingCalendarItem as MeditationItem).category, "meditation"];
    
    saveCalendarEvent({
      title: pendingCalendarItem.title,
      description,
      dimension: "spiritual",
      startTime: tomorrow.getTime(),
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
      description: `"${pendingCalendarItem.title}" scheduled for tomorrow morning. Notice how planning ahead shifts the mental load.`,
    });
    setCalendarConfirmOpen(false);
    setPendingCalendarItem(null);
    setSelectedSuggestionId(null);
  };

  const isSaved = (title: string) => {
    return savedMeditations.some(s => s.title === title);
  };

  const energyAdaptivePicks = ENERGY_ADAPTIVE_PICKS[currentEnergy];
  
  const getEnergyLabel = (energy: EnergyLevel): string => {
    switch (energy) {
      case "low": return "Low Energy";
      case "medium": return "Steady";
      case "high": return "High Energy";
    }
  };
  
  const filteredMeditations = selectedCategory 
    ? MEDITATION_LIBRARY.filter(m => m.category === selectedCategory)
    : MEDITATION_LIBRARY;

  const categories = [
    { id: "calm", label: "Calm", icon: Wind },
    { id: "stress", label: "Stress", icon: Heart },
    { id: "grief", label: "Grief", icon: Moon },
    { id: "manifestation", label: "Manifestation", icon: Sparkles },
    { id: "sleep", label: "Sleep", icon: Moon },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Meditation" />
      
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
                    data-testid={`card-meditation-suggested-${item.id}`}
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
                  const selected = energyAdaptivePicks.find(m => m.id === selectedSuggestionId);
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
                  const selected = energyAdaptivePicks.find(m => m.id === selectedSuggestionId);
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

          <section>
            <h2 className="font-display font-semibold text-sm mb-3">
              Browse by Category
            </h2>
            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
                data-testid="button-category-all"
              >
                All
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.id)}
                  data-testid={`button-category-${cat.id}`}
                >
                  <cat.icon className="h-4 w-4 mr-1" />
                  {cat.label}
                </Button>
              ))}
            </div>
            
            <div className="space-y-2">
              {filteredMeditations.map((item) => {
                const Icon = getCategoryIcon(item.category);
                const saved = isSaved(item.title);
                return (
                  <Card 
                    key={item.id} 
                    className="hover-elevate"
                    data-testid={`card-meditation-${item.id}`}
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
                            onClick={() => !saved && handleSaveMeditation(item)}
                            disabled={saved}
                            data-testid={`button-save-meditation-browse-${item.id}`}
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
                            data-testid={`button-calendar-meditation-browse-${item.id}`}
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
                      Ask the AI assistant to find or create a meditation that fits your current state.
                    </p>
                    <Link href="/">
                      <Button size="sm" className="mt-3" data-testid="button-ask-ai-meditation">
                        <MessageSquareText className="h-4 w-4 mr-2" />
                        Ask AI for a meditation
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
              Would you like to schedule "{pendingCalendarItem?.title}" for tomorrow at 7 AM?
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
