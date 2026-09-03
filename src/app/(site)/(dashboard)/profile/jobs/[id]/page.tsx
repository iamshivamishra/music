import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireFeaturePage } from "@/lib/require-feature-page";
import { serviceJobService } from "@/lib/services/service-job.service";
import JobDetailClient from "@/features/services/JobDetailClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Job" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BuyerJobDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requireFeaturePage("customServices");
  const { id } = await params;
  try {
    const job = await serviceJobService.getDetailForUser(id, session.user.id);
    return (
      <div className="page-shell max-w-3xl">
        <JobDetailClient role="buyer" job={job} />
      </div>
    );
  } catch {
    notFound();
  }
}
