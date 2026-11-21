import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/Avatar";
import { Button, Card, Icon, type IconName, Muted } from "@/components/ui";
import { profileStreak, useAccount } from "@/lib/social/account";
import { socialEnabled } from "@/lib/social/client";
import {
  acceptFriendRequest,
  fetchProfileByUsername,
  relationWith,
  removeFriendship,
  sendFriendRequest,
  type Relation,
} from "@/lib/social/friends";
import type { PublicProfile } from "@/lib/social/types";
import { makeStyles, useColors } from "@/theme/theme";
import { fonts } from "@/theme/type";

/** Someone's public profile: photo, name, and just four stats. */
export default function PublicProfileScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { username } = useLocalSearchParams<{ username: string }>();
  const insets = useSafeAreaInsets();
  const myProfile = useAccount((a) => a.profile);
  const [profile, setProfile] = useState<PublicProfile | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!socialEnabled || !username) return;
    fetchProfileByUsername(username)
      .then(setProfile)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [username]);

  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable accessibilityLabel="Back" hitSlop={12} onPress={back}>
          <Icon name="back" color={colors.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32, gap: 16 }}>
        {!socialEnabled ? (
          <Muted>Profiles need accounts to be set up (see the README).</Muted>
        ) : error ? (
          <Muted>{error}</Muted>
        ) : profile === undefined ? (
          <View style={{ paddingVertical: 60, alignItems: "center" }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : profile === null ? (
          <Card style={{ gap: 6 }}>
            <Text style={styles.name}>No one here</Text>
            <Muted>There’s no Cognify profile called @{username}.</Muted>
          </Card>
        ) : (
          <>
            <View style={styles.identity}>
              <Avatar name={profile.display_name || profile.username} uri={profile.avatar_url} size={96} />
              {profile.display_name ? <Text style={styles.name}>{profile.display_name}</Text> : null}
              <Text style={styles.handle}>@{profile.username}</Text>
              <FriendButton profile={profile} signedIn={!!myProfile} />
            </View>

            <View style={styles.grid}>
              <Stat icon="flame" color={colors.streak} value={profileStreak(profile)} label="Day streak" />
              <Stat icon="school" color={colors.primary} value={profile.courses_count} label="Courses" />
              <Stat icon="trophy" color={colors.xp} value={profile.lessons_done} label="Lessons done" />
              <Stat icon="bolt" color={colors.xp} value={profile.total_xp} label="Total XP" />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function FriendButton({ profile, signedIn }: { profile: PublicProfile; signedIn: boolean }) {
  const colors = useColors();
  const styles = useStyles();
  const [relation, setRelation] = useState<Relation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!signedIn) return;
    relationWith(profile.id)
      .then(setRelation)
      .catch(() => setRelation("none"));
  }, [profile.id, signedIn]);

  useEffect(refresh, [refresh]);

  async function act(task: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await task();
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!signedIn) {
    return <Button label="Sign in to add friends" variant="outline" onPress={() => router.push("/sign-in")} style={styles.action} />;
  }
  if (relation === null) return <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} />;
  if (relation === "self") return <Text style={styles.note}>This is you</Text>;

  return (
    <View style={{ alignSelf: "stretch", alignItems: "center", gap: 8 }}>
      {relation === "none" ? (
        <Button label="Add friend" icon="personAdd" loading={busy} onPress={() => act(() => sendFriendRequest(profile.id))} style={styles.action} />
      ) : relation === "incoming" ? (
        <View style={{ flexDirection: "row", gap: 10, alignSelf: "stretch" }}>
          <Button label="Accept" icon="check" loading={busy} onPress={() => act(() => acceptFriendRequest(profile.id))} style={{ flex: 1 }} />
          <Button label="Decline" variant="outline" disabled={busy} onPress={() => act(() => removeFriendship(profile.id))} style={{ flex: 1 }} />
        </View>
      ) : (
        <>
          <View style={[styles.status, relation === "friends" ? styles.statusFriends : styles.statusPending]}>
            <Icon name={relation === "friends" ? "check" : "personAdd"} size={17} color={relation === "friends" ? colors.correct : colors.textMuted} />
            <Text style={[styles.statusText, { color: relation === "friends" ? colors.correct : colors.textMuted }]}>
              {relation === "friends" ? "Friends" : "Friend request sent"}
            </Text>
          </View>
          <Pressable onPress={() => act(() => removeFriendship(profile.id))} disabled={busy} hitSlop={8}>
            <Text style={styles.subtle}>{relation === "friends" ? "Remove friend" : "Cancel request"}</Text>
          </Pressable>
        </>
      )}
      {relation === "incoming" ? <Text style={styles.note}>@{profile.username} wants to be friends</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function Stat({ icon, color, value, label }: { icon: IconName; color: string; value: number; label: string }) {
  const styles = useStyles();
  return (
    <Card style={styles.stat}>
      <Icon name={icon} size={24} color={color} />
      <Text style={styles.statValue}>{value.toLocaleString()}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    header: { paddingHorizontal: 20, paddingBottom: 6 },
    identity: { alignItems: "center", gap: 6, paddingBottom: 6 },
    name: { color: colors.text, fontFamily: fonts.display, fontSize: 26, marginTop: 6 },
    handle: { color: colors.textMuted, fontSize: 16, fontWeight: "600" },
    action: { alignSelf: "stretch", marginTop: 10 },
    note: { color: colors.textMuted, fontSize: 14, marginTop: 6 },
    status: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      alignSelf: "stretch",
      marginTop: 10,
      paddingVertical: 13,
      borderRadius: 14,
    },
    statusFriends: { backgroundColor: colors.correctBg },
    statusPending: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    statusText: { fontWeight: "700", fontSize: 16 },
    subtle: { color: colors.textFaint, fontWeight: "600", fontSize: 13 },
    error: { color: colors.wrong, fontWeight: "600", textAlign: "center" },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    stat: { flexBasis: "47%", flexGrow: 1, gap: 4, padding: 16 },
    statValue: { color: colors.text, fontFamily: fonts.display, fontSize: 28, fontVariant: ["tabular-nums"] },
    statLabel: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  }),
);
