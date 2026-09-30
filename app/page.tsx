import Link from "next/link";
import { getSession } from "@/lib/session";

const steps = ["Role", "Candidate", "Interview", "Feedback", "Probing guide"];
const problems = [
  ["Rehearsed answers", "Polished candidates sound competent whether or not they did the work."],
  ["Weak probing", "Follow-ups drift to \"what happened next?\" instead of \"what did you decide?\""],
  ["Subjective notes", "\"Seems smart\" is an impression. \"Cut latency from 400ms to 180ms\" is evidence."],
];

export default async function Home() {
  const signedIn = !!(await getSession());
  const cta = signedIn ? "/app" : "/sign-up";
  return (
    <main>
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <span className="font-serif text-lg font-semibold">Interviewer Practice Lab</span>
        <nav className="flex gap-6 text-sm text-muted">
          <Link href="/#how" className="hover:text-ink">How it works</Link>
          {signedIn
            ? <Link href="/app" className="hover:text-ink">Open app</Link>
            : <><Link href="/sign-in" className="hover:text-ink">Sign in</Link><Link href="/sign-up" className="hover:text-ink">Create account</Link></>}
        </nav>
      </header>

      <section className="mx-auto max-w-5xl px-6 pb-20 pt-16">
        <h1 className="max-w-3xl font-serif text-5xl leading-[1.05] tracking-tight sm:text-6xl">
          Practice the interviewer, not the candidate.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted">
          Simulate realistic candidates, sharpen your follow-ups, and learn to extract better evidence from every interview.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href={cta} className="rounded bg-accent px-5 py-2.5 text-sm font-medium text-on-accent">{signedIn ? "Open app" : "Start practicing"}</Link>
          <Link href="/#how" className="rounded border border-line px-5 py-2.5 text-sm font-medium">See how it works</Link>
        </div>
      </section>

      <section id="how" className="border-y border-line bg-surface/60">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <ol className="flex flex-wrap items-center gap-x-3 gap-y-2 font-serif text-xl">
            {steps.map((s, i) => (
              <li key={s} className="flex items-center gap-3">
                {s}{i < steps.length - 1 && <span aria-hidden className="text-muted">→</span>}
              </li>
            ))}
          </ol>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {problems.map(([t, d]) => (
              <div key={t}><h2 className="font-semibold">{t}</h2><p className="mt-2 text-sm text-muted">{d}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-14">
        <h2 className="font-serif text-2xl">A candidate who behaves like a person</h2>
        <div className="mt-6 grid gap-8 text-sm sm:grid-cols-3">
          <div><h3 className="font-semibold">Remembers everything</h3><p className="mt-2 text-muted">Each candidate has a full background: employers, projects, who did what, and real numbers. Answers stay consistent all session.</p></div>
          <div><h3 className="font-semibold">Rewards good questions</h3><p className="mt-2 text-muted">Broad questions get broad answers. Precise questions about a personal decision earn the detail behind it.</p></div>
          <div><h3 className="font-semibold">Hides something on hard mode</h3><p className="mt-2 text-muted">Hard candidates deflect and overstate one claim. Your report shows what they held back and whether you found it.</p></div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-14 text-sm text-muted">
        <p className="max-w-2xl">
          Built for interviewer training, not candidate selection. The lab evaluates your questions and notes against synthetic candidates.
          It never scores, ranks, or recommends real candidates. Coaching is educational guidance, not legal advice.
        </p>
      </section>
    </main>
  );
}
