import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles,
  TrendingUp,
  Target,
  Heart,
  Brain,
  Utensils,
  Dumbbell,
  Sun,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface TopicSuggestionCardProps {
  dimension?: string;
  goal?: string;
  habit?: string;
  title: string;
  description: string;
  topicKeywords: string[];
  onExplore: (topic: string) => void;
  className?: string;
}

const dimensionIcons: Record<string, typeof Heart> = {
  body: Heart,
  mind: Brain,
  nutrition: Utensils,
  fitness: Dumbbell,
  energy: Sun,
  growth: TrendingUp,
  default: Target,
};

const dimensionColors: Record<string, string> = {
  body: "from-red-500/20 to-pink-500/20 border-red-500/20",
  mind: "from-purple-500/20 to-indigo-500/20 border-purple-500/20",
  nutrition: "from-green-500/20 to-emerald-500/20 border-green-500/20",
  fitness: "from-blue-500/20 to-cyan-500/20 border-blue-500/20",
  energy: "from-amber-500/20 to-orange-500/20 border-amber-500/20",
  growth: "from-teal-500/20 to-green-500/20 border-teal-500/20",
  default: "from-gray-500/20 to-slate-500/20 border-gray-500/20",
};

export function TopicSuggestionCard({
  dimension,
  goal,
  habit,
  title,
  description,
  topicKeywords,
  onExplore,
  className,
}: TopicSuggestionCardProps) {
  const dimensionKey = dimension?.toLowerCase() || "default";
  const Icon = dimensionIcons[dimensionKey] || dimensionIcons.default;
  const gradient = dimensionColors[dimensionKey] || dimensionColors.default;

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-200 hover:shadow-lg border",
      gradient,
      className
    )}>
      <CardContent className="p-4 space-y-3">
        {/* Header with AI badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-background/50 backdrop-blur-sm">
              <Icon className="w-4 h-4" />
            </div>
            <Badge variant="secondary" className="text-xs flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              AI Curated
            </Badge>
          </div>
        </div>

        {/* Context Badge */}
        {(dimension || goal || habit) && (
          <div className="text-xs text-muted-foreground">
            {dimension && (
              <span className="font-medium capitalize">{dimension} dimension</span>
            )}
            {goal && (
              <>
                {dimension && <span> • </span>}
                <span>Goal: {goal}</span>
              </>
            )}
            {habit && (
              <>
                {(dimension || goal) && <span> • </span>}
                <span>Habit: {habit}</span>
              </>
            )}
          </div>
        )}

        {/* Title */}
        <h3 className="font-semibold text-base leading-snug">
          {title}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>

        {/* Topic Keywords */}
        <div className="flex flex-wrap gap-2">
          {topicKeywords.slice(0, 3).map((keyword, idx) => (
            <Button
              key={idx}
              size="sm"
              variant="ghost"
              className="h-7 text-xs hover:bg-background/60"
              onClick={() => onExplore(keyword)}
            >
              {keyword}
              <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
