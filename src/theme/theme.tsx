import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { Platform, useColorScheme } from "react-native";

import { getState, subscribe as subscribeToApp, useAppState } from "@/lib/store";
import type { Appearance } from "@/lib/types";

import { darkColors, lightColors, type ThemeColors } from "./colors";

export type Scheme = "light" | "dark";

type Theme = { scheme: Scheme; colors: ThemeColors };

const ThemeContext = createContext<Theme>({ scheme: "light", colors: lightColors });

const resolve = (appearance: Appearance, system: string | null | undefined): Scheme =>
  appearance === "system" ? (system === "dark" ? "dark" : "light") : appearance;

/** Phones: React Native reports the system setting directly. */
function useSchemeNative(): Scheme {
  const system = useColorScheme();
  const appearance = useAppState((s) => s.settings.appearance);
  return resolve(appearance, system);
}

/**
 * Web: pages are rendered on the server first, which can't know the visitor's
 * setting, so the first render is always light and React switches to the real
 * scheme right after the page loads (useSyncExternalStore's server snapshot).
 * Otherwise the pre-rendered light page and a dark browser wouldn't match.
 */
const darkQuery = () =>
  typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

function subscribeWeb(onChange: () => void) {
  const query = darkQuery();
  query?.addEventListener("change", onChange);
  const unsubscribeApp = subscribeToApp(onChange);
  return () => {
    query?.removeEventListener("change", onChange);
    unsubscribeApp();
  };
}

function useSchemeWeb(): Scheme {
  return useSyncExternalStore(
    subscribeWeb,
    () => resolve(getState().settings.appearance, darkQuery()?.matches ? "dark" : "light"),
    () => "light",
  );
}

const useResolvedScheme = Platform.OS === "web" ? useSchemeWeb : useSchemeNative;

/**
 * Picks light or dark colours: the person's choice in Profile
 * (System / Light / Dark), where "System" follows the phone's setting.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useResolvedScheme();
  const value = useMemo<Theme>(() => ({ scheme, colors: scheme === "dark" ? darkColors : lightColors }), [scheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** The current colour tokens. */
export function useColors(): ThemeColors {
  return useContext(ThemeContext).colors;
}

/** "light" or "dark", after applying the person's preference. */
export function useScheme(): Scheme {
  return useContext(ThemeContext).scheme;
}

/**
 * Theme-aware StyleSheet: write styles as a function of the colours, call the
 * returned hook inside the component. Each mode's styles are built once.
 *
 *   const useStyles = makeStyles((colors) => StyleSheet.create({ ... }));
 *   function Thing() { const styles = useStyles(); ... }
 */
export function makeStyles<T>(factory: (colors: ThemeColors) => T) {
  const cache = new Map<ThemeColors, T>();
  return function useStyles(): T {
    const colors = useColors();
    if (!cache.has(colors)) cache.set(colors, factory(colors));
    return cache.get(colors) as T;
  };
}
