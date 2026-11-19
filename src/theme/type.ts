import { Fraunces_500Medium } from "@expo-google-fonts/fraunces/500Medium";
import { Fraunces_600SemiBold } from "@expo-google-fonts/fraunces/600SemiBold";

/**
 * Cognify's type: a warm serif (Fraunces) for headings and titles, the system
 * sans-serif for everything else. Only these two weights are bundled.
 * Don't set fontWeight on serif text — the weight is part of the font name.
 */
export const fontAssets = {
  Fraunces_500Medium,
  Fraunces_600SemiBold,
};

export const fonts = {
  serif: "Fraunces_600SemiBold",
  serifMedium: "Fraunces_500Medium",
} as const;
