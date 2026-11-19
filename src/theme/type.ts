import { Archivo_600SemiBold } from "@expo-google-fonts/archivo/600SemiBold";
import { Archivo_700Bold } from "@expo-google-fonts/archivo/700Bold";

/**
 * Cognify's type: a sturdy grotesque (Archivo) for headings and titles, the
 * system sans-serif for everything else. Only these two weights are bundled.
 * Don't set fontWeight on display text — the weight is part of the font name.
 */
export const fontAssets = {
  Archivo_600SemiBold,
  Archivo_700Bold,
};

export const fonts = {
  display: "Archivo_700Bold",
  displayMedium: "Archivo_600SemiBold",
} as const;
