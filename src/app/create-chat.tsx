import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LogoMark } from "@/components/LogoMark";
import { Button, Icon } from "@/components/ui";
import { sendChat, type ChatMessage } from "@/lib/chat";
import { makeId, useAppState } from "@/lib/store";
import { useCreateCourse } from "@/lib/useCreateCourse";
import { makeStyles, useColors } from "@/theme/theme";
import { fonts } from "@/theme/type";

const SUGGESTIONS = [
  "Vacation phrases in Spanish",
  "Personal finance basics",
  "Beginner photography",
  "How the stock market works",
];

type Plan = { title: string; brief: string };

export default function CreateChatScreen() {
  const colors = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const firstName = useAppState((s) => s.profile.name.split(" ")[0]);
  const greeting: ChatMessage = {
    id: "greeting",
    role: "assistant",
    text: `Hi ${firstName}! What would you like to learn? I may ask a quick question or two, then I'll build your course.`,
  };

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const { create, busy } = useCreateCourse();

  async function send(text: string, history = messages) {
    const trimmed = text.trim();
    if (!trimmed || sending || busy) return;
    const next = [...history, { id: makeId(), role: "user" as const, text: trimmed }];
    setMessages(next);
    setDraft("");
    await ask(next);
  }

  async function ask(conversation: ChatMessage[]) {
    setSending(true);
    setError(null);
    const reply = await sendChat(conversation);
    setSending(false);
    if (!reply.ok) {
      setError(reply.message);
      return;
    }
    setMessages([...conversation, { id: makeId(), role: "assistant", text: reply.reply }]);
    setPlan(reply.ready ? { title: reply.title, brief: reply.brief } : null);
  }

  function build() {
    if (!plan) return;
    create(`${plan.title}\n\n${plan.brief}`, [], { replace: true });
  }

  const lastIsUser = messages.length > 0 && messages[messages.length - 1].role === "user";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === "ios" ? 16 : insets.top + 10 }]}>
        <Pressable accessibilityLabel="Close" hitSlop={12} onPress={() => router.back()}>
          <Icon name="close" size={22} color={colors.textMuted} />
        </Pressable>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <LogoMark size={24} />
          <Text style={styles.headerTitle}>Build with AI</Text>
        </View>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: 18, gap: 12, paddingBottom: 24 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      >
        {[greeting, ...messages].map((m) => (
          <Animated.View
            key={m.id}
            entering={FadeInUp.duration(220)}
            style={[styles.bubble, m.role === "user" ? styles.userBubble : styles.aiBubble]}
          >
            <Text style={m.role === "user" ? styles.userText : styles.aiText}>{m.text}</Text>
          </Animated.View>
        ))}

        {messages.length === 0 ? (
          <View style={styles.chips}>
            {SUGGESTIONS.map((s) => (
              <Pressable key={s} onPress={() => send(s)} style={styles.chip} accessibilityRole="button">
                <Text style={styles.chipText}>{s}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {sending ? (
          <View style={[styles.bubble, styles.aiBubble, { flexDirection: "row", gap: 8, alignItems: "center" }]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.aiText}>Thinking…</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            {lastIsUser ? (
              <Pressable onPress={() => ask(messages)} hitSlop={8}>
                <Text style={styles.retry}>Try again</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {plan && !sending ? (
          <Animated.View entering={FadeInUp.duration(250)} style={styles.planCard}>
            <Text style={styles.planEyebrow}>YOUR COURSE PLAN</Text>
            <Text style={styles.planTitle}>{plan.title}</Text>
            <Text style={styles.planBrief} numberOfLines={4}>
              {plan.brief}
            </Text>
            <Button
              label={busy ? "Building your course…" : "Build my course"}
              icon="sparkles"
              loading={busy}
              onPress={build}
            />
            <Text style={styles.planHint}>Want changes? Just tell me below.</Text>
          </Animated.View>
        ) : null}
      </ScrollView>

      {/* Composer */}
      <View style={[styles.composer, { paddingBottom: insets.bottom + 10 }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={messages.length ? "Reply…" : "I want to learn…"}
          placeholderTextColor={colors.textFaint}
          style={styles.input}
          multiline
          editable={!busy}
          onSubmitEditing={() => send(draft)}
          submitBehavior="submit"
          onKeyPress={(e) => {
            // Web keeps Enter as a newline in multiline inputs; make it send (Shift+Enter = newline).
            const ev = e.nativeEvent as { key: string; shiftKey?: boolean };
            if (Platform.OS === "web" && ev.key === "Enter" && !ev.shiftKey) {
              e.preventDefault();
              send(draft);
            }
          }}
          returnKeyType="send"
          accessibilityLabel="Message"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send"
          onPress={() => send(draft)}
          disabled={!draft.trim() || sending || busy}
          style={[styles.sendButton, (!draft.trim() || sending || busy) && { backgroundColor: colors.locked }]}
        >
          <Icon name="send" size={20} color={draft.trim() && !sending ? colors.textOnPrimary : colors.lockedText} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 18,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 19 },
    bubble: { maxWidth: "85%", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 11 },
    aiBubble: {
      alignSelf: "flex-start",
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderBottomLeftRadius: 6,
    },
    userBubble: { alignSelf: "flex-end", backgroundColor: colors.primary, borderBottomRightRadius: 6 },
    aiText: { color: colors.text, fontSize: 16, lineHeight: 22 },
    userText: { color: colors.textOnPrimary, fontSize: 16, lineHeight: 22 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
    chip: {
      borderWidth: 1.5,
      borderColor: colors.secondary,
      backgroundColor: colors.background,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    chipText: { color: colors.primary, fontWeight: "700", fontSize: 14 },
    errorBox: { backgroundColor: colors.wrongBg, borderRadius: 16, padding: 14, gap: 6 },
    errorText: { color: colors.text, fontSize: 14, lineHeight: 20 },
    retry: { color: colors.wrong, fontWeight: "700" },
    planCard: {
      backgroundColor: colors.accentSurfaceSoft,
      borderWidth: 1.5,
      borderColor: colors.accentSurface,
      borderRadius: 22,
      padding: 16,
      gap: 10,
      marginTop: 4,
    },
    planEyebrow: { color: colors.primaryShadow, fontWeight: "700", fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase" },
    planTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 22, lineHeight: 28 },
    planBrief: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
    planHint: { color: colors.textFaint, fontSize: 13, textAlign: "center" },
    composer: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 10,
      paddingHorizontal: 14,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    input: {
      flex: 1,
      maxHeight: 120,
      minHeight: 46,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 23,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 12,
      color: colors.text,
      fontSize: 16,
    },
    sendButton: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
  }),
);
