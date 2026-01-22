import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
export type ThemeName = 
  | "light" 
  | "dark" 
  | "calm-pastels" 
  | "energetic-neons" 
  | "earthy-tones" 
  | "ocean-breeze"
  | "sunset-warmth";

export type MoodTheme = 
  | "calm" 
  | "focused" 
  | "happy" 
  | "grateful" 
  | "confident" 
  | "grounded" 
  | "balanced" 
  | "sad" 
  | "stressed" 
  | "anxious" 
  | "tired" 
  | "motivated"
  | null;

export type ThemeMode = "accent-only" | "full-background";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  mood: MoodTheme;
  setMood: (mood: MoodTheme) => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  // New extended theme system
  extendedTheme: ThemeName;
  setExtendedTheme: (theme: ThemeName) => void;
  moodAdaptiveEnabled: boolean;
  setMoodAdaptiveEnabled: (enabled: boolean) => void;
}

export const MOOD_OPTIONS = [
  { id: "calm" as const, name: "Calm", emoji: "peace", color: "#A7C7E7" },
  { id: "focused" as const, name: "Focused", emoji: "target", color: "#2F5D8C" },
  { id: "happy" as const, name: "Happy", emoji: "sun", color: "#F6D365" },
  { id: "grateful" as const, name: "Grateful", emoji: "heart", color: "#F7A8B8" },
  { id: "confident" as const, name: "Confident", emoji: "zap", color: "#6D5BD0" },
  { id: "grounded" as const, name: "Grounded", emoji: "tree", color: "#2E7D32" },
  { id: "balanced" as const, name: "Balanced", emoji: "scale", color: "#B0B0B0" },
  { id: "sad" as const, name: "Low", emoji: "cloud", color: "#5B6C8F" },
  { id: "stressed" as const, name: "Stressed", emoji: "alert", color: "#D17A7A" },
  { id: "anxious" as const, name: "Anxious", emoji: "wind", color: "#F4A261" },
  { id: "tired" as const, name: "Tired", emoji: "moon", color: "#CDB4DB" },
  { id: "motivated" as const, name: "Energized", emoji: "flame", color: "#FF7A59" },
];

const MOOD_TO_EXTENDED_THEME_MAP: Record<MoodTheme, ThemeName> = {
  calm: "calm-pastels",
  focused: "dark",
  happy: "sunset-warmth",
  grateful: "calm-pastels",
  confident: "energetic-neons",
  grounded: "earthy-tones",
  balanced: "ocean-breeze",
  sad: "ocean-breeze",
  stressed: "earthy-tones",
  anxious: "calm-pastels",
  tired: "dark",
  motivated: "energetic-neons",
};

const THEME_CONFIGS: Record<ThemeName, Record<string, string>> = {
  light: {},
  dark: {},
  "calm-pastels": {
    "--background": "220 40% 95%",
    "--foreground": "220 20% 20%",
    "--primary": "280 60% 75%",
    "--accent": "190 50% 70%",
    "--card": "280 40% 98%",
    "--muted": "220 30% 90%",
  },
  "energetic-neons": {
    "--background": "260 30% 15%",
    "--foreground": "60 100% 95%",
    "--primary": "330 100% 60%",
    "--accent": "180 100% 50%",
    "--card": "260 40% 20%",
    "--muted": "260 20% 30%",
  },
  "earthy-tones": {
    "--background": "30 25% 92%",
    "--foreground": "30 20% 20%",
    "--primary": "25 60% 50%",
    "--accent": "120 30% 45%",
    "--card": "30 30% 97%",
    "--muted": "30 20% 85%",
  },
  "ocean-breeze": {
    "--background": "200 40% 95%",
    "--foreground": "200 30% 15%",
    "--primary": "195 85% 50%",
    "--accent": "175 70% 55%",
    "--card": "200 50% 98%",
    "--muted": "200 30% 88%",
  },
  "sunset-warmth": {
    "--background": "20 50% 95%",
    "--foreground": "20 30% 15%",
    "--primary": "15 85% 60%",
    "--accent": "30 90% 55%",
    "--card": "20 60% 98%",
    "--muted": "20 40% 90%",
  },
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme") as Theme;
      if (stored) return stored;
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  });

  const [extendedTheme, setExtendedThemeState] = useState<ThemeName>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("dw_extended_theme");
      return (stored as ThemeName) || "light";
    }
    return "light";
  });

  const [mood, setMoodState] = useState<MoodTheme>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("mood") as MoodTheme || null;
    }
    return null;
  });

  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("themeMode") as ThemeMode) || "full-background";
    }
    return "full-background";
  });

  const [moodAdaptiveEnabled, setMoodAdaptiveEnabledState] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("dw_mood_adaptive");
      return stored === "true";
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    const config = THEME_CONFIGS[extendedTheme];
    
    // Apply extended theme variables
    if (config && Object.keys(config).length > 0) {
      Object.entries(config).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });
    }
    
    // Set dark mode class for specific themes
    if (extendedTheme === "dark" || extendedTheme === "energetic-neons") {
      root.classList.add("dark");
      setThemeState("dark");
    } else if (extendedTheme !== "light") {
      root.classList.remove("dark");
      setThemeState("light");
    }
    
    localStorage.setItem("dw_extended_theme", extendedTheme);
  }, [extendedTheme]);

  useEffect(() => {
    const root = document.documentElement;
    if (mood) {
      root.setAttribute("data-mood", mood);
      localStorage.setItem("mood", mood);
      
      // Apply mood-based extended theme if enabled
      if (moodAdaptiveEnabled) {
        const mappedTheme = MOOD_TO_EXTENDED_THEME_MAP[mood];
        if (mappedTheme) {
          setExtendedThemeState(mappedTheme);
        }
      }
    } else {
      root.removeAttribute("data-mood");
      localStorage.removeItem("mood");
    }
  }, [mood, moodAdaptiveEnabled]);

  useEffect(() => {
    localStorage.setItem("themeMode", themeMode);
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "light" ? "dark" : "light"));
    setExtendedThemeState((prev) => (prev === "light" ? "dark" : "light"));
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    setExtendedThemeState(newTheme);
  };

  const setExtendedTheme = (newTheme: ThemeName) => {
    setExtendedThemeState(newTheme);
  };

  const setMood = (newMood: MoodTheme) => {
    setMoodState(newMood);
  };

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
  };

  const setMoodAdaptiveEnabled = (enabled: boolean) => {
    setMoodAdaptiveEnabledState(enabled);
    localStorage.setItem("dw_mood_adaptive", enabled.toString());
    
    if (enabled && mood) {
      const mappedTheme = MOOD_TO_EXTENDED_THEME_MAP[mood];
      if (mappedTheme) {
        setExtendedThemeState(mappedTheme);
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      toggleTheme, 
      setTheme, 
      mood, 
      setMood, 
      themeMode, 
      setThemeMode,
      extendedTheme,
      setExtendedTheme,
      moodAdaptiveEnabled,
      setMoodAdaptiveEnabled,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
