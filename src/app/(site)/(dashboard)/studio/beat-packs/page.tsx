import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { packService } from "@/lib/services/pack.service";
import { serializeLean } from "@/lib/serializers/lean";
import StudioPacksClient from "@/features/studio/beat-packs/StudioPacksClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Studio — Beat Packs" };

interface Props {
  searchParams: Promise<{ status?: string; page?: string }>;
}

export default async function StudioBeatPacksPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "producer" && session.user.role !== "admin") {
    redirect("/");
  }

  const params = await searchParams;
  const status = (params.status || undefined) as "draft" | "published" | "archived" | undefined;
  const page = parseInt(params.page || "1", 10);

  const result = await packService.listByProducer(session.user.id, status, page, 20);

  return (
    <StudioPacksClient
      packs={serializeLean(result.data)}
      pagination={{
        page: result.page,
        totalPages: result.totalPages,
        total: result.total,
        hasNext: result.hasNext,
        hasPrev: result.hasPrev,
      }}
      currentStatus={status || "all"}
    />
  );
}
