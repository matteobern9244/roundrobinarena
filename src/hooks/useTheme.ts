import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useHydrated } from "@/hooks/useHydrated";

export type Theme = "light" | "dark";
/** "system" = nessuna preferenza salvata, segue prefers-color-scheme. */
export type ThemeMode = Theme | "system";

const STORAGE_KEY = "pp-theme";
const META_THEME_COLOR_LIGHT = "#fafafa";
const META_THEME_COLOR_DARK = "#0a0a14";

const isBrowser = typeof window !== "undefined";

function readMode(): ThemeMode {
  if (!isBrowser) return "system";
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark") return v;
  } catch {
    /* ignore */
  }
  return "system";
}

const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribeSystemTheme(onChange: () => void) {
  const mql = window.matchMedia(DARK_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function systemPrefersDark(): boolean {
  return window.matchMedia(DARK_QUERY).matches;
}

function resolveTheme(mode: ThemeMode, systemDark: boolean): Theme {
  if (mode === "light" || mode === "dark") return mode;
  return systemDark ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  if (!isBrowser) return;
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  // Aggiorna meta theme-color (status bar PWA / Chrome mobile)
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])');
  if (meta) {
    meta.content = theme === "dark" ? META_THEME_COLOR_DARK : META_THEME_COLOR_LIGHT;
  }
}

export type UseThemeResult = {
  /** Tema attualmente applicato (risolto). */
  theme: Theme;
  /** Preferenza utente: "light" | "dark" | "system". */
  mode: ThemeMode;
  /** Forza un tema specifico o torna a "system". */
  setMode: (m: ThemeMode) => void;
  /** Toggle binario light↔dark (forza, esce da system). */
  toggle: () => void;
};

/**
 * Gestione tema: legge preferenza salvata o di sistema, applica la classe
 * `dark` su <html>, sincronizza il meta `theme-color`. SSR-safe: durante
 * l'idratazione restituisce "dark", lo stesso tema del markup SSR
 * (`<html class="dark">` in RootShell).
 */
export function useTheme(): UseThemeResult {
  // SSR-safe: parto sempre dai default per evitare hydration mismatch.
  // La preferenza salvata viene letta subito dopo l'idratazione.
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [synced, setSynced] = useState(false);
  const hydrated = useHydrated();
  if (hydrated && !synced) {
    setSynced(true);
    setModeState(readMode());
  }

  // Segue prefers-color-scheme in tempo reale; sul server vale "dark".
  const systemDark = useSyncExternalStore(subscribeSystemTheme, systemPrefersDark, () => true);
  const theme = resolveTheme(mode, systemDark);

  // Applica il tema su DOM solo dopo aver letto la preferenza reale: fino ad
  // allora resta la classe `dark` del markup SSR.
  useEffect(() => {
    if (synced) applyTheme(theme);
  }, [synced, theme]);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    if (!isBrowser) return;
    try {
      if (m === "system") window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, m);
    } catch {
      /* ignore quota / privacy */
    }
  }, []);

  const toggle = useCallback(() => {
    setMode(theme === "dark" ? "light" : "dark");
  }, [theme, setMode]);

  return { theme, mode, setMode, toggle };
}
