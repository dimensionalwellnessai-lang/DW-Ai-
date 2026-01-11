import { Link, useLocation } from "wouter";
import { MessageCircle, CalendarDays, Sparkles, BookOpen, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  path: string;
  icon: typeof MessageCircle;
  label: string;
}

const navItems: NavItem[] = [
  { path: "/plans", icon: Sparkles, label: "Plan" },
  { path: "/", icon: CalendarDays, label: "Today" },
  { path: "/chat", icon: MessageCircle, label: "DW" },
  { path: "/journal", icon: BookOpen, label: "Journal" },
  { path: "/settings", icon: User, label: "Profile" },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/80 backdrop-blur-xl safe-area-bottom"
      data-testid="nav-bottom"
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const isActive = location === item.path || 
            (item.path !== "/" && location.startsWith(item.path));
          
          return (
            <Link key={item.path} href={item.path}>
              <button
                className={cn(
                  "flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all duration-200",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
                data-testid={`nav-${item.label.toLowerCase()}`}
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
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
