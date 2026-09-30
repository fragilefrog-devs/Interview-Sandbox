"use client";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";

type Kind = "success" | "error";
type Toast = { id: number; message: string; kind: Kind };
const Ctx = createContext<(message: string, kind?: Kind) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const seq = useRef(0);
  const push = useCallback((message: string, kind: Kind = "success") => {
    const id = ++seq.current;
    setItems((p) => [...p.slice(-2), { id, message, kind }]);
    setTimeout(() => setItems((p) => p.filter((t) => t.id !== id)), kind === "error" ? 6000 : 3500);
  }, []);

  return (
    <Ctx.Provider value={push}>
      {children}
      <div role="status" aria-live="polite" className="no-print pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
        {items.map((t) => (
          <div key={t.id} className="page-in pointer-events-auto flex items-start gap-2 rounded-md border border-line bg-surface px-3 py-2.5 text-sm shadow-lg">
            {t.kind === "success"
              ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
              : <CircleAlert className="mt-0.5 size-4 shrink-0 text-caution" aria-hidden />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
