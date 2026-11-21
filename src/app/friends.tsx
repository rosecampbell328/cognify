import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/Avatar";
import { Eyebrow, Heading, Icon, Muted } from "@/components/ui";
import { profileStreak, useAccount } from "@/lib/social/account";
import {
  acceptFriendRequest,
  loadFriendsOverview,
  removeFriendship,
  searchProfiles,
  type FriendsOverview,
} from "@/lib/social/friends";
import type { PublicProfile } from "@/lib/social/types";
import { makeStyles, useColors } from "@/theme/theme";
import { fonts } from "@/theme/type";

export default function FriendsScreen() {
  const colors = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const signedIn = useAccount((a) => !!a.profile);
  const [overview, setOverview] = useState<FriendsOverview | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicProfile[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!signedIn) return;
    loadFriendsOverview()
      .then(setOverview)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [signedIn]);

  useFocusEffect(reload);

  // Search as you type, after a short pause.
  useEffect(() => {
    if (!query.trim()) return;
    const t = setTimeout(() => {
      searchProfiles(query)
        .then(setResults)
        .catch((e) => setError(e instanceof Error ? e.message : String(e)));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  async function act(task: () => Promise<void>) {
    setError(null);
    try {
      await task();
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const back = () => (router.canGoBack() ? router.back() : router.replace("/profile"));

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable accessibilityLabel="Back" hitSlop={12} onPress={back}>
          <Icon name="back" color={colors.text} />
        </Pressable>
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 32, gap: 14 }}
      >
        <Heading>Friends</Heading>

        {!signedIn ? (
          <Muted>Sign in from your Profile to add friends.</Muted>
        ) : (
          <>
            <View style={styles.searchBox}>
              <Icon name="search" size={18} color={colors.textFaint} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Find people by username"
                placeholderTextColor={colors.textFaint}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.searchInput}
                accessibilityLabel="Search usernames"
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            {results && query.trim() ? (
              <Section title="Results">
                {results.length === 0 ? <Muted>No one found with that username.</Muted> : null}
                {results.map((p) => (
                  <PersonRow key={p.id} person={p} />
                ))}
              </Section>
            ) : overview === null ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
            ) : (
              <>
                {overview.incoming.length > 0 ? (
                  <Section title={`Friend requests · ${overview.incoming.length}`}>
                    {overview.incoming.map((p) => (
                      <PersonRow key={p.id} person={p}>
                        <SmallButton label="Accept" solid onPress={() => act(() => acceptFriendRequest(p.id))} />
                        <SmallButton label="Decline" onPress={() => act(() => removeFriendship(p.id))} />
                      </PersonRow>
                    ))}
                  </Section>
                ) : null}

                <Section title={`Your friends · ${overview.friends.length}`}>
                  {overview.friends.length === 0 ? (
                    <Muted>No friends yet. Search for someone’s username above.</Muted>
                  ) : null}
                  {overview.friends.map((p) => (
                    <PersonRow key={p.id} person={p} showStats />
                  ))}
                </Section>

                {overview.outgoing.length > 0 ? (
                  <Section title="Sent requests">
                    {overview.outgoing.map((p) => (
                      <PersonRow key={p.id} person={p}>
                        <SmallButton label="Cancel" onPress={() => act(() => removeFriendship(p.id))} />
                      </PersonRow>
                    ))}
                  </Section>
                ) : null}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8, marginTop: 6 }}>
      <Eyebrow>{title}</Eyebrow>
      {children}
    </View>
  );
}

function PersonRow({
  person,
  showStats,
  children,
}: {
  person: PublicProfile;
  showStats?: boolean;
  children?: React.ReactNode;
}) {
  const styles = useStyles();
  const name = person.display_name || `@${person.username}`;
  // The person (opens their profile) and the action buttons sit side by side —
  // never buttons inside a button.
  return (
    <View style={styles.person}>
      <Pressable
        onPress={() => router.push({ pathname: "/u/[username]", params: { username: person.username } })}
        accessibilityRole="button"
        accessibilityLabel={`${name}, @${person.username}`}
        style={({ pressed }) => [styles.personMain, pressed && { opacity: 0.7 }]}
      >
        <Avatar name={name} uri={person.avatar_url} size={42} />
        <View style={{ flex: 1 }}>
          <Text style={styles.personName} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.personMeta} numberOfLines={1}>
            @{person.username}
            {showStats ? `  ·  ${profileStreak(person)} day streak  ·  ${person.total_xp.toLocaleString()} XP` : ""}
          </Text>
        </View>
      </Pressable>
      {children ? <View style={{ flexDirection: "row", gap: 6 }}>{children}</View> : null}
    </View>
  );
}

function SmallButton({ label, solid, onPress }: { label: string; solid?: boolean; onPress: () => void }) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      hitSlop={6}
      style={({ pressed }) => [styles.small, solid && styles.smallSolid, pressed && { opacity: 0.8 }]}
    >
      <Text style={[styles.smallText, solid && { color: colors.textOnPrimary }]}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    header: { paddingHorizontal: 20, paddingBottom: 6 },
    searchBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 14,
      paddingHorizontal: 14,
    },
    searchInput: { flex: 1, paddingVertical: 13, color: colors.text, fontSize: 16 },
    error: { color: colors.wrong, fontWeight: "600" },
    person: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 12,
    },
    personMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
    personName: { color: colors.text, fontFamily: fonts.displayMedium, fontSize: 16 },
    personMeta: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
    small: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.secondary,
    },
    smallSolid: { backgroundColor: colors.primary, borderColor: colors.primary },
    smallText: { color: colors.primary, fontWeight: "700", fontSize: 13 },
  }),
);
