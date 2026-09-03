import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireFeaturePage } from "@/lib/require-feature-page";
import { serviceJobService } from "@/lib/services/service-job.service";
import { toServiceJobDto } from "@/lib/serializers/service-job";
import { parseServiceJobListQuery } from "@/lib/validators/service-job";
import StudioJobsClient from "@/features/services/StudioJobsClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Studio — Jobs" };

interface Props {
  searchParams: Promise<{ status?: string; page?: string }>;
}

export default async function StudioJobsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "producer" && session.user.role !== "admin") {
    redirect("/");
  }
  requireFeaturePage("customServices");

  const query = parseServiceJobListQuery(await searchParams);
  const result = await serviceJobService.listForProducer(
    session.user.id,
    query.status,
    query.page,
    query.limit
  );

  return (
    <StudioJobsClient
      jobs={result.data.map(toServiceJobDto)}
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
