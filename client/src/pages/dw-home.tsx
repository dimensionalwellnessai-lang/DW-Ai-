import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Zap,
  Brain,
  Clock,
  Compass,
  Wallet,
  Users,
  Home,
  Sprout,
  Play,
  RefreshCw,
  Bookmark,
  ChevronRight,
  Sparkles,
  Battery,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  TrendingUp,
  FileText,
  Gem,
  Eye,
  Radio,
  Map,
  Lock,
  MessageCircle,
} from "lucide-react";
import { getSwitchData, type SwitchId, type SwitchStatus } from "@/lib/switch-storage";
import { getUserSignals, updateEnergyLevel, updateTimeBand, deriveRecommendedSwitch, deriveMode, type EnergyLevel } from "@/lib/user-signals";
import { PLAN_LIBRARY, type TimeBand } from "@/config/plan-library";
import { SWITCH_COLORS } from "@/lib/switch-colors";
import { useElevationPlan } from "@/hooks/use-elevation-plan";
import { isFeatureEnabled } from "@/config/featureFlags";
import { isPlanReviewDue } from "@/hooks/use-weekly-review";
import { usePageMeta } from "@/hooks/use-page-meta";

const SWITCH_ICONS: Record<SwitchId, typeof Zap> = {
  body: Zap,
  mind: Brain,
  time: Clock,
  purpose: Compass,
  money: Wallet,
  relationships: Users,
  environment: Home,
  identity: Sprout,
};

const SWITCH_LABELS: Record<SwitchId, string> = {
  body: "Body",
  mind: "Mind",
  time: "Time",
  purpose: "Purpose",
  money: "Money",
  relationships: "Relationships",
  environment: "Environment",
  identity: "Identity",
};

const STATUS_LABELS: Record<SwitchStatus, string> = {
  off: "Off",
  flickering: "Flickering",
  stable: "Stable",
  powered: "Powered",
};

const ENERGY_OPTIONS: { value: EnergyLevel; label: string; icon: typeof Battery }[] = [
  { value: "low", label: "Low", icon: BatteryLow },
  { value: "medium", label: "Medium", icon: BatteryMedium },
  { value: "high", label: "High", icon: BatteryFull },
];

const TIME_OPTIONS: { value: TimeBand; label: string }[] = [
  { value: "tiny", label: "10 min" },
  { value: "small", label: "20-30 min" },
  { value: "medium", label: "45-60 min" },
  { value: "large", label: "90+ min" },
];

// ─── Mirror Moment prompts (rotate daily) ────────────────────────────────────
const MIRROR_PROMPTS = [
  "What version of yourself are you pretending to be that doesn't actually fit you anymore?",
  "What's one belief you hold that would collapse your whole identity if it turned out to be wrong?",
  "If your current habits played out for 5 years uninterrupted — are you okay with who that makes you?",
  "What emotion are you most skilled at hiding — even from yourself?",
  "Name something you want deeply but never say out loud. What would change if you said it?",
  "What chapter of your life ended that you're still trying to continue?",
  "Where are you working hard on something that secretly doesn't matter to you?",
  "What's the hardest truth someone close to you could say about you — and would they be right?",
  "What would you do differently if you knew nobody would judge you for it?",
  "What comfort are you protecting that's actually keeping you small?",
  "Who in your life brings out a version of you that you don't love?",
  "What's a rule you follow that you never consciously chose?",
  "Where do you feel most like yourself — and why is that place rare?",
  "What would your 16-year-old self think of who you've become?",
  "What recurring feeling are you interpreting as a problem that might actually be a signal?",
  "What part of your life are you tolerating instead of transforming?",
  "If you could redesign your mornings from scratch, what's the first thing you'd remove?",
  "What do you keep starting that you already know you'll stop?",
  "Whose approval are you still chasing that you'll never actually get?",
  "What would happen to your stress levels if you stopped explaining yourself to people?",
  "What do you do well that you've somehow convinced yourself isn't impressive?",
  "If your energy were a bank account, what's draining it without your permission?",
  "What story about your past are you still using to justify your present?",
];

// ─── Discover topics (rotate weekly) ─────────────────────────────────────────
const DISCOVER_TOPICS = [
  { label: "Ultradian rhythms", tag: "performance", q: "Tell me about ultradian rhythms and how I can use them to work with my natural energy cycles." },
  { label: "Identity-based habits", tag: "growth", q: "Explain identity-based habit building — how does becoming someone vs. doing something change everything?" },
  { label: "Cortisol & morning light", tag: "body", q: "What does morning sunlight actually do to my cortisol and why does it matter for my day?" },
  { label: "The 5% edge", tag: "mindset", q: "What is the 5% edge principle and how does compounding apply to daily improvement?" },
  { label: "Nervous system reset", tag: "calm", q: "How do I reset my nervous system when I'm in fight-or-flight mode? Give me practical tools." },
  { label: "Social wealth", tag: "relationships", q: "What does research say about the impact of relationships on longevity and success?" },
  { label: "Decision fatigue", tag: "mind", q: "How does decision fatigue work and what can I do to protect my best decisions?" },
  { label: "Emotional vocabulary", tag: "self", q: "Why does having a larger emotional vocabulary make you more resilient — and how do I expand mine?" },
  { label: "Environment design", tag: "environment", q: "How can I use environment design to make my goals inevitable instead of requiring willpower?" },
  { label: "Sleep debt math", tag: "recovery", q: "What is sleep debt, can it actually be repaid, and what's the minimum viable sleep I need?" },
  { label: "The identity gap", tag: "purpose", q: "What is the identity gap and how do I close the distance between who I am and who I want to become?" },
  { label: "Money & emotion", tag: "money", q: "What are the hidden emotional patterns that drive most of my money decisions?" },
  { label: "Somatic grounding", tag: "body", q: "What is somatic grounding and how do I use my body to regulate my emotional state?" },
  { label: "Purpose vs. passion", tag: "purpose", q: "Why is 'follow your passion' bad advice — and what should I do instead to find meaningful work?" },
];

const TAG_COLORS: Record<string, string> = {
  performance: "bg-blue-500/15 text-blue-400",
  growth: "bg-green-500/15 text-green-400",
  body: "bg-orange-500/15 text-orange-400",
  mindset: "bg-primary/15 text-primary",
  calm: "bg-teal-500/15 text-teal-400",
  relationships: "bg-pink-500/15 text-pink-400",
  mind: "bg-violet-500/15 text-violet-400",
  self: "bg-amber-500/15 text-amber-400",
  environment: "bg-emerald-500/15 text-emerald-400",
  recovery: "bg-sky-500/15 text-sky-400",
  purpose: "bg-indigo-500/15 text-indigo-400",
  money: "bg-yellow-500/15 text-yellow-400",
};

const STATUS_DOT: Record<SwitchStatus, string> = {
  off: "bg-muted-foreground/30",
  flickering: "bg-yellow-400",
  stable: "bg-green-400",
  powered: "bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.8)]",
};

function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86400000);
}

function getWeekOfYear(): number {
  return Math.floor(getDayOfYear() / 7);
}

export default function DWHomePage() {
  usePageMeta("Home", "Your Dimensional Wellness home dashboard.");
  const [, navigate] = useLocation();
  const [signals, setSignals] = useState(getUserSignals);
  const [switchData, setSwitchData] = useState(getSwitchData);
  const elevationPlanEnabled = isFeatureEnabled("ELEVATION_PLAN");
  const weeklyReviewEnabled = isFeatureEnabled("WEEKLY_REVIEW");
  const { activePlan } = useElevationPlan();

  const { data: insights = [] } = useQuery<any[]>({
    queryKey: ["/api/insights"],
    staleTime: 60000,
  });

  const { data: onboardingData } = useQuery<{ profile: any | null }>({
    queryKey: ["/api/onboarding/profile"],
    staleTime: 300_000,
  });

  const onboardingProfile = onboardingData?.profile ?? null;

  // Progressive onboarding card — persisted dismiss per question key
  const LS_ONBOARDING_DISMISSED = "dw_onboarding_card_dismissed";
  const [dismissedCards, setDismissedCards] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_ONBOARDING_DISMISSED) || "[]");
    } catch {
      return [];
    }
  });

  const handleDismissOnboardingCard = (key: string) => {
    const next = [...dismissedCards, key];
    setDismissedCards(next);
    try {
      localStorage.setItem(LS_ONBOARDING_DISMISSED, JSON.stringify(next));
    } catch {}
  };

  const checkIsFirstTime = () => {
    const intakeComplete = localStorage.getItem("dw_intake_complete");
    const onboardingComplete = localStorage.getItem("dw_onboarding_completed");
    const softOnboardingComplete = localStorage.getItem("dw_soft_onboarding_completed");
    try {
      const profileData = localStorage.getItem("dw_guest_data");
      const hasProfile = profileData ? JSON.parse(profileData)?.profileSetup?.completedAt : false;
      return !intakeComplete && !onboardingComplete && !softOnboardingComplete && !hasProfile;
    } catch {
      return !intakeComplete && !onboardingComplete && !softOnboardingComplete;
    }
  };

  const [isFirstTime, setIsFirstTime] = useState(checkIsFirstTime);

  useEffect(() => {
    setIsFirstTime(checkIsFirstTime());
  }, []);

  const recommendation = deriveRecommendedSwitch(signals);
  const mode = deriveMode(signals);
  const RecommendedIcon = SWITCH_ICONS[recommendation.recommendedSwitchId];
  const colors = SWITCH_COLORS[recommendation.recommendedSwitchId];

  const plan = PLAN_LIBRARY[recommendation.recommendedSwitchId][signals.timeBand];

  // Performance: useCallback prevents new function identity on every render,
  // which matters for these handlers passed into motion/animated children.
  const handleEnergyChange = useCallback((level: EnergyLevel) => {
    updateEnergyLevel(level);
    setSignals(getUserSignals());
  }, []);

  const handleTimeChange = useCallback((band: TimeBand) => {
    updateTimeBand(band);
    setSignals(getUserSignals());
  }, []);

  // Memoize derived switch list so it doesn't recalculate on every render.
  const recentSwitches = useMemo(() => {
    const entries = Object.entries(switchData)
      .filter(([_, data]) => data.status !== "off")
      .sort((a, b) => b[1].lastUpdated - a[1].lastUpdated)
      .slice(0, 3);
    return entries as [SwitchId, typeof switchData[SwitchId]][];
  }, [switchData]);

  // ─── Derived card data ────────────────────────────────────────────────────
  const mirrorPrompt = useMemo(() => {
    return MIRROR_PROMPTS[getDayOfYear() % MIRROR_PROMPTS.length];
  }, []);

  const discoverTopics = useMemo(() => {
    const week = getWeekOfYear();
    const start = (week * 3) % DISCOVER_TOPICS.length;
    return [
      DISCOVER_TOPICS[start % DISCOVER_TOPICS.length],
      DISCOVER_TOPICS[(start + 1) % DISCOVER_TOPICS.length],
      DISCOVER_TOPICS[(start + 2) % DISCOVER_TOPICS.length],
    ];
  }, []);

  // Gems: real insights from DW conversations, excluding errors
  const conversationGems = useMemo(() => {
    return (insights as any[])
      .filter((i) => !i.hidden && i.category !== "update_check" && i.summary?.length > 20)
      .slice(0, 3);
  }, [insights]);

  // Untouched dimension: the switch with worst status + longest since update
  const untouchedDimension = useMemo(() => {
    const all = Object.entries(switchData) as [SwitchId, any][];
    const offSwitches = all.filter(([_, d]) => d.status === "off");
    if (offSwitches.length === 0) return null;
    // Prefer the one never updated (lastUpdated = 0) or oldest
    const sorted = offSwitches.sort((a, b) => (a[1].lastUpdated || 0) - (b[1].lastUpdated || 0));
    return sorted[0][0] as SwitchId;
  }, [switchData]);

  // Signal field: count powered/stable switches
  const activeSwitchCount = useMemo(() => {
    return Object.values(switchData).filter((d: any) => d.status !== "off").length;
  }, [switchData]);

  if (isFirstTime) {
    return (
      <div className="dw-premium-bg">
        <PageHeader title="Home" showBack={false} />
          <div className="p-4 pb-24 space-y-6 max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="card-modern border-primary/15 bg-primary/[0.03]">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Welcome to DW</p>
                    <p className="text-xs text-muted-foreground">Your life operating system</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  DW is your personal AI that gets smarter the more you engage. Start by training your first switch — a life area you want to level up.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(SWITCH_ICONS) as SwitchId[]).map((id) => {
                const Icon = SWITCH_ICONS[id];
                const c = SWITCH_COLORS[id];
                return (
                  <Link key={id} href={`/switch/${id}`}>
                    <Card className="border-border hover:border-primary/30 hover:bg-muted/40 transition-colors cursor-pointer">
                      <CardContent className="p-3 flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center shrink-0`}>
                          <Icon className={`h-4 w-4 ${c.text}`} />
                        </div>
                        <p className="text-sm font-medium text-foreground capitalize">{id}</p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Link href="/switchboard/intake">
              <Button 
                className="w-full btn-dw-primary"
                data-testid="button-start-training"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Start Switch Training
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  // ─── Progressive onboarding card logic ──────────────────────────────────────
  interface OnboardingUncertaintyFlags {
    barriersUnknown?: boolean;
    goalsUnclear?: boolean;
    capacityUnclear?: boolean;
    everythingConnected?: boolean;
  }

  const LIFE_AREA_ROUTINES = "routines";
  const CURIOSITY_TIME_MGMT = "time management";

  const uncertaintyFlags = (onboardingProfile?.uncertaintyFlags ?? {}) as OnboardingUncertaintyFlags;

  const PROGRESSIVE_CARDS = [
    {
      key: "schedule",
      condition: () =>
        !onboardingProfile?.activeLifeAreas?.includes(LIFE_AREA_ROUTINES) &&
        !onboardingProfile?.curiosityTopics?.includes(CURIOSITY_TIME_MGMT),
      prompt: "Tell me more about your schedule",
      subtext: "Knowing when you have energy and when you're stretched helps DW give better suggestions.",
      href: "/voice-onboarding",
    },
    {
      key: "throw_off",
      condition: () =>
        !onboardingProfile?.barrierTags ||
        (onboardingProfile.barrierTags as string[]).length === 0 ||
        uncertaintyFlags.barriersUnknown === true,
      prompt: "What usually throws your day off?",
      subtext: "Understanding what gets in the way helps DW build systems that actually hold.",
      href: "/talk-it-out",
    },
    {
      key: "holding_together",
      condition: () =>
        !onboardingProfile?.currentStateTags ||
        (onboardingProfile.currentStateTags as string[]).length === 0,
      prompt: "What are you trying to hold together right now?",
      subtext: "Life has a lot of moving parts. Share what's weighing on you — no need to have it figured out.",
      href: "/talk-it-out",
    },
    {
      key: "first_system",
      condition: () =>
        !onboardingProfile?.suggestedStructure ||
        (onboardingProfile.suggestedStructure as unknown[]).length === 0,
      prompt: "Want help creating your first system?",
      subtext: "A system is just a repeatable way to handle something. DW can help you build one in minutes.",
      href: "/systems",
    },
  ];

  const nextOnboardingCard = PROGRESSIVE_CARDS.find(
    (c) => !dismissedCards.includes(c.key) && c.condition()
  );

  return (
    <div className="dw-premium-bg">
      <PageHeader title="Home" showBack={false} />
        <div className="p-4 pb-24 space-y-6 max-w-lg mx-auto">

        {/* Progressive onboarding card */}
        {nextOnboardingCard && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            data-testid="progressive-onboarding-card"
          >
            <Card className="card-modern border-primary/20 bg-primary/[0.04]">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <MessageCircle className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{nextOnboardingCard.prompt}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{nextOnboardingCard.subtext}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={nextOnboardingCard.href} className="flex-1">
                    <Button size="sm" className="w-full text-xs btn-dw-primary" data-testid="button-onboarding-prompt">
                      <Sparkles className="h-3 w-3 mr-1.5" />
                      Let's talk about it
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-muted-foreground"
                    onClick={() => handleDismissOnboardingCard(nextOnboardingCard.key)}
                    data-testid="button-dismiss-onboarding-prompt"
                  >
                    Later
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="card-modern border-primary/15 bg-primary/[0.03]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-foreground">
                Your system today
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${colors.bg}`}>
                  <RecommendedIcon className={`h-5 w-5 ${colors.text}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Top switch to train</p>
                  <p className="font-medium text-foreground capitalize">
                    {recommendation.recommendedSwitchId}
                    <span className="text-muted-foreground ml-2">
                      ({mode === "restoring" ? "Restoring" : "Training"})
                    </span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Time available</p>
                  <div className="flex flex-wrap gap-1">
                    {TIME_OPTIONS.map(opt => (
                      <Badge
                        key={opt.value}
                        variant="outline"
                        className={`cursor-pointer text-xs transition-colors ${
                          signals.timeBand === opt.value
                            ? "badge-active"
                            : "badge-inactive"
                        }`}
                        onClick={() => handleTimeChange(opt.value)}
                        data-testid={`time-${opt.value}`}
                      >
                        {opt.label}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Energy level</p>
                  <div className="flex gap-1">
                    {ENERGY_OPTIONS.map(opt => {
                      const Icon = opt.icon;
                      return (
                        <Badge
                          key={opt.value}
                          variant="outline"
                          className={`cursor-pointer transition-colors ${
                            signals.energyLevel === opt.value
                              ? "badge-active"
                              : "badge-inactive"
                          }`}
                          onClick={() => handleEnergyChange(opt.value)}
                          data-testid={`energy-${opt.value}`}
                        >
                          <Icon className="h-3 w-3 mr-1" />
                          {opt.label}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className={`card-modern ${colors.bg}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-foreground">
                  Do this next
                </CardTitle>
                <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                  {plan.estimateMinutes} min
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium text-foreground mb-2">{plan.actionNow.title}</h3>
                <p className="text-sm text-muted-foreground italic mb-3">
                  {recommendation.reason}
                </p>
                <ul className="space-y-1.5">
                  {plan.actionNow.steps.slice(0, 3).map((step, i) => (
                    <li key={i} className="text-sm text-foreground flex items-start gap-2">
                      <span className={`${colors.text} mt-0.5`}>•</span>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-2">
                <Button 
                  className="flex-1 btn-dw-primary"
                  onClick={() => navigate(`/switch/${recommendation.recommendedSwitchId}`)}
                  data-testid="button-start-action"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => navigate(`/switch/${recommendation.alternativeSwitchId}`)}
                  data-testid="button-swap"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  data-testid="button-save"
                >
                  <Bookmark className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {recentSwitches.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-foreground">Recent switches</h2>
              <Link href="/switchboard">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  View all
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {recentSwitches.map(([switchId, data]) => {
                const Icon = SWITCH_ICONS[switchId];
                const switchColors = SWITCH_COLORS[switchId];
                return (
                  <Link key={switchId} href={`/switch/${switchId}`}>
                    <Card className="border-border hover:border-primary/30 hover:bg-muted/40 transition-colors cursor-pointer">
                      <CardContent className="p-3 text-center">
                        <div className={`w-10 h-10 mx-auto rounded-lg ${switchColors.bg} flex items-center justify-center mb-2`}>
                          <Icon className={`h-5 w-5 ${switchColors.text}`} />
                        </div>
                        <p className="text-xs font-medium text-foreground capitalize">{switchId}</p>
                        <p className="text-xs text-muted-foreground">{STATUS_LABELS[data.status]}</p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Plan in Motion card */}
        {elevationPlanEnabled && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            {activePlan ? (
              (() => {
                const { plan, days } = activePlan;
                const startMs = new Date(plan.startDate).getTime();
                const todayMs = new Date(new Date().toISOString().slice(0, 10)).getTime();
                const dayOffset = Math.floor((todayMs - startMs) / 86400000) + 1;
                const planComplete = dayOffset > 7;

                if (planComplete) {
                  const needsReview = weeklyReviewEnabled && isPlanReviewDue(plan.endDate);
                  return (
                    <Card className={`card-modern ${needsReview ? "border-amber-500/25 bg-amber-500/5" : "border-purple-500/20 bg-purple-500/5"}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${needsReview ? "bg-amber-500/20" : "bg-purple-500/20"}`}>
                            <TrendingUp className={`h-4 w-4 ${needsReview ? "text-amber-400" : "text-purple-400"}`} />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">
                              {needsReview ? "Week complete – time to review! 🎉" : "Plan Complete 🎉"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">{plan.title}</p>
                          </div>
                        </div>
                        {needsReview ? (
                          <Button
                            size="sm"
                            className="w-full mt-3 bg-amber-500/80 hover:bg-amber-500 text-white text-xs"
                            onClick={() => navigate(`/weekly-review?id=${plan.id}`)}
                          >
                            Start weekly review
                            <ChevronRight className="h-3 w-3 ml-1" />
                          </Button>
                        ) : (
                          <Link href="/elevation-plan">
                            <Button variant="outline" size="sm" className="w-full mt-3 text-xs">
                              View completed plan
                              <ChevronRight className="h-3 w-3 ml-1" />
                            </Button>
                          </Link>
                        )}
                      </CardContent>
                    </Card>
                  );
                }

                const currentDay = days.find((d) => d.dayIndex === dayOffset) ?? days[0];
                const nextAction = currentDay?.actions.find((a) => !a.isCompleted) ?? currentDay?.actions[0];

                return (
                  <Card className="card-modern border-green-500/20 bg-green-500/5">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base text-foreground flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-green-400" />
                          Plan in Motion
                        </CardTitle>
                        <Badge variant="outline" className="text-xs border-green-500/40 text-green-400">
                          Day {dayOffset} of 7
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {currentDay && (
                        <div>
                          <p className="text-sm font-medium text-foreground">{currentDay.theme}</p>
                          <p className="text-xs text-muted-foreground italic mt-0.5">{currentDay.intention}</p>
                        </div>
                      )}
                      {nextAction && (
                        <div className="bg-muted/30 rounded-lg p-2.5">
                          <p className="text-xs text-muted-foreground mb-0.5">Next action</p>
                          <p className="text-sm font-medium text-foreground">{nextAction.title}</p>
                        </div>
                      )}
                      <Link href="/elevation-plan">
                        <Button variant="outline" size="sm" className="w-full text-xs">
                          View full plan
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })()
            ) : (
              <Card className="card-modern border-yellow-500/20 bg-yellow-500/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <FileText className="h-4 w-4 text-yellow-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">No active plan</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Ready to build your 7-day elevation plan?
                      </p>
                    </div>
                  </div>
                  <Link href="/elevation-plan">
                    <Button
                      size="sm"
                      className="w-full mt-3 btn-dw-primary text-xs"
                    >
                      <Sparkles className="h-3 w-3 mr-1.5" />
                      Build Elevation Plan
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {/* ── Section divider ─────────────────────────────────── */}
        <div className="flex items-center gap-3 pt-1">
          <div className="flex-1 h-px bg-border/50" />
          <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/60">Know Yourself</p>
          <div className="flex-1 h-px bg-border/50" />
        </div>

        {/* ── Card 1: Mirror Moment ────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="card-modern border-violet-500/20 overflow-hidden" data-testid="card-mirror-moment">
            <div className="h-0.5 w-full bg-gradient-to-r from-violet-500/60 via-primary/60 to-transparent" />
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center shrink-0">
                  <Eye className="h-4 w-4 text-violet-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-violet-400" style={{ letterSpacing: "0.07em" }}>Mirror Moment</p>
                  <p className="text-[10px] text-muted-foreground">Today's deep question</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-foreground font-medium">
                {mirrorPrompt}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 border border-violet-500/20"
                onClick={() => navigate(`/talk?q=${encodeURIComponent("I've been reflecting on this: " + mirrorPrompt + " Here are my thoughts...")}`)}
                data-testid="button-mirror-reflect"
              >
                <MessageCircle className="h-3.5 w-3.5 mr-2" />
                Reflect with DW
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Card 2: Signal Map ────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card className="card-modern" data-testid="card-signal-map">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Radio className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary/80" style={{ letterSpacing: "0.07em" }}>Your Signal Field</p>
                    <p className="text-[10px] text-muted-foreground">{activeSwitchCount} of 8 dimensions active</p>
                  </div>
                </div>
                <Link href="/switchboard">
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7 px-2">
                    All <ChevronRight className="h-3 w-3 ml-0.5" />
                  </Button>
                </Link>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {(Object.keys(SWITCH_ICONS) as SwitchId[]).map((id) => {
                  const Icon = SWITCH_ICONS[id];
                  const status = (switchData[id]?.status ?? "off") as SwitchStatus;
                  const c = SWITCH_COLORS[id];
                  return (
                    <Link key={id} href={`/switch/${id}`}>
                      <div className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-muted/40 transition-colors cursor-pointer">
                        <div className="relative">
                          <div className={`w-9 h-9 rounded-xl ${status !== "off" ? c.bg : "bg-muted/40"} flex items-center justify-center`}>
                            <Icon className={`h-4 w-4 ${status !== "off" ? c.text : "text-muted-foreground/40"}`} />
                          </div>
                          <div className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background ${STATUS_DOT[status]}`} />
                        </div>
                        <p className="text-[9px] font-medium text-muted-foreground leading-tight text-center capitalize">{id}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Card 3: Conversation Gems (DW Memory) ────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="card-modern border-primary/15" data-testid="card-dw-memory">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Gem className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary/80" style={{ letterSpacing: "0.07em" }}>What DW Knows About You</p>
                    <p className="text-[10px] text-muted-foreground">Gems from your conversations</p>
                  </div>
                </div>
              </div>

              {conversationGems.length > 0 ? (
                <div className="space-y-2">
                  {conversationGems.map((gem, i) => (
                    <div key={gem.id ?? i} className="bg-muted/30 rounded-xl p-3 border border-border/40">
                      <p className="text-xs text-foreground leading-relaxed line-clamp-2">{gem.summary}</p>
                      {gem.category && gem.category !== "general_chat" && (
                        <Badge variant="outline" className="mt-1.5 text-[9px] h-4 px-1.5 capitalize border-border/50 text-muted-foreground">
                          {gem.category.replace(/_/g, " ")}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-muted/20 rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground">
                    DW hasn't learned much yet. Every conversation teaches DW something new about you.
                  </p>
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-primary/70 hover:text-primary hover:bg-primary/8 border border-primary/15"
                onClick={() => navigate("/talk")}
                data-testid="button-talk-dw"
              >
                <MessageCircle className="h-3.5 w-3.5 mr-2" />
                Keep teaching DW
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Card 4: Discover This Week ────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <Card className="card-modern border-emerald-500/15" data-testid="card-discover">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                  <Compass className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400" style={{ letterSpacing: "0.07em" }}>Discover This Week</p>
                  <p className="text-[10px] text-muted-foreground">Topics worth going deeper on</p>
                </div>
              </div>

              <div className="space-y-2">
                {discoverTopics.map((topic, i) => (
                  <button
                    key={i}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/40 hover:border-emerald-500/25 transition-all text-left group"
                    onClick={() => navigate(`/talk?q=${encodeURIComponent(topic.q)}`)}
                    data-testid={`discover-topic-${i}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md shrink-0 ${TAG_COLORS[topic.tag] ?? "bg-muted text-muted-foreground"}`}>
                        {topic.tag}
                      </span>
                      <p className="text-xs font-medium text-foreground truncate">{topic.label}</p>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-emerald-400 transition-colors shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Card 5: Untouched Dimension ───────────────────────── */}
        {untouchedDimension && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="card-modern border-orange-500/20" data-testid="card-untouched-dimension">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center shrink-0">
                    <Lock className="h-5 w-5 text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-orange-400" style={{ letterSpacing: "0.07em" }}>Unlock Your {SWITCH_LABELS[untouchedDimension]}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      This dimension is untrained. That gap in your system has more influence on your life than you think.
                    </p>
                  </div>
                </div>
                <Link href={`/switch/${untouchedDimension}`}>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-3 text-xs border-orange-500/25 text-orange-400 hover:bg-orange-500/10 hover:text-orange-300"
                  >
                    Explore {SWITCH_LABELS[untouchedDimension]}
                    <ChevronRight className="h-3 w-3 ml-1.5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        )}

      </div>
    </div>
  );
}
