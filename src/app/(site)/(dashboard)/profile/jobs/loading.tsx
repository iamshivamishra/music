import { Skeleton } from "@/components/ui/skeleton";

export default function BuyerJobsLoading() {
  return (
    <div className="page-shell">
      <Skeleton className="mb-4 h-8 w-32" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}
