import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const THEME_KEY = "app.theme.preference";

export type ThemeMode = "light" | "dark";

export const darkColors = {
  primary: "#4B8EF5",
  secondary: "#34D399",
  accent: "#FBBF24",
  purple: "#A78BFA",
  background: "#0F172A",
  surface: "#1E293B",
  surfaceAlt: "#263348",
  card: "#1E293B",
  text: "#F1F5F9",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",
  border: "#334155",
  divider: "#1E293B",
  white: "#1E293B",
  error: "#F87171",
};

type ThemeContextType = {
  isDark: boolean;
  mode: ThemeMode;
  dark: typeof darkColors;
  setMode: (m: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  mode: "light",
  dark: darkColors,
  setMode: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setModeState] = useState<ThemeMode>("light");

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((v) => {
      if (v === "dark" || v === "light") setModeState(v);
    });
  }, []);

  const setMode = async (m: ThemeMode) => {
    setModeState(m);
    await AsyncStorage.setItem(THEME_KEY, m);
  };

  return (
    <ThemeContext.Provider value={{ isDark: mode === "dark", mode, dark: darkColors, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
