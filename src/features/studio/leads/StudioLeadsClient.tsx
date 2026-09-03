"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Download, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StudioLeadsTable } from "@/features/studio/leads/StudioLeadsTable";
import type { StudioLeadRow } from "@/lib/serializers/lead";

interface LeadsPayload {
  data: StudioLeadRow[];
  total: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  beats: { id: string; title: string }[];
}

export default function StudioLeadsClient() {
  const [payload, setPayload] = useState<LeadsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [beatId, setBeatId] = useState("all");
  const [exporting, setExporting] = useState(false);

  const fetchLeads = useCallback(async (nextPage: number, nextBeatId: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        limit: "20",
      });
      if (nextBeatId !== "all") params.set("beatId", nextBeatId);
      const res = await fetch(`/api/studio/leads?${params.toString()}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "Failed to load leads");
      }
      const data = (await res.json()) as LeadsPayload;
      setPayload(data);
      setPage(data.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leads");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLeads(1, "all");
  }, [fetchLeads]);

  const handleBeatFilter = (value: string | null) => {
    const next = value || "all";
    setBeatId(next);
    void fetchLeads(1, next);
  };

  const exportUrl = () => {
    const params = new URLSearchParams();
    if (beatId !== "all") params.set("beatId", beatId);
    const query = params.toString();
    return query ? `/api/studio/leads/export?${query}` : "/api/studio/leads/export";
  };

  const handleCopyCsv = async () => {
    setExporting(true);
    try {
      const res = await fetch(exportUrl());
      if (!res.ok) throw new Error("Failed to export CSV");
      const csv = await res.text();
      await navigator.clipboard.writeText(csv);
      toast.success("CSV copied");
    } catch {
      toast.error("Could not copy CSV");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="page-shell max-w-6xl">
      <div className="page-header">
        <h1 className="page-title">Leads</h1>
        <p className="text-muted-foreground">
          {payload ? `${payload.total} leads from free tagged downloads` : "Loading..."}
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:max-w-xs">
          <Select value={beatId} onValueChange={(value) => value && handleBeatFilter(value)}>
            <SelectTrigger aria-label="Filter by beat">
              <SelectValue placeholder="All beats" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All beats</SelectItem>
              {(payload?.beats ?? []).map((beat) => (
                <SelectItem key={beat.id} value={beat.id}>
                  {beat.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyCsv}
            disabled={exporting || !payload || payload.total === 0}
          >
            <Copy className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Copy CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.location.assign(exportUrl())}
            disabled={!payload || payload.total === 0}
          >
            <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Download CSV
          </Button>
        </div>
      </div>

      <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="space-y-3 p-8 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button type="button" variant="outline" size="sm" onClick={() => fetchLeads(page, beatId)}>
                Retry
              </Button>
            </div>
          ) : payload && payload.data.length > 0 ? (
            <StudioLeadsTable
              rows={payload.data}
              page={payload.page}
              totalPages={payload.totalPages}
              hasPrev={payload.hasPrev}
              hasNext={payload.hasNext}
              onPrev={() => fetchLeads(page - 1, beatId)}
              onNext={() => fetchLeads(page + 1, beatId)}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 p-10 text-center">
              <Users className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
              <p className="font-medium">No leads yet</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Turn on free tagged download on a published beat to collect emails and WhatsApp numbers.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="mt-4 text-xs text-muted-foreground">
        These contacts opted in for this catalog. Do not buy third-party lists.
      </p>
    </div>
  );
}
