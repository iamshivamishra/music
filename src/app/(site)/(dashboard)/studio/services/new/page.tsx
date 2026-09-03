import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireFeaturePage } from "@/lib/require-feature-page";
import ServiceListingForm from "@/features/services/ServiceListingForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Studio — New Service" };

export default async function NewServicePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "producer" && session.user.role !== "admin") {
    redirect("/");
  }
  requireFeaturePage("customServices");

  return (
    <div className="page-shell max-w-2xl">
      <div className="page-header">
        <h1 className="page-title">New service</h1>
        <p className="page-subtitle">
          List a custom beat, mixing, or mastering service with a starting price and turnaround.
        </p>
      </div>
      <ServiceListingForm />
    </div>
  );
}
