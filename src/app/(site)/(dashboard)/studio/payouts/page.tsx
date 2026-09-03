import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { payoutService } from "@/lib/services/payout.service";
import { serializeLean } from "@/lib/serializers/lean";
import StudioPayoutsClient from "./StudioPayoutsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Studio — Payouts",
};

export default async function StudioPayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "producer" && session.user.role !== "admin") redirect("/");

  const { page: pageStr } = await searchParams;
  const page = Math.max(1, Number(pageStr ?? 1));

  const [balance, history] = await Promise.all([
    payoutService.getBalance(session.user.id),
    payoutService.getPayoutHistory(session.user.id, page, 20),
  ]);

  return (
    <div className="page-shell">
      <StudioPayoutsClient
        balance={balance}
        payouts={serializeLean(history.data)}
        total={history.total}
        page={history.page}
        totalPages={history.totalPages}
      />
    </div>
  );
}
