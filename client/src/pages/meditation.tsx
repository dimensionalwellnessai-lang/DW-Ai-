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
  Calendar
} from "lucide-react";
import { 
  getSavedRoutinesByType, 
  saveRoutine, 
  saveCalendarEvent,
  getSoftOnboardingMood,
  type SavedRoutine 
} from "@/lib/guest-storage";

interface MeditationItem {
  id: string;
  title: string;
  description: string;
  duration: number;
  category: "breath" | "body" | "mindfulness" | "sleep" | "energy";
  mood: string[];
}

const MEDITATION_LIBRARY: MeditationItem[] = [
  {
    id: "1",
    title: "4-7-8 Breathing",
    description: "A calming breath pattern to reduce anxiety and prepare for rest",
    duration: 5,
    category: "breath",
    mood: ["anxious", "overwhelmed", "scattered"]
  },
  {
    id: "2",
    title: "Body Scan Relaxation",
    description: "Release tension from head to toe with gentle awareness",
    duration: 10,
    category: "body",
    mood: ["tired", "tense", "stressed"]
  },
  {
    id: "3",
    title: "Gratitude Reflection",
    description: "A gentle practice to notice what's going well",
    duration: 8,
    category: "mindfulness",
    mood: ["low", "neutral", "steady"]
  },
  {
    id: "4",
    title: "Sleep Wind-Down",
    description: "Ease into rest with a soothing visualization",
    duration: 12,
    category: "sleep",
    mood: ["tired", "restless", "wired"]
  },
  {
    id: "5",
    title: "Morning Energy Boost",
    description: "Wake up your mind and body with intention",
    duration: 7,
    category: "energy",
    mood: ["groggy", "unmotivated", "neutral"]
  },
  {
    id: "6",
    title: "Loving-Kindness",
    description: "Cultivate compassion for yourself and others",
    duration: 10,
    category: "mindfulness",
    mood: ["lonely", "sad", "disconnected"]
  },
  {
    id: "7",
    title: "Box Breathing",
    description: "Equal counts to center and ground your energy",
    duration: 4,
    category: "breath",
    mood: ["anxious", "scattered", "overwhelmed"]
  },
  {
    id: "8",
    title: "Mindful Awareness",
    description: "Simply observe thoughts without judgment",
    duration: 15,
    category: "mindfulness",
    mood: ["racing thoughts", "distracted", "neutral"]
  },
];

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "breath": return Wind;
    case "body": return Heart;
    case "sleep": return Moon;
    case "energy": return Sun;
    default: return Brain;
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case "breath": return "text-sky-500";
    case "body": return "text-rose-500";
    case "sleep": return "text-indigo-500";
    case "energy": return "text-amber-500";
    default: return "text-violet-500";
  }
};

export function MeditationPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [savedMeditations, setSavedMeditations] = useState<SavedRoutine[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
  const [calendarConfirmOpen, setCalendarConfirmOpen] = useState(false);
  const [pendingCalendarItem, setPendingCalendarItem] = useState<MeditationItem | null>(null);
  
  const userMood = getSoftOnboardingMood();

  useEffect(() => {
    setSavedMeditations(getSavedRoutinesByType("meditation"));
  }, []);

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
      description: `"${item.title}" added to your system.`,
    });
  };

  const handleAddToCalendar = (item: MeditationItem) => {
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
    
    saveCalendarEvent({
      title: pendingCalendarItem.title,
      description: pendingCalendarItem.description,
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
      tags: [pendingCalendarItem.category, "meditation"],
    });
    
    toast({
      title: "Added to calendar.",
      description: `"${pendingCalendarItem.title}" scheduled for tomorrow morning.`,
    });
    setCalendarConfirmOpen(false);
    setPendingCalendarItem(null);
    setSelectedSuggestionId(null);
  };

  const isSaved = (itemId: string) => {
    return savedMeditations.some(s => s.title === MEDITATION_LIBRARY.find(m => m.id === itemId)?.title);
  };

  const getWhyText = (item: MeditationItem): string => {
    if (!userMood) return "A great starting point for any moment.";
    
    const moodLower = userMood.toLowerCase();
    if (item.mood.some(m => moodLower.includes(m) || m.includes(moodLower))) {
      return `I'm suggesting this because it matches your ${userMood} energy today.`;
    }
    if (item.category === "breath") return "Breathwork helps reset your nervous system.";
    if (item.category === "body") return "This can help release physical tension.";
    if (item.category === "sleep") return "Perfect for winding down.";
    if (item.category === "energy") return "A good pick when you need a gentle boost.";
    return "This practice supports mindful awareness.";
  };

  const getSuggestedMeditations = (): Array<MeditationItem & { why: string }> => {
    const items = !userMood 
      ? MEDITATION_LIBRARY.slice(0, 3)
      : (() => {
          const moodLower = userMood.toLowerCase();
          const matching = MEDITATION_LIBRARY.filter(m => 
            m.mood.some(mood => moodLower.includes(mood) || mood.includes(moodLower))
          );
          return matching.length > 0 ? matching.slice(0, 3) : MEDITATION_LIBRARY.slice(0, 3);
        })();
    
    return items.map(item => ({
      ...item,
      why: getWhyText(item)
    }));
  };

  const suggestedMeditations = getSuggestedMeditations();
  
  const filteredMeditations = selectedCategory 
    ? MEDITATION_LIBRARY.filter(m => m.category === selectedCategory)
    : MEDITATION_LIBRARY;

  const categories = [
    { id: "breath", label: "Breathing", icon: Wind },
    { id: "body", label: "Body", icon: Heart },
    { id: "mindfulness", label: "Mindfulness", icon: Brain },
    { id: "sleep", label: "Sleep", icon: Moon },
    { id: "energy", label: "Energy", icon: Sun },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Meditation" />
      
      <ScrollArea className="h-[calc(100vh-57px)]">
        <div className="p-4 max-w-2xl mx-auto space-y-6 pb-24">
          {suggestedMeditations.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-primary" />
                <h2 className="font-display font-semibold text-sm">
                  Suggested for You
                </h2>
                {userMood && (
                  <Badge variant="secondary" className="text-xs">
                    Based on: {userMood}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                {selectedSuggestionId ? "Tap Save to add this practice" : "Pick 1 option to save."}
              </p>
              <div className="space-y-2">
                {suggestedMeditations.map((item) => {
                  const Icon = getCategoryIcon(item.category);
                  const saved = isSaved(item.id);
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
                    const selected = suggestedMeditations.find(m => m.id === selectedSuggestionId);
                    if (selected && !isSaved(selected.id)) {
                      handleSaveMeditation(selected);
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
                    const selected = suggestedMeditations.find(m => m.id === selectedSuggestionId);
                    if (selected) {
                      handleAddToCalendar(selected);
                      setSelectedSuggestionId(null);
                    }
                  }}
                  data-testid="button-calendar-suggestion"
                >
                  <Calendar className="w-4 h-4 mr-1" />
                  Add to Calendar
                </Button>
              </div>
            </section>
          )}

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
                const saved = isSaved(item.id);
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
                              {item.category}
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
