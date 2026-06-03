export const THEME_STORAGE_KEY = "talkapp-theme";

export type ThemeMode = "dark" | "light";

export function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  return localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark";
}

export function applyTheme(theme: ThemeMode) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function initTheme(): ThemeMode {
  const theme = getStoredTheme();
  applyTheme(theme);
  return theme;
}

export function persistTheme(theme: ThemeMode) {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  applyTheme(theme);
}
