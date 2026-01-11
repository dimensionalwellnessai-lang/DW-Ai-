import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Calendar, Sparkles, Brain, Zap, DollarSign, Briefcase, Utensils, Clock, X, Check, MessageCircle, Compass } from "lucide-react";
import { saveProfileSetup, getProfileSetup, type ScheduleType, type FocusArea } from "@/lib/guest-storage";
import { COPY } from "@/copy/en";

interface ProfileSetupModalProps {
  isOpen: boolean;
  onComplete: (startTutorial?: boolean) => void;
}

const SCHEDULE_OPTIONS: { id: ScheduleType; label: string }[] = [
  { id: "9to5", label: COPY.quickSetup.schedules["9to5"] },
  { id: "nightShift", label: COPY.quickSetup.schedules.nightShift },
  { id: "student", label: COPY.quickSetup.schedules.student },
  { id: "mixed", label: COPY.quickSetup.schedules.mixed },
  { id: "rebuilding", label: COPY.quickSetup.schedules.rebuilding },
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

const FOCUS_OPTIONS: { id: FocusArea; icon: typeof Zap; label: string }[] = [
  { id: "body", icon: Zap, label: COPY.quickSetup.focusAreas.body },
  { id: "food", icon: Utensils, label: COPY.quickSetup.focusAreas.food },
  { id: "mind", icon: Brain, label: COPY.quickSetup.focusAreas.mind },
  { id: "money", icon: DollarSign, label: COPY.quickSetup.focusAreas.money },
  { id: "spirit", icon: Sparkles, label: COPY.quickSetup.focusAreas.spirit },
  { id: "work", icon: Briefcase, label: COPY.quickSetup.focusAreas.work },
];

const TIME_OPTIONS = [
  "5:00 AM", "5:30 AM", "6:00 AM", "6:30 AM", "7:00 AM", "7:30 AM", 
  "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM",
];

const WIND_DOWN_OPTIONS = [
  "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM", "9:00 PM", "9:30 PM", 
  "10:00 PM", "10:30 PM", "11:00 PM", "11:30 PM", "12:00 AM",
];

export function ProfileSetupModal({ isOpen, onComplete }: ProfileSetupModalProps) {
  const [step, setStep] = useState(1);
  const [scheduleType, setScheduleType] = useState<ScheduleType | null>(null);
  const [busiestDays, setBusiestDays] = useState<number[]>([]);
  const [wakeTime, setWakeTime] = useState<string>("7:00 AM");
  const [windDownTime, setWindDownTime] = useState<string>("10:00 PM");
  const [focusArea, setFocusArea] = useState<FocusArea | null>(null);

  useEffect(() => {
    if (isOpen) {
      const existing = getProfileSetup();
      if (existing) {
        if (existing.scheduleType) setScheduleType(existing.scheduleType);
        if (existing.busiestDays) setBusiestDays(existing.busiestDays);
        if (existing.wakeTime) setWakeTime(existing.wakeTime);
        if (existing.windDownTime) setWindDownTime(existing.windDownTime);
        if (existing.focusArea) setFocusArea(existing.focusArea);
      }
      setStep(1);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const copy = COPY.quickSetup;

  const handleNext = () => {
    if (step === 1 && scheduleType) {
      saveProfileSetup({ scheduleType, busiestDays });
      setStep(2);
    } else if (step === 2) {
      saveProfileSetup({ wakeTime, windDownTime });
      setStep(3);
    } else if (step === 3 && focusArea) {
      saveProfileSetup({ focusArea });
      setStep(4);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleContinueToDW = () => {
    saveProfileSetup({ skipped: false, completedAt: Date.now() });
    onComplete(false);
  };

  const handleExploreApp = () => {
    saveProfileSetup({ skipped: false, completedAt: Date.now() });
    onComplete(true);
  };

  const toggleDay = (day: number) => {
    setBusiestDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const canContinue = step === 1 ? !!scheduleType : step === 3 ? !!focusArea : step === 4 ? true : true;

  return (
    <>
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
        data-testid="profile-setup-backdrop"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card border dark:border-white/10 rounded-2xl shadow-xl w-full max-w-md p-6 relative overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              saveProfileSetup({ skipped: true });
              onComplete();
            }}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-muted"
            data-testid="button-close-modal"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="space-y-2 text-center">
                  <Calendar className="h-8 w-8 mx-auto text-primary" />
                  <h2 className="text-lg font-display font-semibold">{copy.step1Title}</h2>
                </div>

                <div className="space-y-1.5">
                  {SCHEDULE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setScheduleType(opt.id)}
                      className={`w-full p-3 rounded-xl text-left transition-all border ${
                        scheduleType === opt.id
                          ? "border-primary bg-primary/5"
                          : "border-transparent bg-muted/50 hover-elevate"
                      }`}
                      data-testid={`edit-schedule-${opt.id}`}
                    >
                      <span className="text-sm font-medium">{opt.label}</span>
                    </button>
                  ))}
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-2">{copy.busyDaysLabel}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {DAYS.map((day) => (
                      <Badge
                        key={day.id}
                        variant={busiestDays.includes(day.id) ? "default" : "outline"}
                        className="px-3 py-1 text-xs cursor-pointer"
                        onClick={() => toggleDay(day.id)}
                        data-testid={`edit-day-${day.label.toLowerCase()}`}
                      >
                        {day.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="space-y-2 text-center">
                  <Clock className="h-8 w-8 mx-auto text-primary" />
                  <h2 className="text-lg font-display font-semibold">{copy.step2Title}</h2>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{copy.wakeLabel}</label>
                    <select
                      value={wakeTime}
                      onChange={(e) => setWakeTime(e.target.value)}
                      className="w-full p-3 rounded-xl border bg-background text-sm"
                      data-testid="edit-wake-time"
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
                      className="w-full p-3 rounded-xl border bg-background text-sm"
                      data-testid="edit-wind-down-time"
                    >
                      {WIND_DOWN_OPTIONS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="space-y-2 text-center">
                  <Sparkles className="h-8 w-8 mx-auto text-primary" />
                  <h2 className="text-lg font-display font-semibold">{copy.step3Title}</h2>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {FOCUS_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setFocusArea(opt.id)}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          focusArea === opt.id
                            ? "border-primary bg-primary/5"
                            : "border-transparent bg-muted/50 hover-elevate"
                        }`}
                        data-testid={`edit-focus-${opt.id}`}
                      >
                        <Icon className={`w-5 h-5 mx-auto mb-1 ${focusArea === opt.id ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="text-xs font-medium">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="space-y-2 text-center">
                  <Check className="h-8 w-8 mx-auto text-primary" />
                  <h2 className="text-lg font-display font-semibold">You're all set!</h2>
                  <p className="text-sm text-muted-foreground">How would you like to start?</p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleContinueToDW}
                    className="w-full p-4 rounded-xl border bg-primary text-primary-foreground hover-elevate text-left flex items-center gap-3"
                    data-testid="button-continue-to-dw"
                  >
                    <MessageCircle className="h-5 w-5 shrink-0" />
                    <div>
                      <span className="font-medium block">Continue to DW</span>
                      <span className="text-xs opacity-80">Start chatting right away</span>
                    </div>
                  </button>
                  
                  <button
                    onClick={handleExploreApp}
                    className="w-full p-4 rounded-xl border bg-muted/50 hover-elevate text-left flex items-center gap-3"
                    data-testid="button-explore-app"
                  >
                    <Compass className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <div>
                      <span className="font-medium block">Explore the app</span>
                      <span className="text-xs text-muted-foreground">Take a quick tour first</span>
                    </div>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {step < 4 && (
            <div className="flex gap-2 mt-6">
              {step > 1 && (
                <Button 
                  variant="ghost"
                  onClick={handleBack}
                  data-testid="button-back-edit"
                >
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>
              )}
              <Button 
                onClick={handleNext}
                className="flex-1"
                disabled={!canContinue}
                data-testid="button-continue-edit"
              >
                Continue
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}

          {step < 4 && (
            <div className="flex justify-center gap-1.5 mt-4">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-1 rounded-full transition-all ${
                    s === step ? "w-6 bg-primary" : s < step ? "w-1.5 bg-primary/50" : "w-1.5 bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
}
