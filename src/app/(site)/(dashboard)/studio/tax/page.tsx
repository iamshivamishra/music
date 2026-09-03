import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireFeaturePage } from "@/lib/require-feature-page";
import { taxService } from "@/lib/services/tax.service";
import { currentIstYearMonth } from "@/lib/utils/ist";
import { taxExportQuerySchema } from "@/lib/validators/tax";
import StudioTaxClient from "./StudioTaxClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Studio — Tax",
};

export default async function StudioTaxPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "producer" && session.user.role !== "admin") redirect("/");
  requireFeaturePage("producerTaxPack");

  const current = currentIstYearMonth();
  const params = await searchParams;
  const parsed = taxExportQuerySchema.safeParse({
    year: params.year ?? current.year,
    month: params.month ?? current.month,
  });
  const year = parsed.success ? parsed.data.year : current.year;
  const month = parsed.success ? parsed.data.month : current.month;

  const summary = await taxService.getMonthSummary(session.user.id, year, month);

  return (
    <div className="page-shell">
      <StudioTaxClient summary={summary} currentYear={current.year} />
    </div>
  );
}
