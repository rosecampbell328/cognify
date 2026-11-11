import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChunkyButton, Heading, Icon, Muted } from "@/components/ui";
import { addSource } from "@/lib/store";
import { useCreateCourse } from "@/lib/useCreateCourse";
import { colors, palette } from "@/theme/colors";

type Mode = "paste" | "file";

// Plain-text formats we can read on-device today. PDF/Docs/links are next.
const TEXT_TYPES = ["text/*", "application/json", "text/markdown", "text/csv"];

export default function AddSourceScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>("paste");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [goal, setGoal] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { create, busy } = useCreateCourse();

  async function pickFile() {
    setError(null);
    const result = await DocumentPicker.getDocumentAsync({ type: TEXT_TYPES, copyToCacheDirectory: true });
    if (result.canceled) return;
    const asset = result.assets[0];
    try {
      const text = asset.file ? await asset.file.text() : await new File(asset.uri).text();
      if (!text.trim()) throw new Error("That file looks empty.");
      setContent(text);
      setFileName(asset.name);
      if (!title) setTitle(asset.name.replace(/\.[^.]+$/, ""));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that file. Try a .txt or .md file.");
    }
  }

  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const ready = content.trim().length > 80;

  async function submit() {
    const source = addSource({
      title: title.trim() || "Untitled notes",
      kind: mode === "file" ? "file" : "text",
      content: content.trim(),
    });
    await create(goal.trim(), [source], { replace: true });
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: (Platform.OS === "ios" ? 16 : insets.top + 12),
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 18,
          gap: 16,
        }}
      >
        <View style={styles.header}>
          <Pressable accessibilityLabel="Close" hitSlop={12} onPress={() => router.back()}>
            <Icon name="close" size={22} color={colors.textMuted} />
          </Pressable>
        </View>

        <Heading>Add a resource</Heading>
        <Muted>Give Cognify something to teach you. Notes, an article, a chapter — anything with words.</Muted>

        {/* Mode switch */}
        <View style={styles.segment}>
          {(["paste", "file"] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              style={[styles.segmentItem, mode === m && styles.segmentActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === m }}
            >
              <Icon name={m === "paste" ? "paste" : "upload"} size={18} color={mode === m ? colors.text : colors.textFaint} />
              <Text style={[styles.segmentText, mode === m && { color: colors.text }]}>
                {m === "paste" ? "Paste text" : "Upload file"}
              </Text>
            </Pressable>
          ))}
        </View>

        <Field label="Title">
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Biology chapter 3"
            placeholderTextColor={colors.textFaint}
            style={styles.input}
          />
        </Field>

        {mode === "paste" ? (
          <Field label="Your material" hint={words ? `${words.toLocaleString()} words` : undefined}>
            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder="Paste notes, an article, a transcript…"
              placeholderTextColor={colors.textFaint}
              multiline
              textAlignVertical="top"
              style={[styles.input, { minHeight: 180 }]}
            />
          </Field>
        ) : (
          <Pressable onPress={pickFile} style={styles.dropZone}>
            <Icon name={fileName ? "doc" : "upload"} size={34} color={palette.frozenLake} />
            <Text style={styles.dropTitle}>{fileName ?? "Choose a file"}</Text>
            <Muted style={{ textAlign: "center", fontSize: 13 }}>
              {fileName ? `${words.toLocaleString()} words loaded · tap to replace` : ".txt, .md, .csv or .json for now — PDFs coming next"}
            </Muted>
          </Pressable>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Field label="What do you want to learn? (optional)">
          <TextInput
            value={goal}
            onChangeText={setGoal}
            placeholder="e.g. Pass my exam on cell biology"
            placeholderTextColor={colors.textFaint}
            style={styles.input}
          />
        </Field>

        <ChunkyButton
          label={busy ? "Building your course…" : "Create my course"}
          icon="sparkles"
          disabled={!ready}
          loading={busy}
          onPress={submit}
          style={{ marginTop: 4 }}
        />
        {!ready && content.length > 0 ? (
          <Muted style={{ textAlign: "center", fontSize: 13 }}>Add a little more text to build lessons from.</Muted>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "flex-start" },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 4,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
  },
  segmentActive: { backgroundColor: colors.secondary },
  segmentText: { color: colors.textFaint, fontWeight: "800" },
  label: { color: colors.text, fontWeight: "800", fontSize: 15 },
  hint: { color: colors.textFaint, fontSize: 13, fontWeight: "600" },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.surfaceRaised,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 16,
  },
  dropZone: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: palette.softPeriwinkle,
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surface,
  },
  dropTitle: { color: colors.text, fontWeight: "800", fontSize: 16 },
  error: { color: colors.wrong, fontWeight: "700" },
});
