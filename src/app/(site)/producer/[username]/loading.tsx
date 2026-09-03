import { Skeleton } from "@/components/ui/skeleton";

export default function ProducerProfileLoading() {
  return (
    <div>
      {/* Cover */}
      <Skeleton className="h-48 w-full sm:h-64 lg:h-72" />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Avatar + name */}
        <div className="relative -mt-16 flex flex-col items-center gap-4 sm:-mt-20 sm:flex-row sm:items-end sm:gap-6">
          <Skeleton className="h-28 w-28 rounded-full sm:h-36 sm:w-36" />
          <div className="flex-1 space-y-2 text-center sm:pb-2 sm:text-left">
            <Skeleton className="mx-auto h-8 w-48 sm:mx-0" />
            <Skeleton className="mx-auto h-4 w-28 sm:mx-0" />
          </div>
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>

        {/* Stats row */}
        <div className="mt-6 flex items-center justify-center gap-6 sm:justify-start sm:gap-10">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1 text-center">
              <Skeleton className="mx-auto h-6 w-10" />
              <Skeleton className="mx-auto h-3 w-14" />
            </div>
          ))}
        </div>

        {/* Bio + genres */}
        <div className="mt-6 space-y-4">
          <Skeleton className="h-4 w-full max-w-2xl" />
          <Skeleton className="h-4 w-3/4 max-w-xl" />
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-16 rounded-full" />
            ))}
          </div>
        </div>

        <Skeleton className="my-8 h-px w-full" />

        {/* Beats heading */}
        <Skeleton className="mb-6 h-7 w-32" />

        {/* Beat grid */}
        <div className="grid grid-cols-2 gap-4 pb-16 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-square rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
