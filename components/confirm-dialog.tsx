"use client";
import { useEffect, useRef } from "react";
import { LoaderCircle } from "lucide-react";
import { btnDanger, btnGhost, btnPrimary } from "@/components/ui";

export function ConfirmDialog({ open, title, description, confirmLabel, tone = "default", pending = false, confirmDisabled = false, onConfirm, onClose, children }: {
  open: boolean; title: string; description?: React.ReactNode; confirmLabel: string; tone?: "default" | "danger";
  pending?: boolean; confirmDisabled?: boolean; onConfirm: () => void; onClose: () => void; children?: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current; if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog ref={ref} onClose={onClose} onCancel={(e) => { if (pending) e.preventDefault(); }}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-lg border border-line bg-surface p-0 text-ink backdrop:bg-ink/40">
      <form method="dialog" onSubmit={(e) => { e.preventDefault(); if (!pending && !confirmDisabled) onConfirm(); }} className="p-6">
        <h2 className="font-serif text-xl">{title}</h2>
        {description && <p className="mt-2 text-sm text-muted">{description}</p>}
        {children && <div className="mt-4">{children}</div>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={pending} className={btnGhost}>Cancel</button>
          <button type="submit" disabled={pending || confirmDisabled} className={tone === "danger" ? btnDanger : btnPrimary}>
            {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}{confirmLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
