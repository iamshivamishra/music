import { Skeleton } from "@/components/ui/skeleton";

export default function StudioLoading() {
  return (
    <div className="page-shell">
      <div className="mb-8 space-y-2">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Stat cards */}
      <div className="mb-8 grid gap-4 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border/50 bg-card/80 p-4">
            <div className="mb-3 flex items-center justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
            <Skeleton className="mb-2 h-8 w-20" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>

      {/* Chart placeholder */}
      <div className="rounded-2xl border border-border/50 bg-card/80 p-6">
        <Skeleton className="mb-4 h-5 w-36" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    </div>
  );
}
