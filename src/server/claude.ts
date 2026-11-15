import Anthropic from "@anthropic-ai/sdk";

/** Server-only helpers shared by the API routes in src/app/api. */

export const MODEL = "claude-opus-5-5";

export function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

/** null when the server has a key; otherwise the response every AI route returns. */
export function missingKeyResponse(): Response | null {
  return process.env.ANTHROPIC_API_KEY ? null : json({ error: "no_api_key" }, 503);
}

export function client() {
  return new Anthropic();
}

/** Map SDK errors to friendly JSON responses (most specific first). */
export function errorResponse(error: unknown): Response {
  if (error instanceof Anthropic.AuthenticationError) {
    return json({ error: "auth", message: "the server's API key was rejected" }, 502);
  }
  if (error instanceof Anthropic.RateLimitError) {
    return json({ error: "rate_limited", message: "too many requests, try again shortly" }, 429);
  }
  if (error instanceof Anthropic.APIError) {
    return json({ error: "api_error", message: `AI service error ${error.status ?? ""}`.trim() }, 502);
  }
  return json({ error: "unknown", message: "something went wrong" }, 500);
}
