import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageHeader } from "@/components/page-header";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Dumbbell,
  Brain,
  Utensils,
  Users,
  DollarSign,
  ChevronRight,
  Sparkles,
  Calendar,
  Target,
  Check,
  Clock,
} from "lucide-react";
import { getGettingToKnowYou, getBodyProfile, getFinanceProfile, saveCalendarEvent, getSoftOnboardingMood } from "@/lib/guest-storage";
import { getCurrentEnergyContext, type EnergyLevel } from "@/lib/energy-context";

function getChallengeCategories(userNeeds: string[], bodyGoal: string | null, financialStress: boolean) {
  return [
    {
      id: "workout",
      name: "Workout Challenges",
      icon: Dumbbell,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      description: "Push your physical limits and build strength",
      examples: getPersonalizedWorkoutChallenges(bodyGoal),
    },
    {
      id: "mental",
      name: "Mental Health",
      icon: Brain,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      description: "Build resilience and calm your mind",
      examples: getPersonalizedMentalChallenges(userNeeds),
    },
    {
      id: "nutrition",
      name: "Meal & Nutrition",
      icon: Utensils,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      description: "Nourish your body with intention",
      examples: getPersonalizedNutritionChallenges(bodyGoal),
    },
    {
      id: "social",
      name: "Social Challenges",
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      description: "Strengthen your connections",
      examples: getPersonalizedSocialChallenges(userNeeds),
    },
    {
      id: "financial",
      name: "Financial Challenges",
      icon: DollarSign,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      description: "Build financial peace of mind",
      examples: getPersonalizedFinancialChallenges(financialStress),
    },
  ];
}

function getPersonalizedWorkoutChallenges(bodyGoal: string | null): string[] {
  const base = ["7-day morning stretch", "10K steps daily"];
  if (bodyGoal === "build_muscle") return [...base, "Progressive pushup challenge"];
  if (bodyGoal === "slim_fit") return [...base, "30-min cardio 5x/week"];
  if (bodyGoal === "endurance") return [...base, "Couch to 5K program"];
  return [...base, "30-day movement streak"];
}

function getPersonalizedMentalChallenges(needs: string[]): string[] {
  const base = ["5-minute daily meditation"];
  if (needs.includes("calm")) return [...base, "Digital detox weekend", "Breathwork before bed"];
  if (needs.includes("focus")) return [...base, "Single-tasking day", "Pomodoro week"];
  if (needs.includes("clarity")) return [...base, "Morning journaling", "Weekly reflection"];
  return [...base, "Gratitude journaling", "Screen-free morning"];
}

function getPersonalizedNutritionChallenges(bodyGoal: string | null): string[] {
  const base = ["Hydration challenge", "Meal prep Sunday"];
  if (bodyGoal === "slim_fit") return [...base, "Mindful portion sizes"];
  if (bodyGoal === "build_muscle") return [...base, "Protein with every meal"];
  return [...base, "Try one new recipe weekly"];
}

function getPersonalizedSocialChallenges(needs: string[]): string[] {
  if (needs.includes("connection")) {
    return ["Weekly video call with loved one", "Join a local group", "Express appreciation daily"];
  }
  return ["Reach out to an old friend", "Random act of kindness", "Weekly coffee date"];
}

function getPersonalizedFinancialChallenges(hasStress: boolean): string[] {
  if (hasStress) {
    return ["Track all spending for a week", "Find 3 expenses to cut", "Build $100 emergency buffer"];
  }
  return ["No-spend weekend", "Save $5 daily", "Review subscriptions"];
}

interface AIPick {
  title: string;
  category: string;
  why: string;
  duration: string;
}

// Energy-adaptive AI Picks with "Notice" phrasing (3 picks per energy level)
const ENERGY_ADAPTIVE_PICKS: Record<EnergyLevel, AIPick[]> = {
  low: [
    {
      title: "5-minute daily meditation",
      category: "mental",
      why: "Notice how small moments of stillness can restore your energy without demanding more from you.",
      duration: "7 days"
    },
    {
      title: "Gratitude journaling",
      category: "mental",
      why: "Notice how gentle reflection supports a shift in perspective when energy is low.",
      duration: "7 days"
    },
    {
      title: "Hydration challenge",
      category: "nutrition",
      why: "Notice how staying hydrated supports your body when energy feels low.",
      duration: "7 days"
    },
  ],
  medium: [
    {
      title: "7-day morning stretch",
      category: "workout",
      why: "Notice how consistent morning movement builds sustainable energy over time.",
      duration: "7 days"
    },
    {
      title: "Mindful eating week",
      category: "nutrition",
      why: "Notice how paying attention to nourishment shifts your relationship with food.",
      duration: "7 days"
    },
    {
      title: "Digital detox evening",
      category: "mental",
      why: "Notice how stepping away from screens in the evening supports better rest.",
      duration: "7 days"
    },
  ],
  high: [
    {
      title: "10K steps daily",
      category: "workout",
      why: "Notice how channeling high energy into movement creates a positive momentum.",
      duration: "7 days"
    },
    {
      title: "Reach out to 3 friends",
      category: "social",
      why: "Notice how connecting with others amplifies the energy you're already feeling.",
      duration: "7 days"
    },
    {
      title: "Try one new recipe weekly",
      category: "nutrition",
      why: "Notice how creative cooking channels high energy into nourishing yourself.",
      duration: "7 days"
    },
  ],
};

function getAIPicks(userNeeds: string[], bodyGoal: string | null, financialStress: boolean, userMood: string | null, energyLevel: EnergyLevel): AIPick[] {
  const basePicks: AIPick[] = [...ENERGY_ADAPTIVE_PICKS[energyLevel]];
  const result: AIPick[] = [];
  
  // Priority 1: Add personalized financial pick if stressed (replaces one base pick)
  if (financialStress) {
    result.push({
      title: "Track all spending for a week",
      category: "financial",
      why: "Notice how awareness of spending patterns brings clarity and reduces stress.",
      duration: "7 days"
    });
  }
  
  // Priority 2: Add personalized body goal pick if building muscle and not low energy
  if (bodyGoal === "build_muscle" && energyLevel !== "low" && result.length < 3) {
    result.push({
      title: "Progressive pushup challenge",
      category: "workout",
      why: "Notice how consistent strength work aligns with your body goals.",
      duration: "14 days"
    });
  }
  
  // Fill remaining slots with energy-based picks
  for (const pick of basePicks) {
    if (result.length >= 3) break;
    // Avoid duplicating categories already covered by personalized picks
    if (!result.some(r => r.title === pick.title)) {
      result.push(pick);
    }
  }
  
  return result.slice(0, 3);
}

export function ChallengesPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedChallenge, setSelectedChallenge] = useState<{ category: string; title: string } | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedAIPick, setSelectedAIPick] = useState<AIPick | null>(null);
  const [calendarConfirmOpen, setCalendarConfirmOpen] = useState(false);
  const gtky = getGettingToKnowYou();
  const bodyProfile = getBodyProfile();
  const financeProfile = getFinanceProfile();
  const userMood = getSoftOnboardingMood();
  
  const userNeeds = gtky?.currentNeeds || [];
  const bodyGoal = bodyProfile?.bodyGoal || null;
  const financialStress = financeProfile?.moneyEmotion === "anxious";
  
  const energyContext = getCurrentEnergyContext();
  const currentEnergy = energyContext?.energy || "medium";
  
  const categories = getChallengeCategories(userNeeds, bodyGoal, financialStress);
  const aiPicks = getAIPicks(userNeeds, bodyGoal, financialStress, userMood, currentEnergy);

  const handleChallengeClick = (categoryId: string, challengeTitle: string) => {
    setSelectedChallenge({ category: categoryId, title: challengeTitle });
    setDetailDialogOpen(true);
  };

  const handleAddToCalendar = () => {
    if (!selectedChallenge) return;
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    
    const endTime = new Date(tomorrow);
    endTime.setHours(10, 0, 0, 0);
    
    saveCalendarEvent({
      title: selectedChallenge.title,
      description: `Challenge: ${selectedChallenge.title}`,
      dimension: null,
      startTime: tomorrow.getTime(),
      endTime: endTime.getTime(),
      isAllDay: false,
      location: null,
      virtualLink: null,
      reminders: [],
      recurring: false,
      recurrencePattern: null,
      relatedFoundationIds: [],
      tags: ["challenge", selectedChallenge.category],
    });
    
    toast({
      title: "Added to calendar.",
      description: `"${selectedChallenge.title}" starts tomorrow. Notice how planning ahead shifts the mental load.`,
    });
    setDetailDialogOpen(false);
  };

  const handleStartWithAI = () => {
    if (!selectedChallenge) return;
    setDetailDialogOpen(false);
    setLocation(`/?challenge=${encodeURIComponent(selectedChallenge.title)}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Challenges" />
      
      <ScrollArea className="h-[calc(100vh-57px)]">
        <div className="p-4 max-w-2xl mx-auto space-y-6 pb-8">
          <p className="text-muted-foreground font-body text-center py-2">
            Challenges are here to empower you, not pressure you. Pick something that feels right for where you are today.
          </p>

          {aiPicks.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Picked for You</h2>
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedAIPick ? "Tap Save to start this challenge" : "Pick 1 option to save."}
              </p>
              <div className="space-y-2">
                {aiPicks.map((pick, idx) => {
                  const isSelected = selectedAIPick?.title === pick.title;
                  return (
                    <Card
                      key={idx}
                      className={`cursor-pointer transition-all ${isSelected ? "ring-2 ring-primary bg-primary/5" : "hover-elevate"}`}
                      onClick={() => setSelectedAIPick(isSelected ? null : pick)}
                      data-testid={`card-ai-pick-challenge-${idx}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {isSelected && <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />}
                          <div className="flex-1">
                            <h3 className="font-medium text-sm">{pick.title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                {pick.duration}
                              </Badge>
                              <Badge variant="secondary" className="text-xs capitalize">
                                {pick.category}
                              </Badge>
                            </div>
                            <p className="text-xs text-primary mt-2 italic">{pick.why}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  disabled={!selectedAIPick}
                  onClick={() => {
                    if (selectedAIPick) {
                      toast({
                        title: "Added to your system.",
                        description: `"${selectedAIPick.title}" added. Notice how this challenge matches your current energy.`,
                      });
                      setSelectedAIPick(null);
                    }
                  }}
                  data-testid="button-save-ai-pick"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Save
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={!selectedAIPick}
                  onClick={() => setCalendarConfirmOpen(true)}
                  data-testid="button-calendar-ai-pick"
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  Add to Calendar
                </Button>
              </div>
            </section>
          )}

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Browse by Category</h2>
            <div className="space-y-3">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <Card
                  key={category.id}
                  className="hover-elevate cursor-pointer transition-all"
                  onClick={() => setSelectedCategory(category.id === selectedCategory ? null : category.id)}
                  data-testid={`card-challenge-${category.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${category.bgColor}`}>
                        <Icon className={`h-6 w-6 ${category.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-display font-semibold">{category.name}</h3>
                          <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${selectedCategory === category.id ? "rotate-90" : ""}`} />
                        </div>
                        <p className="text-sm text-muted-foreground font-body mt-1">
                          {category.description}
                        </p>
                        {selectedCategory === category.id && (
                          <div className="mt-3 pt-3 border-t space-y-2" onClick={(e) => e.stopPropagation()}>
                            <p className="text-xs text-muted-foreground font-body">Tap a challenge to view details:</p>
                            <div className="flex flex-wrap gap-2">
                              {category.examples.map((example, idx) => (
                                <Badge 
                                  key={idx} 
                                  variant="secondary" 
                                  className="text-xs cursor-pointer hover-elevate"
                                  onClick={() => handleChallengeClick(category.id, example)}
                                  data-testid={`badge-challenge-${category.id}-${idx}`}
                                >
                                  {example}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            </div>
          </section>
        </div>
      </ScrollArea>

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              {selectedChallenge?.title}
            </DialogTitle>
            <DialogDescription>
              Ready to take on this challenge? Choose how to proceed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              This challenge will help you build positive habits. You can add it to your calendar or get AI guidance to personalize it.
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={handleAddToCalendar} className="w-full" data-testid="button-add-challenge-calendar">
                <Calendar className="h-4 w-4 mr-2" />
                Add to Calendar
              </Button>
              <Button variant="outline" onClick={handleStartWithAI} className="w-full" data-testid="button-start-challenge-ai">
                <Sparkles className="h-4 w-4 mr-2" />
                Start with AI
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={calendarConfirmOpen} onOpenChange={setCalendarConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Calendar</DialogTitle>
            <DialogDescription>
              Would you like to schedule "{selectedAIPick?.title}" to start tomorrow?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setCalendarConfirmOpen(false)} data-testid="button-cancel-calendar">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedAIPick) {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  tomorrow.setHours(9, 0, 0, 0);
                  const endTime = new Date(tomorrow);
                  endTime.setHours(10, 0, 0, 0);
                  
                  saveCalendarEvent({
                    title: selectedAIPick.title,
                    description: `Challenge: ${selectedAIPick.title}`,
                    dimension: null,
                    startTime: tomorrow.getTime(),
                    endTime: endTime.getTime(),
                    isAllDay: false,
                    location: null,
                    virtualLink: null,
                    reminders: [],
                    recurring: false,
                    recurrencePattern: null,
                    relatedFoundationIds: [],
                    tags: ["challenge", selectedAIPick.category],
                  });
                  
                  toast({
                    title: "Added to calendar.",
                    description: `"${selectedAIPick.title}" starts tomorrow.`,
                  });
                  setCalendarConfirmOpen(false);
                  setSelectedAIPick(null);
                }
              }}
              data-testid="button-confirm-calendar"
            >
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
