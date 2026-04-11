import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  X,
  Check,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Loader2,
  MapPin,
  Calendar,
  Clock,
  User,
  Briefcase,
  Heart,
  Target,
} from "lucide-react";
import { DWOrb } from "@/components/dw-orb";
import { speakOpenAI, stop as stopTTS } from "@/lib/openai-tts";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OnboardingData {
  name: string | null;
  wellnessGoals: string[];
  birthDate: string | null;
  birthTime: string | null;
  birthLocation: string | null;
  currentLocation: string | null;
  wakeTime: string | null;
  sleepTime: string | null;
  dietaryPreferences: string[];
  fitnessGoals: string[];
  preferredWorkoutDays: string[];
  wearableDataPermission: boolean;
  completedAt: number | null;
  profession: string | null;
  lifeGoals: string[];
  dimensionSnapshot: string[];
}

interface OnboardingWizardProps {
  onComplete: (data: OnboardingData, takeTour: boolean) => void;
  onSkip: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PROFESSIONS = [
  { id: "student", label: "Student", emoji: "🎓" },
  { id: "professional", label: "Professional / Employee", emoji: "💼" },
  { id: "entrepreneur", label: "Entrepreneur / Business Owner", emoji: "🚀" },
  { id: "creative", label: "Creative / Artist", emoji: "🎨" },
  { id: "parent", label: "Parent / Caregiver", emoji: "🏡" },
  { id: "healthcare", label: "Healthcare Worker", emoji: "🏥" },
  { id: "educator", label: "Educator", emoji: "📚" },
  { id: "other", label: "Something else", emoji: "✨" },
];

const LIFE_GOALS = [
  { id: "habits", label: "Build better daily habits", emoji: "✅", dimension: "Mind" },
  { id: "health", label: "Improve my health & fitness", emoji: "💪", dimension: "Body" },
  { id: "stress", label: "Manage stress & anxiety", emoji: "🧘", dimension: "Mind" },
  { id: "career", label: "Grow professionally", emoji: "📈", dimension: "Purpose" },
  { id: "relationships", label: "Strengthen my relationships", emoji: "❤️", dimension: "Relationships" },
  { id: "purpose", label: "Find more purpose and direction", emoji: "🧭", dimension: "Purpose" },
  { id: "finances", label: "Improve my financial situation", emoji: "💰", dimension: "Money" },
  { id: "spiritual", label: "Build a spiritual practice", emoji: "🌟", dimension: "Identity" },
  { id: "sleep", label: "Get better sleep", emoji: "🌙", dimension: "Body" },
  { id: "mindset", label: "Shift my mindset and perspective", emoji: "🔮", dimension: "Mind" },
];

const WAKE_TIMES = ["5:00 AM", "6:00 AM", "6:30 AM", "7:00 AM", "7:30 AM", "8:00 AM", "9:00 AM", "10:00 AM+"];
const SLEEP_TIMES = ["8:00 PM", "9:00 PM", "10:00 PM", "10:30 PM", "11:00 PM", "11:30 PM", "12:00 AM", "1:00 AM+"];
const WORKOUT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Phase labels — used for the progress indicator
const PHASES = [
  { label: "Intro", steps: [0, 1] },
  { label: "Who You Are", steps: [2, 3] },
  { label: "Your Life", steps: [4, 5, 6] },
  { label: "Your Goals", steps: [7, 8] },
  { label: "Ready", steps: [9] },
];

const TOTAL_STEPS = 10;

// 8 life dimension snapshot options — captures current state at onboarding
const DIMENSION_SNAPSHOT_OPTIONS = [
  { id: "body", label: "Body & Health", emoji: "💪", description: "Energy, fitness, or health feels off" },
  { id: "mind", label: "Mind & Mental State", emoji: "🧘", description: "Stress, mood, or mental clarity" },
  { id: "time", label: "Time & Schedule", emoji: "⏰", description: "Overwhelmed or unstructured time" },
  { id: "purpose", label: "Purpose & Goals", emoji: "🎯", description: "Feeling directionless or unmotivated" },
  { id: "money", label: "Money & Finances", emoji: "💰", description: "Financial pressure or uncertainty" },
  { id: "relationships", label: "Relationships", emoji: "❤️", description: "Connection, family, or social life" },
  { id: "environment", label: "Environment & Space", emoji: "🏡", description: "Home, workspace, or surroundings" },
  { id: "identity", label: "Identity & Self", emoji: "🌟", description: "Who I am and what I stand for" },
];

// DW voice scripts for each step — warm, conversational, personal
// Steps 3+ are name-aware so DW addresses the user directly after they've introduced themselves
const STEP_VOICE_SCRIPTS: Record<number, string | ((name: string | null) => string)> = {
  0: "Hey — I'm DW. I'm your personal intelligence system. Think of me as the operating system for your life. I bring together AI coaching, astrology, life planning, journaling, fitness, and more — and I learn who you are over time. Let's start by getting to know each other.",
  1: "Before we dive in — I want to be straight with you. I'm good at cutting through noise, building real plans, and keeping you on track. I'll adapt to your energy and never waste your time. I'm not a therapist, and I won't pretend to be. What I am is your most capable personal system. Sound good?",
  2: "Let's start with who you are. What should I call you? Say your name out loud so I know how to pronounce it — or type it if you prefer. And if you share your birth date and where you were born, I can unlock personalized astrology readings. Totally optional.",
  3: (name) => name
    ? `Nice to meet you, ${name}. Where are you based right now? This helps me with local timing and how I frame your days.`
    : "Where are you based right now? This helps me with local timing and how I frame your days.",
  4: (name) => name
    ? `${name}, tell me about your daily rhythm. When do you usually wake up, wind down, and like to move? You can say it out loud or just tap.`
    : "Tell me about your daily rhythm. When do you wake up, wind down, and like to move? You can say it out loud or just tap.",
  5: (name) => name
    ? `${name}, what do you do? This helps me understand your schedule and the pressures you're working around.`
    : "What do you do? This helps me understand your schedule and the pressures you're working around.",
  6: (name) => name
    ? `${name}, let's take stock of where things stand. Which areas of your life feel most alive — or most challenging — right now?`
    : "Let's take stock of where things stand. Which areas of your life feel most alive or most challenging right now?",
  7: (name) => name
    ? `Now ${name}, where do you most want to grow in the next 90 days? Be honest — this shapes everything I build for you.`
    : "Where do you most want to grow in the next 90 days? Be honest — this shapes everything.",
  8: (name) => name
    ? `${name}, I've heard everything. Based on what you've shared, here's how I've set up your space.`
    : "I've heard everything. Based on what you've shared, here's how I've set up your space.",
  9: (name) => name
    ? `You're in, ${name}. DW is ready. Everything gets sharper the more you use it — I'm excited to show you what's possible.`
    : "You're in. DW is ready. Everything gets sharper the more you use it.",
};

// ─── Speech recognition shims ─────────────────────────────────────────────────

interface SpeechRecognitionEvent { results: SpeechRecognitionResultList; }
interface SpeechRecognitionErrorEvent { error: string; }
interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
interface SpeechRecognitionCtor { new(): SpeechRecognitionInstance; }
declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}
function getSR(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

// ─── VoiceButton component ────────────────────────────────────────────────────

type MicState = "idle" | "listening" | "processing";

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  label?: string;
}

function VoiceButton({ onTranscript, disabled, label = "Speak your answer" }: VoiceButtonProps) {
  const [micState, setMicState] = useState<MicState>("idle");
  const [interim, setInterim] = useState("");
  const recRef = useRef<SpeechRecognitionInstance | null>(null);
  const transcriptRef = useRef("");
  const SR = getSR();

  const stop = useCallback(() => {
    recRef.current?.stop();
    recRef.current = null;
    setInterim("");
    setMicState("idle");
  }, []);

  const start = useCallback(() => {
    if (!SR) return;
    stop();
    stopTTS();
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onstart = () => { setMicState("listening"); transcriptRef.current = ""; };
    rec.onresult = (e) => {
      let interimText = "";
      let final = "";
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interimText += e.results[i][0].transcript;
      }
      if (final) transcriptRef.current = final;
      setInterim(interimText);
    };
    rec.onerror = (e) => { if (e.error !== "aborted") setMicState("idle"); };
    rec.onend = () => {
      const t = transcriptRef.current.trim();
      if (t) {
        setMicState("processing");
        onTranscript(t);
        setTimeout(() => setMicState("idle"), 600);
      } else {
        setMicState("idle");
      }
      setInterim("");
    };
    recRef.current = rec;
    rec.start();
  }, [SR, stop, onTranscript]);

  useEffect(() => () => { stop(); }, [stop]);

  if (!SR) return null;

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={micState === "idle" ? start : stop}
        disabled={disabled || micState === "processing"}
        className={cn(
          "relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 focus:outline-none",
          micState === "listening"
            ? "bg-primary shadow-lg shadow-primary/30 scale-110"
            : micState === "processing"
              ? "bg-primary/20"
              : "bg-muted/60 hover:bg-muted border border-border/40 hover:border-primary/30"
        )}
        data-testid="button-voice-input"
        aria-label={micState === "listening" ? "Stop recording" : label}
      >
        {micState === "listening" && (
          <>
            <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <MicOff className="w-5 h-5 text-primary-foreground relative z-10" />
          </>
        )}
        {micState === "processing" && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
        {micState === "idle" && <Mic className="w-5 h-5 text-muted-foreground" />}
      </button>
      {interim && (
        <p className="text-xs text-muted-foreground/70 italic max-w-[180px] text-center truncate">"{interim}"</p>
      )}
    </div>
  );
}

// ─── DW voice orb with speak button ─────────────────────────────────────────

interface DWVoiceOrbProps {
  script: string;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  autoSpeak?: boolean;
  size?: number;
}

function DWVoiceOrb({ script, voiceEnabled, onToggleVoice, autoSpeak, size = 72 }: DWVoiceOrbProps) {
  const [ttsState, setTtsState] = useState<"idle" | "loading" | "speaking">("idle");
  const hasSpoken = useRef(false);

  const speak = useCallback(async () => {
    if (ttsState === "speaking") { stopTTS(); setTtsState("idle"); return; }
    setTtsState("loading");
    try {
      await speakOpenAI(script, { voice: "alloy" });
    } catch {
      // handled in speakOpenAI
    }
    setTtsState("idle");
  }, [script, ttsState]);

  useEffect(() => {
    if (autoSpeak && voiceEnabled && !hasSpoken.current) {
      hasSpoken.current = true;
      const timer = setTimeout(() => { speak(); }, 600);
      return () => clearTimeout(timer);
    }
    return () => { hasSpoken.current = false; };
  }, [script]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={voiceEnabled ? speak : undefined}
        disabled={ttsState === "loading"}
        className={cn(
          "relative flex items-center justify-center focus:outline-none transition-transform",
          voiceEnabled && ttsState !== "loading" && "hover:scale-105 active:scale-95 cursor-pointer",
          !voiceEnabled && "cursor-default"
        )}
        aria-label={ttsState === "speaking" ? "Stop DW" : "Hear DW speak"}
        data-testid="button-dw-orb-speak"
        title={voiceEnabled ? (ttsState === "speaking" ? "Tap to stop" : "Tap to hear DW") : ""}
      >
        {ttsState === "speaking" && (
          <>
            <span className="absolute w-24 h-24 rounded-full bg-primary/8 animate-ping" style={{ animationDuration: "2s" }} />
            <span className="absolute w-20 h-20 rounded-full bg-primary/12 animate-ping" style={{ animationDuration: "1.5s", animationDelay: "0.3s" }} />
          </>
        )}
        <DWOrb size={size} state={ttsState === "speaking" ? "active" : ttsState === "loading" ? "active" : "suggestion"} />
      </button>

      <div className="flex items-center gap-2">
        {voiceEnabled && (
          <span className={cn(
            "text-[10px] font-medium uppercase tracking-wider transition-colors",
            ttsState === "speaking" ? "text-primary" : ttsState === "loading" ? "text-muted-foreground" : "text-muted-foreground/50"
          )}>
            {ttsState === "loading" ? "Loading…" : ttsState === "speaking" ? "Speaking — tap to stop" : "Tap orb to hear DW"}
          </span>
        )}
        <button
          type="button"
          onClick={onToggleVoice}
          className="p-1.5 rounded-full text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          title={voiceEnabled ? "Mute DW voice" : "Unmute DW voice"}
          data-testid="button-toggle-dw-voice"
        >
          {voiceEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
        </button>
      </div>
    </div>
  );
}

// ─── Phase progress bar ────────────────────────────────────────────────────────

function PhaseProgress({ step }: { step: number }) {
  const currentPhase = PHASES.findIndex(p => p.steps.includes(step));
  return (
    <div className="flex items-center gap-1.5 w-full">
      {PHASES.map((phase, i) => (
        <div key={phase.label} className="flex-1 flex flex-col gap-1">
          <div className={cn(
            "h-0.5 rounded-full transition-all duration-500",
            i < currentPhase ? "bg-primary" : i === currentPhase ? "bg-primary/70" : "bg-border/40"
          )} />
        </div>
      ))}
    </div>
  );
}

const slideVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 32 : -32 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -32 : 32 }),
};

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [data, setData] = useState<OnboardingData>({
    name: null,
    wellnessGoals: [],
    birthDate: null,
    birthTime: null,
    birthLocation: null,
    currentLocation: null,
    wakeTime: "7:00 AM",
    sleepTime: "10:00 PM",
    dietaryPreferences: [],
    fitnessGoals: [],
    preferredWorkoutDays: [],
    wearableDataPermission: false,
    completedAt: null,
    profession: null,
    lifeGoals: [],
    dimensionSnapshot: [],
  });

  const goNext = () => {
    stopTTS();
    setDirection(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  };

  const goBack = () => {
    stopTTS();
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
    stopTTS();
    onComplete({ ...data, completedAt: Date.now() }, false);
  };

  const handleToggleVoice = () => {
    if (voiceEnabled) stopTTS();
    setVoiceEnabled((v) => !v);
  };

  const currentScript = (() => {
    const s = STEP_VOICE_SCRIPTS[step];
    if (typeof s === "function") return s(data.name);
    return s ?? "";
  })();

  // Auto-advance ref — used to trigger goNext after voice input resolves
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleAutoAdvance = useCallback((delay = 1400) => {
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    autoAdvanceRef.current = setTimeout(() => {
      stopTTS();
      setDirection(1);
      setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
    }, delay);
  }, []);
  useEffect(() => () => { if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current); }, []);

  const handleNameVoice = (transcript: string) => {
    // Strip filler words like "My name is", "I'm", "Call me", "It's"
    const cleaned = transcript
      .replace(/^(?:my\s+name\s+is|i['']?m|call\s+me|it['']?s|i\s+am)\s+/i, "")
      .trim();
    const name = cleaned.split(/\s+/).slice(0, 2).join(" ");
    if (name) {
      setData((d) => ({ ...d, name }));
      scheduleAutoAdvance(1600); // let DW say name back before moving
    }
  };

  // Parse "April 15, 1990" / "March 3rd 1988" / "1990-04-15" → YYYY-MM-DD
  const handleBirthDateVoice = (transcript: string) => {
    const MONTHS: Record<string, string> = {
      january: "01", february: "02", march: "03", april: "04",
      may: "05", june: "06", july: "07", august: "08",
      september: "09", october: "10", november: "11", december: "12",
      jan: "01", feb: "02", mar: "03", apr: "04", jun: "06",
      jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
    };
    const lower = transcript.toLowerCase().replace(/(\d+)(st|nd|rd|th)/g, "$1");
    // Match "Month Day Year" or "Day Month Year"
    const m1 = lower.match(/([a-z]+)\s+(\d{1,2})[,\s]+(\d{4})/);
    const m2 = lower.match(/(\d{1,2})\s+([a-z]+)[,\s]+(\d{4})/);
    // Match ISO-like: "1990-04-15" or "04/15/1990"
    const m3 = lower.match(/(\d{4})[/-](\d{2})[/-](\d{2})/);
    const m4 = lower.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    let result: string | null = null;
    if (m1 && MONTHS[m1[1]]) {
      result = `${m1[3]}-${MONTHS[m1[1]]}-${m1[2].padStart(2, "0")}`;
    } else if (m2 && MONTHS[m2[2]]) {
      result = `${m2[3]}-${MONTHS[m2[2]]}-${m2[1].padStart(2, "0")}`;
    } else if (m3) {
      result = `${m3[1]}-${m3[2]}-${m3[3]}`;
    } else if (m4) {
      result = `${m4[3]}-${m4[1].padStart(2, "0")}-${m4[2].padStart(2, "0")}`;
    }
    if (result) setData((d) => ({ ...d, birthDate: result }));
  };

  // Parse "3:30 PM", "7 AM", "quarter past 2" → HH:MM (24h for input type="time")
  const handleBirthTimeVoice = (transcript: string) => {
    const lower = transcript.toLowerCase();
    const m = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
    if (!m) return;
    let hour = parseInt(m[1]);
    const min = m[2] ? parseInt(m[2]) : 0;
    const meridiem = m[3];
    if (meridiem === "pm" && hour < 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;
    const timeStr = `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
    setData((d) => ({ ...d, birthTime: timeStr }));
  };

  const handleLocationVoice = (transcript: string) => {
    setData((d) => ({ ...d, birthLocation: transcript }));
  };

  // Match spoken words to dimension snapshot options (step 6)
  const handleSnapshotVoice = (transcript: string) => {
    const lower = transcript.toLowerCase();
    const keywordMap: Record<string, string[]> = {
      body: ["body", "health", "fitness", "physical", "exercise", "weight", "energy"],
      mind: ["mind", "mental", "anxiety", "stress", "focus", "brain", "thoughts", "clarity"],
      time: ["time", "schedule", "busy", "overwhelmed", "calendar", "routine", "organized"],
      purpose: ["purpose", "meaning", "direction", "career", "calling", "passion", "goal"],
      money: ["money", "financial", "finances", "income", "budget", "debt", "savings", "wealth"],
      relationships: ["relationship", "relationships", "family", "friends", "social", "love", "partner", "lonely"],
      environment: ["environment", "home", "space", "workspace", "living", "clutter", "surroundings"],
      identity: ["identity", "self", "who i am", "values", "confidence", "purpose", "growth"],
    };
    const matched = Object.entries(keywordMap)
      .filter(([, keywords]) => keywords.some(kw => lower.includes(kw)))
      .map(([id]) => id);
    if (matched.length > 0) {
      setData((d) => ({
        ...d,
        dimensionSnapshot: [...new Set([...d.dimensionSnapshot, ...matched])],
      }));
    }
  };

  const handleCurrentLocationVoice = (transcript: string) => {
    setData((d) => ({ ...d, currentLocation: transcript }));
    scheduleAutoAdvance();
  };

  const handleProfessionVoice = (transcript: string) => {
    const lower = transcript.toLowerCase();
    const match = PROFESSIONS.find(p =>
      lower.includes(p.label.toLowerCase().split(" ")[0]) ||
      lower.includes(p.id)
    );
    if (match) {
      setData((d) => ({ ...d, profession: match.id }));
      scheduleAutoAdvance();
    }
  };

  // Parse natural language schedule input — "I wake up at 7 and sleep at 11"
  const handleScheduleVoice = (transcript: string) => {
    const lower = transcript.toLowerCase();
    const updates: { wakeTime?: string; sleepTime?: string; preferredWorkoutDays?: string[] } = {};

    // Extract a time number from a context match
    const extractHour = (match: RegExpMatchArray | null): number | null => {
      if (!match) return null;
      return parseInt(match[1]);
    };

    // Wake time — "wake up at X", "up at X", "start at X"
    const wakeMatch = lower.match(/(?:wake\s+up|wakeup|get\s+up|up|start)\s+(?:at|around|by)?\s*(\d{1,2})/);
    const wakeHour = extractHour(wakeMatch);
    if (wakeHour !== null) {
      // Wake times are always AM; find closest
      const amHour = wakeHour < 12 ? wakeHour : wakeHour - 12;
      const target = amHour <= 5 ? "5:00 AM" : amHour <= 6 ? "6:00 AM" : amHour <= 7 ? (lower.includes("6:30") || lower.includes("six thirty") ? "6:30 AM" : "7:00 AM") : amHour <= 8 ? (lower.includes("7:30") || lower.includes("seven thirty") ? "7:30 AM" : "8:00 AM") : amHour <= 9 ? "9:00 AM" : "10:00 AM+";
      if (WAKE_TIMES.includes(target)) updates.wakeTime = target;
    }

    // Sleep time — "sleep at X", "bed at X", "wind down at X"
    const sleepMatch = lower.match(/(?:sleep|bed|wind\s+down|asleep|night)\s+(?:at|around|by)?\s*(\d{1,2})/);
    const sleepHour = extractHour(sleepMatch);
    if (sleepHour !== null) {
      // Sleep times are PM (or midnight/1am); map to closest
      const pmHour = sleepHour <= 3 ? sleepHour + 12 : sleepHour; // 1→13(1am), treat <=3 as past midnight
      const target = sleepHour <= 3 ? (sleepHour === 1 ? "1:00 AM+" : "12:00 AM") : pmHour <= 20 ? "8:00 PM" : pmHour <= 21 ? "9:00 PM" : pmHour <= 22 ? (lower.includes("10:30") || lower.includes("ten thirty") ? "10:30 PM" : "10:00 PM") : pmHour <= 23 ? (lower.includes("11:30") || lower.includes("eleven thirty") ? "11:30 PM" : "11:00 PM") : "12:00 AM";
      if (SLEEP_TIMES.includes(target)) updates.sleepTime = target;
    }

    // Workout days — "monday wednesday friday", "weekdays", "mon wed fri"
    const dayMap: Record<string, string> = {
      monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu",
      friday: "Fri", saturday: "Sat", sunday: "Sun",
      mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu",
      fri: "Fri", sat: "Sat", sun: "Sun",
    };
    if (lower.includes("weekday") || lower.includes("week day")) {
      updates.preferredWorkoutDays = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    } else if (lower.includes("weekend")) {
      updates.preferredWorkoutDays = ["Sat", "Sun"];
    } else {
      const days = Object.entries(dayMap)
        .filter(([key]) => lower.includes(key))
        .map(([, val]) => val);
      if (days.length > 0) updates.preferredWorkoutDays = [...new Set(days)];
    }

    if (Object.keys(updates).length > 0) {
      setData((d) => ({ ...d, ...updates }));
    }
  };

  const handleGoalsVoice = (transcript: string) => {
    const lower = transcript.toLowerCase();
    const matched = LIFE_GOALS.filter(g =>
      lower.includes(g.id) ||
      g.label.split(" ").some(w => w.length > 4 && lower.includes(w.toLowerCase()))
    );
    if (matched.length > 0) {
      setData((d) => ({
        ...d,
        lifeGoals: [...new Set([...d.lifeGoals, ...matched.map(g => g.id)])],
      }));
    }
  };

  useEffect(() => () => { stopTTS(); }, []);

  // Suggested focus areas based on goals + profession
  const suggestedDimensions = (() => {
    const dims = new Set<string>();
    data.lifeGoals.forEach(goalId => {
      const goal = LIFE_GOALS.find(g => g.id === goalId);
      if (goal) dims.add(goal.dimension);
    });
    if (dims.size === 0) {
      dims.add("Body");
      dims.add("Mind");
      dims.add("Purpose");
    }
    return Array.from(dims).slice(0, 3);
  })();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0 gap-4">
        <div className="w-8" />
        <PhaseProgress step={step} />
        <button
          onClick={onSkip}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
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

            {/* ── STEP 0: WELCOME ──────────────────────────────────────── */}
            {step === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.5 }}
                >
                  <DWVoiceOrb
                    script={currentScript}
                    voiceEnabled={voiceEnabled}
                    onToggleVoice={handleToggleVoice}
                    autoSpeak
                    size={84}
                  />
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
                    DW combines AI coaching, astrology, life planning, journaling, accountability, workouts, and more — all in one experience that learns who you are and gets sharper over time.
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
                  className="w-full max-w-xs space-y-3"
                >
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={goNext}
                    data-testid="button-mission-next"
                  >
                    Let's begin <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <button
                    onClick={onSkip}
                    className="w-full text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors py-1"
                    data-testid="button-welcome-skip"
                  >
                    Skip setup and explore first
                  </button>
                </motion.div>
              </div>
            )}

            {/* ── STEP 1: WHAT DW IS ──────────────────────────────────── */}
            {step === 1 && (
              <div className="flex-1 flex flex-col justify-center space-y-5 max-w-sm mx-auto w-full">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      So we start on the same page.
                    </p>
                    <h2 className="text-2xl font-display font-bold text-foreground">
                      Here's what I'm about.
                    </h2>
                  </div>
                  <DWVoiceOrb
                    script={currentScript}
                    voiceEnabled={voiceEnabled}
                    onToggleVoice={handleToggleVoice}
                    autoSpeak
                  />
                </div>

                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/15 space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">Good at</p>
                    <p className="text-sm text-foreground leading-relaxed">
                      Cutting through noise, building real plans, connecting your goals to daily life, and keeping you on track without the lecture.
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-muted/50 border border-border/40 space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <X className="h-3 w-3" /> Not
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      A therapist, or a substitute for real human support when it matters most.
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

            {/* ── STEP 2: WHO YOU ARE — Name + Birth ──────────────────── */}
            {step === 2 && (
              <div className="flex-1 flex flex-col justify-center space-y-5 max-w-sm mx-auto w-full">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Phase 1 · Who You Are
                    </p>
                    <h2 className="text-2xl font-display font-bold text-foreground">
                      Let's start with you.
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Your name and birth info unlock your personalized cosmic readings.
                    </p>
                  </div>
                  <DWVoiceOrb
                    script={currentScript}
                    voiceEnabled={voiceEnabled}
                    onToggleVoice={handleToggleVoice}
                    autoSpeak
                  />
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      What should I call you?
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Your preferred name"
                        value={data.name ?? ""}
                        onChange={(e) => setData((d) => ({ ...d, name: e.target.value || null }))}
                        className="h-12 flex-1"
                        data-testid="input-name"
                      />
                      <VoiceButton onTranscript={handleNameVoice} label="Say your name so DW hears how to pronounce it" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      Date of birth
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={data.birthDate ?? ""}
                        onChange={(e) => setData((d) => ({ ...d, birthDate: e.target.value || null }))}
                        className="h-12 flex-1"
                        data-testid="input-birthdate"
                      />
                      <VoiceButton onTranscript={handleBirthDateVoice} label="Say your birth date, e.g. April 15 1990" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      Birth time <span className="text-muted-foreground font-normal text-xs">(optional — refines your chart)</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={data.birthTime ?? ""}
                        onChange={(e) => setData((d) => ({ ...d, birthTime: e.target.value || null }))}
                        className="h-12 flex-1"
                        data-testid="input-birthtime"
                      />
                      <VoiceButton onTranscript={handleBirthTimeVoice} label="Say your birth time, e.g. 3:30 PM" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      Birth location <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="City, Country"
                        value={data.birthLocation ?? ""}
                        onChange={(e) => setData((d) => ({ ...d, birthLocation: e.target.value || null }))}
                        className="h-12 flex-1"
                        data-testid="input-birthlocation"
                      />
                      <VoiceButton onTranscript={handleLocationVoice} label="Say your birth location" />
                    </div>
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

            {/* ── STEP 3: WHERE YOU ARE NOW — Current Location ─────────── */}
            {step === 3 && (
              <div className="flex-1 flex flex-col justify-center space-y-5 max-w-sm mx-auto w-full">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Phase 1 · Who You Are
                    </p>
                    <h2 className="text-2xl font-display font-bold text-foreground">
                      Where are you based?
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Helps me with timing, local context, and how I frame your days.
                    </p>
                  </div>
                  <DWVoiceOrb
                    script={currentScript}
                    voiceEnabled={voiceEnabled}
                    onToggleVoice={handleToggleVoice}
                    autoSpeak
                  />
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      Where you live now
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="City, Country"
                        value={data.currentLocation ?? ""}
                        onChange={(e) => setData((d) => ({ ...d, currentLocation: e.target.value || null }))}
                        className="h-12 flex-1"
                        data-testid="input-currentlocation"
                      />
                      <VoiceButton onTranscript={handleCurrentLocationVoice} label="Say your current location" />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-muted/30 border border-border/30">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      This is only used to personalize your experience — scheduling, weather context, and local timing. Nothing is shared externally.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="ghost" onClick={goBack} data-testid="button-location-back">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button className="flex-1" onClick={goNext} data-testid="button-location-next">
                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── STEP 4: YOUR LIFE — Daily Rhythm ─────────────────────── */}
            {step === 4 && (
              <div className="flex-1 flex flex-col justify-center space-y-4 max-w-sm mx-auto w-full">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Phase 2 · Your Life Right Now
                    </p>
                    <h2 className="text-2xl font-display font-bold text-foreground">
                      When does your day run?
                    </h2>
                    <p className="text-sm text-muted-foreground">Helps me build plans that fit your life, not fight it.</p>
                  </div>
                  <DWVoiceOrb
                    script={currentScript}
                    voiceEnabled={voiceEnabled}
                    onToggleVoice={handleToggleVoice}
                    autoSpeak
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" /> I usually wake up around
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {WAKE_TIMES.map((t) => (
                        <button
                          key={t}
                          onClick={() => setData((d) => ({ ...d, wakeTime: t }))}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-sm border transition-all",
                            data.wakeTime === t
                              ? "border-primary bg-primary/10 text-foreground font-medium"
                              : "border-border/40 bg-muted/40 text-muted-foreground hover:bg-muted/70"
                          )}
                          data-testid={`button-wake-${t.replace(/[: ]/g, '-')}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" /> I usually wind down around
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {SLEEP_TIMES.map((t) => (
                        <button
                          key={t}
                          onClick={() => setData((d) => ({ ...d, sleepTime: t }))}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-sm border transition-all",
                            data.sleepTime === t
                              ? "border-primary bg-primary/10 text-foreground font-medium"
                              : "border-border/40 bg-muted/40 text-muted-foreground hover:bg-muted/70"
                          )}
                          data-testid={`button-sleep-${t.replace(/[: ]/g, '-')}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                      I prefer to move on <span className="text-muted-foreground/60">(optional)</span>
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {WORKOUT_DAYS.map((d) => {
                        const selected = data.preferredWorkoutDays.includes(d);
                        return (
                          <button
                            key={d}
                            onClick={() => setData((prev) => ({
                              ...prev,
                              preferredWorkoutDays: selected
                                ? prev.preferredWorkoutDays.filter((x) => x !== d)
                                : [...prev.preferredWorkoutDays, d],
                            }))}
                            className={cn(
                              "w-12 h-12 rounded-xl text-sm border font-medium transition-all",
                              selected
                                ? "border-primary bg-primary/10 text-foreground"
                                : "border-border/40 bg-muted/40 text-muted-foreground hover:bg-muted/70"
                            )}
                            data-testid={`button-day-${d.toLowerCase()}`}
                          >
                            {d}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <VoiceButton onTranscript={handleScheduleVoice} label="Say your schedule, e.g. wake at 7, sleep at 11" />
                  <div className="flex-1 flex gap-3">
                    <Button variant="ghost" onClick={goBack} data-testid="button-schedule-back">
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button className="flex-1" onClick={goNext} data-testid="button-schedule-next">
                      Continue <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 5: YOUR LIFE — Profession ───────────────────────── */}
            {step === 5 && (
              <div className="flex-1 flex flex-col justify-center space-y-4 max-w-sm mx-auto w-full">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Phase 2 · Your Life Right Now
                    </p>
                    <h2 className="text-2xl font-display font-bold text-foreground">
                      What do you do?
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Helps me understand your schedule, pressures, and context.
                    </p>
                  </div>
                  <DWVoiceOrb
                    script={currentScript}
                    voiceEnabled={voiceEnabled}
                    onToggleVoice={handleToggleVoice}
                    autoSpeak
                  />
                </div>

                <div className="space-y-2">
                  {PROFESSIONS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setData((d) => ({ ...d, profession: p.id }))}
                      className={cn(
                        "w-full p-4 rounded-2xl text-left text-sm font-medium transition-all border",
                        data.profession === p.id
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border/40 bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                      )}
                      data-testid={`button-profession-${p.id}`}
                    >
                      <span className="flex items-center justify-between">
                        <span className="flex items-center gap-2.5">
                          <span>{p.emoji}</span>
                          {p.label}
                        </span>
                        {data.profession === p.id && <Check className="h-4 w-4 text-primary shrink-0" />}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <VoiceButton onTranscript={handleProfessionVoice} label="Say what you do" />
                  <div className="flex-1 flex gap-3">
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
              </div>
            )}

            {/* ── STEP 6: LIFE SNAPSHOT — Current State Across 8 Dimensions ── */}
            {step === 6 && (
              <div className="flex-1 flex flex-col justify-center space-y-4 max-w-sm mx-auto w-full">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Phase 2 · Your Life Right Now
                    </p>
                    <h2 className="text-2xl font-display font-bold text-foreground">
                      Where are things at?
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Which areas of your life feel most alive or most challenging right now? Pick all that apply.
                    </p>
                  </div>
                  <DWVoiceOrb
                    script={currentScript}
                    voiceEnabled={voiceEnabled}
                    onToggleVoice={handleToggleVoice}
                    autoSpeak
                  />
                </div>

                <div className="space-y-2">
                  {DIMENSION_SNAPSHOT_OPTIONS.map((opt) => {
                    const selected = data.dimensionSnapshot.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setData((d) => ({
                          ...d,
                          dimensionSnapshot: selected
                            ? d.dimensionSnapshot.filter((x) => x !== opt.id)
                            : [...d.dimensionSnapshot, opt.id],
                        }))}
                        className={cn(
                          "w-full p-3 rounded-2xl text-left text-sm font-medium transition-all border",
                          selected
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border/40 bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                        )}
                        data-testid={`button-snapshot-${opt.id}`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2.5">
                            <span>{opt.emoji}</span>
                            <span className="flex flex-col">
                              <span>{opt.label}</span>
                              <span className="text-[10px] font-normal text-muted-foreground/70">{opt.description}</span>
                            </span>
                          </span>
                          {selected && <Check className="h-4 w-4 text-primary shrink-0" />}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-3">
                  <VoiceButton onTranscript={handleSnapshotVoice} label="Describe what's alive or challenging right now" />
                  <div className="flex-1 flex gap-3">
                    <Button variant="ghost" onClick={goBack} data-testid="button-snapshot-back">
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={goNext}
                      data-testid="button-snapshot-next"
                    >
                      Continue <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 7: WHERE YOU WANT TO GO — Goals ─────────────────── */}
            {step === 7 && (
              <div className="flex-1 flex flex-col justify-center space-y-4 max-w-sm mx-auto w-full">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Phase 3 · Where You Want to Go
                    </p>
                    <h2 className="text-2xl font-display font-bold text-foreground">
                      What matters most right now?
                    </h2>
                    <p className="text-sm text-muted-foreground">Pick everything that actually applies — this shapes your whole experience.</p>
                  </div>
                  <DWVoiceOrb
                    script={currentScript}
                    voiceEnabled={voiceEnabled}
                    onToggleVoice={handleToggleVoice}
                    autoSpeak
                  />
                </div>

                <div className="space-y-2">
                  {LIFE_GOALS.map((g) => {
                    const selected = data.lifeGoals.includes(g.id);
                    return (
                      <button
                        key={g.id}
                        onClick={() => toggleGoal(g.id)}
                        className={cn(
                          "w-full p-3.5 rounded-2xl text-left text-sm font-medium transition-all border",
                          selected
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border/40 bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                        )}
                        data-testid={`button-goal-${g.id}`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2.5">
                            <span>{g.emoji}</span>
                            <span className="flex-1">{g.label}</span>
                          </span>
                          <span className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] text-muted-foreground/60 hidden sm:block">{g.dimension}</span>
                            {selected && <Check className="h-4 w-4 text-primary" />}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-3">
                  <VoiceButton onTranscript={handleGoalsVoice} label="Say your goals" />
                  <div className="flex-1 flex gap-3">
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
              </div>
            )}

            {/* ── STEP 8: DW REFLECTS — Here's Your Space ──────────────── */}
            {step === 8 && (
              <div className="flex-1 flex flex-col justify-center space-y-5 max-w-sm mx-auto w-full">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Phase 3 · Your Setup
                    </p>
                    <h2 className="text-2xl font-display font-bold text-foreground">
                      Here's how I've set up your space.
                    </h2>
                  </div>
                  <DWVoiceOrb
                    script={currentScript}
                    voiceEnabled={voiceEnabled}
                    onToggleVoice={handleToggleVoice}
                    autoSpeak
                  />
                </div>

                <div className="space-y-3">
                  {data.name && (
                    <div className="p-4 rounded-2xl bg-muted/30 border border-border/30 flex items-center gap-3">
                      <User className="h-4 w-4 text-primary shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Your name</p>
                        <p className="text-sm font-medium text-foreground">{data.name}</p>
                      </div>
                    </div>
                  )}

                  {suggestedDimensions.length > 0 && (
                    <div className="p-4 rounded-2xl bg-primary/5 border border-primary/15 space-y-2">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary" />
                        <span className="text-xs font-semibold text-primary uppercase tracking-wider">Focus areas I've set up for you</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {suggestedDimensions.map((dim) => (
                          <span key={dim} className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium">
                            {dim}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Based on what you've shared, these are the life areas I'll prioritize first.
                      </p>
                    </div>
                  )}

                  {data.lifeGoals.length > 0 && (
                    <div className="p-4 rounded-2xl bg-muted/30 border border-border/30 space-y-2">
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your goals</span>
                      </div>
                      <p className="text-sm text-foreground">
                        {LIFE_GOALS.filter((g) => data.lifeGoals.includes(g.id))
                          .slice(0, 4)
                          .map((g) => g.emoji + " " + g.label)
                          .join(" · ")}
                        {data.lifeGoals.length > 4 && ` · +${data.lifeGoals.length - 4} more`}
                      </p>
                    </div>
                  )}

                  <div className="p-4 rounded-2xl bg-muted/20 border border-border/20 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">What I've prepared</span>
                    </div>
                    <ul className="space-y-1">
                      {[
                        "Life Blueprint pre-populated with your 8 dimensions",
                        "Starter My Plan based on your schedule",
                        data.lifeGoals.length > 0 ? "2-3 first habit suggestions ready" : null,
                      ].filter(Boolean).map((item, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                          <Check className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="ghost" onClick={goBack} data-testid="button-reflect-back">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button className="flex-1" onClick={goNext} data-testid="button-reflect-next">
                    Looks good <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── STEP 9: LAUNCH ───────────────────────────────────────── */}
            {step === 9 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 max-w-sm mx-auto w-full">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.5 }}
                >
                  <DWVoiceOrb
                    script={currentScript}
                    voiceEnabled={voiceEnabled}
                    onToggleVoice={handleToggleVoice}
                    autoSpeak
                    size={84}
                  />
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
                    DW has everything it needs to get started. Your space is set up, your dimensions are mapped, and your experience gets sharper the more you use it.
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="p-4 rounded-2xl bg-primary/5 border border-primary/15 text-left space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold text-primary uppercase tracking-wider">Ready for you</span>
                    </div>
                    <div className="space-y-1">
                      {[
                        "Your Life Blueprint is set up",
                        "My Plan is ready with your schedule",
                        "DW is available everywhere — just tap the orb",
                      ].map((item, i) => (
                        <p key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                          <Check className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                          {item}
                        </p>
                      ))}
                    </div>
                  </motion.div>
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
