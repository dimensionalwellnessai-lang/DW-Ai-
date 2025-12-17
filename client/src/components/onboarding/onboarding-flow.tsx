import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, ArrowLeft, ArrowRight, Check, Target, Briefcase, GraduationCap, Heart, DollarSign, Palette, Users, Book, Home, Calendar } from "lucide-react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const LIFE_AREAS = [
  { id: "work", label: "Work", icon: Briefcase, description: "Deliverables, deadlines, meetings, goals" },
  { id: "school", label: "School", icon: GraduationCap, description: "Assignments, projects, schedule" },
  { id: "health", label: "Health", icon: Heart, description: "Goals, appointments, wellness" },
  { id: "financial", label: "Financial", icon: DollarSign, description: "Budget, goals, planning" },
  { id: "hobbies", label: "Hobbies", icon: Palette, description: "Creative pursuits, things to try" },
  { id: "relationships", label: "Relationships", icon: Users, description: "Family, friends, connections" },
  { id: "home", label: "Home", icon: Home, description: "Chores, household management" },
  { id: "reading", label: "Reading/Learning", icon: Book, description: "Books, courses, interests" },
];

const GOAL_TIMEFRAMES = [
  { id: "short", label: "Short-term (weeks)", description: "Goals to achieve in the next few weeks" },
  { id: "medium", label: "Medium-term (months)", description: "Goals for the next 3-6 months" },
  { id: "long", label: "Long-term (years)", description: "Big picture goals for the future" },
];

const FREE_TIME_OPTIONS = [
  { id: "less-1", label: "Less than 1 hour" },
  { id: "1-2", label: "1-2 hours" },
  { id: "2-4", label: "2-4 hours" },
  { id: "4-plus", label: "4+ hours" },
];

const MOTIVATION_TIME = [
  { id: "morning", label: "Morning" },
  { id: "afternoon", label: "Afternoon" },
  { id: "evening", label: "Evening" },
  { id: "varies", label: "It varies" },
];

const WELLNESS_FOCUS = [
  { id: "energy", label: "Physical energy" },
  { id: "emotional", label: "Emotional clarity" },
  { id: "sleep", label: "Better sleep" },
  { id: "focus", label: "Focus & productivity" },
  { id: "purpose", label: "Purpose & motivation" },
  { id: "financial", label: "Financial wellness" },
  { id: "creative", label: "Creative expression" },
  { id: "connection", label: "Social connection" },
  { id: "balance", label: "Work-life balance" },
];

interface LifeAreaData {
  goals: string;
  schedule: string;
  challenges: string;
}

interface OnboardingData {
  selectedAreas: string[];
  lifeAreaDetails: Record<string, LifeAreaData>;
  shortTermGoals: string;
  longTermGoals: string;
  freeTimeHours: string;
  peakMotivationTime: string;
  wellnessFocus: string[];
  relationshipGoals: string;
  systemName: string;
}

export function OnboardingFlow() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    selectedAreas: [],
    lifeAreaDetails: {},
    shortTermGoals: "",
    longTermGoals: "",
    freeTimeHours: "",
    peakMotivationTime: "",
    wellnessFocus: [],
    relationshipGoals: "",
    systemName: "",
  });

  const totalSteps = 7;
  const progress = ((step + 1) / totalSteps) * 100;

  const submitMutation = useMutation({
    mutationFn: async (onboardingData: OnboardingData) => {
      return apiRequest("POST", "/api/onboarding/complete", {
        responsibilities: onboardingData.selectedAreas,
        priorities: onboardingData.wellnessFocus,
        freeTimeHours: onboardingData.freeTimeHours,
        peakMotivationTime: onboardingData.peakMotivationTime,
        wellnessFocus: onboardingData.wellnessFocus,
        systemName: onboardingData.systemName,
        lifeAreaDetails: onboardingData.lifeAreaDetails,
        shortTermGoals: onboardingData.shortTermGoals,
        longTermGoals: onboardingData.longTermGoals,
        relationshipGoals: onboardingData.relationshipGoals,
      });
    },
    onSuccess: () => {
      toast({
        title: "Welcome to your wellness journey!",
        description: "Your personalized life system is ready.",
      });
      setLocation("/dashboard");
    },
    onError: () => {
      toast({
        title: "Something went wrong",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const toggleArea = (areaId: string) => {
    if (data.selectedAreas.includes(areaId)) {
      setData({ 
        ...data, 
        selectedAreas: data.selectedAreas.filter((a) => a !== areaId),
        lifeAreaDetails: Object.fromEntries(
          Object.entries(data.lifeAreaDetails).filter(([key]) => key !== areaId)
        )
      });
    } else {
      setData({ 
        ...data, 
        selectedAreas: [...data.selectedAreas, areaId],
        lifeAreaDetails: {
          ...data.lifeAreaDetails,
          [areaId]: { goals: "", schedule: "", challenges: "" }
        }
      });
    }
  };

  const updateAreaDetail = (areaId: string, field: keyof LifeAreaData, value: string) => {
    setData({
      ...data,
      lifeAreaDetails: {
        ...data.lifeAreaDetails,
        [areaId]: {
          ...data.lifeAreaDetails[areaId],
          [field]: value,
        },
      },
    });
  };

  const toggleWellnessFocus = (value: string) => {
    if (data.wellnessFocus.includes(value)) {
      setData({ ...data, wellnessFocus: data.wellnessFocus.filter((v) => v !== value) });
    } else if (data.wellnessFocus.length < 3) {
      setData({ ...data, wellnessFocus: [...data.wellnessFocus, value] });
    }
  };

  const canProceed = () => {
    switch (step) {
      case 0: return true;
      case 1: return data.selectedAreas.length > 0;
      case 2: return true;
      case 3: return data.shortTermGoals.trim() !== "" || data.longTermGoals.trim() !== "";
      case 4: return data.freeTimeHours !== "" && data.peakMotivationTime !== "";
      case 5: return data.wellnessFocus.length > 0;
      case 6: return true;
      default: return false;
    }
  };

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      submitMutation.mutate(data);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="text-center space-y-8">
            <div className="w-16 h-16 rounded-full bg-chart-1/10 flex items-center justify-center mx-auto">
              <Sparkles className="h-8 w-8 text-chart-1" />
            </div>
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-onboarding-welcome">
                Let's build your life system
              </h2>
              <p className="text-xl text-muted-foreground font-serif leading-relaxed max-w-lg mx-auto" data-testid="text-onboarding-intro">
                I'm going to help you organize every area of your life - work, health, relationships, and more. 
                Let's start by understanding what matters to you.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              {[Target, Briefcase, Heart, Calendar].map((Icon, i) => (
                <div key={i} className="p-4 rounded-md bg-muted/50 flex flex-col items-center gap-2">
                  <Icon className="h-6 w-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {["Goals", "Work", "Wellness", "Schedule"][i]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl md:text-3xl font-semibold mb-2" data-testid="text-step-1-title">
                What areas of life do you want to organize?
              </h2>
              <p className="text-muted-foreground">Select all that apply to your life right now</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {LIFE_AREAS.map((area) => {
                const Icon = area.icon;
                return (
                  <button
                    key={area.id}
                    onClick={() => toggleArea(area.id)}
                    className={`p-4 rounded-md text-left border transition-all hover-elevate ${
                      data.selectedAreas.includes(area.id)
                        ? "border-chart-1 bg-chart-1/10"
                        : "border-border"
                    }`}
                    data-testid={`button-area-${area.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-md flex items-center justify-center ${
                        data.selectedAreas.includes(area.id)
                          ? "bg-chart-1 text-primary-foreground"
                          : "bg-muted"
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{area.label}</span>
                          {data.selectedAreas.includes(area.id) && (
                            <Check className="h-4 w-4 text-chart-1" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{area.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl md:text-3xl font-semibold mb-2" data-testid="text-step-2-title">
                Tell me more about each area
              </h2>
              <p className="text-muted-foreground">What are your goals and current challenges?</p>
            </div>
            <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2">
              {data.selectedAreas.map((areaId) => {
                const area = LIFE_AREAS.find((a) => a.id === areaId);
                const Icon = area?.icon || Target;
                return (
                  <div key={areaId} className="p-4 rounded-md border border-border space-y-4">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-chart-1" />
                      <span className="font-semibold">{area?.label}</span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-muted-foreground mb-1 block">
                          What are your goals here?
                        </label>
                        <Textarea
                          placeholder={`e.g., ${area?.id === "work" ? "Complete project X, get promotion" : area?.id === "health" ? "Exercise 3x/week, better sleep" : "Your goals..."}`}
                          value={data.lifeAreaDetails[areaId]?.goals || ""}
                          onChange={(e) => updateAreaDetail(areaId, "goals", e.target.value)}
                          className="resize-none"
                          rows={2}
                          data-testid={`input-${areaId}-goals`}
                        />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground mb-1 block">
                          Current schedule or commitments?
                        </label>
                        <Input
                          placeholder={`e.g., ${area?.id === "work" ? "Mon-Fri 9-5" : area?.id === "school" ? "Classes MWF" : "When do you focus on this?"}`}
                          value={data.lifeAreaDetails[areaId]?.schedule || ""}
                          onChange={(e) => updateAreaDetail(areaId, "schedule", e.target.value)}
                          data-testid={`input-${areaId}-schedule`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              {data.selectedAreas.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Go back and select at least one life area to continue.
                </p>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl md:text-3xl font-semibold mb-2" data-testid="text-step-3-title">
                What goals do you want to accomplish?
              </h2>
              <p className="text-muted-foreground">Think about both immediate and long-term aspirations</p>
            </div>
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-5 w-5 text-chart-2" />
                  <label className="font-medium">Short-term goals (next few weeks/months)</label>
                </div>
                <Textarea
                  placeholder="What do you want to achieve soon? List your immediate priorities..."
                  value={data.shortTermGoals}
                  onChange={(e) => setData({ ...data, shortTermGoals: e.target.value })}
                  className="resize-none"
                  rows={4}
                  data-testid="input-short-term-goals"
                />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5 text-chart-1" />
                  <label className="font-medium">Long-term goals (this year and beyond)</label>
                </div>
                <Textarea
                  placeholder="What's your bigger picture? Where do you want to be in 1-5 years?"
                  value={data.longTermGoals}
                  onChange={(e) => setData({ ...data, longTermGoals: e.target.value })}
                  className="resize-none"
                  rows={4}
                  data-testid="input-long-term-goals"
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl md:text-3xl font-semibold mb-2" data-testid="text-step-4-title">
                Let's understand your time and energy
              </h2>
              <p className="text-muted-foreground">This helps me suggest the best schedule for you</p>
            </div>
            <div>
              <p className="font-medium mb-4">How much free time do you usually have each day?</p>
              <div className="grid grid-cols-2 gap-4">
                {FREE_TIME_OPTIONS.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setData({ ...data, freeTimeHours: item.id })}
                    className={`p-4 rounded-md text-center border transition-all hover-elevate ${
                      data.freeTimeHours === item.id
                        ? "border-chart-1 bg-chart-1/10"
                        : "border-border"
                    }`}
                    data-testid={`button-freetime-${item.id}`}
                  >
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="font-medium mb-4">When do you feel most motivated and productive?</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {MOTIVATION_TIME.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setData({ ...data, peakMotivationTime: item.id })}
                    className={`p-4 rounded-md text-center border transition-all hover-elevate ${
                      data.peakMotivationTime === item.id
                        ? "border-chart-1 bg-chart-1/10"
                        : "border-border"
                    }`}
                    data-testid={`button-motivation-${item.id}`}
                  >
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl md:text-3xl font-semibold mb-2" data-testid="text-step-5-title">
                What would you like to improve or feel more of?
              </h2>
              <p className="text-muted-foreground">Choose up to 3 wellness focus areas</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {WELLNESS_FOCUS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => toggleWellnessFocus(item.id)}
                  disabled={data.wellnessFocus.length >= 3 && !data.wellnessFocus.includes(item.id)}
                  className={`p-4 rounded-md text-center border transition-all hover-elevate ${
                    data.wellnessFocus.includes(item.id)
                      ? "border-chart-1 bg-chart-1/10"
                      : "border-border"
                  } ${data.wellnessFocus.length >= 3 && !data.wellnessFocus.includes(item.id) ? "opacity-50 cursor-not-allowed" : ""}`}
                  data-testid={`button-focus-${item.id}`}
                >
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {data.wellnessFocus.length}/3 selected
            </p>
          </div>
        );

      case 6:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-chart-2/10 flex items-center justify-center mx-auto mb-6">
                <Sparkles className="h-8 w-8 text-chart-2" />
              </div>
              <h2 className="text-2xl md:text-3xl font-semibold mb-2" data-testid="text-step-6-title">
                Name your life system
              </h2>
              <p className="text-muted-foreground mb-6">Give it a name that inspires you</p>
            </div>
            <div className="max-w-md mx-auto">
              <Input
                placeholder="e.g., My Life Blueprint, Flow State, Balance Mode..."
                value={data.systemName}
                onChange={(e) => setData({ ...data, systemName: e.target.value })}
                className="text-center text-lg py-6"
                data-testid="input-system-name"
              />
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {["Life Blueprint", "Balance Mode", "Growth Journey", "Flow State"].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setData({ ...data, systemName: suggestion })}
                    className="px-3 py-1 text-sm rounded-full border border-border hover-elevate"
                    data-testid={`button-suggestion-${suggestion.toLowerCase().replace(/ /g, "-")}`}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-8 p-4 rounded-md bg-muted/50">
              <p className="text-center text-sm text-muted-foreground">
                Based on your responses, I'll create a personalized daily planner, suggest habits, 
                and help you track progress across all your life areas.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-chart-1" />
              <span className="font-semibold">Wellness Lifestyle AI</span>
            </div>
            <span className="text-sm text-muted-foreground" data-testid="text-step-indicator">
              Step {step + 1} of {totalSteps}
            </span>
          </div>
          <Progress value={progress} className="h-2" data-testid="progress-onboarding" />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8">
            {renderStep()}
          </CardContent>
        </Card>
      </main>

      <footer className="p-6">
        <div className="max-w-2xl mx-auto flex justify-between gap-4">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 0}
            className="rounded-full"
            data-testid="button-back"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canProceed() || submitMutation.isPending}
            className="rounded-full"
            data-testid="button-next"
          >
            {submitMutation.isPending ? (
              "Creating your system..."
            ) : step === totalSteps - 1 ? (
              <>
                Complete Setup
                <Check className="ml-2 h-4 w-4" />
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </footer>
    </div>
  );
}
