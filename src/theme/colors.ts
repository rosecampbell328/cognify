/**
 * Cognify palette. Every colour in the app comes from here — screens use the
 * semantic `colors` tokens below, never raw hex values.
 */
export const palette = {
  deepDustyBlue: "#456783", // primary buttons and navigation
  softBlue: "#A9C2D4", // progress bars and secondary accents
  paleBlue: "#E8F0F5", // course cards and highlights
  warmTan: "#D9C3A3", // secondary backgrounds
  ivory: "#F8F5EF", // main app background
  darkCharcoal: "#303941", // text and headings
  mutedGold: "#D6AA63", // XP, streaks and achievements
} as const;

/**
 * Supporting shades derived from the palette: darker "edge" colours for the
 * chunky 3D buttons, softer text tints, and the correct/incorrect feedback
 * colours (the core palette has no green or red, so these are muted to match).
 */
const derived = {
  dustyBlueEdge: "#2F4A61",
  softBlueEdge: "#7F9DB3",
  goldEdge: "#AD8540",
  tanEdge: "#B89F7B",
  tanLight: "#F0E6D6",
  charcoalMuted: "#55616B",
  charcoalFaint: "#6F7A84",
  paleBlueBorder: "#CFDDE7",
  ivoryShade: "#E9E3D8",
  sage: "#5E8C6C",
  sageEdge: "#456B51",
  sageLight: "#E1EDE4",
  terracotta: "#B35F4C",
  terracottaEdge: "#8A4536",
  terracottaLight: "#F6E2DC",
} as const;

/** Semantic tokens used by components. */
export const colors = {
  background: palette.ivory,
  surface: palette.paleBlue,
  surfaceRaised: derived.paleBlueBorder,
  border: derived.paleBlueBorder,
  surfaceWarm: palette.warmTan,
  surfaceWarmLight: derived.tanLight,
  surfaceWarmEdge: derived.tanEdge,

  text: palette.darkCharcoal,
  textMuted: derived.charcoalMuted,
  textFaint: derived.charcoalFaint,
  textOnPrimary: palette.ivory,

  primary: palette.deepDustyBlue,
  primaryShadow: derived.dustyBlueEdge,
  secondary: palette.softBlue,
  secondaryShadow: derived.softBlueEdge,

  progress: palette.softBlue,
  progressTrack: derived.ivoryShade,

  xp: palette.mutedGold,
  xpShadow: derived.goldEdge,
  streak: palette.mutedGold,

  correct: derived.sage,
  correctShadow: derived.sageEdge,
  correctBg: derived.sageLight,
  wrong: derived.terracotta,
  wrongShadow: derived.terracottaEdge,
  wrongBg: derived.terracottaLight,

  locked: derived.ivoryShade,
  lockedEdge: "#D6CEC0",
  lockedText: "#9A9286",
} as const;

/** Colour cycle for course cards and path nodes. */
export const courseAccents = [
  { fill: palette.deepDustyBlue, shadow: derived.dustyBlueEdge },
  { fill: palette.softBlue, shadow: derived.softBlueEdge },
  { fill: palette.mutedGold, shadow: derived.goldEdge },
  { fill: palette.warmTan, shadow: derived.tanEdge },
] as const;

export function accentFor(index: number) {
  return courseAccents[Math.abs(index) % courseAccents.length];
}
