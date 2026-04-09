import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  MessageCircle,
  Target,
  BookOpen,
  Dumbbell,
  Utensils,
  Heart,
  Moon,
  Compass,
  Home,
  X,
  Check,
} from "lucide-react";
import { DWOrb } from "@/components/dw-orb";

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
  profession: string | null;
  lifeGoals: string[];
}

interface OnboardingWizardProps {
  onComplete: (data: OnboardingData, takeTour: boolean) => void;
  onSkip: () => void;
}

const PROFESSIONS = [
  { id: "student", label: "Student" },
  { id: "professional", label: "Professional / Employee" },
  { id: "entrepreneur", label: "Entrepreneur / Business Owner" },
  { id: "creative", label: "Creative / Artist" },
  { id: "parent", label: "Parent / Caregiver" },
  { id: "healthcare", label: "Healthcare Worker" },
  { id: "educator", label: "Educator" },
  { id: "other", label: "Something else" },
];

const LIFE_GOALS = [
  { id: "habits", label: "Build better daily habits" },
  { id: "health", label: "Improve my health & fitness" },
  { id: "stress", label: "Manage stress & anxiety" },
  { id: "career", label: "Grow professionally or in my career" },
  { id: "relationships", label: "Strengthen my relationships" },
  { id: "purpose", label: "Find more purpose and direction" },
  { id: "finances", label: "Improve my financial situation" },
  { id: "spiritual", label: "Build a spiritual practice" },
  { id: "sleep", label: "Get better sleep" },
  { id: "mindset", label: "Shift my mindset and perspective" },
];

const APP_TOUR_SLIDES = [
  {
    icon: MessageCircle,
    color: "text-violet-400",
    bg: "bg-violet-500/15",
    name: "Talk with DW",
    desc: "Your AI coach and companion — available anytime for guidance, clarity, or just to think things through.",
  },
  {
    icon: Home,
    color: "text-blue-400",
    bg: "bg-blue-500/15",
    name: "Command Center",
    desc: "Your daily orbit — see what's happening now, what's next, and what DW has for you at a glance.",
  },
  {
    icon: Target,
    color: "text-emerald-400",
    bg: "bg-emerald-500/15",
    name: "Plan & Goals",
    desc: "Build real plans around your goals. DW tracks progress and nudges you when you need it most.",
  },
  {
    icon: BookOpen,
    color: "text-teal-400",
    bg: "bg-teal-500/15",
    name: "Journal & Reflect",
    desc: "Write freely, reflect on patterns, and let DW turn your entries into insight over time.",
  },
  {
    icon: Dumbbell,
    color: "text-orange-400",
    bg: "bg-orange-500/15",
    name: "Workouts",
    desc: "Personal training tailored to your goals, schedule, and energy — no gym required.",
  },
  {
    icon: Utensils,
    color: "text-rose-400",
    bg: "bg-rose-500/15",
    name: "Meals & Nutrition",
    desc: "Meal plans, tracking, and recipes built around how you actually live — not a generic diet.",
  },
  {
    icon: Heart,
    color: "text-pink-400",
    bg: "bg-pink-500/15",
    name: "Meditate",
    desc: "Breathing exercises, guided sessions, and mindfulness practices that fit your schedule.",
  },
  {
    icon: Moon,
    color: "text-indigo-400",
    bg: "bg-indigo-500/15",
    name: "Cosmic",
    desc: "In-depth astrology and numerology readings — personalized to your birth chart and updated with the cosmos.",
  },
  {
    icon: Compass,
    color: "text-sky-400",
    bg: "bg-sky-500/15",
    name: "Explore",
    desc: "A live feed of content curated by DW based on your goals, interests, and where you are right now.",
  },
];

const TOTAL_STEPS = 7;

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="w-full h-0.5 bg-border/40 rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-primary rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      />
    </div>
  );
}

const slideVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 32 : -32 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -32 : 32 }),
};

export function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [tourIndex, setTourIndex] = useState(0);
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
    profession: null,
    lifeGoals: [],
  });

  const goNext = () => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  };

  const goBack = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  };

  const toggleGoal = (id: string) => {
    setData((d) => ({
      ...d,
      lifeGoals: d.lifeGoals.includes(id)
        ? d.lifeGoals.filter((g) => g !== id)
        : [...d.lifeGoals, id],
    }));
  };

  const handleFinish = () => {
    onComplete({ ...data, completedAt: Date.now() }, false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
        <div className="w-8" />
        <ProgressBar step={step} />
        <button
          onClick={onSkip}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          data-testid="button-onboarding-skip"
          aria-label="Skip onboarding"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Slide content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="flex-1 flex flex-col px-6 pb-6"
          >
            {/* ── STEP 0: MISSION ─────────────────────────────────────── */}
            {step === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.5 }}
                >
                  <div className="relative flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl scale-150" />
                    <DWOrb size={80} state="suggestion" />
                  </div>
                </motion.div>

                <div className="space-y-4 max-w-xs">
                  <motion.h1
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-3xl font-display font-bold text-foreground leading-tight"
                  >
                    Your personal intelligence system.
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-muted-foreground leading-relaxed text-sm"
                  >
                    DW combines AI coaching, astrology, numerology, life planning, journaling, accountability, workouts, meals, and meditation — all in one experience that learns who you are and gets sharper the more you use it.
                  </motion.p>
                  <motion.p
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-xs text-muted-foreground/60 font-medium uppercase tracking-widest"
                  >
                    The operating system for your life.
                  </motion.p>
                </div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="w-full max-w-xs"
                >
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={goNext}
                    data-testid="button-mission-next"
                  >
                    Let's begin <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </motion.div>
              </div>
            )}

            {/* ── STEP 1: HERE'S WHAT I'M ABOUT ──────────────────────── */}
            {step === 1 && (
              <div className="flex-1 flex flex-col justify-center space-y-6 max-w-sm mx-auto w-full">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    So we start on the same page.
                  </p>
                  <h2 className="text-2xl font-display font-bold text-foreground">
                    Here's what I'm about.
                  </h2>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/15 space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                      Good at
                    </p>
                    <p className="text-sm text-foreground leading-relaxed">
                      Cutting through noise, building real plans, connecting your goals to your daily life, and keeping you on track without the lecture.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-muted/50 border border-border/40 space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <X className="h-3 w-3" /> Not
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      A therapist, a substitute for real human support when it matters most, or a replacement for professional care.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-muted/30 border border-border/30 space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <ArrowRight className="h-3 w-3" /> Promise
                    </p>
                    <p className="text-sm text-foreground leading-relaxed">
                      I'll be straight with you, adapt to your energy, and never waste your time.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="ghost" onClick={goBack} data-testid="button-about-back">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button className="flex-1" onClick={goNext} data-testid="button-about-next">
                    That works for me <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── STEP 2: NAME + BIRTH ────────────────────────────────── */}
            {step === 2 && (
              <div className="flex-1 flex flex-col justify-center space-y-6 max-w-sm mx-auto w-full">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Let's start with you
                  </p>
                  <h2 className="text-2xl font-display font-bold text-foreground">
                    Tell me a little about yourself.
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Your name and birth info power your personalized cosmic readings.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      What should I call you?
                    </label>
                    <Input
                      placeholder="Your preferred name"
                      value={data.name ?? ""}
                      onChange={(e) => setData((d) => ({ ...d, name: e.target.value || null }))}
                      className="h-12"
                      data-testid="input-name"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Date of birth
                    </label>
                    <Input
                      type="date"
                      value={data.birthDate ?? ""}
                      onChange={(e) => setData((d) => ({ ...d, birthDate: e.target.value || null }))}
                      className="h-12"
                      data-testid="input-birthdate"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Birth time <span className="text-muted-foreground font-normal">(optional, for accuracy)</span>
                    </label>
                    <Input
                      type="time"
                      value={data.birthTime ?? ""}
                      onChange={(e) => setData((d) => ({ ...d, birthTime: e.target.value || null }))}
                      className="h-12"
                      data-testid="input-birthtime"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Birth location <span className="text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <Input
                      placeholder="City, Country"
                      value={data.birthLocation ?? ""}
                      onChange={(e) => setData((d) => ({ ...d, birthLocation: e.target.value || null }))}
                      className="h-12"
                      data-testid="input-birthlocation"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="ghost" onClick={goBack} data-testid="button-birth-back">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button className="flex-1" onClick={goNext} data-testid="button-birth-next">
                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── STEP 3: WHAT YOU DO ─────────────────────────────────── */}
            {step === 3 && (
              <div className="flex-1 flex flex-col justify-center space-y-5 max-w-sm mx-auto w-full">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Your context
                  </p>
                  <h2 className="text-2xl font-display font-bold text-foreground">
                    What best describes what you do?
                  </h2>
                </div>

                <div className="space-y-2">
                  {PROFESSIONS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setData((d) => ({ ...d, profession: p.id }))}
                      className={`w-full p-4 rounded-2xl text-left text-sm font-medium transition-all border ${
                        data.profession === p.id
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border/40 bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                      }`}
                      data-testid={`button-profession-${p.id}`}
                    >
                      <span className="flex items-center justify-between">
                        {p.label}
                        {data.profession === p.id && (
                          <Check className="h-4 w-4 text-primary shrink-0" />
                        )}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button variant="ghost" onClick={goBack} data-testid="button-profession-back">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={goNext}
                    disabled={!data.profession}
                    data-testid="button-profession-next"
                  >
                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── STEP 4: GOALS ───────────────────────────────────────── */}
            {step === 4 && (
              <div className="flex-1 flex flex-col justify-center space-y-5 max-w-sm mx-auto w-full">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Your next 90 days
                  </p>
                  <h2 className="text-2xl font-display font-bold text-foreground">
                    What do you most want to work on?
                  </h2>
                  <p className="text-sm text-muted-foreground">Pick as many as apply.</p>
                </div>

                <div className="space-y-2">
                  {LIFE_GOALS.map((g) => {
                    const selected = data.lifeGoals.includes(g.id);
                    return (
                      <button
                        key={g.id}
                        onClick={() => toggleGoal(g.id)}
                        className={`w-full p-4 rounded-2xl text-left text-sm font-medium transition-all border ${
                          selected
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border/40 bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                        }`}
                        data-testid={`button-goal-${g.id}`}
                      >
                        <span className="flex items-center justify-between">
                          {g.label}
                          {selected && (
                            <Check className="h-4 w-4 text-primary shrink-0" />
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-3">
                  <Button variant="ghost" onClick={goBack} data-testid="button-goals-back">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={goNext}
                    disabled={data.lifeGoals.length === 0}
                    data-testid="button-goals-next"
                  >
                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── STEP 5: APP TOUR ────────────────────────────────────── */}
            {step === 5 && (
              <div className="flex-1 flex flex-col justify-center space-y-5 max-w-sm mx-auto w-full">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    What's inside
                  </p>
                  <h2 className="text-2xl font-display font-bold text-foreground">
                    Everything in one place.
                  </h2>
                </div>

                {/* Tour card */}
                <div className="relative">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={tourIndex}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.25 }}
                    >
                      {(() => {
                        const slide = APP_TOUR_SLIDES[tourIndex];
                        const Icon = slide.icon;
                        return (
                          <div className="p-6 rounded-2xl border border-border/40 bg-muted/30 space-y-4">
                            <div className={`w-12 h-12 rounded-2xl ${slide.bg} flex items-center justify-center`}>
                              <Icon className={`h-6 w-6 ${slide.color}`} />
                            </div>
                            <div className="space-y-1.5">
                              <p className="font-display font-semibold text-foreground text-lg">
                                {slide.name}
                              </p>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {slide.desc}
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Dots */}
                <div className="flex items-center justify-center gap-1.5">
                  {APP_TOUR_SLIDES.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setTourIndex(i)}
                      className={`rounded-full transition-all duration-300 ${
                        i === tourIndex
                          ? "w-5 h-1.5 bg-primary"
                          : "w-1.5 h-1.5 bg-muted-foreground/30"
                      }`}
                      data-testid={`button-tour-dot-${i}`}
                    />
                  ))}
                </div>

                {/* Tour nav */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setTourIndex((i) => Math.max(i - 1, 0))}
                    disabled={tourIndex === 0}
                    className="p-2 rounded-xl text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
                    data-testid="button-tour-prev"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <span className="text-xs text-muted-foreground">
                    {tourIndex + 1} of {APP_TOUR_SLIDES.length}
                  </span>
                  {tourIndex < APP_TOUR_SLIDES.length - 1 ? (
                    <button
                      onClick={() => setTourIndex((i) => i + 1)}
                      className="p-2 rounded-xl text-muted-foreground hover:text-foreground transition-colors"
                      data-testid="button-tour-next"
                    >
                      <ArrowRight className="h-5 w-5" />
                    </button>
                  ) : (
                    <div className="w-9" />
                  )}
                </div>

                <div className="flex gap-3">
                  <Button variant="ghost" onClick={goBack} data-testid="button-tour-back">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button className="flex-1" onClick={goNext} data-testid="button-tour-continue">
                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── STEP 6: LAUNCH ──────────────────────────────────────── */}
            {step === 6 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 max-w-sm mx-auto w-full">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.5 }}
                >
                  <div className="relative flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-primary/15 blur-2xl scale-150" />
                    <DWOrb size={80} state="idle" />
                  </div>
                </motion.div>

                <div className="space-y-3">
                  <motion.h2
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-2xl font-display font-bold text-foreground"
                  >
                    {data.name ? `You're in, ${data.name}.` : "You're in."}
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-muted-foreground text-sm leading-relaxed"
                  >
                    DW has everything it needs to get started. Your experience will get more personalized the more you use it.
                  </motion.p>
                  {data.lifeGoals.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="p-4 rounded-2xl bg-primary/5 border border-primary/15 text-left"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                          Your focus
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {LIFE_GOALS.filter((g) => data.lifeGoals.includes(g.id))
                          .slice(0, 3)
                          .map((g) => g.label)
                          .join(" · ")}
                        {data.lifeGoals.length > 3 && ` · +${data.lifeGoals.length - 3} more`}
                      </p>
                    </motion.div>
                  )}
                </div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="w-full space-y-3"
                >
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={handleFinish}
                    data-testid="button-launch"
                  >
                    Enter DW <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <button
                    onClick={goBack}
                    className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
                    data-testid="button-launch-back"
                  >
                    Go back
                  </button>
                </motion.div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
