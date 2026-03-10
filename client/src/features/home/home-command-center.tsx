import { useMemo, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { DWOrb } from "@/components/dw-orb";
import { useHomeSummary } from "./useHomeSummary";
import {
  CalendarDays,
  Lightbulb,
  Target,
  Heart,
  TrendingUp,
  Sparkles,
  BookOpen,
  type LucideIcon,
} from "lucide-react";

const AFFIRMATIONS = [
  "You are exactly where you need to be.",
  "Today is yours to shape, not survive.",
  "Progress isn't always visible — but it's happening.",
  "Your energy matters. Protect it.",
  "Small steps still move you forward.",
  "You don't need to have it all figured out.",
  "Rest is productive. Stillness is growth.",
  "You are building something meaningful.",
  "Trust the process you're creating.",
  "Your calm is your power.",
];

interface OrbitModule {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  bgClass: string;
  path: string;
  badge?: string;
}

function getTimeOfDayClass(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 8) return "cc-time--dawn";
  if (hour >= 8 && hour < 12) return "cc-time--morning";
  if (hour >= 12 && hour < 17) return "cc-time--afternoon";
  if (hour >= 17 && hour < 20) return "cc-time--evening";
  return "cc-time--night";
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getDailyAffirmation(): string {
  const dayIndex = Math.floor(Date.now() / 86400000) % AFFIRMATIONS.length;
  return AFFIRMATIONS[dayIndex];
}

export default function HomeCommandCenter() {
  const summary = useHomeSummary();
  const [, navigate] = useLocation();

  const firstName = summary.userName ? summary.userName.split(" ")[0] : null;
  const topStreak = summary.activeHabits.reduce((max, h) => Math.max(max, h.streak ?? 0), 0);

  const modules: OrbitModule[] = useMemo(() => [
    {
      id: "today",
      label: "Today",
      icon: CalendarDays,
      color: "text-blue-400",
      bgClass: "bg-blue-500/15",
      path: "/today",
      badge: summary.nextEvent ? "1" : undefined,
    },
    {
      id: "insight",
      label: "Insight",
      icon: Lightbulb,
      color: "text-amber-400",
      bgClass: "bg-amber-500/15",
      path: "/insights",
      badge: summary.latestInsight ? "•" : undefined,
    },
    {
      id: "plan",
      label: "Plan",
      icon: Target,
      color: "text-violet-400",
      bgClass: "bg-violet-500/15",
      path: "/goals",
      badge: summary.activeGoals[0]?.progress != null ? `${summary.activeGoals[0].progress}%` : undefined,
    },
    {
      id: "health",
      label: "Health",
      icon: Heart,
      color: "text-rose-400",
      bgClass: "bg-rose-500/15",
      path: "/habits",
      badge: topStreak > 0 ? `${topStreak}🔥` : undefined,
    },
    {
      id: "momentum",
      label: "Momentum",
      icon: TrendingUp,
      color: "text-emerald-400",
      bgClass: "bg-emerald-500/15",
      path: "/goals",
    },
    {
      id: "prompt",
      label: "DW",
      icon: Sparkles,
      color: "text-indigo-400",
      bgClass: "bg-indigo-500/15",
      path: "/talk",
    },
    {
      id: "journal",
      label: "Journal",
      icon: BookOpen,
      color: "text-teal-400",
      bgClass: "bg-teal-500/15",
      path: "/journal",
    },
  ], [summary, topStreak]);

  const timeClass = getTimeOfDayClass();
  const affirmation = getDailyAffirmation();

  if (summary.isLoading) {
    return (
      <div className="flex flex-col h-full cosmic-bg">
        <header className="flex items-center justify-center px-4 shrink-0" style={{ height: 64 }}>
          <h1 className="text-base font-semibold text-foreground font-display" data-testid="text-command-center-title">
            Command Center
          </h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <Skeleton className="h-24 w-24 rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full cc-time-bg ${timeClass}`}>
      <header className="flex items-center justify-center px-4 shrink-0" style={{ height: 64 }}>
        <h1 className="text-base font-semibold text-foreground font-display" data-testid="text-command-center-title">
          Command Center
        </h1>
      </header>

      <div className="flex-1 flex flex-col items-center justify-start overflow-auto">
        <div className="w-full max-w-lg px-4 pt-2">
          <p className="text-lg font-semibold text-foreground font-display text-center" data-testid="text-greeting">
            {getGreeting()}{firstName ? `, ${firstName}` : ""}
          </p>
          <p className="text-xs text-muted-foreground text-center mt-0.5" data-testid="text-today-label">
            {summary.todayLabel}
          </p>
        </div>

        <div className="relative flex-1 flex items-center justify-center w-full max-w-sm mx-auto" style={{ minHeight: 340 }}>
          <div className="orbit-ring absolute rounded-full border border-border/20" style={{ width: 280, height: 280 }} />

          <div className="relative z-10">
            <DWOrb
              size={80}
              state="idle"
              onTap={() => navigate("/talk")}
              label="Talk with DW"
            />
          </div>

          {modules.map((mod, i) => {
            const angle = (i * 360) / modules.length - 90;
            const radius = 140;
            const x = Math.cos((angle * Math.PI) / 180) * radius;
            const y = Math.sin((angle * Math.PI) / 180) * radius;

            return (
              <OrbitIcon
                key={mod.id}
                module={mod}
                x={x}
                y={y}
                onTap={() => navigate(mod.path)}
                onLongPress={() => navigate(`/talk?topic=${encodeURIComponent(mod.label)}`)}
              />
            );
          })}
        </div>

        <div className="w-full max-w-sm px-6 pb-6 text-center">
          <p className="text-sm text-foreground/70 italic font-body leading-relaxed" data-testid="text-affirmation">
            "{affirmation}"
          </p>

          {summary.nextEvent && (
            <button
              type="button"
              onClick={() => navigate("/today")}
              className="mt-4 w-full cc-card text-left"
              data-testid="btn-next-event"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Next up</p>
              <p className="text-sm font-medium text-foreground line-clamp-1 mt-0.5">{summary.nextEvent.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {summary.nextEvent.isAllDay
                  ? "All day"
                  : summary.nextEvent.startTime?.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) ?? ""}
              </p>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function OrbitIcon({
  module,
  x,
  y,
  onTap,
  onLongPress,
}: {
  module: OrbitModule;
  x: number;
  y: number;
  onTap: () => void;
  onLongPress: () => void;
}) {
  const Icon = module.icon;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const startPress = useCallback(() => {
    didLongPress.current = false;
    timerRef.current = setTimeout(() => {
      didLongPress.current = true;
      onLongPress();
    }, 500);
  }, [onLongPress]);

  const endPress = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleClick = useCallback(() => {
    if (!didLongPress.current) {
      onTap();
    }
    didLongPress.current = false;
  }, [onTap]);

  return (
    <button
      type="button"
      onClick={handleClick}
      onPointerDown={startPress}
      onPointerUp={endPress}
      onPointerLeave={endPress}
      onContextMenu={(e) => e.preventDefault()}
      className="absolute flex flex-col items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl transition-transform duration-200 active:scale-95"
      style={{
        transform: `translate(${x}px, ${y}px)`,
        left: "50%",
        top: "50%",
        marginLeft: -28,
        marginTop: -28,
      }}
      aria-label={`${module.label}. Long press to talk with DW.`}
      data-testid={`orbit-icon-${module.id}`}
    >
      <div className={`relative p-3 rounded-2xl ${module.bgClass} backdrop-blur-sm border border-white/5`}>
        <Icon className={`h-5 w-5 ${module.color}`} />
        {module.badge && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold leading-none">
            {module.badge}
          </span>
        )}
      </div>
      <span className="text-[10px] font-medium text-foreground/70">{module.label}</span>
    </button>
  );
}
