import { router, useLocalSearchParams } from "expo-router";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Eyebrow, Icon, Muted, ProgressBar } from "@/components/ui";
import { courseProgress, lessonKey } from "@/lib/progress";
import { removeCourse, useAppState } from "@/lib/store";
import type { Lesson } from "@/lib/types";
import { colors } from "@/theme/colors";
import { fonts } from "@/theme/type";

type Status = "done" | "current" | "locked";

const RAIL = 30; // width of the timeline column

export default function CourseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const course = useAppState((s) => s.courses.find((c) => c.id === id));
  const completed = useAppState((s) => s.progress.completed);

  if (!course) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Muted>This course no longer exists.</Muted>
        <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: colors.primary, fontWeight: "700" }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const cp = courseProgress(course, completed);
  const finished = cp.done === cp.total;

  function confirmDelete() {
    const doDelete = () => {
      removeCourse(course!.id);
      router.back();
    };
    if (Platform.OS === "web") {
      if (globalThis.confirm?.("Delete this course and its progress?")) doDelete();
      return;
    }
    Alert.alert("Delete course?", "Your progress in this course will be lost.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: doDelete },
    ]);
  }

  const open = (lesson: Lesson) =>
    router.push({ pathname: "/lesson/[courseId]/[lessonId]", params: { courseId: course.id, lessonId: lesson.id } });

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable accessibilityLabel="Back" hitSlop={12} onPress={() => router.back()}>
          <Icon name="back" color={colors.text} />
        </Pressable>
        <Pressable accessibilityLabel="Delete course" hitSlop={12} onPress={confirmDelete}>
          <Icon name="trash" size={18} color={colors.textFaint} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 48, paddingHorizontal: 20 }}>
        {/* Course intro */}
        <View style={styles.intro}>
          <Text style={styles.emoji}>{course.emoji}</Text>
          <Eyebrow>
            {course.generatedBy === "ai" ? "AI-built course" : "Offline draft"} · {cp.total} lessons
          </Eyebrow>
          <Text style={styles.title}>{course.title}</Text>
          <Text style={styles.description}>{course.description}</Text>
          <View style={styles.progressRow}>
            <ProgressBar value={cp.fraction} style={{ flex: 1 }} />
            <Text style={styles.progressText}>
              {cp.done}/{cp.total}
            </Text>
          </View>
        </View>

        {/* Chapter timeline */}
        <View style={{ marginTop: 8 }}>
          {course.lessons.map((lesson, i) => {
            const best = completed[lessonKey(course.id, lesson.id)];
            const status: Status = best !== undefined ? "done" : i === cp.nextIndex ? "current" : "locked";
            return (
              <View key={lesson.id} style={styles.row}>
                <View style={styles.railCol}>
                  <Marker status={status} number={i + 1} />
                  <View
                    style={[
                      styles.railLine,
                      { backgroundColor: status === "done" ? colors.xp : colors.border },
                    ]}
                  />
                </View>
                <LessonCard
                  lesson={lesson}
                  number={i + 1}
                  status={status}
                  best={best}
                  onPress={() => open(lesson)}
                />
              </View>
            );
          })}

          {/* Finish line */}
          <View style={styles.row}>
            <View style={styles.railCol}>
              <View style={[styles.marker, finished ? styles.markerDone : styles.markerLocked]}>
                <Icon name="trophy" size={15} color={finished ? colors.text : colors.lockedText} />
              </View>
            </View>
            <View style={styles.finish}>
              <Text style={[styles.finishText, finished && { color: colors.text }]}>
                {finished ? "Course complete. Well done!" : "Finish every lesson to complete the course"}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Marker({ status, number }: { status: Status; number: number }) {
  if (status === "done") {
    return (
      <View style={[styles.marker, styles.markerDone]}>
        <Icon name="check" size={15} color={colors.text} />
      </View>
    );
  }
  return (
    <View style={[styles.marker, status === "current" ? styles.markerCurrent : styles.markerLocked]}>
      <Text style={[styles.markerText, status === "current" && { color: colors.textOnPrimary }]}>{number}</Text>
    </View>
  );
}

function LessonCard({
  lesson,
  number,
  status,
  best,
  onPress,
}: {
  lesson: Lesson;
  number: number;
  status: Status;
  best?: number;
  onPress: () => void;
}) {
  const count = lesson.exercises.length;
  const minutes = Math.max(1, Math.round(count * 0.5));

  if (status === "current") {
    return (
      <View style={[styles.card, styles.cardCurrent]}>
        <Eyebrow style={{ color: colors.primary }}>Lesson {number} · Up next</Eyebrow>
        <Text style={styles.cardTitle}>{lesson.title}</Text>
        {lesson.summary ? (
          <Text style={styles.cardSummary} numberOfLines={3}>
            {lesson.summary}
          </Text>
        ) : null}
        <Text style={styles.cardMeta}>
          {count} exercises · about {minutes} min
        </Text>
        <Button label="Start lesson" icon="chevron" iconAfter onPress={onPress} style={{ marginTop: 6 }} />
      </View>
    );
  }

  const locked = status === "locked";
  return (
    <Pressable
      disabled={locked}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Lesson ${number}: ${lesson.title}${locked ? ", locked" : ", completed. Practice again"}`}
      style={({ pressed }) => [styles.card, locked && styles.cardLocked, pressed && { opacity: 0.8 }]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ flex: 1, gap: 3 }}>
          <Eyebrow style={locked ? { color: colors.lockedText } : undefined}>
            Lesson {number}
            {best !== undefined ? ` · ${Math.round(best * 100)}% best` : ""}
          </Eyebrow>
          <Text style={[styles.cardTitleSmall, locked && { color: colors.lockedText }]}>{lesson.title}</Text>
        </View>
        {locked ? (
          <Icon name="lock" size={16} color={colors.lockedText} />
        ) : (
          <Text style={styles.review}>Practice</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  intro: { paddingTop: 8, paddingBottom: 18, gap: 8 },
  emoji: { fontSize: 40 },
  title: { color: colors.text, fontFamily: fonts.serif, fontSize: 30, lineHeight: 36, letterSpacing: -0.4 },
  description: { color: colors.textMuted, fontSize: 16, lineHeight: 23 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 },
  progressText: { color: colors.textMuted, fontWeight: "700", fontVariant: ["tabular-nums"] },
  row: { flexDirection: "row", gap: 14 },
  railCol: { width: RAIL, alignItems: "center" },
  railLine: { width: 2, flex: 1, marginVertical: 4, borderRadius: 1 },
  marker: {
    width: RAIL,
    height: RAIL,
    borderRadius: RAIL / 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  markerDone: { backgroundColor: colors.xp },
  markerCurrent: { backgroundColor: colors.primary },
  markerLocked: { backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.lockedEdge },
  markerText: { color: colors.lockedText, fontWeight: "700", fontSize: 13 },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
    gap: 4,
  },
  cardCurrent: {
    backgroundColor: colors.background,
    borderColor: colors.primary,
    borderWidth: 1.5,
    boxShadow: colors.liftShadow,
    gap: 6,
    paddingVertical: 18,
  },
  cardLocked: { backgroundColor: "transparent", borderStyle: "dashed", borderColor: colors.lockedEdge },
  cardTitle: { color: colors.text, fontFamily: fonts.serif, fontSize: 22, lineHeight: 28 },
  cardTitleSmall: { color: colors.text, fontFamily: fonts.serifMedium, fontSize: 17, lineHeight: 22 },
  cardSummary: { color: colors.textMuted, fontSize: 15, lineHeight: 21 },
  cardMeta: { color: colors.textFaint, fontSize: 13, fontWeight: "600" },
  review: { color: colors.primary, fontWeight: "700", fontSize: 14 },
  finish: { flex: 1, paddingTop: 18, paddingBottom: 8 },
  finishText: { color: colors.textFaint, fontSize: 14, fontStyle: "italic" },
});
