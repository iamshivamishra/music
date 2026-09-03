import { Skeleton } from "@/components/ui/skeleton";

export default function StudioBeatsLoading() {
  return (
    <div className="page-shell">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-52" />
        </div>
        <Skeleton className="h-10 w-32" />
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
          </div>
        ))}
      </div>

      {/* Status tabs */}
      <Skeleton className="mb-6 h-10 w-72 rounded-xl" />

      {/* Table rows */}
      <div className="rounded-2xl border border-border/50 bg-card/80 overflow-hidden">
        <div className="border-b border-border/30 p-3">
          <Skeleton className="h-4 w-full" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-border/20 p-3">
            <Skeleton className="h-10 w-10 rounded-md shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="hidden sm:block h-5 w-16 rounded-full" />
            <Skeleton className="hidden md:block h-4 w-10" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
