import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { practiceSession, voiceSession } from "@/lib/db/schema";
import { apiUser } from "@/lib/session";
import { saveTranscript } from "@/lib/voice/persist";

export const runtime = "nodejs";

const body = z.object({
  segments: z.array(z.object({
    speaker: z.enum(["interviewer", "candidate"]),
    content: z.string().trim().min(1).max(4000),
    startMs: z.number().int().min(0),
    endMs: z.number().int().min(0),
  })).max(400),
});

/** Fallback when the provider webhook cannot reach us (e.g. local dev). The webhook's transcript wins when it exists. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser(req);
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { id } = await params;

  const [s] = await db.select({ id: practiceSession.id }).from(practiceSession)
    .where(and(eq(practiceSession.id, id), eq(practiceSession.userId, user.id))).limit(1);
  if (!s) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  const [v] = await db.select().from(voiceSession).where(eq(voiceSession.sessionId, id)).limit(1);
  if (!v) return NextResponse.json({ error: "No voice call for this session." }, { status: 409 });

  if (v.source !== "webhook") await saveTranscript(id, v.id, parsed.data.segments, "client");
  return NextResponse.json({ ok: true });
}
