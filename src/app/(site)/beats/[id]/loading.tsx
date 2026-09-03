import { Skeleton } from "@/components/ui/skeleton";

export default function BeatDetailLoading() {
  return (
    <div className="page-shell px-4 py-8 sm:px-6 lg:px-8">
      {/* Back button */}
      <Skeleton className="mb-6 h-9 w-32 sm:mb-8" />

      <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
        {/* Left column */}
        <div className="space-y-4 sm:space-y-5">
          {/* Hero card */}
          <div className="rounded-xl border border-border/50 p-4 sm:p-5 md:p-6">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
              <Skeleton className="aspect-square w-40 shrink-0 rounded-xl sm:w-48 md:w-56 lg:w-64" />
              <div className="w-full flex-1 space-y-4">
                <Skeleton className="mx-auto h-8 w-3/4 sm:mx-0" />
                <Skeleton className="mx-auto h-5 w-1/3 sm:mx-0" />
                <div className="flex flex-wrap justify-center gap-3 sm:justify-start">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Player */}
          <div className="rounded-xl border border-border/50 p-3 sm:p-4 md:p-5">
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>

          {/* Tags */}
          <div className="rounded-xl border border-border/50 p-4 sm:p-5">
            <Skeleton className="mb-3 h-4 w-12" />
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-16 rounded-full" />
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="rounded-xl border border-border/50 p-4 sm:p-5">
            <Skeleton className="mb-2 h-4 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="mt-1.5 h-4 w-5/6" />
          </div>

          {/* Producer */}
          <div className="rounded-xl border border-border/50 p-4">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <Skeleton className="h-14 w-14 shrink-0 rounded-full" />
              <div className="w-full flex-1 space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Right column - license selector */}
        <div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
