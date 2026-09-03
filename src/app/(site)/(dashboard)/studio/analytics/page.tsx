import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireFeaturePage } from "@/lib/require-feature-page";
import { analyticsService } from "@/lib/services/analytics.service";
import { funnelQuerySchema } from "@/lib/validators/analytics";
import StudioAnalyticsClient from "@/features/studio/StudioAnalyticsClient";
import StudioAnalyticsLoading from "./loading";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Analytics — Studio",
  description: "See plays, page views, checkouts, and paid conversions by traffic source.",
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ days?: string }>;
}

export default async function StudioAnalyticsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "producer" && session.user.role !== "admin") {
    redirect("/");
  }
  requireFeaturePage("sourceAnalytics");

  const params = await searchParams;
  const parsed = funnelQuerySchema.safeParse({ days: params.days });
  const days = parsed.success ? parsed.data.days : 30;
  const initialData = await analyticsService.getFunnelAnalytics(session.user.id, days);

  return (
    <Suspense fallback={<StudioAnalyticsLoading />}>
      <StudioAnalyticsClient initialData={initialData} initialDays={days} />
    </Suspense>
  );
}
