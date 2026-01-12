import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
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
  Battery,
  Heart,
  Calendar,
  TrendingUp,
  Check,
} from "lucide-react";
import { getSwitchData, type SwitchId } from "@/lib/switch-storage";
import { getUserSignals } from "@/lib/user-signals";

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

const STATUS_COLORS: Record<string, string> = {
  off: "bg-slate-500/20 text-slate-400",
  flickering: "bg-yellow-500/20 text-yellow-400",
  stable: "bg-blue-500/20 text-blue-400",
  powered: "bg-emerald-500/20 text-emerald-400",
};

const FLAG_LABELS: Record<string, string> = {
  overwhelm: "Felt overwhelmed",
  timeChaos: "Days felt scattered",
  lowEnergy: "Energy dips",
  moneyStress: "Financial pressure",
  relationshipDrain: "People felt draining",
  envMess: "Space caused friction",
  lowMotivation: "Low motivation",
  sleepDebt: "Sleep debt",
};

export default function MyProgressPage() {
  const switchData = getSwitchData();
  const signals = getUserSignals();

  const { data: serverProgress, isLoading } = useQuery<{
    systemSnapshot: { energy: string; stress: string; consistencyDays: number };
    weeklyWins: { completedActions: number; bestDay: string | null; helped: number; somewhat: number; didntHelp: number };
    patterns: { label: string; count: number }[];
  }>({
    queryKey: ["/api/user/progress"],
    retry: false,
  });

  const getEnergyLabel = (level: string) => {
    switch (level) {
      case "low": return "Low";
      case "medium": return "Medium";
      case "high": return "High";
      default: return "Medium";
    }
  };

  const activeFlagPatterns = Object.entries(signals.flagCounts14d)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => ({
      label: FLAG_LABELS[key] || key,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <ScrollArea className="h-[calc(100vh-4rem)]">
      <div className="p-4 pb-24 space-y-6 max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <h1 className="text-xl font-bold text-white">My Progress</h1>
          <p className="text-sm text-slate-400">
            You don't need perfect weeks — just powered ones.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-white/10 bg-gradient-to-br from-purple-900/20 to-blue-900/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <Battery className="h-4 w-4 text-purple-400" />
                Your System This Week
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-lg bg-slate-800/50">
                  <p className="text-xs text-slate-400 mb-1">Energy</p>
                  <p className="text-lg font-semibold text-white">
                    {getEnergyLabel(signals.energyLevel)}
                  </p>
                </div>
                <div className="text-center p-3 rounded-lg bg-slate-800/50">
                  <p className="text-xs text-slate-400 mb-1">Stress</p>
                  <p className="text-lg font-semibold text-white">
                    {getEnergyLabel(signals.stressLevel)}
                  </p>
                </div>
                <div className="text-center p-3 rounded-lg bg-slate-800/50">
                  <p className="text-xs text-slate-400 mb-1">Consistency</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-12 mx-auto" />
                  ) : (
                    <p className="text-lg font-semibold text-white">
                      {serverProgress?.systemSnapshot?.consistencyDays ?? 0} days
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" />
                Switchboard Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(SWITCH_ICONS) as SwitchId[]).map((switchId) => {
                  const Icon = SWITCH_ICONS[switchId];
                  const colors = SWITCH_COLORS[switchId];
                  const data = switchData[switchId];
                  const status = data?.status || "off";
                  const lastTrained = data?.lastUpdated 
                    ? new Date(data.lastUpdated).toLocaleDateString() 
                    : "Never";

                  return (
                    <div
                      key={switchId}
                      className="p-3 rounded-lg border border-white/5 bg-slate-800/30 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${colors.bg}`}>
                          <Icon className={`h-3.5 w-3.5 ${colors.text}`} />
                        </div>
                        <span className="text-sm font-medium text-white capitalize">
                          {switchId}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge className={`text-xs ${STATUS_COLORS[status]}`}>
                          {status}
                        </Badge>
                        <span className="text-xs text-slate-500">{lastTrained}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400" />
                Weekly Wins
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Completed actions</span>
                    <span className="font-medium text-white">
                      {serverProgress?.weeklyWins?.completedActions ?? 0}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                      <p className="text-lg font-semibold text-emerald-400">
                        {serverProgress?.weeklyWins?.helped ?? 0}
                      </p>
                      <p className="text-xs text-slate-400">Helped</p>
                    </div>
                    <div className="p-2 rounded-lg bg-amber-500/10">
                      <p className="text-lg font-semibold text-amber-400">
                        {serverProgress?.weeklyWins?.somewhat ?? 0}
                      </p>
                      <p className="text-xs text-slate-400">Somewhat</p>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-500/10">
                      <p className="text-lg font-semibold text-slate-400">
                        {serverProgress?.weeklyWins?.didntHelp ?? 0}
                      </p>
                      <p className="text-xs text-slate-400">Didn't help</p>
                    </div>
                  </div>
                </>
              )}
              <p className="text-xs text-slate-500 italic text-center pt-2">
                Information, not judgment.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {activeFlagPatterns.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <Heart className="h-4 w-4 text-pink-400" />
                  What Showed Up This Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {activeFlagPatterns.slice(0, 4).map((pattern) => (
                    <div
                      key={pattern.label}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-800/30"
                    >
                      <span className="text-sm text-slate-300">{pattern.label}</span>
                      <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                        {pattern.count}×
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </ScrollArea>
  );
}
