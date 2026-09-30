import type { LucideIcon } from "lucide-react";

export function EmptyState({ icon: Icon, title, children, action }: {
  icon: LucideIcon; title: string; children?: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-line px-6 py-12 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-accent-soft text-accent"><Icon className="size-5" aria-hidden /></span>
      <h2 className="mt-4 font-serif text-xl">{title}</h2>
      {children && <p className="mt-2 max-w-md text-sm text-muted">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
