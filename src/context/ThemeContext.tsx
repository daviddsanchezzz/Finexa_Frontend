import React, { createContext, useContext, useEffect, useState } from "react";
import { Appearance, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { vars } from "nativewind";

const THEME_KEY = "app.theme.preference";
const isWeb = typeof document !== "undefined";

export type ThemeMode = "light" | "dark";

// ── CSS custom properties per mode (native: vars(), web: global.css) ──────
const lightVars = vars({
  "--color-primary":        "#003cc5",
  "--color-secondary":      "#27AE60",
  "--color-accent":         "#F2C94C",
  "--color-purple":         "#9B51E0",
  "--color-background":     "#F9FAFB",
  "--color-text":           "#1A1A1A",
  "--color-text-secondary": "#6B7280",
  "--color-border":         "#E5E7EB",
  "--color-surface":        "#FFFFFF",
  "--color-card":           "#F2F4F7",
  "--color-error":          "#E63946",
});

const darkVars = vars({
  "--color-primary":        "#4B8EF5",
  "--color-secondary":      "#34D399",
  "--color-accent":         "#FBBF24",
  "--color-purple":         "#A78BFA",
  "--color-background":     "#0F172A",
  "--color-text":           "#F1F5F9",
  "--color-text-secondary": "#94A3B8",
  "--color-border":         "#334155",
  "--color-surface":        "#1E293B",
  "--color-card":           "#1E293B",
  "--color-error":          "#F87171",
});

// ── Raw color values (for use in JS StyleSheets / inline styles) ──────────
export const lightColors = {
  primary: "#003cc5",
  background: "#F9FAFB",
  surface: "#FFFFFF",
  card: "#F2F4F7",
  text: "#1A1A1A",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  border: "#E5E7EB",
  error: "#E63946",
};

export const darkColors = {
  primary: "#4B8EF5",
  background: "#0F172A",
  surface: "#1E293B",
  card: "#263348",
  text: "#F1F5F9",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",
  border: "#334155",
  error: "#F87171",
};

type ThemeContextType = {
  isDark: boolean;
  mode: ThemeMode;
  colors: typeof lightColors;
  setMode: (m: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  mode: "light",
  colors: lightColors,
  setMode: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (!isWeb) return "light";
    const saved = window.localStorage.getItem(THEME_KEY);
    return saved === "dark" || saved === "light" ? saved : "light";
  });

  const applyMode = (m: ThemeMode) => {
    Appearance.setColorScheme(m);
    if (isWeb) {
      document.documentElement.classList.toggle("dark", m === "dark");
      document.documentElement.style.colorScheme = m;
    }
  };

  useEffect(() => {
    applyMode(mode);
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((v) => {
      if (v === "dark" || v === "light") {
        setModeState(v);
        applyMode(v);
      }
    });
  }, []);

  const setMode = async (m: ThemeMode) => {
    setModeState(m);
    applyMode(m);
    if (isWeb) {
      window.localStorage.setItem(THEME_KEY, m);
    }
    await AsyncStorage.setItem(THEME_KEY, m);
  };

  const isDark = mode === "dark";
  const themeColors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDark, mode, colors: themeColors, setMode }}>
      <View style={{ flex: 1, ...(isDark ? darkVars : lightVars) }}>
        {children}
      </View>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
