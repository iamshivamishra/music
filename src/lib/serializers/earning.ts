import type { EarningSaleRecord, MonthlyRevenueRaw } from "@/lib/repositories/earning.repository";

export interface ProducerSaleRow {
  purchaseId: string;
  beatTitle: string;
  beatId: string;
  licenseType: string;
  amount: number;
  shareAmount: number;
  sharePercent: number;
  isCollab: boolean;
  buyerName: string;
  createdAt: Date;
}

export function toProducerSaleRow(
  row: EarningSaleRecord,
  producerId: string
): ProducerSaleRow {
  return {
    purchaseId: row.purchaseId,
    beatTitle: row.beatTitle || "Pack Purchase",
    beatId: row.beatId,
    licenseType: row.licenseType,
    amount: row.amount,
    shareAmount: row.shareAmount,
    sharePercent: row.sharePercent,
    isCollab: row.ownerProducerId !== producerId,
    buyerName: row.buyerName ?? "",
    createdAt: row.createdAt,
  };
}

export function fillMonthlyRevenue(
  rows: MonthlyRevenueRaw[],
  months: number
): { month: string; revenue: number; sales: number }[] {
  const byKey = new Map(
    rows.map((row) => [`${row.year}-${row.month}`, row])
  );
  const all: { month: string; revenue: number; sales: number }[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const found = byKey.get(`${year}-${month}`);
    all.push({
      month: `${date.toLocaleString("default", { month: "short" })} ${year}`,
      revenue: found?.revenue ?? 0,
      sales: found?.sales ?? 0,
    });
  }

  return all;
}
