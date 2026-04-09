import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ChevronRight, Mic, Target, CalendarDays, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAssistantLaunch, getVoicePreferences } from "@/hooks/use-assistant-launch";
import { usePageMeta } from "@/hooks/use-page-meta";
import { logAssistantAction } from "@/lib/assistant-analytics";
import { useEffect } from "react";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export default function DayStartPage() {
  usePageMeta({ title: "Start Your Day — DW" });
  const [, nav] = useLocation();
  const context = useAssistantLaunch();
  const prefs = getVoicePreferences();

  const { data: goals = [] } = useQuery<any[]>({ queryKey: ["/api/goals"] });
  const { data: events = [] } = useQuery<any[]>({ queryKey: ["/api/calendar/events"] });

  const activeGoals = (goals as any[]).filter((g: any) => g.status === "active").slice(0, 3);
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
  const todayEvents = (events as any[])
    .filter((e: any) => {
      if (!e.startTime) return false;
      try {
        const d = new Date(e.startTime);
        return d >= todayStart && d <= todayEnd;
      } catch { return false; }
    })
    .slice(0, 3);

  const nextEvent = todayEvents.find((e: any) => {
    try { return new Date(e.startTime) > new Date(); } catch { return false; }
  });

  useEffect(() => {
    logAssistantAction({
      source: context?.source ?? "internal",
      action: "day_start",
      parameters: {},
      success: true,
    });
  }, []);

  const goToVoice = (topic?: string) => {
    const params = new URLSearchParams({ action: "voice", source: context?.source ?? "internal" });
    if (prefs.autoStartOnAssistantLaunch) params.set("autoVoice", "1");
    if (topic) params.set("topic", topic);
    nav(`/voice?${params}`);
  };

  const goToTalk = (topic?: string) => {
    const params = new URLSearchParams();
    if (topic) params.set("topic", topic);
    nav(`/talk?${params}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background" data-testid="page-day-start">
      {/* Header */}
      <div className="px-5 pt-safe-top pt-10 pb-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-2xl font-bold text-foreground">{getGreeting()}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{formatDate()}</p>
        </motion.div>
      </div>

      <div className="flex-1 px-5 space-y-4 pb-8">
        {/* Next up */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Next up</p>
          {nextEvent ? (
            <button
              className="w-full text-left flex items-center gap-3 p-4 rounded-2xl border border-border/40 bg-card hover:bg-muted/40 transition-all"
              onClick={() => nav("/calendar?view=day")}
              data-testid="card-next-event"
            >
              <div className="p-2 rounded-xl bg-blue-500/10">
                <CalendarDays className="h-5 w-5 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{nextEvent.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(nextEvent.startTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
            </button>
          ) : (
            <div className="p-4 rounded-2xl border border-border/30 bg-muted/20 text-center">
              <p className="text-sm text-muted-foreground">No events remaining today</p>
            </div>
          )}
        </motion.div>

        {/* Top goals */}
        {activeGoals.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Your priorities</p>
            <div className="space-y-2">
              {activeGoals.map((goal: any, i: number) => (
                <button
                  key={goal.id}
                  className="w-full text-left flex items-center gap-3 p-3.5 rounded-2xl border border-border/30 bg-card hover:bg-muted/40 transition-all"
                  onClick={() => nav("/goals")}
                  data-testid={`card-goal-${i}`}
                >
                  <div className="p-1.5 rounded-lg bg-violet-500/10">
                    <Target className="h-4 w-4 text-violet-400" />
                  </div>
                  <p className="text-sm font-medium text-foreground flex-1 truncate">{goal.title}</p>
                  {goal.progress != null && (
                    <span className="text-xs text-muted-foreground shrink-0">{goal.progress}%</span>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* DW prompt */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-primary/10 shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Ready to guide your day?</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                I can walk you through your priorities, flag anything that needs attention, and help you go deeper on anything.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="px-5 pb-safe-bottom pb-8 space-y-3"
      >
        <Button
          className="w-full h-14 text-base gap-3 rounded-2xl"
          onClick={() => goToVoice("Guide me through my day")}
          data-testid="button-start-voice"
        >
          <Mic className="h-5 w-5" />
          Talk to DW now
        </Button>
        <Button
          variant="outline"
          className="w-full h-12 text-sm gap-2 rounded-2xl"
          onClick={() => goToTalk("Guide me through my day")}
          data-testid="button-start-chat"
        >
          Start in chat mode
          <ArrowRight className="h-4 w-4" />
        </Button>
      </motion.div>
    </div>
  );
}
