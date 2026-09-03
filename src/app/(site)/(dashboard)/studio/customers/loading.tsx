import { Skeleton } from "@/components/ui/skeleton";

export default function StudioCustomersLoading() {
  return (
    <div className="page-shell max-w-6xl">
      <div className="mb-8 space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="mb-6 h-9 w-full sm:max-w-xs" />
      <div className="rounded-2xl border border-border/50 bg-card/80 overflow-hidden">
        <div className="border-b border-border/30 p-3">
          <Skeleton className="h-4 w-full" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-border/20 p-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="hidden sm:block h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
