import { report as reportSchema, type Dossier, type FocusArea, type Message, type Observation, type Report } from "@/lib/schemas";
import { analyze, prioritise, riskObservations } from "@/lib/analysis";
import { extractJson, getProvider } from "./provider";
import { evaluatorSystem } from "./prompts";

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

type Corpus = { You: string; Candidate: string; Notes: string };

/** Every `Speaker: "quote"` in the evidence must exist verbatim in that speaker's own words. */
function grounded(evidence: string, corpus: Corpus) {
  const found = [...evidence.matchAll(/\b(You|Candidate|Notes):\s*"([^"]{6,})"/g)];
  return found.length > 0 && found.every(([, who, q]) => corpus[who as keyof Corpus].includes(norm(q.replace(/\.\.\.$/, ""))));
}

export async function evaluate(input: {
  role: string; messages: Message[]; notes: string; dossier: Dossier; focus: FocusArea[];
}): Promise<Report> {
  const { messages, notes, dossier, focus } = input;
  const fallback = analyze(messages, notes, focus, dossier);
  const provider = getProvider();
  if (provider.kind === "mock") return fallback;

  const transcript = messages.map((m) => `${m.speaker === "interviewer" ? "You" : "Candidate"}: ${m.content}`).join("\n");
  const by = (sp: Message["speaker"]) => norm(messages.filter((m) => m.speaker === sp).map((m) => m.content).join("\n"));
  const corpus: Corpus = { You: by("interviewer"), Candidate: by("candidate"), Notes: norm(notes) };

  try {
    const raw = await provider.complete({
      system: evaluatorSystem,
      maxTokens: 2500,
      messages: [{
        role: "user",
        content: [
          `ROLE PRACTISED: ${input.role}`,
          `INTERVIEWER FOCUS AREAS: ${focus.join(", ") || "none stated"}`,
          `GROUND TRUTH (hidden from the interviewer): ${JSON.stringify(dossier)}`,
          `<transcript>\n${transcript}\n</transcript>`,
          `<notes>\n${notes || "(none)"}\n</notes>`,
        ].join("\n\n"),
      }],
    });
    const parsed = reportSchema.parse(extractJson(raw));

    // Drop anything not anchored in the real transcript, then add the deterministic risk checks.
    const kept = parsed.observations.filter((o) => grounded(o.transcriptEvidence, corpus)).slice(0, 8);
    const risks = riskObservations(messages).filter((r) => !kept.some((k) => k.dimension === "Question risk" && k.transcriptEvidence.includes(r.transcriptEvidence.slice(6, 40))));
    const observations: Observation[] = prioritise([...kept, ...risks], focus);

    return {
      ...parsed,
      observations,
      signals: parsed.signals.slice(0, 5),
      probingGuide: parsed.probingGuide.length ? parsed.probingGuide.slice(0, 6) : fallback.probingGuide,
      summary: parsed.summary || fallback.summary,
    };
  } catch {
    return fallback;
  }
}

