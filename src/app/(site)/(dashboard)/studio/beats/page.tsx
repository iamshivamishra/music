import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { beatService } from "@/lib/services/beat.service";
import StudioBeatsClient from "@/features/studio/beats/StudioBeatsClient";
import type { BeatStatus } from "@/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Studio — My Beats" };

interface Props {
  searchParams: Promise<{ status?: string; page?: string }>;
}

export default async function StudioBeatsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "producer" && session.user.role !== "admin") {
    redirect("/");
  }

  const params = await searchParams;
  const status = (params.status || undefined) as BeatStatus | undefined;
  const page = parseInt(params.page || "1", 10);

  const { beatsWithExtras, stats, earnings, pagination } =
    await beatService.getStudioBeatsPageData(session.user.id, status, page, 20);

  return (
    <StudioBeatsClient
      beats={beatsWithExtras}
      stats={stats}
      earnings={earnings}
      pagination={pagination}
      currentStatus={status || "all"}
    />
  );
}
