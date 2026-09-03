import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { payoutService } from "@/lib/services/payout.service";
import { serializeLean } from "@/lib/serializers/lean";
import AdminPayoutsClient from "./AdminPayoutsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin — Payouts",
};

export default async function AdminPayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/login");

  const { page: pageStr } = await searchParams;
  const page = Math.max(1, Number(pageStr ?? 1));
  const result = await payoutService.getPendingPayouts(page, 20);

  return (
    <div className="page-shell">
      <h1 className="mb-6 text-2xl font-semibold">Pending Payouts</h1>
      <AdminPayoutsClient
        payouts={serializeLean(result.data) as never}
        total={result.total}
        page={result.page}
        totalPages={result.totalPages}
      />
    </div>
  );
}
