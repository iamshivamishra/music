import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireFeaturePage } from "@/lib/require-feature-page";
import { offerService } from "@/lib/services/offer.service";
import { beatService } from "@/lib/services/beat.service";
import StudioOffersClient from "@/features/studio/offers/StudioOffersClient";
import { serializeLean } from "@/lib/serializers/lean";
import type { OfferListTab } from "@/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Studio — Offers" };

const TABS: OfferListTab[] = ["requests", "open", "closed"];

interface Props {
  searchParams: Promise<{ tab?: string; page?: string; beatId?: string }>;
}

export default async function StudioOffersPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "producer" && session.user.role !== "admin") {
    redirect("/");
  }
  requireFeaturePage("customOffers");

  const params = await searchParams;
  const tab = TABS.includes(params.tab as OfferListTab)
    ? (params.tab as OfferListTab)
    : "open";
  const page = parseInt(params.page || "1", 10);

  const [result, beats] = await Promise.all([
    offerService.list(session.user.id, tab, page, 20),
    beatService.listOfferableByProducer(session.user.id),
  ]);

  return (
    <StudioOffersClient
      offers={serializeLean(result.data)}
      beats={beats}
      pagination={{
        page: result.page,
        totalPages: result.totalPages,
        total: result.total,
        hasNext: result.hasNext,
        hasPrev: result.hasPrev,
      }}
      currentTab={tab}
      initialBeatId={params.beatId}
    />
  );
}
