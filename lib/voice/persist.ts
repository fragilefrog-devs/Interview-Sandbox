import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { practiceSession, transcriptSegment, voiceSession } from "@/lib/db/schema";
import { computeMetrics } from "./metrics";
import type { VoiceSegment } from "./types";

/** Store the canonical transcript in OUR database, then mirror it into the session's messages while it is still open. */
export async function saveTranscript(sessionId: string, voiceId: string, segs: VoiceSegment[], source: "webhook" | "client", extra: { reason?: string; callId?: string } = {}) {
  const [s] = await db.select({ report: practiceSession.report }).from(practiceSession).where(eq(practiceSession.id, sessionId)).limit(1);
  if (!s) return;
  const ordered = [...segs].sort((a, b) => a.startMs - b.startMs).slice(0, 400);

  await db.delete(transcriptSegment).where(eq(transcriptSegment.sessionId, sessionId));
  if (ordered.length) {
    await db.insert(transcriptSegment).values(ordered.map((g, i) => ({ id: crypto.randomUUID(), sessionId, sequence: i, ...g })));
  }
  await db.update(voiceSession).set({
    status: "ended", source, endedAt: new Date(), endedReason: extra.reason, providerCallId: extra.callId,
    metrics: ordered.length ? computeMetrics(ordered) : null,
  }).where(eq(voiceSession.id, voiceId));

  // A finished report is never rewritten; the segments above remain the record.
  if (!s.report && ordered.length) {
    await db.update(practiceSession).set({ messages: ordered.map(({ speaker, content, startMs, endMs }) => ({ speaker, content, startMs, endMs })) })
      .where(eq(practiceSession.id, sessionId));
  }
}
