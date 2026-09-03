import { Skeleton } from "@/components/ui/skeleton";

export default function StudioAnalyticsLoading() {
  return (
    <div className="page-shell">
      <Skeleton className="mb-2 h-8 w-40" />
      <Skeleton className="mb-8 h-4 w-64" />
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="mb-6 h-64 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
