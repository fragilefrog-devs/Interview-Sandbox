import { z } from "zod";

/* ---------- Practice setup ---------- */
export const archetypes = ["strong", "vague", "polished"] as const;
export type Archetype = (typeof archetypes)[number];

export const modes = ["text", "voice"] as const;
export type Mode = (typeof modes)[number];

export const difficulties = ["standard", "hard"] as const;
export type Difficulty = (typeof difficulties)[number];

/* ---------- Onboarding ---------- */
export const levels = ["new", "some", "experienced"] as const;
export type Level = (typeof levels)[number];

export const seniorities = ["junior", "mid", "senior", "staff"] as const;
export type Seniority = (typeof seniorities)[number];

export const focusAreas = ["ownership", "evidence", "questions", "fairness", "notes"] as const;
export type FocusArea = (typeof focusAreas)[number];

/** Which report dimension each onboarding focus area maps to. */
export const focusToDimension = {
  ownership: "Ownership probing",
  evidence: "Evidence probing",
  questions: "Question quality",
  fairness: "Question risk",
  notes: "Note quality",
} as const satisfies Record<FocusArea, string>;

export const profileInput = z.object({
  level: z.enum(levels),
  hiringFocus: z.string().trim().min(2).max(120),
  seniority: z.enum(seniorities),
  focusAreas: z.array(z.enum(focusAreas)).min(1).max(5),
  difficulty: z.enum(difficulties),
});
export type ProfileInput = z.infer<typeof profileInput>;

/* ---------- Transcript ---------- */
export const messageSchema = z.object({
  speaker: z.enum(["interviewer", "candidate"]),
  content: z.string().min(1).max(4000),
  /** Voice sessions only: offsets from call start, in ms. */
  startMs: z.number().int().min(0).optional(),
  endMs: z.number().int().min(0).optional(),
});
export type Message = z.infer<typeof messageSchema>;

export const createSessionInput = z.object({
  role: z.string().trim().min(2).max(120),
  archetype: z.enum(archetypes),
  difficulty: z.enum(difficulties),
  mode: z.enum(modes).default("text"),
  /** Training objective; reuses the onboarding focus areas. */
  objective: z.enum(focusAreas).optional(),
});
export const messageInput = z.object({ content: z.string().trim().min(1).max(2000) });
export const notesInput = z.object({ notes: z.string().max(10000) });

/* ---------- Candidate dossier (server-side ground truth) ---------- */
const s = (n: number) => z.string().min(1).max(n);
export const dossier = z.object({
  name: s(80),
  headline: s(160),
  yearsExperience: z.number().int().min(0).max(50),
  employers: z.array(z.object({ company: s(80), title: s(80), years: s(40) })).min(1).max(5),
  projects: z.array(z.object({
    title: s(120),
    situation: s(500),
    personalRole: s(500),   // what THIS candidate personally did
    teamRole: s(500),       // what the wider team did
    decisions: z.array(z.object({ decision: s(300), alternatives: s(300), reasoning: s(400) })).min(1).max(4),
    outcomes: z.array(s(200)).max(5), // measurable results the candidate can cite
  })).min(1).max(4),
  gaps: z.array(s(200)).max(5),
  /** Hard mode only: something the candidate overstates. `truth` is what really happened. */
  planted: z.object({ claim: s(300), truth: s(300) }).nullish(),
});
export type Dossier = z.infer<typeof dossier>;

/* ---------- Report ---------- */
export const observation = z.object({
  dimension: z.enum(["Ownership probing", "Question quality", "Question risk", "Note quality", "Evidence probing"]),
  severity: z.enum(["low", "medium", "high"]),
  transcriptEvidence: z.string(),
  explanation: z.string(),
  recommendation: z.string(),
});
export type Observation = z.infer<typeof observation>;

export const signal = z.object({ label: z.string(), caught: z.boolean(), detail: z.string() });
export type Signal = z.infer<typeof signal>;

export const report = z.object({
  summary: z.string(),
  strengths: z.array(z.string()),
  observations: z.array(observation),
  signals: z.array(signal).default([]),
  probingGuide: z.array(z.string()),
});
export type Report = z.infer<typeof report>;
