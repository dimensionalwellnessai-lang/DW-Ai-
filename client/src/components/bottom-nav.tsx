import { useLocation } from "wouter";
import { Home, CalendarDays, MessageCircle, Search, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  path: string;
  icon: typeof MessageCircle;
  label: string;
}

// Map paths to tour data attributes
const tourDataMap: Record<string, string> = {
  "/": "home",
  "/calendar": "calendar",
  "/talk": "chat",
  "/browse": "browse",
  "/journal": "journal",
};

export function BottomNav() {
  const [location, setLocation] = useLocation();

  const navItems: NavItem[] = [
    { path: "/calendar", icon: CalendarDays, label: "Calendar" },
    { path: "/browse", icon: Search, label: "Browse" },
    { path: "/", icon: Home, label: "Home" },
    { path: "/talk", icon: MessageCircle, label: "DW" },
    { path: "/journal", icon: BookOpen, label: "Journal" },
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background backdrop-blur-xl"
      style={{ 
        paddingBottom: 'var(--bottom-nav-padding, 32px)'
      }}
      data-testid="nav-bottom"
      role="navigation"
    >
      <div className="flex items-center justify-around h-14 w-full px-2">
        {navItems.map((item) => {
          const isActive = item.path && (location === item.path || 
            (item.path !== "/" && location.startsWith(item.path)));
          const tourAttr = item.path ? tourDataMap[item.path] : undefined;
          
          return (
            <button
              key={item.label}
              onClick={() => item.path && setLocation(item.path)}
              className={cn(
                "flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all duration-200",
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
                "p-1.5 rounded-lg transition-all duration-200",
                isActive && "bg-primary/10"
              )}>
                <item.icon className={cn(
                  "h-5 w-5 transition-transform duration-200",
                  isActive && "scale-110"
                )} />
              </div>
              <span className={cn(
                "text-[10px] font-medium mt-0.5 transition-all",
                isActive && "font-semibold"
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