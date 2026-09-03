import { beatRepository } from "@/lib/repositories/beat.repository";
import { orderRepository } from "@/lib/repositories/order.repository";
import { packRepository } from "@/lib/repositories/pack.repository";
import { payoutRepository } from "@/lib/repositories/payout.repository";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { payoutService } from "@/lib/services/payout.service";
import { withFeatureFlag } from "@/lib/assert-feature";
import { audit } from "@/lib/audit";
import { PayloadTooLargeError } from "@/lib/errors";
import { renderProducerTaxSummaryPdf } from "@/lib/pdf/producer-tax-summary";
import {
  TAX_DISCLAIMER,
  TAX_FEE_NOTE,
  toId,
  toPayoutsCsv,
  toSalesCsv,
  toTaxPayoutRow,
  toTaxSalesRow,
  type TaxMonthPack,
  type TaxSummary,
} from "@/lib/serializers/tax";
import { computeGstBreakup } from "@/lib/utils/tax";
import { formatIstMonthLabel, formatIstYearMonth, istMonthRange } from "@/lib/utils/ist";
import type { IOrder, IPayout, IPurchase } from "@/types";

export const TAX_REGISTER_LIMIT = 10_000;

export type TaxExportFormat = "csv" | "payouts-csv" | "pdf" | "zip";

export interface TaxExportResult {
  body: Buffer;
  contentType: string;
  filename: string;
}

export type { TaxMonthPack, TaxSummary };

async function lookupTitles(purchases: IPurchase[]): Promise<Map<string, string>> {
  const beatIds = [...new Set(purchases.map((p) => toId(p.beatId)).filter(Boolean))];
  const packIds = [...new Set(purchases.map((p) => toId(p.packId)).filter(Boolean))];

  const [beats, packs] = await Promise.all([
    beatRepository.findByIds(beatIds),
    packRepository.findByIds(packIds),
  ]);

  const titles = new Map<string, string>();
  for (const beat of beats) titles.set(toId(beat._id), beat.title);
  for (const pack of packs) titles.set(`pack:${toId(pack._id)}`, pack.title);
  return titles;
}

function titleFor(purchase: IPurchase, titles: Map<string, string>): string {
  if (purchase.packId) return titles.get(`pack:${toId(purchase.packId)}`) ?? "Pack";
  if (purchase.beatId) return titles.get(toId(purchase.beatId)) ?? "Beat";
  return "Sale";
}

function producerName(user: { displayName?: string; name?: string } | null): string {
  return user?.displayName || user?.name || "Producer";
}

function monthActivityFrom(
  totals: { count: number; gmv: number },
  payouts: IPayout[],
  feePercent: number,
  gstAmount: number
): TaxSummary["monthActivity"] {
  return {
    salesCount: totals.count,
    gmv: totals.gmv,
    gstAmount,
    estimatedFee: Math.round(totals.gmv * (feePercent / 100)),
    payoutsCompletedCount: payouts.length,
    payoutsAmount: payouts.reduce((sum, p) => sum + p.amount, 0),
    payoutsNet: payouts.reduce((sum, p) => sum + p.netAmount, 0),
  };
}

async function loadMonthContext(producerId: string, year: number, month: number) {
  const { from, to } = istMonthRange(year, month);
  const [totals, payouts, balance, user] = await Promise.all([
    purchaseRepository.getTaxRegisterTotals(producerId, from, to),
    payoutRepository.findCompletedInRange(producerId, from, to),
    payoutService.getBalance(producerId),
    userRepository.findById(producerId),
  ]);

  return {
    from,
    to,
    totals,
    payouts,
    balance,
    summaryBase: {
      year,
      month,
      monthLabel: formatIstMonthLabel(year, month),
      timezone: "Asia/Kolkata" as const,
      overflow: totals.count > TAX_REGISTER_LIMIT,
      producerName: producerName(user),
      lifetime: {
        grossEarnings: balance.grossEarnings,
        platformFee: balance.platformFee,
        totalPayouts: balance.totalPayouts,
        withdrawable: balance.withdrawable,
        feePercent: balance.feePercent,
      },
      disclaimer: TAX_DISCLAIMER,
      feeNote: TAX_FEE_NOTE,
    } satisfies Omit<TaxSummary, "monthActivity">,
  };
}

export const taxService = withFeatureFlag("producerTaxPack", {
  /** Totals + lifetime snapshot. Does not load the sales register. */
  async getMonthSummary(producerId: string, year: number, month: number): Promise<TaxSummary> {
    const ctx = await loadMonthContext(producerId, year, month);
    return {
      ...ctx.summaryBase,
      monthActivity: monthActivityFrom(
        ctx.totals,
        ctx.payouts,
        ctx.balance.feePercent,
        computeGstBreakup(ctx.totals.gmv).gstAmount
      ),
    };
  },

  async getMonthPack(producerId: string, year: number, month: number): Promise<TaxMonthPack> {
    const ctx = await loadMonthContext(producerId, year, month);
    const register = await purchaseRepository.getTaxRegister(
      producerId,
      ctx.from,
      ctx.to,
      TAX_REGISTER_LIMIT
    );

    const orderIds = [...new Set(register.purchases.map((p) => p.orderId).filter(Boolean))];
    const [orders, titles] = await Promise.all([
      orderRepository.findByRazorpayOrderIds(orderIds),
      lookupTitles(register.purchases),
    ]);

    const ordersByRzp = new Map<string, IOrder>();
    const ordersById = new Map<string, IOrder>();
    for (const order of orders) {
      if (order.razorpayOrderId) ordersByRzp.set(order.razorpayOrderId, order);
      ordersById.set(toId(order._id), order);
    }

    const sales = register.purchases.map((purchase) => {
      const order = ordersByRzp.get(purchase.orderId) ?? ordersById.get(purchase.orderId);
      return toTaxSalesRow(purchase, order, titleFor(purchase, titles), ctx.balance.feePercent);
    });

    const gstAmount = register.overflow
      ? computeGstBreakup(ctx.totals.gmv).gstAmount
      : sales.reduce((sum, row) => sum + row.gstAmount, 0);

    return {
      ...ctx.summaryBase,
      overflow: ctx.summaryBase.overflow || register.overflow,
      monthActivity: monthActivityFrom(ctx.totals, ctx.payouts, ctx.balance.feePercent, gstAmount),
      sales,
      payouts: ctx.payouts.map(toTaxPayoutRow),
    };
  },

  async buildExport(
    producerId: string,
    year: number,
    month: number,
    format: TaxExportFormat
  ): Promise<TaxExportResult> {
    const pack = await this.getMonthPack(producerId, year, month);
    const base = `trishul-tax-${formatIstYearMonth(year, month)}`;

    if ((format === "csv" || format === "zip") && pack.overflow) {
      throw new PayloadTooLargeError(
        "This month has more than 10,000 sales. Download the summary PDF, or contact support for a full export."
      );
    }

    audit({
      action: "tax.export",
      userId: producerId,
      resourceType: "tax",
      metadata: { year, month, format },
    });

    if (format === "csv") {
      return {
        body: Buffer.from(toSalesCsv(pack.sales), "utf8"),
        contentType: "text/csv; charset=utf-8",
        filename: `${base}-sales.csv`,
      };
    }

    if (format === "payouts-csv") {
      return {
        body: Buffer.from(toPayoutsCsv(pack.payouts), "utf8"),
        contentType: "text/csv; charset=utf-8",
        filename: `${base}-payouts.csv`,
      };
    }

    if (format === "pdf") {
      const pdf = await renderProducerTaxSummaryPdf(pack);
      return {
        body: pdf,
        contentType: "application/pdf",
        filename: `${base}-summary.pdf`,
      };
    }

    const pdf = await renderProducerTaxSummaryPdf(pack);
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    zip.file("sales.csv", toSalesCsv(pack.sales));
    zip.file("payouts.csv", toPayoutsCsv(pack.payouts));
    zip.file("summary.pdf", pdf);
    const body = await zip.generateAsync({ type: "nodebuffer" });

    return {
      body,
      contentType: "application/zip",
      filename: `${base}.zip`,
    };
  },
});
