import { eq } from "drizzle-orm";
import { report as reportSchema, type FocusArea, type Report } from "@/lib/schemas";
import { db } from "@/lib/db";
import { practiceSession, profile } from "@/lib/db/schema";
import { evaluate } from "@/lib/ai/evaluator";

/** Idempotent: evaluates a session once and stores the report. Caller has already authorised access. */
export async function finalizeSession(sessionId: string, notesOverride?: string): Promise<Report | { error: string; status: number }> {
  const [s] = await db.select().from(practiceSession).where(eq(practiceSession.id, sessionId)).limit(1);
  if (!s) return { error: "Session not found", status: 404 };
  if (s.report) return s.report;
  if (s.messages.length < 2) return { error: "Ask at least one question first.", status: 400 };

  const notes = notesOverride ?? s.notes;
  const [p] = await db.select().from(profile).where(eq(profile.userId, s.userId)).limit(1);
  // The chosen training objective is weighted first.
  const focus: FocusArea[] = [...new Set([...(s.objective ? [s.objective] : []), ...(p?.focusAreas ?? [])])];

  const result = reportSchema.parse(await evaluate({ role: s.role, messages: s.messages, notes, dossier: s.dossier, focus }));
  await db.update(practiceSession).set({ report: result, notes, status: "completed", endedAt: new Date() }).where(eq(practiceSession.id, sessionId));
  return result;
}
