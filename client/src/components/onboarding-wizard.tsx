import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  User,
  Target,
  Star,
  Clock,
  Utensils,
  Dumbbell,
  Activity,
  Moon,
  Sun,
  Heart,
  Calendar,
} from "lucide-react";
import { useLocation } from "wouter";

// Onboarding data structure
export interface OnboardingData {
  name: string | null;
  wellnessGoals: string[];
  birthDate: string | null;
  birthTime: string | null;
  birthLocation: string | null;
  wakeTime: string | null;
  sleepTime: string | null;
  dietaryPreferences: string[];
  fitnessGoals: string[];
  wearableDataPermission: boolean;
  completedAt: number | null;
}

interface OnboardingWizardProps {
  onComplete: (data: OnboardingData, takeTour: boolean) => void;
  onSkip: () => void;
}

const WELLNESS_GOALS = [
  { id: "health", label: "Overall Health", icon: Heart },
  { id: "fitness", label: "Physical Fitness", icon: Dumbbell },
  { id: "emotional", label: "Emotional Balance", icon: Activity },
  { id: "nutrition", label: "Better Nutrition", icon: Utensils },
  { id: "sleep", label: "Quality Sleep", icon: Moon },
  { id: "stress", label: "Stress Management", icon: Target },
  { id: "energy", label: "More Energy", icon: Sun },
];

const DIETARY_PREFERENCES = [
  "Omnivore",
  "Vegetarian",
  "Vegan",
  "Pescatarian",
  "Keto",
  "Paleo",
  "Gluten-Free",
  "Dairy-Free",
];

const FITNESS_GOALS = [
  "Build Muscle",
  "Lose Weight",
  "Tone & Define",
  "Increase Endurance",
  "Improve Flexibility",
  "Maintain Current Fitness",
];

const WAKE_TIMES = [
  "5:00 AM", "5:30 AM", "6:00 AM", "6:30 AM", "7:00 AM",
  "7:30 AM", "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM",
];

const SLEEP_TIMES = [
  "9:00 PM", "9:30 PM", "10:00 PM", "10:30 PM", "11:00 PM",
  "11:30 PM", "12:00 AM", "12:30 AM", "1:00 AM",
];

export function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    name: null,
    wellnessGoals: [],
    birthDate: null,
    birthTime: null,
    birthLocation: null,
    wakeTime: "7:00 AM",
    sleepTime: "10:00 PM",
    dietaryPreferences: [],
    fitnessGoals: [],
    wearableDataPermission: false,
    completedAt: null,
  });

  const totalSteps = 8;

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const toggleArrayItem = (key: keyof OnboardingData, value: string) => {
    const currentArray = data[key] as string[];
    if (currentArray.includes(value)) {
      updateData({ [key]: currentArray.filter((item) => item !== value) });
    } else {
      updateData({ [key]: [...currentArray, value] });
    }
  };

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleComplete = (takeTour: boolean) => {
    const completedData = { ...data, completedAt: Date.now() };
    onComplete(completedData, takeTour);
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return data.name && data.name.trim().length > 0;
      case 2:
        return data.wellnessGoals.length > 0;
      default:
        return true;
    }
  };

  const renderStep = () => {
    switch (step) {
      // Welcome Screen
      case 0:
        return (
          <div className="text-center space-y-6 py-4">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-display font-semibold">
                Welcome to DW-Ai
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Your dimensional wellness companion. Let's personalize your
                experience so we can support you better.
              </p>
            </div>
            <div className="bg-muted/30 rounded-xl p-4 space-y-2 text-left">
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-primary shrink-0" />
                <span>Track moods and wellness across dimensions</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-primary shrink-0" />
                <span>Get personalized astrology insights</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-primary shrink-0" />
                <span>Build routines that fit your life</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-primary shrink-0" />
                <span>Plan meals and workouts tailored to you</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Takes about 3-5 minutes · You can skip any step
            </p>
          </div>
        );

      // Name
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <User className="w-10 h-10 mx-auto text-primary" />
              <h3 className="text-xl font-display font-semibold">
                What should we call you?
              </h3>
              <p className="text-sm text-muted-foreground">
                This helps personalize your assistant's responses
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Your Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your name"
                value={data.name || ""}
                onChange={(e) => updateData({ name: e.target.value })}
                className="text-base"
                autoFocus
              />
            </div>
          </div>
        );

      // Wellness Goals
      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <Target className="w-10 h-10 mx-auto text-primary" />
              <h3 className="text-xl font-display font-semibold">
                What are your wellness goals?
              </h3>
              <p className="text-sm text-muted-foreground">
                Select all that resonate with you
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {WELLNESS_GOALS.map((goal) => {
                const Icon = goal.icon;
                const isSelected = data.wellnessGoals.includes(goal.id);
                return (
                  <button
                    key={goal.id}
                    onClick={() => toggleArrayItem("wellnessGoals", goal.id)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border hover-elevate"
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-2 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="text-sm font-medium">{goal.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );

      // Astrology Info (Optional)
      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <Star className="w-10 h-10 mx-auto text-primary" />
              <h3 className="text-xl font-display font-semibold">
                Birth Chart Details
              </h3>
              <p className="text-sm text-muted-foreground">
                Optional - for personalized astrology insights
              </p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="birthDate">Birth Date</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={data.birthDate || ""}
                  onChange={(e) => updateData({ birthDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthTime">Birth Time (if known)</Label>
                <Input
                  id="birthTime"
                  type="time"
                  value={data.birthTime || ""}
                  onChange={(e) => updateData({ birthTime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthLocation">Birth Location</Label>
                <Input
                  id="birthLocation"
                  type="text"
                  placeholder="City, Country"
                  value={data.birthLocation || ""}
                  onChange={(e) => updateData({ birthLocation: e.target.value })}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              This information is used to generate accurate astrological readings
            </p>
          </div>
        );

      // Daily Routine
      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <Clock className="w-10 h-10 mx-auto text-primary" />
              <h3 className="text-xl font-display font-semibold">
                Your Daily Routine
              </h3>
              <p className="text-sm text-muted-foreground">
                Help us align with your natural rhythm
              </p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wakeTime">Wake Time</Label>
                <select
                  id="wakeTime"
                  value={data.wakeTime || "7:00 AM"}
                  onChange={(e) => updateData({ wakeTime: e.target.value })}
                  className="w-full p-3 rounded-xl border bg-background"
                >
                  {WAKE_TIMES.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sleepTime">Sleep Time</Label>
                <select
                  id="sleepTime"
                  value={data.sleepTime || "10:00 PM"}
                  onChange={(e) => updateData({ sleepTime: e.target.value })}
                  className="w-full p-3 rounded-xl border bg-background"
                >
                  {SLEEP_TIMES.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              We'll use this to suggest optimal times for activities and reminders
            </p>
          </div>
        );

      // Dietary Preferences
      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <Utensils className="w-10 h-10 mx-auto text-primary" />
              <h3 className="text-xl font-display font-semibold">
                Dietary Preferences
              </h3>
              <p className="text-sm text-muted-foreground">
                Select all that apply to you
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {DIETARY_PREFERENCES.map((pref) => (
                <Badge
                  key={pref}
                  variant={
                    data.dietaryPreferences.includes(pref) ? "default" : "outline"
                  }
                  className="cursor-pointer text-sm py-2 px-4"
                  onClick={() => toggleArrayItem("dietaryPreferences", pref)}
                >
                  {pref}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              This helps us suggest meals that fit your lifestyle
            </p>
          </div>
        );

      // Fitness Goals
      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <Dumbbell className="w-10 h-10 mx-auto text-primary" />
              <h3 className="text-xl font-display font-semibold">
                Fitness Goals
              </h3>
              <p className="text-sm text-muted-foreground">
                What would you like to achieve?
              </p>
            </div>
            <div className="space-y-2">
              {FITNESS_GOALS.map((goal) => (
                <button
                  key={goal}
                  onClick={() => toggleArrayItem("fitnessGoals", goal)}
                  className={`w-full p-4 rounded-xl border text-left transition-all ${
                    data.fitnessGoals.includes(goal)
                      ? "border-primary bg-primary/10"
                      : "border-border hover-elevate"
                  }`}
                >
                  <span className="font-medium">{goal}</span>
                </button>
              ))}
            </div>
          </div>
        );

      // Wearable Data Permission
      case 7:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <Activity className="w-10 h-10 mx-auto text-primary" />
              <h3 className="text-xl font-display font-semibold">
                Wearable Data Integration
              </h3>
              <p className="text-sm text-muted-foreground">
                Connect your fitness tracker for enhanced insights
              </p>
            </div>
            <div className="bg-muted/30 rounded-xl p-4 space-y-3">
              <h4 className="font-medium text-sm">Benefits:</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  <span>Automatic mood tracking based on activity</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  <span>Personalized wellness recommendations</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  <span>Dynamic themes based on your energy levels</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  <span>Better sleep and recovery insights</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl border">
              <input
                type="checkbox"
                id="wearablePermission"
                checked={data.wearableDataPermission}
                onChange={(e) =>
                  updateData({ wearableDataPermission: e.target.checked })
                }
                className="w-5 h-5"
              />
              <label htmlFor="wearablePermission" className="text-sm cursor-pointer">
                I'd like to connect my wearable data (can be set up later)
              </label>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Your data is private and secure. You can change this anytime in Settings.
            </p>
          </div>
        );

      // Completion Screen
      case 8:
        return (
          <div className="text-center space-y-6 py-4">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-display font-semibold">
                All Set{data.name ? `, ${data.name}` : ""}!
              </h2>
              <p className="text-muted-foreground">
                Your preferences are saved. Here's how we'll optimize your DW-Ai experience:
              </p>
            </div>
            <div className="space-y-2 text-left bg-muted/30 rounded-xl p-4">
              {data.wellnessGoals.length > 0 && (
                <div className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>
                    Personalized recommendations for {data.wellnessGoals.length} wellness{" "}
                    {data.wellnessGoals.length === 1 ? "area" : "areas"}
                  </span>
                </div>
              )}
              {data.wakeTime && data.sleepTime && (
                <div className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>
                    Routines aligned with your {data.wakeTime} - {data.sleepTime} schedule
                  </span>
                </div>
              )}
              {data.dietaryPreferences.length > 0 && (
                <div className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>Meal plans matching your dietary preferences</span>
                </div>
              )}
              {data.fitnessGoals.length > 0 && (
                <div className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>Workouts tailored to your fitness goals</span>
                </div>
              )}
              {(data.birthDate || data.birthTime || data.birthLocation) && (
                <div className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>Personalized astrology insights and calendar</span>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              You can update any of these preferences anytime in Settings
            </p>
            <div className="space-y-3 pt-2">
              <Button
                size="lg"
                onClick={() => handleComplete(true)}
                className="w-full"
              >
                Take a Quick Tour
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => handleComplete(false)}
                className="w-full"
              >
                Skip to App
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 flex justify-between items-center">
        {step > 0 && step < totalSteps ? (
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        ) : (
          <div />
        )}
        {step < totalSteps && (
          <Button variant="ghost" size="sm" onClick={onSkip}>
            Skip
          </Button>
        )}
      </header>

      {/* Progress Indicator */}
      {step > 0 && step < totalSteps && (
        <div className="px-6 pb-4">
          <div className="flex gap-1.5 justify-center">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i < step ? "bg-primary" : i === step ? "bg-primary/50" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-6 pb-12">
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>

          {/* Next Button */}
          {step > 0 && step < totalSteps && (
            <div className="mt-8">
              <Button
                size="lg"
                onClick={handleNext}
                disabled={!canProceed()}
                className="w-full"
              >
                {step === totalSteps - 1 ? "Finish" : "Continue"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {/* Start Button for Welcome */}
          {step === 0 && (
            <div className="mt-8">
              <Button size="lg" onClick={handleNext} className="w-full">
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
