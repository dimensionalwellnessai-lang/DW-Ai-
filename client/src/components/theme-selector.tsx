import { useTheme, type ThemeName, type MoodTheme } from "@/lib/theme-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Palette, Heart, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const THEME_OPTIONS: { value: ThemeName; label: string; description: string }[] = [
  { value: "light", label: "Light", description: "Clean and bright" },
  { value: "dark", label: "Dark", description: "Easy on the eyes" },
  { value: "calm-pastels", label: "Calm Pastels", description: "Soft and soothing" },
  { value: "energetic-neons", label: "Energetic Neons", description: "Vibrant and bold" },
  { value: "earthy-tones", label: "Earthy Tones", description: "Grounded and natural" },
  { value: "ocean-breeze", label: "Ocean Breeze", description: "Cool and refreshing" },
  { value: "sunset-warmth", label: "Sunset Warmth", description: "Warm and inviting" },
];

const MOOD_OPTIONS: { value: MoodTheme & string; label: string; emoji: string }[] = [
  { value: "calm", label: "Calm", emoji: "😌" },
  { value: "motivated", label: "Energetic", emoji: "⚡" },
  { value: "stressed", label: "Stressed", emoji: "😰" },
  { value: "focused", label: "Focused", emoji: "🎯" },
  { value: "grounded", label: "Relaxed", emoji: "🧘" },
  { value: "balanced", label: "Neutral", emoji: "😐" },
];

export function ThemeSelector() {
  const { extendedTheme, setExtendedTheme, mood, setMood, moodAdaptiveEnabled, setMoodAdaptiveEnabled } = useTheme();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            <CardTitle>Appearance & Mood</CardTitle>
          </div>
          <CardDescription>
            Customize your app's visual theme and enable mood-adaptive colors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme Selection */}
          <div className="space-y-2">
            <Label htmlFor="theme-select" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              App Theme
            </Label>
            <Select value={extendedTheme} onValueChange={(value) => setExtendedTheme(value as ThemeName)}>
              <SelectTrigger id="theme-select">
                <SelectValue placeholder="Select a theme" />
              </SelectTrigger>
              <SelectContent>
                {THEME_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mood-Adaptive Toggle */}
          <div className="flex items-center justify-between space-x-2">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-accent" />
              <Label htmlFor="mood-adaptive" className="cursor-pointer">
                <div>
                  <div className="font-medium">Mood-Adaptive Themes</div>
                  <div className="text-xs text-muted-foreground">
                    Automatically adjust colors based on your mood
                  </div>
                </div>
              </Label>
            </div>
            <Switch
              id="mood-adaptive"
              checked={moodAdaptiveEnabled}
              onCheckedChange={setMoodAdaptiveEnabled}
            />
          </div>

          {/* Current Mood Selection */}
          {moodAdaptiveEnabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <Label>Current Mood</Label>
              <div className="grid grid-cols-3 gap-2">
                {MOOD_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    variant={mood === option.value ? "default" : "outline"}
                    className="flex flex-col h-auto py-3"
                    onClick={() => setMood(option.value as MoodTheme)}
                  >
                    <span className="text-2xl mb-1">{option.emoji}</span>
                    <span className="text-xs">{option.label}</span>
                  </Button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Theme Preview */}
          <div className="pt-4 border-t">
            <Label className="mb-2 block">Preview</Label>
            <div className="grid grid-cols-4 gap-2">
              <div className="h-12 rounded bg-background border" title="Background" />
              <div className="h-12 rounded bg-primary" title="Primary" />
              <div className="h-12 rounded bg-accent" title="Accent" />
              <div className="h-12 rounded bg-muted" title="Muted" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
