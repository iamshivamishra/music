"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FUNNEL_DAYS, type FunnelDays } from "@/lib/validators/analytics";
import type { FunnelAnalyticsDto } from "@/lib/serializers/analytics";
import { StudioAnalyticsBody } from "@/features/studio/StudioAnalyticsBody";

function isFunnelDays(value: number): value is FunnelDays {
  return (FUNNEL_DAYS as readonly number[]).includes(value);
}

export default function StudioAnalyticsClient({
  initialData,
  initialDays,
}: {
  initialData: FunnelAnalyticsDto;
  initialDays: FunnelDays;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const daysParam = Number(searchParams.get("days") || initialDays);
  const days: FunnelDays = isFunnelDays(daysParam) ? daysParam : 30;

  const [data, setData] = useState<FunnelAnalyticsDto | null>(
    days === initialDays ? initialData : null
  );
  const [loading, setLoading] = useState(days !== initialDays);
  const [error, setError] = useState(false);

  const load = useCallback(async (range: FunnelDays) => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/studio/analytics/funnel?days=${range}`);
      if (!res.ok) throw new Error("failed");
      setData((await res.json()) as FunnelAnalyticsDto);
    } catch {
      setError(true);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (days === initialDays) {
      setData(initialData);
      setLoading(false);
      setError(false);
      return;
    }
    void load(days);
  }, [days, initialDays, initialData, load]);

  const setDays = (next: FunnelDays) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("days", String(next));
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="page-shell">
      <div className="page-header flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="text-muted-foreground">
            Plays, page views, checkouts, and paid conversions by source.
          </p>
        </div>
        <div className="flex gap-2" role="group" aria-label="Date range">
          {FUNNEL_DAYS.map((range) => (
            <Button
              key={range}
              size="sm"
              variant={days === range ? "default" : "outline"}
              onClick={() => setDays(range)}
              aria-pressed={days === range}
            >
              {range}d
            </Button>
          ))}
        </div>
      </div>

      {error && (
        <Card className="mb-8 border-destructive/40">
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <p className="text-sm text-muted-foreground">Could not load analytics.</p>
            <Button size="sm" onClick={() => void load(days)}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {loading && <AnalyticsSkeleton />}
      {!loading && data && <StudioAnalyticsBody data={data} />}
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </>
  );
}
