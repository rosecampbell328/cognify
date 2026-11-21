import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LogoMark } from "@/components/LogoMark";
import { Button, Heading, Icon, Muted } from "@/components/ui";
import {
  createProfile,
  getAccount,
  normalizeUsername,
  sendSignInCode,
  suggestUsername,
  usernameProblem,
  verifySignInCode,
} from "@/lib/social/account";
import { socialEnabled } from "@/lib/social/client";
import { useAppState } from "@/lib/store";
import { makeStyles, useColors } from "@/theme/theme";

type Step = "email" | "code" | "username";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignInScreen() {
  const colors = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const localName = useAppState((s) => s.profile.name);
  const [step, setStep] = useState<Step>(() => (getAccount().session && !getAccount().profile ? "username" : "email"));
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [username, setUsername] = useState(() => suggestUsername(localName));
  const [displayName, setDisplayName] = useState(localName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const sendCode = () =>
    run(async () => {
      await sendSignInCode(email);
      setNotice(null);
      setStep("code");
    });

  const verify = () =>
    run(async () => {
      const profile = await verifySignInCode(email, code);
      if (profile) router.back();
      else setStep("username");
    });

  const finish = () =>
    run(async () => {
      await createProfile(username, displayName);
      router.back();
    });

  const resend = () =>
    run(async () => {
      await sendSignInCode(email);
      setNotice("A new code is on its way.");
    });

  const handle = normalizeUsername(username);
  const handleProblem = handle ? usernameProblem(handle) : null;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: Platform.OS === "ios" ? 16 : insets.top + 12,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 20,
          gap: 16,
        }}
      >
        <Pressable accessibilityLabel="Close" hitSlop={12} onPress={() => router.back()}>
          <Icon name="close" size={22} color={colors.textMuted} />
        </Pressable>

        <LogoMark size={48} />

        {!socialEnabled ? (
          <>
            <Heading>Accounts aren’t set up yet</Heading>
            <Muted>
              Sharing courses and adding friends need a Supabase project. Add EXPO_PUBLIC_SUPABASE_URL and
              EXPO_PUBLIC_SUPABASE_ANON_KEY to .env.local and restart the app. The README has the steps.
            </Muted>
          </>
        ) : step === "email" ? (
          <>
            <Heading>Your Cognify account</Heading>
            <Muted>Sign in to share courses and add friends. We’ll email you a 6-digit code, no password needed.</Muted>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.textFaint}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              onSubmitEditing={() => EMAIL.test(email.trim()) && sendCode()}
              style={styles.input}
              accessibilityLabel="Email"
            />
            <Button label="Email me a code" loading={busy} disabled={!EMAIL.test(email.trim())} onPress={sendCode} />
          </>
        ) : step === "code" ? (
          <>
            <Heading>Check your email</Heading>
            <Muted>
              Enter the code we sent to <Text style={{ fontWeight: "700", color: colors.text }}>{email.trim()}</Text>.
            </Muted>
            <TextInput
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, ""))}
              placeholder="123456"
              placeholderTextColor={colors.textFaint}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={10}
              onSubmitEditing={() => code.length >= 6 && verify()}
              style={[styles.input, styles.codeInput]}
              accessibilityLabel="Code"
            />
            <Button label="Sign in" loading={busy} disabled={code.length < 6} onPress={verify} />
            <View style={styles.row}>
              <Pressable onPress={resend} disabled={busy} hitSlop={8}>
                <Text style={styles.link}>Send a new code</Text>
              </Pressable>
              <Pressable onPress={() => setStep("email")} disabled={busy} hitSlop={8}>
                <Text style={styles.link}>Use a different email</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <Heading>Set up your profile</Heading>
            <Muted>Your name and username show on your profile and on courses you share.</Muted>
            <Text style={styles.label}>Your name</Text>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              placeholderTextColor={colors.textFaint}
              autoComplete="name"
              maxLength={40}
              style={styles.input}
              accessibilityLabel="Your name"
            />
            <Text style={styles.label}>Username</Text>
            <View style={styles.handleBox}>
              <Text style={styles.at}>@</Text>
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="yourname"
                placeholderTextColor={colors.textFaint}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={21}
                onSubmitEditing={() => !handleProblem && handle && finish()}
                style={styles.handleInput}
                accessibilityLabel="Username"
              />
            </View>
            <Text style={[styles.hint, handleProblem && { color: colors.wrong }]}>
              {handleProblem ?? "Lowercase letters, numbers and _ · 3 to 20 characters"}
            </Text>
            <Button label="Finish" loading={busy} disabled={!handle || !!handleProblem || !displayName.trim()} onPress={finish} />
          </>
        )}

        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
      color: colors.text,
      fontSize: 17,
    },
    codeInput: { fontSize: 26, letterSpacing: 8, textAlign: "center", fontWeight: "700" },
    row: { flexDirection: "row", justifyContent: "space-between" },
    link: { color: colors.primary, fontWeight: "700" },
    handleBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 14,
      paddingHorizontal: 16,
    },
    at: { color: colors.textMuted, fontSize: 18, fontWeight: "700" },
    handleInput: { flex: 1, paddingVertical: 14, paddingLeft: 4, color: colors.text, fontSize: 18 },
    hint: { color: colors.textFaint, fontSize: 13 },
    label: { color: colors.text, fontWeight: "700", fontSize: 15, marginBottom: -8 },
    notice: { color: colors.correct, fontWeight: "600" },
    error: { color: colors.wrong, fontWeight: "700" },
  }),
);
