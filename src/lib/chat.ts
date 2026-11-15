export type ChatMessage = { id: string; role: "user" | "assistant"; text: string };

export type ChatReply =
  | { ok: true; reply: string; ready: boolean; title: string; brief: string }
  | { ok: false; message: string; noKey?: boolean };

/** Send the conversation to /api/chat (Claude) and get the planner's next reply. */
export async function sendChat(messages: ChatMessage[]): Promise<ChatReply> {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: messages.map(({ role, text }) => ({ role, text })) }),
    });
    const body = await res.json().catch(() => null);
    if (res.ok && typeof body?.reply === "string") {
      return { ok: true, reply: body.reply, ready: !!body.ready, title: body.title ?? "", brief: body.brief ?? "" };
    }
    if (body?.error === "no_api_key") {
      return {
        ok: false,
        noKey: true,
        message: "The AI chat isn't set up yet. Add ANTHROPIC_API_KEY to the server's .env.local and restart it.",
      };
    }
    return { ok: false, message: body?.message ? `Sorry, ${body.message}.` : "Sorry, something went wrong. Try again?" };
  } catch {
    return { ok: false, message: "Couldn't reach the AI server. Check your connection and try again." };
  }
}
