import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/Avatar";
import { Button, Card, Eyebrow, Heading, Icon, Muted, ProgressBar, StatPill } from "@/components/ui";
import { courseProgress } from "@/lib/progress";
import { SAMPLE_SOURCE } from "@/lib/sample";
import { addSource, liveStreak, liveTodayXp, useAppState } from "@/lib/store";
import { useCreateCourse } from "@/lib/useCreateCourse";
import { colors } from "@/theme/colors";
import { fonts } from "@/theme/type";

function greetingFor(date = new Date()) {
  const h = date.getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function LearnScreen() {
  const insets = useSafeAreaInsets();
  const courses = useAppState((s) => s.courses);
  const progress = useAppState((s) => s.progress);
  const profile = useAppState((s) => s.profile);
  const { create, busy } = useCreateCourse();

  const streak = liveStreak(progress);
  const resume = (() => {
    for (const course of courses) {
      const cp = courseProgress(course, progress.completed);
      if (cp.nextLesson && cp.done > 0) return { course, lesson: cp.nextLesson, index: cp.nextIndex };
    }
    return null;
  })();
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
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <StatPill icon="flame" value={streak} color={streak > 0 ? colors.streak : colors.textFaint} />
          <StatPill icon="bolt" value={progress.xp} color={colors.xp} />
          <Pressable onPress={() => router.navigate("/profile")} accessibilityRole="button" accessibilityLabel="Profile">
            <Avatar name={profile.name} uri={profile.avatarUri} size={38} />
          </Pressable>
        </View>
      </View>

      <Text style={styles.greeting}>
        {greetingFor()}, {profile.name.split(" ")[0]}
      </Text>

      {resume ? (
        <Card style={styles.resumeCard}>
          <Eyebrow>Continue learning</Eyebrow>
          <Text style={styles.resumeTitle}>{resume.lesson.title}</Text>
          <Text style={styles.resumeMeta} numberOfLines={1}>
            {resume.course.emoji} {resume.course.title} · lesson {resume.index + 1} of {resume.course.lessons.length}
          </Text>
          <Button
            label="Resume"
            icon="chevron"
            iconAfter
            onPress={() =>
              router.push({
                pathname: "/lesson/[courseId]/[lessonId]",
                params: { courseId: resume.course.id, lessonId: resume.lesson.id },
              })
            }
            style={{ marginTop: 8 }}
          />
        </Card>
      ) : null}

      {/* Daily goal */}
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Eyebrow>Today’s goal</Eyebrow>
          <Text style={styles.goalNumbers}>
            {Math.min(todayXp, progress.dailyGoal)} / {progress.dailyGoal} XP
          </Text>
        </View>
        <ProgressBar value={todayXp / progress.dailyGoal} color={colors.xp} />
        <Muted>
          {todayXp >= progress.dailyGoal
            ? "Goal reached. Come back tomorrow to keep your streak going."
            : "Finish a lesson to make progress on today's goal."}
        </Muted>
      </Card>

      {courses.length === 0 ? (
        <EmptyState onSample={trySample} busy={busy} />
      ) : (
        <>
          <View style={styles.sectionRow}>
            <Heading style={{ fontSize: 22 }}>Your courses</Heading>
            <Pressable onPress={() => router.push("/add-source")} hitSlop={10}>
              <Text style={styles.link}>+ New</Text>
            </Pressable>
          </View>
          {courses.map((course) => {
            const cp = courseProgress(course, progress.completed);
            return (
              <Pressable
                key={course.id}
                onPress={() => router.push({ pathname: "/course/[id]", params: { id: course.id } })}
                style={({ pressed }) => [styles.courseCard, { opacity: pressed ? 0.85 : 1 }]}
              >
                <View style={styles.courseEmoji}>
                  <Text style={{ fontSize: 28 }}>{course.emoji}</Text>
                </View>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={styles.courseTitle} numberOfLines={2}>
                    {course.title}
                  </Text>
                  <Text style={styles.courseMeta}>
                    {cp.done}/{cp.total} lessons{course.generatedBy === "offline" ? " · offline draft" : ""}
                  </Text>
                  <ProgressBar value={cp.fraction} height={6} />
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
        <Icon name="brain" size={54} color={colors.primary} />
      </View>
      <Heading style={{ textAlign: "center" }}>Learn anything</Heading>
      <Muted style={{ textAlign: "center" }}>
        Upload notes, articles or PDFs, or just tell the AI what you want to learn. Cognify turns it into
        bite-sized lessons with quizzes, flashcards and streaks.
      </Muted>
      <Button
        label="Upload a resource"
        icon="add"
        onPress={() => router.push("/add-source")}
        style={{ alignSelf: "stretch", marginTop: 6 }}
      />
      <Button
        label="Describe it to AI"
        icon="chat"
        color={colors.secondary}
        textColor={colors.text}
        onPress={() => router.push("/create-chat")}
        style={{ alignSelf: "stretch" }}
      />
      <Button
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
  greeting: { color: colors.text, fontFamily: fonts.serif, fontSize: 28, letterSpacing: -0.3, marginTop: -4 },
  wordmark: { color: colors.primary, fontFamily: fonts.serif, fontSize: 26, letterSpacing: -0.5 },
  goalNumbers: { color: colors.text, fontWeight: "700", fontVariant: ["tabular-nums"] },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  link: { color: colors.primary, fontWeight: "700", fontSize: 15 },
  courseCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  courseEmoji: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  courseTitle: { color: colors.text, fontFamily: fonts.serifMedium, fontSize: 18, lineHeight: 23 },
  resumeCard: { backgroundColor: colors.background, borderColor: colors.primary, borderWidth: 1.5, boxShadow: colors.liftShadow, gap: 4 },
  resumeTitle: { color: colors.text, fontFamily: fonts.serif, fontSize: 24, lineHeight: 30, marginTop: 2 },
  resumeMeta: { color: colors.textMuted, fontSize: 14 },
  courseMeta: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  heroBubble: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
});
