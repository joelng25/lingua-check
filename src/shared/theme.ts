import type { Settings } from "./types";

export function resolveTheme(theme: Settings["theme"]): "light" | "dark" {
  if (theme === "light" || theme === "dark") return theme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: Settings["theme"]): void {
  document.documentElement.dataset.theme = resolveTheme(theme);
}
