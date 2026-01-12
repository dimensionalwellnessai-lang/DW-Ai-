import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Link } from "wouter";
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
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { getSwitchData, type SwitchId } from "@/lib/switch-storage";
import { getUserSignals } from "@/lib/user-signals";

interface ProgressSummary {
  range: string;
  snapshot: {
    energyLevel: string;
    stressLevel: string;
    timeBand: string;
    consistencyDays14d: number;
  };
  wins: {
    actionsCompleted: number;
    bestDay: string | null;
    helped: { yes: number; some: number; no: number };
  };
}

interface SwitchProgress {
  switchId: string;
  status: string;
  lastTrainedAt: string | null;
  completedCount21d: number;
}

interface PatternData {
  label: string;
  count: number;
}

interface RecommendationData {
  recommendedSwitchId: string;
  alternativeSwitchId: string;
  timeBand: string;
  mode: string;
  title: string;
  reasonLine: string;
}

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

const SWITCH_TITLES: Record<string, string> = {
  body: "Body",
  mind: "Mind",
  time: "Time",
  purpose: "Purpose",
  money: "Money",
  relationships: "Relationships",
  environment: "Environment",
  identity: "Identity",
};

export default function MyProgressPage() {
  const [range] = useState<"7d" | "14d">("14d");
  
  const localSwitchData = getSwitchData();
  const signals = getUserSignals();

  const { data: serverSummary, isLoading: summaryLoading } = useQuery<ProgressSummary>({
    queryKey: ["progress", "summary", range],
    queryFn: async () => {
      const res = await fetch(`/api/progress/summary?range=${range}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    retry: false,
  });

  const { data: serverSwitches } = useQuery<{ switches: SwitchProgress[] }>({
    queryKey: ["progress", "switches", "21d"],
    queryFn: async () => {
      const res = await fetch(`/api/progress/switches?range=21d`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    retry: false,
  });

  const { data: serverPatterns } = useQuery<{ patterns: PatternData[] }>({
    queryKey: ["progress", "patterns", range],
    queryFn: async () => {
      const res = await fetch(`/api/progress/patterns?range=${range}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    retry: false,
  });

  const { data: recommendation } = useQuery<RecommendationData>({
    queryKey: ["recommendation", "today"],
    queryFn: async () => {
      const res = await fetch(`/api/recommendation/today`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
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

  const getLastTrainedText = (lastTrainedAt: string | null) => {
    if (!lastTrainedAt) return "Never trained";
    const date = new Date(lastTrainedAt);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    return `${diffDays} days ago`;
  };

  const activeFlagPatterns = Object.entries(signals.flagCounts14d)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => ({
      label: {
        overwhelm: "Felt overwhelmed",
        timeChaos: "Days felt scattered",
        lowEnergy: "Energy dips",
        moneyStress: "Financial pressure",
        relationshipDrain: "People felt draining",
        envMess: "Space caused friction",
        lowMotivation: "Low motivation",
        sleepDebt: "Sleep debt",
      }[key] || key,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const patterns = serverPatterns?.patterns?.length ? serverPatterns.patterns : activeFlagPatterns;

  const switchIds: SwitchId[] = ["body", "mind", "time", "purpose", "money", "relationships", "environment", "identity"];
  
  const mergedSwitches = switchIds.map(switchId => {
    const serverData = serverSwitches?.switches?.find(s => s.switchId === switchId);
    const localData = localSwitchData[switchId];
    
    const lastUpdatedTs = localData?.lastUpdated || null;
    const lastTrainedAt = lastUpdatedTs ? new Date(lastUpdatedTs).toISOString() : serverData?.lastTrainedAt || null;
    
    return {
      switchId,
      status: localData?.status || serverData?.status || "off",
      lastTrainedAt,
      completedCount: localData?.checkIns || serverData?.completedCount21d || 0,
    };
  });

  return (
    <ScrollArea className="h-[calc(100vh-4rem)]">
      <div className="p-4 pb-24 space-y-6 max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <h1 className="text-xl font-bold text-white" data-testid="progress-title">My Progress</h1>
          <p className="text-sm text-slate-400">
            You don't need perfect weeks — just powered ones.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <Battery className="h-4 w-4 text-blue-400" />
                Your System This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <div className="grid grid-cols-3 gap-4">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded-lg bg-slate-800/50">
                    <p className="text-lg font-bold text-white" data-testid="energy-level">
                      {getEnergyLabel(serverSummary?.snapshot?.energyLevel || signals.energyLevel)}
                    </p>
                    <p className="text-xs text-slate-400">Energy</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-slate-800/50">
                    <p className="text-lg font-bold text-white" data-testid="stress-level">
                      {getEnergyLabel(serverSummary?.snapshot?.stressLevel || signals.stressLevel)}
                    </p>
                    <p className="text-xs text-slate-400">Stress</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-slate-800/50">
                    <p className="text-lg font-bold text-white" data-testid="consistency-days">
                      {serverSummary?.snapshot?.consistencyDays14d ?? 0}/14
                    </p>
                    <p className="text-xs text-slate-400">Days Active</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h2 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Switchboard Status
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {mergedSwitches.map((switchItem) => {
              const Icon = SWITCH_ICONS[switchItem.switchId as SwitchId];
              const colors = SWITCH_COLORS[switchItem.switchId as SwitchId];
              
              return (
                <Link 
                  key={switchItem.switchId} 
                  href={`/switch/${switchItem.switchId}`}
                  data-testid={`switch-card-${switchItem.switchId}`}
                >
                  <Card className="border-white/10 hover-elevate cursor-pointer h-full">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className={`p-2 rounded-lg ${colors.bg}`}>
                          <Icon className={`h-4 w-4 ${colors.text}`} />
                        </div>
                        <Badge 
                          className={`${STATUS_COLORS[switchItem.status]} text-xs capitalize`}
                        >
                          {switchItem.status}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-white">
                        {SWITCH_TITLES[switchItem.switchId]}
                      </p>
                      <p className="text-xs text-slate-400">
                        {getLastTrainedText(switchItem.lastTrainedAt)}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-400" />
                Weekly Wins
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Check className="h-4 w-4 text-green-400" />
                    <span className="text-lg font-bold text-white" data-testid="actions-completed">
                      {serverSummary?.wins?.actionsCompleted ?? 0}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">Completed</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Heart className="h-4 w-4 text-pink-400" />
                    <span className="text-lg font-bold text-white" data-testid="helped-count">
                      {serverSummary?.wins?.helped?.yes ?? 0}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">Helped</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Calendar className="h-4 w-4 text-blue-400" />
                    <span className="text-lg font-bold text-white" data-testid="somewhat-count">
                      {serverSummary?.wins?.helped?.some ?? 0}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">Somewhat</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {patterns.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card className="border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-400" />
                  Patterns (14 days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {patterns.slice(0, 5).map((pattern, i) => (
                    <Badge 
                      key={i} 
                      variant="secondary" 
                      className="bg-slate-800/50"
                      data-testid={`pattern-${i}`}
                    >
                      {pattern.label}: {pattern.count}×
                    </Badge>
                  ))}
                </div>
                {patterns.length === 0 && (
                  <p className="text-sm text-slate-500 italic">
                    Nothing heavy showed up this week. Keep the rhythm.
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {recommendation && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-slate-900">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  Next Best Move
                </CardTitle>
              </CardHeader>
              <CardContent>
                <h3 className="font-medium text-white mb-1" data-testid="recommendation-title">
                  {recommendation.title}
                </h3>
                <p className="text-sm text-slate-400 mb-4">
                  {recommendation.reasonLine}
                </p>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    className="flex-1"
                    data-testid="button-start-recommendation"
                  >
                    Start
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1"
                    data-testid="button-save-recommendation"
                  >
                    Save for Later
                  </Button>
                </div>
                <Link href={`/switch/${recommendation.alternativeSwitchId}`}>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full mt-2 text-slate-400"
                    data-testid="button-swap-recommendation"
                  >
                    Try {SWITCH_TITLES[recommendation.alternativeSwitchId]} instead
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </ScrollArea>
  );
}
