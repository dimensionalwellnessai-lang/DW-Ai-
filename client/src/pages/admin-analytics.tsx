import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Users,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Activity,
  Target,
  Clock,
  Zap,
  RefreshCw,
  Flag,
} from "lucide-react";

interface SummaryResponse {
  range: string;
  startDate: string;
  endDate: string;
  generatedAt: string;
  kpis: {
    dau: number;
    wau: number;
    mau: number;
    activationRate7d: number;
    d1Retention: number;
    d7Retention: number;
    d7MeaningfulRetention: number;
    helpedPositiveRate: number;
    avgCompletionsPerActiveUser: number;
    swapRate: number;
    errorsPerSession: number;
  };
  counts: {
    sessions: number;
    planGenerated: number;
    planSaved: number;
    planItemCompleted: number;
    postActionCheckins: number;
    recommendationsViewed: number;
    recommendationsSwapped: number;
    errors: number;
  };
}

interface FunnelResponse {
  range: string;
  steps: {
    stepId: string;
    label: string;
    users: number;
    conversionFromPrev: number | null;
  }[];
}

interface SwitchesResponse {
  range: string;
  switches: {
    switchId: string;
    detailViews: number;
    plansGenerated: number;
    plansSaved: number;
    itemsCompleted: number;
    helped: {
      yes: number;
      some: number;
      no: number;
      positiveRate: number;
    };
  }[];
  totals: {
    detailViews: number;
    plansGenerated: number;
    plansSaved: number;
    itemsCompleted: number;
  };
}

interface ErrorsResponse {
  range: string;
  errorsPerSession: number;
  topErrorCodes: { errorCode: string; count: number }[];
  topScreens: { screenId: string; count: number }[];
}

interface FlagsResponse {
  range: string;
  topFlags: { flagKey: string; count: number }[];
  flagToOutcome: { flagKey: string; recommendedSwitchId: string; recommendations: number; completedWithin24h: number; completion24hRate: number }[];
}

interface TimebandResponse {
  range: string;
  timeBandDistribution: { tiny: number; small: number; medium: number; large: number };
  modeDistribution: { restoring: number; training: number; maintaining: number };
  helpedByTimeBand: { timeBand: string; helpedPositiveRate: number; sampleSize: number }[];
  helpedByMode: { mode: string; helpedPositiveRate: number; sampleSize: number }[];
  completionByTimeBand: { timeBand: string; itemsCompleted: number }[];
}

const SWITCH_COLORS: Record<string, string> = {
  body: "#ef4444",
  mind: "#a855f7",
  time: "#3b82f6",
  purpose: "#f59e0b",
  money: "#22c55e",
  relationships: "#ec4899",
  environment: "#06b6d4",
  identity: "#10b981",
};

function KPITile({ 
  label, 
  value, 
  icon: Icon, 
  color = "text-purple-400",
  isLoading = false 
}: { 
  label: string; 
  value: string | number; 
  icon: typeof Users; 
  color?: string;
  isLoading?: boolean;
}) {
  return (
    <Card className="border-white/10 bg-slate-800/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-700/50">
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          <div>
            {isLoading ? (
              <Skeleton className="h-6 w-16" />
            ) : (
              <p className="text-xl font-bold text-white" data-testid={`kpi-${label.toLowerCase().replace(/\s/g, '-')}`}>{value}</p>
            )}
            <p className="text-xs text-slate-400">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FunnelStep({ 
  label, 
  count, 
  conversion, 
  isLoading = false 
}: { 
  label: string; 
  count: number; 
  conversion: number | null;
  isLoading?: boolean;
}) {
  const rate = conversion !== null ? Math.round(conversion * 100) : 100;
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-slate-300">{label}</span>
        {isLoading ? (
          <Skeleton className="h-4 w-16" />
        ) : (
          <span className="text-slate-400">{count} {conversion !== null && `(${rate}%)`}</span>
        )}
      </div>
      {isLoading ? (
        <Skeleton className="h-2 w-full" />
      ) : (
        <Progress value={rate} className="h-2" />
      )}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState<"7d" | "30d">("7d");

  const { data: summary, isLoading: summaryLoading, error: summaryError } = useQuery<SummaryResponse>({
    queryKey: ["admin", "summary", range],
    queryFn: async () => {
      const res = await fetch(`/api/admin/metrics/summary?range=${range}`);
      if (!res.ok) throw new Error("Not authorized");
      return res.json();
    },
    retry: false,
  });

  const { data: funnel, isLoading: funnelLoading } = useQuery<FunnelResponse>({
    queryKey: ["admin", "funnel", range],
    queryFn: async () => {
      const res = await fetch(`/api/admin/metrics/funnel?range=${range}`);
      if (!res.ok) throw new Error("Not authorized");
      return res.json();
    },
    retry: false,
    enabled: !summaryError,
  });

  const { data: switches, isLoading: switchesLoading } = useQuery<SwitchesResponse>({
    queryKey: ["admin", "switches", range],
    queryFn: async () => {
      const res = await fetch(`/api/admin/metrics/switches?range=${range}`);
      if (!res.ok) throw new Error("Not authorized");
      return res.json();
    },
    retry: false,
    enabled: !summaryError,
  });

  const { data: errors, isLoading: errorsLoading } = useQuery<ErrorsResponse>({
    queryKey: ["admin", "errors", range],
    queryFn: async () => {
      const res = await fetch(`/api/admin/metrics/errors?range=${range}`);
      if (!res.ok) throw new Error("Not authorized");
      return res.json();
    },
    retry: false,
    enabled: !summaryError,
  });

  const { data: flags } = useQuery<FlagsResponse>({
    queryKey: ["admin", "flags", "14d"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/metrics/flags?range=14d`);
      if (!res.ok) throw new Error("Not authorized");
      return res.json();
    },
    retry: false,
    enabled: !summaryError,
  });

  const { data: timeband } = useQuery<TimebandResponse>({
    queryKey: ["admin", "timeband", range],
    queryFn: async () => {
      const res = await fetch(`/api/admin/metrics/timeband?range=${range}`);
      if (!res.ok) throw new Error("Not authorized");
      return res.json();
    },
    retry: false,
    enabled: !summaryError,
  });

  if (summaryError) {
    return (
      <div className="p-6 text-center" data-testid="admin-not-authorized">
        <AlertTriangle className="h-12 w-12 mx-auto text-red-400 mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">Not Authorized</h1>
        <p className="text-slate-400">
          You don't have permission to access this page.
        </p>
      </div>
    );
  }

  const switchChartData = switches?.switches?.map(s => ({
    name: s.switchId.charAt(0).toUpperCase() + s.switchId.slice(1),
    switchId: s.switchId,
    completions: s.itemsCompleted,
    helpedRate: Math.round(s.helped.positiveRate * 100),
  })) || [];

  const timebandChartData = timeband ? [
    { name: "Tiny", value: timeband.timeBandDistribution.tiny },
    { name: "Small", value: timeband.timeBandDistribution.small },
    { name: "Medium", value: timeband.timeBandDistribution.medium },
    { name: "Large", value: timeband.timeBandDistribution.large },
  ] : [];

  const modeChartData = timeband ? [
    { name: "Restoring", value: timeband.modeDistribution.restoring },
    { name: "Training", value: timeband.modeDistribution.training },
    { name: "Maintaining", value: timeband.modeDistribution.maintaining },
  ] : [];

  return (
    <ScrollArea className="h-[calc(100vh-4rem)]">
      <div className="p-4 pb-24 space-y-6 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-xl font-bold text-white" data-testid="admin-title">Admin Analytics</h1>
            <p className="text-sm text-slate-400">
              Aggregated metrics for growth and debugging
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={range === "7d" ? "default" : "outline"}
              onClick={() => setRange("7d")}
              data-testid="range-7d"
            >
              7 Days
            </Button>
            <Button
              size="sm"
              variant={range === "30d" ? "default" : "outline"}
              onClick={() => setRange("30d")}
              data-testid="range-30d"
            >
              30 Days
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Health KPIs
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPITile 
              label="DAU" 
              value={summary?.kpis?.dau ?? "-"} 
              icon={Users}
              color="text-blue-400"
              isLoading={summaryLoading}
            />
            <KPITile 
              label="Activation (7d)" 
              value={`${Math.round((summary?.kpis?.activationRate7d ?? 0) * 100)}%`} 
              icon={TrendingUp}
              color="text-green-400"
              isLoading={summaryLoading}
            />
            <KPITile 
              label="D7 Retention" 
              value={`${Math.round((summary?.kpis?.d7MeaningfulRetention ?? 0) * 100)}%`} 
              icon={Target}
              color="text-amber-400"
              isLoading={summaryLoading}
            />
            <KPITile 
              label="Helped Rate" 
              value={`${Math.round((summary?.kpis?.helpedPositiveRate ?? 0) * 100)}%`} 
              icon={CheckCircle}
              color="text-emerald-400"
              isLoading={summaryLoading}
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-white/10 bg-slate-800/30">
              <CardContent className="p-3 text-center">
                {summaryLoading ? (
                  <Skeleton className="h-8 w-12 mx-auto" />
                ) : (
                  <p className="text-2xl font-bold text-white">{summary?.kpis?.dau ?? 0}</p>
                )}
                <p className="text-xs text-slate-400">Daily Active</p>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-slate-800/30">
              <CardContent className="p-3 text-center">
                {summaryLoading ? (
                  <Skeleton className="h-8 w-12 mx-auto" />
                ) : (
                  <p className="text-2xl font-bold text-white">{summary?.kpis?.wau ?? 0}</p>
                )}
                <p className="text-xs text-slate-400">Weekly Active</p>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-slate-800/30">
              <CardContent className="p-3 text-center">
                {summaryLoading ? (
                  <Skeleton className="h-8 w-12 mx-auto" />
                ) : (
                  <p className="text-2xl font-bold text-white">{summary?.kpis?.mau ?? 0}</p>
                )}
                <p className="text-xs text-slate-400">Monthly Active</p>
              </CardContent>
            </Card>
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
                <Activity className="h-4 w-4 text-purple-400" />
                Activation Funnel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {funnel?.steps?.map((step, i) => (
                <FunnelStep 
                  key={step.stepId}
                  label={step.label} 
                  count={step.users}
                  conversion={step.conversionFromPrev}
                  isLoading={funnelLoading}
                />
              ))}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" />
                Switch Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {switchesLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : switchChartData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={switchChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} width={90} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                        labelStyle={{ color: '#f8fafc' }}
                      />
                      <Bar dataKey="completions" name="Completions">
                        {switchChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={SWITCH_COLORS[entry.switchId] || "#8884d8"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic text-center py-8">No switch data yet</p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="outline" className="bg-slate-800/50">
                  Total Views: {switches?.totals?.detailViews ?? 0}
                </Badge>
                <Badge variant="outline" className="bg-slate-800/50">
                  Plans Generated: {switches?.totals?.plansGenerated ?? 0}
                </Badge>
                <Badge variant="outline" className="bg-slate-800/50">
                  Items Completed: {switches?.totals?.itemsCompleted ?? 0}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid md:grid-cols-2 gap-4"
        >
          <Card className="border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-400" />
                TimeBand Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {timebandChartData.length > 0 ? (
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={timebandChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                        labelStyle={{ color: '#f8fafc' }}
                      />
                      <Bar dataKey="value" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic text-center py-8">No data yet</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-green-400" />
                Mode Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {modeChartData.length > 0 ? (
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={modeChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                        labelStyle={{ color: '#f8fafc' }}
                      />
                      <Bar dataKey="value" fill="#22c55e" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic text-center py-8">No data yet</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card className="border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <Flag className="h-4 w-4 text-orange-400" />
                Top Flags (14d)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {flags?.topFlags?.length ? (
                <div className="space-y-2">
                  {flags.topFlags.map(f => (
                    <div key={f.flagKey} className="flex justify-between items-center text-sm">
                      <span className="text-slate-300 capitalize">{f.flagKey.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <Badge variant="secondary">{f.count}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">No flags recorded</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                Errors & Dropoffs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {errorsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300">Errors per session</span>
                    <span className="text-slate-400">{errors?.errorsPerSession ?? 0}</span>
                  </div>
                  {errors?.topErrorCodes?.length ? (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500">Top Error Codes:</p>
                      {errors.topErrorCodes.map((e) => (
                        <div key={e.errorCode} className="flex justify-between text-sm">
                          <code className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300">
                            {e.errorCode}
                          </code>
                          <span className="text-slate-400">{e.count}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic">No errors recorded</p>
                  )}
                  {errors?.topScreens?.length ? (
                    <div className="space-y-2 mt-4">
                      <p className="text-xs text-slate-500">Top Screens with Errors:</p>
                      {errors.topScreens.map((s) => (
                        <div key={s.screenId} className="flex justify-between text-sm">
                          <span className="text-slate-300">{s.screenId}</span>
                          <span className="text-slate-400">{s.count}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </ScrollArea>
  );
}
