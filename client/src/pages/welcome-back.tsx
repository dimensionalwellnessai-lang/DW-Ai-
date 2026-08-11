import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { ElementType } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { formatDaysAway } from "@/lib/lifecycle";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, RefreshCw, Sparkles } from "lucide-react";

type ReturnPath = "resume" | "recalibrate" | "start_fresh";

interface PathOption {
  id: ReturnPath;
  icon: ElementType;
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

  const profileQuery = useQuery<{ profile: {
    generatedSummary?: string | null;
    generatedDirection?: string | null;
    desiredFeelings?: string[] | null;
    supportNeeds?: string[] | null;
  } | null }>({
    queryKey: ["/api/onboarding/profile"],
    retry: false,
  });

  const lifestyleQuery = useQuery<Record<string, string>>({
    queryKey: ["/api/profile/lifestyle-preferences"],
    retry: false,
  });

  const lastActiveAt = user?.lastActiveAt;
  const daysAway = formatDaysAway(lastActiveAt);

  const logReturn = useMutation({
    mutationFn: (path: ReturnPath) =>
      apiRequest("POST", "/api/lifecycle/return-event", {
        path,
        daysAway: lastActiveAt
          ? Math.max(0, Math.floor((Date.now() - new Date(lastActiveAt).getTime()) / 86_400_000))
          : undefined,
      }),
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

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Your last snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {profileQuery.isLoading || lifestyleQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Pulling together what you already built…</p>
            ) : (
              <>
                {profileQuery.data?.profile?.generatedSummary ? (
                  <p className="text-sm text-muted-foreground">
                    {profileQuery.data.profile.generatedSummary}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    We&apos;ll help you reconnect with what still fits and gently update what doesn&apos;t.
                  </p>
                )}

                <div className="space-y-2">
                  {lifestyleQuery.data?.identityVision && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Identity direction</p>
                      <p className="text-sm text-foreground">{lifestyleQuery.data.identityVision}</p>
                    </div>
                  )}
                  {profileQuery.data?.profile?.generatedDirection && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Direction</p>
                      <p className="text-sm text-foreground">{profileQuery.data.profile.generatedDirection}</p>
                    </div>
                  )}
                  {lifestyleQuery.data?.anchors && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Anchors</p>
                      <p className="text-sm text-foreground">{lifestyleQuery.data.anchors}</p>
                    </div>
                  )}
                  {lifestyleQuery.data?.standards && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Standards</p>
                      <p className="text-sm text-foreground">{lifestyleQuery.data.standards}</p>
                    </div>
                  )}
                  {lifestyleQuery.data?.minimumDay && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Minimum Day</p>
                      <p className="text-sm text-foreground">{lifestyleQuery.data.minimumDay}</p>
                    </div>
                  )}
                </div>

                {((profileQuery.data?.profile?.desiredFeelings?.length ?? 0) > 0 || (profileQuery.data?.profile?.supportNeeds?.length ?? 0) > 0) && (
                  <div className="space-y-2">
                    {profileQuery.data?.profile?.desiredFeelings?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {profileQuery.data.profile.desiredFeelings.slice(0, 4).map((feeling) => (
                          <Badge key={feeling} variant="secondary">{feeling}</Badge>
                        ))}
                      </div>
                    ) : null}
                    {profileQuery.data?.profile?.supportNeeds?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {profileQuery.data.profile.supportNeeds.slice(0, 3).map((need) => (
                          <Badge key={need} variant="outline">{need}</Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

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
