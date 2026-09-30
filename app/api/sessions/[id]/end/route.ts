import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { notesInput } from "@/lib/schemas";
import { db } from "@/lib/db";
import { practiceSession } from "@/lib/db/schema";
import { apiUser } from "@/lib/session";
import { finalizeSession } from "@/lib/finalize";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser(req);
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = notesInput.partial().safeParse(await req.json().catch(() => ({})));
  const { id } = await params;

  const [s] = await db.select({ id: practiceSession.id }).from(practiceSession)
    .where(and(eq(practiceSession.id, id), eq(practiceSession.userId, user.id))).limit(1);
  if (!s) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const result = await finalizeSession(id, body.success ? body.data.notes : undefined);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}
