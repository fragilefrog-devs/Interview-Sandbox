"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { BookOpen, ChevronDown, CirclePlus, History, LayoutDashboard, LogOut, Menu, Settings, TrendingUp, X, type LucideIcon } from "lucide-react";
import { NavProgress } from "@/components/nav-progress";
import { ThemeToggle } from "@/components/theme";
import { ToastProvider } from "@/components/toast";
import { btnPrimary, brand } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { initials } from "@/lib/format";

type Item = { href: string; label: string; icon: LucideIcon; exact?: boolean; also?: string[]; hint?: string };
const NAV: { group: string; items: Item[] }[] = [
  { group: "Practice", items: [
    { href: "/app", label: "Overview", icon: LayoutDashboard, exact: true },
    { href: "/app/new", label: "New session", icon: CirclePlus, hint: "N" },
    { href: "/app/sessions", label: "Sessions", icon: History, also: ["/app/practice"] },
  ] },
  { group: "Improve", items: [
    { href: "/app/progress", label: "Progress", icon: TrendingUp },
    { href: "/app/playbook", label: "Playbook", icon: BookOpen },
  ] },
  { group: "Account", items: [{ href: "/app/settings", label: "Settings", icon: Settings }] },
];
const ALL = NAV.flatMap((g) => g.items);

const isActive = (it: Item, p: string) =>
  it.exact ? p === it.href : [it.href, ...(it.also ?? [])].some((h) => p === h || p.startsWith(h + "/"));

function titleFor(p: string) {
  if (p.startsWith("/app/practice/")) return "Interview";
  return ALL.find((i) => isActive(i, p))?.label ?? "Dashboard";
}

export function AppShell({ user, usage: initialUsage, children }: {
  user: { name: string; email: string }; usage: { used: number; limit: number }; children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false);
  const [usage, setUsage] = useState(initialUsage);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setDrawer(false); setMenu(false); }, [pathname]);

  useEffect(() => { // keep the daily meter honest after sessions are created
    let off = false;
    fetch("/api/usage", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => { if (!off && d) setUsage(d); }).catch(() => {});
    return () => { off = true; };
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setDrawer(false); setMenu(false); return; }
      const t = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || t.closest("input, textarea, select, [contenteditable=true], dialog")) return;
      if (e.key.toLowerCase() === "n") { e.preventDefault(); router.push("/app/new"); }
    };
    const onDown = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false); };
    document.addEventListener("keydown", onKey); document.addEventListener("mousedown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onDown); };
  }, [router]);

  const pct = Math.min(100, Math.round((usage.used / Math.max(1, usage.limit)) * 100));
  const onPractice = pathname.startsWith("/app/practice/");

  return (
    <ToastProvider>
      <Suspense><NavProgress /></Suspense>
      <a href="#content" className="skip-link rounded bg-surface px-3 py-2 text-sm">Skip to content</a>

      {drawer && <div className="no-print fixed inset-0 z-40 bg-ink/40 lg:hidden" onClick={() => setDrawer(false)} aria-hidden />}

      {/* Sidebar */}
      <aside id="sidebar" aria-label="Sidebar"
        className={`no-print fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-line bg-surface transition-transform duration-200 lg:w-60 lg:translate-x-0 ${drawer ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
          <Link href="/app" className={brand}>Practice Lab</Link>
          <button type="button" onClick={() => setDrawer(false)} aria-label="Close menu" className="flex size-9 items-center justify-center rounded-md text-muted hover:bg-line/50 lg:hidden"><X className="size-5" aria-hidden /></button>
        </div>
        <nav aria-label="Main" className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {NAV.map((g) => (
            <div key={g.group}>
              <p className="px-2 pb-1 text-xs font-medium text-muted">{g.group}</p>
              <ul className="space-y-0.5">
                {g.items.map((it) => {
                  const active = isActive(it, pathname);
                  return (
                    <li key={it.href}>
                      <Link href={it.href} aria-current={active ? "page" : undefined}
                        className={`flex items-center gap-2.5 rounded-md px-2 py-2 text-sm font-medium ${active ? "bg-accent-soft text-accent" : "text-ink/80 hover:bg-line/50 hover:text-ink"}`}>
                        <it.icon className="size-[18px] shrink-0" aria-hidden />
                        <span className="flex-1">{it.label}</span>
                        {it.hint && <kbd className="hidden rounded border border-line px-1.5 text-[11px] font-normal text-muted lg:inline" aria-label={`Shortcut ${it.hint}`}>{it.hint}</kbd>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="shrink-0 border-t border-line p-4">
          <div className="flex items-baseline justify-between text-xs text-muted">
            <span>Sessions today</span><span className="tabular-nums">{usage.used} of {usage.limit}</span>
          </div>
          <div role="progressbar" aria-label="Sessions used in the last 24 hours" aria-valuemin={0} aria-valuemax={usage.limit} aria-valuenow={usage.used} className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
            <div className={`h-full rounded-full transition-[width] duration-300 ${pct >= 100 ? "bg-caution" : "bg-accent"}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      </aside>

      {/* Fixed top bar */}
      <header className="no-print fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-paper/90 px-3 backdrop-blur sm:px-4 lg:left-60">
        <button type="button" onClick={() => setDrawer(true)} aria-label="Open menu" aria-expanded={drawer} aria-controls="sidebar" className="flex size-9 items-center justify-center rounded-md text-ink hover:bg-line/50 lg:hidden"><Menu className="size-5" aria-hidden /></button>
        <div className="min-w-0 flex-1 text-sm">
          {onPractice
            ? <nav aria-label="Breadcrumb" className="flex items-center gap-1.5"><Link href="/app/sessions" className="text-muted hover:text-ink">Sessions</Link><span aria-hidden className="text-muted">/</span><span className="font-medium">Interview</span></nav>
            : <p className="truncate font-medium">{titleFor(pathname)}</p>}
        </div>
        {pathname !== "/app/new" && <Link href="/app/new" className={`${btnPrimary} hidden sm:inline-flex`}><CirclePlus className="size-4" aria-hidden />New session</Link>}
        <ThemeToggle />
        <div className="relative" ref={menuRef}>
          <button type="button" onClick={() => setMenu((v) => !v)} aria-haspopup="menu" aria-expanded={menu}
            className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2 hover:bg-line/50">
            <span className="flex size-8 items-center justify-center rounded-full bg-accent text-xs font-semibold text-on-accent" aria-hidden>{initials(user.name)}</span>
            <span className="hidden max-w-32 truncate text-sm font-medium md:inline">{user.name}</span>
            <ChevronDown className="size-4 text-muted" aria-hidden />
          </button>
          {menu && (
            <div role="menu" className="page-in absolute right-0 top-full mt-2 w-60 overflow-hidden rounded-lg border border-line bg-surface shadow-lg">
              <div className="border-b border-line px-4 py-3">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="truncate text-xs text-muted">{user.email}</p>
              </div>
              <Link role="menuitem" href="/app/settings" className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-line/50"><Settings className="size-4" aria-hidden />Settings</Link>
              <button role="menuitem" type="button" className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-line/50"
                onClick={async () => { await authClient.signOut(); router.push("/"); router.refresh(); }}>
                <LogOut className="size-4" aria-hidden />Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      <main id="content" tabIndex={-1} className="pt-14 outline-none lg:pl-60">{children}</main>
    </ToastProvider>
  );
}
