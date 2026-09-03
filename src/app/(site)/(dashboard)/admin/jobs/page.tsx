import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireFeaturePage } from "@/lib/require-feature-page";
import { serviceJobService } from "@/lib/services/service-job.service";
import { toServiceJobDto } from "@/lib/serializers/service-job";
import { parseServiceJobListQuery } from "@/lib/validators/service-job";
import AdminJobsClient from "@/features/services/AdminJobsClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin — Disputed Jobs" };

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function AdminJobsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/login");
  requireFeaturePage("customServices");

  const query = parseServiceJobListQuery(await searchParams);
  const result = await serviceJobService.listDisputed(query.page, query.limit);

  return (
    <div className="page-shell">
      <h1 className="mb-2 text-2xl font-semibold">Disputed jobs</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        No in-app arbitration. Mark refund or complete within 5 business days.
      </p>
      <AdminJobsClient
        jobs={result.data.map(toServiceJobDto)}
        total={result.total}
        page={result.page}
        totalPages={result.totalPages}
      />
    </div>
  );
}
