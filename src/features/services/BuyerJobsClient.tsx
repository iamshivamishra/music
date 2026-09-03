"use client";

import Link from "next/link";
import { Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JobStatusBadge } from "@/features/services/JobStatusBadge";
import type { ServiceJobDto } from "@/lib/serializers/service-job";

interface Props {
  jobs: ServiceJobDto[];
}

export default function BuyerJobsClient({ jobs }: Props) {
  return (
    <div className="page-shell">
      <div className="page-header">
        <h1 className="page-title">My Jobs</h1>
        <p className="page-subtitle">Custom beat and mixing bookings, status, and downloads.</p>
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-2xl border border-border/50 bg-card/80 px-6 py-16 text-center">
          <Briefcase className="mx-auto mb-3 h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <p className="text-lg font-medium">No jobs yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Book a custom service from a producer profile.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border/30 overflow-hidden rounded-2xl border border-border/50 bg-card/80">
          {jobs.map((job) => (
            <li key={job.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{job.listingTitle}</p>
                <p className="text-sm text-muted-foreground">
                  ₹{job.quotedTotal.toLocaleString("en-IN")}
                </p>
              </div>
              <JobStatusBadge status={job.status} />
              <Button asChild size="sm" variant="outline">
                <Link href={`/profile/jobs/${job.id}`}>Open</Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
