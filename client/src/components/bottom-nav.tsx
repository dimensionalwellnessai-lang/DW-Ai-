import { useLocation } from "wouter";
import { Sun, MessageCircle, Layers, Calendar, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

interface NavItem {
  id: string;
  path: string;
  icon: typeof Sun;
  label: string;
  showDot?: boolean;
  /** Destination paths reached after router redirects from `path` */
  aliases?: string[];
}

const tourDataMap: Record<string, string> = {
  "/command-center": "today",
  "/guidance": "dw",
  "/my-life": "life",
  "/calendar-schedule": "calendar",
  "/insights": "insights",
};

export function BottomNav() {
  const [location, setLocation] = useLocation();

  const { data: habits = [] } = useQuery<any[]>({
    queryKey: ["/api/habits"],
    staleTime: 60000,
  });

  const hasUnfinishedHabits = Array.isArray(habits) &&
    habits.some((h: any) => h.isActive !== false && !h.completedToday);

  // Roadmap §15.6: Five surfaces only — Today, DW, Life Areas, Calendar, Insights
  const navItems: NavItem[] = [
    { id: "today", path: "/command-center", icon: Sun, label: "Today", aliases: ["/today"] },
    { id: "dw", path: "/guidance", icon: MessageCircle, label: "DW" },
    { id: "life-areas", path: "/my-life", icon: Layers, label: "Life Areas", aliases: ["/life-dimensions", "/life-system"] },
    { id: "calendar", path: "/calendar-schedule", icon: Calendar, label: "Calendar", aliases: ["/calendar-month", "/daily-schedule"] },
    { id: "insights", path: "/insights", icon: Lightbulb, label: "Insights" },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        paddingBottom: 'var(--bottom-nav-padding, 32px)',
        background: 'hsl(var(--background) / 0.78)',
        backdropFilter: 'blur(28px) saturate(200%)',
        WebkitBackdropFilter: 'blur(28px) saturate(200%)',
        borderTop: '1px solid hsl(var(--border) / 0.35)',
        boxShadow: '0 -1px 0 rgba(255,255,255,0.025), 0 -8px 32px rgba(0,0,0,0.12)',
      }}
      data-testid="nav-bottom"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around h-12 w-full max-w-xl mx-auto px-2">
        {navItems.map((item) => {
          const allPaths = [item.path, ...(item.aliases ?? [])];
          const isActive = allPaths.some(
            (p) => p && (location === p || (p !== "/" && location.startsWith(p + "/")))
          );
          const tourAttr = item.path ? tourDataMap[item.path] : undefined;
          const showAttentionDot = item.id === "today" && hasUnfinishedHabits && !isActive;

          return (
            <button
              key={item.label}
              onClick={() => item.path && setLocation(item.path)}
              className={cn(
                "flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-all duration-200 relative",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              )}
              data-testid={`nav-${item.id}`}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              {...(tourAttr && { "data-tour": tourAttr })}
            >
              <div
                className={cn(
                  "relative p-1.5 rounded-xl transition-all duration-200",
                  isActive && "bg-primary/12 shadow-sm"
                )}
                style={isActive ? {
                  boxShadow: '0 0 12px hsl(var(--primary) / 0.25)',
                } : undefined}
              >
                <item.icon
                  className={cn(
                    "h-[19px] w-[19px] transition-all duration-200",
                    isActive && "scale-110"
                  )}
                  aria-hidden="true"
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                {showAttentionDot && (
                  <span
                    className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-orange-500 border-2 border-background"
                    aria-label="Habits need attention"
                  />
                )}
              </div>
              <span className={cn(
                "text-[9px] font-medium mt-0.5 transition-all tracking-tight",
                isActive ? "font-semibold text-primary opacity-100" : "opacity-70"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
