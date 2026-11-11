import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card, ChunkyButton, Heading, Icon, Muted, ProgressBar, StatPill } from "@/components/ui";
import { courseProgress } from "@/lib/progress";
import { SAMPLE_SOURCE } from "@/lib/sample";
import { addSource, liveStreak, liveTodayXp, useAppState } from "@/lib/store";
import { useCreateCourse } from "@/lib/useCreateCourse";
import { accentFor, colors, palette } from "@/theme/colors";

export default function LearnScreen() {
  const insets = useSafeAreaInsets();
  const courses = useAppState((s) => s.courses);
  const progress = useAppState((s) => s.progress);
  const { create, busy } = useCreateCourse();

  const streak = liveStreak(progress);
  const todayXp = liveTodayXp(progress);

  async function trySample() {
    const source = addSource({ title: SAMPLE_SOURCE.title, kind: "text", content: SAMPLE_SOURCE.content });
    await create(SAMPLE_SOURCE.goal, [source]);
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 40, paddingHorizontal: 18, gap: 18 }}
    >
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.wordmark}>
          cogn<Text style={{ color: colors.xp }}>i</Text>fy
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <StatPill icon="flame" value={streak} color={streak > 0 ? colors.streak : colors.textFaint} />
          <StatPill icon="bolt" value={progress.xp} color={colors.xp} />
        </View>
      </View>

      {/* Daily goal */}
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={styles.cardTitle}>Daily goal</Text>
          <Text style={styles.goalNumbers}>
            {Math.min(todayXp, progress.dailyGoal)} / {progress.dailyGoal} XP
          </Text>
        </View>
        <ProgressBar value={todayXp / progress.dailyGoal} />
        <Muted>
          {todayXp >= progress.dailyGoal
            ? "Goal smashed! Keep the streak alive tomorrow. 🎉"
            : "Finish a lesson to make progress on today's goal."}
        </Muted>
      </Card>

      {courses.length === 0 ? (
        <EmptyState onSample={trySample} busy={busy} />
      ) : (
        <>
          <View style={styles.sectionRow}>
            <Heading style={{ fontSize: 20 }}>Your courses</Heading>
            <Pressable onPress={() => router.push("/add-source")} hitSlop={10}>
              <Text style={styles.link}>+ New</Text>
            </Pressable>
          </View>
          {courses.map((course, i) => {
            const cp = courseProgress(course, progress.completed);
            const accent = accentFor(i);
            return (
              <Pressable
                key={course.id}
                onPress={() => router.push({ pathname: "/course/[id]", params: { id: course.id } })}
                style={({ pressed }) => [styles.courseCard, { borderColor: accent.shadow, opacity: pressed ? 0.85 : 1 }]}
              >
                <View style={[styles.courseEmoji, { backgroundColor: accent.fill, borderBottomColor: accent.shadow }]}>
                  <Text style={{ fontSize: 30 }}>{course.emoji}</Text>
                </View>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={styles.courseTitle} numberOfLines={2}>
                    {course.title}
                  </Text>
                  <Text style={styles.courseMeta}>
                    {cp.done}/{cp.total} lessons{course.generatedBy === "offline" ? " · offline draft" : ""}
                  </Text>
                  <ProgressBar value={cp.fraction} color={accent.fill} height={10} />
                </View>
                <Icon name="chevron" size={18} color={colors.textFaint} />
              </Pressable>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

function EmptyState({ onSample, busy }: { onSample: () => void; busy: boolean }) {
  return (
    <Card style={{ alignItems: "center", gap: 14, paddingVertical: 28 }}>
      <View style={styles.heroBubble}>
        <Icon name="brain" size={54} color={palette.royalGold} />
      </View>
      <Heading style={{ textAlign: "center" }}>Learn anything you upload</Heading>
      <Muted style={{ textAlign: "center" }}>
        Add notes, articles or documents. Cognify turns them into bite-sized lessons with quizzes,
        flashcards and streaks.
      </Muted>
      <ChunkyButton
        label="Upload a resource"
        icon="add"
        onPress={() => router.push("/add-source")}
        style={{ alignSelf: "stretch", marginTop: 6 }}
      />
      <ChunkyButton
        label="Try a sample course"
        icon="sparkles"
        variant="outline"
        loading={busy}
        onPress={onSample}
        style={{ alignSelf: "stretch" }}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  wordmark: { color: colors.text, fontSize: 30, fontWeight: "900", letterSpacing: -1 },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: "800" },
  goalNumbers: { color: colors.xp, fontWeight: "800", fontVariant: ["tabular-nums"] },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  link: { color: colors.xp, fontWeight: "800", fontSize: 15 },
  courseCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 2,
    borderBottomWidth: 5,
    padding: 14,
  },
  courseEmoji: {
    width: 62,
    height: 62,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 4,
  },
  courseTitle: { color: colors.text, fontSize: 17, fontWeight: "800" },
  courseMeta: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  heroBubble: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 3,
    borderColor: palette.violetTwilight,
    alignItems: "center",
    justifyContent: "center",
  },
});
