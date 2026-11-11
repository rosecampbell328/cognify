import { generateLocalCourse } from "./localGenerator";
import { makeId } from "./store";
import type { Course, Lesson, Source } from "./types";

export type GenerateResult = { course: Course; usedFallback: boolean; notice?: string };

type ApiCourse = {
  title: string;
  emoji: string;
  description: string;
  lessons: Omit<Lesson, "id">[];
};

/**
 * Ask the server (src/app/api/generate+api.ts → Claude) to build a course.
 * Falls back to the on-device generator if the server has no API key or
 * can't be reached, so the app always works.
 */
export async function generateCourse(goal: string, sources: Source[]): Promise<GenerateResult> {
  const payload = {
    goal,
    sources: sources.map((s) => ({ title: s.title, content: s.content })),
  };

  let notice: string | undefined;
  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => null);

    if (res.ok && body?.course) {
      const c = body.course as ApiCourse;
      return {
        usedFallback: false,
        course: {
          id: makeId(),
          title: c.title,
          emoji: c.emoji || "📘",
          description: c.description,
          goal,
          sourceIds: sources.map((s) => s.id),
          lessons: c.lessons.map((l, i) => ({ ...l, id: `l${i + 1}` })),
          createdAt: Date.now(),
          generatedBy: "ai",
        },
      };
    }
    notice =
      body?.error === "no_api_key"
        ? "AI is not set up yet (no ANTHROPIC_API_KEY on the server), so this is a quick offline draft."
        : body?.message
          ? `AI couldn't build this one (${body.message}). Here's an offline draft instead.`
          : "AI is unavailable right now, so this is a quick offline draft.";
  } catch {
    notice = "Couldn't reach the AI server, so this is a quick offline draft.";
  }

  const course = generateLocalCourse({ goal, sources });
  return { course, usedFallback: true, notice };
}
