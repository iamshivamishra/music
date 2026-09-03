import { Skeleton } from "@/components/ui/skeleton";

export default function ChartsLoading() {
  return (
    <div className="page-shell">
      <div className="page-header flex items-center gap-3">
        <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>

      <div className="mt-8 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-2xl border border-border/50 bg-card/50 p-4"
          >
            <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
            <Skeleton className="h-14 w-14 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="hidden h-4 w-24 sm:block" />
            <Skeleton className="h-5 w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}
