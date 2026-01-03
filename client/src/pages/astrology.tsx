import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Moon, 
  Sun, 
  Star, 
  Calendar, 
  ChevronRight,
  Sparkles,
  Settings2,
  RefreshCw
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AstrologyNote {
  id: string;
  date: string;
  content: string;
  moonPhase?: string;
}

type ZodiacSystem = "tropical" | "sidereal";

interface PlanetPlacement {
  planet: string;
  sign: string;
  degree: number;
}

interface BirthChart {
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  zodiacSystem: ZodiacSystem;
  sunSign?: string;
  moonSign?: string;
  risingSign?: string;
  placements?: PlanetPlacement[];
}

interface CosmicEvent {
  date: string;
  event: string;
  type: "moon" | "retrograde" | "transit";
  description: string;
}

const NOTES_KEY = "dw_astrology_notes";
const BIRTH_CHART_KEY = "dw_birth_chart";

function getStoredNotes(): AstrologyNote[] {
  try {
    const stored = localStorage.getItem(NOTES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveNote(note: AstrologyNote): void {
  const notes = getStoredNotes();
  notes.unshift(note);
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes.slice(0, 30)));
}

function getBirthChart(): BirthChart | null {
  try {
    const stored = localStorage.getItem(BIRTH_CHART_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveBirthChart(chart: BirthChart): void {
  localStorage.setItem(BIRTH_CHART_KEY, JSON.stringify(chart));
}

function getMoonPhase(): string {
  const phases = ["New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous", "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent"];
  const now = new Date();
  const lunarCycle = 29.53;
  const knownNewMoon = new Date("2024-01-11");
  const daysSinceNew = (now.getTime() - knownNewMoon.getTime()) / (1000 * 60 * 60 * 24);
  const phaseIndex = Math.floor((daysSinceNew % lunarCycle) / (lunarCycle / 8)) % 8;
  return phases[phaseIndex];
}

function getMoonPhaseGuidance(phase: string): string {
  const guidance: Record<string, string> = {
    "New Moon": "A time for new beginnings and setting intentions. Plant seeds for what you want to grow.",
    "Waxing Crescent": "Nurture your intentions. Take small steps forward with focus and determination.",
    "First Quarter": "Time for action and decisions. Face challenges head-on and push through obstacles.",
    "Waxing Gibbous": "Refine and adjust. Trust the process and stay committed to your path.",
    "Full Moon": "Celebration and release. Acknowledge achievements and let go of what no longer serves you.",
    "Waning Gibbous": "Share wisdom and practice gratitude. Reflect on lessons learned.",
    "Last Quarter": "Release and forgive. Clear space for new growth by letting go of the old.",
    "Waning Crescent": "Rest and restore. Prepare for the next cycle with quiet reflection.",
  };
  return guidance[phase] || "Tune into your inner wisdom today.";
}

const ZODIAC_SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];

const AYANAMSA_OFFSET = 24;

function getSunSign(birthDate: string, system: ZodiacSystem = "tropical"): string {
  const date = new Date(birthDate);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  const tropicalSigns = [
    { sign: "Capricorn", start: [12, 22], end: [1, 19] },
    { sign: "Aquarius", start: [1, 20], end: [2, 18] },
    { sign: "Pisces", start: [2, 19], end: [3, 20] },
    { sign: "Aries", start: [3, 21], end: [4, 19] },
    { sign: "Taurus", start: [4, 20], end: [5, 20] },
    { sign: "Gemini", start: [5, 21], end: [6, 20] },
    { sign: "Cancer", start: [6, 21], end: [7, 22] },
    { sign: "Leo", start: [7, 23], end: [8, 22] },
    { sign: "Virgo", start: [8, 23], end: [9, 22] },
    { sign: "Libra", start: [9, 23], end: [10, 22] },
    { sign: "Scorpio", start: [10, 23], end: [11, 21] },
    { sign: "Sagittarius", start: [11, 22], end: [12, 21] },
  ];
  
  let tropicalSign = "Capricorn";
  for (const { sign, start, end } of tropicalSigns) {
    if (
      (month === start[0] && day >= start[1]) ||
      (month === end[0] && day <= end[1])
    ) {
      tropicalSign = sign;
      break;
    }
  }
  
  if (system === "sidereal") {
    const siderealSigns = [
      { sign: "Capricorn", start: [1, 15], end: [2, 12] },
      { sign: "Aquarius", start: [2, 13], end: [3, 14] },
      { sign: "Pisces", start: [3, 15], end: [4, 13] },
      { sign: "Aries", start: [4, 14], end: [5, 14] },
      { sign: "Taurus", start: [5, 15], end: [6, 14] },
      { sign: "Gemini", start: [6, 15], end: [7, 16] },
      { sign: "Cancer", start: [7, 17], end: [8, 16] },
      { sign: "Leo", start: [8, 17], end: [9, 16] },
      { sign: "Virgo", start: [9, 17], end: [10, 16] },
      { sign: "Libra", start: [10, 17], end: [11, 15] },
      { sign: "Scorpio", start: [11, 16], end: [12, 15] },
      { sign: "Sagittarius", start: [12, 16], end: [1, 14] },
    ];
    
    for (const { sign, start, end } of siderealSigns) {
      if (start[0] > end[0]) {
        if ((month === start[0] && day >= start[1]) || (month === end[0] && day <= end[1])) {
          return sign;
        }
      } else if ((month === start[0] && day >= start[1]) || (month === end[0] && day <= end[1])) {
        return sign;
      }
    }
    return "Sagittarius";
  }
  
  return tropicalSign;
}

function calculatePlacements(birthDate: string, birthTime: string, system: ZodiacSystem): PlanetPlacement[] {
  const date = new Date(birthDate);
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const hour = birthTime ? parseInt(birthTime.split(":")[0]) : 12;
  
  const getSign = (degree: number): string => {
    let adjustedDegree = degree;
    if (system === "sidereal") {
      adjustedDegree = (degree - AYANAMSA_OFFSET + 360) % 360;
    }
    return ZODIAC_SIGNS[Math.floor(adjustedDegree / 30) % 12];
  };
  
  const sunDegree = ((dayOfYear / 365.25) * 360 + 280) % 360;
  
  const moonCycle = 27.3;
  const moonDegree = ((dayOfYear / moonCycle) * 360 + hour * 0.5) % 360;
  
  const risingDegree = (hour * 15 + (dayOfYear / 365.25) * 360) % 360;
  
  const mercuryDegree = (sunDegree + 15 + (dayOfYear % 88) * 4) % 360;
  const venusDegree = (sunDegree - 20 + (dayOfYear % 225) * 1.6) % 360;
  const marsDegree = ((dayOfYear / 687) * 360 + 45) % 360;
  const jupiterDegree = ((dayOfYear / 4333) * 360 + 120) % 360;
  const saturnDegree = ((dayOfYear / 10759) * 360 + 200) % 360;
  
  return [
    { planet: "Sun", sign: getSign(sunDegree), degree: Math.round(sunDegree % 30) },
    { planet: "Moon", sign: getSign(moonDegree), degree: Math.round(moonDegree % 30) },
    { planet: "Rising", sign: getSign(risingDegree), degree: Math.round(risingDegree % 30) },
    { planet: "Mercury", sign: getSign(mercuryDegree), degree: Math.round(mercuryDegree % 30) },
    { planet: "Venus", sign: getSign(venusDegree), degree: Math.round(venusDegree % 30) },
    { planet: "Mars", sign: getSign(marsDegree), degree: Math.round(marsDegree % 30) },
    { planet: "Jupiter", sign: getSign(jupiterDegree), degree: Math.round(jupiterDegree % 30) },
    { planet: "Saturn", sign: getSign(saturnDegree), degree: Math.round(saturnDegree % 30) },
  ];
}

function getUpcomingCosmicEvents(): CosmicEvent[] {
  const now = new Date();
  const events: CosmicEvent[] = [];
  
  const lunarCycle = 29.53;
  const knownNewMoon = new Date("2024-01-11");
  const daysSinceNew = (now.getTime() - knownNewMoon.getTime()) / (1000 * 60 * 60 * 24);
  const daysInCurrentCycle = daysSinceNew % lunarCycle;
  
  const nextNewMoon = new Date(now.getTime() + (lunarCycle - daysInCurrentCycle) * 24 * 60 * 60 * 1000);
  const nextFullMoon = new Date(now.getTime() + ((lunarCycle / 2) - daysInCurrentCycle + (daysInCurrentCycle > lunarCycle / 2 ? lunarCycle : 0)) * 24 * 60 * 60 * 1000);
  
  events.push({
    date: nextNewMoon.toISOString().split("T")[0],
    event: "New Moon",
    type: "moon",
    description: "Set intentions and plant seeds for new beginnings"
  });
  
  events.push({
    date: nextFullMoon.toISOString().split("T")[0],
    event: "Full Moon",
    type: "moon",
    description: "Harvest what you've grown and release what no longer serves"
  });
  
  const retrogradeStart = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
  events.push({
    date: retrogradeStart.toISOString().split("T")[0],
    event: "Mercury Retrograde",
    type: "retrograde",
    description: "Review, reflect, and revisit. Avoid major decisions if possible"
  });
  
  return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, { 
    weekday: "short", 
    month: "short", 
    day: "numeric" 
  });
}

const ZODIAC_SYMBOLS: Record<string, string> = {
  "Aries": "♈",
  "Taurus": "♉",
  "Gemini": "♊",
  "Cancer": "♋",
  "Leo": "♌",
  "Virgo": "♍",
  "Libra": "♎",
  "Scorpio": "♏",
  "Sagittarius": "♐",
  "Capricorn": "♑",
  "Aquarius": "♒",
  "Pisces": "♓"
};

const PLANET_SYMBOLS: Record<string, string> = {
  "Sun": "☉",
  "Moon": "☽",
  "Rising": "Asc",
  "Mercury": "☿",
  "Venus": "♀",
  "Mars": "♂",
  "Jupiter": "♃",
  "Saturn": "♄"
};

const ZODIAC_COLORS: Record<string, string> = {
  "Aries": "#ef4444",
  "Taurus": "#22c55e",
  "Gemini": "#eab308",
  "Cancer": "#6366f1",
  "Leo": "#f97316",
  "Virgo": "#84cc16",
  "Libra": "#ec4899",
  "Scorpio": "#dc2626",
  "Sagittarius": "#8b5cf6",
  "Capricorn": "#64748b",
  "Aquarius": "#06b6d4",
  "Pisces": "#a855f7"
};

function BirthChartWheel({ placements }: { placements: PlanetPlacement[] }) {
  const size = 280;
  const center = size / 2;
  const outerRadius = center - 10;
  const middleRadius = outerRadius - 30;
  const innerRadius = middleRadius - 40;
  
  const getSignIndex = (sign: string): number => ZODIAC_SIGNS.indexOf(sign);
  
  const getAngleForPlacement = (sign: string, degree: number): number => {
    const signIndex = getSignIndex(sign);
    const signStartAngle = signIndex * 30;
    return signStartAngle + degree - 90;
  };
  
  const polarToCartesian = (angle: number, radius: number): { x: number; y: number } => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(rad),
      y: center + radius * Math.sin(rad)
    };
  };
  
  return (
    <div className="flex justify-center py-4" data-testid="birth-chart-wheel">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        <circle 
          cx={center} 
          cy={center} 
          r={outerRadius} 
          fill="none" 
          stroke="currentColor" 
          strokeOpacity={0.2} 
          strokeWidth={1} 
        />
        <circle 
          cx={center} 
          cy={center} 
          r={middleRadius} 
          fill="none" 
          stroke="currentColor" 
          strokeOpacity={0.2} 
          strokeWidth={1} 
        />
        <circle 
          cx={center} 
          cy={center} 
          r={innerRadius} 
          fill="none" 
          stroke="currentColor" 
          strokeOpacity={0.1} 
          strokeWidth={1} 
        />
        
        {ZODIAC_SIGNS.map((sign, i) => {
          const startAngle = i * 30 - 90;
          const endAngle = (i + 1) * 30 - 90;
          const midAngle = startAngle + 15;
          
          const start = polarToCartesian(startAngle, outerRadius);
          const end = polarToCartesian(endAngle, outerRadius);
          const innerStart = polarToCartesian(startAngle, middleRadius);
          
          const symbolPos = polarToCartesian(midAngle, (outerRadius + middleRadius) / 2);
          
          return (
            <g key={sign}>
              <line 
                x1={innerStart.x} 
                y1={innerStart.y} 
                x2={start.x} 
                y2={start.y} 
                stroke="currentColor" 
                strokeOpacity={0.15} 
                strokeWidth={1} 
              />
              <text 
                x={symbolPos.x} 
                y={symbolPos.y} 
                textAnchor="middle" 
                dominantBaseline="central"
                fill={ZODIAC_COLORS[sign]}
                fontSize="14"
                fontWeight="bold"
              >
                {ZODIAC_SYMBOLS[sign]}
              </text>
            </g>
          );
        })}
        
        {placements.map((placement, i) => {
          const angle = getAngleForPlacement(placement.sign, placement.degree);
          const pos = polarToCartesian(angle, (middleRadius + innerRadius) / 2);
          const labelPos = polarToCartesian(angle, innerRadius - 15);
          
          return (
            <g key={placement.planet}>
              <circle 
                cx={pos.x} 
                cy={pos.y} 
                r={12} 
                fill={ZODIAC_COLORS[placement.sign]}
                fillOpacity={0.2}
                stroke={ZODIAC_COLORS[placement.sign]}
                strokeWidth={1.5}
              />
              <text 
                x={pos.x} 
                y={pos.y} 
                textAnchor="middle" 
                dominantBaseline="central"
                fontSize={placement.planet === "Rising" ? "8" : "12"}
                fontWeight="bold"
                fill="currentColor"
              >
                {PLANET_SYMBOLS[placement.planet]}
              </text>
            </g>
          );
        })}
        
        <circle 
          cx={center} 
          cy={center} 
          r={8} 
          fill="currentColor" 
          fillOpacity={0.1} 
        />
      </svg>
    </div>
  );
}

function calculateLifePathNumber(birthDate: string): number {
  if (!birthDate) return 0;
  
  const digits = birthDate.replace(/-/g, "").split("").map(Number);
  
  let sum = digits.reduce((a, b) => a + b, 0);
  
  while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
    sum = sum.toString().split("").map(Number).reduce((a, b) => a + b, 0);
  }
  
  return sum;
}

const LIFE_PATH_MEANINGS: Record<number, { title: string; description: string; traits: string[]; challenges: string[] }> = {
  1: {
    title: "The Leader",
    description: "You are here to pioneer new paths and develop independence. Your journey is about learning to trust yourself and lead with confidence.",
    traits: ["Independent", "Original", "Ambitious", "Innovative", "Self-reliant"],
    challenges: ["Stubbornness", "Isolation", "Ego dominance"]
  },
  2: {
    title: "The Peacemaker",
    description: "Your purpose involves partnership, diplomacy, and bringing harmony. You're here to cooperate, support, and balance.",
    traits: ["Diplomatic", "Sensitive", "Cooperative", "Patient", "Intuitive"],
    challenges: ["Over-sensitivity", "Codependency", "Indecision"]
  },
  3: {
    title: "The Creative",
    description: "Self-expression and creativity are your gifts. You're here to inspire others through your joy, artistry, and communication.",
    traits: ["Creative", "Expressive", "Optimistic", "Social", "Inspiring"],
    challenges: ["Scattered energy", "Self-doubt", "Superficiality"]
  },
  4: {
    title: "The Builder",
    description: "You create lasting foundations through discipline and hard work. Your path involves structure, order, and practical achievement.",
    traits: ["Reliable", "Practical", "Disciplined", "Organized", "Patient"],
    challenges: ["Rigidity", "Workaholic tendencies", "Resistance to change"]
  },
  5: {
    title: "The Adventurer",
    description: "Freedom and change are your essence. You're here to experience life fully and help others embrace transformation.",
    traits: ["Adventurous", "Versatile", "Curious", "Adaptable", "Magnetic"],
    challenges: ["Restlessness", "Overindulgence", "Lack of commitment"]
  },
  6: {
    title: "The Nurturer",
    description: "Love, responsibility, and service define your path. You're here to create harmony in home and community.",
    traits: ["Nurturing", "Responsible", "Loving", "Protective", "Harmonious"],
    challenges: ["Over-giving", "Perfectionism", "Self-sacrifice"]
  },
  7: {
    title: "The Seeker",
    description: "Wisdom and spiritual understanding are your calling. You're here to discover deeper truths and share your insights.",
    traits: ["Analytical", "Intuitive", "Wise", "Introspective", "Spiritual"],
    challenges: ["Isolation", "Skepticism", "Disconnection from emotions"]
  },
  8: {
    title: "The Powerhouse",
    description: "Material and spiritual abundance are your domain. You're here to master the balance of power, money, and purpose.",
    traits: ["Ambitious", "Authoritative", "Successful", "Resilient", "Visionary"],
    challenges: ["Materialism", "Control issues", "Workaholism"]
  },
  9: {
    title: "The Humanitarian",
    description: "Compassion and universal love guide your purpose. You're here to serve humanity and let go of the personal.",
    traits: ["Compassionate", "Wise", "Generous", "Idealistic", "Creative"],
    challenges: ["Detachment", "Martyrdom", "Unrealistic expectations"]
  },
  11: {
    title: "The Intuitive (Master Number)",
    description: "You carry heightened intuition and spiritual awareness. Your path involves inspiring others through your vision.",
    traits: ["Visionary", "Intuitive", "Inspiring", "Sensitive", "Illuminating"],
    challenges: ["Nervous energy", "Self-doubt", "Overwhelm"]
  },
  22: {
    title: "The Master Builder (Master Number)",
    description: "You have the potential to turn dreams into reality on a grand scale. Your purpose involves building something lasting for humanity.",
    traits: ["Visionary", "Practical", "Powerful", "Disciplined", "Transformative"],
    challenges: ["Overwhelm", "Self-imposed pressure", "Unrealistic goals"]
  },
  33: {
    title: "The Master Teacher (Master Number)",
    description: "You embody unconditional love and spiritual teaching. Your path involves uplifting humanity through compassion.",
    traits: ["Loving", "Inspiring", "Healing", "Selfless", "Spiritual"],
    challenges: ["Self-neglect", "Martyrdom", "Extreme sensitivity"]
  },
};

const HOROSCOPE_READINGS: Record<string, { daily: string; weekly: string; monthly: string }> = {
  Aries: {
    daily: "Your fiery energy is well-aspected today. Channel your natural leadership into a creative project or meaningful conversation.",
    weekly: "This week invites you to balance action with reflection. The universe supports bold moves, but not impulsive ones.",
    monthly: "A month of transformation awaits. Old patterns are ready to release, making space for authentic self-expression."
  },
  Taurus: {
    daily: "Comfort and stability call to you today. Honor your need for groundedness while remaining open to small changes.",
    weekly: "Financial and material matters come into focus. Trust your practical wisdom while staying flexible.",
    monthly: "Relationships deepen this month. Your steady presence is a gift to those around you."
  },
  Gemini: {
    daily: "Your curious mind is extra active. Follow the threads of conversation and connection that light you up.",
    weekly: "Communication flows smoothly. Express your truth with both wit and heart.",
    monthly: "Learning opportunities abound. Whether formal study or life lessons, you're absorbing wisdom."
  },
  Cancer: {
    daily: "Emotional tides may be strong. Create a nurturing space for yourself and honor what arises.",
    weekly: "Home and family themes are highlighted. Tend to your inner and outer sanctuaries.",
    monthly: "Deep healing is available. Trust your intuition as it guides you toward emotional freedom."
  },
  Leo: {
    daily: "Your natural radiance shines bright. Share your warmth generously while also receiving appreciation.",
    weekly: "Creative expression is your medicine this week. Play, create, and let your heart lead.",
    monthly: "Recognition for your efforts is coming. Stay authentic rather than seeking validation."
  },
  Virgo: {
    daily: "Details matter today, but don't lose sight of the bigger picture. Balance precision with perspective.",
    weekly: "Health and wellness routines benefit from attention. Small adjustments create lasting change.",
    monthly: "Service to others brings fulfillment, but remember to serve yourself too."
  },
  Libra: {
    daily: "Harmony in relationships is your focus. Seek balance without abandoning your own needs.",
    weekly: "Beauty and aesthetics inspire you. Surround yourself with what pleases your senses.",
    monthly: "Partnerships of all kinds are evolving. Honest communication creates deeper connection."
  },
  Scorpio: {
    daily: "Intensity is your ally today. Channel your depth into transformation rather than control.",
    weekly: "Hidden truths may surface. Face them with courage and compassion.",
    monthly: "Powerful regeneration is available. Let go of what's ready to die so new life can emerge."
  },
  Sagittarius: {
    daily: "Adventure calls, even in small ways. Expand your horizons through learning or exploration.",
    weekly: "Philosophy and meaning-making are highlighted. What beliefs are ready to evolve?",
    monthly: "Travel or higher education themes arise. Follow your quest for truth and wisdom."
  },
  Capricorn: {
    daily: "Your ambition is well-supported. Take practical steps toward long-term goals with patience.",
    weekly: "Career and public life demand attention. Lead with integrity and persistence.",
    monthly: "Structure and discipline serve your highest vision. Build foundations that will last."
  },
  Aquarius: {
    daily: "Your unique perspective is needed. Share your innovative ideas without attachment to outcomes.",
    weekly: "Community and collaboration themes arise. Find your tribe and contribute your gifts.",
    monthly: "Revolutionary changes are brewing. Trust your vision even when others don't understand."
  },
  Pisces: {
    daily: "Dreams and intuition are heightened. Pay attention to symbols and synchronicities.",
    weekly: "Spiritual practices nourish your soul. Make time for meditation, art, or sacred rest.",
    monthly: "Compassion flows through you. Set healthy boundaries while remaining open-hearted."
  },
};

export default function AstrologyPage() {
  const [notes, setNotes] = useState<AstrologyNote[]>(getStoredNotes);
  const [newNote, setNewNote] = useState("");
  const [birthChart, setBirthChart] = useState<BirthChart | null>(getBirthChart);
  const [chartDialogOpen, setChartDialogOpen] = useState(false);
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [zodiacSystem, setZodiacSystem] = useState<ZodiacSystem>(birthChart?.zodiacSystem || "tropical");
  
  const handleOpenDialog = () => {
    const savedChart = getBirthChart();
    setBirthDate(savedChart?.birthDate || "");
    setBirthTime(savedChart?.birthTime || "");
    setBirthPlace(savedChart?.birthPlace || "");
    setChartDialogOpen(true);
  };
  
  const handleSystemChange = (system: ZodiacSystem) => {
    setZodiacSystem(system);
    if (birthChart) {
      const placements = calculatePlacements(birthChart.birthDate, birthChart.birthTime, system);
      const updatedChart: BirthChart = {
        ...birthChart,
        zodiacSystem: system,
        sunSign: getSunSign(birthChart.birthDate, system),
        placements,
      };
      saveBirthChart(updatedChart);
      setBirthChart(updatedChart);
    }
  };
  
  const moonPhase = getMoonPhase();
  const moonGuidance = getMoonPhaseGuidance(moonPhase);
  const today = new Date().toISOString().split("T")[0];
  const cosmicEvents = getUpcomingCosmicEvents();
  
  const sunSign = birthChart?.birthDate ? getSunSign(birthChart.birthDate) : null;
  const horoscope = sunSign ? HOROSCOPE_READINGS[sunSign] : null;

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    
    const note: AstrologyNote = {
      id: Date.now().toString(),
      date: today,
      content: newNote.trim(),
      moonPhase,
    };
    
    saveNote(note);
    setNotes(getStoredNotes());
    setNewNote("");
  };
  
  const handleSaveBirthChart = () => {
    if (!birthDate) return;
    
    const placements = calculatePlacements(birthDate, birthTime, zodiacSystem);
    const chart: BirthChart = {
      birthDate,
      birthTime,
      birthPlace,
      zodiacSystem,
      sunSign: getSunSign(birthDate, zodiacSystem),
      placements,
    };
    
    saveBirthChart(chart);
    setBirthChart(chart);
    setChartDialogOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Astrology" />

      <ScrollArea className="h-[calc(100vh-57px)]">
        <main className="p-4 max-w-2xl mx-auto space-y-6 pb-8">
          
          {!birthChart ? (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-12 h-12 mx-auto bg-violet-500/10 rounded-full flex items-center justify-center">
                  <Star className="w-6 h-6 text-violet-500" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Create Your Birth Chart</h3>
                  <p className="text-sm text-muted-foreground">
                    Enter your birth details for personalized horoscope readings
                  </p>
                </div>
                <Button onClick={handleOpenDialog} data-testid="button-create-birth-chart">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Enter Birth Details
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    Your Chart
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleOpenDialog}
                    data-testid="button-edit-birth-chart"
                  >
                    <Settings2 className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">System:</span>
                    <div className="flex gap-1">
                      <Button
                        variant={zodiacSystem === "tropical" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleSystemChange("tropical")}
                        data-testid="button-tropical"
                      >
                        Western
                      </Button>
                      <Button
                        variant={zodiacSystem === "sidereal" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleSystemChange("sidereal")}
                        data-testid="button-sidereal"
                      >
                        Vedic
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  {zodiacSystem === "tropical" 
                    ? "Western/Tropical: Based on seasons and the vernal equinox"
                    : "Vedic/Sidereal: Based on fixed star positions (Lahiri Ayanamsa)"
                  }
                </div>
                
                {birthChart.placements && birthChart.placements.length > 0 && (
                  <BirthChartWheel placements={birthChart.placements} />
                )}
                
                {birthChart.placements && birthChart.placements.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {birthChart.placements.map((placement) => (
                      <div 
                        key={placement.planet} 
                        className="flex items-center justify-between p-2 bg-muted/30 rounded-md"
                      >
                        <span className="text-sm font-medium">{placement.planet}</span>
                        <Badge variant="secondary" className="text-xs">
                          {placement.sign} {placement.degree}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-sm">
                      <Sun className="w-3 h-3 mr-1" />
                      {sunSign}
                    </Badge>
                  </div>
                )}
                
                {birthChart.birthTime && (
                  <p className="text-sm text-muted-foreground">
                    Born at {birthChart.birthTime}
                  </p>
                )}
                {birthChart.birthPlace && (
                  <p className="text-sm text-muted-foreground">
                    {birthChart.birthPlace}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
          
          {birthChart?.birthDate && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Numerology
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(() => {
                  const lifePathNumber = calculateLifePathNumber(birthChart.birthDate);
                  const meaning = LIFE_PATH_MEANINGS[lifePathNumber];
                  
                  if (!meaning) return null;
                  
                  return (
                    <>
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-2xl font-display font-bold text-primary">{lifePathNumber}</span>
                        </div>
                        <div>
                          <h3 className="font-semibold">{meaning.title}</h3>
                          <p className="text-sm text-muted-foreground">Life Path Number</p>
                        </div>
                      </div>
                      
                      <p className="text-sm leading-relaxed">{meaning.description}</p>
                      
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Core Traits</p>
                        <div className="flex flex-wrap gap-1">
                          {meaning.traits.map(trait => (
                            <Badge key={trait} variant="secondary" className="text-xs">
                              {trait}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Growth Areas</p>
                        <div className="flex flex-wrap gap-1">
                          {meaning.challenges.map(challenge => (
                            <Badge key={challenge} variant="outline" className="text-xs">
                              {challenge}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Moon className="h-4 w-4" />
                Current Moon Phase
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-display" data-testid="text-moon-phase">{moonPhase}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {moonGuidance}
              </p>
            </CardContent>
          </Card>
          
          {horoscope && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h2 className="font-semibold">{sunSign} Horoscope</h2>
              </div>
              
              <Tabs defaultValue="daily" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="daily" className="flex-1" data-testid="tab-daily-horoscope">
                    Today
                  </TabsTrigger>
                  <TabsTrigger value="weekly" className="flex-1" data-testid="tab-weekly-horoscope">
                    This Week
                  </TabsTrigger>
                  <TabsTrigger value="monthly" className="flex-1" data-testid="tab-monthly-horoscope">
                    This Month
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="daily" className="mt-3">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm leading-relaxed">{horoscope.daily}</p>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="weekly" className="mt-3">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm leading-relaxed">{horoscope.weekly}</p>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="monthly" className="mt-3">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm leading-relaxed">{horoscope.monthly}</p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
          
          <div className="space-y-3">
            <h2 className="font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Cosmic Calendar
            </h2>
            <div className="space-y-2">
              {cosmicEvents.map((event, idx) => (
                <Card 
                  key={idx} 
                  className="hover-elevate"
                  data-testid={`card-cosmic-event-${idx}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          event.type === "moon" ? "bg-violet-500/10" :
                          event.type === "retrograde" ? "bg-amber-500/10" : "bg-blue-500/10"
                        }`}>
                          {event.type === "moon" ? (
                            <Moon className={`w-5 h-5 ${
                              event.event.includes("Full") ? "text-amber-400" : "text-violet-500"
                            }`} />
                          ) : event.type === "retrograde" ? (
                            <RefreshCw className="w-5 h-5 text-amber-500" />
                          ) : (
                            <Star className="w-5 h-5 text-blue-500" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium text-sm">{event.event}</h3>
                          <p className="text-xs text-muted-foreground mb-1">
                            {formatDate(event.date)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {event.description}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Star className="h-4 w-4" />
                Cosmic Journal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="What are you noticing today? Any cosmic vibes, synchronicities, or intuitive hits..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="resize-none"
                rows={3}
                data-testid="input-astrology-note"
              />
              <Button 
                onClick={handleAddNote} 
                disabled={!newNote.trim()}
                data-testid="button-add-note"
              >
                Save Note
              </Button>
            </CardContent>
          </Card>

          {notes.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Sun className="h-4 w-4" />
                Past Notes
              </h2>
              {notes.map((note) => (
                <Card key={note.id} className="bg-muted/30">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <span>{formatDate(note.date)}</span>
                      {note.moonPhase && (
                        <>
                          <span>·</span>
                          <span>{note.moonPhase}</span>
                        </>
                      )}
                    </div>
                    <p className="text-sm" data-testid={`text-note-${note.id}`}>{note.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </ScrollArea>
      
      <Dialog open={chartDialogOpen} onOpenChange={setChartDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Birth Chart Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="birthDate">Birth Date</Label>
              <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                data-testid="input-birth-date"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="birthTime">Birth Time (optional)</Label>
              <Input
                id="birthTime"
                type="time"
                value={birthTime}
                onChange={(e) => setBirthTime(e.target.value)}
                placeholder="For more accurate readings"
                data-testid="input-birth-time"
              />
              <p className="text-xs text-muted-foreground">
                For more accurate rising sign and moon sign calculations
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="birthPlace">Birth Place (optional)</Label>
              <Input
                id="birthPlace"
                type="text"
                value={birthPlace}
                onChange={(e) => setBirthPlace(e.target.value)}
                placeholder="City, Country"
                data-testid="input-birth-place"
              />
            </div>
            
            <Button 
              onClick={handleSaveBirthChart} 
              disabled={!birthDate}
              className="w-full"
              data-testid="button-save-birth-chart"
            >
              Save Birth Chart
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
