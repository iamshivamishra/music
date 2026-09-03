import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { purchaseService } from "@/lib/services/purchase.service";
import PacksLibraryClient from "@/features/profile/PacksLibraryClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "My Packs" };

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function PacksLibraryPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const result = await purchaseService.getPackPurchasesPaginated(
    session.user.id,
    page,
    12
  );

  return <PacksLibraryClient data={result} currentPage={page} />;
}
