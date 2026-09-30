import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { messageInput, type Message } from "@/lib/schemas";
import { db } from "@/lib/db";
import { practiceSession } from "@/lib/db/schema";
import { apiUser } from "@/lib/session";
import { streamCandidateReply } from "@/lib/ai/candidate";
import { MAX_INTERVIEWER_TURNS } from "@/lib/limits";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser(req);
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const parsed = messageInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { id } = await params;
  const [s] = await db.select().from(practiceSession)
    .where(and(eq(practiceSession.id, id), eq(practiceSession.userId, user.id))).limit(1);
  if (!s) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (s.status !== "active") return NextResponse.json({ error: "This interview has ended." }, { status: 409 });
  if (s.messages.filter((m) => m.speaker === "interviewer").length >= MAX_INTERVIEWER_TURNS) {
    return NextResponse.json({ error: "Question limit reached. End the interview to see your report." }, { status: 429 });
  }

  // The server owns the transcript; the browser only sends the new question.
  const history: Message[] = [...s.messages, { speaker: "interviewer", content: parsed.data.content }];

  // Pull the first chunk before responding so upstream failures become a clean 502.
  const iter = streamCandidateReply(s, history);
  let first: IteratorResult<string>;
  try { first = await iter.next(); }
  catch { return NextResponse.json({ error: "The candidate is unavailable. Try again." }, { status: 502 }); }

  const enc = new TextEncoder();
  let reply = "";
  const stream = new ReadableStream({
    async start(c) {
      const push = (t: string) => { reply += t; try { c.enqueue(enc.encode(t)); } catch { /* client left; keep collecting */ } };
      try {
        if (!first.done) push(first.value);
        for (;;) { const n = await iter.next(); if (n.done) break; push(n.value); }
      } catch { /* persist whatever arrived */ }
      finally {
        if (reply.trim()) {
          await db.update(practiceSession)
            .set({ messages: [...history, { speaker: "candidate", content: reply.trim() }] })
            .where(eq(practiceSession.id, id));
        }
        try { c.close(); } catch { /* already closed */ }
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}
