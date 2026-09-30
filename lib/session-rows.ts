import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { practiceSession } from "@/lib/db/schema";
import type { SessionRow } from "@/lib/stats";

/** Lightweight rows for lists and stats. Reads the candidate name and turn count without pulling the transcript or dossier. */
export async function loadSessionRows(userId: string, limit = 200): Promise<SessionRow[]> {
  return db.select({
    id: practiceSession.id, role: practiceSession.role, archetype: practiceSession.archetype,
    difficulty: practiceSession.difficulty, status: practiceSession.status,
    createdAt: practiceSession.createdAt, endedAt: practiceSession.endedAt, report: practiceSession.report,
    candidate: sql<string | null>`json_extract(${practiceSession.dossier}, '$.name')`,
    turns: sql<number>`json_array_length(${practiceSession.messages})`,
  }).from(practiceSession).where(eq(practiceSession.userId, userId)).orderBy(desc(practiceSession.createdAt)).limit(limit);
}
