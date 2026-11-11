import type { Course, Exercise, Lesson } from "./types";

/**
 * On-device course builder used when the AI route isn't reachable (no API key,
 * offline). It is deliberately simple — sentence and keyword based — so the app
 * is fully usable as a demo, while the real teaching quality comes from Claude.
 */

const STOPWORDS = new Set(
  `about above after again against because been before being below between both could
  does doing down during each from further having here hers herself himself into itself
  just more most other ought ours ourselves over same should some such than that their
  theirs them themselves then there these they this those through under until very were
  what when where which while whom with would your yours yourself yourselves also many
  much often only such using used uses like make makes made well even every first
  however therefore thus within without among across around include includes including
  called known means process plays helps tends leads makes things together little while
  although because since whether rather another something another different better`
    .split(/\s+/)
    .filter(Boolean),
);

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"“])/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 40 && s.length <= 260 && /[a-z]/i.test(s));
}

function keyTerms(text: string, limit = 40): string[] {
  const counts = new Map<string, { word: string; n: number }>();
  for (const raw of text.match(/[A-Za-z][A-Za-z-]{4,}/g) ?? []) {
    const lower = raw.toLowerCase();
    if (STOPWORDS.has(lower)) continue;
    const entry = counts.get(lower) ?? { word: raw, n: 0 };
    entry.n += 1;
    counts.set(lower, entry);
  }
  return [...counts.values()]
    .sort((a, b) => b.n - a.n || b.word.length - a.word.length)
    .slice(0, limit)
    .map((e) => e.word);
}

function termIn(sentence: string, terms: string[]): string | null {
  const candidates = terms.filter((t) => new RegExp(`\\b${t}\\b`, "i").test(sentence));
  return candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : null;
}

function distractors(answer: string, terms: string[], n = 3) {
  return shuffle(terms.filter((t) => t.toLowerCase() !== answer.toLowerCase())).slice(0, n);
}

function choiceExercise(
  type: "multiple_choice" | "fill_blank",
  prompt: string,
  answer: string,
  wrong: string[],
  explanation: string,
): Exercise {
  const options = shuffle([answer, ...wrong]);
  return {
    type,
    prompt,
    options,
    correctIndex: options.indexOf(answer),
    explanation,
    back: "",
  };
}

function buildExercises(sentence: string, terms: string[], variant: number): Exercise | null {
  const term = termIn(sentence, terms);
  if (!term) return null;
  const wrong = distractors(term, terms);
  if (wrong.length < 3) return null;
  const blanked = sentence.replace(new RegExp(`\\b${term}\\b`, "i"), "____");

  switch (variant % 4) {
    case 0:
      return choiceExercise("fill_blank", blanked, term, wrong, sentence);
    case 1: {
      const makeFalse = Math.random() < 0.5;
      const statement = makeFalse
        ? sentence.replace(new RegExp(`\\b${term}\\b`, "i"), wrong[0])
        : sentence;
      return {
        type: "true_false",
        prompt: statement,
        options: ["True", "False"],
        correctIndex: makeFalse ? 1 : 0,
        explanation: makeFalse ? `Your source says: “${sentence}”` : "That's straight from your source.",
        back: "",
      };
    }
    case 2:
      return {
        type: "flashcard",
        prompt: `What does your material say about “${term}”?`,
        options: [],
        correctIndex: 0,
        explanation: "",
        back: sentence,
      };
    default:
      return choiceExercise(
        "multiple_choice",
        `Which word best completes this idea?\n\n${blanked}`,
        term,
        wrong,
        sentence,
      );
  }
}

const EMOJIS = ["📘", "🧠", "🔭", "🧪", "🌍", "💡", "🎯", "🧩"];

export function generateLocalCourse(input: {
  goal: string;
  sources: { id: string; title: string; content: string }[];
}): Course {
  const text = input.sources.map((s) => s.content).join("\n\n");
  const sentences = shuffle(splitSentences(text));
  const terms = keyTerms(text);

  const exercises: Exercise[] = [];
  sentences.forEach((s, i) => {
    const ex = buildExercises(s, terms, i);
    if (ex) exercises.push(ex);
  });

  if (exercises.length < 3) {
    throw new Error(
      "There isn't enough text here to build lessons yet. Try adding a few more paragraphs.",
    );
  }

  const perLesson = 5;
  const lessonCount = Math.min(8, Math.ceil(exercises.length / perLesson));
  const lessons: Lesson[] = Array.from({ length: lessonCount }, (_, i) => {
    const chunk = exercises.slice(i * perLesson, (i + 1) * perLesson);
    const focus = terms[i] ?? `Part ${i + 1}`;
    return {
      id: `l${i + 1}`,
      title: i === 0 ? "The basics" : `Focus: ${focus}`,
      summary: `Practice built from your material${terms[i] ? `, centred on “${focus}”` : ""}.`,
      exercises: chunk,
    };
  }).filter((l) => l.exercises.length > 0);

  const title = input.sources.length === 1 ? input.sources[0].title : input.goal || "My course";

  return {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    title,
    emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
    description: input.goal ? `Goal: ${input.goal}` : "Built from your uploaded material.",
    goal: input.goal,
    sourceIds: input.sources.map((s) => s.id),
    lessons,
    createdAt: Date.now(),
    generatedBy: "offline",
  };
}
