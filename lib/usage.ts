import { and, count, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { practiceSession } from "@/lib/db/schema";
import { maxSessionsPerDay } from "@/lib/limits";

/** Sessions started in the rolling last 24 hours. */
export async function sessionsInLastDay(userId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [{ n }] = await db.select({ n: count() }).from(practiceSession)
    .where(and(eq(practiceSession.userId, userId), gte(practiceSession.createdAt, since)));
  return n;
}

export async function usageFor(userId: string) {
  return { used: await sessionsInLastDay(userId), limit: maxSessionsPerDay() };
}
