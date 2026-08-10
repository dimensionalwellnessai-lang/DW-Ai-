import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { formatDaysAway } from "@/lib/lifecycle";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, RotateCcw, RefreshCw, Sparkles } from "lucide-react";

type ReturnPath = "resume" | "recalibrate" | "start_fresh";

interface PathOption {
  id: ReturnPath;
  icon: React.ElementType;
  title: string;
  subtitle: string;
}

const PATH_OPTIONS: PathOption[] = [
  {
    id: "resume",
    icon: ArrowRight,
    title: "Pick up where I left off",
    subtitle: "Your anchors, standards and schedule are waiting.",
  },
  {
    id: "recalibrate",
    icon: RefreshCw,
    title: "Update a few things",
    subtitle: "Keep your foundation, adjust what's changed.",
  },
  {
    id: "start_fresh",
    icon: Sparkles,
    title: "Start fresh",
    subtitle: "Archive your old setup and begin a new chapter.",
  },
];

export default function WelcomeBackPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [selected, setSelected] = useState<ReturnPath | null>(null);

  const daysAway = formatDaysAway((user as any)?.lastActiveAt);

  const logReturn = useMutation({
    mutationFn: (path: ReturnPath) =>
      apiRequest("POST", "/api/lifecycle/return-event", { path }),
  });

  const handleContinue = () => {
    if (!selected) return;

    logReturn.mutate(selected, {
      onSettled: () => {
        if (selected === "start_fresh") {
          setLocation("/voice-onboarding");
        } else if (selected === "recalibrate") {
          setLocation("/life-system-import");
        } else {
          setLocation("/command-center");
        }
      },
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-background">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground uppercase tracking-wider font-medium">
            Welcome back
          </p>
          <h1 className="text-3xl font-bold text-foreground">
            Good to see you again
          </h1>
          {daysAway && (
            <p className="text-muted-foreground text-sm">
              It's been {daysAway}. No worries — your system is still here.
            </p>
          )}
        </div>

        {/* Path chooser */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground text-center">
            What feels realistic right now?
          </p>
          {PATH_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isActive = selected === option.id;
            return (
              <Card
                key={option.id}
                onClick={() => setSelected(option.id)}
                className={`cursor-pointer transition-all border-2 ${
                  isActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <CardContent className="flex items-center gap-4 py-4">
                  <div
                    className={`p-2 rounded-lg ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">
                      {option.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {option.subtitle}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Continue button */}
        <Button
          className="w-full"
          size="lg"
          disabled={!selected || logReturn.isPending}
          onClick={handleContinue}
        >
          {logReturn.isPending ? "Loading…" : "Continue"}
        </Button>

        {/* Override: skip to home directly */}
        <p className="text-center text-xs text-muted-foreground">
          <button
            onClick={() => setLocation("/command-center")}
            className="underline hover:no-underline"
          >
            Take me straight to the home screen
          </button>
        </p>
      </div>
    </div>
  );
}
