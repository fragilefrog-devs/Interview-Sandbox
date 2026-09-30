import { NextResponse } from "next/server";
import { and, count, eq, gte } from "drizzle-orm";
import { createSessionInput } from "@/lib/schemas";
import { db } from "@/lib/db";
import { practiceSession } from "@/lib/db/schema";
import { apiUser } from "@/lib/session";
import { generateDossier } from "@/lib/ai/dossier";
import { CANDIDATE_PROMPT_VERSION } from "@/lib/ai/prompts";
import { maxSessionsPerDay } from "@/lib/limits";
import { getVoiceProvider } from "@/lib/voice/provider";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const user = await apiUser(req);
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const parsed = createSessionInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a role and pick a candidate." }, { status: 400 });

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [{ n }] = await db.select({ n: count() }).from(practiceSession)
    .where(and(eq(practiceSession.userId, user.id), gte(practiceSession.createdAt, since)));
  if (n >= maxSessionsPerDay()) {
    return NextResponse.json({ error: "Daily practice limit reached. Come back tomorrow." }, { status: 429 });
  }

  const { role, archetype, difficulty, mode, objective } = parsed.data;
  if (mode === "voice" && !getVoiceProvider().configured) {
    return NextResponse.json({ error: "Voice practice is not configured on this deployment. Use text mode." }, { status: 400 });
  }
  const dossier = await generateDossier(role, archetype, difficulty);
  const id = crypto.randomUUID();
  await db.insert(practiceSession).values({
    id, userId: user.id, role, archetype, difficulty, mode, objective, dossier, promptVersion: CANDIDATE_PROMPT_VERSION,
  });
  return NextResponse.json({ id });
}

/** Delete every session the user owns (Settings -> Data). */
export async function DELETE(req: Request) {
  const user = await apiUser(req);
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const res = await db.delete(practiceSession).where(eq(practiceSession.userId, user.id));
  return NextResponse.json({ deleted: res.rowsAffected });
}
