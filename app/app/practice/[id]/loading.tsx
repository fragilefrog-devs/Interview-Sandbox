import { Skeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="flex h-[calc(100dvh-3.5rem)] flex-col">
      <span className="sr-only">Loading interview</span>
      <div className="flex items-center gap-3 border-b border-line px-4 py-3 sm:px-8"><Skeleton className="size-10 rounded-full" /><div className="space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-56" /></div></div>
      <div className="flex-1 space-y-4 px-4 py-6 sm:px-8"><Skeleton className="h-14 w-2/3" /><Skeleton className="ml-auto h-10 w-1/2" /><Skeleton className="h-16 w-3/5" /></div>
      <div className="border-t border-line px-4 py-3 sm:px-8"><Skeleton className="h-11" /></div>
    </div>
  );
}
