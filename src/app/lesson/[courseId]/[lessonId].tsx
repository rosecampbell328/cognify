import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, SlideInDown, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChunkyButton, Icon, Muted, ProgressBar } from "@/components/ui";
import { xpForLesson } from "@/lib/progress";
import { completeLesson, useAppState } from "@/lib/store";
import type { Exercise } from "@/lib/types";
import { colors, palette } from "@/theme/colors";

type QueueItem = { exercise: Exercise; retry: boolean; key: string };

const TYPE_LABEL: Record<Exercise["type"], string> = {
  multiple_choice: "Choose the right answer",
  true_false: "True or false?",
  fill_blank: "Fill in the blank",
  flashcard: "New card",
};

export default function LessonScreen() {
  const { courseId, lessonId } = useLocalSearchParams<{ courseId: string; lessonId: string }>();
  const insets = useSafeAreaInsets();
  const lesson = useAppState((s) => s.courses.find((c) => c.id === courseId)?.lessons.find((l) => l.id === lessonId));

  const [queue, setQueue] = useState<QueueItem[]>(() =>
    (lesson?.exercises ?? []).map((exercise, i) => ({ exercise, retry: false, key: `q${i}` })),
  );
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [solved, setSolved] = useState(0);
  const [firstTryCorrect, setFirstTryCorrect] = useState(0);
  const [result, setResult] = useState<{ xp: number; accuracy: number } | null>(null);
  const recorded = useRef(false);

  const total = lesson?.exercises.length ?? 0;
  const item = queue[index];

  useEffect(() => {
    if (result && !recorded.current && courseId && lessonId) {
      recorded.current = true;
      completeLesson(courseId, lessonId, result.accuracy, result.xp);
    }
  }, [result, courseId, lessonId]);

  if (!lesson || total === 0) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Muted>This lesson couldn’t be found.</Muted>
        <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: colors.xp, fontWeight: "800" }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  if (result) {
    return <Results xp={result.xp} accuracy={result.accuracy} title={lesson.title} />;
  }

  const ex = item.exercise;
  const isCorrect = checked && selected === ex.correctIndex;

  /** Record an outcome and move on. Missed items come back at the end. */
  function advance(correct: boolean) {
    let nextQueue = queue;
    if (correct) {
      setSolved((n) => n + 1);
      if (!item.retry) setFirstTryCorrect((n) => n + 1);
    } else {
      nextQueue = [...queue, { ...item, retry: true, key: `${item.key}r${queue.length}` }];
      setQueue(nextQueue);
    }

    const next = index + 1;
    if (next >= nextQueue.length) {
      const accuracy = (firstTryCorrect + (correct && !item.retry ? 1 : 0)) / total;
      setResult({ accuracy, xp: xpForLesson(accuracy) });
      return;
    }
    setIndex(next);
    setSelected(null);
    setChecked(false);
    setFlipped(false);
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top + 8 }}>
      {/* Top: close + progress */}
      <View style={styles.topRow}>
        <Pressable accessibilityLabel="Quit lesson" hitSlop={12} onPress={() => router.back()}>
          <Icon name="close" size={24} color={colors.textFaint} />
        </Pressable>
        <ProgressBar value={solved / total} style={{ flex: 1 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 20 }} key={item.key}>
        <Animated.View entering={FadeIn.duration(250)} style={{ gap: 18 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {item.retry ? (
              <View style={styles.retryTag}>
                <Text style={styles.retryText}>PREVIOUS MISTAKE</Text>
              </View>
            ) : null}
            <Text style={styles.typeLabel}>{TYPE_LABEL[ex.type]}</Text>
          </View>

          {ex.type === "flashcard" ? (
            <Flashcard exercise={ex} flipped={flipped} onFlip={() => setFlipped(true)} />
          ) : (
            <>
              <Text style={styles.prompt}>{ex.prompt}</Text>
              <View style={{ gap: 12 }}>
                {ex.options.map((opt, i) => (
                  <Option
                    key={i}
                    label={opt}
                    index={i}
                    selected={selected === i}
                    state={
                      !checked ? "idle" : i === ex.correctIndex ? "correct" : i === selected ? "wrong" : "dim"
                    }
                    onPress={() => !checked && setSelected(i)}
                  />
                ))}
              </View>
            </>
          )}
        </Animated.View>
      </ScrollView>

      {/* Bottom action area */}
      {ex.type === "flashcard" ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          {flipped ? (
            <View style={{ flexDirection: "row", gap: 12 }}>
              <ChunkyButton
                label="Still learning"
                variant="outline"
                onPress={() => advance(false)}
                style={{ flex: 1 }}
              />
              <ChunkyButton
                label="Got it"
                color={colors.correct}
                shadowColor={colors.correctShadow}
                textColor={palette.darkAmethyst}
                onPress={() => advance(true)}
                style={{ flex: 1 }}
              />
            </View>
          ) : (
            <ChunkyButton label="Flip card" icon="cards" onPress={() => setFlipped(true)} />
          )}
        </View>
      ) : checked ? (
        <Animated.View
          entering={SlideInDown.duration(220)}
          style={[
            styles.feedback,
            { backgroundColor: isCorrect ? colors.correctBg : colors.wrongBg, paddingBottom: insets.bottom + 16 },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={[styles.feedbackIcon, { backgroundColor: isCorrect ? colors.correct : colors.wrong }]}>
              <Icon name={isCorrect ? "check" : "close"} size={20} color={palette.darkAmethyst} />
            </View>
            <Text style={[styles.feedbackTitle, { color: isCorrect ? colors.correct : colors.wrong }]}>
              {isCorrect ? pick(PRAISE) : "Not quite"}
            </Text>
          </View>
          {!isCorrect ? (
            <Text style={styles.feedbackBody}>
              Correct answer: <Text style={{ fontWeight: "900" }}>{ex.options[ex.correctIndex]}</Text>
            </Text>
          ) : null}
          {ex.explanation ? <Text style={styles.feedbackBody}>{ex.explanation}</Text> : null}
          <ChunkyButton
            label="Continue"
            color={isCorrect ? colors.correct : colors.wrong}
            shadowColor={isCorrect ? colors.correctShadow : colors.wrongShadow}
            textColor={palette.darkAmethyst}
            onPress={() => advance(isCorrect)}
          />
        </Animated.View>
      ) : (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <ChunkyButton label="Check" disabled={selected === null} onPress={() => setChecked(true)} />
        </View>
      )}
    </View>
  );
}

const PRAISE = ["Nice!", "Great job!", "Correct!", "You got it!", "Brilliant!"];
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

function Option({
  label,
  index,
  selected,
  state,
  onPress,
}: {
  label: string;
  index: number;
  selected: boolean;
  state: "idle" | "correct" | "wrong" | "dim";
  onPress: () => void;
}) {
  const border =
    state === "correct" ? colors.correct : state === "wrong" ? colors.wrong : selected ? palette.frozenLake : colors.surfaceRaised;
  const bg = state === "correct" ? colors.correctBg : state === "wrong" ? colors.wrongBg : selected ? "#2c2363" : colors.surface;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.option,
        { borderColor: border, backgroundColor: bg, opacity: state === "dim" ? 0.5 : 1 },
        pressed && state === "idle" && { transform: [{ translateY: 2 }] },
      ]}
    >
      <View style={[styles.optionKey, { borderColor: border }]}>
        <Text style={styles.optionKeyText}>{index + 1}</Text>
      </View>
      <Text style={styles.optionText}>{label}</Text>
    </Pressable>
  );
}

function Flashcard({ exercise, flipped, onFlip }: { exercise: Exercise; flipped: boolean; onFlip: () => void }) {
  return (
    <Pressable onPress={onFlip} accessibilityRole="button" accessibilityHint="Flips the card">
      <View style={[styles.card, flipped && { backgroundColor: colors.secondary, borderColor: colors.secondaryShadow }]}>
        <Text style={styles.cardEyebrow}>{flipped ? "ANSWER" : "TAP TO REVEAL"}</Text>
        <Text style={styles.cardFront}>{exercise.prompt}</Text>
        {flipped ? (
          <Animated.View entering={FadeIn.duration(250)} style={styles.cardDivider}>
            <Text style={styles.cardBack}>{exercise.back}</Text>
          </Animated.View>
        ) : null}
      </View>
    </Pressable>
  );
}

function Results({ xp, accuracy, title }: { xp: number; accuracy: number; title: string }) {
  const insets = useSafeAreaInsets();
  const pct = Math.round(accuracy * 100);
  return (
    <View style={[styles.center, { padding: 24, paddingBottom: insets.bottom + 24, gap: 18 }]}>
      <Animated.View entering={ZoomIn.springify()} style={styles.resultBadge}>
        <Icon name="trophy" size={64} color={colors.xp} />
      </Animated.View>
      <Text style={styles.resultTitle}>Lesson complete!</Text>
      <Muted style={{ textAlign: "center" }}>{title}</Muted>
      <View style={{ flexDirection: "row", gap: 12, alignSelf: "stretch" }}>
        <ResultTile label="XP EARNED" value={`+${xp}`} color={colors.xp} icon="bolt" />
        <ResultTile
          label="ACCURACY"
          value={`${pct}%`}
          color={pct >= 80 ? palette.frozenLake : palette.darkOrange}
          icon="star"
        />
      </View>
      <ChunkyButton label="Continue" onPress={() => router.back()} style={{ alignSelf: "stretch", marginTop: 12 }} />
    </View>
  );
}

function ResultTile({ label, value, color, icon }: { label: string; value: string; color: string; icon: "bolt" | "star" }) {
  return (
    <View style={[styles.tile, { borderColor: color }]}>
      <Text style={[styles.tileLabel, { backgroundColor: color }]}>{label}</Text>
      <View style={styles.tileBody}>
        <Icon name={icon} size={22} color={color} />
        <Text style={[styles.tileValue, { color }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  topRow: { flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 20 },
  typeLabel: { color: colors.textMuted, fontWeight: "800", fontSize: 15 },
  retryTag: { backgroundColor: colors.wrongBg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  retryText: { color: colors.wrong, fontWeight: "900", fontSize: 11, letterSpacing: 0.8 },
  prompt: { color: colors.text, fontSize: 22, fontWeight: "800", lineHeight: 30 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  optionKey: {
    width: 30,
    height: 30,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  optionKeyText: { color: colors.textMuted, fontWeight: "800", fontSize: 13 },
  optionText: { flex: 1, color: colors.text, fontSize: 17, fontWeight: "700", lineHeight: 23 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 2,
    borderTopColor: colors.surface,
  },
  feedback: { paddingHorizontal: 20, paddingTop: 18, gap: 12, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  feedbackIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  feedbackTitle: { fontSize: 22, fontWeight: "900" },
  feedbackBody: { color: colors.text, fontSize: 15, lineHeight: 21 },
  card: {
    minHeight: 260,
    borderRadius: 26,
    borderWidth: 2,
    borderBottomWidth: 6,
    borderColor: colors.primaryShadow,
    backgroundColor: colors.surfaceRaised,
    padding: 24,
    gap: 14,
    justifyContent: "center",
  },
  cardEyebrow: { color: palette.royalGold, fontWeight: "900", letterSpacing: 1.2, fontSize: 12 },
  cardFront: { color: colors.text, fontSize: 24, fontWeight: "900", lineHeight: 31 },
  cardDivider: { borderTopWidth: 2, borderTopColor: "rgba(255,255,255,0.2)", paddingTop: 14 },
  cardBack: { color: colors.text, fontSize: 18, fontWeight: "600", lineHeight: 26 },
  resultBadge: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 4,
    borderColor: colors.xp,
    alignItems: "center",
    justifyContent: "center",
  },
  resultTitle: { color: colors.xp, fontSize: 30, fontWeight: "900" },
  tile: { flex: 1, borderWidth: 2, borderRadius: 18, overflow: "hidden" },
  tileLabel: {
    color: palette.darkAmethyst,
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 1,
    textAlign: "center",
    paddingVertical: 6,
  },
  tileBody: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
  tileValue: { fontSize: 24, fontWeight: "900", fontVariant: ["tabular-nums"] },
});
