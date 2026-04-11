import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { PageHeader } from "@/components/page-header";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from "recharts";
import { Dumbbell, Flame, Clock, Trophy, TrendingUp, ChevronRight } from "lucide-react";

interface AnalyticsData {
  weeklyActivity: { week: string; session_count: number; total_seconds: number }[];
  personalRecords: { title: string; max_weight: number; max_sets: number; last_logged: string }[];
  totalSessions: number;
  totalMinutes: number;
  thisWeek: number;
}

function formatWeek(w: string) {
  if (!w) return "";
  const [year, week] = w.split("-W");
  return `W${week}`;
}

export default function WorkoutAnalyticsPage() {
  usePageMeta({ title: "Workout Analytics | DW Wellness AI" });
  const [, setLocation] = useLocation();

  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/workout-sessions/analytics"],
    staleTime: 60000,
  });

  const weeklyChartData = (data?.weeklyActivity || []).map(w => ({
    week: formatWeek(w.week),
    sessions: Number(w.session_count),
    minutes: Math.round(Number(w.total_seconds) / 60),
  }));

  return (
    <div className="min-h-screen pb-24">
      <PageHeader title="Workout Analytics" subtitle="Your strength & consistency over time" />

      <div className="max-w-2xl mx-auto px-4 space-y-5 pt-2">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Dumbbell, label: "Total Sessions", value: isLoading ? "—" : String(data?.totalSessions ?? 0), color: "text-violet-500" },
            { icon: Clock, label: "Total Minutes", value: isLoading ? "—" : String(data?.totalMinutes ?? 0), color: "text-blue-500" },
            { icon: Flame, label: "This Week", value: isLoading ? "—" : String(data?.thisWeek ?? 0), color: "text-orange-500" },
          ].map(({ icon: Icon, label, value, color }) => (
            <Card key={label} className="text-center">
              <CardContent className="pt-4 pb-3 px-2">
                <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
                <div className="text-2xl font-bold">{value}</div>
                <div className="text-[11px] text-muted-foreground leading-tight">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Weekly activity bar chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Weekly Activity (last 16 weeks)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : weeklyChartData.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
                <Dumbbell className="w-8 h-8 opacity-30" />
                <p>No completed sessions yet. Log your first workout!</p>
                <Button size="sm" onClick={() => setLocation("/workout")} data-testid="button-go-workout">
                  Go to Workout
                </Button>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={weeklyChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    formatter={(v: number, name: string) => [v, name === "sessions" ? "Sessions" : "Minutes"]}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Bar dataKey="sessions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Minutes per week line chart */}
        {!isLoading && weeklyChartData.length > 1 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                Minutes Trained per Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={weeklyChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => [`${v} min`, "Minutes"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Line type="monotone" dataKey="minutes" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Personal Records */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              Personal Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : !data?.personalRecords?.length ? (
              <div className="text-center text-sm text-muted-foreground py-6">
                <Trophy className="w-8 h-8 opacity-30 mx-auto mb-2" />
                Complete strength sessions to track your PRs here.
              </div>
            ) : (
              <div className="space-y-2">
                {data.personalRecords.map((pr, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/40">
                    <Badge variant="outline" className="text-yellow-600 border-yellow-400/40 bg-yellow-400/10 shrink-0">#{i + 1}</Badge>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{pr.title}</div>
                      {pr.last_logged && (
                        <div className="text-xs text-muted-foreground">
                          {new Date(pr.last_logged).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {pr.max_weight ? (
                        <div className="font-bold text-sm">{pr.max_weight} kg</div>
                      ) : (
                        <div className="text-xs text-muted-foreground">{pr.max_sets} sets</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => setLocation("/workout")}
          data-testid="button-back-to-workout"
        >
          <Dumbbell className="w-4 h-4 mr-2" />
          Go to Workout
          <ChevronRight className="w-4 h-4 ml-auto" />
        </Button>
      </div>
    </div>
  );
}
