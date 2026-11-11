import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card, Heading, Icon, IconName, Muted } from "@/components/ui";
import { liveStreak, resetEverything, setDailyGoal, useAppState } from "@/lib/store";
import { colors, palette } from "@/theme/colors";

const GOALS = [
  { xp: 10, label: "Casual" },
  { xp: 30, label: "Regular" },
  { xp: 50, label: "Serious" },
  { xp: 80, label: "Intense" },
];

export default function ProfileScreen() {
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

      <View style={styles.grid}>
        <Stat icon="flame" color={colors.streak} value={liveStreak(progress)} label="Day streak" />
        <Stat icon="bolt" color={colors.xp} value={progress.xp} label="Total XP" />
        <Stat icon="trophy" color={palette.frozenLake} value={lessonsDone} label="Lessons done" />
        <Stat icon="school" color={palette.brightLavender} value={courseCount} label="Courses" />
      </View>

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
              accessibilityState={{ selected: active }}
              style={[styles.goalRow, active && { borderColor: colors.xp, backgroundColor: colors.surfaceRaised }]}
            >
              <Text style={[styles.goalLabel, active && { color: colors.xp }]}>{g.label}</Text>
              <Text style={styles.goalXp}>{g.xp} XP / day</Text>
            </Pressable>
          );
        })}
      </Card>

      <Pressable onPress={confirmReset} style={styles.reset}>
        <Text style={{ color: colors.wrong, fontWeight: "800" }}>Reset all data</Text>
      </Pressable>
    </ScrollView>
  );
}

function Stat({ icon, color, value, label }: { icon: IconName; color: string; value: number; label: string }) {
  return (
    <Card style={styles.stat}>
      <Icon name={icon} size={26} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  stat: { flexBasis: "47%", flexGrow: 1, gap: 4, padding: 16 },
  statValue: { color: colors.text, fontSize: 26, fontWeight: "900", fontVariant: ["tabular-nums"] },
  statLabel: { color: colors.textMuted, fontSize: 13, fontWeight: "700" },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: "800" },
  goalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.surfaceRaised,
  },
  goalLabel: { color: colors.text, fontWeight: "800", fontSize: 15 },
  goalXp: { color: colors.textMuted, fontWeight: "600" },
  reset: { alignSelf: "center", padding: 12 },
});
