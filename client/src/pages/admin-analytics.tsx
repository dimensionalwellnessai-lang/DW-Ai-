import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
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
} from "lucide-react";

interface AdminAnalytics {
  dau: number;
  wau: number;
  mau: number;
  activationRate7d: number;
  d7MeaningfulRetention: number;
  helpedPositiveRate: number;
  funnel: {
    onboardingStarted: number;
    onboardingCompleted: number;
    planGenerated: number;
    planSaved: number;
    planItemCompleted: number;
    checkInSubmitted: number;
  };
  switchPerformance: {
    switchId: string;
    completions: number;
    helpedPositiveRate: number;
  }[];
  errors: {
    errorsPerSession: number;
    topErrorCodes: { code: string; count: number }[];
  };
}

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
              <p className="text-xl font-bold text-white">{value}</p>
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
  total, 
  isLoading = false 
}: { 
  label: string; 
  count: number; 
  total: number;
  isLoading?: boolean;
}) {
  const rate = total > 0 ? Math.round((count / total) * 100) : 0;
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-slate-300">{label}</span>
        {isLoading ? (
          <Skeleton className="h-4 w-16" />
        ) : (
          <span className="text-slate-400">{count} ({rate}%)</span>
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
  const { data: analytics, isLoading, error } = useQuery<AdminAnalytics>({
    queryKey: ["/api/admin/analytics"],
    retry: false,
  });

  if (error) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="h-12 w-12 mx-auto text-red-400 mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">Not Authorized</h1>
        <p className="text-slate-400">
          You don't have permission to access this page.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-4rem)]">
      <div className="p-4 pb-24 space-y-6 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-1"
        >
          <h1 className="text-xl font-bold text-white">Admin Analytics</h1>
          <p className="text-sm text-slate-400">
            Aggregated metrics for growth and debugging
          </p>
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
              value={analytics?.dau ?? "-"} 
              icon={Users}
              color="text-blue-400"
              isLoading={isLoading}
            />
            <KPITile 
              label="Activation (7d)" 
              value={`${analytics?.activationRate7d ?? 0}%`} 
              icon={TrendingUp}
              color="text-green-400"
              isLoading={isLoading}
            />
            <KPITile 
              label="D7 Retention" 
              value={`${analytics?.d7MeaningfulRetention ?? 0}%`} 
              icon={Target}
              color="text-amber-400"
              isLoading={isLoading}
            />
            <KPITile 
              label="Helped Rate" 
              value={`${analytics?.helpedPositiveRate ?? 0}%`} 
              icon={CheckCircle}
              color="text-emerald-400"
              isLoading={isLoading}
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
                {isLoading ? (
                  <Skeleton className="h-8 w-12 mx-auto" />
                ) : (
                  <p className="text-2xl font-bold text-white">{analytics?.dau ?? 0}</p>
                )}
                <p className="text-xs text-slate-400">Daily Active</p>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-slate-800/30">
              <CardContent className="p-3 text-center">
                {isLoading ? (
                  <Skeleton className="h-8 w-12 mx-auto" />
                ) : (
                  <p className="text-2xl font-bold text-white">{analytics?.wau ?? 0}</p>
                )}
                <p className="text-xs text-slate-400">Weekly Active</p>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-slate-800/30">
              <CardContent className="p-3 text-center">
                {isLoading ? (
                  <Skeleton className="h-8 w-12 mx-auto" />
                ) : (
                  <p className="text-2xl font-bold text-white">{analytics?.mau ?? 0}</p>
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
              <FunnelStep 
                label="Onboarding Started" 
                count={analytics?.funnel?.onboardingStarted ?? 0}
                total={analytics?.funnel?.onboardingStarted ?? 1}
                isLoading={isLoading}
              />
              <FunnelStep 
                label="Onboarding Completed" 
                count={analytics?.funnel?.onboardingCompleted ?? 0}
                total={analytics?.funnel?.onboardingStarted ?? 1}
                isLoading={isLoading}
              />
              <FunnelStep 
                label="Plan Generated" 
                count={analytics?.funnel?.planGenerated ?? 0}
                total={analytics?.funnel?.onboardingCompleted ?? 1}
                isLoading={isLoading}
              />
              <FunnelStep 
                label="Plan Saved" 
                count={analytics?.funnel?.planSaved ?? 0}
                total={analytics?.funnel?.planGenerated ?? 1}
                isLoading={isLoading}
              />
              <FunnelStep 
                label="Plan Item Completed" 
                count={analytics?.funnel?.planItemCompleted ?? 0}
                total={analytics?.funnel?.planSaved ?? 1}
                isLoading={isLoading}
              />
              <FunnelStep 
                label="Check-in Submitted" 
                count={analytics?.funnel?.checkInSubmitted ?? 0}
                total={analytics?.funnel?.planItemCompleted ?? 1}
                isLoading={isLoading}
              />
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
                <AlertTriangle className="h-4 w-4 text-red-400" />
                Errors & Dropoffs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300">Errors per session</span>
                    <span className="text-slate-400">{analytics?.errors?.errorsPerSession ?? 0}</span>
                  </div>
                  {analytics?.errors?.topErrorCodes?.length ? (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500">Top Error Codes:</p>
                      {analytics.errors.topErrorCodes.map((e) => (
                        <div key={e.code} className="flex justify-between text-sm">
                          <code className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300">
                            {e.code}
                          </code>
                          <span className="text-slate-400">{e.count}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic">No errors recorded</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </ScrollArea>
  );
}
