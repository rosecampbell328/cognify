import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod/v4";

import { client, errorResponse, json, missingKeyResponse, MODEL } from "@/server/claude";

/**
 * POST /api/generate — builds a bite-sized course, either from the learner's
 * sources or, with no sources, from a description of what they want to learn
 * (the chat course builder). Runs on the server so ANTHROPIC_API_KEY never
 * ships inside the app bundle.
 */

const ExerciseSchema = z.object({
  type: z.enum(["multiple_choice", "true_false", "fill_blank", "flashcard"]),
  prompt: z.string(),
  options: z.array(z.string()),
  correctIndex: z.number().int(),
  explanation: z.string(),
  back: z.string(),
});

const CourseSchema = z.object({
  title: z.string(),
  emoji: z.string(),
  description: z.string(),
  lessons: z.array(
    z.object({
      title: z.string(),
      summary: z.string(),
      exercises: z.array(ExerciseSchema),
    }),
  ),
});

const RequestSchema = z
  .object({
    goal: z.string().max(4000).default(""),
    sources: z.array(z.object({ title: z.string(), content: z.string() })).default([]),
  })
  .refine((r) => r.sources.length > 0 || r.goal.trim().length > 0, {
    message: "Send at least one source or a description of what to learn.",
  });

// ~ a few hundred pages of text. Larger uploads are rejected with a clear
// message rather than silently cut short.
const MAX_SOURCE_CHARS = 600_000;

const SHARED_RULES = `Course shape:
- Order lessons from foundational to advanced. Aim for 4–8 lessons with 5–7 exercises each.
- Mix exercise types inside every lesson, and open each lesson with a flashcard that introduces its key idea.
- Keep every prompt short enough to read on a phone in a few seconds.

Exercise rules (every field is required):
- multiple_choice: a question in "prompt", exactly 4 plausible "options", "correctIndex" pointing at the right one.
- true_false: a statement in "prompt", options exactly ["True", "False"], correctIndex 0 for true and 1 for false.
- fill_blank: a sentence in "prompt" containing "____" where one word or short phrase is missing, 4 "options", correctIndex for the right fill.
- flashcard: "prompt" is the front (a term or question), "back" is the answer; options [] and correctIndex 0.
- "explanation": one or two friendly sentences shown after the learner answers, saying why the answer is right. Use "" for flashcards.
- "back": "" for every type except flashcard.
- Vary the position of the correct option.

Course fields: a concise "title", a single fitting emoji in "emoji", and a one-sentence "description".`;

const FROM_SOURCES_PROMPT = `You are Cognify's course designer. You turn a learner's own material into a short, game-like course in the style of Duolingo: many tiny lessons, each a quick run of interactive exercises.

- Teach only what is supported by the provided sources. Do not introduce facts the sources don't contain.
- Shape the course around the learner's goal when one is given; otherwise cover the most important ideas in the material.
- Size the course to how much material there is.

${SHARED_RULES}`;

const FROM_BRIEF_PROMPT = `You are Cognify's course designer. You build a short, game-like course in the style of Duolingo from a learner's description of what they want to learn: many tiny lessons, each a quick run of interactive exercises.

- Teach accurate, well-established knowledge. Keep to what you are confident is correct; leave out anything uncertain.
- Match the level, focus and context the learner describes (for example, a trip, an exam or a job).
- For language courses, teach practical words and phrases with their meaning, build from single words to short phrases, and keep spelling and accents correct.

${SHARED_RULES}`;

/** Drop malformed exercises instead of failing the whole course. */
function sanitize(course: z.infer<typeof CourseSchema>) {
  const lessons = course.lessons
    .map((lesson) => ({
      ...lesson,
      exercises: lesson.exercises.filter((ex) => {
        if (!ex.prompt.trim()) return false;
        if (ex.type === "flashcard") return ex.back.trim().length > 0;
        return ex.options.length >= 2 && ex.correctIndex >= 0 && ex.correctIndex < ex.options.length;
      }),
    }))
    .filter((lesson) => lesson.exercises.length > 0);
  return { ...course, lessons };
}

export async function POST(request: Request) {
  const noKey = missingKeyResponse();
  if (noKey) return noKey;

  const parsed = RequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return json({ error: "bad_request", message: "Send a goal or at least one source." }, 400);
  }
  const { goal, sources } = parsed.data;

  const totalChars = sources.reduce((n, s) => n + s.content.length, 0);
  if (totalChars > MAX_SOURCE_CHARS) {
    return json(
      {
        error: "too_large",
        message: `your sources are too long (${totalChars.toLocaleString()} characters; the limit is ${MAX_SOURCE_CHARS.toLocaleString()}). Try fewer or shorter sources`,
      },
      413,
    );
  }

  const fromSources = sources.length > 0;
  const userContent = fromSources
    ? `${sources
        .map((s, i) => `<source index="${i + 1}" title="${s.title.replace(/"/g, "'")}">\n${s.content}\n</source>`)
        .join("\n\n")}\n\nLearner's goal: ${goal.trim() || "(none given — cover the key ideas)"}\n\nBuild the course.`
    : `What the learner wants to learn:\n${goal.trim()}\n\nBuild the course.`;

  try {
    const response = await client().beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: {
        effort: "medium",
        format: betaZodOutputFormat(CourseSchema),
      },
      system: fromSources ? FROM_SOURCES_PROMPT : FROM_BRIEF_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });

    if (response.stop_reason === "refusal") {
      return json({ error: "refused", message: "the AI declined to build this course" }, 422);
    }
    if (response.stop_reason === "max_tokens" || !response.parsed_output) {
      return json({ error: "incomplete", message: "the course came back incomplete" }, 502);
    }

    const course = sanitize(response.parsed_output);
    if (course.lessons.length === 0) {
      return json({ error: "empty", message: "no usable lessons were produced" }, 502);
    }
    return json({ course });
  } catch (error) {
    return errorResponse(error);
  }
}
