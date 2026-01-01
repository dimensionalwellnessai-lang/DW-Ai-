import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  ArrowLeft,
  Dumbbell,
  Brain,
  Utensils,
  Users,
  DollarSign,
  ChevronRight,
  Sparkles,
} from "lucide-react";

const CHALLENGE_CATEGORIES = [
  {
    id: "workout",
    name: "Workout Challenges",
    icon: Dumbbell,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    description: "Push your physical limits and build strength",
    examples: ["7-day morning stretch", "10K steps daily", "30-day pushup challenge"],
  },
  {
    id: "mental",
    name: "Mental Health",
    icon: Brain,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    description: "Build resilience and calm your mind",
    examples: ["5-minute daily meditation", "Gratitude journaling", "Digital detox weekend"],
  },
  {
    id: "nutrition",
    name: "Meal & Nutrition",
    icon: Utensils,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    description: "Nourish your body with intention",
    examples: ["Meal prep Sunday", "Hydration challenge", "Try one new recipe weekly"],
  },
  {
    id: "social",
    name: "Social Challenges",
    icon: Users,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    description: "Strengthen your connections",
    examples: ["Reach out to an old friend", "Random act of kindness", "Weekly coffee date"],
  },
  {
    id: "financial",
    name: "Financial Challenges",
    icon: DollarSign,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    description: "Build financial peace of mind",
    examples: ["No-spend weekend", "Save $5 daily", "Review subscriptions"],
  },
];

export function ChallengesPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="flex items-center justify-between gap-4 p-4 border-b">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="font-display font-bold text-xl">Challenges</h1>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        <div className="space-y-4">
          <p className="text-muted-foreground font-body text-center py-4">
            Challenges are here to empower you, not pressure you. Pick something that feels right for where you are today.
          </p>

          <div className="space-y-3">
            {CHALLENGE_CATEGORIES.map((category) => {
              const Icon = category.icon;
              return (
                <Card
                  key={category.id}
                  className="hover-elevate cursor-pointer transition-all"
                  onClick={() => setSelectedCategory(category.id === selectedCategory ? null : category.id)}
                  data-testid={`card-challenge-${category.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${category.bgColor}`}>
                        <Icon className={`h-6 w-6 ${category.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-display font-semibold">{category.name}</h3>
                          <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${selectedCategory === category.id ? "rotate-90" : ""}`} />
                        </div>
                        <p className="text-sm text-muted-foreground font-body mt-1">
                          {category.description}
                        </p>
                        {selectedCategory === category.id && (
                          <div className="mt-3 pt-3 border-t space-y-2">
                            <p className="text-xs text-muted-foreground font-body">Example challenges:</p>
                            <div className="flex flex-wrap gap-2">
                              {category.examples.map((example, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {example}
                                </Badge>
                              ))}
                            </div>
                            <Link href="/">
                              <Button size="sm" className="mt-2" data-testid={`button-start-${category.id}`}>
                                <Sparkles className="h-4 w-4 mr-1" />
                                Start with AI
                              </Button>
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
