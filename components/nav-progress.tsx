"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** Thin top bar that starts when an internal link is clicked and finishes when the URL changes. */
export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const running = useRef(false);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);
  const safety = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopTimers = () => {
    if (ticker.current) clearInterval(ticker.current);
    if (safety.current) clearTimeout(safety.current);
  };
  const finish = () => {
    if (!running.current) return;
    running.current = false; stopTimers(); setWidth(100);
    setTimeout(() => { setVisible(false); setWidth(0); }, 220);
  };

  useEffect(() => { finish(); }, [pathname, search]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element).closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname + url.search === location.pathname + location.search) return;
      running.current = true; setVisible(true); setWidth(12); stopTimers();
      ticker.current = setInterval(() => setWidth((w) => w + (90 - w) * 0.12), 180);
      safety.current = setTimeout(finish, 10_000);
    };
    document.addEventListener("click", onClick);
    return () => { document.removeEventListener("click", onClick); stopTimers(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div aria-hidden className={`no-print pointer-events-none fixed inset-x-0 top-0 z-[70] h-0.5 transition-opacity ${visible ? "opacity-100" : "opacity-0"}`}>
      <div className="h-full bg-accent transition-[width] duration-200 ease-out" style={{ width: `${width}%` }} />
    </div>
  );
}
