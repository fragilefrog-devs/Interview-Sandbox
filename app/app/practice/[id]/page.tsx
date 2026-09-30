import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { InterviewRoom } from "@/components/interview-room";
import { ReportView } from "@/components/report-view";
import { db } from "@/lib/db";
import { practiceSession, voiceSession } from "@/lib/db/schema";
import { VoiceRoom } from "@/components/voice-room";
import { VoiceMetricsCard } from "@/components/voice-metrics";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Interview" };

export default async function Practice({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const [s] = await db.select().from(practiceSession)
    .where(and(eq(practiceSession.id, id), eq(practiceSession.userId, user.id))).limit(1);
  if (!s) notFound();

  const turns = s.messages.filter((m) => m.speaker === "interviewer").length;

  const [voice] = s.mode === "voice"
    ? await db.select().from(voiceSession).where(eq(voiceSession.sessionId, s.id)).limit(1) : [];

  if (s.report) {
    return (
      <>
      <ReportView report={s.report} candidateName={s.dossier.name} transcript={s.messages} notes={s.notes}
        meta={{ role: s.role, archetype: s.archetype, difficulty: s.difficulty, turns, durationMs: s.endedAt ? s.endedAt.getTime() - s.createdAt.getTime() : null }} />
      {voice?.metrics && <VoiceMetricsCard metrics={voice.metrics} />}
      </>
    );
  }

  if (s.mode === "voice") {
    return <VoiceRoom sessionId={s.id} role={s.role} archetype={s.archetype} difficulty={s.difficulty} candidate={{ name: s.dossier.name, headline: s.dossier.headline }} initialNotes={s.notes} />;
  }

  // Only the public face of the dossier crosses to the browser. The rest is hidden ground truth.
  return (
    <InterviewRoom
      sessionId={s.id} role={s.role} archetype={s.archetype} difficulty={s.difficulty} startedAt={s.createdAt.toISOString()}
      candidate={{ name: s.dossier.name, headline: s.dossier.headline }}
      initialMessages={s.messages} initialNotes={s.notes}
    />
  );
}
