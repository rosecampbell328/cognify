import { extractText, getDocumentProxy } from "unpdf";
import { z } from "zod/v4";

import { json } from "@/server/claude";

/**
 * POST /api/extract — pulls the text out of an uploaded PDF so it can be used
 * like any other source. Runs on the server (no AI involved, no API key needed).
 */

// Base64 is ~4/3 the file size, so this allows PDFs up to ~25 MB.
const MAX_BASE64_CHARS = 34_000_000;

const RequestSchema = z.object({
  name: z.string(),
  base64: z.string().min(1).max(MAX_BASE64_CHARS),
});

export async function POST(request: Request) {
  const parsed = RequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const tooBig = parsed.error.issues.some((i) => i.code === "too_big");
    return json(
      tooBig
        ? { error: "too_large", message: "This PDF is over 25 MB. Try a smaller file." }
        : { error: "bad_request", message: "Send a PDF as base64." },
      tooBig ? 413 : 400,
    );
  }

  try {
    const bytes = Uint8Array.from(Buffer.from(parsed.data.base64, "base64"));
    const pdf = await getDocumentProxy(bytes);
    const { totalPages, text } = await extractText(pdf, { mergePages: true });
    const clean = text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

    if (clean.length < 20) {
      return json(
        {
          error: "no_text",
          message: `“${parsed.data.name}” has no readable text. It may be scanned images, which aren't supported yet.`,
        },
        422,
      );
    }
    return json({ text: clean, pages: totalPages });
  } catch {
    return json(
      { error: "unreadable", message: `Couldn't read “${parsed.data.name}”. It may be damaged or password-protected.` },
      422,
    );
  }
}
