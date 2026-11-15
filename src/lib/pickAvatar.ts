import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

/**
 * Let the user choose a square profile photo and return a URI that survives
 * app restarts, or null if they cancel.
 * - Native: the picked image is copied into the app's document folder (the
 *   picker's own copy lives in a cache the system may clear).
 * - Web: the image is stored as a data URI, since blob URLs die with the tab.
 */
export async function pickAvatar(): Promise<string | null> {
  const web = Platform.OS === "web";
  if (!web && !requireOptionalNativeModule("ExponentImagePicker")) {
    throw new Error("Choosing a photo isn't available in this version of the app yet.");
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ImagePicker = require("expo-image-picker") as typeof import("expo-image-picker");
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.6,
    base64: web,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];

  if (web) {
    if (asset.uri.startsWith("data:")) return asset.uri;
    if (asset.base64) return `data:${asset.mimeType ?? "image/jpeg"};base64,${asset.base64}`;
    return asset.uri;
  }

  if (!requireOptionalNativeModule("FileSystem")) return asset.uri;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { File, Paths } = require("expo-file-system") as typeof import("expo-file-system");
  // A fresh name each time so the Image component doesn't show a cached old photo.
  const dest = new File(Paths.document, `avatar-${Date.now()}.jpg`);
  await new File(asset.uri).copy(dest);
  return dest.uri;
}

/** Best-effort cleanup of a previous avatar file on native. */
export function deleteAvatarFile(uri: string | null) {
  if (!uri || Platform.OS === "web" || !uri.startsWith("file:")) return;
  if (!requireOptionalNativeModule("FileSystem")) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { File } = require("expo-file-system") as typeof import("expo-file-system");
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // leaving an old file behind is harmless
  }
}
