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

const MOOD_TO_EXTENDED_THEME_MAP: Record<Exclude<MoodTheme, null>, ThemeName> = {
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

// Each extended theme has both light and dark variants
const THEME_CONFIGS: Record<ThemeName, { light: Record<string, string>; dark: Record<string, string> }> = {
  light: { light: {}, dark: {} },
  dark: { light: {}, dark: {} },
  "calm-pastels": {
    light: {
      "--background": "220 40% 95%",
      "--foreground": "220 20% 20%",
      "--primary": "280 60% 75%",
      "--accent": "190 50% 70%",
      "--card": "280 40% 98%",
      "--muted": "220 30% 90%",
    },
    dark: {
      "--background": "220 20% 12%",
      "--foreground": "220 30% 90%",
      "--primary": "280 50% 60%",
      "--accent": "190 40% 50%",
      "--card": "220 25% 15%",
      "--muted": "220 20% 20%",
    },
  },
  "energetic-neons": {
    light: {
      "--background": "260 20% 92%",
      "--foreground": "260 30% 15%",
      "--primary": "330 85% 55%",
      "--accent": "180 80% 45%",
      "--card": "260 30% 97%",
      "--muted": "260 15% 85%",
    },
    dark: {
      "--background": "260 30% 12%",
      "--foreground": "60 100% 95%",
      "--primary": "330 100% 60%",
      "--accent": "180 100% 50%",
      "--card": "260 40% 15%",
      "--muted": "260 20% 22%",
    },
  },
  "earthy-tones": {
    light: {
      "--background": "30 25% 92%",
      "--foreground": "30 20% 20%",
      "--primary": "25 60% 50%",
      "--accent": "120 30% 45%",
      "--card": "30 30% 97%",
      "--muted": "30 20% 85%",
    },
    dark: {
      "--background": "30 20% 12%",
      "--foreground": "30 20% 88%",
      "--primary": "25 50% 45%",
      "--accent": "120 25% 40%",
      "--card": "30 25% 15%",
      "--muted": "30 15% 22%",
    },
  },
  "ocean-breeze": {
    light: {
      "--background": "200 40% 95%",
      "--foreground": "200 30% 15%",
      "--primary": "195 85% 50%",
      "--accent": "175 70% 55%",
      "--card": "200 50% 98%",
      "--muted": "200 30% 88%",
    },
    dark: {
      "--background": "200 30% 12%",
      "--foreground": "200 30% 90%",
      "--primary": "195 70% 45%",
      "--accent": "175 55% 45%",
      "--card": "200 35% 15%",
      "--muted": "200 25% 22%",
    },
  },
  "sunset-warmth": {
    light: {
      "--background": "20 50% 95%",
      "--foreground": "20 30% 15%",
      "--primary": "15 85% 60%",
      "--accent": "30 90% 55%",
      "--card": "20 60% 98%",
      "--muted": "20 40% 90%",
    },
    dark: {
      "--background": "20 35% 12%",
      "--foreground": "20 40% 90%",
      "--primary": "15 70% 50%",
      "--accent": "30 75% 45%",
      "--card": "20 40% 15%",
      "--muted": "20 30% 22%",
    },
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
    
    // Delay theme-color update to ensure CSS has applied
    requestAnimationFrame(() => {
      const computedBg = getComputedStyle(root).getPropertyValue('--background').trim();
      if (computedBg) {
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
          metaThemeColor.setAttribute('content', `hsl(${computedBg})`);
        }
      }
    });
  }, [theme]);

  // Helper function to update the theme-color meta tag for dynamic island
  const updateThemeColor = (bgValue: string) => {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor && bgValue) {
      // Convert HSL values to actual HSL color string
      const hslColor = `hsl(${bgValue})`;
      metaThemeColor.setAttribute('content', hslColor);
    }
  };

  useEffect(() => {
    const root = document.documentElement;
    const themeConfig = THEME_CONFIGS[extendedTheme];
    
    // Clear any previous extended theme CSS variables
    const allVars = ["--background", "--foreground", "--primary", "--accent", "--card", "--muted"];
    allVars.forEach(v => root.style.removeProperty(v));
    
    // Get the appropriate variant (light or dark) based on current base theme
    const config = themeConfig[theme];
    
    // Apply extended theme variables for the current light/dark mode
    if (config && Object.keys(config).length > 0) {
      Object.entries(config).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });
      // Update dynamic island color to match background
      if (config["--background"]) {
        updateThemeColor(config["--background"]);
      }
    } else {
      // For base light/dark themes, use the CSS variables from index.css
      // Update theme-color meta tag for dynamic island
      const computedBg = getComputedStyle(root).getPropertyValue('--background').trim();
      if (computedBg) {
        updateThemeColor(computedBg);
      }
    }
    
    localStorage.setItem("dw_extended_theme", extendedTheme);
  }, [extendedTheme, theme]);

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
          // Sync base theme for themes that should be dark
          if (mappedTheme === "dark" || mappedTheme === "energetic-neons") {
            setThemeState("dark");
          } else if (mappedTheme === "light") {
            setThemeState("light");
          }
          // Other extended themes keep current base theme (user's light/dark preference)
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
    // Toggle between light and dark base mode
    // Extended theme stays the same - it will now show its light or dark variant
    setThemeState((prev) => (prev === "light" ? "dark" : "light"));
    // If using base light/dark, also update extended theme
    if (extendedTheme === "light" || extendedTheme === "dark") {
      setExtendedThemeState((prev) => (prev === "light" ? "dark" : "light"));
    }
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
        // Sync base theme for themes that should be dark
        if (mappedTheme === "dark" || mappedTheme === "energetic-neons") {
          setThemeState("dark");
        } else if (mappedTheme === "light") {
          setThemeState("light");
        }
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
