import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight,
  ArrowLeft,
  Check,
  Clock,
  Calendar,
  Zap,
  Utensils,
  Brain,
  DollarSign,
  Sparkles,
  Briefcase,
  Loader2,
} from "lucide-react";
import { COPY } from "@/copy/en";
import { 
  saveProfileSetup, 
  getProfileSetup, 
  isProfileSetupComplete,
  saveCalendarEvent,
  type ScheduleType, 
  type FocusArea,
} from "@/lib/guest-storage";

const SCHEDULE_OPTIONS: { id: ScheduleType; icon: typeof Clock }[] = [
  { id: "9to5", icon: Clock },
  { id: "nightShift", icon: Clock },
  { id: "student", icon: Clock },
  { id: "mixed", icon: Clock },
  { id: "rebuilding", icon: Clock },
];

const DAYS = [
  { id: 1, label: "Mon" },
  { id: 2, label: "Tue" },
  { id: 3, label: "Wed" },
  { id: 4, label: "Thu" },
  { id: 5, label: "Fri" },
  { id: 6, label: "Sat" },
  { id: 0, label: "Sun" },
];

const FOCUS_OPTIONS: { id: FocusArea; icon: typeof Zap }[] = [
  { id: "body", icon: Zap },
  { id: "food", icon: Utensils },
  { id: "mind", icon: Brain },
  { id: "money", icon: DollarSign },
  { id: "spirit", icon: Sparkles },
  { id: "work", icon: Briefcase },
];

const TIME_OPTIONS = [
  "5:00 AM", "5:30 AM", "6:00 AM", "6:30 AM", "7:00 AM", "7:30 AM", 
  "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM",
];

const WIND_DOWN_OPTIONS = [
  "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM", "9:00 PM", "9:30 PM", 
  "10:00 PM", "10:30 PM", "11:00 PM", "11:30 PM", "12:00 AM",
];

function createStarterObject(focusArea: FocusArea): string {
  const now = Date.now();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  const starterConfigs: Record<FocusArea, { title: string; description: string; dimension: "physical" | "emotional" | "spiritual" | "financial" | "occupational" }> = {
    body: {
      title: "Starter Workout Block",
      description: "A 20-minute movement session to get your body going. Adjust based on how you feel.",
      dimension: "physical",
    },
    food: {
      title: "Meal Prep Starter",
      description: "Spend 15 minutes planning your meals for tomorrow. Keep it simple.",
      dimension: "physical",
    },
    mind: {
      title: "2-Minute Reset",
      description: "A quick breathing exercise to clear your mind and reset your focus.",
      dimension: "emotional",
    },
    money: {
      title: "Quick Budget Check-in",
      description: "Take 10 minutes to review your spending and set one money intention.",
      dimension: "financial",
    },
    spirit: {
      title: "Reflection Moment",
      description: "A quiet 5 minutes to journal or reflect on what matters today.",
      dimension: "spiritual",
    },
    work: {
      title: "Focus Block (30 min)",
      description: "Dedicated deep work time. Pick one priority and give it your full attention.",
      dimension: "occupational",
    },
  };

  const config = starterConfigs[focusArea];
  const event = saveCalendarEvent({
    title: config.title,
    description: config.description,
    dimension: config.dimension,
    startTime: tomorrow.getTime(),
    endTime: tomorrow.getTime() + (focusArea === "work" ? 30 : 20) * 60 * 1000,
    isAllDay: false,
    location: null,
    virtualLink: null,
    reminders: [15],
    recurring: false,
    recurrencePattern: null,
    relatedFoundationIds: [],
    tags: ["starter", "quick-setup"],
  });

  return event.id;
}

export default function Welcome() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [scheduleType, setScheduleType] = useState<ScheduleType | null>(null);
  const [busiestDays, setBusiestDays] = useState<number[]>([]);
  const [wakeTime, setWakeTime] = useState<string>("7:00 AM");
  const [windDownTime, setWindDownTime] = useState<string>("10:00 PM");
  const [focusArea, setFocusArea] = useState<FocusArea | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [starterMessage, setStarterMessage] = useState<string | null>(null);

  const existing = getProfileSetup();
  if (isProfileSetupComplete() && !isFinishing) {
    setLocation("/");
    return null;
  }

  const copy = COPY.quickSetup;

  const handleNext = () => {
    if (step === 1 && scheduleType) {
      saveProfileSetup({ scheduleType });
      setStep(2);
    } else if (step === 2) {
      saveProfileSetup({ busiestDays });
      setStep(3);
    } else if (step === 3) {
      saveProfileSetup({ wakeTime, windDownTime });
      setStep(4);
    }
  };

  const handleFinish = async () => {
    if (!focusArea) return;
    
    setIsFinishing(true);
    saveProfileSetup({ focusArea });

    await new Promise(r => setTimeout(r, 600));

    const objectId = createStarterObject(focusArea);
    saveProfileSetup({ 
      starterObjectId: objectId, 
      completedAt: Date.now(),
      metDW: true,
    });

    setStarterMessage(copy.starterMessages[focusArea]);
    
    await new Promise(r => setTimeout(r, 1200));
    setLocation("/");
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSkip = () => {
    saveProfileSetup({ completedAt: Date.now(), metDW: true });
    setLocation("/");
  };

  const toggleDay = (day: number) => {
    setBusiestDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const canContinue = step === 1 ? !!scheduleType : step === 4 ? !!focusArea : true;

  if (isFinishing) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4"
        >
          {starterMessage ? (
            <>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-display font-semibold">{copy.complete}</h2>
              <p className="text-muted-foreground">{starterMessage}</p>
            </>
          ) : (
            <>
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground">{copy.finishing}</p>
            </>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-4 flex justify-between items-center">
        {step > 1 ? (
          <Button variant="ghost" size="sm" onClick={handleBack} data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-1" />
            {COPY.actions.back}
          </Button>
        ) : <div />}
        <Button variant="ghost" size="sm" onClick={handleSkip} data-testid="button-skip">
          {COPY.actions.skip}
        </Button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
        <div className="w-full max-w-md">
          <div className="flex gap-1.5 justify-center mb-8">
            {[1, 2, 3, 4].map((s) => (
              <div 
                key={s}
                className={`h-1 w-8 rounded-full transition-colors ${
                  s === step ? "bg-primary" : s < step ? "bg-primary/50" : "bg-muted"
                }`}
                data-testid={`progress-step-${s}`}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <Calendar className="w-10 h-10 mx-auto text-primary" />
                  <h2 className="text-xl font-display font-semibold">{copy.step1Title}</h2>
                  <p className="text-sm text-muted-foreground">{copy.step1Helper}</p>
                </div>

                <div className="space-y-2">
                  {SCHEDULE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setScheduleType(opt.id)}
                      className={`w-full p-4 rounded-xl border text-left transition-all ${
                        scheduleType === opt.id 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover-elevate"
                      }`}
                      data-testid={`schedule-${opt.id}`}
                    >
                      <span className="font-medium">{copy.schedules[opt.id]}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <Calendar className="w-10 h-10 mx-auto text-primary" />
                  <h2 className="text-xl font-display font-semibold">{copy.step2Title}</h2>
                  <p className="text-sm text-muted-foreground">{copy.step2Helper}</p>
                </div>

                <div className="flex flex-wrap justify-center gap-2">
                  {DAYS.map((day) => (
                    <Badge
                      key={day.id}
                      variant={busiestDays.includes(day.id) ? "default" : "outline"}
                      className="px-4 py-2 text-sm cursor-pointer"
                      onClick={() => toggleDay(day.id)}
                      data-testid={`day-${day.label.toLowerCase()}`}
                    >
                      {day.label}
                    </Badge>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <Clock className="w-10 h-10 mx-auto text-primary" />
                  <h2 className="text-xl font-display font-semibold">{copy.step3Title}</h2>
                  <p className="text-sm text-muted-foreground">{copy.step3Helper}</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{copy.wakeLabel}</label>
                    <select
                      value={wakeTime}
                      onChange={(e) => setWakeTime(e.target.value)}
                      className="w-full p-3 rounded-xl border bg-background"
                      data-testid="select-wake-time"
                    >
                      {TIME_OPTIONS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">{copy.windDownLabel}</label>
                    <select
                      value={windDownTime}
                      onChange={(e) => setWindDownTime(e.target.value)}
                      className="w-full p-3 rounded-xl border bg-background"
                      data-testid="select-wind-down-time"
                    >
                      {WIND_DOWN_OPTIONS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <Sparkles className="w-10 h-10 mx-auto text-primary" />
                  <h2 className="text-xl font-display font-semibold">{copy.step4Title}</h2>
                  <p className="text-sm text-muted-foreground">{copy.step4Helper}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {FOCUS_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setFocusArea(opt.id)}
                        className={`p-4 rounded-xl border text-center transition-all ${
                          focusArea === opt.id 
                            ? "border-primary bg-primary/5" 
                            : "border-border hover-elevate"
                        }`}
                        data-testid={`focus-${opt.id}`}
                      >
                        <Icon className={`w-6 h-6 mx-auto mb-2 ${focusArea === opt.id ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="text-sm font-medium">{copy.focusAreas[opt.id]}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-8">
            <Button 
              size="lg" 
              onClick={step === 4 ? handleFinish : handleNext}
              disabled={!canContinue}
              className="w-full"
              data-testid="button-continue"
            >
              {step === 4 ? (
                <>
                  {COPY.actions.done}
                  <Check className="w-4 h-4 ml-2" />
                </>
              ) : (
                <>
                  {COPY.actions.continue}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
