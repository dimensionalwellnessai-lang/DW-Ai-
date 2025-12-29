import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
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

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    if (mood) {
      root.setAttribute("data-mood", mood);
      localStorage.setItem("mood", mood);
    } else {
      root.removeAttribute("data-mood");
      localStorage.removeItem("mood");
    }
  }, [mood]);

  useEffect(() => {
    localStorage.setItem("themeMode", themeMode);
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "light" ? "dark" : "light"));
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const setMood = (newMood: MoodTheme) => {
    setMoodState(newMood);
  };

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, mood, setMood, themeMode, setThemeMode }}>
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
