"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { JobStatusBadge } from "@/features/services/JobStatusBadge";
import type { ServiceJobDto } from "@/lib/serializers/service-job";

interface Props {
  jobs: ServiceJobDto[];
  total: number;
  page: number;
  totalPages: number;
}

export default function AdminJobsClient({ jobs, total, page, totalPages }: Props) {
  const router = useRouter();
  const [processing, setProcessing] = useState<string | null>(null);

  async function handleAction(jobId: string, action: "refund" | "complete") {
    setProcessing(jobId);
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        alert(err?.error ?? "Action failed");
      }
      router.refresh();
    } finally {
      setProcessing(null);
    }
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card/70 p-8 text-center text-muted-foreground">
        No disputed jobs.
      </div>
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        {total} disputed job{total !== 1 ? "s" : ""}
      </p>
      <div className="overflow-x-auto rounded-2xl border border-border/50 bg-card/70">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-admin-bg text-left text-xs uppercase tracking-wider text-admin-muted">
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id} className="border-b border-border/30 last:border-0">
                <td className="px-4 py-3 font-medium">{job.listingTitle}</td>
                <td className="px-4 py-3">₹{job.quotedTotal.toLocaleString("en-IN")}</td>
                <td className="px-4 py-3">
                  <JobStatusBadge status={job.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={processing === job.id}
                      onClick={() => handleAction(job.id, "complete")}
                    >
                      Complete
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={processing === job.id}
                      onClick={() => handleAction(job.id, "refund")}
                    >
                      Refund
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <p className="mt-4 text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </p>
      )}
    </div>
  );
}
