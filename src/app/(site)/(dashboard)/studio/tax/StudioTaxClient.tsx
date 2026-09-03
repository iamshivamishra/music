"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  Calculator, Download, FileSpreadsheet, FileText, IndianRupee, Loader2, Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { TaxSummary } from "@/lib/serializers/tax";

interface Props {
  summary: TaxSummary;
  currentYear: number;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export default function StudioTaxClient({ summary, currentYear }: Props) {
  const router = useRouter();
  const [downloading, setDownloading] = useState<string | null>(null);

  const years = Array.from({ length: currentYear - 2023 }, (_, i) => 2024 + i);

  const onMonthChange = (year: number, month: number) => {
    router.push(`/studio/tax?year=${year}&month=${month}`);
  };

  const download = async (format: "csv" | "payouts-csv" | "pdf" | "zip") => {
    setDownloading(format);
    try {
      const res = await fetch(
        `/api/studio/tax?year=${summary.year}&month=${summary.month}&format=${format}`
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Download failed" }));
        toast.error(err.error || "Download failed");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      a.href = url;
      a.download = match?.[1] ?? `trishul-tax.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Download failed");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="page-header">
        <h1 className="page-title">Tax</h1>
        <p className="text-muted-foreground">
          Monthly sales and payout statement for your records ({summary.timezone}).
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => e.preventDefault()}>
        <div className="space-y-1.5">
          <Label htmlFor="tax-year">Year</Label>
          <select
            id="tax-year"
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={summary.year}
            onChange={(e) => onMonthChange(Number(e.target.value), summary.month)}
          >
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tax-month">Month</Label>
          <select
            id="tax-month"
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={summary.month}
            onChange={(e) => onMonthChange(summary.year, Number(e.target.value))}
          >
            {MONTHS.map((label, index) => (
              <option key={label} value={index + 1}>{label}</option>
            ))}
          </select>
        </div>
      </form>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {summary.monthLabel} activity
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard title="Sales" value={String(summary.monthActivity.salesCount)} icon={FileSpreadsheet} />
          <SummaryCard title="GMV (your share)" value={formatInr(summary.monthActivity.gmv)} icon={IndianRupee} />
          <SummaryCard title="GST (informational)" value={formatInr(summary.monthActivity.gstAmount)} icon={Calculator} />
          <SummaryCard title="Est. fee on month GMV" value={formatInr(summary.monthActivity.estimatedFee)} icon={Calculator} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {summary.monthActivity.payoutsCompletedCount} payouts completed this month
          {" · "}
          net sent {formatInr(summary.monthActivity.payoutsNet)}
        </p>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Lifetime snapshot (matches Payouts)
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard title="Gross earnings" value={formatInr(summary.lifetime.grossEarnings)} icon={IndianRupee} />
          <SummaryCard title={`Platform fee (${summary.lifetime.feePercent}%)`} value={formatInr(summary.lifetime.platformFee)} icon={Calculator} />
          <SummaryCard title="Payouts (net sent)" value={formatInr(summary.lifetime.totalPayouts)} icon={Wallet} />
          <SummaryCard title="Withdrawable now" value={formatInr(summary.lifetime.withdrawable)} icon={Wallet} accent />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{summary.feeNote}</p>
      </div>

      {summary.overflow && (
        <p role="status" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          This month has more than 10,000 sales. CSV and ZIP are unavailable; the summary PDF still uses full-month totals.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <DownloadButton label="Sales CSV" format="csv" downloading={downloading} onClick={download} disabled={summary.overflow} icon={FileSpreadsheet} />
        <DownloadButton label="Payouts CSV" format="payouts-csv" downloading={downloading} onClick={download} icon={FileSpreadsheet} />
        <DownloadButton label="Summary PDF" format="pdf" downloading={downloading} onClick={download} icon={FileText} />
        <DownloadButton label="Full pack (ZIP)" format="zip" downloading={downloading} onClick={download} disabled={summary.overflow} icon={Download} />
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/80 p-4 text-sm text-muted-foreground">
        {summary.disclaimer}
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string;
  icon: typeof IndianRupee;
  accent?: boolean;
}) {
  return (
    <Card className={`rounded-2xl border-border/50 bg-card/80 ${accent ? "border-primary/30 bg-primary/5" : ""}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${accent ? "text-primary" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function DownloadButton({
  label,
  format,
  downloading,
  onClick,
  disabled,
  icon: Icon,
}: {
  label: string;
  format: "csv" | "payouts-csv" | "pdf" | "zip";
  downloading: string | null;
  onClick: (format: "csv" | "payouts-csv" | "pdf" | "zip") => void;
  disabled?: boolean;
  icon: typeof Download;
}) {
  const busy = downloading === format;
  return (
    <Button variant="outline" size="sm" onClick={() => onClick(format)} disabled={disabled || !!downloading}>
      {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icon className="mr-2 h-4 w-4" />}
      {label}
    </Button>
  );
}
