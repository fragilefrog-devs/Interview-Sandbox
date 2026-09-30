import { CircleCheck, CircleDot } from "lucide-react";

export function StatusBadge({ status }: { status: "active" | "completed" }) {
  return status === "completed"
    ? <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent"><CircleCheck className="size-3" aria-hidden />Report ready</span>
    : <span className="inline-flex items-center gap-1 rounded-full bg-caution-soft px-2 py-0.5 text-xs font-medium text-caution"><CircleDot className="size-3" aria-hidden />In progress</span>;
}
