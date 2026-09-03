"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  SERVICE_TYPE_LABELS,
  type StudioServiceListingDto,
} from "@/lib/serializers/service-listing";
import type { ServiceListingStatus } from "@/types";

interface Props {
  listing: StudioServiceListingDto;
  busy: boolean;
  onStatus: (listing: StudioServiceListingDto, status: ServiceListingStatus) => void;
  onDelete: (listing: StudioServiceListingDto) => void;
}

export function ServiceListingRow({ listing, busy, onStatus, onDelete }: Props) {
  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium truncate">{listing.title}</p>
          <Badge variant="outline" className="capitalize">
            {listing.status}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {SERVICE_TYPE_LABELS[listing.type]} · ₹
          {listing.startingPrice.toLocaleString("en-IN")} · {listing.depositPercent}%
          deposit · {listing.turnaroundDays} day
          {listing.turnaroundDays === 1 ? "" : "s"}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href={`/studio/services/${listing.id}/edit`}>Edit</Link>
        </Button>
        {listing.status !== "published" && (
          <Button size="sm" disabled={busy} onClick={() => onStatus(listing, "published")}>
            Publish
          </Button>
        )}
        {listing.status === "published" && (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => onStatus(listing, "paused")}
          >
            Pause
          </Button>
        )}
        <Button size="sm" variant="destructive" disabled={busy} onClick={() => onDelete(listing)}>
          Delete
        </Button>
      </div>
    </li>
  );
}
