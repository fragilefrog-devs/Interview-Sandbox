import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { notesInput } from "@/lib/schemas";
import { db } from "@/lib/db";
import { practiceSession } from "@/lib/db/schema";
import { apiUser } from "@/lib/session";

/** Autosave notes. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser(req);
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const parsed = notesInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { id } = await params;
  const res = await db.update(practiceSession).set({ notes: parsed.data.notes })
    .where(and(eq(practiceSession.id, id), eq(practiceSession.userId, user.id), eq(practiceSession.status, "active")));
  return NextResponse.json({ ok: res.rowsAffected > 0 });
}

/** Delete one session and its report. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser(req);
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await params;
  const res = await db.delete(practiceSession).where(and(eq(practiceSession.id, id), eq(practiceSession.userId, user.id)));
  return NextResponse.json({ ok: res.rowsAffected > 0 });
}
