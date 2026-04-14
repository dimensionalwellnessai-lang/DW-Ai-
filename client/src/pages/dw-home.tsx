import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageHeader } from "@/components/page-header";
import { motion } from "framer-motion";
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

export default function DWHomePage() {
  usePageMeta("Home", "Your Dimensional Wellness home dashboard.");
  const [, navigate] = useLocation();
  const [signals, setSignals] = useState(getUserSignals);
  const [switchData, setSwitchData] = useState(getSwitchData);
  const elevationPlanEnabled = isFeatureEnabled("ELEVATION_PLAN");
  const weeklyReviewEnabled = isFeatureEnabled("WEEKLY_REVIEW");
  const { activePlan } = useElevationPlan();
  
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

  const handleEnergyChange = (level: EnergyLevel) => {
    updateEnergyLevel(level);
    setSignals(getUserSignals());
  };

  const handleTimeChange = (band: TimeBand) => {
    updateTimeBand(band);
    setSignals(getUserSignals());
  };

  const getRecentSwitches = () => {
    const entries = Object.entries(switchData)
      .filter(([_, data]) => data.status !== "off")
      .sort((a, b) => b[1].lastUpdated - a[1].lastUpdated)
      .slice(0, 3);
    return entries as [SwitchId, typeof switchData[SwitchId]][];
  };

  const recentSwitches = getRecentSwitches();

  if (isFirstTime) {
    return (
      <div className="dw-premium-bg">
        <PageHeader title="Home" showBack={false} />
          <div className="p-4 pb-24 space-y-6 max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4 pt-12"
          >
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center">
              <Sparkles className="h-10 w-10 text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              Welcome to Dimensional Wellness
            </h1>
            <p className="text-muted-foreground leading-relaxed max-w-sm mx-auto">
              Your life is a system. Each dimension is a switch. 
              We'll find your top switches and help you power them up.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="card-modern border-purple-500/20 bg-purple-500/5">
              <CardContent className="p-4">
                <p className="text-sm text-purple-300 italic text-center">
                  "We're not fixing your whole life today. 
                  We're powering one switch."
                </p>
              </CardContent>
            </Card>
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

  return (
    <div className="dw-premium-bg">
      <PageHeader title="Home" showBack={false} />
        <div className="p-4 pb-24 space-y-6 max-w-lg mx-auto">
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
                // Find current day (1-based offset from start)
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

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-border bg-muted/30">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground italic">
                "Small is powerful when it's consistent."
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
