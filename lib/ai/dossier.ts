import { dossier as dossierSchema, type Archetype, type Difficulty, type Dossier } from "@/lib/schemas";
import { extractJson, getProvider } from "./provider";
import { dossierSystem, dossierUser } from "./prompts";

const NAMES = ["Priya Nair", "Marcus Bell", "Ana Ferreira", "Tomasz Kowalski", "Aisha Rahman", "Daniel Okafor", "Mei Lin", "Sofia Marino"];

/** Deterministic-shape fallback used offline and whenever the model output fails validation. */
export function mockDossier(role: string, archetype: Archetype, difficulty: Difficulty): Dossier {
  const name = NAMES[Math.floor(Math.random() * NAMES.length)];
  const strong = archetype === "strong";
  const vague = archetype === "vague";
  return {
    name,
    headline: `Candidate for ${role}, ${strong ? 8 : 6} years of experience`,
    yearsExperience: strong ? 8 : 6,
    employers: [
      { company: "Northfield Systems", title: strong ? "Lead" : "Senior", years: "2021-present" },
      { company: "Brightpath Labs", title: "Mid-level", years: "2018-2021" },
    ],
    projects: [{
      title: "Platform relaunch",
      situation: "The main product was slowing down as usage grew, and releases were breaking twice a month.",
      personalRole: vague
        ? "Wrote a few of the smaller tickets and joined reviews."
        : "Scoped the work, made the call to split the release pipeline, and built the rollback tooling.",
      teamRole: "A team of six shipped the migration, and a product manager owned the timeline.",
      decisions: [{
        decision: "Split the release pipeline into independent stages",
        alternatives: "Sharding the existing service, or buying a hosted CI product",
        reasoning: "Sharding capped growth at roughly 3x and the hosted product could not run our compliance checks.",
      }],
      outcomes: vague ? [] : ["Failed deploys dropped from about 12% to 2% in a quarter", "p95 latency fell from 400ms to 180ms"],
    }],
    gaps: ["Limited experience mentoring others", "Has not owned a budget"],
    planted: difficulty === "hard"
      ? { claim: "I led the migration end to end.", truth: "A staff engineer led it; the candidate owned one of four workstreams." }
      : null,
  };
}

export async function generateDossier(role: string, archetype: Archetype, difficulty: Difficulty): Promise<Dossier> {
  const provider = getProvider();
  if (provider.kind === "mock") return mockDossier(role, archetype, difficulty);

  // Free routed models can be slow: cap each attempt and skip the retry if the first one already burned the budget.
  const started = Date.now();
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0 && Date.now() - started > 25_000) break;
    try {
      const raw = await provider.complete({
        system: dossierSystem,
        messages: [{ role: "user", content: dossierUser(role, archetype, difficulty) }],
        maxTokens: 1800,
        timeoutMs: 40_000,
      });
      const parsed = dossierSchema.safeParse(extractJson(raw));
      if (parsed.success) return parsed.data;
    } catch { /* retry, then fall back */ }
  }
  return mockDossier(role, archetype, difficulty);
}
