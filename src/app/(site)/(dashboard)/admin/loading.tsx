import { Card, CardContent, CardHeader } from "@/components/ui/card";

const pulse =
  "bg-muted rounded motion-safe:animate-pulse motion-reduce:animate-none";

const statCardClass = "rounded-2xl border-border/50 bg-card/80 shadow-sm";

function StatCardSkeleton() {
  return (
    <Card className={statCardClass}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className={`h-3.5 w-16 ${pulse}`} />
        <div className={`h-4 w-4 ${pulse}`} />
      </CardHeader>
      <CardContent>
        <div className={`h-8 w-20 ${pulse}`} />
      </CardContent>
    </Card>
  );
}

export default function AdminLoading() {
  return (
    <div className="page-shell">
      {/* Header */}
      <div className="mb-8">
        <div className={`h-8 w-56 ${pulse}`} />
        <div className={`mt-2 h-4 w-72 ${pulse}`} />
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Shortcuts */}
      <div className="mt-8 rounded-2xl border border-border/50 bg-card/70 p-5 shadow-sm">
        <div className={`h-4 w-32 ${pulse}`} />
        <div className={`mt-2 h-3.5 w-64 ${pulse}`} />
        <div className="mt-4 flex flex-wrap gap-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className={`h-9 w-36 rounded-md ${pulse}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
