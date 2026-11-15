import { requireOptionalNativeModule } from "expo";
import type { DocumentPickerAsset } from "expo-document-picker";
import { Platform } from "react-native";

import { makeId } from "./store";

const ACCEPTED = ["application/pdf", "text/*", "application/json", "text/markdown", "text/csv"];

export type PickedFile = {
  id: string;
  name: string;
  kind: "text" | "pdf";
  text: string;
  pages?: number;
};

export type PickResult = { files: PickedFile[]; errors: string[] };

const isPdf = (a: DocumentPickerAsset) =>
  a.mimeType === "application/pdf" || a.name.toLowerCase().endsWith(".pdf");

/**
 * Let the user choose one or more text files or PDFs and return their text.
 * Native modules load on demand, so an Expo Go build missing one shows a
 * message instead of crashing. Files that fail are reported in `errors`
 * while the rest still come back.
 */
export async function pickFiles(): Promise<PickResult | null> {
  const native = Platform.OS !== "web";
  if (native && !requireOptionalNativeModule("ExpoDocumentPicker")) {
    throw new Error("File upload isn't available in this version of the app yet. Paste the text instead.");
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const DocumentPicker = require("expo-document-picker") as typeof import("expo-document-picker");
  const result = await DocumentPicker.getDocumentAsync({
    type: ACCEPTED,
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;

  const settled = await Promise.allSettled(result.assets.map(readAsset));
  const files: PickedFile[] = [];
  const errors: string[] = [];
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") files.push(r.value);
    else errors.push(r.reason instanceof Error ? r.reason.message : `Couldn't read ${result.assets[i].name}.`);
  });
  return { files, errors };
}

async function readAsset(asset: DocumentPickerAsset): Promise<PickedFile> {
  if (isPdf(asset)) {
    const base64 = await readBase64(asset);
    const res = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: asset.name, base64 }),
    }).catch(() => null);
    const body = await res?.json().catch(() => null);
    if (!res || !res.ok || !body?.text) {
      throw new Error(body?.message ?? `Couldn't reach the server to read “${asset.name}”.`);
    }
    return { id: makeId(), name: asset.name, kind: "pdf", text: body.text, pages: body.pages };
  }

  const text = await readText(asset);
  if (!text.trim()) throw new Error(`“${asset.name}” looks empty.`);
  return { id: makeId(), name: asset.name, kind: "text", text };
}

async function readText(asset: DocumentPickerAsset): Promise<string> {
  if (asset.file) return asset.file.text(); // web
  if (requireOptionalNativeModule("FileSystem")) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { File } = require("expo-file-system") as typeof import("expo-file-system");
    return new File(asset.uri).text();
  }
  return (await fetch(asset.uri)).text();
}

async function readBase64(asset: DocumentPickerAsset): Promise<string> {
  if (asset.file) {
    // web: ArrayBuffer → base64 in chunks (String.fromCharCode has an argument limit)
    const bytes = new Uint8Array(await asset.file.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
  }
  if (!requireOptionalNativeModule("FileSystem")) {
    throw new Error("PDFs can't be read in this version of the app yet.");
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { File } = require("expo-file-system") as typeof import("expo-file-system");
  return new File(asset.uri).base64();
}
