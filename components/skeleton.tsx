export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-md bg-line/70 ${className}`} />;
}

/** Shared loading shell used by every dashboard route's loading.tsx. */
export function PageSkeleton({ rows = 4, tiles = true }: { rows?: number; tiles?: boolean }) {
  return (
    <div role="status" aria-live="polite" className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
      <span className="sr-only">Loading</span>
      <Skeleton className="h-9 w-64" />
      <Skeleton className="mt-3 h-4 w-96 max-w-full" />
      {tiles && (
        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
      )}
      <div className="mt-8 space-y-3">
        {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-14" />)}
      </div>
    </div>
  );
}
