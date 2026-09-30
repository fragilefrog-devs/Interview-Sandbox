import type { Difficulty, FocusArea, Level, Seniority } from "@/lib/schemas";

export type ProfileDefaults = { level: Level; hiringFocus: string; seniority: Seniority; focusAreas: FocusArea[]; difficulty: Difficulty };

export const levelOptions: [Level, string][] = [
  ["new", "I am new to interviewing"],
  ["some", "I have run a handful of interviews"],
  ["experienced", "I interview regularly"],
];
export const seniorityOptions: [Seniority, string][] = [["junior", "Junior"], ["mid", "Mid-level"], ["senior", "Senior"], ["staff", "Staff and above"]];
export const focusOptions: [FocusArea, string, string][] = [
  ["ownership", "Ownership", "Finding out what the candidate personally did, not what the team did."],
  ["evidence", "Evidence", "Getting examples and results instead of general claims."],
  ["questions", "Question quality", "Asking open, non-leading questions."],
  ["fairness", "Fair, job-related questions", "Avoiding questions that create legal or fairness risk."],
  ["notes", "Note-taking", "Writing down what was said, not impressions."],
];
export const difficultyOptions: [Difficulty, string, string][] = [
  ["standard", "Standard", "Candidates reward good probing with real detail."],
  ["hard", "Hard", "Candidates deflect, embellish, and hide an inconsistency for you to catch."],
];
