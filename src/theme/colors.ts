/**
 * Cognify palette. Every colour in the app comes from here.
 * Names follow the shades supplied in the brand brief.
 */
export const palette = {
  // Blues → violets
  frozenLake: "#97dffc",
  skyBlue: "#93caf6",
  babyBlueIce: "#8eb5f0",
  softPeriwinkle: "#858ae3",
  slateBlue: "#7364d2",
  violetTwilight: "#613dc1",
  rebeccaPurple: "#5829a7",
  indigo: "#4e148c",
  indigoDeep: "#461177",
  darkAmethyst: "#3d0e61",

  // Citrus burst
  pumpkinSpice: "#f56a00",
  darkOrange: "#fa8b01",
  orange: "#ffad03",
  sunflowerGold: "#ffc243",
  royalGold: "#ffcf70",
  mauve: "#cea7ee",
  brightLavender: "#b67be6",
  lavenderPurple: "#9d4edd",
  indigoBloom: "#72369d",
  darkAmethystPlum: "#461e5c",
} as const;

/** Semantic tokens used by components. */
export const colors = {
  background: "#240a3d", // a touch deeper than Dark Amethyst so cards lift off it
  surface: palette.darkAmethyst,
  surfaceRaised: palette.indigoDeep,
  border: palette.indigoBloom,

  text: "#f6efff",
  textMuted: palette.mauve,
  textFaint: palette.softPeriwinkle,

  primary: palette.lavenderPurple,
  primaryShadow: palette.indigoBloom,
  secondary: palette.slateBlue,
  secondaryShadow: palette.rebeccaPurple,

  xp: palette.sunflowerGold,
  streak: palette.darkOrange,

  correct: palette.frozenLake,
  correctShadow: palette.babyBlueIce,
  correctBg: "#16324a",
  wrong: palette.pumpkinSpice,
  wrongShadow: "#b84f00",
  wrongBg: "#45200f",

  locked: palette.darkAmethystPlum,
  lockedText: palette.indigoBloom,
} as const;

/** Colour cycle for course cards and path nodes. */
export const courseAccents = [
  { fill: palette.lavenderPurple, shadow: palette.indigoBloom },
  { fill: palette.slateBlue, shadow: palette.rebeccaPurple },
  { fill: palette.darkOrange, shadow: palette.pumpkinSpice },
  { fill: palette.softPeriwinkle, shadow: palette.violetTwilight },
  { fill: palette.brightLavender, shadow: palette.lavenderPurple },
  { fill: palette.sunflowerGold, shadow: palette.orange },
] as const;

export function accentFor(index: number) {
  return courseAccents[Math.abs(index) % courseAccents.length];
}
