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
 * Ask the server (src/app/api/generate+api.ts → Claude) to build a course from
 * sources, or from a description alone when `sources` is empty (chat builder).
 * With sources, falls back to the on-device generator if the server has no API
 * key or can't be reached, so uploads always work. A description-only course
 * needs the AI, so that case reports the problem instead.
 */
export async function generateCourse(goal: string, sources: Source[]): Promise<GenerateResult> {
  const payload = {
    goal,
    sources: sources.map((s) => ({ title: s.title, content: s.content })),
  };

  // Plain reason the AI couldn't build it; wording for each case is added below.
  let problem: string;
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
    problem =
      body?.error === "no_api_key"
        ? "AI is not set up yet (no ANTHROPIC_API_KEY on the server)"
        : body?.message
          ? `AI couldn't build this one (${body.message})`
          : "AI is unavailable right now";
  } catch {
    problem = "Couldn't reach the AI server";
  }

  if (sources.length === 0) {
    throw new Error(`${problem}, and a course from a description needs the AI. Try again once it's available.`);
  }
  const notice = `${problem}, so this is a quick offline draft built from your material.`;
  const course = generateLocalCourse({ goal, sources });
  return { course, usedFallback: true, notice };
}
