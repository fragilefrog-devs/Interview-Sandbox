"use client";
import { useCallback, useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

export type ThemePref = "system" | "light" | "dark";
const KEY = "theme";

function apply(pref: ThemePref) {
  const dark = pref === "dark" || (pref === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

export function useTheme() {
  const [pref, setPref] = useState<ThemePref>("system");
  useEffect(() => {
    try { setPref((localStorage.getItem(KEY) as ThemePref) || "system"); } catch { /* storage blocked */ }
  }, []);
  useEffect(() => { // follow the OS while on "system"
    if (pref !== "system") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const on = () => apply("system");
    mq.addEventListener("change", on); return () => mq.removeEventListener("change", on);
  }, [pref]);
  const set = useCallback((p: ThemePref) => {
    setPref(p); apply(p);
    try { localStorage.setItem(KEY, p); } catch { /* ignore */ }
  }, []);
  return [pref, set] as const;
}

/** Top-bar quick toggle: flips between light and dark. Full choice lives in Settings. */
export function ThemeToggle() {
  const [pref, set] = useTheme();
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(document.documentElement.dataset.theme === "dark"); }, [pref]);
  return (
    <button type="button" onClick={() => set(dark ? "light" : "dark")} aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      className="flex size-9 items-center justify-center rounded-md text-muted hover:bg-line/50 hover:text-ink">
      {dark ? <Sun className="size-[18px]" aria-hidden /> : <Moon className="size-[18px]" aria-hidden />}
    </button>
  );
}

const OPTIONS: [ThemePref, string, typeof Sun][] = [["system", "System", Monitor], ["light", "Light", Sun], ["dark", "Dark", Moon]];

export function ThemePicker() {
  const [pref, set] = useTheme();
  return (
    <div role="radiogroup" aria-label="Theme" className="grid max-w-md grid-cols-3 gap-3">
      {OPTIONS.map(([id, label, Icon]) => (
        <button key={id} type="button" role="radio" aria-checked={pref === id} onClick={() => set(id)}
          className={`flex flex-col items-center gap-2 rounded-lg border px-3 py-4 text-sm font-medium ${pref === id ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface hover:border-muted"}`}>
          <Icon className="size-5" aria-hidden />{label}
        </button>
      ))}
    </div>
  );
}
