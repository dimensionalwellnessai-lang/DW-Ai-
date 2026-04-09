import { useState, useEffect } from "react";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { isFeatureEnabled } from "@/config/featureFlags";
import { useWeeklyReview } from "@/hooks/use-weekly-review";
import { useElevationPlan } from "@/hooks/use-elevation-plan";
import { useLearningProfile } from "@/hooks/use-learning-profile";
import {
  getGuestElevationPlanFull,
  getGuestElevationPlans,
} from "@/lib/elevation-plan-storage";
import {
  CheckCircle2,
  AlertCircle,
  Sparkles,
  TrendingUp,
  MessageSquare,
  ChevronRight,
  Loader2,
  Trophy,
  Zap,
} from "lucide-react";

/** Max friction points included in the new plan generation context */
const MAX_FRICTION_CONTEXT = 3;

/** Returns "planId" from query string. */
function usePlanIdParam(): string | null {
  const searchParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  return searchParams.get("id");
}

// ── Recap section ─────────────────────────────────────────────────────────────

function RecapBadge({ label, variant }: { label: string; variant: "win" | "friction" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        variant === "win"
          ? "bg-green-500/15 text-green-400 border border-green-500/25"
          : "bg-yellow-500/15 text-yellow-400 border border-yellow-500/25"
      }`}
    >
      {variant === "win" ? (
        <CheckCircle2 className="h-3 w-3 shrink-0" />
      ) : (
        <AlertCircle className="h-3 w-3 shrink-0" />
      )}
      {label}
    </span>
  );
}

function CompletionRing({ rate }: { rate: number }) {
  const circumference = 2 * Math.PI * 28;
  const offset = circumference - (rate / 100) * circumference;
  const color = rate >= 70 ? "#22c55e" : rate >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      <svg width="80" height="80" className="rotate-[-90deg]">
        <circle cx="40" cy="40" r="28" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
        <circle
          cx="40"
          cy="40"
          r="28"
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <span className="absolute text-base font-bold text-foreground">{rate}%</span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function WeeklyReviewPage() {
  usePageMeta("Weekly Review", "Reflect on last week and plan your next elevation.");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const isLoggedIn = Boolean(user);
  const enabled = isFeatureEnabled("WEEKLY_REVIEW");

  const planId = usePlanIdParam();
  const { data, review, plan, days, isLoading, submitReview, isSubmitting } = useWeeklyReview(planId);

  const { generateDraft, isGenerating } = useElevationPlan();
  const { personalizationReasons, recommendedFocusDimension } = useLearningProfile();

  // Form state
  const [feedbackWorked, setFeedbackWorked] = useState("");
  const [feedbackImprove, setFeedbackImprove] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [proposingNew, setProposingNew] = useState(false);

  // Pre-fill form if a draft exists
  useEffect(() => {
    if (review) {
      setFeedbackWorked(review.feedbackWorked ?? "");
      setFeedbackImprove(review.feedbackImprove ?? "");
      if (review.status === "submitted") setSubmitted(true);
    }
  }, [review]);

  if (!enabled) {
    return (
      <div className="bg-background">
        <PageHeader title="Weekly Review" />
        <div className="p-4 max-w-lg mx-auto text-center">
          <p className="text-muted-foreground">This feature is not yet enabled.</p>
        </div>
      </div>
    );
  }

  if (!planId) {
    return (
      <div className="bg-background">
        <PageHeader title="Weekly Review" />
        <div className="p-4 max-w-lg mx-auto text-center space-y-3 pt-8">
          <TrendingUp className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">No plan specified. Open this page from your elevation plan.</p>
          <Button variant="outline" onClick={() => navigate("/elevation-plan")}>
            View Elevation Plan
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-background">
        <PageHeader title="Weekly Review" />
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!data || !review || !plan) {
    return (
      <div className="bg-background">
        <PageHeader title="Weekly Review" />
        <div className="p-4 max-w-lg mx-auto text-center space-y-3 pt-8">
          <p className="text-muted-foreground">Could not load plan data. Please try again.</p>
          <Button variant="outline" onClick={() => navigate("/elevation-plan")}>
            Back to Plan
          </Button>
        </div>
      </div>
    );
  }

  const handleSaveDraft = async () => {
    try {
      await submitReview({ feedbackWorked, feedbackImprove, status: "draft" });
      toast({ title: "Draft saved." });
    } catch {
      toast({ title: "Could not save draft", variant: "destructive" });
    }
  };

  const handleSubmit = async () => {
    try {
      await submitReview({
        feedbackWorked,
        feedbackImprove,
        wins: review.wins,
        frictionPoints: review.frictionPoints,
        status: "submitted",
      });
      setSubmitted(true);
      toast({ title: "Review submitted! Plan archived. 🎉" });
    } catch {
      toast({ title: "Could not submit review", variant: "destructive" });
    }
  };

  const handleProposeNewPlan = async () => {
    setProposingNew(true);
    try {
      const context = [
        feedbackWorked && `What worked: ${feedbackWorked}`,
        feedbackImprove && `To improve: ${feedbackImprove}`,
        review.frictionPoints.length > 0 && `Friction areas: ${review.frictionPoints.slice(0, MAX_FRICTION_CONTEXT).join(", ")}`,
        personalizationReasons.length > 0 && personalizationReasons.join("; "),
      ]
        .filter(Boolean)
        .join(". ");

      const result = await generateDraft({
        reasons: context || undefined,
        focusDimension: recommendedFocusDimension ?? undefined,
      });

      if (!isLoggedIn && result) {
        navigate(`/elevation-plan?id=${result.plan.id}`);
      } else {
        navigate("/elevation-plan");
      }
    } catch {
      toast({ title: "Could not generate plan", variant: "destructive" });
    } finally {
      setProposingNew(false);
    }
  };

  const wins = review.wins ?? [];
  const frictionPoints = review.frictionPoints ?? [];
  const completionRate = review.completionRate ?? 0;

  return (
    <div className="bg-background">
      <PageHeader title="Weekly Review" />
      <div className="p-4 pb-28 max-w-lg mx-auto space-y-5">

        {/* Plan title */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="card-modern bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Reviewing</p>
                  <h2 className="font-semibold text-foreground">{plan.title}</h2>
                  {plan.goal && <p className="text-sm text-muted-foreground mt-0.5">{plan.goal}</p>}
                </div>
                <Badge
                  variant="outline"
                  className="shrink-0 border-purple-500/40 text-purple-400 bg-purple-500/10"
                >
                  {plan.startDate} → {plan.endDate}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Completion ring + summary */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="card-modern">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <CompletionRing rate={completionRate} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Completion Rate</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {completionRate >= 70
                      ? "Great week – you followed through!"
                      : completionRate >= 40
                      ? "Solid effort – some things clicked."
                      : "Life happened. That's okay."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Wins */}
        {wins.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="card-modern">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="h-4 w-4 text-green-400" />
                  <span className="text-sm font-medium text-foreground">What you completed</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {wins.map((w, i) => (
                    <RecapBadge key={i} label={w} variant="win" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Friction */}
        {frictionPoints.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="card-modern">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="h-4 w-4 text-yellow-400" />
                  <span className="text-sm font-medium text-foreground">What had friction</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {frictionPoints.map((f, i) => (
                    <RecapBadge key={i} label={f} variant="friction" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Feedback form */}
        {!submitted && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="card-modern">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Your reflection</span>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">What worked well for you this week?</label>
                  <Textarea
                    value={feedbackWorked}
                    onChange={(e) => setFeedbackWorked(e.target.value)}
                    placeholder="e.g. Morning workouts felt energising, evening reflection helped me wind down…"
                    className="resize-none text-sm"
                    rows={3}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">What would you change or improve?</label>
                  <Textarea
                    value={feedbackImprove}
                    onChange={(e) => setFeedbackImprove(e.target.value)}
                    placeholder="e.g. Nutrition actions were too rigid, I want more flexibility…"
                    className="resize-none text-sm"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={handleSaveDraft}
                    disabled={isSubmitting}
                  >
                    Save draft
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                    )}
                    Submit review
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Post-submit: Propose new plan CTA */}
        {submitted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="card-modern bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
              <CardContent className="p-5 space-y-4 text-center">
                <div className="w-12 h-12 mx-auto bg-green-500/20 rounded-2xl flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Review complete!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your plan is archived. Ready to build next week's elevation plan?
                  </p>
                  {personalizationReasons.length > 0 && (
                    <p className="text-xs text-muted-foreground/70 mt-1 italic">
                      {personalizationReasons[0]}
                    </p>
                  )}
                </div>
                <Button
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white"
                  onClick={handleProposeNewPlan}
                  disabled={isGenerating || proposingNew}
                >
                  {isGenerating || proposingNew ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Building your plan…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Propose next 7-day plan
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground"
                  onClick={() => navigate("/elevation-plan")}
                >
                  Skip for now
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Already submitted: show summary + new plan CTA */}
        {submitted && review.feedbackWorked && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="card-modern">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Your reflection</span>
                </div>
                {review.feedbackWorked && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">What worked</p>
                    <p className="text-sm text-foreground">{review.feedbackWorked}</p>
                  </div>
                )}
                {review.feedbackImprove && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">What to improve</p>
                    <p className="text-sm text-foreground">{review.feedbackImprove}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* View plan history */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground"
            onClick={() => navigate("/elevation-plan?tab=history")}
          >
            View plan history
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </motion.div>

      </div>
    </div>
  );
}
