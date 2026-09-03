import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireFeaturePage } from "@/lib/require-feature-page";
import { crmService } from "@/lib/services/crm.service";
import { listCustomersQuerySchema } from "@/lib/validators/crm";
import StudioCustomersClient from "@/features/studio/customers/StudioCustomersClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Studio — Customers" };

interface Props {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function StudioCustomersPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "producer" && session.user.role !== "admin") {
    redirect("/");
  }
  requireFeaturePage("buyerCrm");

  const params = await searchParams;
  const query = listCustomersQuerySchema.parse({
    page: params.page,
    q: params.q,
  });

  const result = await crmService.listCustomers(session.user.id, query);

  return (
    <StudioCustomersClient
      customers={result.data}
      pagination={{
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        hasNext: result.hasNext,
        hasPrev: result.hasPrev,
      }}
      query={query.q ?? ""}
    />
  );
}
