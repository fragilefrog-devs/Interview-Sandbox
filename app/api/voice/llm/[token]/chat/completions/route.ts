import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { practiceSession } from "@/lib/db/schema";
import { verifySessionToken } from "@/lib/voice/token";
import { streamCandidateReply } from "@/lib/ai/candidate";
import { MAX_INTERVIEWER_TURNS } from "@/lib/limits";
import type { Message } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

const sse = (o: unknown) => `data: ${JSON.stringify(o)}\n\n`;

/**
 * OpenAI-compatible endpoint the voice provider calls as its "LLM".
 * The session (and its hidden dossier) is resolved server-side from a signed token; nothing sensitive is in the provider's config.
 */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const sessionId = verifySessionToken(decodeURIComponent(token));
  if (!sessionId) return new Response("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null) as { messages?: { role: string; content: unknown }[] } | null;
  const [s] = await db.select().from(practiceSession).where(eq(practiceSession.id, sessionId)).limit(1);
  if (!s || s.status !== "active" || s.mode !== "voice") return new Response("Gone", { status: 410 });

  const history: Message[] = (body?.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .map((m) => ({ speaker: m.role === "user" ? "interviewer" as const : "candidate" as const, content: (m.content as string).trim().slice(0, 2000) }))
    .slice(-60);
  if (!history.length || history[history.length - 1].speaker !== "interviewer") return new Response("Bad request", { status: 400 });
  if (history.filter((m) => m.speaker === "interviewer").length > MAX_INTERVIEWER_TURNS) return new Response("Turn limit", { status: 429 });

  const id = `chatcmpl-${crypto.randomUUID()}`, created = Math.floor(Date.now() / 1000);
  const chunk = (delta: object, finish: string | null = null) =>
    sse({ id, object: "chat.completion.chunk", created, model: "practice-candidate", choices: [{ index: 0, delta, finish_reason: finish }] });

  const iter = streamCandidateReply(s, history, { voice: true });
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(c) {
      try {
        c.enqueue(enc.encode(chunk({ role: "assistant", content: "" })));
        for (;;) { const n = await iter.next(); if (n.done) break; c.enqueue(enc.encode(chunk({ content: n.value }))); }
        c.enqueue(enc.encode(chunk({}, "stop")));
      } catch {
        c.enqueue(enc.encode(chunk({ content: "Sorry, could you say that again?" })));
        c.enqueue(enc.encode(chunk({}, "stop")));
      } finally { c.enqueue(enc.encode("data: [DONE]\n\n")); c.close(); }
    },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream", "cache-control": "no-store" } });
}
