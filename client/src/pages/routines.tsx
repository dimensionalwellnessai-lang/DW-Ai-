import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Plus,
  Clock,
  Sun,
  Moon,
  Coffee,
  Dumbbell,
  Wind,
  Play,
  Calendar,
} from "lucide-react";

interface Routine {
  id: string;
  name: string;
  description: string;
  duration: number;
  steps: { time: number; action: string }[];
  icon: typeof Sun;
  category: string;
}

const SAMPLE_ROUTINES: Routine[] = [
  {
    id: "morning",
    name: "Morning Wake-up",
    description: "A gentle way to start your day",
    duration: 15,
    steps: [
      { time: 0, action: "Take 3 deep breaths in bed" },
      { time: 2, action: "Stretch arms and legs" },
      { time: 4, action: "Sit up slowly, feet on floor" },
      { time: 6, action: "Drink a glass of water" },
      { time: 8, action: "5 min gentle stretching" },
      { time: 13, action: "Set your intention for the day" },
    ],
    icon: Sun,
    category: "Morning",
  },
  {
    id: "evening",
    name: "Wind Down",
    description: "Prepare your mind and body for rest",
    duration: 20,
    steps: [
      { time: 0, action: "Put away screens" },
      { time: 2, action: "Dim the lights" },
      { time: 5, action: "Write 3 things you're grateful for" },
      { time: 10, action: "5 minutes of gentle stretching" },
      { time: 15, action: "4-7-8 breathing (5 cycles)" },
      { time: 18, action: "Get into bed, close your eyes" },
    ],
    icon: Moon,
    category: "Evening",
  },
  {
    id: "focus",
    name: "Focus Reset",
    description: "Regain clarity when you feel scattered",
    duration: 10,
    steps: [
      { time: 0, action: "Step away from your task" },
      { time: 1, action: "Box breathing (4 cycles)" },
      { time: 4, action: "Drink water" },
      { time: 5, action: "Write down your next 3 priorities" },
      { time: 8, action: "Set a 25-min timer for focused work" },
    ],
    icon: Coffee,
    category: "Focus",
  },
  {
    id: "quickmove",
    name: "Quick Movement",
    description: "Get your body moving in 5 minutes",
    duration: 5,
    steps: [
      { time: 0, action: "10 jumping jacks" },
      { time: 1, action: "10 squats" },
      { time: 2, action: "10 arm circles each direction" },
      { time: 3, action: "30-second plank" },
      { time: 4, action: "Shake it out" },
    ],
    icon: Dumbbell,
    category: "Movement",
  },
  {
    id: "breathwork",
    name: "Calm Breathing",
    description: "A simple breathing routine for any time",
    duration: 5,
    steps: [
      { time: 0, action: "Find a comfortable position" },
      { time: 1, action: "Close your eyes" },
      { time: 2, action: "5-5 breathing for 3 minutes" },
      { time: 4, action: "Slowly open your eyes" },
    ],
    icon: Wind,
    category: "Breathing",
  },
];

export function RoutinesPage() {
  const [expandedRoutine, setExpandedRoutine] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between gap-4 p-4 max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-display font-semibold">Routines</h1>
              <p className="text-sm text-muted-foreground">Step-by-step patterns</p>
            </div>
          </div>
          <Button size="sm" data-testid="button-create-routine">
            <Plus className="h-4 w-4 mr-1" />
            Create
          </Button>
        </div>
      </header>

      <main className="p-4 max-w-3xl mx-auto">
        <p className="text-sm text-muted-foreground mb-6 text-center">
          Routines help you build consistency. Start one, and the AI will guide you through each step.
        </p>

        <div className="grid gap-4">
          {SAMPLE_ROUTINES.map((routine) => {
            const Icon = routine.icon;
            const isExpanded = expandedRoutine === routine.id;

            return (
              <Card
                key={routine.id}
                className="overflow-visible cursor-pointer transition-all"
                onClick={() => setExpandedRoutine(isExpanded ? null : routine.id)}
                data-testid={`card-routine-${routine.id}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{routine.name}</CardTitle>
                        <CardDescription>{routine.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="gap-1">
                        <Clock className="h-3 w-3" />
                        {routine.duration} min
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="border-t pt-4 mt-2 space-y-4">
                      <div className="space-y-2">
                        {routine.steps.map((step, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-3 text-sm"
                          >
                            <span className="text-xs text-muted-foreground w-12 shrink-0">
                              {step.time === 0 ? "Start" : `+${step.time} min`}
                            </span>
                            <span>{step.action}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button size="sm" className="flex-1" data-testid={`button-start-${routine.id}`}>
                          <Play className="h-4 w-4 mr-1" />
                          Start now
                        </Button>
                        <Button size="sm" variant="outline" data-testid={`button-schedule-${routine.id}`}>
                          <Calendar className="h-4 w-4 mr-1" />
                          Schedule
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
