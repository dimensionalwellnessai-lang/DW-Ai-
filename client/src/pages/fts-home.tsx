import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
} from "lucide-react";
import { getSwitchData, type SwitchId, type SwitchStatus } from "@/lib/switch-storage";
import { getUserSignals, updateEnergyLevel, updateTimeBand, deriveRecommendedSwitch, deriveMode, type EnergyLevel } from "@/lib/user-signals";
import { PLAN_LIBRARY, type TimeBand } from "@/config/plan-library";

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

const SWITCH_COLORS: Record<SwitchId, { text: string; bg: string }> = {
  body: { text: "text-red-400", bg: "bg-red-500/10" },
  mind: { text: "text-purple-400", bg: "bg-purple-500/10" },
  time: { text: "text-blue-400", bg: "bg-blue-500/10" },
  purpose: { text: "text-amber-400", bg: "bg-amber-500/10" },
  money: { text: "text-green-400", bg: "bg-green-500/10" },
  relationships: { text: "text-pink-400", bg: "bg-pink-500/10" },
  environment: { text: "text-cyan-400", bg: "bg-cyan-500/10" },
  identity: { text: "text-emerald-400", bg: "bg-emerald-500/10" },
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

export default function FTSHomePage() {
  const [, navigate] = useLocation();
  const [signals, setSignals] = useState(getUserSignals);
  const [switchData, setSwitchData] = useState(getSwitchData);
  
  const checkIsFirstTime = () => {
    const intakeComplete = localStorage.getItem("fts_intake_complete");
    const onboardingComplete = localStorage.getItem("fts_onboarding_completed");
    const softOnboardingComplete = localStorage.getItem("fts_soft_onboarding_completed");
    try {
      const profileData = localStorage.getItem("fts_guest_data");
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
      <ScrollArea className="h-[calc(100vh-4rem)]">
        <div className="p-4 pb-24 space-y-6 max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4 pt-12"
          >
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center">
              <Sparkles className="h-10 w-10 text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">
              Welcome to Flip the Switch
            </h1>
            <p className="text-slate-400 leading-relaxed max-w-sm mx-auto">
              Your life is a system. Each dimension is a switch. 
              We'll find your top switches and help you power them up.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-purple-500/20 bg-purple-500/5">
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
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/25"
                data-testid="button-start-training"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Start Switch Training
              </Button>
            </Link>
          </motion.div>
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-4rem)]">
      <div className="p-4 pb-24 space-y-6 max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-white/10 bg-gradient-to-br from-slate-800/50 to-slate-900/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-slate-300">
                Your system today
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${colors.bg}`}>
                  <RecommendedIcon className={`h-5 w-5 ${colors.text}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-400">Top switch to train</p>
                  <p className="font-medium text-white capitalize">
                    {recommendation.recommendedSwitchId}
                    <span className="text-slate-500 ml-2">
                      ({mode === "restoring" ? "Restoring" : "Training"})
                    </span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <p className="text-xs text-slate-500">Time available</p>
                  <div className="flex flex-wrap gap-1">
                    {TIME_OPTIONS.map(opt => (
                      <Badge
                        key={opt.value}
                        variant="outline"
                        className={`cursor-pointer text-xs ${
                          signals.timeBand === opt.value
                            ? "bg-purple-500/20 border-purple-500/50 text-purple-300"
                            : "border-slate-700 text-slate-400 hover:border-slate-600"
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
                  <p className="text-xs text-slate-500">Energy level</p>
                  <div className="flex gap-1">
                    {ENERGY_OPTIONS.map(opt => {
                      const Icon = opt.icon;
                      return (
                        <Badge
                          key={opt.value}
                          variant="outline"
                          className={`cursor-pointer ${
                            signals.energyLevel === opt.value
                              ? "bg-purple-500/20 border-purple-500/50 text-purple-300"
                              : "border-slate-700 text-slate-400 hover:border-slate-600"
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
          <Card className={`border-white/10 ${colors.bg}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-slate-200">
                  Do this next
                </CardTitle>
                <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                  {plan.estimateMinutes} min
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium text-white mb-2">{plan.actionNow.title}</h3>
                <p className="text-sm text-slate-400 italic mb-3">
                  {recommendation.reason}
                </p>
                <ul className="space-y-1.5">
                  {plan.actionNow.steps.slice(0, 3).map((step, i) => (
                    <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                      <span className={`${colors.text} mt-0.5`}>•</span>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-2">
                <Button 
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white"
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
              <h2 className="text-sm font-medium text-slate-300">Recent switches</h2>
              <Link href="/switchboard">
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-300">
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
                    <Card className="border-white/5 hover:border-white/10 transition-colors cursor-pointer">
                      <CardContent className="p-3 text-center">
                        <div className={`w-10 h-10 mx-auto rounded-lg ${switchColors.bg} flex items-center justify-center mb-2`}>
                          <Icon className={`h-5 w-5 ${switchColors.text}`} />
                        </div>
                        <p className="text-xs font-medium text-slate-300 capitalize">{switchId}</p>
                        <p className="text-xs text-slate-500">{STATUS_LABELS[data.status]}</p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-white/5 bg-slate-800/30">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-slate-400 italic">
                "Small is powerful when it's consistent."
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </ScrollArea>
  );
}
