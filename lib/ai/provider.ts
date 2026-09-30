export type ChatMessage = { role: "user" | "assistant"; content: string };
export type CompletionInput = { system: string; messages: ChatMessage[]; maxTokens?: number; timeoutMs?: number };

export interface AIProvider {
  kind: "mock" | "openai";
  /** Human-readable provider name, shown in Settings. */
  label: string;
  model: string;
  complete(input: CompletionInput): Promise<string>;
  stream(input: CompletionInput): AsyncGenerator<string>;
}

/* ---------- Config (Nine Router, OpenAI-compatible) ---------- */
const DEFAULT_BASE_URL = "https://9router-production-a99a.up.railway.app/v1";
const DEFAULT_MODEL = "openrouter/openrouter/free";

const config = () => ({
  baseUrl: (process.env.AI_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, ""),
  apiKey: process.env.AI_API_KEY ?? "",
  model: process.env.AI_MODEL || DEFAULT_MODEL,
});

export class UpstreamError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function upstreamError(res: Response) {
  const body = await res.text().catch(() => "");
  console.error(`[ai] upstream ${res.status}: ${body.slice(0, 300)}`); // server log only, never sent to the browser
  return new UpstreamError(res.status, `AI endpoint returned ${res.status}`);
}

/* ---------- <think> stripping (some routed models emit reasoning inline) ---------- */
export const stripThink = (t: string) => t.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/<think>[\s\S]*$/i, "");

async function* stripThinkStream(src: AsyncGenerator<string>): AsyncGenerator<string> {
  const OPEN = "<think>", CLOSE = "</think>";
  let buf = "", inThink = false;
  const partial = (s: string, tag: string) => {
    for (let n = Math.min(tag.length - 1, s.length); n > 0; n--) if (s.endsWith(tag.slice(0, n))) return n;
    return 0;
  };
  for await (const chunk of src) {
    buf += chunk;
    for (;;) {
      if (!inThink) {
        const i = buf.toLowerCase().indexOf(OPEN);
        if (i !== -1) { if (i > 0) yield buf.slice(0, i); buf = buf.slice(i + OPEN.length); inThink = true; continue; }
        const keep = partial(buf.toLowerCase(), OPEN);
        const out = buf.slice(0, buf.length - keep);
        if (out) yield out;
        buf = buf.slice(buf.length - keep);
        break;
      }
      const j = buf.toLowerCase().indexOf(CLOSE);
      if (j !== -1) { buf = buf.slice(j + CLOSE.length); inThink = false; continue; }
      buf = buf.slice(buf.length - partial(buf.toLowerCase(), CLOSE));
      break;
    }
  }
  if (!inThink && buf) yield buf;
}

const textOf = (content: unknown): string =>
  typeof content === "string" ? content
    : Array.isArray(content) ? content.map((p) => (typeof p === "string" ? p : p?.text ?? "")).join("")
    : "";

/* ---------- OpenAI-compatible provider ---------- */
class OpenAICompatibleProvider implements AIProvider {
  kind = "openai" as const;
  label = "Nine Router";
  get model() { return config().model; }

  private request(input: CompletionInput, stream: boolean) {
    const c = config();
    return fetch(`${c.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${c.apiKey}`,
        accept: stream ? "text/event-stream" : "application/json",
      },
      body: JSON.stringify({
        model: c.model,
        max_tokens: input.maxTokens ?? 400,
        stream,
        messages: [{ role: "system", content: input.system }, ...input.messages],
      }),
      signal: AbortSignal.timeout(input.timeoutMs ?? 50_000),
    });
  }

  async complete(input: CompletionInput) {
    const res = await this.request(input, false);
    if (!res.ok) throw await upstreamError(res);
    const data = await res.json();
    return stripThink(textOf(data?.choices?.[0]?.message?.content)).trim();
  }

  private async *sse(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
    const reader = body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) !== -1) {
        const line = buf.slice(0, nl).replace(/\r$/, "").trim();
        buf = buf.slice(nl + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (payload === "[DONE]") return;
        let json: { choices?: { delta?: { content?: unknown } }[]; error?: { message?: string } };
        try { json = JSON.parse(payload); } catch { continue; }
        if (json.error) throw new Error(json.error.message ?? "AI stream error");
        const delta = textOf(json.choices?.[0]?.delta?.content);
        if (delta) yield delta;
      }
    }
  }

  async *stream(input: CompletionInput) {
    const res = await this.request(input, true);
    if (!res.ok || !res.body) throw await upstreamError(res);
    // Some routers ignore stream:true and answer with plain JSON. Handle both.
    if (!(res.headers.get("content-type") ?? "").includes("text/event-stream")) {
      const data = await res.json();
      const text = stripThink(textOf(data?.choices?.[0]?.message?.content));
      if (text) yield text;
      return;
    }
    yield* stripThinkStream(this.sse(res.body));
  }
}

/** Offline provider. Candidate and evaluator branch on `kind` and use their own mock logic. */
class MockProvider implements AIProvider {
  kind = "mock" as const;
  label = "Built-in mock";
  model = "mock";
  async complete(): Promise<string> { throw new Error("MockProvider has no raw completion"); }
  // eslint-disable-next-line require-yield
  async *stream(): AsyncGenerator<string> { throw new Error("MockProvider has no raw stream"); }
}

/**
 * AI_PROVIDER=mock forces the offline candidate. Otherwise the live provider is used
 * whenever AI_API_KEY is set.
 */
export function getProvider(): AIProvider {
  const forcedMock = (process.env.AI_PROVIDER ?? "").toLowerCase() === "mock";
  if (!forcedMock && process.env.AI_API_KEY) return new OpenAICompatibleProvider();
  return new MockProvider();
}

/** Safe-to-display status (never includes the key). */
export function aiStatus() {
  const p = getProvider();
  const c = config();
  let host = "";
  try { host = new URL(c.baseUrl).host; } catch { /* ignore */ }
  return {
    live: p.kind === "openai",
    label: p.label,
    model: p.kind === "openai" ? c.model : "mock",
    host: p.kind === "openai" ? host : "",
    keyConfigured: !!process.env.AI_API_KEY,
    forcedMock: (process.env.AI_PROVIDER ?? "").toLowerCase() === "mock",
  };
}

/** Pull the first JSON object out of a model reply (tolerates code fences and preamble). */
export function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("No JSON in reply");
  return JSON.parse(text.slice(start, end + 1));
}
