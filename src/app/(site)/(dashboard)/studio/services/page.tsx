import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireFeaturePage } from "@/lib/require-feature-page";
import { serviceListingService } from "@/lib/services/service-listing.service";
import { toStudioServiceListing } from "@/lib/serializers/service-listing";
import { parseServiceListingListQuery } from "@/lib/validators/service-listing";
import StudioServicesClient from "@/features/services/StudioServicesClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Studio — Services" };

interface Props {
  searchParams: Promise<{ status?: string; page?: string }>;
}

export default async function StudioServicesPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "producer" && session.user.role !== "admin") {
    redirect("/");
  }
  requireFeaturePage("customServices");

  const params = await searchParams;
  const query = parseServiceListingListQuery(params);
  const result = await serviceListingService.list(
    session.user.id,
    query.status,
    query.page,
    query.limit
  );

  return (
    <StudioServicesClient
      listings={result.data.map(toStudioServiceListing)}
      pagination={{
        page: result.page,
        totalPages: result.totalPages,
        total: result.total,
        hasNext: result.hasNext,
        hasPrev: result.hasPrev,
      }}
      currentStatus={query.status || "all"}
    />
  );
}
