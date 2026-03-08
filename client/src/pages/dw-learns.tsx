import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/hooks/use-toast";
import {
  useLearningProfile,
  getPersonalizationReasons,
  type LearningProfilePatch,
} from "@/hooks/use-learning-profile";
import {
  Brain,
  RotateCcw,
  Clock,
  Zap,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Loader2,
} from "lucide-react";

const ACTION_TYPE_LABELS: Record<string, string> = {
  movement: "Movement",
  workout: "Workout",
  reflection: "Reflection",
  nutrition: "Nutrition",
  habit: "Habit",
  schedule: "Scheduling",
  mindfulness: "Mindfulness",
  social: "Social",
};

const SENSITIVITY_LABELS: Record<string, string> = {
  low: "Low – fewer reminders",
  medium: "Medium – balanced",
  high: "High – more reminders",
};

function formatUpdatedAt(val: string | number | null): string {
  if (!val) return "Never";
  try {
    const d = typeof val === "number" ? new Date(val) : new Date(val);
    return d.toLocaleDateString(undefined, { dateStyle: "medium" });
  } catch {
    return "Unknown";
  }
}

export function DwLearnsPage() {
  const { profile, isLoading, updateProfile, isUpdating, resetProfile, isResetting } =
    useLearningProfile();
  const { toast } = useToast();

  // Local editable state – initialised with empty defaults; synced via useEffect when profile loads
  const [reminderTime, setReminderTime] = useState<string>("");
  const [reminderSensitivity, setReminderSensitivity] = useState<string>("medium");
  const [learningOn, setLearningOn] = useState<boolean>(true);

  // Sync local state from profile once it's loaded
  useEffect(() => {
    if (!isLoading && profile) {
      setReminderTime(profile.preferredTimes?.reminder ?? "");
      setReminderSensitivity(profile.sensitivity?.reminders ?? "medium");
      setLearningOn(profile.learningEnabled !== false);
    }
  }, [isLoading, profile]);

  async function handleSave() {
    try {
      const patch: LearningProfilePatch = {
        learningEnabled: learningOn,
        preferredTimes: {
          ...(profile?.preferredTimes ?? {}),
          ...(reminderTime ? { reminder: reminderTime } : {}),
        },
        sensitivity: {
          ...(profile?.sensitivity ?? {}),
          reminders: reminderSensitivity,
        },
      };
      await updateProfile(patch);
      toast({ title: "Saved", description: "Your learning preferences have been updated." });
    } catch {
      toast({ title: "Error", description: "Failed to save preferences.", variant: "destructive" });
    }
  }

  async function handleReset() {
    if (!confirm("Reset all learned preferences? This cannot be undone.")) return;
    try {
      await resetProfile();
      setReminderTime("");
      setReminderSensitivity("medium");
      setLearningOn(true);
      toast({ title: "Reset", description: "Learning profile has been cleared." });
    } catch {
      toast({ title: "Error", description: "Failed to reset.", variant: "destructive" });
    }
  }

  const reasons = getPersonalizationReasons(profile);

  return (
    <div className="flex flex-col h-full bg-background">
      <PageHeader title="What DW Learned" backPath="/settings" />

      <div className="flex-1 overflow-auto">
        <main className="p-4 max-w-2xl mx-auto space-y-4">
          {/* Header card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Brain className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base">DW Learns</CardTitle>
                  <CardDescription>
                    DW quietly observes patterns to offer more relevant suggestions — no scores,
                    no profiles shared.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="learning-toggle" className="flex flex-col gap-0.5">
                  <span>Enable personalization</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    {learningOn
                      ? "DW is learning from your activity"
                      : "DW will not learn or personalise"}
                  </span>
                </Label>
                <Switch
                  id="learning-toggle"
                  checked={learningOn}
                  onCheckedChange={(checked) => {
                    setLearningOn(checked);
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Last updated: {formatUpdatedAt(profile?.updatedAt ?? null)}
              </p>
            </CardContent>
          </Card>

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && (
            <>
              {/* Why DW suggests what it suggests */}
              {reasons.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-sm">Why DW suggests these for you</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {reasons.map((r, i) => (
                      <p key={i} className="text-sm text-muted-foreground">
                        • {r}
                      </p>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Preferred action types */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm">Action types you engage with most</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    Learned from which plan actions and follow-ups you accept or complete
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {profile?.preferredActionTypes && profile.preferredActionTypes.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {profile.preferredActionTypes.map((t) => (
                        <Badge key={t} variant="secondary">
                          <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                          {ACTION_TYPE_LABELS[t] ?? t}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nothing learned yet.</p>
                  )}
                </CardContent>
              </Card>

              {/* Friction points */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm">Known friction points</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    Learned from daily check-in constraints you've reported
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {profile?.frictionPoints && profile.frictionPoints.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {profile.frictionPoints.map((fp) => (
                        <Badge key={fp} variant="outline">
                          {fp}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nothing learned yet.</p>
                  )}
                </CardContent>
              </Card>

              {/* Recent wins */}
              {profile?.wins && profile.wins.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <CardTitle className="text-sm">What's been working</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {profile.wins.map((w, i) => (
                        <Badge key={i} variant="secondary" className="text-green-700 dark:text-green-400">
                          {w}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Avoid */}
              {profile?.avoid && profile.avoid.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-sm">What you tend to skip</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {profile.avoid.map((a, i) => (
                        <Badge key={i} variant="outline" className="text-muted-foreground">
                          {a}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Editable preferences */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm">Preferred reminder time</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    Learned from when you actually engage with reminders
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Label htmlFor="reminder-time" className="w-24 text-sm shrink-0">
                      Default time
                    </Label>
                    <Input
                      id="reminder-time"
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className="w-36"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-sm">Reminder sensitivity</Label>
                    <div className="flex gap-2 flex-wrap">
                      {(["low", "medium", "high"] as const).map((level) => (
                        <Button
                          key={level}
                          size="sm"
                          variant={reminderSensitivity === level ? "default" : "outline"}
                          onClick={() => setReminderSensitivity(level)}
                        >
                          {SENSITIVITY_LABELS[level]}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-3 flex-wrap">
                <Button onClick={handleSave} disabled={isUpdating}>
                  {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save preferences
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={isResetting}
                  className="text-destructive hover:text-destructive"
                >
                  {isResetting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4 mr-2" />
                  )}
                  Reset all learning
                </Button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
