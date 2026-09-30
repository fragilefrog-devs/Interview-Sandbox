import { createHmac, timingSafeEqual } from "node:crypto";

const secret = () => process.env.BETTER_AUTH_SECRET ?? "";
const sign = (body: string) => createHmac("sha256", secret()).update(body).digest("base64url");

/** Short-lived capability embedded in the provider's LLM URL, so our endpoint can serve one session without cookies. */
export function signSessionToken(sessionId: string, ttlMs = 45 * 60 * 1000) {
  const body = `${sessionId}.${Date.now() + ttlMs}`;
  return `${body}.${sign(body)}`;
}
export function verifySessionToken(token: string): string | null {
  const i = token.lastIndexOf(".");
  if (i < 0 || !secret()) return null;
  const body = token.slice(0, i), sig = token.slice(i + 1);
  const a = Buffer.from(sig), b = Buffer.from(sign(body));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const [sessionId, exp] = [body.slice(0, body.lastIndexOf(".")), Number(body.slice(body.lastIndexOf(".") + 1))];
  return exp > Date.now() ? sessionId : null;
}
