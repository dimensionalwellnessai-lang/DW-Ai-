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
} from "lucide-react";
import { getGettingToKnowYou, getBodyProfile, getFinanceProfile, saveCalendarEvent } from "@/lib/guest-storage";

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

export function ChallengesPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedChallenge, setSelectedChallenge] = useState<{ category: string; title: string } | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const gtky = getGettingToKnowYou();
  const bodyProfile = getBodyProfile();
  const financeProfile = getFinanceProfile();
  
  const userNeeds = gtky?.currentNeeds || [];
  const bodyGoal = bodyProfile?.bodyGoal || null;
  const financialStress = financeProfile?.moneyEmotion === "anxious";
  
  const categories = getChallengeCategories(userNeeds, bodyGoal, financialStress);

  const handleChallengeClick = (categoryId: string, challengeTitle: string) => {
    setSelectedChallenge({ category: categoryId, title: challengeTitle });
    setDetailDialogOpen(true);
  };

  const handleAddToCalendar = () => {
    if (!selectedChallenge) return;
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    saveCalendarEvent({
      title: selectedChallenge.title,
      description: `Challenge: ${selectedChallenge.title}`,
      eventDate: tomorrow.getTime(),
      startTime: "09:00",
      linkedType: "routine",
      linkedId: selectedChallenge.title,
    });
    
    toast({
      title: "Added to Calendar",
      description: `"${selectedChallenge.title}" starts tomorrow.`,
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
        <div className="p-4 max-w-2xl mx-auto space-y-4 pb-8">
          <p className="text-muted-foreground font-body text-center py-2">
            Challenges are here to empower you, not pressure you. Pick something that feels right for where you are today.
          </p>

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
    </div>
  );
}
