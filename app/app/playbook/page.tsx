import { Page } from "@/components/page";

export const metadata = { title: "Playbook" };

const toc = [["ladder", "How candidates decide what to tell you"], ["probes", "Probes worth memorising"], ["fair", "Fair, job-related questions"], ["notes", "Notes that hold up"], ["types", "Candidate types"]];

const probes: [string, string[]][] = [
  ["Ownership", ["What did you personally decide?", "Which part was yours, and which was the team’s?", "Who else was involved, and what did they do?"]],
  ["Alternatives", ["What else did you consider?", "Why did you rule that out?", "What would have changed your mind?"]],
  ["Evidence", ["What was the number before and after?", "How did you know it worked?", "Who could confirm that?"]],
  ["Hindsight", ["What would you do differently?", "What did you get wrong?", "What did you learn that you still use?"]],
  ["Checking a claim", ["Walk me through your first week on it.", "What did you do on the day it went wrong?", "Who would say you led it, and what would they say?"]],
];

const fair: [string, string, string][] = [
  ["Family plans", "Are you planning to have children?", "This role is on call one week in six. Can you meet that?"],
  ["Age", "When did you graduate?", "What relevant training or experience do you have for this role?"],
  ["Health", "Do you have any health conditions?", "Can you perform the essential duties of this role, with or without accommodation?"],
  ["Religion", "Do you go to church?", "This role includes some weekend work. Is your availability compatible?"],
  ["Pay history", "What are you paid now?", "What salary range are you looking for in this role?"],
];

const notes: [string, string][] = [
  ["Seems smart", "Explained why a queue beat polling here, and cited a 3x throughput gain."],
  ["Good leader", "Says he ran weekly planning for four engineers. Could not name a decision he overruled."],
  ["Vague on results", "Gave no before or after numbers for the migration when asked twice."],
];

const types: [string, string, string][] = [
  ["Strong", "Volunteers decisions, trade-offs and numbers.", "Practise going deeper: ask what they would change and what the numbers hide."],
  ["Vague", "Says “we”, claims broad results, gives small pieces only when pressed precisely.", "Practise separating their part from the team’s, then asking for one concrete example."],
  ["Polished", "Structured and confident, but light on specifics until a direct question about a decision they made.", "Practise resisting a smooth answer. Ask what they decided, not what the team valued."],
  ["Hard mode", "Deflects once before answering, embellishes their own role, and overstates one claim.", "Practise checking claims. The report shows what really happened and whether you found it."],
];

const h2 = "scroll-mt-20 font-serif text-2xl";

export default function Playbook() {
  return (
    <Page title="Playbook" description="Short reference for the skills the reports measure." width="max-w-3xl">
      <nav aria-label="On this page" className="rounded-lg border border-line bg-surface p-4 text-sm">
        <p className="font-medium">On this page</p>
        <ul className="mt-2 space-y-1">{toc.map(([id, t]) => <li key={id}><a href={`#${id}`} className="text-accent hover:underline">{t}</a></li>)}</ul>
      </nav>

      <section id="ladder" className="mt-12"><h2 className={h2}>How candidates decide what to tell you</h2>
        <p className="mt-2 text-muted">Practice candidates share more as your questions get sharper. Detail is earned in three steps.</p>
        <ol className="mt-4 space-y-3 text-sm">
          <li className="rounded-lg border border-line bg-surface p-4"><p className="font-medium">A broad question gets a broad answer</p><p className="mt-1 text-muted">“Tell me about your last project.” Expect a summary in their own style, with few numbers.</p></li>
          <li className="rounded-lg border border-line bg-surface p-4"><p className="font-medium">A specific question about a project gets the story</p><p className="mt-1 text-muted">“What made the migration hard?” Expect the situation and some detail.</p></li>
          <li className="rounded-lg border border-line bg-surface p-4"><p className="font-medium">A precise question about their own decision gets the reasoning</p><p className="mt-1 text-muted">“Which decision did you make yourself, and what else did you consider?” This is where the real numbers and trade-offs appear.</p></li>
        </ol>
      </section>

      <section id="probes" className="mt-12"><h2 className={h2}>Probes worth memorising</h2>
        <div className="mt-4 space-y-5">
          {probes.map(([t, qs]) => (
            <div key={t}><h3 className="font-medium">{t}</h3>
              <ul className="mt-1.5 space-y-1 border-l-2 border-line pl-4 text-sm">{qs.map((q) => <li key={q}>{q}</li>)}</ul></div>
          ))}
        </div>
      </section>

      <section id="fair" className="mt-12"><h2 className={h2}>Fair, job-related questions</h2>
        <p className="mt-2 text-muted">Ask about what the job requires, not about who the candidate is. The report flags risky questions automatically.</p>
        <div className="mt-4 overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="border-b border-line text-muted"><tr><th className="px-4 py-2.5 font-medium">Topic</th><th className="px-4 py-2.5 font-medium">Avoid</th><th className="px-4 py-2.5 font-medium">Ask instead</th></tr></thead>
            <tbody className="divide-y divide-line">{fair.map(([t, a, b]) => <tr key={t}><th scope="row" className="px-4 py-3 font-medium">{t}</th><td className="px-4 py-3 text-caution">{a}</td><td className="px-4 py-3">{b}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted">Educational guidance, not legal advice. Rules differ by jurisdiction, so check with your legal or HR team.</p>
      </section>

      <section id="notes" className="mt-12"><h2 className={h2}>Notes that hold up</h2>
        <p className="mt-2 text-muted">Write what was said or done. An impression cannot be checked later; evidence can.</p>
        <ul className="mt-4 space-y-3 text-sm">
          {notes.map(([bad, good]) => (
            <li key={bad} className="grid gap-2 rounded-lg border border-line bg-surface p-4 sm:grid-cols-2">
              <p><span className="block text-xs text-muted">Impression</span><span className="text-caution">“{bad}”</span></p>
              <p><span className="block text-xs text-muted">Evidence</span>“{good}”</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="types" className="mt-12 pb-8"><h2 className={h2}>Candidate types</h2>
        <dl className="mt-4 space-y-4 text-sm">
          {types.map(([t, what, how]) => (
            <div key={t} className="rounded-lg border border-line bg-surface p-4"><dt className="font-medium">{t}</dt><dd className="mt-1 text-muted">{what}</dd><dd className="mt-1">{how}</dd></div>
          ))}
        </dl>
      </section>
    </Page>
  );
}
