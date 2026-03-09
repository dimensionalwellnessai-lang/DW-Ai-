import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Save } from "lucide-react";

interface WellnessPreferences {
  id: string;
  beliefSystem?: string;
  traditions?: string[];
  otherTradition?: string;
  meditationEnabled: boolean;
  journalEnabled: boolean;
  astrologyEnabled: boolean;
  tarotEnabled: boolean;
  energyWorkEnabled: boolean;
}

export default function WellnessPreferencesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Local state for form
  const [beliefSystem, setBeliefSystem] = useState<string>("");
  const [traditions, setTraditions] = useState<string[]>([]);
  const [otherTradition, setOtherTradition] = useState("");
  const [meditationEnabled, setMeditationEnabled] = useState(true);
  const [journalEnabled, setJournalEnabled] = useState(true);
  const [astrologyEnabled, setAstrologyEnabled] = useState(false);
  const [tarotEnabled, setTarotEnabled] = useState(false);
  const [energyWorkEnabled, setEnergyWorkEnabled] = useState(false);

  // Fetch existing preferences
  const { data: preferences, isLoading } = useQuery<WellnessPreferences>({
    queryKey: ['/api/wellness-preferences'],
  });

  // Update local state when data is fetched
  useEffect(() => {
    if (preferences) {
      setBeliefSystem(preferences.beliefSystem || "");
      setTraditions(preferences.traditions || []);
      setOtherTradition(preferences.otherTradition || "");
      setMeditationEnabled(preferences.meditationEnabled);
      setJournalEnabled(preferences.journalEnabled);
      setAstrologyEnabled(preferences.astrologyEnabled);
      setTarotEnabled(preferences.tarotEnabled);
      setEnergyWorkEnabled(preferences.energyWorkEnabled);
    }
  }, [preferences]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<WellnessPreferences>) => {
      if (preferences?.id) {
        // Update existing
        const res = await fetch(`/api/wellness-preferences/${preferences.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          throw new Error('Failed to update preferences');
        }
        return res.json();
      } else {
        // Create new
        const res = await fetch('/api/wellness-preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          throw new Error('Failed to create preferences');
        }
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wellness-preferences'] });
      toast({
        title: "Preferences saved",
        description: "Your wellness preferences have been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      beliefSystem,
      traditions,
      otherTradition,
      meditationEnabled,
      journalEnabled,
      astrologyEnabled,
      tarotEnabled,
      energyWorkEnabled,
    });
  };

  const handleTraditionToggle = (tradition: string, checked: boolean) => {
    if (checked) {
      setTraditions([...traditions, tradition]);
    } else {
      setTraditions(traditions.filter(t => t !== tradition));
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-background">
        <PageHeader title="Wellness Preferences" backPath="/settings" />
        <div className="flex-1 overflow-auto">
          <div className="container max-w-2xl mx-auto p-4">
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-background to-muted/20">
      <PageHeader title="Wellness Preferences" backPath="/settings" />
      
      <div className="flex-1 overflow-auto">
        <div className="container max-w-2xl mx-auto p-4 space-y-6">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">
            Customize your wellness experience based on your beliefs and practices.
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle>Spiritual & Belief System</CardTitle>
            </div>
            <CardDescription>
              Help us personalize your experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Belief System Selection */}
            <div className="space-y-3">
              <Label>Do you practice a religion or spiritual tradition?</Label>
              <RadioGroup value={beliefSystem} onValueChange={setBeliefSystem}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="religious" id="religious" />
                  <Label htmlFor="religious" className="font-normal cursor-pointer">
                    Yes - I follow a tradition
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="spiritual" id="spiritual" />
                  <Label htmlFor="spiritual" className="font-normal cursor-pointer">
                    Spiritual but not religious
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="secular" id="secular" />
                  <Label htmlFor="secular" className="font-normal cursor-pointer">
                    Secular/Non-spiritual
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="prefer_not_say" id="prefer_not_say" />
                  <Label htmlFor="prefer_not_say" className="font-normal cursor-pointer">
                    Prefer not to say
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Traditions Selection - Only show if "religious" is selected */}
            {beliefSystem === "religious" && (
              <div className="space-y-3">
                <Label>Which tradition(s)?</Label>
                <div className="space-y-2">
                  {["Christianity", "Islam", "Judaism", "Buddhism", "Hinduism"].map((tradition) => (
                    <div key={tradition} className="flex items-center space-x-2">
                      <Checkbox
                        id={tradition}
                        checked={traditions.includes(tradition)}
                        onCheckedChange={(checked) => handleTraditionToggle(tradition, checked as boolean)}
                      />
                      <Label htmlFor={tradition} className="font-normal cursor-pointer">
                        {tradition}
                      </Label>
                    </div>
                  ))}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="other"
                      checked={traditions.includes("Other")}
                      onCheckedChange={(checked) => handleTraditionToggle("Other", checked as boolean)}
                    />
                    <Label htmlFor="other" className="font-normal cursor-pointer">
                      Other
                    </Label>
                  </div>
                  {traditions.includes("Other") && (
                    <Input
                      placeholder="Specify other tradition..."
                      value={otherTradition}
                      onChange={(e) => setOtherTradition(e.target.value)}
                      className="mt-2"
                    />
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Optional Practices</CardTitle>
            <CardDescription>
              Choose which wellness practices you'd like to include
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Meditation & Mindfulness</Label>
                <p className="text-sm text-muted-foreground">
                  Guided meditations and mindfulness exercises
                </p>
              </div>
              <Checkbox
                checked={meditationEnabled}
                onCheckedChange={(checked) => setMeditationEnabled(checked as boolean)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Journaling</Label>
                <p className="text-sm text-muted-foreground">
                  Reflection prompts and journal entries
                </p>
              </div>
              <Checkbox
                checked={journalEnabled}
                onCheckedChange={(checked) => setJournalEnabled(checked as boolean)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Cosmic Insights</Label>
                <p className="text-sm text-muted-foreground">
                  Daily horoscopes, birth chart, moon phases
                </p>
              </div>
              <Checkbox
                checked={astrologyEnabled}
                onCheckedChange={(checked) => setAstrologyEnabled(checked as boolean)}
              />
            </div>

            <div className="flex items-center justify-between opacity-50">
              <div className="space-y-0.5">
                <Label className="text-base">Tarot</Label>
                <p className="text-sm text-muted-foreground">
                  Coming soon
                </p>
              </div>
              <Checkbox
                checked={tarotEnabled}
                disabled
                onCheckedChange={(checked) => setTarotEnabled(checked as boolean)}
              />
            </div>

            <div className="flex items-center justify-between opacity-50">
              <div className="space-y-0.5">
                <Label className="text-base">Energy Work</Label>
                <p className="text-sm text-muted-foreground">
                  Coming soon
                </p>
              </div>
              <Checkbox
                checked={energyWorkEnabled}
                disabled
                onCheckedChange={(checked) => setEnergyWorkEnabled(checked as boolean)}
              />
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="w-full"
          size="lg"
        >
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? "Saving..." : "Save Preferences"}
        </Button>
      </div>
    </div>
    </div>
  );
}
