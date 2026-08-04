import { useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  Calendar,
  Check,
  ChevronLeft,
  Flame,
  MessageCircle,
  Trophy,
  Users,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { usePageMeta } from "@/hooks/use-page-meta";
import { apiRequest, parseApiError } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ActivityT {
  id: string;
  title: string;
  description?: string;
}

interface StatsT {
  participants: number;
  completed: number;
  completionRate: number;
  totalCheckins: number;
  checkinsToday: number;
}

interface ChallengeT {
  id: string;
  title: string;
  description: string | null;
  theme: string | null;
  month: string;
  startDate: string;
  endDate: string;
  activities: ActivityT[];
  targetCheckins: number;
  discussionPostId: string | null;
  badgeTitle: string | null;
  isCurrent?: boolean;
  joined?: boolean;
  completedByMe?: boolean;
  stats?: StatsT;
}

interface CohortMemberT {
  isMe: boolean;
  displayName: string;
  avatarEmoji: string;
  completed: boolean;
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Hub ─────────────────────────────────────────────────────────────────────

function HubView() {
  const { data, isLoading } = useQuery<{ challenges: ChallengeT[] }>({
    queryKey: ["/api/group-challenges"],
  });

  const current = data?.challenges.filter((c) => c.isCurrent) ?? [];
  const upcoming = data?.challenges.filter((c) => !c.isCurrent) ?? [];

  return (
    <div className="p-4 space-y-5 max-w-2xl mx-auto">
      <div className="rounded-xl border bg-gradient-to-br from-primary/10 to-transparent p-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" /> Level up together
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          One themed challenge each month. Join the cohort, check in daily, and earn your badge.
        </p>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      )}

      {data && data.challenges.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No group challenge published yet — check back soon.</p>
        </div>
      )}

      {current.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">This month</h3>
          {current.map((c) => (
            <ChallengeCard key={c.id} challenge={c} />
          ))}
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Coming up</h3>
          {upcoming.map((c) => (
            <ChallengeCard key={c.id} challenge={c} />
          ))}
        </section>
      )}
    </div>
  );
}

function ChallengeCard({ challenge: c }: { challenge: ChallengeT }) {
  return (
    <Link href={`/group-challenges/${c.id}`}>
      <Card className="cursor-pointer hover:bg-accent/50 transition-colors" data-testid={`card-group-challenge-${c.id}`}>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="secondary">{monthLabel(c.month)}</Badge>
            <div className="flex items-center gap-2">
              {c.completedByMe && (
                <Badge className="bg-amber-500/15 text-amber-600 border-transparent">
                  <Award className="w-3 h-3 mr-1" /> Completed
                </Badge>
              )}
              {c.joined && !c.completedByMe && <Badge variant="outline">Joined</Badge>}
            </div>
          </div>
          <p className="font-semibold">{c.title}</p>
          {c.theme && <p className="text-sm text-primary">{c.theme}</p>}
          <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> {c.stats?.participants ?? 0} in cohort
            </span>
            <span className="flex items-center gap-1">
              <Flame className="w-3.5 h-3.5" /> {c.stats?.checkinsToday ?? 0} check-ins today
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// ─── Detail ──────────────────────────────────────────────────────────────────

function DetailView({ challengeId }: { challengeId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const queryKey = [`/api/group-challenges/${challengeId}`];
  const { data, isLoading } = useQuery<{
    challenge: ChallengeT;
    joined: boolean;
    completedByMe: boolean;
    myCheckins: { dateKey: string; activityId: string | null; note: string | null }[];
    cohort: CohortMemberT[];
    stats: StatsT;
  }>({ queryKey });

  const refetch = () => {
    qc.invalidateQueries({ queryKey });
    qc.invalidateQueries({ queryKey: ["/api/group-challenges"] });
  };

  const join = useMutation({
    mutationFn: () => apiRequest("POST", `/api/group-challenges/${challengeId}/join`),
    onSuccess: () => {
      toast({ title: "You're in!", description: "Check in each day you complete the challenge." });
      refetch();
    },
    onError: (e) => toast({ title: parseApiError(e), variant: "destructive" }),
  });

  const leave = useMutation({
    mutationFn: () => apiRequest("POST", `/api/group-challenges/${challengeId}/leave`),
    onSuccess: () => {
      toast({ title: "Left the challenge", description: "Your check-ins are saved if you rejoin." });
      refetch();
    },
    onError: (e) => toast({ title: parseApiError(e), variant: "destructive" }),
  });

  const checkin = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/group-challenges/${challengeId}/checkin`, {
        dateKey: todayKey(),
        ...(selectedActivity ? { activityId: selectedActivity } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      return (await res.json()) as { totalDays: number; completedNow: boolean };
    },
    onSuccess: (d) => {
      setNote("");
      setSelectedActivity(null);
      if (d.completedNow) {
        toast({
          title: "🏅 Challenge complete!",
          description: "You earned the completion badge — it now shows on your community profile.",
        });
      } else {
        toast({ title: `Checked in — day ${d.totalDays}` });
      }
      refetch();
    },
    onError: (e) => toast({ title: parseApiError(e), variant: "destructive" }),
  });

  const openDiscussion = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/group-challenges/${challengeId}/discussion`);
      return (await res.json()) as { postId: string };
    },
    onSuccess: (d) => navigate(`/community/p/${d.postId}`),
    onError: (e) => toast({ title: parseApiError(e), variant: "destructive" }),
  });

  if (isLoading || !data) {
    return (
      <div className="p-4 max-w-2xl mx-auto space-y-3">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  const { challenge: c, stats } = data;
  const myDays = data.myCheckins.length;
  const checkedInToday = data.myCheckins.some((x) => x.dateKey === todayKey());
  const progressPct = Math.min(Math.round((myDays / c.targetCheckins) * 100), 100);
  const ended = new Date(c.endDate).getTime() < Date.now();
  const started = new Date(c.startDate).getTime() <= Date.now();

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto pb-8">
      <Link href="/group-challenges" className="text-sm text-muted-foreground flex items-center gap-1">
        <ChevronLeft className="w-4 h-4" /> Group challenges
      </Link>

      <div>
        <Badge variant="secondary">{monthLabel(c.month)}</Badge>
        <h2 className="text-xl font-semibold mt-2">{c.title}</h2>
        {c.theme && <p className="text-primary text-sm">{c.theme}</p>}
        <p className="text-sm text-muted-foreground mt-2">{c.description}</p>
      </div>

      {/* Cohort stats */}
      <Card>
        <CardContent className="p-4 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-lg font-semibold">{stats.participants}</p>
            <p className="text-xs text-muted-foreground">In cohort</p>
          </div>
          <div>
            <p className="text-lg font-semibold">{stats.checkinsToday}</p>
            <p className="text-xs text-muted-foreground">Check-ins today</p>
          </div>
          <div>
            <p className="text-lg font-semibold">{stats.completionRate}%</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
        </CardContent>
      </Card>

      {/* Join / my progress */}
      {!data.joined ? (
        <Button
          className="w-full"
          disabled={join.isPending || ended}
          onClick={() => join.mutate()}
          data-testid="button-join-challenge"
        >
          {ended ? "Challenge ended" : join.isPending ? "Joining…" : "Join this challenge"}
        </Button>
      ) : (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-medium flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" /> My progress
              </p>
              {data.completedByMe && (
                <Badge className="bg-amber-500/15 text-amber-600 border-transparent">
                  <Award className="w-3 h-3 mr-1" /> {c.badgeTitle ?? "Completed"}
                </Badge>
              )}
            </div>
            <Progress value={progressPct} />
            <p className="text-xs text-muted-foreground">
              {myDays} of {c.targetCheckins} check-ins
              {data.completedByMe ? " — badge earned!" : ""}
            </p>

            {!checkedInToday && started && !ended && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-sm font-medium">Check in for today</p>
                {c.activities.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {c.activities.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setSelectedActivity(selectedActivity === a.id ? null : a.id)}
                        className={`text-xs px-2.5 py-1.5 rounded-md border transition-colors ${
                          selectedActivity === a.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:bg-muted"
                        }`}
                        title={a.description}
                        data-testid={`button-activity-${a.id}`}
                      >
                        {a.title}
                      </button>
                    ))}
                  </div>
                )}
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional note — how did it go?"
                  rows={2}
                  maxLength={500}
                  data-testid="input-checkin-note"
                />
                <Button
                  className="w-full"
                  disabled={checkin.isPending}
                  onClick={() => checkin.mutate()}
                  data-testid="button-checkin"
                >
                  <Check className="w-4 h-4 mr-1" />
                  {checkin.isPending ? "Checking in…" : "Check in"}
                </Button>
              </div>
            )}
            {checkedInToday && (
              <p className="text-sm text-emerald-600 flex items-center gap-1 pt-2 border-t">
                <Check className="w-4 h-4" /> Checked in today — see you tomorrow!
              </p>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground w-full"
              disabled={leave.isPending}
              onClick={() => leave.mutate()}
              data-testid="button-leave-challenge"
            >
              Leave challenge
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Discussion */}
      <Button
        variant="outline"
        className="w-full"
        disabled={openDiscussion.isPending}
        onClick={() => {
          if (c.discussionPostId) navigate(`/community/p/${c.discussionPostId}`);
          else openDiscussion.mutate();
        }}
        data-testid="button-discussion"
      >
        <MessageCircle className="w-4 h-4 mr-2" />
        {c.discussionPostId ? "Open challenge discussion" : "Start the challenge discussion"}
      </Button>

      {/* Cohort */}
      <section className="space-y-2">
        <p className="text-sm font-semibold text-muted-foreground flex items-center gap-1">
          <Users className="w-4 h-4" /> Cohort ({data.cohort.length})
        </p>
        <div className="space-y-1">
          {data.cohort.map((m, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              data-testid={`row-cohort-${i}`}
            >
              <span className="flex items-center gap-2">
                <span>{m.avatarEmoji}</span>
                <span className={m.isMe ? "font-medium" : ""}>
                  {m.displayName}
                  {m.isMe ? " (you)" : ""}
                </span>
              </span>
              {m.completed && <Award className="w-4 h-4 text-amber-500" />}
            </div>
          ))}
          {data.cohort.length === 0 && (
            <p className="text-sm text-muted-foreground">No one has joined yet — be the first!</p>
          )}
        </div>
      </section>
    </div>
  );
}

// ─── Page shell ──────────────────────────────────────────────────────────────

export default function GroupChallengesPage() {
  usePageMeta("Group Challenges", "Monthly level-up challenges you complete together.");
  const [, params] = useRoute("/group-challenges/:id");

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Group Challenges" />
      <div className="flex-1 overflow-auto">
        {params ? <DetailView challengeId={params.id} /> : <HubView />}
      </div>
    </div>
  );
}
