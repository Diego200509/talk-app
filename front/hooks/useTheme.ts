"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getStoredTheme,
  initTheme,
  persistTheme,
  type ThemeMode,
} from "@/lib/theme";

export type { ThemeMode };

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>("dark");

  useEffect(() => {
    setThemeState(initTheme());
  }, []);

  const setTheme = useCallback((next: ThemeMode) => {
    setThemeState(next);
    persistTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      persistTheme(next);
      return next;
    });
  }, []);

  return { theme, setTheme, toggleTheme };
}

export { getStoredTheme, initTheme, persistTheme };
