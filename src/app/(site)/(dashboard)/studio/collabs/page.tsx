import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireFeaturePage } from "@/lib/require-feature-page";
import StudioCollabsClient from "@/features/studio/collabs/StudioCollabsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Collaborators — Studio",
  robots: { index: false },
};

export default async function StudioCollabsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "producer" && session.user.role !== "admin") {
    redirect("/");
  }
  requireFeaturePage("collabSplits");

  return <StudioCollabsClient />;
}
