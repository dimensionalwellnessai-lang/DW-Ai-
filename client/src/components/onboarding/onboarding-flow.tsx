import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Sparkles, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const RESPONSIBILITIES = [
  { id: "full-time", label: "Full-time work" },
  { id: "part-time", label: "Part-time work" },
  { id: "school", label: "School/classes" },
  { id: "parenting", label: "Parenting/caregiving" },
  { id: "health", label: "Health/medical appointments" },
  { id: "household", label: "Household management" },
];

const PRIORITIES = [
  { id: "fitness", label: "My fitness or energy" },
  { id: "mindset", label: "My mindset or emotions" },
  { id: "creativity", label: "Time to create or dream" },
  { id: "healing", label: "Healing or rebuilding" },
  { id: "financial", label: "Financial clarity" },
  { id: "relationships", label: "Relationships / connection" },
  { id: "self-worth", label: "Self-worth" },
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
  { id: "changes", label: "It changes" },
  { id: "unclear", label: "I haven't felt clear in a while" },
];

const WELLNESS_FOCUS = [
  { id: "energy", label: "Physical energy & strength" },
  { id: "emotional", label: "Emotional clarity" },
  { id: "sleep", label: "Better sleep" },
  { id: "focus", label: "Focus/productivity" },
  { id: "purpose", label: "Purpose or motivation" },
  { id: "financial", label: "Financial flow" },
  { id: "creative", label: "Creative spark" },
  { id: "connection", label: "Connection or social energy" },
  { id: "myself", label: "Just feeling more like myself again" },
];

interface OnboardingData {
  responsibilities: string[];
  otherResponsibility: string;
  priorities: string[];
  otherPriority: string;
  freeTimeHours: string;
  peakMotivationTime: string;
  wellnessFocus: string[];
  systemName: string;
}

export function OnboardingFlow() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    responsibilities: [],
    otherResponsibility: "",
    priorities: [],
    otherPriority: "",
    freeTimeHours: "",
    peakMotivationTime: "",
    wellnessFocus: [],
    systemName: "",
  });

  const totalSteps = 6;
  const progress = ((step + 1) / totalSteps) * 100;

  const submitMutation = useMutation({
    mutationFn: async (onboardingData: OnboardingData) => {
      return apiRequest("POST", "/api/onboarding/complete", onboardingData);
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

  const toggleSelection = (field: keyof OnboardingData, value: string) => {
    if (Array.isArray(data[field])) {
      const arr = data[field] as string[];
      if (arr.includes(value)) {
        setData({ ...data, [field]: arr.filter((v) => v !== value) });
      } else {
        setData({ ...data, [field]: [...arr, value] });
      }
    }
  };

  const toggleWellnessFocus = (value: string) => {
    const arr = data.wellnessFocus;
    if (arr.includes(value)) {
      setData({ ...data, wellnessFocus: arr.filter((v) => v !== value) });
    } else if (arr.length < 3) {
      setData({ ...data, wellnessFocus: [...arr, value] });
    }
  };

  const setSingleValue = (field: keyof OnboardingData, value: string) => {
    setData({ ...data, [field]: value });
  };

  const canProceed = () => {
    switch (step) {
      case 0: return true;
      case 1: return data.responsibilities.length > 0 || data.otherResponsibility.trim() !== "";
      case 2: return data.priorities.length > 0 || data.otherPriority.trim() !== "";
      case 3: return data.freeTimeHours !== "";
      case 4: return data.wellnessFocus.length > 0 && data.wellnessFocus.length <= 3;
      case 5: return true;
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
                One that supports the real you — not just the ideal you. I just need to understand how your life works right now.
              </p>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl md:text-3xl font-semibold mb-2" data-testid="text-step-1-title">
                What are your current responsibilities?
              </h2>
              <p className="text-muted-foreground">Select all that apply</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {RESPONSIBILITIES.map((item) => (
                <button
                  key={item.id}
                  onClick={() => toggleSelection("responsibilities", item.id)}
                  className={`p-4 rounded-md text-left border transition-all hover-elevate ${
                    data.responsibilities.includes(item.id)
                      ? "border-chart-1 bg-chart-1/10"
                      : "border-border"
                  }`}
                  data-testid={`button-responsibility-${item.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                      data.responsibilities.includes(item.id)
                        ? "border-chart-1 bg-chart-1 text-primary-foreground"
                        : "border-muted-foreground"
                    }`}>
                      {data.responsibilities.includes(item.id) && <Check className="h-3 w-3" />}
                    </div>
                    <span className="font-medium">{item.label}</span>
                  </div>
                </button>
              ))}
            </div>
            <div>
              <Input
                placeholder="Other (please specify)"
                value={data.otherResponsibility}
                onChange={(e) => setData({ ...data, otherResponsibility: e.target.value })}
                data-testid="input-other-responsibility"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl md:text-3xl font-semibold mb-2" data-testid="text-step-2-title">
                What's important to you that isn't an obligation?
              </h2>
              <p className="text-muted-foreground">Select your wellness priorities</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PRIORITIES.map((item) => (
                <button
                  key={item.id}
                  onClick={() => toggleSelection("priorities", item.id)}
                  className={`p-4 rounded-md text-left border transition-all hover-elevate ${
                    data.priorities.includes(item.id)
                      ? "border-chart-1 bg-chart-1/10"
                      : "border-border"
                  }`}
                  data-testid={`button-priority-${item.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                      data.priorities.includes(item.id)
                        ? "border-chart-1 bg-chart-1 text-primary-foreground"
                        : "border-muted-foreground"
                    }`}>
                      {data.priorities.includes(item.id) && <Check className="h-3 w-3" />}
                    </div>
                    <span className="font-medium">{item.label}</span>
                  </div>
                </button>
              ))}
            </div>
            <div>
              <Input
                placeholder="Other (please specify)"
                value={data.otherPriority}
                onChange={(e) => setData({ ...data, otherPriority: e.target.value })}
                data-testid="input-other-priority"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl md:text-3xl font-semibold mb-2" data-testid="text-step-3-title">
                How much free time do you usually have in a day?
              </h2>
              <p className="text-muted-foreground mb-6">And when do you feel most motivated?</p>
            </div>
            <div>
              <p className="font-medium mb-4">Daily free time:</p>
              <div className="grid grid-cols-2 gap-4">
                {FREE_TIME_OPTIONS.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSingleValue("freeTimeHours", item.id)}
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
              <p className="font-medium mb-4">Peak motivation time:</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {MOTIVATION_TIME.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSingleValue("peakMotivationTime", item.id)}
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

      case 4:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl md:text-3xl font-semibold mb-2" data-testid="text-step-4-title">
                What would you like to improve, build, or feel more of?
              </h2>
              <p className="text-muted-foreground">Choose up to 3 focus areas</p>
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

      case 5:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-chart-2/10 flex items-center justify-center mx-auto mb-6">
                <Sparkles className="h-8 w-8 text-chart-2" />
              </div>
              <h2 className="text-2xl md:text-3xl font-semibold mb-2" data-testid="text-step-5-title">
                Name your life system
              </h2>
              <p className="text-muted-foreground mb-6">Give it a name that resonates with you</p>
            </div>
            <div className="max-w-md mx-auto">
              <Input
                placeholder="e.g., Reset Mode, Elevate Blueprint, My Flow..."
                value={data.systemName}
                onChange={(e) => setData({ ...data, systemName: e.target.value })}
                className="text-center text-lg py-6"
                data-testid="input-system-name"
              />
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {["Reset Mode", "Elevate Blueprint", "My Flow", "Vision Life"].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setData({ ...data, systemName: suggestion })}
                    className="px-3 py-1 text-sm rounded-full border border-border hover-elevate"
                    data-testid={`button-suggestion-${suggestion.toLowerCase().replace(" ", "-")}`}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
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
