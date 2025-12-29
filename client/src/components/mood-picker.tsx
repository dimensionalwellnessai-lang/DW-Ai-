import { Button } from "@/components/ui/button";
import { useTheme, MOOD_OPTIONS, MoodTheme } from "@/lib/theme-provider";
import {
  Cloud,
  Flame,
  Heart,
  Moon,
  Scale,
  Sun,
  Target,
  TreePine,
  Wind,
  Zap,
  AlertCircle,
  Waves,
  X,
} from "lucide-react";

const MOOD_ICONS: Record<string, any> = {
  peace: Waves,
  target: Target,
  sun: Sun,
  heart: Heart,
  zap: Zap,
  tree: TreePine,
  scale: Scale,
  cloud: Cloud,
  alert: AlertCircle,
  wind: Wind,
  moon: Moon,
  flame: Flame,
};

interface MoodPickerProps {
  onClose?: () => void;
  compact?: boolean;
}

export function MoodPicker({ onClose, compact = false }: MoodPickerProps) {
  const { mood, setMood, themeMode, setThemeMode } = useTheme();

  const handleMoodSelect = (selectedMood: MoodTheme) => {
    if (mood === selectedMood) {
      setMood(null);
    } else {
      setMood(selectedMood);
    }
    onClose?.();
  };

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {MOOD_OPTIONS.map((option) => {
          const Icon = MOOD_ICONS[option.emoji];
          const isSelected = mood === option.id;
          return (
            <Button
              key={option.id}
              variant={isSelected ? "default" : "ghost"}
              size="sm"
              onClick={() => handleMoodSelect(option.id)}
              className="gap-1"
              data-testid={`button-mood-${option.id}`}
            >
              <Icon className="h-3 w-3" style={{ color: isSelected ? undefined : option.color }} />
              <span className="text-xs">{option.name}</span>
            </Button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-card rounded-lg border shadow-xl p-6">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2"
          onClick={onClose}
          data-testid="button-close-mood-picker"
        >
          <X className="h-4 w-4" />
        </Button>
        
        <h2 className="text-xl font-semibold mb-2 text-center">How are you feeling?</h2>
        <p className="text-muted-foreground text-sm text-center mb-6">
          Select your mood and the app will adapt to match
        </p>
        
        <div className="grid grid-cols-4 gap-3 mb-6">
          {MOOD_OPTIONS.map((option) => {
            const Icon = MOOD_ICONS[option.emoji];
            const isSelected = mood === option.id;
            return (
              <button
                key={option.id}
                onClick={() => handleMoodSelect(option.id)}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-all hover-elevate ${
                  isSelected 
                    ? "ring-2 ring-primary bg-primary/10" 
                    : "bg-muted/50"
                }`}
                data-testid={`button-mood-${option.id}`}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${option.color}30` }}
                >
                  <Icon className="h-5 w-5" style={{ color: option.color }} />
                </div>
                <span className="text-xs font-medium">{option.name}</span>
              </button>
            );
          })}
        </div>
        
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Theme mode:</span>
            <div className="flex gap-2">
              <Button
                variant={themeMode === "accent-only" ? "default" : "outline"}
                size="sm"
                onClick={() => setThemeMode("accent-only")}
                data-testid="button-theme-accent-only"
              >
                Accent only
              </Button>
              <Button
                variant={themeMode === "full-background" ? "default" : "outline"}
                size="sm"
                onClick={() => setThemeMode("full-background")}
                data-testid="button-theme-full-background"
              >
                Full background
              </Button>
            </div>
          </div>
        </div>

        {mood && (
          <div className="mt-4 pt-4 border-t">
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => {
                setMood(null);
                onClose?.();
              }}
              data-testid="button-clear-mood"
            >
              Clear mood theme
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
