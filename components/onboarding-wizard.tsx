"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnGhost, btnPrimary, input } from "@/components/ui";
import { difficultyOptions, focusOptions, levelOptions, seniorityOptions, type ProfileDefaults } from "@/lib/profile-options";
import type { FocusArea, Seniority } from "@/lib/schemas";

export type { ProfileDefaults };

const TITLES = ["About you", "What you hire for", "What to sharpen"];

export function OnboardingWizard({ defaults, editing }: { defaults: ProfileDefaults; editing: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [v, setV] = useState(defaults);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const valid = [true, v.hiringFocus.trim().length >= 2, v.focusAreas.length > 0][step];
  const toggle = (a: FocusArea) => setV((p) => ({ ...p, focusAreas: p.focusAreas.includes(a) ? p.focusAreas.filter((x) => x !== a) : [...p.focusAreas, a] }));

  async function save() {
    setPending(true); setError("");
    const res = await fetch("/api/profile", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...v, hiringFocus: v.hiringFocus.trim() }) });
    if (!res.ok) { setPending(false); setError((await res.json().catch(() => null))?.error ?? "Could not save. Try again."); return; }
    router.push("/app"); router.refresh();
  }

  return (
    <div className="max-w-lg">
      <p className="text-sm text-muted" aria-live="polite">Step {step + 1} of {TITLES.length}: {TITLES[step]}</p>

      <div className="mt-6 space-y-5">
        {step === 0 && (
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">How much interviewing have you done?</legend>
            {levelOptions.map(([id, label]) => (
              <label key={id} className="flex items-center gap-2 text-sm">
                <input type="radio" name="level" checked={v.level === id} onChange={() => setV({ ...v, level: id })} className="accent-accent" />{label}
              </label>
            ))}
          </fieldset>
        )}

        {step === 1 && (<>
          <label className="block text-sm font-medium">Roles you interview for
            <input value={v.hiringFocus} onChange={(e) => setV({ ...v, hiringFocus: e.target.value })} maxLength={120} placeholder="Backend engineers, data analysts" className={input} />
            <span className="mt-1 block text-xs font-normal text-muted">The first role becomes the default for new practice sessions.</span>
          </label>
          <label className="block text-sm font-medium">Usual seniority
            <select value={v.seniority} onChange={(e) => setV({ ...v, seniority: e.target.value as Seniority })} className={input}>
              {seniorityOptions.map(([id, l]) => <option key={id} value={id}>{l}</option>)}
            </select>
          </label>
        </>)}

        {step === 2 && (<>
          <fieldset className="space-y-3">
            <legend className="mb-2 text-sm font-medium">Where do you want the most feedback? Pick any.</legend>
            {focusOptions.map(([id, label, hint]) => (
              <label key={id} className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={v.focusAreas.includes(id)} onChange={() => toggle(id)} className="mt-1 accent-accent" />
                <span><span className="font-medium">{label}</span><span className="block text-muted">{hint}</span></span>
              </label>
            ))}
          </fieldset>
          <fieldset className="space-y-3">
            <legend className="mb-2 text-sm font-medium">Starting difficulty</legend>
            {difficultyOptions.map(([id, label, hint]) => (
              <label key={id} className="flex items-start gap-2 text-sm">
                <input type="radio" name="difficulty" checked={v.difficulty === id} onChange={() => setV({ ...v, difficulty: id })} className="mt-1 accent-accent" />
                <span><span className="font-medium">{label}</span><span className="block text-muted">{hint}</span></span>
              </label>
            ))}
          </fieldset>
        </>)}
      </div>

      {error && <p role="alert" className="mt-4 text-sm text-caution">{error}</p>}

      <div className="mt-8 flex gap-3">
        {step > 0 && <button onClick={() => setStep(step - 1)} className={btnGhost}>Back</button>}
        {step < TITLES.length - 1
          ? <button onClick={() => setStep(step + 1)} disabled={!valid} className={btnPrimary}>Continue</button>
          : <button onClick={save} disabled={!valid || pending} className={btnPrimary}>{pending ? "Saving..." : editing ? "Save changes" : "Finish setup"}</button>}
      </div>
    </div>
  );
}
