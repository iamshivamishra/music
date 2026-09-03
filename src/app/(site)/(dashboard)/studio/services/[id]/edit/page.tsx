import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireFeaturePage } from "@/lib/require-feature-page";
import { serviceListingService } from "@/lib/services/service-listing.service";
import { toStudioServiceListing } from "@/lib/serializers/service-listing";
import ServiceListingForm from "@/features/services/ServiceListingForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Studio — Edit Service" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditServicePage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "producer" && session.user.role !== "admin") {
    redirect("/");
  }
  requireFeaturePage("customServices");

  const { id } = await params;
  let listing;
  try {
    listing = await serviceListingService.getForOwner(id, session.user.id);
  } catch {
    notFound();
  }

  return (
    <div className="page-shell max-w-2xl">
      <div className="page-header">
        <h1 className="page-title">Edit service</h1>
        <p className="page-subtitle">Update your listing. Open jobs are not affected by a pause.</p>
      </div>
      <ServiceListingForm existing={toStudioServiceListing(listing)} />
    </div>
  );
}
