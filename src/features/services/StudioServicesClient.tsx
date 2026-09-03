"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Briefcase, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StudioServiceListingDto } from "@/lib/serializers/service-listing";
import type { ServiceListingStatus } from "@/types";
import { ServiceListingRow } from "./ServiceListingRow";

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Drafts" },
  { value: "paused", label: "Paused" },
];

interface Props {
  listings: StudioServiceListingDto[];
  pagination: {
    page: number;
    totalPages: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  currentStatus: string;
}

export default function StudioServicesClient({
  listings,
  pagination,
  currentStatus,
}: Props) {
  const router = useRouter();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const navigateStatus = (status: string) => {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    router.push(`/studio/services?${params.toString()}`);
  };

  const navigatePage = (page: number) => {
    const params = new URLSearchParams();
    if (currentStatus !== "all") params.set("status", currentStatus);
    params.set("page", page.toString());
    router.push(`/studio/services?${params.toString()}`);
  };

  const handleStatus = async (
    listing: StudioServiceListingDto,
    status: ServiceListingStatus
  ) => {
    setActionLoading(listing.id);
    try {
      const res = await fetch(`/api/services/${listing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        toast.error(err?.error || "Failed to update status");
        return;
      }
      toast.success(status === "published" ? "Service published" : `Service ${status}`);
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (listing: StudioServiceListingDto) => {
    if (!confirm(`Delete "${listing.title}"? This cannot be undone.`)) return;
    setActionLoading(listing.id);
    try {
      const res = await fetch(`/api/services/${listing.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        toast.error(err?.error || "Failed to delete service");
        return;
      }
      toast.success("Service deleted");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="page-shell">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Services</h1>
          <p className="page-subtitle">
            Custom beats, mixing, and mastering. Buyers inquire on WhatsApp or book a deposit.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/studio/services/new">
            <Plus className="h-4 w-4" />
            New service
          </Link>
        </Button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.value}
            type="button"
            size="sm"
            variant={currentStatus === tab.value ? "default" : "outline"}
            onClick={() => navigateStatus(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {listings.length === 0 ? (
        <div className="rounded-2xl border border-border/50 bg-card/80 px-6 py-16 text-center">
          <Briefcase className="mx-auto mb-3 h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <p className="text-lg font-medium">No services yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            List a custom beat or mixing service so buyers can book work on Trishul.
          </p>
          <Button asChild className="mt-6" size="lg">
            <Link href="/studio/services/new">Create your first service</Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/80">
          <ul className="divide-y divide-border/30">
            {listings.map((listing) => (
              <ServiceListingRow
                key={listing.id}
                listing={listing}
                busy={actionLoading === listing.id}
                onStatus={handleStatus}
                onDelete={handleDelete}
              />
            ))}
          </ul>
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <Button
            size="sm"
            variant="outline"
            disabled={!pagination.hasPrev}
            onClick={() => navigatePage(pagination.page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <Button
            size="sm"
            variant="outline"
            disabled={!pagination.hasNext}
            onClick={() => navigatePage(pagination.page + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
