import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Eyebrow, Icon, Muted, ProgressBar } from "@/components/ui";
import { xpForLesson } from "@/lib/progress";
import { completeLesson, useAppState } from "@/lib/store";
import type { Exercise } from "@/lib/types";
import { colors } from "@/theme/colors";
import { fonts } from "@/theme/type";

type QueueItem = { exercise: Exercise; retry: boolean; key: string };

const TYPE_LABEL: Record<Exercise["type"], string> = {
  multiple_choice: "Choose one",
  true_false: "True or false",
  fill_blank: "Fill the gap",
  flashcard: "Key idea",
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
          <Text style={{ color: colors.primary, fontWeight: "800" }}>Go back</Text>
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
            <Eyebrow>{TYPE_LABEL[ex.type]}</Eyebrow>
            {item.retry ? (
              <View style={styles.retryTag}>
                <Text style={styles.retryText}>Let’s try this again</Text>
              </View>
            ) : null}
          </View>

          {ex.type === "flashcard" ? (
            <Flashcard exercise={ex} flipped={flipped} onFlip={() => setFlipped(true)} />
          ) : (
            <>
              <Text style={styles.prompt}>{ex.prompt}</Text>
              <View style={{ gap: 10 }}>
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
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {ex.type === "flashcard" ? (
          flipped ? (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button label="Still learning" variant="outline" onPress={() => advance(false)} style={{ flex: 1 }} />
              <Button label="Got it" icon="check" onPress={() => advance(true)} style={{ flex: 1 }} />
            </View>
          ) : (
            <Button label="Reveal answer" icon="cards" onPress={() => setFlipped(true)} />
          )
        ) : checked ? (
          <Animated.View entering={FadeInDown.duration(220)} style={{ gap: 12 }}>
            <View style={[styles.feedback, { borderLeftColor: isCorrect ? colors.correct : colors.wrong }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Icon name={isCorrect ? "check" : "close"} size={18} color={isCorrect ? colors.correct : colors.wrong} />
                <Text style={[styles.feedbackTitle, { color: isCorrect ? colors.correct : colors.wrong }]}>
                  {isCorrect ? pick(PRAISE) : "Not quite"}
                </Text>
              </View>
              {!isCorrect ? (
                <Text style={styles.feedbackBody}>
                  The answer is <Text style={{ fontWeight: "700" }}>{ex.options[ex.correctIndex]}</Text>.
                </Text>
              ) : null}
              {ex.explanation ? <Text style={styles.feedbackBody}>{ex.explanation}</Text> : null}
            </View>
            <Button label="Continue" onPress={() => advance(isCorrect)} />
          </Animated.View>
        ) : (
          <Button label="Check answer" disabled={selected === null} onPress={() => setChecked(true)} />
        )}
      </View>
    </View>
  );
}

const PRAISE = ["Correct", "Exactly right", "Well done", "That's it", "Spot on"];
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const LETTERS = ["A", "B", "C", "D", "E", "F"];

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
  const accent =
    state === "correct" ? colors.correct : state === "wrong" ? colors.wrong : selected ? colors.primary : colors.border;
  const bg =
    state === "correct" ? colors.correctBg : state === "wrong" ? colors.wrongBg : selected ? colors.surface : colors.background;
  const keyFilled = selected || state === "correct" || state === "wrong";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.option,
        { borderColor: accent, backgroundColor: bg, opacity: state === "dim" ? 0.45 : pressed && state === "idle" ? 0.8 : 1 },
      ]}
    >
      <View style={[styles.optionKey, keyFilled ? { backgroundColor: accent, borderColor: accent } : { borderColor: colors.border }]}>
        <Text style={[styles.optionKeyText, keyFilled && { color: colors.textOnPrimary }]}>{LETTERS[index] ?? index + 1}</Text>
      </View>
      <Text style={styles.optionText}>{label}</Text>
      {state === "correct" || state === "wrong" ? (
        <Icon name={state === "correct" ? "check" : "close"} size={18} color={accent} />
      ) : null}
    </Pressable>
  );
}

function Flashcard({ exercise, flipped, onFlip }: { exercise: Exercise; flipped: boolean; onFlip: () => void }) {
  return (
    <Pressable onPress={onFlip} accessibilityRole="button" accessibilityHint="Reveals the answer">
      <View style={styles.card}>
        <Text style={styles.cardFront}>{exercise.prompt}</Text>
        {flipped ? (
          <Animated.View entering={FadeIn.duration(250)} style={styles.cardBackWrap}>
            <Eyebrow>Answer</Eyebrow>
            <Text style={styles.cardBack}>{exercise.back}</Text>
          </Animated.View>
        ) : (
          <Text style={styles.cardHint}>Think of the answer, then reveal it.</Text>
        )}
      </View>
    </Pressable>
  );
}

function Results({ xp, accuracy, title }: { xp: number; accuracy: number; title: string }) {
  const insets = useSafeAreaInsets();
  const pct = Math.round(accuracy * 100);
  const note =
    pct >= 90 ? "Excellent recall." : pct >= 70 ? "Solid work. A quick review will lock it in." : "Good effort. Practising this again will help it stick.";
  return (
    <View style={[styles.center, { padding: 24, paddingBottom: insets.bottom + 24 }]}>
      <Animated.View entering={FadeInDown.duration(350)} style={{ alignSelf: "stretch", alignItems: "center", gap: 10 }}>
        <View style={styles.resultMark}>
          <Icon name="check" size={28} color={colors.textOnPrimary} />
        </View>
        <Eyebrow style={{ marginTop: 8 }}>{title}</Eyebrow>
        <Text style={styles.resultTitle}>Lesson complete</Text>
        <Muted style={{ textAlign: "center" }}>{note}</Muted>

        <View style={styles.summary}>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryValue}>+{xp}</Text>
            <View style={styles.summaryLabelRow}>
              <Icon name="bolt" size={14} color={colors.xp} />
              <Text style={styles.summaryLabel}>XP earned</Text>
            </View>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCell}>
            <Text style={styles.summaryValue}>{pct}%</Text>
            <View style={styles.summaryLabelRow}>
              <Icon name="star" size={14} color={pct >= 80 ? colors.correct : colors.secondaryShadow} />
              <Text style={styles.summaryLabel}>Accuracy</Text>
            </View>
          </View>
        </View>

        <Button label="Continue" onPress={() => router.back()} style={{ alignSelf: "stretch", marginTop: 16 }} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  topRow: { flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 20 },
  retryTag: { backgroundColor: colors.wrongBg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  retryText: { color: colors.wrong, fontWeight: "700", fontSize: 12 },
  prompt: { color: colors.text, fontFamily: fonts.displayMedium, fontSize: 24, lineHeight: 32 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  optionKey: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  optionKeyText: { color: colors.textMuted, fontWeight: "700", fontSize: 13 },
  optionText: { flex: 1, color: colors.text, fontSize: 17, lineHeight: 23 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  feedback: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderLeftWidth: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  feedbackTitle: { fontFamily: fonts.display, fontSize: 19 },
  feedbackBody: { color: colors.text, fontSize: 15, lineHeight: 21 },
  card: {
    minHeight: 240,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 24,
    gap: 16,
    justifyContent: "center",
  },
  cardFront: { color: colors.text, fontFamily: fonts.display, fontSize: 28, lineHeight: 35 },
  cardHint: { color: colors.textFaint, fontSize: 14 },
  cardBackWrap: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16, gap: 6 },
  cardBack: { color: colors.text, fontSize: 18, lineHeight: 26 },
  resultMark: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.correct,
    alignItems: "center",
    justifyContent: "center",
  },
  resultTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 34, letterSpacing: -0.4 },
  summary: {
    flexDirection: "row",
    alignSelf: "stretch",
    marginTop: 18,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 18,
  },
  summaryCell: { flex: 1, alignItems: "center", gap: 4 },
  summaryDivider: { width: 1, backgroundColor: colors.border },
  summaryValue: { color: colors.text, fontFamily: fonts.display, fontSize: 32, fontVariant: ["tabular-nums"] },
  summaryLabelRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  summaryLabel: { color: colors.textMuted, fontWeight: "600", fontSize: 13 },
});
