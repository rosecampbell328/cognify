import { SpaceGrotesk_600SemiBold } from "@expo-google-fonts/space-grotesk/600SemiBold";
import { SpaceGrotesk_700Bold } from "@expo-google-fonts/space-grotesk/700Bold";

/**
 * Cognify's type: a blocky geometric display face (Space Grotesk) for
 * headings and titles, the system sans-serif for everything else. Only these
 * two weights are bundled. Don't set fontWeight on display text — the weight
 * is part of the font name.
 */
export const fontAssets = {
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
};

export const fonts = {
  display: "SpaceGrotesk_700Bold",
  displayMedium: "SpaceGrotesk_600SemiBold",
} as const;
