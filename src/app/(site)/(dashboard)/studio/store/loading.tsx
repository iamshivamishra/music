import { Skeleton } from "@/components/ui/skeleton";

export default function StudioStoreLoading() {
  return (
    <div className="page-shell">
      <div className="page-header space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-10 w-40" />
        </div>
        <Skeleton className="mx-auto h-[420px] w-[280px] rounded-[2rem]" />
      </div>
    </div>
  );
}
