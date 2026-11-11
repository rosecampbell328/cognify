export type SourceKind = "text" | "file";

/** Something the learner uploaded or pasted — the raw material for a course. */
export type Source = {
  id: string;
  title: string;
  kind: SourceKind;
  content: string;
  createdAt: number;
};

export type ExerciseType =
  | "multiple_choice"
  | "true_false"
  | "fill_blank"
  | "flashcard";

/**
 * One flat shape for every exercise type keeps both the AI schema and the UI simple.
 * - multiple_choice / fill_blank: `options` + `correctIndex`. fill_blank prompts contain "____".
 * - true_false: options are ["True", "False"].
 * - flashcard: `prompt` is the front, `back` the reverse; no options.
 */
export type Exercise = {
  type: ExerciseType;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  back: string;
};

export type Lesson = {
  id: string;
  title: string;
  summary: string;
  exercises: Exercise[];
};

export type Course = {
  id: string;
  title: string;
  emoji: string;
  description: string;
  goal: string;
  sourceIds: string[];
  lessons: Lesson[];
  createdAt: number;
  /** "ai" when Claude built it, "offline" when the on-device fallback did. */
  generatedBy: "ai" | "offline";
};

export type Progress = {
  xp: number;
  streak: number;
  /** YYYY-MM-DD of the last day the learner finished a lesson. */
  lastActiveDay: string | null;
  dailyGoal: number;
  todayXp: number;
  todayDay: string | null;
  /** key = `${courseId}:${lessonId}`, value = best accuracy 0–1 */
  completed: Record<string, number>;
};

export type AppState = {
  sources: Source[];
  courses: Course[];
  progress: Progress;
};
