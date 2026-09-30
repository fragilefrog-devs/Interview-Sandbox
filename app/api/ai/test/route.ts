import { NextResponse } from "next/server";
import { aiStatus, getProvider } from "@/lib/ai/provider";
import { apiUser } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 30;

const last = new Map<string, number>();

/** Settings -> AI service -> "Test connection". Sends one tiny prompt through the configured provider. */
export async function POST(req: Request) {
  const u = await apiUser(req);
  if (!u) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (Date.now() - (last.get(u.id) ?? 0) < 5_000) return NextResponse.json({ ok: false, message: "Wait a few seconds between tests." }, { status: 429 });
  last.set(u.id, Date.now());

  const status = aiStatus();
  const provider = getProvider();
  if (provider.kind === "mock") {
    return NextResponse.json({ ok: false, message: status.forcedMock ? "AI_PROVIDER is set to mock." : "No AI_API_KEY is set, so the built-in mock candidate is in use." });
  }
  const t0 = Date.now();
  try {
    const text = await provider.complete({ system: "Reply with the single word: ready", messages: [{ role: "user", content: "ping" }], maxTokens: 16, timeoutMs: 20_000 });
    return NextResponse.json({ ok: true, ms: Date.now() - t0, message: text ? "The endpoint answered." : "The endpoint answered with an empty reply." });
  } catch (e) {
    const code = (e as { status?: number }).status;
    const hint = code === 401 || code === 403 ? "Check AI_API_KEY." : code === 404 ? "Check AI_BASE_URL and AI_MODEL." : code === 429 ? "The router is rate limiting you." : "The endpoint did not respond in time or is unreachable.";
    return NextResponse.json({ ok: false, ms: Date.now() - t0, message: `${code ? `The endpoint returned ${code}. ` : ""}${hint}` });
  }
}
