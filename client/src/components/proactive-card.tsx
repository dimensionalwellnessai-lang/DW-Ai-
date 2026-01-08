import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  ArrowRight, 
  X,
  Sun,
  Moon,
  Zap,
  Heart,
  Brain,
  Target,
  Calendar,
  Dumbbell,
  UtensilsCrossed
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ProactiveCardType = 
  | "morning-briefing"
  | "energy-suggestion"
  | "goal-reminder"
  | "workout-suggestion"
  | "meal-suggestion"
  | "wind-down"
  | "pattern-insight"
  | "check-in-prompt";

export interface ProactiveCardProps {
  type: ProactiveCardType;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  className?: string;
  priority?: "high" | "medium" | "low";
}

const typeConfig: Record<ProactiveCardType, { 
  icon: typeof Sparkles; 
  gradient: string;
  iconColor: string;
}> = {
  "morning-briefing": { 
    icon: Sun, 
    gradient: "from-amber-500/20 to-orange-500/20",
    iconColor: "text-amber-500"
  },
  "energy-suggestion": { 
    icon: Zap, 
    gradient: "from-emerald-500/20 to-teal-500/20",
    iconColor: "text-emerald-500"
  },
  "goal-reminder": { 
    icon: Target, 
    gradient: "from-purple-500/20 to-pink-500/20",
    iconColor: "text-purple-500"
  },
  "workout-suggestion": { 
    icon: Dumbbell, 
    gradient: "from-blue-500/20 to-cyan-500/20",
    iconColor: "text-blue-500"
  },
  "meal-suggestion": { 
    icon: UtensilsCrossed, 
    gradient: "from-green-500/20 to-emerald-500/20",
    iconColor: "text-green-500"
  },
  "wind-down": { 
    icon: Moon, 
    gradient: "from-indigo-500/20 to-purple-500/20",
    iconColor: "text-indigo-500"
  },
  "pattern-insight": { 
    icon: Brain, 
    gradient: "from-violet-500/20 to-fuchsia-500/20",
    iconColor: "text-violet-500"
  },
  "check-in-prompt": { 
    icon: Heart, 
    gradient: "from-rose-500/20 to-pink-500/20",
    iconColor: "text-rose-500"
  },
};

export function ProactiveCard({
  type,
  title,
  message,
  actionLabel,
  onAction,
  onDismiss,
  className,
  priority = "medium",
}: ProactiveCardProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <Card 
      className={cn(
        "relative overflow-visible border-0 shadow-lg",
        "bg-gradient-to-br",
        config.gradient,
        "dark:glass dark:border dark:border-white/10",
        priority === "high" && "ring-2 ring-primary/30",
        className
      )}
      data-testid={`proactive-card-${type}`}
    >
      {onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6 opacity-60 hover:opacity-100"
          onClick={onDismiss}
          data-testid="button-dismiss-card"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
      
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center",
            "bg-background/50 dark:bg-white/10"
          )}>
            <Icon className={cn("h-5 w-5", config.iconColor)} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-3 w-3 text-primary" />
              <span className="text-xs font-medium text-primary">DW suggests</span>
            </div>
            
            <h3 className="font-semibold text-sm mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
            
            {actionLabel && onAction && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 -ml-2 text-primary hover:text-primary"
                onClick={onAction}
                data-testid="button-proactive-action"
              >
                {actionLabel}
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProactiveCardStack({ 
  cards, 
  maxVisible = 3 
}: { 
  cards: ProactiveCardProps[];
  maxVisible?: number;
}) {
  const visibleCards = cards.slice(0, maxVisible);
  
  if (visibleCards.length === 0) return null;

  return (
    <div className="space-y-3" data-testid="proactive-card-stack">
      {visibleCards.map((card, index) => (
        <div 
          key={`${card.type}-${index}`}
          className="animate-fade-in-up"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <ProactiveCard {...card} />
        </div>
      ))}
      {cards.length > maxVisible && (
        <p className="text-xs text-muted-foreground text-center">
          +{cards.length - maxVisible} more suggestions
        </p>
      )}
    </div>
  );
}
