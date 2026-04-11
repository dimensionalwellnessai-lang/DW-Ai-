import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles, Settings2, Heart, Wind, ChevronDown, ChevronUp, Clock,
  Play, CheckCircle2, Flame, Wand2, Loader2, Volume2, Star, X, Square, Headphones
} from "lucide-react";
import { SpiritualProfileDialog } from "@/components/spiritual-profile-dialog";
import {
  getSpiritualProfile, hasCompletedSpiritualProfile,
  getSavedRoutinesByType, saveRoutine,
  type SpiritualProfile, type SavedRoutine
} from "@/lib/guest-storage";
import { TTSButton } from "@/components/tts-button";
import { ttsService } from "@/lib/tts-service";
import { MeditationAudioPlayer } from "@/components/meditation-audio-player";
import { useToast } from "@/hooks/use-toast";

const PRACTICE_LABELS: Record<string, string> = {
  meditation: "Meditation", prayer: "Prayer", breathwork: "Breathwork",
  journaling: "Journaling", gratitude: "Gratitude", nature: "Nature",
  yoga: "Yoga", mindfulness: "Mindfulness", affirmations: "Affirmations",
  visualization: "Visualization", bodyawareness: "Body Awareness",
};

const NEED_LABELS: Record<string, string> = {
  calm: "Calm", clarity: "Clarity", connection: "Connection",
  energy: "Energy", release: "Release",
};

interface PracticeData {
  id: string;
  title: string;
  description: string;
  duration: number;
  category: string;
  practices: string[];
  forNeeds: string[];
  steps: string[];
  guidance: string;
}

const ALL_PRACTICES: PracticeData[] = [
  // ─── Gratitude ───────────────────────────────────────────────────────────
  {
    id: "morning-gratitude", title: "Morning Gratitude", description: "Start your day by noticing three things you're grateful for",
    duration: 5, category: "Gratitude", practices: ["gratitude", "mindfulness"], forNeeds: ["calm", "connection"],
    steps: ["Find a quiet spot and sit comfortably", "Take three deep breaths to center yourself", "Think of one person you're grateful for — feel the warmth", "Think of one experience from yesterday you're thankful for", "Think of one simple thing in your life you appreciate", "Carry this gratitude with you into your day"],
    guidance: "This practice rewires your brain to notice the good. There's no right or wrong — whatever comes up is perfect."
  },
  {
    id: "gratitude-letter", title: "Gratitude Letter", description: "Write an unsent letter of appreciation to someone who changed your life",
    duration: 15, category: "Gratitude", practices: ["gratitude", "journaling"], forNeeds: ["connection", "release"],
    steps: ["Choose someone who has positively impacted you", "Find paper or your journal — handwriting is powerful here", "Start with: 'I've been thinking about how much you mean to me…'", "Describe specific moments when they showed up for you", "Tell them what their presence has meant to your life", "End with: 'Thank you for being exactly who you are'", "Read it aloud to yourself — notice what comes up"],
    guidance: "You don't have to send this. The act of writing it releases something real inside you."
  },
  // ─── Breathwork ───────────────────────────────────────────────────────────
  {
    id: "breath-release", title: "Breath of Release", description: "A gentle breathing exercise to let go of tension",
    duration: 10, category: "Breathwork", practices: ["breathwork"], forNeeds: ["calm", "release"],
    steps: ["Sit or lie down comfortably", "Close your eyes and notice your natural breath", "Inhale slowly through your nose for 4 counts", "Hold gently for 2 counts", "Exhale through your mouth for 6 counts, releasing tension", "Repeat 8–10 times, letting go more with each exhale", "Return to natural breathing and notice how you feel"],
    guidance: "The extended exhale activates your parasympathetic nervous system, signaling safety to your body."
  },
  {
    id: "box-breathing", title: "Box Breathing", description: "The technique used by Navy SEALs to calm the nervous system",
    duration: 5, category: "Breathwork", practices: ["breathwork"], forNeeds: ["calm", "clarity"],
    steps: ["Sit upright with your feet flat on the floor", "Exhale completely through your mouth", "Inhale through your nose for 4 counts", "Hold your breath for 4 counts", "Exhale through your mouth for 4 counts", "Hold empty for 4 counts", "Repeat 4–6 cycles", "Return to natural breathing and notice the stillness"],
    guidance: "Each side of the 'box' is 4 counts. This simple pattern engages your vagus nerve and interrupts stress loops."
  },
  {
    id: "478-breath", title: "4-7-8 Breathing", description: "Dr. Weil's anti-anxiety breath pattern — a natural tranquilizer",
    duration: 5, category: "Breathwork", practices: ["breathwork"], forNeeds: ["calm", "release"],
    steps: ["Sit with your back straight", "Place the tip of your tongue just behind your upper front teeth", "Exhale completely through your mouth making a whoosh sound", "Close your mouth and inhale through your nose for 4 counts", "Hold your breath for 7 counts", "Exhale completely through your mouth for 8 counts", "Repeat the cycle 3 more times"],
    guidance: "The 7-count hold is what makes this powerful — it forces CO2 to leave slowly, triggering deep relaxation."
  },
  {
    id: "humming-breath", title: "Humming Bee Breath", description: "Ancient pranayama that vibrates the vagus nerve",
    duration: 8, category: "Breathwork", practices: ["breathwork"], forNeeds: ["calm", "connection"],
    steps: ["Sit comfortably with your eyes closed", "Take a deep breath in through your nose", "As you exhale, make a steady humming sound — like a bee", "Feel the vibration in your chest, throat, and head", "Continue for 8–10 breaths", "Sit in silence for 2 minutes afterward", "Notice the stillness that follows the vibration"],
    guidance: "The humming sound directly stimulates the vagus nerve, reducing anxiety and improving heart rate variability."
  },
  // ─── Meditation ───────────────────────────────────────────────────────────
  {
    id: "body-scan", title: "Body Scan Meditation", description: "Connect with your body through mindful awareness",
    duration: 15, category: "Meditation", practices: ["meditation", "mindfulness"], forNeeds: ["calm", "clarity", "connection"],
    steps: ["Lie down or sit comfortably with eyes closed", "Take a few deep breaths to settle", "Bring awareness to the top of your head", "Slowly scan down: forehead, eyes, jaw (release tension)", "Move to neck, shoulders, arms, hands", "Notice chest, belly, lower back", "Scan hips, legs, feet, toes", "Feel your whole body as one — rest here for a moment", "Gently wiggle fingers and toes, open eyes slowly"],
    guidance: "Simply notice without judging. If you find tension, acknowledge it with kindness — don't force it away."
  },
  {
    id: "loving-kindness", title: "Loving Kindness (Metta)", description: "Ancient practice of cultivating unconditional goodwill",
    duration: 12, category: "Meditation", practices: ["meditation"], forNeeds: ["connection", "calm"],
    steps: ["Sit comfortably and close your eyes", "Bring to mind someone you love easily — feel that warmth", "Repeat silently: 'May you be happy. May you be healthy. May you be at peace.'", "Now direct the same wishes to yourself: 'May I be happy. May I be healthy. May I be at peace.'", "Extend to a neutral person (someone you neither like nor dislike)", "Extend to a difficult person — even just a little warmth", "Finally extend to all beings everywhere", "Rest in the field of goodwill you've generated"],
    guidance: "You don't have to feel anything dramatic. Even the intention plants seeds of compassion in the mind."
  },
  {
    id: "open-awareness", title: "Open Awareness Meditation", description: "Let thoughts arise and pass without latching on to any",
    duration: 10, category: "Meditation", practices: ["meditation", "mindfulness"], forNeeds: ["clarity", "calm"],
    steps: ["Sit comfortably and close your eyes", "Rather than focusing on one thing, open your awareness to everything", "Notice sounds without naming them — just hearing", "Notice sensations without moving — just feeling", "Let thoughts appear like clouds passing through sky", "When you notice you've gotten caught in a thought, gently return to open awareness", "Sit here, wide open, for 10 minutes"],
    guidance: "You are the sky, not the weather. This practice reveals the spaciousness that's always present beneath the noise."
  },
  {
    id: "candle-meditation", title: "Candle Gazing (Trataka)", description: "Ancient yogic technique for concentration and clarity",
    duration: 8, category: "Meditation", practices: ["meditation", "mindfulness"], forNeeds: ["clarity", "energy"],
    steps: ["Place a candle at eye level about 2 feet away in a dark room", "Sit comfortably with your spine straight", "Soften your gaze and focus on the flame", "Try not to blink — let tears come naturally if they do", "When your eyes tire, close them and visualize the flame's afterimage", "Open eyes and continue gazing", "After 6–8 minutes, close eyes and sit in stillness for 2 minutes"],
    guidance: "Trataka clears the mind and is said to develop clairvoyance. At minimum, it builds extraordinary focus."
  },
  // ─── Mindfulness ──────────────────────────────────────────────────────────
  {
    id: "mindful-eating", title: "Mindful Meal", description: "Turn eating into a meditative act of presence",
    duration: 20, category: "Mindfulness", practices: ["mindfulness"], forNeeds: ["connection", "calm"],
    steps: ["Choose one meal this week to eat in silence without screens", "Before eating, take three breaths and appreciate what's in front of you", "Notice the colors, textures, and smells before you taste anything", "Take small bites and chew slowly — at least 20 times per bite", "Put your utensil down between each bite", "Notice how flavors change as you chew", "Eat until you feel 80% full — not 100%", "Sit quietly for 2 minutes after finishing"],
    guidance: "Most of us eat without tasting. This practice is a portal into the richness that's always available but rarely noticed."
  },
  {
    id: "single-tasking", title: "Sacred Single-Tasking", description: "Do one thing completely, with your whole attention",
    duration: 30, category: "Mindfulness", practices: ["mindfulness"], forNeeds: ["clarity", "calm"],
    steps: ["Choose one task — something ordinary like washing dishes or writing an email", "Clear your workspace of all other stimuli", "Set a timer for 30 minutes", "Give this one task 100% of your attention", "When your mind wanders to other tasks, gently return", "Notice the quality of your work when you're fully present", "When the timer ends, sit for 2 minutes and notice how you feel"],
    guidance: "Multitasking is a myth — what we actually do is task-switch rapidly, never giving anything our best. This reclaims focus."
  },
  // ─── Yoga & Movement ──────────────────────────────────────────────────────
  {
    id: "morning-yoga", title: "Gentle Morning Yoga", description: "Wake up your body with slow, intentional movement",
    duration: 15, category: "Yoga", practices: ["yoga"], forNeeds: ["energy", "calm"],
    steps: ["Start in child's pose — rest here for 5 breaths", "Move to cat-cow stretches — 5 rounds with breath", "Downward dog — pedal your feet, hold 5 breaths", "Step forward to forward fold — hang loosely", "Roll up slowly to standing", "Gentle side stretches — 3 breaths each side", "Mountain pose — stand tall, breathe deeply", "Set an intention for your day"],
    guidance: "Move slowly and honor what your body needs today. This isn't about performance — it's about waking up gently."
  },
  {
    id: "yoga-nidra", title: "Yoga Nidra (Yogic Sleep)", description: "30 minutes = 2 hours of sleep, they say",
    duration: 20, category: "Yoga", practices: ["yoga", "meditation"], forNeeds: ["calm", "release"],
    steps: ["Lie in savasana (flat on your back)", "Set a sankalpa — a short, positive intention", "Rotate awareness through body parts rapidly as guided: right thumb, index finger, middle finger…", "Experience pairs of opposites: heat/cold, heaviness/lightness", "Visualize rapidly — images without attachment", "Return to your sankalpa", "Slowly begin to externalize awareness", "Roll to your side before sitting up"],
    guidance: "Your brain enters hypnagogic states where deep healing and reprogramming naturally occur. No effort required."
  },
  // ─── Nature ───────────────────────────────────────────────────────────────
  {
    id: "nature-walk", title: "Nature Walk Meditation", description: "Mindful walking in nature to restore your spirit",
    duration: 20, category: "Nature", practices: ["nature", "mindfulness"], forNeeds: ["energy", "connection"],
    steps: ["Find a natural space — park, trail, or tree-lined street", "Before walking, stand still and take 3 deep breaths", "Begin walking slowly, feeling each step", "Notice 5 things you can see (colors, textures, movement)", "Notice 4 things you can hear (near and far)", "Notice 3 things you can feel (air, ground, temperature)", "Continue walking mindfully for remaining time", "End by standing still and expressing silent gratitude"],
    guidance: "Nature has a way of resetting our nervous system. Let the natural world do the work — you only need to be present."
  },
  {
    id: "earthing", title: "Earthing (Grounding)", description: "Direct contact with the earth's surface to restore electrical balance",
    duration: 15, category: "Nature", practices: ["nature", "mindfulness"], forNeeds: ["calm", "energy"],
    steps: ["Find a patch of natural ground — grass, sand, or soil", "Remove your shoes and socks", "Stand, sit, or lie with bare skin touching the earth", "Close your eyes and breathe naturally", "Imagine any stress or tension draining down through your feet into the earth", "Stay connected for at least 15 minutes", "Notice the subtle sense of calm that accumulates"],
    guidance: "Research shows earthing reduces cortisol, inflammation, and improves sleep. It's free, simple, and primal."
  },
  // ─── Affirmations & Visualization ─────────────────────────────────────────
  {
    id: "morning-affirmations", title: "Morning Affirmations", description: "Set the tone for your day with intentional self-talk",
    duration: 5, category: "Affirmations", practices: ["affirmations", "mindfulness"], forNeeds: ["energy", "clarity"],
    steps: ["Stand before a mirror (optional but powerful)", "Take 3 deep breaths to ground yourself", "Speak these or your own: 'I am enough. I am worthy of love and belonging. Today I choose peace.'", "Add one specific affirmation about your current challenge", "Say each one slowly — feel the words, don't rush them", "End with your hand on your heart: 'I've got you.'"],
    guidance: "Your brain responds to your self-talk like a child responds to a parent. Speak to yourself the way a loving parent would."
  },
  {
    id: "future-self-visualization", title: "Future Self Visualization", description: "Meet the version of you who has already figured it out",
    duration: 12, category: "Visualization", practices: ["visualization", "meditation"], forNeeds: ["clarity", "energy"],
    steps: ["Close your eyes and take 5 deep breaths", "Imagine yourself 5 years from now — thriving, aligned, whole", "See where you live, how you move, who surrounds you", "Notice how you feel in this version of your life", "Your future self walks toward you — what do they say?", "What do they want you to know right now?", "Ask: 'What's the one thing I should focus on today?'", "Thank them and slowly return to the present"],
    guidance: "Visualization activates the same neural pathways as actually doing the thing. Your brain doesn't know the difference."
  },
  // ─── Prayer & Devotion ────────────────────────────────────────────────────
  {
    id: "centering-prayer", title: "Centering Prayer", description: "A Christian contemplative practice of resting in God's presence",
    duration: 20, category: "Prayer", practices: ["prayer", "meditation"], forNeeds: ["connection", "calm"],
    steps: ["Choose a sacred word as a symbol of your consent (e.g. God, Peace, Love, Let go)", "Sit comfortably and close your eyes", "Silently introduce your sacred word", "When you notice you're thinking, gently return to the sacred word", "Do not try to have no thoughts — just don't follow them", "At the end of the time, remain in silence for 2 minutes", "Open your eyes slowly"],
    guidance: "This isn't about controlling the mind — it's about repeated acts of surrender. The practice is in the returning."
  },
  {
    id: "prayer-journaling", title: "Prayer Journaling", description: "Write your prayers as honest letters to the divine",
    duration: 15, category: "Prayer", practices: ["prayer", "journaling"], forNeeds: ["connection", "release"],
    steps: ["Open your journal and date the page", "Begin with what's honest: 'Today I'm feeling…'", "Write what you're grateful for, even if small", "Write what you're struggling with — be real", "Write what you're asking for — not just for yourself", "Write what you're surrendering — what you're releasing control over", "Close by writing: 'I trust the process. I'm not alone.'"],
    guidance: "The most powerful prayers are honest ones. This isn't performance — it's a private conversation with something larger than yourself."
  },
  // ─── Evening Practices ────────────────────────────────────────────────────
  {
    id: "evening-reflection", title: "Evening Reflection", description: "Journal prompts to process and release your day",
    duration: 10, category: "Journaling", practices: ["journaling"], forNeeds: ["clarity", "release"],
    steps: ["Find a quiet space with your journal", "Write: What went well today? (2–3 things)", "Write: What challenged me? (be honest, no judgment)", "Write: What did I learn about myself?", "Write: What am I letting go of before sleep?", "Close with one intention for tomorrow"],
    guidance: "This isn't about perfection. Let your thoughts flow freely. The act of writing helps your brain process and release."
  },
  {
    id: "gratitude-review", title: "Three Good Things", description: "Research-backed gratitude practice shown to reduce depression",
    duration: 5, category: "Gratitude", practices: ["gratitude", "journaling"], forNeeds: ["calm", "connection"],
    steps: ["Just before bed, open your journal", "Write three things that went well today — big or small", "For each one, write WHY it went well", "Don't repeat items from previous nights — find new ones", "Read what you wrote before closing the journal", "Sleep with these three things in mind"],
    guidance: "Martin Seligman's research found this practice, done for just one week, produced lasting improvements in happiness and reduced depression for up to 6 months."
  },
  {
    id: "digital-sunset", title: "Digital Sunset", description: "Create a tech-free wind-down window before sleep",
    duration: 60, category: "Mindfulness", practices: ["mindfulness"], forNeeds: ["calm", "release"],
    steps: ["Set a phone alarm for 60 minutes before your target sleep time", "When it goes off, put all screens in another room or on Do Not Disturb", "Dim your lights — blue light suppresses melatonin", "Choose one offline activity: reading, stretching, journaling, or talking to someone", "Take a warm shower or bath if possible — the temperature drop induces sleepiness", "Write tomorrow's top 3 priorities so your brain can let them go", "Do 5 minutes of deep breathing before lying down"],
    guidance: "Your brain needs a transition — not a sudden switch from screen glare to sleeping. This ritual signals the nervous system that safety is here."
  },
  // ─── Body Awareness ────────────────────────────────────────────────────────
  {
    id: "progressive-relaxation", title: "Progressive Muscle Relaxation", description: "Systematically tense and release to melt tension",
    duration: 15, category: "Body Awareness", practices: ["bodyawareness", "meditation"], forNeeds: ["calm", "release"],
    steps: ["Lie flat on your back", "Take three slow breaths", "Clench your feet tightly for 5 seconds — then release completely", "Tense your calves for 5 seconds — release", "Tense your thighs — release", "Squeeze your abdomen — release", "Clench your fists — release", "Shrug your shoulders to your ears — release", "Squeeze your face — release", "Lie in complete relaxation for 5 minutes"],
    guidance: "The contrast between tension and release teaches your body what true relaxation feels like. Many people have forgotten."
  },
  {
    id: "intuitive-movement", title: "Intuitive Movement", description: "Let your body move however it wants — no rules",
    duration: 10, category: "Body Awareness", practices: ["bodyawareness", "yoga"], forNeeds: ["energy", "release"],
    steps: ["Find a private space with room to move", "Put on music that matches your current feeling (or no music)", "Close your eyes and stand still for 30 seconds", "Let your body begin to move however it wants — no choreography", "Follow impulses: stretch, shake, sway, bounce, whatever comes", "If emotion comes up, let it move through — don't suppress", "Slow down naturally as the urge to move decreases", "End by standing still and taking 3 breaths"],
    guidance: "Your body holds wisdom your mind overlooks. This practice is permission to let it speak."
  },
  // ─── Connection ────────────────────────────────────────────────────────────
  {
    id: "acts-of-kindness", title: "Intentional Act of Kindness", description: "Give freely — and let yourself receive the feeling",
    duration: 30, category: "Mindfulness", practices: ["mindfulness"], forNeeds: ["connection", "energy"],
    steps: ["Decide to do one deliberate act of kindness today", "Options: buy a stranger's coffee, write a handwritten note, genuinely compliment someone, help without being asked", "Do it without expecting thanks or recognition", "Afterward, sit for 2 minutes and notice how it feels in your body", "Write in your journal: 'Today I gave… and I noticed…'"],
    guidance: "Neuroscience confirms: giving activates the same reward centers as receiving. Generosity is literally self-care."
  },
];

const HISTORY_KEY = "dw:spiritual_history";
interface PracticeHistory {
  id: string;
  completedAt: number;
}
function loadHistory(): PracticeHistory[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]"); } catch { return []; }
}
function markCompleted(id: string) {
  const h = loadHistory().filter(x => x.id !== id);
  h.unshift({ id, completedAt: Date.now() });
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 200))); } catch {}
}
function getLastCompleted(id: string): number | null {
  const found = loadHistory().find(h => h.id === id);
  return found?.completedAt ?? null;
}
function getSpiritualStreak(): number {
  const history = loadHistory();
  if (history.length === 0) return 0;
  const days = new Set(history.map(h => new Date(h.completedAt).toDateString()));
  let streak = 0;
  const now = new Date();
  for (let i = 0; i < 366; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    if (days.has(d.toDateString())) streak++;
    else if (i > 0) break;
  }
  return streak;
}

function daysSince(ts: number): number {
  return Math.floor((Date.now() - ts) / 86400000);
}

export default function SpiritualPage() {
  usePageMeta("Meditation & Mindfulness", "Cultivate inner peace through guided meditation and spiritual practices.");
  const { toast } = useToast();
  const [profileOpen, setProfileOpen] = useState(false);
  const [spiritualProfile, setSpiritualProfile] = useState<SpiritualProfile | null>(getSpiritualProfile());
  const [hasProfile, setHasProfile] = useState(hasCompletedSpiritualProfile());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [historyVersion, setHistoryVersion] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  // AI Meditation generator
  const [meditationDuration, setMeditationDuration] = useState("5");
  const [meditationFocus, setMeditationFocus] = useState("");
  const [generatedMeditation, setGeneratedMeditation] = useState<string | null>(null);

  // DW Guided Session
  const [dwSession, setDwSession] = useState<{ script: string; title: string; duration: number } | null>(null);

  const startSession = useCallback((script: string, title: string, duration: number) => {
    setDwSession({ script, title, duration });
  }, []);

  const endSession = useCallback(() => {
    ttsService.stop();
    setDwSession(null);
  }, []);

  // Guide a practice with DW's voice
  const guidePracticeMutation = useMutation({
    mutationFn: async (practice: PracticeData) => {
      const profile = getSpiritualProfile();
      const context = profile
        ? `This person's spiritual practices: ${(profile.practices || []).join(", ")}. Their needs: ${(profile.groundingNeeds || []).join(", ")}.`
        : "";
      const prompt = `You are DW, a calm, warm, wise personal meditation guide. Narrate this practice as if you are guiding someone through it right now, in real-time.

Practice: ${practice.title}
Duration: ${practice.duration} minutes
Description: ${practice.description}
Steps:
${practice.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}
${context}

Write a flowing guided narration in second person ("you"). Match the pacing to ${practice.duration} minutes — roughly ${practice.duration * 60} words. Include natural pauses like "Take a breath here..." or "Rest in this for a moment...". Start by settling the listener in. End by gently bringing them back. Be warm, unhurried, and present. Write ONLY the narration — no labels, no headers, no metadata.`;

      const res = await apiRequest("POST", "/api/chat/smart", {
        message: prompt,
        conversationHistory: [],
      });
      const json = await res.json();
      return { script: json.response as string, title: practice.title, duration: practice.duration };
    },
    onSuccess: (data) => startSession(data.script, data.title, data.duration),
    onError: () => toast({ title: "Couldn't generate guided session. Try again.", variant: "destructive" }),
  });

  const handleProfileComplete = () => {
    setProfileOpen(false);
    setSpiritualProfile(getSpiritualProfile());
    setHasProfile(hasCompletedSpiritualProfile());
  };

  const handleComplete = (id: string, title: string) => {
    markCompleted(id);
    setHistoryVersion(v => v + 1);
    toast({ title: `"${title}" complete ✨`, description: "Your streak grows." });
  };

  const meditationMutation = useMutation({
    mutationFn: async () => {
      const profile = getSpiritualProfile();
      const context = profile
        ? `User's spiritual practices: ${(profile.practices || []).join(", ")}. Needs: ${(profile.groundingNeeds || []).join(", ")}.`
        : "";
      const prompt = `Generate a warm, guided ${meditationDuration}-minute meditation${meditationFocus ? ` focused on ${meditationFocus}` : ""}. ${context}

Write it as a flowing guided script that can be read aloud. Include:
- Opening grounding (2 sentences)
- Main body guidance (proportional to duration)
- A closing integration

Use sensory language. Keep pauses natural. Write in second person ("you"). Under 400 words. Tone: warm, calm, unhurried.`;

      const res = await apiRequest("POST", "/api/chat/smart", {
        message: prompt,
        conversationHistory: [],
      });
      const json = await res.json();
      return json.response as string;
    },
    onSuccess: (text) => setGeneratedMeditation(text),
    onError: () => toast({ title: "Couldn't generate meditation. Try again.", variant: "destructive" }),
  });

  const streak = getSpiritualStreak();
  const categories = ["All", ...Array.from(new Set(ALL_PRACTICES.map(p => p.category))).sort()];

  const getPersonalizedPractices = () => {
    if (!spiritualProfile) return [];
    return ALL_PRACTICES.filter(p =>
      p.practices.some(x => spiritualProfile.practices?.includes(x as any)) ||
      p.forNeeds.some(n => spiritualProfile.groundingNeeds?.includes(n as any))
    );
  };

  const filteredPractices = ALL_PRACTICES.filter(p => {
    const catMatch = categoryFilter === "All" || p.category === categoryFilter;
    const searchMatch = !searchQuery || p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase()) || p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return catMatch && searchMatch;
  });

  const personalizedPractices = getPersonalizedPractices();
  const history = loadHistory(); // re-read on historyVersion change
  void historyVersion;

  return (
    <div className="flex flex-col h-full bg-background">
      <PageHeader title="Meditation & Mindfulness" />
      <ScrollArea className="flex-1">
        <div className="p-4 max-w-2xl mx-auto space-y-5 pb-24">

          {/* Streak + Profile row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {streak > 0 && (
                <div className="flex items-center gap-1 bg-orange-500/10 rounded-full px-3 py-1">
                  <Flame className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-bold text-orange-500">{streak}</span>
                  <span className="text-xs text-muted-foreground">day streak</span>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 h-8 text-xs"
              onClick={() => setProfileOpen(true)}
              data-testid="button-open-spiritual-profile"
            >
              <Settings2 className="h-3.5 w-3.5" />
              {hasProfile ? "Edit Profile" : "Set Up Profile"}
            </Button>
          </div>

          {/* Profile card */}
          {hasProfile && spiritualProfile && (
            <Card className="bg-purple-500/5 border-purple-500/20">
              <CardContent className="p-3">
                <div className="flex flex-wrap gap-1.5">
                  {spiritualProfile.practices?.map(p => (
                    <Badge key={p} variant="secondary" className="text-xs gap-1">
                      <Sparkles className="h-2.5 w-2.5" />
                      {PRACTICE_LABELS[p] || p}
                    </Badge>
                  ))}
                  {spiritualProfile.groundingNeeds?.map(n => (
                    <Badge key={n} variant="outline" className="text-xs">
                      Seeking {NEED_LABELS[n] || n}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="practices">
            <TabsList className="w-full">
              <TabsTrigger value="practices" className="flex-1 text-xs">Practices</TabsTrigger>
              <TabsTrigger value="generate" className="flex-1 text-xs">
                <Wand2 className="h-3 w-3 mr-1" />
                AI Meditation
              </TabsTrigger>
            </TabsList>

            {/* ── Practices Tab ── */}
            <TabsContent value="practices" className="space-y-4 mt-4">

              {/* Personalized for you */}
              {hasProfile && personalizedPractices.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Star className="h-3.5 w-3.5 text-yellow-500" />
                    Personalized for You
                  </h3>
                  {personalizedPractices.slice(0, 4).map(p => (
                    <PracticeCard
                      key={p.id}
                      practice={p}
                      expanded={expandedId === p.id}
                      onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
                      onComplete={() => handleComplete(p.id, p.title)}
                      lastCompleted={getLastCompleted(p.id)}
                      onGuide={() => guidePracticeMutation.mutate(p)}
                      guideLoading={guidePracticeMutation.isPending && guidePracticeMutation.variables?.id === p.id}
                    />
                  ))}
                </div>
              )}

              {/* Search + filter */}
              <div className="space-y-2">
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search practices…"
                  className="h-9"
                  data-testid="input-spiritual-search"
                />
                <div className="flex gap-1.5 flex-wrap">
                  {categories.map(cat => (
                    <Button
                      key={cat}
                      variant={categoryFilter === cat ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setCategoryFilter(cat)}
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
              </div>

              {/* All filtered practices */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  {filteredPractices.length} {categoryFilter !== "All" ? categoryFilter : ""} Practice{filteredPractices.length !== 1 ? "s" : ""}
                </h3>
                {filteredPractices.map(p => (
                  <PracticeCard
                    key={p.id}
                    practice={p}
                    expanded={expandedId === p.id}
                    onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
                    onComplete={() => handleComplete(p.id, p.title)}
                    lastCompleted={getLastCompleted(p.id)}
                    onGuide={() => guidePracticeMutation.mutate(p)}
                    guideLoading={guidePracticeMutation.isPending && guidePracticeMutation.variables?.id === p.id}
                  />
                ))}
              </div>

              <MeditationAudioPlayer />
            </TabsContent>

            {/* ── AI Meditation Tab ── */}
            <TabsContent value="generate" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wand2 className="h-4 w-4 text-purple-500" />
                    Generate a Custom Meditation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Duration</Label>
                      <Select value={meditationDuration} onValueChange={setMeditationDuration}>
                        <SelectTrigger className="h-9" data-testid="select-meditation-duration">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["3", "5", "10", "15", "20"].map(d => (
                            <SelectItem key={d} value={d}>{d} minutes</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Focus (optional)</Label>
                      <Input
                        value={meditationFocus}
                        onChange={e => setMeditationFocus(e.target.value)}
                        placeholder="e.g. anxiety, grief, gratitude"
                        className="h-9 text-sm"
                        data-testid="input-meditation-focus"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={() => meditationMutation.mutate()}
                    disabled={meditationMutation.isPending}
                    className="w-full gap-2"
                    data-testid="button-generate-meditation"
                  >
                    {meditationMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
                    ) : (
                      <><Sparkles className="h-4 w-4" /> Generate Meditation</>
                    )}
                  </Button>

                  {generatedMeditation && (
                    <div className="space-y-3">
                      {/* Start DW Session — immersive guided experience */}
                      <Button
                        onClick={() => startSession(
                          generatedMeditation,
                          meditationFocus || `${meditationDuration}-Minute Meditation`,
                          parseInt(meditationDuration)
                        )}
                        className="w-full gap-2 bg-purple-600 hover:bg-purple-700 text-white"
                        data-testid="button-start-dw-session"
                      >
                        <Headphones className="h-4 w-4" />
                        Start DW Guided Session
                      </Button>

                      {/* Script preview */}
                      <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4">
                        <p className="text-xs font-medium text-purple-400 mb-2 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          Your personalized meditation script
                        </p>
                        <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{generatedMeditation}</p>
                      </div>
                      <div className="flex gap-2">
                        <TTSButton
                          text={generatedMeditation}
                          alwaysShow
                          label="Listen (no visuals)"
                          variant="outline"
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => meditationMutation.mutate()}
                          disabled={meditationMutation.isPending}
                        >
                          Regenerate
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-muted/30 border-dashed">
                <CardContent className="p-4 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Quick focuses</p>
                  <div className="flex gap-2 flex-wrap">
                    {["Anxiety relief", "Morning energy", "Sleep preparation", "Grief processing", "Inner child", "Confidence boost", "Letting go", "Self-compassion"].map(f => (
                      <button
                        key={f}
                        onClick={() => setMeditationFocus(f)}
                        className="text-xs px-2.5 py-1 rounded-full border bg-background hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <SpiritualProfileDialog
            open={profileOpen}
            onClose={() => setProfileOpen(false)}
            onComplete={handleProfileComplete}
          />
        </div>
      </ScrollArea>

      {/* DW Guided Meditation Session Overlay */}
      {dwSession && (
        <DWSessionOverlay
          script={dwSession.script}
          title={dwSession.title}
          duration={dwSession.duration}
          onClose={endSession}
        />
      )}
    </div>
  );
}

interface PracticeCardProps {
  practice: PracticeData;
  expanded: boolean;
  lastCompleted: number | null;
  onToggle: () => void;
  onComplete: () => void;
  onGuide?: () => void;
  guideLoading?: boolean;
}

function PracticeCard({ practice, expanded, lastCompleted, onToggle, onComplete, onGuide, guideLoading }: PracticeCardProps) {
  const completedRecently = lastCompleted !== null && daysSince(lastCompleted) === 0;

  return (
    <Card
      className={`transition-all cursor-pointer ${completedRecently ? "border-green-500/30 bg-green-500/5" : ""}`}
      data-testid={`card-practice-${practice.id}`}
      onClick={onToggle}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-medium text-sm">{practice.title}</h3>
              {completedRecently && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{practice.description}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <Clock className="h-2.5 w-2.5" />
                {practice.duration} min
              </span>
              <Badge variant="outline" className="text-[10px] h-4">{practice.category}</Badge>
              {lastCompleted !== null && (
                <span className="text-[10px] text-muted-foreground">
                  {daysSince(lastCompleted) === 0 ? "Done today" : `${daysSince(lastCompleted)}d ago`}
                </span>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 -mt-0.5">
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t space-y-4" onClick={e => e.stopPropagation()}>
            <div className="bg-primary/5 rounded-lg p-3">
              <p className="text-xs italic text-muted-foreground leading-relaxed">{practice.guidance}</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold">Step-by-step</h4>
                <TTSButton
                  text={`${practice.title}. ${practice.guidance} Step by step: ${practice.steps.map((s, i) => `Step ${i + 1}: ${s}`).join('. ')}`}
                  alwaysShow
                  size="sm"
                  variant="ghost"
                  label="Listen"
                />
              </div>
              <ol className="space-y-1.5">
                {practice.steps.map((step, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-xs font-semibold text-primary shrink-0 mt-0.5 w-4">{i + 1}.</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Great for:</span>
              {practice.forNeeds.map(n => (
                <Badge key={n} variant="secondary" className="text-xs">{NEED_LABELS[n] || n}</Badge>
              ))}
            </div>

            {/* DW Guided Session button */}
            {onGuide && (
              <Button
                size="sm"
                variant="outline"
                className="w-full gap-2 border-purple-400/40 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                onClick={onGuide}
                disabled={guideLoading}
                data-testid={`button-guide-practice-${practice.id}`}
              >
                {guideLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> DW is preparing your session…</>
                ) : (
                  <><Headphones className="h-4 w-4" /> Guide me through this with DW</>
                )}
              </Button>
            )}

            <Button
              size="sm"
              variant={completedRecently ? "secondary" : "default"}
              className="w-full gap-2"
              onClick={onComplete}
              data-testid={`button-complete-practice-${practice.id}`}
            >
              {completedRecently ? (
                <><CheckCircle2 className="h-4 w-4" /> Completed Today</>
              ) : (
                <><Play className="h-4 w-4" /> Mark as Complete</>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── DW Guided Meditation Session Overlay ───────────────────────────────────

interface DWSessionOverlayProps {
  script: string;
  title: string;
  duration: number;
  onClose: () => void;
}

function DWSessionOverlay({ script, title, duration, onClose }: DWSessionOverlayProps) {
  const [seconds, setSeconds] = useState(0);
  const [phase, setPhase] = useState<"loading" | "playing" | "done">("loading");
  const [breathLabel, setBreathLabel] = useState("breathe in");

  // Auto-start TTS when session opens
  useEffect(() => {
    setPhase("loading");
    ttsService.speak(script)
      .then(() => setPhase("done"))
      .catch(() => setPhase("done"));

    return () => {
      ttsService.stop();
    };
  }, [script]);

  // Set playing state once audio starts (small delay for UX)
  useEffect(() => {
    const t = setTimeout(() => setPhase(p => p === "loading" ? "playing" : p), 800);
    return () => clearTimeout(t);
  }, []);

  // Session timer
  useEffect(() => {
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Breathing label cycle: inhale 4s / hold 2s / exhale 6s
  useEffect(() => {
    const labels = [
      { label: "breathe in", ms: 4000 },
      { label: "hold", ms: 2000 },
      { label: "breathe out", ms: 6000 },
    ];
    let i = 0;
    let timeoutId: ReturnType<typeof setTimeout>;

    const cycle = () => {
      setBreathLabel(labels[i].label);
      timeoutId = setTimeout(() => {
        i = (i + 1) % labels.length;
        cycle();
      }, labels[i].ms);
    };
    cycle();
    return () => clearTimeout(timeoutId);
  }, []);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-between overflow-hidden select-none"
      style={{ background: "linear-gradient(160deg, #1a0533 0%, #0d0620 40%, #0a1a3a 100%)" }}>

      {/* Breathing animation keyframes */}
      <style>{`
        @keyframes dw-breathe {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.25); opacity: 1; }
        }
        @keyframes dw-pulse-ring {
          0%, 100% { transform: scale(1); opacity: 0.15; }
          50% { transform: scale(1.35); opacity: 0.35; }
        }
        @keyframes dw-orb {
          0%, 100% { transform: scale(1); box-shadow: 0 0 60px 20px rgba(139, 92, 246, 0.3); }
          50% { transform: scale(1.1); box-shadow: 0 0 100px 40px rgba(139, 92, 246, 0.5); }
        }
        @keyframes dw-text-fade {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
      `}</style>

      {/* Top: session title & timer */}
      <div className="w-full flex items-center justify-between px-6 pt-12 pb-4">
        <div>
          <p className="text-white/50 text-xs uppercase tracking-widest font-medium">DW Guided Session</p>
          <p className="text-white/80 text-sm font-light mt-0.5 line-clamp-1">{title}</p>
        </div>
        <div className="text-right">
          <p className="text-white/30 text-xs font-mono">
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </p>
          <p className="text-white/20 text-[10px] mt-0.5">{duration} min session</p>
        </div>
      </div>

      {/* Center: breathing orb */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8">
        <div className="relative flex items-center justify-center">
          {/* Outermost pulse ring */}
          <div
            className="absolute rounded-full border border-purple-400/20"
            style={{
              width: 280, height: 280,
              animation: "dw-pulse-ring 12s ease-in-out infinite",
            }}
          />
          {/* Middle pulse ring */}
          <div
            className="absolute rounded-full border border-purple-400/25"
            style={{
              width: 220, height: 220,
              animation: "dw-pulse-ring 12s ease-in-out infinite 2s",
            }}
          />
          {/* Inner breathing ring */}
          <div
            className="absolute rounded-full border border-purple-500/30"
            style={{
              width: 168, height: 168,
              animation: "dw-breathe 12s ease-in-out infinite",
            }}
          />
          {/* DW Orb */}
          <div
            className="w-36 h-36 rounded-full flex flex-col items-center justify-center relative"
            style={{
              background: "radial-gradient(circle at 40% 35%, rgba(167,139,250,0.5), rgba(109,40,217,0.4))",
              animation: "dw-orb 12s ease-in-out infinite",
            }}
          >
            <p className="text-white text-2xl font-light tracking-wide">DW</p>
            <div className="flex items-center gap-1 mt-1.5">
              {phase === "loading" && <Loader2 className="h-3 w-3 text-white/50 animate-spin" />}
              {phase === "playing" && (
                <span className="flex gap-0.5">
                  {[0, 1, 2].map(i => (
                    <span key={i} className="w-0.5 rounded-full bg-white/60"
                      style={{
                        height: 10 + i * 4,
                        animation: `dw-breathe ${1.2 + i * 0.2}s ease-in-out infinite ${i * 0.15}s`,
                      }} />
                  ))}
                </span>
              )}
              {phase === "done" && <CheckCircle2 className="h-3 w-3 text-green-400/70" />}
            </div>
          </div>
        </div>

        {/* Status text */}
        <div className="text-center space-y-2">
          {phase === "loading" && (
            <p className="text-white/40 text-sm" style={{ animation: "dw-text-fade 2s ease-in-out infinite" }}>
              DW is preparing your session…
            </p>
          )}
          {phase === "playing" && (
            <p className="text-white/60 text-sm font-light" style={{ animation: "dw-text-fade 12s ease-in-out infinite" }}>
              {breathLabel}
            </p>
          )}
          {phase === "done" && (
            <div className="text-center space-y-1">
              <p className="text-white/70 text-sm font-light">Session complete</p>
              <p className="text-white/30 text-xs">Take a moment before returning</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom: tip + end button */}
      <div className="w-full px-6 pb-12 space-y-4 max-w-sm mx-auto">
        {phase === "playing" && (
          <div className="flex items-center gap-2 justify-center">
            <Volume2 className="h-3.5 w-3.5 text-white/30" />
            <p className="text-white/30 text-xs text-center">
              DW's voice is guiding you — close your eyes
            </p>
          </div>
        )}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl border border-white/15 text-white/50 text-sm font-light hover:border-white/30 hover:text-white/70 transition-colors"
          data-testid="button-end-dw-session"
        >
          {phase === "done" ? "Return" : "End Session"}
        </button>
      </div>
    </div>
  );
}
