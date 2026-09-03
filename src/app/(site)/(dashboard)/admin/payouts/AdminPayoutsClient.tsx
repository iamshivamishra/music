"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import type { IPayout } from "@/types";

interface Props {
  payouts: (IPayout & { producerId: { _id: string; name: string; email: string; username?: string } })[];
  total: number;
  page: number;
  totalPages: number;
}

export default function AdminPayoutsClient({ payouts, total, page, totalPages }: Props) {
  const router = useRouter();
  const [processing, setProcessing] = useState<string | null>(null);

  async function handleAction(payoutId: string, action: "approve" | "reject") {
    setProcessing(payoutId);
    try {
      const res = await fetch(`/api/admin/payouts/${payoutId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error ?? "Action failed");
      }
      router.refresh();
    } finally {
      setProcessing(null);
    }
  }

  if (payouts.length === 0) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card/70 p-8 text-center text-muted-foreground">
        No pending payouts.
      </div>
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">{total} pending payout{total !== 1 ? "s" : ""}</p>
      <div className="overflow-x-auto rounded-2xl border border-border/50 bg-card/70">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-admin-bg text-left text-xs uppercase tracking-wider text-admin-muted">
              <th className="px-4 py-3">Producer</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Fee</th>
              <th className="px-4 py-3">Net</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Details</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((p) => {
              const producer = typeof p.producerId === "object" && "name" in p.producerId
                ? p.producerId
                : null;
              return (
                <tr key={p._id.toString()} className="border-b border-border/30 last:border-0">
                  <td className="px-4 py-3 font-medium">
                    {producer?.name ?? "Unknown"}
                    {producer?.email && (
                      <span className="ml-1 text-xs text-muted-foreground">{producer.email}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">₹{p.amount.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-muted-foreground">₹{p.platformFee.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 font-semibold">₹{p.netAmount.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{p.method === "upi" ? "UPI" : "Bank"}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {p.method === "upi" ? p.upiId : p.bankDetails?.ifsc}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(p.createdAt).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-green-600 hover:bg-green-600/10"
                        onClick={() => handleAction(p._id.toString(), "approve")}
                        disabled={processing === p._id.toString()}
                      >
                        {processing === p._id.toString() ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle className="h-3.5 w-3.5" />
                        )}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-destructive hover:bg-destructive/10"
                        onClick={() => handleAction(p._id.toString(), "reject")}
                        disabled={processing === p._id.toString()}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => router.push(`/admin/payouts?page=${page - 1}`)}
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
            onClick={() => router.push(`/admin/payouts?page=${page + 1}`)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
