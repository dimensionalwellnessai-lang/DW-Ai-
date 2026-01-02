import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Sun, 
  Moon, 
  Utensils, 
  Dumbbell, 
  Settings2,
  ChevronRight,
  Sparkles,
  Heart,
  Brain,
  Leaf
} from "lucide-react";
import { useLocation } from "wouter";
import { useSystemPreferences } from "@/hooks/use-systems-data";
import { type SystemType, type SystemPreferences } from "@/lib/guest-storage";

interface SystemInfo {
  type: SystemType;
  name: string;
  description: string;
  icon: typeof Sun;
  color: string;
  route: string;
  subsystems?: { name: string; key: keyof SystemPreferences }[];
}

const SYSTEMS: SystemInfo[] = [
  {
    type: "wake_up",
    name: "Morning Anchor",
    description: "Start your day with intention through hydration, movement, and grounding",
    icon: Sun,
    color: "text-amber-500",
    route: "/systems/wake-up",
    subsystems: [
      { name: "Meditation", key: "meditationEnabled" },
      { name: "Spiritual Practice", key: "spiritualEnabled" },
    ]
  },
  {
    type: "meals",
    name: "Nourishment Flow",
    description: "Container-based meal system with substitutions and macro awareness",
    icon: Utensils,
    color: "text-emerald-500",
    route: "/meal-prep",
    subsystems: [
      { name: "Meal Containers", key: "mealContainersEnabled" },
    ]
  },
  {
    type: "training",
    name: "Movement Practice",
    description: "Workouts, exercise routines, and recovery guidance",
    icon: Dumbbell,
    color: "text-blue-500",
    route: "/systems/training",
  },
  {
    type: "wind_down",
    name: "Evening Transition",
    description: "Wind down with screen reduction, reflection, and rest preparation",
    icon: Moon,
    color: "text-indigo-500",
    route: "/systems/wind-down",
    subsystems: [
      { name: "Journaling", key: "journalingEnabled" },
    ]
  },
];

const OPTIONAL_FEATURES: { name: string; key: keyof SystemPreferences; description: string; icon: typeof Brain }[] = [
  { name: "Meditation", key: "meditationEnabled", description: "Guided breathing and mindfulness practices", icon: Brain },
  { name: "Spiritual Practice", key: "spiritualEnabled", description: "Connection to beliefs and values", icon: Heart },
  { name: "Astrology Notes", key: "astrologyEnabled", description: "Daily astrological insights", icon: Sparkles },
  { name: "Journaling", key: "journalingEnabled", description: "Reflection prompts and free writing", icon: Leaf },
];

export default function SystemsHubPage() {
  const [, setLocation] = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { 
    prefs, 
    isLoading, 
    savePreferences, 
    isSystemEnabled: checkSystemEnabled, 
    toggleSystem: handleToggleSystem 
  } = useSystemPreferences();

  const handleToggleFeature = (key: keyof SystemPreferences, value: boolean) => {
    savePreferences({ [key]: value });
  };

  const handleTimeChange = (key: "preferredWakeTime" | "preferredSleepTime", value: string) => {
    savePreferences({ [key]: value });
  };

  const enabledCount = prefs.enabledSystems.length;

  if (isLoading) {
    return (
      <ScrollArea className="h-full">
        <div className="p-6 max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-20 w-full" />
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold">Life Systems</h1>
            <p className="text-muted-foreground">
              Your personal operating system for daily wellness
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSettingsOpen(true)}
            data-testid="button-system-settings"
          >
            <Settings2 className="w-4 h-4" />
          </Button>
        </div>

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium">
                  {enabledCount} {enabledCount === 1 ? "system" : "systems"} active
                </p>
                <p className="text-xs text-muted-foreground">
                  Your schedule references these systems for guidance
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Core Systems
          </h2>
          <div className="space-y-2">
            {SYSTEMS.map((system) => {
              const Icon = system.icon;
              const enabled = checkSystemEnabled(system.type);
              
              return (
                <Card 
                  key={system.type}
                  className={`transition-opacity ${enabled ? "" : "opacity-60"}`}
                  data-testid={`card-system-${system.type}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div 
                        className="flex items-start gap-3 flex-1 cursor-pointer hover-elevate rounded-md p-1 -m-1"
                        onClick={() => enabled && setLocation(system.route)}
                        data-testid={`link-system-${system.type}`}
                      >
                        <div className={`w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-5 h-5 ${system.color}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{system.name}</h3>
                            {enabled && (
                              <Badge variant="secondary" className="text-xs">Active</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {system.description}
                          </p>
                          {system.subsystems && system.subsystems.length > 0 && enabled && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {system.subsystems.map(sub => (
                                prefs[sub.key] && (
                                  <Badge key={sub.key} variant="outline" className="text-xs">
                                    {sub.name}
                                  </Badge>
                                )
                              ))}
                            </div>
                          )}
                        </div>
                        {enabled && (
                          <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                      <Switch
                        checked={enabled}
                        onCheckedChange={(checked) => handleToggleSystem(system.type, checked)}
                        data-testid={`switch-system-${system.type}`}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Optional Features
          </h2>
          <Card>
            <CardContent className="p-4 space-y-4">
              {OPTIONAL_FEATURES.map((feature) => {
                const Icon = feature.icon;
                const enabled = prefs[feature.key] as boolean;
                
                return (
                  <div 
                    key={feature.key}
                    className="flex items-center justify-between gap-4"
                    data-testid={`row-feature-${feature.key}`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{feature.name}</p>
                        <p className="text-xs text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={enabled}
                      onCheckedChange={(checked) => handleToggleFeature(feature.key, checked)}
                      data-testid={`switch-feature-${feature.key}`}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>System Settings</DialogTitle>
              <DialogDescription>
                Configure your daily schedule preferences
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="wake-time">Preferred Wake Time</Label>
                <Input
                  id="wake-time"
                  type="time"
                  value={prefs.preferredWakeTime || "07:00"}
                  onChange={(e) => handleTimeChange("preferredWakeTime", e.target.value)}
                  data-testid="input-wake-time"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sleep-time">Preferred Sleep Time</Label>
                <Input
                  id="sleep-time"
                  type="time"
                  value={prefs.preferredSleepTime || "22:00"}
                  onChange={(e) => handleTimeChange("preferredSleepTime", e.target.value)}
                  data-testid="input-sleep-time"
                />
              </div>
              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="text-sm font-medium">AI Routing</p>
                  <p className="text-xs text-muted-foreground">
                    Let AI suggest which system to use
                  </p>
                </div>
                <Switch
                  checked={prefs.aiRoutingEnabled}
                  onCheckedChange={(checked) => handleToggleFeature("aiRoutingEnabled", checked)}
                  data-testid="switch-ai-routing"
                />
              </div>
            </div>
            <Button onClick={() => setSettingsOpen(false)} className="w-full" data-testid="button-close-settings">
              Done
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </ScrollArea>
  );
}
