import { Skeleton } from "@/components/ui/skeleton";

export default function StudioSalesLoading() {
  return (
    <div className="page-shell">
      <div className="mb-8 space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* Table rows */}
      <div className="rounded-2xl border border-border/50 bg-card/80 overflow-hidden">
        <div className="border-b border-border/30 p-3">
          <Skeleton className="h-4 w-full" />
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-border/20 p-3">
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="hidden sm:block h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="hidden sm:block h-4 w-20" />
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="mt-6 flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
    </div>
  );
}
