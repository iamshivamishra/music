import { Skeleton } from "@/components/ui/skeleton";

export default function CartLoading() {
  return (
    <div className="page-shell max-w-4xl">
      <Skeleton className="mb-2 h-9 w-40" />
      <Skeleton className="mb-8 h-5 w-64" />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4 rounded-xl border border-border/50 bg-card/80 p-4 sm:p-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-20 w-20 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-8 w-32" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  );
}
