import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/Avatar";
import { Button, Card, Heading, Icon, IconName, Muted } from "@/components/ui";
import { deleteAvatarFile, pickAvatar } from "@/lib/pickAvatar";
import { signOut, useAccount } from "@/lib/social/account";
import { socialEnabled } from "@/lib/social/client";
import { loadFriendsOverview } from "@/lib/social/friends";
import {
  liveStreak,
  resetEverything,
  setAvatar,
  setAppearance,
  setDailyGoal,
  setProfileName,
  useAppState,
} from "@/lib/store";
import type { Appearance } from "@/lib/types";
import { makeStyles, useColors } from "@/theme/theme";
import { fonts } from "@/theme/type";

const GOALS = [
  { xp: 10, label: "Casual" },
  { xp: 30, label: "Regular" },
  { xp: 50, label: "Serious" },
  { xp: 80, label: "Intense" },
];

export default function ProfileScreen() {
  const colors = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const progress = useAppState((s) => s.progress);
  const courseCount = useAppState((s) => s.courses.length);
  const lessonsDone = Object.keys(progress.completed).length;

  function confirmReset() {
    const msg = "This deletes all your resources, courses and progress on this device.";
    if (Platform.OS === "web") {
      if (globalThis.confirm?.(msg)) resetEverything();
      return;
    }
    Alert.alert("Reset Cognify?", msg, [
      { text: "Cancel", style: "cancel" },
      { text: "Reset", style: "destructive", onPress: resetEverything },
    ]);
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 40, paddingHorizontal: 18, gap: 16 }}
    >
      <Heading>Profile</Heading>

      <ProfileHeader />

      <AccountCard />

      <View style={styles.grid}>
        <Stat icon="flame" color={colors.streak} value={liveStreak(progress)} label="Day streak" />
        <Stat icon="bolt" color={colors.xp} value={progress.xp} label="Total XP" />
        <Stat icon="trophy" color={colors.xp} value={lessonsDone} label="Lessons done" />
        <Stat icon="school" color={colors.primary} value={courseCount} label="Courses" />
      </View>

      <AppearanceCard />

      <Card style={{ gap: 12 }}>
        <Text style={styles.cardTitle}>Daily goal</Text>
        <Muted>How much do you want to learn each day?</Muted>
        {GOALS.map((g) => {
          const active = progress.dailyGoal === g.xp;
          return (
            <Pressable
              key={g.xp}
              onPress={() => setDailyGoal(g.xp)}
              accessibilityRole="radio"
              aria-checked={active}
              style={[styles.goalRow, active && { borderColor: colors.primary, backgroundColor: colors.background }]}
            >
              <Text style={[styles.goalLabel, active && { color: colors.primary }]}>{g.label}</Text>
              <Text style={styles.goalXp}>{g.xp} XP / day</Text>
            </Pressable>
          );
        })}
      </Card>

      <Pressable onPress={confirmReset} style={styles.reset}>
        <Text style={{ color: colors.wrong, fontWeight: "700" }}>Reset all data</Text>
      </Pressable>
    </ScrollView>
  );
}

function AccountCard() {
  const styles = useStyles();
  const session = useAccount((a) => a.session);
  const profile = useAccount((a) => a.profile);
  const [requests, setRequests] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!profile) return;
      loadFriendsOverview()
        .then((o) => setRequests(o.incoming.length))
        .catch(() => {});
    }, [profile]),
  );

  if (!socialEnabled) return null;

  if (!profile) {
    return (
      <Card style={{ gap: 10 }}>
        <Text style={styles.cardTitle}>{session ? "Finish your account" : "Share courses and add friends"}</Text>
        <Muted>
          {session
            ? "Pick a username so friends can find you."
            : "Sign in with your email to share courses with a link and add friends."}
        </Muted>
        <Button label={session ? "Pick a username" : "Sign in with email"} onPress={() => router.push("/sign-in")} />
      </Card>
    );
  }

  return (
    <Card style={{ gap: 12 }}>
      <View style={styles.accountRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.accountLabel}>Signed in as</Text>
          <Text style={styles.accountHandle}>@{profile.username}</Text>
        </View>
        <Pressable onPress={() => router.push({ pathname: "/u/[username]", params: { username: profile.username } })} hitSlop={8}>
          <Text style={styles.link}>View public profile</Text>
        </Pressable>
      </View>
      <Button
        label={requests > 0 ? `Friends · ${requests} new request${requests === 1 ? "" : "s"}` : "Friends"}
        icon="people"
        variant={requests > 0 ? "solid" : "outline"}
        onPress={() => router.push("/friends")}
      />
      <Pressable onPress={() => void signOut()} hitSlop={8} style={{ alignSelf: "center" }}>
        <Text style={styles.signOut}>Sign out</Text>
      </Pressable>
    </Card>
  );
}

function ProfileHeader() {
  const colors = useColors();
  const styles = useStyles();
  const profile = useAppState((s) => s.profile);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profile.name);
  const [photoError, setPhotoError] = useState<string | null>(null);

  async function choosePhoto() {
    setPhotoError(null);
    try {
      const uri = await pickAvatar();
      if (!uri) return;
      deleteAvatarFile(profile.avatarUri);
      setAvatar(uri);
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : "Couldn't use that photo.");
    }
  }

  function removePhoto() {
    deleteAvatarFile(profile.avatarUri);
    setAvatar(null);
  }

  function onPhotoPress() {
    if (!profile.avatarUri || Platform.OS === "web") {
      choosePhoto();
      return;
    }
    Alert.alert("Profile photo", undefined, [
      { text: "Choose new photo", onPress: choosePhoto },
      { text: "Remove photo", style: "destructive", onPress: removePhoto },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  function saveName() {
    setProfileName(draft);
    setEditing(false);
  }

  return (
    <Card style={styles.profileCard}>
      <Pressable
        onPress={onPhotoPress}
        accessibilityRole="button"
        accessibilityLabel={profile.avatarUri ? "Change profile photo" : "Add profile photo"}
      >
        <Avatar name={profile.name} uri={profile.avatarUri} size={96} />
        <View style={styles.cameraBadge}>
          <Icon name="camera" size={16} color={colors.textOnPrimary} />
        </View>
      </Pressable>

      {editing ? (
        <View style={styles.nameEditRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            autoFocus
            onSubmitEditing={saveName}
            returnKeyType="done"
            maxLength={40}
            style={styles.nameInput}
            accessibilityLabel="Your name"
          />
          <Pressable onPress={saveName} style={styles.saveButton} accessibilityRole="button">
            <Text style={styles.saveText}>Save</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => {
            setDraft(profile.name);
            setEditing(true);
          }}
          style={styles.nameRow}
          accessibilityRole="button"
          accessibilityLabel={`Name: ${profile.name}. Edit name`}
        >
          <Text style={styles.name}>{profile.name}</Text>
          <Icon name="pencil" size={16} color={colors.textFaint} />
        </Pressable>
      )}

      {profile.avatarUri && Platform.OS === "web" ? (
        <Pressable onPress={removePhoto} hitSlop={8}>
          <Text style={styles.removePhoto}>Remove photo</Text>
        </Pressable>
      ) : null}
      {photoError ? <Text style={styles.photoError}>{photoError}</Text> : null}
    </Card>
  );
}

const APPEARANCES: { value: Appearance; label: string; icon: IconName }[] = [
  { value: "system", label: "System", icon: "phone" },
  { value: "light", label: "Light", icon: "sun" },
  { value: "dark", label: "Dark", icon: "moon" },
];

function AppearanceCard() {
  const colors = useColors();
  const styles = useStyles();
  const appearance = useAppState((s) => s.settings.appearance);
  return (
    <Card style={{ gap: 12 }}>
      <Text style={styles.cardTitle}>Appearance</Text>
      <View style={styles.segment} accessibilityRole="radiogroup">
        {APPEARANCES.map((a) => {
          const active = appearance === a.value;
          return (
            <Pressable
              key={a.value}
              onPress={() => setAppearance(a.value)}
              accessibilityRole="radio"
              aria-checked={active}
              style={[styles.segmentItem, active && styles.segmentActive]}
            >
              <Icon name={a.icon} size={17} color={active ? colors.textOnPrimary : colors.textMuted} />
              <Text style={[styles.segmentText, active && { color: colors.textOnPrimary }]}>{a.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Muted style={{ fontSize: 13 }}>
        {appearance === "system" ? "Matches your phone’s light or dark setting." : `Always ${appearance}.`}
      </Muted>
    </Card>
  );
}

function Stat({ icon, color, value, label }: { icon: IconName; color: string; value: number; label: string }) {
  const styles = useStyles();
  return (
    <Card style={styles.stat}>
      <Icon name={icon} size={26} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    segment: { flexDirection: "row", backgroundColor: colors.surfaceRaised, borderRadius: 12, padding: 4, gap: 4 },
    segmentItem: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 10,
      borderRadius: 9,
    },
    segmentActive: { backgroundColor: colors.primary },
    segmentText: { color: colors.textMuted, fontWeight: "700", fontSize: 14 },
    profileCard: { alignItems: "center", gap: 12, paddingVertical: 24 },
    accountRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    accountLabel: { color: colors.textMuted, fontSize: 13 },
    accountHandle: { color: colors.text, fontFamily: fonts.display, fontSize: 20 },
    link: { color: colors.primary, fontWeight: "700", fontSize: 14 },
    signOut: { color: colors.textFaint, fontWeight: "600", fontSize: 14 },
    cameraBadge: {
      position: "absolute",
      right: -2,
      bottom: -2,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.primary,
      borderWidth: 2,
      borderColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    nameRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
    name: { color: colors.text, fontFamily: fonts.display, fontSize: 28, letterSpacing: -0.3 },
    nameEditRow: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "stretch" },
    nameInput: {
      flex: 1,
      backgroundColor: colors.background,
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 10,
      color: colors.text,
      fontSize: 18,
      fontWeight: "700",
    },
    saveButton: { backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12 },
    saveText: { color: colors.textOnPrimary, fontWeight: "700" },
    removePhoto: { color: colors.textFaint, fontWeight: "700", fontSize: 13 },
    photoError: { color: colors.wrong, fontWeight: "700", textAlign: "center" },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    stat: { flexBasis: "47%", flexGrow: 1, gap: 4, padding: 16 },
    statValue: { color: colors.text, fontFamily: fonts.display, fontSize: 30, fontVariant: ["tabular-nums"] },
    statLabel: { color: colors.textMuted, fontSize: 13, fontWeight: "700" },
    cardTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 20 },
    goalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.surfaceRaised,
    },
    goalLabel: { color: colors.text, fontWeight: "700", fontSize: 15 },
    goalXp: { color: colors.textMuted, fontWeight: "600" },
    reset: { alignSelf: "center", padding: 12 },
  }),
);
