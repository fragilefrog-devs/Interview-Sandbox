import type { Archetype, Difficulty, Dossier, Message } from "@/lib/schemas";
import { getProvider } from "./provider";
import { candidateSystem } from "./prompts";

const OWNERSHIP = /(you (personally|specifically)|your (role|contribution|part)|what did you (decide|do)|which decisions?|your decision)/i;
const ALT = /(alternative|trade-?off|why did you|instead|options? did you)/i;
const RESULT = /(result|outcome|impact|changed|metric|how (much|many)|number)/i;

const VOICE_ADDENDUM = "\n\nThis is a spoken conversation. Answer in 1-3 short sentences of natural speech. No lists, markdown, or stage directions. It is fine to pause with a brief filler (\"hmm, let me think\") before a hard question.";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** How many well-aimed probes the interviewer has made so far (the disclosure ladder rung). */
function depth(history: Message[]) {
  return history.filter((m) => m.speaker === "interviewer" && (OWNERSHIP.test(m.content) || ALT.test(m.content) || RESULT.test(m.content))).length;
}

function mockReply(d: Dossier, archetype: Archetype, difficulty: Difficulty, history: Message[]): string {
  const last = history[history.length - 1]?.content ?? "";
  const turn = history.filter((m) => m.speaker === "interviewer").length;
  const p = d.projects[0];
  const dec = p.decisions[0];
  const rung = depth(history) - (difficulty === "hard" ? 1 : 0);
  const own = OWNERSHIP.test(last), alt = ALT.test(last), res = RESULT.test(last);

  if (/are you (an )?(ai|bot|human)/i.test(last)) return "I'm a practice candidate simulation, so let's carry on with the interview.";
  if (/\b(married|husband|wife|kids|children|pregnan\w*|how old|your age|religio\w*)\b/i.test(last))
    return "I'd rather keep this about the role and what I can bring to it. What else would you like to know about my work?";

  if (archetype === "strong") {
    if (alt) return `I weighed ${dec.alternatives.toLowerCase()}. ${dec.reasoning}`;
    if (own || res) return `${p.personalRole} ${p.outcomes[0] ?? ""}`.trim();
    return `At ${d.employers[0].company} I worked on the ${p.title.toLowerCase()}. ${p.situation} ${p.personalRole}`;
  }
  if (archetype === "polished") {
    if ((own || alt || res) && rung >= 2) return `${p.personalRole} ${p.outcomes[0] ?? ""}`.trim();
    if (own || alt || res) return "Great question. Ultimately I see my role as enabling the team to make the right decisions, so I focused on alignment, clarity, and removing blockers throughout.";
    return "I'm passionate about building resilient systems that create real business value. I believe strong engineering is about people, process, and a relentless focus on outcomes.";
  }
  if ((own || alt) && rung >= 3) return `Honestly, my part was smaller. ${p.personalRole}`;
  if (own) return "It was a team effort really. I helped where I could, and we all contributed to getting it done.";
  return ["We worked on improving the platform and it went pretty well overall.", "We made a lot of improvements and the team was happy with the results.", "There were some challenges but we got through them together."][turn % 3];
}

/** Streams the candidate's next reply. Server owns `history`; the client never supplies it. */
export async function* streamCandidateReply(
  s: { role: string; archetype: Archetype; difficulty: Difficulty; dossier: Dossier },
  history: Message[],
  opts: { voice?: boolean } = {},
): AsyncGenerator<string> {
  const provider = getProvider();
  if (provider.kind === "mock") {
    for (const w of mockReply(s.dossier, s.archetype, s.difficulty, history).split(/(\s+)/)) { yield w; await sleep(18); }
    return;
  }
  yield* provider.stream({
    system: candidateSystem(s.role, s.archetype, s.difficulty, s.dossier) + (opts.voice ? VOICE_ADDENDUM : ""),
    // The candidate is the "assistant"; the interviewer is the "user".
    messages: history.map((m) => ({ role: m.speaker === "interviewer" ? "user" : "assistant", content: m.content })),
    maxTokens: 400,
  });
}
