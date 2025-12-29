import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  CalendarDays,
  Utensils,
  Flower2,
  Dumbbell,
  Target,
  ListChecks,
  MessageSquareText,
  BarChart3,
  Shield,
} from "lucide-react";

const MODULES = [
  {
    title: "Calendar",
    desc: "Day / Week / Month. Events + routines + tasks.",
    href: "/calendar",
    icon: CalendarDays,
  },
  {
    title: "Meals",
    desc: "Meal ideas + filters + weekly plan + grocery list.",
    href: "/meals",
    icon: Utensils,
  },
  {
    title: "Meditation",
    desc: "Search meditations + mood-based suggestions + schedule.",
    href: "/meditation",
    icon: Flower2,
  },
  {
    title: "Workouts",
    desc: "Plans + library + player/links. Schedule sessions.",
    href: "/workouts",
    icon: Dumbbell,
  },
  {
    title: "Goals",
    desc: "Goals to milestones to tasks. Track progress.",
    href: "/goals",
    icon: Target,
  },
  {
    title: "Routines",
    desc: "Step-by-step, minute-by-minute routines.",
    href: "/routines",
    icon: ListChecks,
  },
  {
    title: "Insights",
    desc: "Patterns across your wellness dimensions.",
    href: "/insights",
    icon: BarChart3,
  },
  {
    title: "Blueprint",
    desc: "Your personal wellness framework and recovery tools.",
    href: "/blueprint",
    icon: Shield,
  },
];

export function ModulesHome() {
  return (
    <div className="min-h-screen">
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-background via-background to-muted/30" />

      <header className="max-w-6xl mx-auto px-4 pt-8 pb-4 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold">
            Your Wellness System
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl font-body">
            Tools first. AI second. Use the modules directly — or ask the assistant to connect everything into a plan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/assistant">
            <Button variant="secondary" className="gap-2">
              <MessageSquareText className="h-4 w-4" />
              AI Chat
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULES.map((m) => {
            const Icon = m.icon;
            return (
              <Link key={m.href} href={m.href}>
                <Card className="hover-elevate transition-shadow rounded-2xl cursor-pointer h-full" data-testid={`card-module-${m.title.toLowerCase()}`}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-muted flex items-center justify-center">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{m.title}</CardTitle>
                        <CardDescription className="mt-1">
                          {m.desc}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </main>

      <Link href="/assistant">
        <Button 
          className="fixed bottom-5 right-5 rounded-full h-14 px-5 shadow-lg gap-2"
          data-testid="button-coach-ai"
        >
          <MessageSquareText className="h-5 w-5" />
          Coach AI
        </Button>
      </Link>
    </div>
  );
}
