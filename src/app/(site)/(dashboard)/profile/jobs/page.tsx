import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireFeaturePage } from "@/lib/require-feature-page";
import { serviceJobService } from "@/lib/services/service-job.service";
import { toServiceJobDto } from "@/lib/serializers/service-job";
import { parseServiceJobListQuery } from "@/lib/validators/service-job";
import BuyerJobsClient from "@/features/services/BuyerJobsClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My Jobs" };

interface Props {
  searchParams: Promise<{ status?: string; page?: string }>;
}

export default async function BuyerJobsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requireFeaturePage("customServices");

  const query = parseServiceJobListQuery(await searchParams);
  const result = await serviceJobService.listForBuyer(
    session.user.id,
    query.status,
    query.page,
    query.limit
  );

  return <BuyerJobsClient jobs={result.data.map(toServiceJobDto)} />;
}
