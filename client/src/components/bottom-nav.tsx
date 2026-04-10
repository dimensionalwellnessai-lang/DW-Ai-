import { useLocation } from "wouter";
import { Home, CalendarDays, MessageCircle, Search, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

interface NavItem {
  path: string;
  icon: typeof MessageCircle;
  label: string;
  showDot?: boolean;
}

const tourDataMap: Record<string, string> = {
  "/command-center": "home",
  "/calendar": "calendar",
  "/talk": "chat",
  "/browse": "browse",
  "/journal": "journal",
};

export function BottomNav() {
  const [location, setLocation] = useLocation();

  const { data: habits = [] } = useQuery<any[]>({
    queryKey: ["/api/habits"],
    staleTime: 60000,
  });

  const hasUnfinishedHabits = Array.isArray(habits) &&
    habits.some((h: any) => h.isActive !== false && !h.completedToday);

  const navItems: NavItem[] = [
    { path: "/calendar", icon: CalendarDays, label: "Calendar" },
    { path: "/browse", icon: Search, label: "Browse" },
    { path: "/command-center", icon: Home, label: "Home" },
    { path: "/talk", icon: MessageCircle, label: "DW" },
    { path: "/journal", icon: BookOpen, label: "Journal" },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t"
      style={{
        paddingBottom: 'var(--bottom-nav-padding, 32px)',
        background: 'hsl(var(--background) / 0.85)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderColor: 'hsl(var(--border) / 0.6)',
      }}
      data-testid="nav-bottom"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around h-12 w-full max-w-xl mx-auto px-2">
        {navItems.map((item) => {
          const isActive = item.path && (location === item.path ||
            (item.path !== "/" && location.startsWith(item.path)));
          const tourAttr = item.path ? tourDataMap[item.path] : undefined;
          const showAttentionDot = item.path === "/command-center" && hasUnfinishedHabits && !isActive;

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
              data-testid={`nav-${item.label.toLowerCase()}`}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              {...(tourAttr && { "data-tour": tourAttr })}
            >
              <div className={cn(
                "relative p-1.5 rounded-xl transition-all duration-200",
                isActive && "bg-primary/12 shadow-sm"
              )}>
                <item.icon className={cn(
                  "h-[19px] w-[19px] transition-transform duration-200",
                  isActive && "scale-110"
                )} aria-hidden="true" />
                {showAttentionDot && (
                  <span
                    className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-orange-500 border-2 border-background"
                    aria-label="Habits need attention"
                  />
                )}
              </div>
              <span className={cn(
                "text-[9px] font-medium mt-0.5 transition-all tracking-tight",
                isActive && "font-semibold text-primary"
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
