"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useToast } from "@/components/toast";
import { btnPrimary, input } from "@/components/ui";
import { difficultyOptions, focusOptions, levelOptions, seniorityOptions, type ProfileDefaults } from "@/lib/profile-options";
import type { FocusArea, Seniority } from "@/lib/schemas";

export function ProfileForm({ defaults }: { defaults: ProfileDefaults }) {
  const router = useRouter();
  const toast = useToast();
  const [saved, setSaved] = useState(defaults);
  const [v, setV] = useState(defaults);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const dirty = JSON.stringify({ ...v, focusAreas: [...v.focusAreas].sort() }) !== JSON.stringify({ ...saved, focusAreas: [...saved.focusAreas].sort() });
  const valid = v.hiringFocus.trim().length >= 2 && v.focusAreas.length > 0;
  const toggle = (a: FocusArea) => setV((p) => ({ ...p, focusAreas: p.focusAreas.includes(a) ? p.focusAreas.filter((x) => x !== a) : [...p.focusAreas, a] }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setPending(true); setError("");
    const body = { ...v, hiringFocus: v.hiringFocus.trim() };
    const res = await fetch("/api/profile", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    setPending(false);
    if (!res?.ok) { setError((await res?.json().catch(() => null))?.error ?? "Could not save. Try again."); return; }
    setSaved(body); setV(body); toast("Profile saved"); router.refresh();
  }

  return (
    <form onSubmit={save} className="max-w-xl space-y-8">
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">How much interviewing have you done?</legend>
        {levelOptions.map(([id, label]) => (
          <label key={id} className="flex items-center gap-2 text-sm"><input type="radio" name="level" checked={v.level === id} onChange={() => setV({ ...v, level: id })} className="accent-accent" />{label}</label>
        ))}
      </fieldset>

      <label className="block text-sm font-medium">Roles you interview for
        <input value={v.hiringFocus} onChange={(e) => setV({ ...v, hiringFocus: e.target.value })} maxLength={120} placeholder="Backend engineers, data analysts" className={input} />
        <span className="mt-1 block text-xs font-normal text-muted">The first role becomes the default for new sessions.</span>
      </label>

      <label className="block max-w-xs text-sm font-medium">Usual seniority
        <select value={v.seniority} onChange={(e) => setV({ ...v, seniority: e.target.value as Seniority })} className={input}>
          {seniorityOptions.map(([id, l]) => <option key={id} value={id}>{l}</option>)}
        </select>
      </label>

      <fieldset className="space-y-3">
        <legend className="mb-2 text-sm font-medium">Where do you want the most feedback?</legend>
        {focusOptions.map(([id, label, hint]) => (
          <label key={id} className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={v.focusAreas.includes(id)} onChange={() => toggle(id)} className="mt-1 accent-accent" />
            <span><span className="font-medium">{label}</span><span className="block text-muted">{hint}</span></span>
          </label>
        ))}
        {v.focusAreas.length === 0 && <p role="alert" className="text-sm text-caution">Pick at least one focus area.</p>}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-2 text-sm font-medium">Default difficulty</legend>
        {difficultyOptions.map(([id, label, hint]) => (
          <label key={id} className="flex items-start gap-2 text-sm">
            <input type="radio" name="difficulty" checked={v.difficulty === id} onChange={() => setV({ ...v, difficulty: id })} className="mt-1 accent-accent" />
            <span><span className="font-medium">{label}</span><span className="block text-muted">{hint}</span></span>
          </label>
        ))}
      </fieldset>

      {error && <p role="alert" className="text-sm text-caution">{error}</p>}
      <div className="flex items-center gap-3">
        <button disabled={!dirty || !valid || pending} className={btnPrimary}>{pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}Save changes</button>
        {dirty && !pending && <button type="button" onClick={() => setV(saved)} className="text-sm text-muted underline">Discard</button>}
      </div>
    </form>
  );
}
