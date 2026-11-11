import { router, useLocalSearchParams } from "expo-router";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, Muted, ProgressBar } from "@/components/ui";
import { courseProgress, lessonKey } from "@/lib/progress";
import { removeCourse, useAppState } from "@/lib/store";
import { colors, palette } from "@/theme/colors";

// Horizontal offsets for the winding lesson path.
const ZIGZAG = [0, 60, 90, 60, 0, -60, -90, -60];
const NODE = 76;

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
          <Text style={{ color: colors.xp, fontWeight: "800" }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const cp = courseProgress(course, completed);

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

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <Pressable accessibilityLabel="Back" hitSlop={12} onPress={() => router.back()}>
            <Icon name="back" color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {course.emoji} {course.title}
          </Text>
          <Pressable accessibilityLabel="Delete course" hitSlop={12} onPress={confirmDelete}>
            <Icon name="trash" size={18} color={colors.textFaint} />
          </Pressable>
        </View>
        <ProgressBar value={cp.fraction} height={10} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 60, paddingHorizontal: 18 }}>
        <View style={styles.banner}>
          <Text style={styles.bannerEyebrow}>
            {course.generatedBy === "ai" ? "AI-BUILT COURSE" : "OFFLINE DRAFT"} · {cp.total} LESSONS
          </Text>
          <Text style={styles.bannerText}>{course.description}</Text>
        </View>

        <View style={{ alignItems: "center", paddingTop: 12 }}>
          {course.lessons.map((lesson, i) => {
            const done = completed[lessonKey(course.id, lesson.id)] !== undefined;
            const current = i === cp.nextIndex;
            const locked = !done && !current;
            const offset = ZIGZAG[i % ZIGZAG.length];

            const fill = done ? colors.xp : current ? colors.primary : colors.locked;
            const edge = done ? palette.orange : current ? colors.primaryShadow : "#2e1240";
            const open = () =>
              router.push({
                pathname: "/lesson/[courseId]/[lessonId]",
                params: { courseId: course.id, lessonId: lesson.id },
              });

            return (
              <View key={lesson.id} style={{ alignItems: "center", marginBottom: 26, transform: [{ translateX: offset }] }}>
                {current ? (
                  <Pressable onPress={open} style={styles.startBubble} accessibilityLabel="Start lesson">
                    <Text style={styles.startText}>START</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Lesson ${i + 1}: ${lesson.title}${locked ? ", locked" : done ? ", completed" : ""}`}
                  disabled={locked}
                  onPress={open}
                  style={{ borderRadius: NODE / 2, backgroundColor: edge, paddingBottom: 7 }}
                >
                  {({ pressed }) => (
                    <View
                      style={[
                        styles.node,
                        { backgroundColor: fill, transform: [{ translateY: pressed ? 5 : 0 }] },
                        current && styles.nodeRing,
                      ]}
                    >
                      <Icon
                        name={done ? "check" : locked ? "lock" : "star"}
                        size={32}
                        color={locked ? colors.lockedText : done ? palette.darkAmethyst : colors.text}
                      />
                    </View>
                  )}
                </Pressable>
                <Text style={[styles.nodeLabel, locked && { color: colors.lockedText }]} numberOfLines={2}>
                  {lesson.title}
                </Text>
              </View>
            );
          })}

          <View style={styles.trophy}>
            <Icon name="trophy" size={40} color={cp.done === cp.total ? colors.xp : colors.lockedText} />
            <Text style={[styles.nodeLabel, { marginTop: 6 }]}>
              {cp.done === cp.total ? "Course complete!" : "Finish every lesson"}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    paddingHorizontal: 18,
    paddingBottom: 14,
    gap: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 2,
    borderBottomColor: colors.surface,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  headerTitle: { flex: 1, color: colors.text, fontSize: 18, fontWeight: "900" },
  banner: {
    marginTop: 18,
    backgroundColor: colors.secondary,
    borderRadius: 20,
    borderBottomWidth: 5,
    borderBottomColor: colors.secondaryShadow,
    padding: 16,
    gap: 6,
  },
  bannerEyebrow: { color: palette.frozenLake, fontWeight: "900", fontSize: 12, letterSpacing: 1 },
  bannerText: { color: colors.text, fontSize: 15, fontWeight: "600", lineHeight: 21 },
  node: {
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  nodeRing: { borderWidth: 4, borderColor: palette.mauve },
  nodeLabel: {
    color: colors.textMuted,
    fontWeight: "700",
    fontSize: 13,
    marginTop: 8,
    maxWidth: 140,
    textAlign: "center",
  },
  startBubble: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderWidth: 2,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 8,
  },
  startText: { color: colors.xp, fontWeight: "900", letterSpacing: 1 },
  trophy: { alignItems: "center", marginTop: 8 },
});
