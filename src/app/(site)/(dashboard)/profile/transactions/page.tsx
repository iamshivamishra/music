import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { purchaseService } from "@/lib/services/purchase.service";
import TransactionsClient from "@/features/profile/TransactionsClient";
import type { OrderStatus } from "@/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Transactions" };

const VALID_STATUSES = new Set<OrderStatus>(["pending", "paid", "failed", "refunded"]);

interface Props {
  searchParams: Promise<{ page?: string; status?: string }>;
}

export default async function TransactionsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const statusParam = params.status as OrderStatus | undefined;
  const status = statusParam && VALID_STATUSES.has(statusParam) ? statusParam : undefined;

  const result = await purchaseService.getTransactionsPaginated(
    session.user.id,
    page,
    12,
    status
  );

  return <TransactionsClient data={result} currentPage={page} statusFilter={status} />;
}
