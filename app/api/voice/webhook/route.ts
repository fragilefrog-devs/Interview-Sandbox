import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { voiceSession } from "@/lib/db/schema";
import { getVoiceProvider } from "@/lib/voice/provider";
import { saveTranscript } from "@/lib/voice/persist";
import { finalizeSession } from "@/lib/finalize";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Provider -> us. Authenticated by shared secret, then mapped to a session by the provider's assistant id. */
export async function POST(req: Request) {
  const voice = getVoiceProvider();
  if (!voice.verifyWebhook(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const event = voice.parseWebhook(await req.json().catch(() => null));
  if (!event) return NextResponse.json({ ok: true }); // informational message we do not use

  const [v] = await db.select().from(voiceSession).where(eq(voiceSession.providerAssistantId, event.assistantId)).limit(1);
  if (!v) return NextResponse.json({ ok: true });

  if (event.type === "started") {
    await db.update(voiceSession).set({ status: "live", providerCallId: event.callId }).where(eq(voiceSession.id, v.id));
    return NextResponse.json({ ok: true });
  }

  await saveTranscript(v.sessionId, v.id, event.segments, "webhook", { reason: event.reason, callId: event.callId });
  // Report even if the user closed the tab. Best effort; the End button also triggers it.
  try { await finalizeSession(v.sessionId); } catch { /* the user can retry from the UI */ }
  await voice.endSession(v.providerAssistantId);
  return NextResponse.json({ ok: true });
}
