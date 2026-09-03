import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { couponService } from "@/lib/services/coupon.service";
import { serializeLean } from "@/lib/serializers/lean";
import StudioCouponsClient from "@/features/studio/coupons/StudioCouponsClient";
import type { CouponStatus } from "@/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Studio — Coupons" };

interface Props {
  searchParams: Promise<{ status?: string; page?: string; email?: string }>;
}

export default async function StudioCouponsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "producer" && session.user.role !== "admin") {
    redirect("/");
  }

  const params = await searchParams;
  const status = (params.status || undefined) as CouponStatus | undefined;
  const page = parseInt(params.page || "1", 10);

  const result = await couponService.list(session.user.id, status, page, 20);

  return (
    <StudioCouponsClient
      coupons={serializeLean(result.data)}
      pagination={{
        page: result.page,
        totalPages: result.totalPages,
        total: result.total,
        hasNext: result.hasNext,
        hasPrev: result.hasPrev,
      }}
      currentStatus={status || "all"}
      prefillEmail={params.email}
    />
  );
}
