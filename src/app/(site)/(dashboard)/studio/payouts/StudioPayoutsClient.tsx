"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Wallet,
  IndianRupee,
  ArrowUpRight,
  Loader2,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
} from "lucide-react";
import type { IPayout, PayoutStatus } from "@/types";
import PayoutForm from "@/components/PayoutForm";

interface BalanceInfo {
  grossEarnings: number;
  totalPayouts: number;
  platformFee: number;
  withdrawable: number;
  feePercent: number;
}

interface Props {
  balance: BalanceInfo;
  payouts: IPayout[];
  total: number;
  page: number;
  totalPages: number;
}

const STATUS_CONFIG: Record<PayoutStatus, { label: string; icon: typeof CheckCircle; className: string }> = {
  requested: { label: "Requested", icon: Clock, className: "bg-yellow-500/10 text-yellow-600" },
  processing: { label: "Processing", icon: Loader2, className: "bg-blue-500/10 text-blue-600" },
  completed: { label: "Completed", icon: CheckCircle, className: "bg-green-500/10 text-green-600" },
  failed: { label: "Failed", icon: XCircle, className: "bg-destructive/10 text-destructive" },
};

function StatusBadge({ status }: { status: PayoutStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <Badge variant="secondary" className={`gap-1 ${config.className}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

export default function StudioPayoutsClient({ balance, payouts, total, page, totalPages }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Payouts</h1>
        <p className="text-sm text-muted-foreground">
          Withdraw your earnings to UPI or bank account. Totals include collab shares from other people&apos;s beats.
        </p>
      </div>

      {/* Balance cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border-border/50 bg-card/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Earnings
            </CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">₹{balance.grossEarnings.toLocaleString("en-IN")}</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50 bg-card/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Platform Fee ({balance.feePercent}%)
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-muted-foreground">
              ₹{balance.platformFee.toLocaleString("en-IN")}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50 bg-card/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Withdrawn
            </CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">₹{balance.totalPayouts.toLocaleString("en-IN")}</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-primary/30 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-primary">
              Available to Withdraw
            </CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              ₹{balance.withdrawable.toLocaleString("en-IN")}
            </p>
            <Button
              size="sm"
              className="mt-3 w-full"
              disabled={balance.withdrawable < 100}
              onClick={() => setShowForm(true)}
            >
              Withdraw
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Payout form dialog */}
      <PayoutForm
        open={showForm}
        onClose={() => setShowForm(false)}
        maxAmount={balance.withdrawable}
        feePercent={balance.feePercent}
        onSuccess={() => {
          setShowForm(false);
          router.refresh();
        }}
      />

      {/* Payout history */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Payout History</h2>
        {payouts.length === 0 ? (
          <div className="rounded-2xl border border-border/50 bg-card/70 p-8 text-center text-muted-foreground">
            No payouts yet. Request your first withdrawal above.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border/50 bg-card/70">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Fee</th>
                  <th className="px-4 py-3">Net</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p._id.toString()} className="border-b border-border/30 last:border-0">
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">₹{p.amount.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 text-muted-foreground">₹{p.platformFee.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 font-semibold">₹{p.netAmount.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3">
                      {p.method === "upi" ? "UPI" : "Bank Transfer"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                      {p.failureReason && (
                        <p className="mt-1 text-xs text-destructive">{p.failureReason}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => router.push(`/studio/payouts?page=${page - 1}`)}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => router.push(`/studio/payouts?page=${page + 1}`)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
