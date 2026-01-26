import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Dumbbell,
  Heart,
  Users,
  Brain,
  Sparkles,
  Briefcase,
  Wallet,
  Leaf,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { Link } from "wouter";

export interface DimensionData {
  id: string;
  name: string;
  progress: number; // 0-100
  trend: "up" | "down" | "stable";
  lastActivity?: string;
  insight?: string;
  action?: string;
  route?: string;
}

interface LifeDimensionsAnalyticsProps {
  dimensions?: DimensionData[];
  compact?: boolean;
}

const DIMENSION_ICONS: Record<string, typeof Heart> = {
  physical: Dumbbell,
  emotional: Heart,
  social: Users,
  intellectual: Brain,
  spiritual: Sparkles,
  occupational: Briefcase,
  financial: Wallet,
  environmental: Leaf,
};

const DIMENSION_COLORS: Record<string, string> = {
  physical: "hsl(141, 53%, 53%)",
  emotional: "hsl(4, 64%, 66%)",
  social: "hsl(45, 96%, 56%)",
  intellectual: "hsl(231, 82%, 69%)",
  spiritual: "hsl(256, 100%, 83%)",
  occupational: "hsl(199, 89%, 48%)",
  financial: "hsl(84, 25%, 45%)",
  environmental: "hsl(158, 51%, 59%)",
};

const DEFAULT_DIMENSIONS: DimensionData[] = [
  {
    id: "physical",
    name: "Physical",
    progress: 0,
    trend: "stable",
    insight: "Start your wellness journey with daily movement",
    action: "Log a workout",
    route: "/workout",
  },
  {
    id: "emotional",
    name: "Emotional",
    progress: 0,
    trend: "stable",
    insight: "Check in with your feelings",
    action: "Start journaling",
    route: "/journal",
  },
  {
    id: "social",
    name: "Social",
    progress: 0,
    trend: "stable",
    insight: "Connect with your community",
    action: "Schedule time",
    route: "/calendar",
  },
  {
    id: "intellectual",
    name: "Intellectual",
    progress: 0,
    trend: "stable",
    insight: "Feed your curiosity",
    action: "Set a learning goal",
    route: "/life-dashboard",
  },
];

export function LifeDimensionsAnalytics({ 
  dimensions = DEFAULT_DIMENSIONS,
  compact = false 
}: LifeDimensionsAnalyticsProps) {
  if (compact) {
    return (
      <Card className="card-modern hover-lift">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Wellness Dimensions
            </CardTitle>
            <Link href="/life-dashboard">
              <Button variant="ghost" size="sm" className="gap-1">
                View All
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {dimensions.slice(0, 4).map((dimension) => {
            const Icon = DIMENSION_ICONS[dimension.id] || Heart;
            return (
              <div key={dimension.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" style={{ color: DIMENSION_COLORS[dimension.id] }} />
                    <span className="font-medium">{dimension.name}</span>
                  </div>
                  <span className="text-muted-foreground">{dimension.progress}%</span>
                </div>
                <Progress 
                  value={dimension.progress} 
                  className="h-2"
                  style={{
                    // @ts-ignore - CSS custom property
                    '--progress-foreground': DIMENSION_COLORS[dimension.id],
                  }}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {dimensions.map((dimension) => {
        const Icon = DIMENSION_ICONS[dimension.id] || Heart;
        const color = DIMENSION_COLORS[dimension.id] || "hsl(var(--primary))";
        
        return (
          <Card 
            key={dimension.id} 
            className="card-modern hover-lift cursor-pointer group"
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-2">
                <div 
                  className="p-3 rounded-xl"
                  style={{ 
                    backgroundColor: `${color}15`,
                  }}
                >
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <Badge 
                  variant={dimension.trend === "up" ? "default" : "outline"}
                  className="text-xs"
                >
                  {dimension.trend === "up" ? "↑" : dimension.trend === "down" ? "↓" : "—"}
                </Badge>
              </div>
              <CardTitle className="text-base">{dimension.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-semibold">{dimension.progress}%</span>
                </div>
                <Progress 
                  value={dimension.progress} 
                  className="h-2.5"
                  style={{
                    // @ts-ignore - CSS custom property
                    '--progress-foreground': color,
                  }}
                />
              </div>

              {dimension.lastActivity && (
                <p className="text-xs text-muted-foreground">
                  Last: {dimension.lastActivity}
                </p>
              )}

              {dimension.insight && (
                <p className="text-sm text-muted-foreground">
                  {dimension.insight}
                </p>
              )}

              {dimension.action && dimension.route && (
                <Link href={dimension.route}>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                    style={{
                      borderColor: color,
                    }}
                  >
                    {dimension.action}
                    <ArrowRight className="w-3 h-3 ml-2" />
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
