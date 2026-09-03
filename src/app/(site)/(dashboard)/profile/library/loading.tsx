import { Skeleton } from "@/components/ui/skeleton";

export default function LibraryLoading() {
  return (
    <div className="page-shell space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-9 w-full sm:w-64" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border/50 bg-card/70 p-3 sm:p-4"
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <Skeleton className="h-14 w-14 shrink-0 rounded-lg sm:h-16 sm:w-16" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
              <Skeleton className="h-3 w-1/5" />
            </div>
            <Skeleton className="h-5 w-12" />
          </div>
          <div className="mt-3 flex gap-2 border-t border-border/30 pt-3">
            <Skeleton className="h-9 w-16 rounded-lg" />
            <Skeleton className="h-9 w-16 rounded-lg" />
            <Skeleton className="h-9 w-20 rounded-lg" />
            <Skeleton className="h-9 w-20 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
