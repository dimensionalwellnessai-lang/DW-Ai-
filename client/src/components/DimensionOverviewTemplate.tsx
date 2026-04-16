/**
 * DimensionOverviewTemplate
 *
 * Standardized full-page template for a life dimension overview.
 * Renders a consistent structure across Body, Mind, Time, Purpose, Money,
 * Relationships, Environment, and Identity dimensions.
 *
 * Sections:
 *  1. Header (icon, name, status, switch state)
 *  2. DW Reading Card (insight about the dimension)
 *  3. Overview / current state
 *  4. Friction Points (what holds this dimension back)
 *  5. Opportunities
 *  6. Recommended Actions
 *  7. Micro-journeys / Guided Paths
 *  8. Progress Indicators
 *  9. Orb CTA — "Talk to DW about [dimension]"
 */

import { useLocation } from "wouter";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/page-header";
import { DWOrb } from "@/components/dw-orb";
import {
  Zap,
  Brain,
  Clock,
  Compass,
  Wallet,
  Users,
  Home,
  Sprout,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  TrendingUp,
  MapPin,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import { Link } from "wouter";
import { getSingleSwitchData, type SwitchId, type SwitchStatus } from "@/lib/switch-storage";
import { cn } from "@/lib/utils";

// ── Dimension configuration ────────────────────────────────────────────────────

interface MicroJourney {
  title: string;
  description: string;
  path: string;
  icon: LucideIcon;
}

interface RecommendedAction {
  title: string;
  subtitle: string;
  path: string;
  icon: LucideIcon;
}

interface DimensionConfig {
  id: SwitchId;
  name: string;
  subtitle: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  glowColor: string;
  /** What this dimension controls in your life */
  controls: string;
  /** Why this dimension matters */
  whyMatters: string;
  /** Core perspective statement */
  perspective: string;
  /** What happens when this dimension is ignored */
  frictionPoints: string[];
  /** Opportunities for growth */
  opportunities: string[];
  /** Recommended actions */
  recommendedActions: RecommendedAction[];
  /** Guided micro-journeys */
  microJourneys: MicroJourney[];
  /** Reading card insight (adapts to switch status) */
  readings: Record<SwitchStatus | "default", string>;
}

const DIMENSION_CONFIGS: Record<SwitchId, DimensionConfig> = {
  body: {
    id: "body",
    name: "Body",
    subtitle: "Physical Energy",
    icon: Zap,
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    glowColor: "shadow-red-500/20",
    controls: "Stamina, mood, confidence, and physical resilience.",
    whyMatters:
      "Your body is the battery your life runs on. When energy is low, everything feels harder — even things you care about.",
    perspective: "Energy comes before motivation.",
    frictionPoints: [
      "Inconsistent sleep disrupts recovery and mood",
      "Skipping movement leads to low energy and mental fog",
      "Neglecting nourishment tanks stamina and focus",
      "Ignoring rest signals invites burnout",
    ],
    opportunities: [
      "A short daily walk can shift energy within days",
      "Sleep consistency improves mood more than sleep duration",
      "Protein-rich meals fuel steadier energy throughout the day",
      "Micro-recovery windows (5–10 min) reduce cumulative fatigue",
    ],
    recommendedActions: [
      {
        title: "Log a workout",
        subtitle: "Track today's movement",
        path: "/workout",
        icon: Zap,
      },
      {
        title: "Review habits",
        subtitle: "Check your consistency",
        path: "/habits",
        icon: TrendingUp,
      },
      {
        title: "Plan meals",
        subtitle: "Support your energy",
        path: "/meal-prep",
        icon: BookOpen,
      },
    ],
    microJourneys: [
      {
        title: "Morning Activation",
        description: "A 5-minute ritual to prime your body for the day",
        path: "/workout",
        icon: Zap,
      },
      {
        title: "Recovery Check-In",
        description: "Notice how your body feels and what it needs",
        path: "/talk?topic=Body%20recovery%20check-in",
        icon: Brain,
      },
      {
        title: "Nourishment Scan",
        description: "Plan meals that match your energy goals",
        path: "/meal-prep",
        icon: BookOpen,
      },
    ],
    readings: {
      off: "Your Body switch hasn't been activated yet. Physical energy is the foundation everything else runs on — even small, consistent actions here create momentum across your whole life.",
      flickering:
        "You're starting to build a rhythm with Body. Consistency matters more than intensity right now. Show up even on the low-energy days — that's where the switch really trains.",
      stable:
        "Your Body dimension is holding steady. You've built a working routine. Now notice what's sustaining it and protect those anchors — they're your energy infrastructure.",
      powered:
        "Your Body switch is powered. Physical energy is flowing — you're showing up consistently and it's compounding. This is the state where everything else in your life gets easier.",
      default:
        "Your body is your operating system. How you move, rest, and nourish yourself shapes every other dimension of your life.",
    },
  },
  mind: {
    id: "mind",
    name: "Mind",
    subtitle: "Mental & Emotional Clarity",
    icon: Brain,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    glowColor: "shadow-purple-500/20",
    controls: "Thought patterns, emotional regulation, stress response.",
    whyMatters:
      "Not every thought is true — but unexamined thoughts run your life.",
    perspective: "I can notice my thoughts without becoming them.",
    frictionPoints: [
      "Rumination amplifies problems beyond their actual size",
      "Unprocessed emotions surface as reactivity and fatigue",
      "Mental clutter blocks clear decision-making",
      "Perfectionism and self-criticism drain available energy",
    ],
    opportunities: [
      "Naming an emotion reduces its intensity within 90 seconds",
      "Brief journaling creates distance from overwhelming thoughts",
      "Identifying cognitive distortions weakens their grip",
      "Micro-pauses throughout the day reset the nervous system",
    ],
    recommendedActions: [
      {
        title: "Talk it out",
        subtitle: "Process with DW",
        path: "/talk",
        icon: Brain,
      },
      {
        title: "Journal",
        subtitle: "Capture your thoughts",
        path: "/journal",
        icon: BookOpen,
      },
      {
        title: "Weekly check-in",
        subtitle: "Reflect on your week",
        path: "/weekly-checkin",
        icon: TrendingUp,
      },
    ],
    microJourneys: [
      {
        title: "Pause & Name",
        description: "Identify what you're feeling right now",
        path: "/talk?topic=Name%20what%20I%27m%20feeling",
        icon: Brain,
      },
      {
        title: "Thought Unpack",
        description: "Untangle a thought that keeps coming back",
        path: "/talk?topic=Thought%20I%20keep%20having",
        icon: Sparkles,
      },
      {
        title: "Stress Release",
        description: "Work through pressure with DW guidance",
        path: "/talk?topic=Stress%20I%27m%20carrying",
        icon: MapPin,
      },
    ],
    readings: {
      off: "Your Mind switch hasn't been activated yet. Mental clarity isn't about thinking less — it's about thinking better. When you start training here, even small shifts in awareness create significant relief.",
      flickering:
        "You're beginning to tune into your mental and emotional patterns. Awareness itself is the first tool. Notice what thoughts repeat — they're pointing you somewhere important.",
      stable:
        "Your Mind dimension is stable. You have enough self-awareness to catch yourself when things spiral. Keep practising the pause — it compounds over time.",
      powered:
        "Your Mind switch is powered. You're navigating thoughts and emotions with clarity. This is what regulated looks like — not absence of challenge, but the capacity to move through it.",
      default:
        "Your mind shapes how every experience lands. Developing clarity here changes how you respond to everything else in your life.",
    },
  },
  time: {
    id: "time",
    name: "Time",
    subtitle: "Structure & Flow",
    icon: Clock,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    glowColor: "shadow-blue-500/20",
    controls: "Focus, follow-through, balance, and overwhelm.",
    whyMatters: "Time isn't the issue — structure is.",
    perspective: "A plan should support my life, not trap it.",
    frictionPoints: [
      "Over-scheduling leads to constant catch-up mode",
      "No clear priorities means everything feels urgent",
      "Context-switching drains focus faster than work itself",
      "Ignoring energy rhythms creates poor timing decisions",
    ],
    opportunities: [
      "Time-blocking even 2 hours a day creates a felt sense of control",
      "Energy-based scheduling outperforms clock-based scheduling",
      "Single-tasking restores focus in 20 minutes",
      "Weekly planning reduces daily decision fatigue",
    ],
    recommendedActions: [
      {
        title: "Daily schedule",
        subtitle: "Plan today with intention",
        path: "/daily-schedule",
        icon: Clock,
      },
      {
        title: "Weekly review",
        subtitle: "Reflect and reset",
        path: "/weekly-review",
        icon: TrendingUp,
      },
      {
        title: "Routines",
        subtitle: "Build sustainable rhythms",
        path: "/routines",
        icon: Sparkles,
      },
    ],
    microJourneys: [
      {
        title: "Priority Reset",
        description: "Identify your one most important thing today",
        path: "/talk?topic=Time%20priorities%20today",
        icon: Compass,
      },
      {
        title: "Schedule Builder",
        description: "Block your day around energy, not just tasks",
        path: "/daily-schedule",
        icon: Clock,
      },
      {
        title: "Overwhelm Release",
        description: "Untangle a backlogged to-do list",
        path: "/talk?topic=Feeling%20overwhelmed%20with%20time",
        icon: Brain,
      },
    ],
    readings: {
      off: "Your Time switch hasn't been activated yet. Most time problems aren't about having too little time — they're about unclear structure. Small rhythms, consistently applied, create a felt sense of spaciousness.",
      flickering:
        "You're starting to work with your time more intentionally. Consistency here is more valuable than perfection. Even a rough plan beats no plan.",
      stable:
        "Your Time dimension is holding steady. You have enough structure to feel oriented. Now look at what's working — those are the rhythms worth protecting.",
      powered:
        "Your Time switch is powered. You're moving through your days with clarity and intention. This is structured freedom — the plan serves you, not the other way around.",
      default:
        "Time is the container your life moves through. How you structure it determines what you actually get to experience.",
    },
  },
  purpose: {
    id: "purpose",
    name: "Purpose",
    subtitle: "Direction & Meaning",
    icon: Compass,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    glowColor: "shadow-amber-500/20",
    controls: "Motivation, fulfillment, long-term direction.",
    whyMatters: "Without direction, effort feels empty.",
    perspective: "I don't need the full map — just the next aligned step.",
    frictionPoints: [
      "Comparison pulls you off your own path",
      "Vague goals create vague motivation",
      "Living by others' definitions of success creates quiet resentment",
      "Busyness without intention feels like stagnation",
    ],
    opportunities: [
      "Clarifying 3 core values creates a reliable decision filter",
      "Small acts aligned with purpose compound meaning over time",
      "Linking daily tasks to a bigger 'why' reduces resistance",
      "Regular reflection surfaces drift before it becomes disconnection",
    ],
    recommendedActions: [
      {
        title: "Goals",
        subtitle: "Set meaningful intentions",
        path: "/goals",
        icon: Compass,
      },
      {
        title: "Life Blueprint",
        subtitle: "Define your direction",
        path: "/life-blueprint",
        icon: MapPin,
      },
      {
        title: "Weekly check-in",
        subtitle: "Align actions with values",
        path: "/weekly-checkin",
        icon: TrendingUp,
      },
    ],
    microJourneys: [
      {
        title: "Values Clarity",
        description: "Name what actually matters most to you",
        path: "/talk?topic=Clarifying%20my%20values",
        icon: Compass,
      },
      {
        title: "Next Aligned Step",
        description: "Find the most purposeful action for this week",
        path: "/talk?topic=Next%20step%20aligned%20with%20purpose",
        icon: Sparkles,
      },
      {
        title: "Meaning Check",
        description: "Reconnect with why you do what you do",
        path: "/talk?topic=Finding%20meaning%20in%20my%20work",
        icon: BookOpen,
      },
    ],
    readings: {
      off: "Your Purpose switch hasn't been activated yet. Direction isn't found — it's built through small, intentional choices. You don't need full clarity to take the next aligned step.",
      flickering:
        "You're beginning to orient toward meaning. Even uncertain movement toward your values is progress. Trust the direction more than the destination.",
      stable:
        "Your Purpose dimension is stable. You have enough direction to stay oriented. Keep connecting your daily actions to the bigger 'why' — that's where motivation lives.",
      powered:
        "Your Purpose switch is powered. You're living with intention and your actions reflect your values. This is what alignment feels like from the inside.",
      default:
        "Purpose is the compass that makes effort feel meaningful. Without it, even success can feel empty.",
    },
  },
  money: {
    id: "money",
    name: "Money",
    subtitle: "Stability & Choice",
    icon: Wallet,
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    glowColor: "shadow-green-500/20",
    controls: "Financial security, stress levels, and life options.",
    whyMatters:
      "Financial stress is one of the most pervasive background stressors — even when it's invisible.",
    perspective: "Money is a tool for the life I actually want.",
    frictionPoints: [
      "Avoidance of financial reality keeps anxiety high",
      "Spending without intention creates guilt and regret",
      "Unclear financial goals lead to a feeling of never being 'ahead'",
      "Conflating self-worth with net worth distorts decisions",
    ],
    opportunities: [
      "A simple spending audit reveals leaks without restriction",
      "One financial goal with a date increases saving behaviour",
      "Automating a small amount removes willpower from the equation",
      "Naming your financial anxiety reduces its ambient power",
    ],
    recommendedActions: [
      {
        title: "Finances",
        subtitle: "Review your financial health",
        path: "/finances",
        icon: Wallet,
      },
      {
        title: "Talk about money",
        subtitle: "Process financial stress",
        path: "/talk?topic=Money%20and%20finances",
        icon: Brain,
      },
      {
        title: "Goals",
        subtitle: "Set a financial intention",
        path: "/goals",
        icon: TrendingUp,
      },
    ],
    microJourneys: [
      {
        title: "Financial Check-In",
        description: "Look at where your money actually went",
        path: "/finances",
        icon: Wallet,
      },
      {
        title: "Money Story",
        description: "Examine your relationship with money",
        path: "/talk?topic=My%20relationship%20with%20money",
        icon: BookOpen,
      },
      {
        title: "Next Financial Move",
        description: "Identify the one action that would reduce stress",
        path: "/talk?topic=Next%20best%20financial%20move",
        icon: Sparkles,
      },
    ],
    readings: {
      off: "Your Money switch hasn't been activated yet. Financial wellness isn't about having more — it's about having enough clarity to feel safe. Small acts of awareness here create outsized relief.",
      flickering:
        "You're starting to engage with your financial reality. Awareness before action. Notice your patterns without judgment — that's the first step toward change.",
      stable:
        "Your Money dimension is stable. You have a working relationship with your finances. Now look at what you want to build — security, freedom, or both.",
      powered:
        "Your Money switch is powered. You're engaging with your finances with clarity and intention. Money is serving your life, not driving your anxiety.",
      default:
        "Money shapes your options and your stress. Getting clear here creates a quieter background to everything else.",
    },
  },
  relationships: {
    id: "relationships",
    name: "Relationships",
    subtitle: "Connection & Support",
    icon: Users,
    color: "text-pink-400",
    bgColor: "bg-pink-500/10",
    glowColor: "shadow-pink-500/20",
    controls: "Support networks, intimacy, belonging, and energy.",
    whyMatters:
      "Loneliness is as harmful as smoking. Connection is a fundamental human need, not a luxury.",
    perspective: "I can be deeply connected and deeply myself.",
    frictionPoints: [
      "Passive maintenance lets important relationships slowly drift",
      "People-pleasing erodes authenticity and breeds resentment",
      "Isolation amplifies every other life stressor",
      "Unclear boundaries create repeated friction and exhaustion",
    ],
    opportunities: [
      "One meaningful interaction per week compounds connection over months",
      "Named boundaries create more honest relationships",
      "Expressing a need clearly is more connecting than suppressing it",
      "Reconnecting with dormant relationships is often easier than it seems",
    ],
    recommendedActions: [
      {
        title: "Talk it out",
        subtitle: "Process a relationship",
        path: "/talk?topic=A%20relationship%20in%20my%20life",
        icon: Brain,
      },
      {
        title: "Journal",
        subtitle: "Reflect on your connections",
        path: "/journal",
        icon: BookOpen,
      },
    ],
    microJourneys: [
      {
        title: "Connection Inventory",
        description: "Who in your life feels important right now?",
        path: "/talk?topic=Relationships%20that%20matter%20to%20me",
        icon: Users,
      },
      {
        title: "Boundary Clarity",
        description: "Name a boundary you've been avoiding",
        path: "/talk?topic=A%20boundary%20I%20need%20to%20set",
        icon: Sparkles,
      },
      {
        title: "Reach Out",
        description: "Identify someone to reconnect with",
        path: "/talk?topic=Someone%20I%20want%20to%20reconnect%20with",
        icon: MapPin,
      },
    ],
    readings: {
      off: "Your Relationships switch hasn't been activated yet. Connection isn't just nice to have — it's structurally important to your wellbeing. Even one intentional relationship action this week matters.",
      flickering:
        "You're starting to engage with your relationship patterns. Notice who energises you and who depletes you — that data is useful, not judgmental.",
      stable:
        "Your Relationships dimension is stable. You have meaningful connections in your life. Now notice what nourishes them and what erodes them.",
      powered:
        "Your Relationships switch is powered. You're showing up in your relationships with intention and authenticity. Connection is active, not just existing.",
      default:
        "Relationships are where life's meaning is mostly made. How you show up in connection shapes everything.",
    },
  },
  environment: {
    id: "environment",
    name: "Environment",
    subtitle: "Space & Surroundings",
    icon: Home,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    glowColor: "shadow-cyan-500/20",
    controls: "Focus, calm, creativity, and energy.",
    whyMatters:
      "Your environment is always working on you. The question is whether it's working for you.",
    perspective: "My environment is an extension of my intentions.",
    frictionPoints: [
      "Cluttered space creates low-grade, persistent mental noise",
      "A chaotic home environment extends work stress into rest time",
      "Lack of natural light and movement in daily spaces drains energy",
      "Environments designed for others' needs rarely serve yours",
    ],
    opportunities: [
      "One cleared surface creates immediate cognitive relief",
      "Intentional ambient sound (nature, music) improves focus",
      "Light and air quality have measurable effects on mood",
      "Creating one 'anchor space' for focus work reduces friction",
    ],
    recommendedActions: [
      {
        title: "Routines",
        subtitle: "Maintain your environment",
        path: "/routines",
        icon: Home,
      },
      {
        title: "Talk about your space",
        subtitle: "Process environmental friction",
        path: "/talk?topic=My%20environment%20and%20how%20it%20affects%20me",
        icon: Brain,
      },
      {
        title: "Daily schedule",
        subtitle: "Plan environment resets",
        path: "/daily-schedule",
        icon: Clock,
      },
    ],
    microJourneys: [
      {
        title: "Space Audit",
        description: "Identify what in your space is draining vs. fuelling you",
        path: "/talk?topic=My%20physical%20space%20and%20energy",
        icon: Home,
      },
      {
        title: "10-Minute Reset",
        description: "Clear one area and notice the mental shift",
        path: "/routines",
        icon: Sparkles,
      },
      {
        title: "Environment Design",
        description: "Intentionally set up one space for a specific purpose",
        path: "/talk?topic=Designing%20my%20environment%20for%20focus",
        icon: MapPin,
      },
    ],
    readings: {
      off: "Your Environment switch hasn't been activated yet. Your surroundings are constantly shaping your internal state. Small environmental changes create immediate, felt shifts in how you think and feel.",
      flickering:
        "You're starting to notice how your environment affects you. That awareness is everything. Now look at one thing you could change this week.",
      stable:
        "Your Environment dimension is stable. Your space is working reasonably well for you. Now identify what you want to optimise — focus, calm, or creativity.",
      powered:
        "Your Environment switch is powered. Your space is intentionally set up to support the life you're building. Environment and intention are aligned.",
      default:
        "Your environment is always acting on you. Designing it intentionally means your surroundings work with you, not against you.",
    },
  },
  identity: {
    id: "identity",
    name: "Identity",
    subtitle: "Self-Image & Growth",
    icon: Sprout,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    glowColor: "shadow-emerald-500/20",
    controls: "Self-belief, adaptability, and long-term resilience.",
    whyMatters:
      "You live up to — or down to — the story you tell about yourself.",
    perspective: "I am becoming, not fixed.",
    frictionPoints: [
      "Fixed self-narratives limit what feels possible",
      "Identity tied entirely to roles (parent, professional) creates fragility",
      "Comparison erodes the unique value of your own path",
      "Avoiding self-reflection keeps outdated stories running",
    ],
    opportunities: [
      "Naming the identity you're growing into creates a pull toward it",
      "Evidence journaling rewires what you believe is possible",
      "Separating behaviour from character reduces shame-based motivation",
      "Regular reflection reveals how much you've actually changed",
    ],
    recommendedActions: [
      {
        title: "Journal",
        subtitle: "Reflect on who you're becoming",
        path: "/journal",
        icon: BookOpen,
      },
      {
        title: "Values profile",
        subtitle: "Ground your identity in values",
        path: "/values-rules-profile",
        icon: Compass,
      },
      {
        title: "Talk about identity",
        subtitle: "Explore your self-story with DW",
        path: "/talk?topic=Who%20I%20am%20and%20who%20I%27m%20becoming",
        icon: Brain,
      },
    ],
    microJourneys: [
      {
        title: "Identity Inventory",
        description: "Name the roles and stories that define you right now",
        path: "/talk?topic=My%20current%20identity%20and%20self-story",
        icon: Sprout,
      },
      {
        title: "Becoming Statement",
        description: "Write one sentence about who you're growing into",
        path: "/journal",
        icon: Sparkles,
      },
      {
        title: "Evidence Review",
        description: "Find proof that you're already changing",
        path: "/talk?topic=Evidence%20of%20my%20growth",
        icon: TrendingUp,
      },
    ],
    readings: {
      off: "Your Identity switch hasn't been activated yet. Self-belief isn't a personality trait — it's built through evidence, reflection, and small acts of becoming. Starting here changes how all other dimensions feel.",
      flickering:
        "You're starting to look at your self-story more honestly. That takes courage. Notice which narratives feel tight — those are the ones ready to be updated.",
      stable:
        "Your Identity dimension is stable. You have a working relationship with who you are. Now explore where you want to grow — not to fix yourself, but to expand.",
      powered:
        "Your Identity switch is powered. You know who you are and who you're becoming. You're living from identity, not circumstance.",
      default:
        "Identity is the lens through which everything else is interpreted. Clarity here changes how you show up in every other dimension.",
    },
  },
};

// ── Status config ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  SwitchStatus,
  { label: string; color: string; bg: string; progress: number }
> = {
  off: { label: "Not started", color: "text-muted-foreground", bg: "bg-muted/50", progress: 0 },
  flickering: { label: "Building", color: "text-yellow-400", bg: "bg-yellow-500/10", progress: 33 },
  stable: { label: "Stable", color: "text-blue-400", bg: "bg-blue-500/10", progress: 66 },
  powered: { label: "Powered", color: "text-emerald-400", bg: "bg-emerald-500/10", progress: 100 },
};

// ── DW Reading Card ────────────────────────────────────────────────────────────

interface DWReadingCardProps {
  dimensionName: string;
  reading: string;
  status: SwitchStatus;
  color: string;
  bgColor: string;
}

function DWReadingCard({ dimensionName, reading, status, color, bgColor }: DWReadingCardProps) {
  const statusConfig = STATUS_CONFIG[status];
  return (
    <Card
      className={cn("border-border/40", bgColor, "bg-opacity-50")}
      data-testid="dw-reading-card"
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <DWOrb size={24} state="idle" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            DW Reading · {dimensionName}
          </span>
          <Badge
            className={cn("ml-auto text-[10px] h-4 px-1.5", statusConfig.bg, statusConfig.color, "border-0")}
          >
            {statusConfig.label}
          </Badge>
        </div>
        <p className="text-sm text-foreground/90 leading-relaxed">{reading}</p>
      </CardContent>
    </Card>
  );
}

// ── Section: Friction Points ───────────────────────────────────────────────────

function FrictionSection({
  frictionPoints,
  color,
}: {
  frictionPoints: string[];
  color: string;
}) {
  return (
    <Card className="border-border/30" data-testid="section-friction">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <AlertTriangle className={cn("h-4 w-4", color)} />
          Friction Points
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {frictionPoints.map((point, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className={cn("mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0", color.replace("text-", "bg-"))} />
            <p className="text-sm text-muted-foreground">{point}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ── Section: Opportunities ─────────────────────────────────────────────────────

function OpportunitiesSection({
  opportunities,
  color,
}: {
  opportunities: string[];
  color: string;
}) {
  return (
    <Card className="border-border/30" data-testid="section-opportunities">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Sparkles className={cn("h-4 w-4", color)} />
          Opportunities
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {opportunities.map((opp, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className={cn("mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0", color.replace("text-", "bg-"))} />
            <p className="text-sm text-foreground/80">{opp}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ── Section: Recommended Actions ──────────────────────────────────────────────

function RecommendedActionsSection({
  actions,
  bgColor,
  color,
}: {
  actions: RecommendedAction[];
  bgColor: string;
  color: string;
}) {
  return (
    <div data-testid="section-recommended-actions">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <TrendingUp className={cn("h-4 w-4", color)} />
        Recommended Actions
      </h3>
      <div className="space-y-2">
        {actions.map((action, i) => {
          const Icon = action.icon;
          return (
            <Link key={i} href={action.path}>
              <Card
                className="border-border/30 hover:border-border/60 cursor-pointer transition-colors"
                data-testid={`action-${i}`}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", bgColor)}>
                    <Icon className={cn("h-4 w-4", color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{action.title}</p>
                    <p className="text-xs text-muted-foreground">{action.subtitle}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ── Section: Micro-journeys ────────────────────────────────────────────────────

function MicroJourneysSection({
  journeys,
  bgColor,
  color,
}: {
  journeys: MicroJourney[];
  bgColor: string;
  color: string;
}) {
  return (
    <div data-testid="section-micro-journeys">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <MapPin className={cn("h-4 w-4", color)} />
        Guided Paths
      </h3>
      <div className="space-y-2">
        {journeys.map((journey, i) => {
          const Icon = journey.icon;
          return (
            <Link key={i} href={journey.path}>
              <Card
                className="border-border/30 hover:border-border/60 cursor-pointer transition-colors"
                data-testid={`journey-${i}`}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", bgColor)}>
                    <Icon className={cn("h-4 w-4", color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{journey.title}</p>
                    <p className="text-xs text-muted-foreground">{journey.description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ── Section: Progress Indicators ──────────────────────────────────────────────

interface ProgressSectionProps {
  switchId: SwitchId;
  status: SwitchStatus;
  checkIns: number;
  streakDays: number;
  color: string;
  bgColor: string;
}

function ProgressSection({
  switchId,
  status,
  checkIns,
  streakDays,
  color,
  bgColor,
}: ProgressSectionProps) {
  const statusConfig = STATUS_CONFIG[status];

  return (
    <Card className="border-border/30" data-testid="section-progress">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className={cn("h-4 w-4", color)} />
          Switch State
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        <div className="flex items-center gap-3">
          <div className={cn("px-2.5 py-1 rounded-full text-xs font-medium", statusConfig.bg, statusConfig.color)}>
            {statusConfig.label}
          </div>
          <div className="flex-1">
            <Progress
              value={statusConfig.progress}
              className="h-1.5"
              data-testid="switch-progress-bar"
            />
          </div>
          <span className="text-xs text-muted-foreground">{statusConfig.progress}%</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className={cn("p-3 rounded-lg", bgColor, "text-center")}>
            <p className="text-xl font-bold text-foreground" data-testid="check-ins-count">
              {checkIns}
            </p>
            <p className="text-xs text-muted-foreground">Check-ins</p>
          </div>
          <div className={cn("p-3 rounded-lg", bgColor, "text-center")}>
            <p className="text-xl font-bold text-foreground" data-testid="streak-days">
              {streakDays}
            </p>
            <p className="text-xs text-muted-foreground">Day streak</p>
          </div>
        </div>

        <Link href={`/switch/${switchId}`}>
          <Button
            variant="outline"
            className="w-full"
            data-testid="button-train-switch"
          >
            Train This Switch
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

// ── Orb CTA ────────────────────────────────────────────────────────────────────

function OrbCTA({ dimensionName, bgColor, color }: { dimensionName: string; bgColor: string; color: string }) {
  const [, navigate] = useLocation();
  const topic = `Talk to DW about my ${dimensionName} dimension`;

  return (
    <Card
      className={cn("border-border/40", bgColor, "bg-opacity-30")}
      data-testid="orb-cta"
    >
      <CardContent className="p-5 flex flex-col items-center gap-4 text-center">
        <DWOrb
          size={52}
          state="suggestion"
          onTap={() => navigate(`/talk?topic=${encodeURIComponent(topic)}`)}
          label={`Talk with DW about ${dimensionName}`}
        />
        <div>
          <p className="text-sm font-medium text-foreground">
            Talk to DW about {dimensionName}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            DW can help you explore, process, and act on what's happening in this dimension.
          </p>
        </div>
        <Button
          className="w-full"
          onClick={() => navigate(`/talk?topic=${encodeURIComponent(topic)}`)}
          data-testid="button-talk-dw"
        >
          <DWOrb size={16} state="idle" className="mr-2" />
          Start Conversation
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Main Template ──────────────────────────────────────────────────────────────

export interface DimensionOverviewTemplateProps {
  dimensionId: SwitchId;
}

export function DimensionOverviewTemplate({ dimensionId }: DimensionOverviewTemplateProps) {
  const config = DIMENSION_CONFIGS[dimensionId];
  const switchData = getSingleSwitchData(dimensionId);
  const status = switchData?.status ?? "off";
  const checkIns = switchData?.checkIns ?? 0;
  const streakDays = switchData?.streakDays ?? 0;

  const reading = config.readings[status] ?? config.readings.default;
  const Icon = config.icon;
  const statusConfig = STATUS_CONFIG[status];

  return (
    <div className="flex flex-col h-full bg-background gradient-bg" data-testid={`dimension-overview-${dimensionId}`}>
      <PageHeader title={config.name} />

      <ScrollArea className="flex-1">
        <div className="p-4 pb-28 max-w-lg mx-auto space-y-5">

          {/* ── Hero ── */}
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0",
                config.bgColor,
                "shadow-lg",
                config.glowColor,
              )}
              data-testid="dimension-hero-icon"
            >
              <Icon className={cn("w-7 h-7", config.color)} />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground" data-testid="dimension-title">
                {config.name}
              </h2>
              <p className="text-sm text-muted-foreground">{config.subtitle}</p>
            </div>
            <Badge
              className={cn("text-xs", statusConfig.bg, statusConfig.color, "border-0")}
              data-testid="dimension-status-badge"
            >
              {statusConfig.label}
            </Badge>
          </div>

          {/* ── Core perspective ── */}
          <Card className={cn("border-border/30", config.bgColor)} data-testid="dimension-perspective">
            <CardContent className="p-4">
              <p className={cn("text-sm font-medium italic", config.color)}>
                "{config.perspective}"
              </p>
              <p className="text-xs text-muted-foreground mt-1.5">{config.whyMatters}</p>
            </CardContent>
          </Card>

          {/* ── DW Reading Card ── */}
          <DWReadingCard
            dimensionName={config.name}
            reading={reading}
            status={status}
            color={config.color}
            bgColor={config.bgColor}
          />

          {/* ── Progress / Switch State ── */}
          <ProgressSection
            switchId={config.id}
            status={status}
            checkIns={checkIns}
            streakDays={streakDays}
            color={config.color}
            bgColor={config.bgColor}
          />

          {/* ── Friction Points ── */}
          <FrictionSection
            frictionPoints={config.frictionPoints}
            color={config.color}
          />

          {/* ── Opportunities ── */}
          <OpportunitiesSection
            opportunities={config.opportunities}
            color={config.color}
          />

          {/* ── Recommended Actions ── */}
          <RecommendedActionsSection
            actions={config.recommendedActions}
            bgColor={config.bgColor}
            color={config.color}
          />

          {/* ── Micro-journeys ── */}
          <MicroJourneysSection
            journeys={config.microJourneys}
            bgColor={config.bgColor}
            color={config.color}
          />

          {/* ── Orb CTA ── */}
          <OrbCTA
            dimensionName={config.name}
            bgColor={config.bgColor}
            color={config.color}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
