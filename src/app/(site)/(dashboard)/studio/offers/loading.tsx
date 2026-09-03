import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="page-shell">
      <Skeleton className="mb-8 h-8 w-44" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
