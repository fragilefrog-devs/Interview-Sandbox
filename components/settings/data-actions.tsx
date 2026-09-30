"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Download, Trash2, UserX } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast";
import { btnDanger, btnGhost, input } from "@/components/ui";
import { authClient } from "@/lib/auth-client";

export function DataActions({ sessionCount }: { sessionCount: number }) {
  const router = useRouter();
  const toast = useToast();
  const [dlg, setDlg] = useState<null | "sessions" | "account">(null);
  const [pending, setPending] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const close = () => { if (pending) return; setDlg(null); setPassword(""); setError(""); };

  async function clearSessions() {
    setPending(true);
    const res = await fetch("/api/sessions", { method: "DELETE" }).catch(() => null);
    setPending(false);
    if (!res?.ok) { setError("Could not delete your sessions. Try again."); return; }
    setDlg(null); toast("All sessions deleted"); router.refresh();
  }

  async function deleteAccount() {
    setPending(true); setError("");
    const { error } = await authClient.deleteUser({ password });
    if (error) { setPending(false); setError(error.message ?? "Could not delete your account."); return; }
    router.push("/"); router.refresh();
  }

  const row = "flex flex-wrap items-center justify-between gap-4 py-5";
  return (
    <div className="max-w-2xl divide-y divide-line rounded-lg border border-line bg-surface px-5">
      <div className={row}>
        <div className="max-w-md"><h2 className="font-medium">Export your data</h2><p className="mt-1 text-sm text-muted">Download your profile, sessions, transcripts, notes and reports as JSON.</p></div>
        <a href="/api/export" download className={btnGhost}><Download className="size-4" aria-hidden />Download export</a>
      </div>
      <div className={row}>
        <div className="max-w-md"><h2 className="font-medium">Delete all sessions</h2><p className="mt-1 text-sm text-muted">{sessionCount} session{sessionCount === 1 ? "" : "s"} with their transcripts and reports. Your account and profile stay.</p></div>
        <button type="button" disabled={sessionCount === 0} onClick={() => setDlg("sessions")} className={btnDanger}><Trash2 className="size-4" aria-hidden />Delete sessions</button>
      </div>
      <div className={row}>
        <div className="max-w-md"><h2 className="font-medium">Delete account</h2><p className="mt-1 text-sm text-muted">Permanently removes your account, profile and every session. This cannot be undone.</p></div>
        <button type="button" onClick={() => setDlg("account")} className={btnDanger}><UserX className="size-4" aria-hidden />Delete account</button>
      </div>

      <ConfirmDialog open={dlg === "sessions"} onClose={close} onConfirm={clearSessions} pending={pending} tone="danger" confirmLabel="Delete all sessions"
        title="Delete all sessions?" description={`This permanently removes ${sessionCount} session${sessionCount === 1 ? "" : "s"}, including transcripts, notes and reports.`}>
        {error && <p role="alert" className="text-sm text-caution">{error}</p>}
      </ConfirmDialog>

      <ConfirmDialog open={dlg === "account"} onClose={close} onConfirm={deleteAccount} pending={pending} tone="danger" confirmLabel="Delete my account"
        confirmDisabled={!password} title="Delete your account?" description="Enter your password to confirm. Everything you have created here will be removed.">
        <label className="block text-sm font-medium">Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className={input} />
        </label>
        {error && <p role="alert" className="mt-2 text-sm text-caution">{error}</p>}
      </ConfirmDialog>
    </div>
  );
}
