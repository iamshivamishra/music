import { Skeleton } from "@/components/ui/skeleton";

export default function StudioJobsLoading() {
  return (
    <div className="page-shell">
      <Skeleton className="mb-4 h-8 w-32" />
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}
