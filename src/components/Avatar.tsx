import { Image, StyleSheet, Text, View } from "react-native";

import { makeStyles } from "@/theme/theme";

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

/** Round profile photo, or the person's initials when there's no photo. */
export function Avatar({ name, uri, size = 44 }: { name: string; uri: string | null; size?: number }) {
  const styles = useStyles();
  const round = { width: size, height: size, borderRadius: size / 2 };
  if (uri) {
    return <Image source={{ uri }} style={[round, styles.image]} accessibilityLabel={`${name}'s profile photo`} />;
  }
  return (
    <View style={[round, styles.fallback]} accessibilityLabel={`${name}'s profile`}>
      <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{initials(name)}</Text>
    </View>
  );
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    image: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.secondary },
    fallback: {
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor: colors.secondary,
    },
    initials: { color: colors.textOnPrimary, fontWeight: "700", letterSpacing: 0.5 },
  }),
);
