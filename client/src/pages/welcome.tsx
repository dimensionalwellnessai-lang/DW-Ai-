import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import { 
  MessageSquare, 
  Calendar, 
  Heart, 
  Sparkles, 
  ArrowRight,
  Check
} from "lucide-react";

const TUTORIAL_STEPS = [
  {
    icon: MessageSquare,
    title: "Start with a conversation",
    description: "The AI companion is your main way to interact. Share how you're feeling, ask for guidance, or just talk through your day.",
  },
  {
    icon: Calendar,
    title: "Plan at your own pace",
    description: "Use the calendar to schedule what matters to you. No pressure, no streaks - just a gentle way to organize your time.",
  },
  {
    icon: Heart,
    title: "Explore wellness features",
    description: "Meditation, workouts, meal planning, and more are available when you need them. Access everything through the menu.",
  },
  {
    icon: Sparkles,
    title: "It adapts to you",
    description: "The more you share, the more personalized your experience becomes. But there's no rush - go at your own pace.",
  },
];

export default function Welcome() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);

  const handleNext = () => {
    if (!completed.includes(currentStep)) {
      setCompleted([...completed, currentStep]);
    }
    
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setLocation("/");
    }
  };

  const handleSkip = () => {
    setLocation("/");
  };

  const step = TUTORIAL_STEPS[currentStep];
  const StepIcon = step.icon;
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-4 flex justify-end">
        <Button 
          variant="ghost" 
          onClick={handleSkip}
          data-testid="button-skip-tutorial"
        >
          Skip
        </Button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-display font-semibold mb-2">
            Welcome to Flip the Switch
          </h1>
          <p className="text-muted-foreground">
            Let's get you started
          </p>
        </div>

        <Card className="w-full max-w-md mb-8">
          <CardContent className="pt-8 pb-6 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <StepIcon className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-medium mb-3">{step.title}</h2>
            <p className="text-muted-foreground leading-relaxed">
              {step.description}
            </p>
          </CardContent>
        </Card>

        <div className="flex gap-2 mb-8">
          {TUTORIAL_STEPS.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentStep 
                  ? "bg-primary" 
                  : completed.includes(index)
                  ? "bg-primary/50"
                  : "bg-muted"
              }`}
              data-testid={`step-indicator-${index}`}
            />
          ))}
        </div>

        <Button 
          size="lg" 
          onClick={handleNext}
          className="min-w-[200px]"
          data-testid="button-next-step"
        >
          {isLastStep ? (
            <>
              Get Started
              <Check className="w-4 h-4 ml-2" />
            </>
          ) : (
            <>
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </main>

      <footer className="p-4 text-center text-xs text-muted-foreground">
        A calm space for your wellness journey
      </footer>
    </div>
  );
}
