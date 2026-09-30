import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { practiceSession, voiceSession } from "@/lib/db/schema";
import { apiUser } from "@/lib/session";
import { getVoiceProvider } from "@/lib/voice/provider";
import { signSessionToken } from "@/lib/voice/token";
import { publicBaseUrl } from "@/lib/voice/base-url";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Create the provider-side candidate for this session. One call per session. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser(req);
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await params;
  const voice = getVoiceProvider();
  if (!voice.configured) return NextResponse.json({ error: "Voice is not configured." }, { status: 400 });

  const [s] = await db.select().from(practiceSession)
    .where(and(eq(practiceSession.id, id), eq(practiceSession.userId, user.id))).limit(1);
  if (!s) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (s.mode !== "voice" || s.status !== "active") return NextResponse.json({ error: "This is not an active voice session." }, { status: 409 });

  const [existing] = await db.select().from(voiceSession).where(eq(voiceSession.sessionId, id)).limit(1);
  if (existing) return NextResponse.json({ error: "This call has already been started. Start a new session to try again." }, { status: 409 });

  const base = publicBaseUrl();
  try {
    const init = await voice.createSession({
      sessionId: id,
      llmUrl: `${base}/api/voice/llm/${signSessionToken(id)}`,
      webhookUrl: `${base}/api/voice/webhook`,
      webhookSecret: process.env.VAPI_WEBHOOK_SECRET!,
    });
    await db.insert(voiceSession).values({ id: crypto.randomUUID(), sessionId: id, provider: voice.name, providerAssistantId: init.assistantId });
    return NextResponse.json(init);
  } catch {
    return NextResponse.json({ error: "Could not start the voice call. Try again in a moment." }, { status: 502 });
  }
}
