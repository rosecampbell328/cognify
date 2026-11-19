import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
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

import { Button, Heading, Icon, Muted } from "@/components/ui";
import { pickFiles, type PickedFile } from "@/lib/pickFiles";
import { addSource } from "@/lib/store";
import type { Source } from "@/lib/types";
import { useCreateCourse } from "@/lib/useCreateCourse";
import { colors } from "@/theme/colors";
import { fonts } from "@/theme/type";

const countWords = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);
const stripExt = (name: string) => name.replace(/\.[^.]+$/, "");

export default function AddSourceScreen() {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState("");
  const [pasted, setPasted] = useState("");
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [goal, setGoal] = useState("");
  const [reading, setReading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const { create, busy } = useCreateCourse();

  async function addFiles() {
    setErrors([]);
    setReading(true);
    try {
      const result = await pickFiles();
      if (!result) return;
      setFiles((prev) => [...prev, ...result.files]);
      setErrors(result.errors);
    } catch (e) {
      setErrors([e instanceof Error ? e.message : "Couldn't open those files."]);
    } finally {
      setReading(false);
    }
  }

  const pastedReady = pasted.trim().length > 80;
  const ready = pastedReady || files.length > 0;
  const totalWords = countWords(pasted) + files.reduce((n, f) => n + countWords(f.text), 0);

  async function submit() {
    const sources: Source[] = files.map((f) =>
      addSource({ title: stripExt(f.name), kind: f.kind === "pdf" ? "pdf" : "file", content: f.text.trim() }),
    );
    if (pastedReady) {
      sources.push(addSource({ title: title.trim() || "Pasted notes", kind: "text", content: pasted.trim() }));
    }
    await create(goal.trim(), sources, { replace: true, title });
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: Platform.OS === "ios" ? 16 : insets.top + 12,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 18,
          gap: 16,
        }}
      >
        <Pressable accessibilityLabel="Close" hitSlop={12} onPress={() => router.back()}>
          <Icon name="close" size={22} color={colors.textMuted} />
        </Pressable>

        <Heading>New course</Heading>

        {/* Chat with AI */}
        <Pressable
          onPress={() => router.push("/create-chat")}
          accessibilityRole="button"
          style={({ pressed }) => [styles.chatCard, pressed && { transform: [{ translateY: 2 }] }]}
        >
          <View style={styles.chatIcon}>
            <Icon name="chat" size={24} color={colors.textOnPrimary} />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={styles.chatTitle}>Describe it to AI</Text>
            <Text style={styles.chatBody}>
              Tell the AI what you want to learn, like vacation phrases in Spanish, and it builds the course for you.
            </Text>
          </View>
          <Icon name="chevron" size={18} color={colors.textMuted} />
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or build from your materials</Text>
          <View style={styles.dividerLine} />
        </View>

        <Field label="Course name (optional)">
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Biology chapter 3"
            placeholderTextColor={colors.textFaint}
            style={styles.input}
          />
        </Field>

        {/* Paste text and upload files, one section */}
        <Field label="Your materials" hint={totalWords ? `${totalWords.toLocaleString()} words` : undefined}>
          <View style={styles.materials}>
            <TextInput
              value={pasted}
              onChangeText={setPasted}
              placeholder="Paste notes, an article, a transcript…"
              placeholderTextColor={colors.textFaint}
              multiline
              textAlignVertical="top"
              style={styles.pasteInput}
              accessibilityLabel="Paste text"
            />

            {files.length > 0 ? (
              <View style={styles.fileList}>
                {files.map((f) => (
                  <View key={f.id} style={styles.fileRow}>
                    <Icon name={f.kind === "pdf" ? "pdf" : "doc"} size={20} color={colors.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fileName} numberOfLines={1}>
                        {f.name}
                      </Text>
                      <Text style={styles.fileMeta}>
                        {f.pages ? `${f.pages} page${f.pages === 1 ? "" : "s"} · ` : ""}
                        {countWords(f.text).toLocaleString()} words
                      </Text>
                    </View>
                    <Pressable
                      accessibilityLabel={`Remove ${f.name}`}
                      hitSlop={10}
                      onPress={() => setFiles((prev) => prev.filter((x) => x.id !== f.id))}
                    >
                      <Icon name="close" size={18} color={colors.textFaint} />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}

            <Pressable
              onPress={addFiles}
              disabled={reading}
              accessibilityRole="button"
              style={({ pressed }) => [styles.addFiles, pressed && { opacity: 0.7 }]}
            >
              {reading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Icon name="attach" size={20} color={colors.primary} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.addFilesTitle}>{reading ? "Reading files…" : "Add files"}</Text>
                <Text style={styles.addFilesHint}>PDF, TXT or MD · pick as many as you like</Text>
              </View>
            </Pressable>
          </View>
        </Field>

        {errors.map((e) => (
          <Text key={e} style={styles.error}>
            {e}
          </Text>
        ))}

        <Field label="What do you want to learn? (optional)">
          <TextInput
            value={goal}
            onChangeText={setGoal}
            placeholder="e.g. Pass my exam on cell biology"
            placeholderTextColor={colors.textFaint}
            style={styles.input}
          />
        </Field>

        <Button
          label={busy ? "Building your course…" : "Create my course"}
          icon="sparkles"
          disabled={!ready || reading}
          loading={busy}
          onPress={submit}
          style={{ marginTop: 4 }}
        />
        {!ready && pasted.length > 0 ? (
          <Muted style={{ textAlign: "center", fontSize: 13 }}>Add a little more text, or a file, to build lessons from.</Muted>
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
  chatCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.surfaceWarmLight,
    borderWidth: 1.5,
    borderColor: colors.surfaceWarm,
    borderRadius: 20,
    padding: 16,
  },
  chatIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  chatTitle: { color: colors.text, fontFamily: fonts.serif, fontSize: 19 },
  chatBody: { color: colors.textMuted, fontSize: 14, lineHeight: 19 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dividerLine: { flex: 1, height: 2, backgroundColor: colors.border },
  dividerText: { color: colors.textFaint, fontWeight: "700", fontSize: 13 },
  label: { color: colors.text, fontWeight: "700", fontSize: 15 },
  hint: { color: colors.textFaint, fontSize: 13, fontWeight: "600" },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 16,
  },
  materials: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 18,
    overflow: "hidden",
  },
  pasteInput: {
    minHeight: 150,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    color: colors.text,
    fontSize: 16,
  },
  fileList: { borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 12, paddingVertical: 6 },
  fileRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, paddingHorizontal: 4 },
  fileName: { color: colors.text, fontWeight: "700", fontSize: 15 },
  fileMeta: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  addFiles: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderStyle: "dashed",
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  addFilesTitle: { color: colors.primary, fontWeight: "700", fontSize: 15 },
  addFilesHint: { color: colors.textFaint, fontSize: 12, marginTop: 1 },
  error: { color: colors.wrong, fontWeight: "700" },
});
