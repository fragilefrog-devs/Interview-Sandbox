"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useToast } from "@/components/toast";
import { btnPrimary, input } from "@/components/ui";
import { authClient } from "@/lib/auth-client";

export function AccountForms({ name, email, joined }: { name: string; email: string; joined: string }) {
  const router = useRouter();
  const toast = useToast();

  const [newName, setNewName] = useState(name);
  const [nameBusy, setNameBusy] = useState(false);
  const [nameErr, setNameErr] = useState("");

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [revoke, setRevoke] = useState(true);
  const [pwBusy, setPwBusy] = useState(false);
  const [pwErr, setPwErr] = useState("");

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setNameBusy(true); setNameErr("");
    const { error } = await authClient.updateUser({ name: newName.trim() });
    setNameBusy(false);
    if (error) { setNameErr(error.message ?? "Could not update your name."); return; }
    toast("Name updated"); router.refresh();
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwErr("");
    if (pw.next.length < 8) return setPwErr("Use at least 8 characters for the new password.");
    if (pw.next !== pw.confirm) return setPwErr("The new passwords do not match.");
    setPwBusy(true);
    const { error } = await authClient.changePassword({ currentPassword: pw.current, newPassword: pw.next, revokeOtherSessions: revoke });
    setPwBusy(false);
    if (error) { setPwErr(error.message ?? "Could not change your password."); return; }
    setPw({ current: "", next: "", confirm: "" }); toast("Password changed");
  }

  return (
    <div className="max-w-xl space-y-12">
      <section aria-labelledby="acct-h">
        <h2 id="acct-h" className="font-serif text-xl">Your details</h2>
        <form onSubmit={saveName} className="mt-4 space-y-4">
          <label className="block text-sm font-medium">Name
            <input value={newName} onChange={(e) => setNewName(e.target.value)} required maxLength={80} autoComplete="name" className={input} />
          </label>
          <label className="block text-sm font-medium">Email
            <input value={email} readOnly aria-readonly className={`${input} cursor-not-allowed bg-line/30 text-muted`} />
            <span className="mt-1 block text-xs font-normal text-muted">Changing your email needs email verification, which is not set up yet. Member since {joined}.</span>
          </label>
          {nameErr && <p role="alert" className="text-sm text-caution">{nameErr}</p>}
          <button disabled={nameBusy || !newName.trim() || newName.trim() === name} className={btnPrimary}>{nameBusy && <LoaderCircle className="size-4 animate-spin" aria-hidden />}Save name</button>
        </form>
      </section>

      <section aria-labelledby="pw-h">
        <h2 id="pw-h" className="font-serif text-xl">Password</h2>
        <form onSubmit={savePassword} className="mt-4 space-y-4">
          <label className="block text-sm font-medium">Current password
            <input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required autoComplete="current-password" className={input} />
          </label>
          <label className="block text-sm font-medium">New password
            <input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required minLength={8} autoComplete="new-password" className={input} />
            <span className="mt-1 block text-xs font-normal text-muted">At least 8 characters.</span>
          </label>
          <label className="block text-sm font-medium">Confirm new password
            <input type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required autoComplete="new-password" className={input} />
          </label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={revoke} onChange={(e) => setRevoke(e.target.checked)} className="accent-accent" />Sign out of my other devices</label>
          {pwErr && <p role="alert" className="text-sm text-caution">{pwErr}</p>}
          <button disabled={pwBusy || !pw.current || !pw.next} className={btnPrimary}>{pwBusy && <LoaderCircle className="size-4 animate-spin" aria-hidden />}Change password</button>
        </form>
      </section>
    </div>
  );
}
