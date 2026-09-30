import { focusToDimension, type Dossier, type FocusArea, type Message, type Observation, type Report, type Signal } from "@/lib/schemas";

const LEADING = /(^so you\b|,\s*right\?|\bdidn't you\b|\bwouldn't you\b|\bisn't it\b|\bbecause the .* (was|were) (bad|broken)\b)/i;
export const RISK = /\b(married|husband|wife|kids|children|pregnan\w*|how old|your age|religio\w*|church|disabilit\w*|health condition|salary history|current salary)\b/i;
const OWNERSHIP = /(you (personally|specifically)|your (role|contribution)|what did you (decide|do)|which decisions?)/i;
const RESULT = /(result|outcome|impact|changed|metric|how (much|many)|number)/i;
const IMPRESSION = /(seems|seemed|nice|smart|great|good vibe|confident|likable|impressive)/i;

export const quote = (s: string) => (s.length > 140 ? s.slice(0, 137) + "..." : s);
const SEVERITY = { high: 0, medium: 1, low: 2 } as const;

export const DEFAULT_GUIDE = [
  "What specifically did you decide?",
  "What alternatives did you consider?",
  "Why did you choose that approach?",
  "What was your individual contribution?",
  "What changed as a result?",
  "What would you do differently?",
];

/** Deterministic risk checks. Always run, even when an LLM evaluator is active. */
export function riskObservations(messages: Message[]): Observation[] {
  return messages.filter((m) => m.speaker === "interviewer" && RISK.test(m.content)).map((m) => ({
    dimension: "Question risk" as const, severity: "high" as const, transcriptEvidence: `You: "${quote(m.content)}"`,
    explanation: "Potentially problematic: this may create employment-law or fairness concerns depending on jurisdiction and context.",
    recommendation: "Reframe around job-related requirements. This is educational guidance, not legal advice.",
  }));
}

export function prioritise(obs: Observation[], focus: FocusArea[]): Observation[] {
  const focused = new Set<string>(focus.map((f) => focusToDimension[f]));
  return [...obs].sort((a, b) =>
    Number(focused.has(b.dimension)) - Number(focused.has(a.dimension)) || SEVERITY[a.severity] - SEVERITY[b.severity]);
}

/** Heuristic evaluator. Fallback for the LLM evaluator and the whole evaluator when running offline. */
export function analyze(messages: Message[], notes: string, focus: FocusArea[] = [], dossier?: Dossier): Report {
  const obs: Observation[] = [];
  const strengths: string[] = [];
  let ownershipProbes = 0, resultProbes = 0;

  messages.forEach((m, i) => {
    if (m.speaker === "interviewer") {
      if (LEADING.test(m.content)) obs.push({
        dimension: "Question quality", severity: "medium", transcriptEvidence: `You: "${quote(m.content)}"`,
        explanation: "This question presupposes the answer, so the candidate can simply agree.",
        recommendation: "Ask open questions, e.g. \"What led you to make that change?\"",
      });
      if (OWNERSHIP.test(m.content)) ownershipProbes++;
      if (RESULT.test(m.content)) resultProbes++;
    } else {
      const next = messages.slice(i + 1).find((x) => x.speaker === "interviewer");
      if (/\bwe\b/i.test(m.content) && !/\bI\b/.test(m.content) && next && !OWNERSHIP.test(next.content)) obs.push({
        dimension: "Ownership probing", severity: "high", transcriptEvidence: `Candidate: "${quote(m.content)}" then You: "${quote(next.content)}"`,
        explanation: "You moved on after a team-level claim without establishing individual contribution.",
        recommendation: "Ask: \"What decision did you personally make?\"",
      });
      if (!/\d/.test(m.content) && m.content.length < 160 && next && next.content.length < 40) obs.push({
        dimension: "Evidence probing", severity: "medium", transcriptEvidence: `Candidate: "${quote(m.content)}" then You: "${quote(next.content)}"`,
        explanation: "A general claim with no example or outcome was accepted.",
        recommendation: "Ask for a concrete example, the action taken, and what changed as a result.",
      });
    }
  });
  obs.push(...riskObservations(messages));

  if (notes.trim()) {
    const hasEvidence = /\d/.test(notes);
    if (IMPRESSION.test(notes) && !hasEvidence) obs.push({
      dimension: "Note quality", severity: "medium", transcriptEvidence: `Notes: "${quote(notes.trim())}"`,
      explanation: "Notes record impressions rather than observable evidence.",
      recommendation: "Write what was said or done, e.g. \"Reduced API latency from 400ms to 180ms.\"",
    });
    else if (hasEvidence) strengths.push("Your notes captured concrete, checkable details.");
  }
  if (ownershipProbes > 0) strengths.push("You asked about personal decisions or contribution.");
  if (messages.filter((m) => m.speaker === "interviewer").length >= 5) strengths.push("You sustained a multi-turn line of questioning.");

  const signals: Signal[] = dossier ? [
    { label: "Personal contribution", caught: ownershipProbes > 0, detail: `What ${dossier.name} actually did: ${dossier.projects[0].personalRole}` },
    { label: "Measured results", caught: resultProbes > 0, detail: dossier.projects[0].outcomes.length ? `Available if asked: ${dossier.projects[0].outcomes[0]}` : "There were no measured results to find. Asking is how you learn that." },
    ...(dossier.planted ? [{ label: "Planted overstatement", caught: ownershipProbes > 1, detail: `They claimed "${dossier.planted.claim}" but ${dossier.planted.truth}` }] : []),
  ] : [];

  const ordered = prioritise(obs, focus);
  const high = ordered.filter((o) => o.severity === "high").length;
  const summary = ordered.length === 0
    ? "No major missed opportunities detected in this session. Try a vaguer or more polished candidate, or hard mode, to stress-test your probing."
    : `You had ${ordered.length} moment${ordered.length > 1 ? "s" : ""} to improve${high ? `, ${high} of high priority` : ""}. Each is tied to a specific point in the transcript below.`;

  return { summary, strengths, observations: ordered, signals, probingGuide: DEFAULT_GUIDE };
}
