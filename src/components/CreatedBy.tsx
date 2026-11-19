import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";

import { Avatar } from "./Avatar";

/** "Created by" line with a small round profile photo; tapping opens their profile. */
export function CreatedBy({
  username,
  displayName,
  avatarUrl,
}: {
  username: string;
  displayName: string;
  avatarUrl: string | null;
}) {
  const name = displayName.trim() || `@${username}`;
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/u/[username]", params: { username } })}
      accessibilityRole="button"
      accessibilityLabel={`Created by ${name}. View profile`}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
    >
      <Text style={styles.label}>Created by</Text>
      <Avatar name={name} uri={avatarUrl} size={22} />
      <View style={{ flexShrink: 1 }}>
        <Text style={styles.username} numberOfLines={1}>
          @{username}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 7, alignSelf: "flex-start", paddingVertical: 4 },
  label: { color: colors.textMuted, fontSize: 14 },
  username: { color: colors.primary, fontSize: 14, fontWeight: "700" },
});
