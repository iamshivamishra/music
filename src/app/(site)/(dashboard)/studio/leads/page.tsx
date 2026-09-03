import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireFeaturePage } from "@/lib/require-feature-page";
import StudioLeadsClient from "@/features/studio/leads/StudioLeadsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leads — Studio",
  description: "Leads from free tagged downloads.",
};

export default async function StudioLeadsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "producer" && session.user.role !== "admin") {
    redirect("/");
  }
  requireFeaturePage("freeDownloadLeads");

  return <StudioLeadsClient />;
}
