import type { Archetype, Difficulty, Report } from "@/lib/schemas";

export type SessionRow = {
  id: string; role: string; candidate: string | null; archetype: Archetype; difficulty: Difficulty;
  status: "active" | "completed"; createdAt: Date; endedAt: Date | null; report: Report | null; turns: number;
};

export const DIMENSIONS = ["Ownership probing", "Evidence probing", "Question quality", "Question risk", "Note quality"] as const;
type Dim = (typeof DIMENSIONS)[number];

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function summarize(rows: SessionRow[]) {
  const done = rows.filter((r) => r.status === "completed" && r.report)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  let signals = 0, caught = 0, high = 0, misses = 0, practiceMs = 0;
  const byDim = Object.fromEntries(DIMENSIONS.map((d) => [d, { count: 0, high: 0 }])) as Record<Dim, { count: number; high: number }>;

  const perSession = done.map((r) => {
    const rep = r.report!;
    const sig = rep.signals ?? []; // reports saved before signals existed
    const s = sig.length, c = sig.filter((x) => x.caught).length;
    const h = rep.observations.filter((o) => o.severity === "high").length;
    signals += s; caught += c; high += h; misses += rep.observations.length;
    for (const o of rep.observations) {
      const d = byDim[o.dimension];
      if (d) { d.count++; if (o.severity === "high") d.high++; }
    }
    // Cap at 90 min so a session left open overnight does not inflate the total.
    if (r.endedAt) practiceMs += Math.min(90 * 60_000, Math.max(0, r.endedAt.getTime() - r.createdAt.getTime()));
    return { id: r.id, role: r.role, date: r.createdAt, misses: rep.observations.length, high: h, signals: s, caught: c };
  });

  return {
    completed: done.length,
    active: rows.filter((r) => r.status === "active").length,
    signals, caught, signalRate: signals ? caught / signals : null,
    high, misses, practiceMs, perSession, byDim,
    trend: { recent: avg(perSession.slice(-3).map((s) => s.misses)), previous: avg(perSession.slice(-6, -3).map((s) => s.misses)) },
  };
}
