/**
 * Cognify colours: the "Teal" scheme in a light and a dark version.
 * Screens never use raw hex values — they read these tokens through
 * `useColors()` / `makeStyles()` (see ./theme.tsx), so switching modes
 * restyles the whole app.
 *
 * Roles: teal leads (buttons, navigation, progress), amber is the reward
 * colour (XP, streaks, achievements), green/rose are only for right/wrong.
 */
export type ThemeColors = {
  background: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  /** Tinted cards that call attention (e.g. "Describe it to AI", course banner). */
  accentSurface: string;
  accentSurfaceSoft: string;
  accentBorder: string;

  text: string;
  textMuted: string;
  textFaint: string;
  textOnPrimary: string;

  primary: string;
  primaryShadow: string;
  secondary: string;
  secondaryShadow: string;

  progress: string;
  progressTrack: string;

  xp: string;
  xpShadow: string;
  streak: string;

  correct: string;
  correctShadow: string;
  correctBg: string;
  wrong: string;
  wrongShadow: string;
  wrongBg: string;

  /** Soft lift under solid buttons and raised cards. */
  liftShadow: string;

  locked: string;
  lockedEdge: string;
  lockedText: string;
};

export const lightColors: ThemeColors = {
  background: "#F5F8F9",
  surface: "#FFFFFF",
  surfaceRaised: "#E8F0F2",
  border: "#DCE6E9",
  accentSurface: "#DDF3F0",
  accentSurfaceSoft: "#EEF9F7",
  accentBorder: "#99D9D0",

  text: "#0B1F2A",
  textMuted: "#45606B",
  textFaint: "#62777F",
  textOnPrimary: "#FFFFFF",

  primary: "#0F766E",
  primaryShadow: "#115E59",
  secondary: "#CCEFEA",
  secondaryShadow: "#8DD8CE",

  progress: "#14B8A6",
  progressTrack: "#E3ECEE",

  xp: "#F59E0B",
  xpShadow: "#B45309",
  streak: "#F97316",

  correct: "#059669",
  correctShadow: "#047857",
  correctBg: "#E3F6EE",
  wrong: "#E11D48",
  wrongShadow: "#9F1239",
  wrongBg: "#FDE8EE",

  liftShadow: "0px 4px 14px rgba(15, 118, 110, 0.18)",

  locked: "#EBF0F2",
  lockedEdge: "#D3DDE0",
  lockedText: "#8FA3AA",
};

export const darkColors: ThemeColors = {
  background: "#0A1517",
  surface: "#122124",
  surfaceRaised: "#1A2E32",
  border: "#21383C",
  accentSurface: "#0F3532",
  accentSurfaceSoft: "#0E2A28",
  accentBorder: "#1F6B63",

  text: "#E4F1F2",
  textMuted: "#9DB8BC",
  textFaint: "#7A9599",
  // Bright aqua buttons need dark text to stay readable.
  textOnPrimary: "#04201D",

  primary: "#2DD4BF",
  primaryShadow: "#14B8A6",
  secondary: "#173B3A",
  secondaryShadow: "#24574F",

  progress: "#2DD4BF",
  progressTrack: "#1A2E32",

  xp: "#FBBF24",
  xpShadow: "#D97706",
  streak: "#FB923C",

  correct: "#34D399",
  correctShadow: "#059669",
  correctBg: "#0F2A24",
  wrong: "#FB7185",
  wrongShadow: "#E11D48",
  wrongBg: "#341820",

  liftShadow: "0px 6px 18px rgba(45, 212, 191, 0.18)",

  locked: "#16262A",
  lockedEdge: "#25393D",
  lockedText: "#5E777B",
};

/**
 * Fixed brand colours for the logo mark and app icon — the same in light and
 * dark mode, matching assets/expo.icon/Assets/cognify-notes.svg.
 */
export const brand = {
  tile: "#0F766E",
  backCard: "#2DD4BF",
  middleCard: "#FCD34D",
  note: "#F8FAFC",
  headingLine: "#F59E0B",
  line: "#7FD3C8",
} as const;
