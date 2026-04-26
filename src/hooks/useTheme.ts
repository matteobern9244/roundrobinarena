import { useCallback, useEffect, useState } from "react";

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

function systemPrefersDark(): boolean {
  if (!isBrowser) return true; // dark by default su SSR
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolveTheme(mode: ThemeMode): Theme {
  if (mode === "light" || mode === "dark") return mode;
  return systemPrefersDark() ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  if (!isBrowser) return;
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  // Aggiorna meta theme-color (status bar PWA / Chrome mobile)
  const meta = document.querySelector<HTMLMetaElement>(
    'meta[name="theme-color"]:not([media])',
  );
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
 * l'idratazione restituisce "dark" come default ottimistico (lo script
 * inline in __root.tsx evita il flash visivo).
 */
export function useTheme(): UseThemeResult {
  // SSR-safe: parto sempre dai default per evitare hydration mismatch.
  // I valori reali vengono sincronizzati nel primo useEffect lato client.
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [theme, setTheme] = useState<Theme>("dark");

  // Sync iniziale lato client: legge localStorage + sistema dopo l'idratazione.
  useEffect(() => {
    if (!isBrowser) return;
    const m = readMode();
    setModeState(m);
    const next = resolveTheme(m);
    setTheme(next);
    applyTheme(next);
  }, []);

  // Applica il tema risolto su DOM ad ogni cambio di mode (o di sistema).
  useEffect(() => {
    if (!isBrowser) return;
    const next = resolveTheme(mode);
    setTheme(next);
    applyTheme(next);
  }, [mode]);

  // Se mode === "system", segui il cambio di prefers-color-scheme in tempo reale.
  useEffect(() => {
    if (!isBrowser || mode !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const next: Theme = mql.matches ? "dark" : "light";
      setTheme(next);
      applyTheme(next);
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [mode]);

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
