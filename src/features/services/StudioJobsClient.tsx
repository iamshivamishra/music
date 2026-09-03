"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ListTodo, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JobStatusBadge } from "@/features/services/JobStatusBadge";
import type { ServiceJobDto } from "@/lib/serializers/service-job";

const TABS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "awaiting_acceptance", label: "To accept" },
  { value: "in_progress", label: "In progress" },
  { value: "delivered", label: "Delivered" },
  { value: "revision_requested", label: "Revisions" },
  { value: "disputed", label: "Disputed" },
];

interface Props {
  jobs: ServiceJobDto[];
  pagination: {
    page: number;
    totalPages: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  currentStatus: string;
}

export default function StudioJobsClient({ jobs, pagination, currentStatus }: Props) {
  const router = useRouter();

  const navigate = (status: string, page?: number) => {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (page && page > 1) params.set("page", String(page));
    router.push(`/studio/jobs?${params.toString()}`);
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <h1 className="page-title">Jobs</h1>
        <p className="page-subtitle">
          Custom beat and mixing bookings. Accept within 72 hours or the deposit is refunded.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Button
            key={tab.value}
            size="sm"
            variant={currentStatus === tab.value ? "default" : "outline"}
            onClick={() => navigate(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-2xl border border-border/50 bg-card/80 px-6 py-16 text-center">
          <ListTodo className="mx-auto mb-3 h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <p className="text-lg font-medium">No jobs yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            When a buyer books one of your services, it shows up here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border/30 overflow-hidden rounded-2xl border border-border/50 bg-card/80">
          {jobs.map((job) => (
            <li key={job.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{job.listingTitle}</p>
                <p className="text-sm text-muted-foreground">
                  ₹{job.quotedTotal.toLocaleString("en-IN")} · deposit ₹
                  {job.depositAmount.toLocaleString("en-IN")}
                </p>
              </div>
              <JobStatusBadge status={job.status} />
              <Button asChild size="sm" variant="outline">
                <Link href={`/studio/jobs/${job.id}`}>Open</Link>
              </Button>
            </li>
          ))}
        </ul>
      )}

      {pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <Button
            size="sm"
            variant="outline"
            disabled={!pagination.hasPrev}
            onClick={() => navigate(currentStatus, pagination.page - 1)}
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <Button
            size="sm"
            variant="outline"
            disabled={!pagination.hasNext}
            onClick={() => navigate(currentStatus, pagination.page + 1)}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
