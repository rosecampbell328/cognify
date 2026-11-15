import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod/v4";

import { client, errorResponse, json, missingKeyResponse, MODEL } from "@/server/claude";

/**
 * POST /api/chat — the "describe it to AI" course builder. The learner chats
 * about what they want to learn; once the plan is clear, the reply carries a
 * brief that /api/generate turns into a course.
 */

const RequestSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().min(1).max(4000) }))
    .min(1)
    .max(40),
});

const ReplySchema = z.object({
  reply: z.string(),
  readyToBuild: z.boolean(),
  courseTitle: z.string(),
  courseBrief: z.string(),
});

const SYSTEM_PROMPT = `You are Cognify's course planner, chatting with a learner inside a mobile learning app. Your job is to work out what course to build for them; a separate step builds it from your brief.

How to chat:
- Be warm and brief: one to three short sentences per reply, written for a phone screen.
- If the request is already specific enough (topic plus a sense of level or purpose), don't ask anything: confirm the plan and set readyToBuild to true.
- Otherwise ask at most one question per reply, about what matters most: their current level, the situation they'll use it in, or which part of the topic to focus on. Two questions in total is plenty; after that, make sensible assumptions and get ready to build.
- If they ask for changes after you were ready, update the plan and stay ready.
- If the request isn't something a short quiz-and-flashcard course can teach, say so kindly and suggest a nearby topic that works.

Fields:
- reply: your chat message.
- readyToBuild: true once you know enough to build the course.
- courseTitle: a short course title when ready, otherwise "".
- courseBrief: when ready, a detailed paragraph for the course builder covering topic, the learner's level, their context and goals, what to focus on, and examples of what to include (for a language course, the kind of vocabulary and phrases). Otherwise "".`;

export async function POST(request: Request) {
  const noKey = missingKeyResponse();
  if (noKey) return noKey;

  const parsed = RequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return json({ error: "bad_request", message: "Send the chat messages." }, 400);
  }

  // The API needs the conversation to start with the learner.
  const messages = parsed.data.messages;
  const firstUser = messages.findIndex((m) => m.role === "user");
  if (firstUser < 0) {
    return json({ error: "bad_request", message: "Send at least one message from the learner." }, 400);
  }

  try {
    const response = await client().beta.messages.parse({
      model: MODEL,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: {
        effort: "low",
        format: betaZodOutputFormat(ReplySchema),
      },
      system: SYSTEM_PROMPT,
      messages: messages.slice(firstUser).map((m) => ({ role: m.role, content: m.text })),
    });

    if (response.stop_reason === "refusal") {
      return json({ error: "refused", message: "I can't help build a course on that. Try another topic?" }, 422);
    }
    const out = response.parsed_output;
    if (!out || response.stop_reason === "max_tokens") {
      return json({ error: "incomplete", message: "the reply came back incomplete" }, 502);
    }

    const ready = out.readyToBuild && out.courseBrief.trim().length > 0;
    return json({
      reply: out.reply,
      ready,
      title: ready ? out.courseTitle : "",
      brief: ready ? out.courseBrief : "",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
