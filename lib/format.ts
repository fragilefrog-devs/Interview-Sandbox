import type { Archetype, Difficulty } from "@/lib/schemas";

/** UTC on purpose: server and browser must render identical text or hydration breaks. */
export function fmtDate(d: Date | string, withYear = false) {
  return new Date(d).toLocaleDateString("en", { month: "short", day: "numeric", ...(withYear ? { year: "numeric" } : {}), timeZone: "UTC" });
}

export function fmtDuration(ms: number | null) {
  if (ms == null || ms < 0) return "";
  const m = Math.round(ms / 60000);
  if (m < 1) return "under a minute";
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";

export const archetypeLabel: Record<Archetype, string> = { strong: "Strong", vague: "Vague", polished: "Polished" };
export const difficultyLabel: Record<Difficulty, string> = { standard: "Standard", hard: "Hard" };
