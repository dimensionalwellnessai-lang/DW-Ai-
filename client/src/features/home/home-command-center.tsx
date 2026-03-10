import { useCallback } from "react";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { useHomeSummary } from "./useHomeSummary";
import { CommandCenterCard } from "./components/CommandCenterCard";
import { MOCK_HOME_DATA } from "./homeData";
import {
  CalendarDays,
  Lightbulb,
  Target,
  Heart,
  TrendingUp,
  Sparkles,
  BookOpen,
} from "lucide-react";

function CardSkeleton() {
  return (
    <div className="cc-card space-y-3 animate-pulse">
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-3 w-24 rounded" />
      </div>
      <Skeleton className="h-10 rounded-lg" />
    </div>
  );
}

export default function HomeCommandCenter() {
  const summary = useHomeSummary();
  const [, navigate] = useLocation();

  const firstName = summary.userName ? summary.userName.split(" ")[0] : null;
  const mock = MOCK_HOME_DATA;

  const fmtTime = useCallback((d: Date | null, isAllDay: boolean) => {
    if (isAllDay || !d) return "All day";
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }, []);

  const topStreak = summary.activeHabits.reduce((max, h) => Math.max(max, h.streak ?? 0), 0);

  return (
    <div className="flex flex-col h-full cosmic-bg">
      <header className="flex items-center justify-center px-4 shrink-0" style={{ height: 64 }}>
        <h1 className="text-base font-semibold text-foreground font-display" data-testid="text-command-center-title">
          Command Center
        </h1>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-lg mx-auto px-4 pb-32 space-y-3">
          <div className="pb-1">
            <p className="text-lg font-semibold text-foreground font-display" data-testid="text-greeting">
              {getGreeting()}{firstName ? `, ${firstName}` : ""}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5" data-testid="text-today-label">{summary.todayLabel}</p>
          </div>

          {summary.isLoading ? (
            <>
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </>
          ) : (
            <>
              <CommandCenterCard
                title="Today"
                icon={CalendarDays}
                iconColor="text-blue-500"
                dwContext="Help me plan my day today"
                onOpen={() => navigate("/calendar")}
                priority
              >
                {summary.nextEvent ? (
                  <>
                    <p className="text-sm text-foreground" data-testid="text-next-event">
                      {fmtTime(summary.nextEvent.startTime, summary.nextEvent.isAllDay)} — {summary.nextEvent.title}
                    </p>
                    <p className="text-xs text-muted-foreground">Next: {mock.today.workoutStatus}</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-foreground">{mock.today.nextEvent.time} — {mock.today.nextEvent.title}</p>
                    <p className="text-xs text-muted-foreground">Priority: {mock.today.priority}</p>
                  </>
                )}
              </CommandCenterCard>

              <CommandCenterCard
                title="Insight"
                icon={Lightbulb}
                iconColor="text-amber-500"
                dwContext={summary.latestInsight ? `Let's explore this insight: ${summary.latestInsight.title}` : "Share an insight about my patterns"}
                onOpen={() => navigate("/insights")}
                orbState={summary.latestInsight ? "suggestion" : "idle"}
                priority
              >
                {summary.latestInsight ? (
                  <>
                    <p className="text-sm text-foreground line-clamp-2" data-testid="text-insight">{summary.latestInsight.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{summary.latestInsight.category}</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-foreground">{mock.insight.text}</p>
                    <p className="text-xs text-muted-foreground">{mock.insight.tag}</p>
                  </>
                )}
              </CommandCenterCard>

              <CommandCenterCard
                title="Plan"
                icon={Target}
                iconColor="text-violet-500"
                dwContext={summary.activeGoals[0] ? `Let's review my plan: ${summary.activeGoals[0].title}` : "Help me create a life plan"}
                onOpen={() => navigate("/goals")}
                priority
              >
                {summary.activeGoals[0] ? (
                  <>
                    <p className="text-sm text-foreground line-clamp-1" data-testid="text-plan">{summary.activeGoals[0].title}</p>
                    {summary.activeGoals[0].progress != null && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-violet-500 transition-all duration-300"
                            style={{ width: `${summary.activeGoals[0].progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{summary.activeGoals[0].progress}%</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-sm text-foreground">{mock.plan.title}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-muted">
                        <div className="h-full rounded-full bg-violet-500" style={{ width: `${mock.plan.progress}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground">{mock.plan.badge}</span>
                    </div>
                  </>
                )}
              </CommandCenterCard>

              <CommandCenterCard
                title="Health"
                icon={Heart}
                iconColor="text-rose-500"
                dwContext="How is my health tracking looking?"
                onOpen={() => navigate("/body")}
              >
                {summary.activeHabits.length > 0 ? (
                  <>
                    <p className="text-sm text-foreground" data-testid="text-health">
                      {summary.activeHabits.length} active habit{summary.activeHabits.length !== 1 ? "s" : ""}
                    </p>
                    {topStreak > 0 && (
                      <p className="text-xs text-muted-foreground">{topStreak} day streak 🔥</p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-sm text-foreground">{mock.health.proteinStatus}</p>
                    <p className="text-xs text-muted-foreground">{mock.health.caloriesRemaining} calories remaining</p>
                  </>
                )}
              </CommandCenterCard>

              <CommandCenterCard
                title="Momentum"
                icon={TrendingUp}
                iconColor="text-emerald-500"
                dwContext="How is my momentum looking?"
                onOpen={() => navigate("/goals")}
              >
                {summary.momentumData && summary.momentumData.status ? (
                  <>
                    <p className="text-sm text-foreground capitalize" data-testid="text-momentum">{summary.momentumData.status}</p>
                    {summary.momentumData.suggestedFocus && (
                      <p className="text-xs text-muted-foreground line-clamp-1">Focus: {summary.momentumData.suggestedFocus}</p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-sm text-foreground">{mock.momentum.streakLabel}</p>
                    {topStreak > 0 && <p className="text-xs text-muted-foreground">{topStreak} day streak</p>}
                  </>
                )}
              </CommandCenterCard>

              <CommandCenterCard
                title="DW Prompt"
                icon={Sparkles}
                iconColor="text-indigo-400"
                dwContext={summary.activeFollowUp?.prompt ?? "What is taking the most energy from you today?"}
                orbState="suggestion"
              >
                <p className="text-sm text-foreground/80 italic" data-testid="text-prompt">
                  "{summary.activeFollowUp?.prompt ?? "What is taking the most energy from you today?"}"
                </p>
              </CommandCenterCard>

              <CommandCenterCard
                title="Journal"
                icon={BookOpen}
                iconColor="text-teal-500"
                dwContext={summary.latestJournalEntry ? `Let's talk about my journal entry: ${summary.latestJournalEntry.title}` : "Help me start a reflection"}
                onOpen={() => navigate("/journal")}
              >
                {summary.latestJournalEntry ? (
                  <>
                    <p className="text-sm text-foreground line-clamp-1" data-testid="text-journal">{summary.latestJournalEntry.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{summary.latestJournalEntry.story}</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Start a reflection to see it here</p>
                )}
              </CommandCenterCard>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
