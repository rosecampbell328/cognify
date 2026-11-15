import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

// Plain-text formats we can read on-device today. PDF/Docs/links are next.
const TEXT_TYPES = ["text/*", "application/json", "text/markdown", "text/csv"];

export type PickedText = { name: string; text: string };

/**
 * Let the user choose a text file and return its contents, or null if they cancel.
 * The picker and file reader are loaded on demand, so a build of Expo Go that
 * lacks either module shows a friendly error instead of crashing the screen.
 */
export async function pickTextFile(): Promise<PickedText | null> {
  const native = Platform.OS !== "web";
  if (native && !requireOptionalNativeModule("ExpoDocumentPicker")) {
    throw new Error("File upload isn't available in this version of the app yet. Paste the text instead.");
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const DocumentPicker = require("expo-document-picker") as typeof import("expo-document-picker");
  const result = await DocumentPicker.getDocumentAsync({ type: TEXT_TYPES, copyToCacheDirectory: true });
  if (result.canceled) return null;

  const asset = result.assets[0];
  let text: string;
  if (asset.file) {
    text = await asset.file.text(); // web
  } else if (requireOptionalNativeModule("FileSystem")) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { File } = require("expo-file-system") as typeof import("expo-file-system");
    text = await new File(asset.uri).text();
  } else {
    text = await (await fetch(asset.uri)).text();
  }

  if (!text.trim()) throw new Error("That file looks empty.");
  return { name: asset.name, text };
}
