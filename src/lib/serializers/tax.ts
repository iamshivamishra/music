import { toCsv } from "@/lib/csv";
import { computeGstBreakup } from "@/lib/utils/tax";
import { formatIstDateTime } from "@/lib/utils/ist";
import type { IOrder, IPayout, IPurchase } from "@/types";

export const TAX_DISCLAIMER =
  "Trishul Beats collects payment as the marketplace. GST invoices to buyers are issued by the platform. This pack is a statement of your sales and payouts for your records. It is not a GST return. Consult a chartered accountant for GST, TDS, and income tax.";

export const TAX_FEE_NOTE =
  "Platform fee is applied on lifetime gross earnings, not on each sale. Withdrawable = lifetime gross − fee − completed/processing payouts (net sent).";

export interface TaxSalesRow {
  saleDateIst: string;
  orderId: string;
  invoiceNumber: string;
  buyerType: "user" | "guest";
  beatOrPack: string;
  licenseType: string;
  grossInr: number;
  taxableValue: number;
  gstRate: number;
  gstAmount: number;
  gstSplit: "IGST" | "CGST+SGST";
  yourShareInr: number;
  platformFeeEst: number;
  status: string;
  notes: string;
}

export interface TaxPayoutRow {
  processedAtIst: string;
  payoutId: string;
  method: string;
  amount: number;
  platformFeeOnRequest: number;
  netAmount: number;
  status: string;
}

export interface TaxMonthActivity {
  salesCount: number;
  gmv: number;
  gstAmount: number;
  estimatedFee: number;
  payoutsCompletedCount: number;
  payoutsAmount: number;
  payoutsNet: number;
}

export interface TaxLifetimeSnapshot {
  grossEarnings: number;
  platformFee: number;
  totalPayouts: number;
  withdrawable: number;
  feePercent: number;
}

export interface TaxSummary {
  year: number;
  month: number;
  monthLabel: string;
  timezone: "Asia/Kolkata";
  overflow: boolean;
  producerName: string;
  monthActivity: TaxMonthActivity;
  lifetime: TaxLifetimeSnapshot;
  disclaimer: string;
  feeNote: string;
}

export interface TaxMonthPack extends TaxSummary {
  sales: TaxSalesRow[];
  payouts: TaxPayoutRow[];
}

const SALES_HEADERS = [
  "sale_date_ist",
  "order_id",
  "invoice_number",
  "buyer_type",
  "beat_or_pack",
  "license_type",
  "gross_inr",
  "taxable_value",
  "gst_rate",
  "gst_amount",
  "gst_split",
  "your_share_inr",
  "platform_fee_est",
  "status",
  "notes",
];

const PAYOUT_HEADERS = [
  "processed_at_ist",
  "payout_id",
  "method",
  "amount",
  "platform_fee_on_request",
  "net_amount",
  "status",
];

export function toId(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && "toString" in value) return String(value);
  return "";
}

function gstSplit(order?: IOrder): "IGST" | "CGST+SGST" {
  if (order?.gstBreakup?.cgst && order.gstBreakup?.sgst) return "CGST+SGST";
  return "IGST";
}

function salesNotes(purchase: IPurchase, order?: IOrder): string {
  const notes: string[] = [];
  if (purchase.licenseType === "exclusive") notes.push("exclusive");
  if (purchase.packId || purchase.sourceType === "pack") notes.push("pack");
  if (order?.couponCode) notes.push(`coupon:${order.couponCode}`);
  if (purchase.offerId) notes.push("offer");
  return notes.join("; ");
}

export function toTaxSalesRow(
  purchase: IPurchase,
  order: IOrder | undefined,
  title: string,
  feePercent: number
): TaxSalesRow {
  const gst = computeGstBreakup(purchase.amount);
  // Plan 23: replace with Earning.grossAmount when collab ledger exists.
  const yourShareInr = purchase.amount;

  return {
    saleDateIst: formatIstDateTime(purchase.createdAt),
    orderId: purchase.orderId,
    invoiceNumber: order?.invoiceNumber ?? "",
    buyerType: purchase.guestEmail && !purchase.buyerId ? "guest" : "user",
    beatOrPack: title,
    licenseType: purchase.licenseType ?? purchase.packTier ?? "",
    grossInr: purchase.amount,
    taxableValue: gst.baseAmount,
    gstRate: gst.gstRate,
    gstAmount: gst.gstAmount,
    gstSplit: gstSplit(order),
    yourShareInr,
    platformFeeEst: Math.round(yourShareInr * (feePercent / 100)),
    status: order?.status ?? "paid",
    notes: salesNotes(purchase, order),
  };
}

export function toTaxPayoutRow(payout: IPayout): TaxPayoutRow {
  return {
    processedAtIst: payout.processedAt ? formatIstDateTime(payout.processedAt) : "",
    payoutId: toId(payout._id),
    method: payout.method,
    amount: payout.amount,
    platformFeeOnRequest: payout.platformFee,
    netAmount: payout.netAmount,
    status: payout.status,
  };
}

export function toSalesCsv(rows: TaxSalesRow[]): string {
  return toCsv(
    SALES_HEADERS,
    rows.map((row) => [
      row.saleDateIst,
      row.orderId,
      row.invoiceNumber,
      row.buyerType,
      row.beatOrPack,
      row.licenseType,
      row.grossInr,
      row.taxableValue,
      row.gstRate,
      row.gstAmount,
      row.gstSplit,
      row.yourShareInr,
      row.platformFeeEst,
      row.status,
      row.notes,
    ])
  );
}

export function toPayoutsCsv(rows: TaxPayoutRow[]): string {
  return toCsv(
    PAYOUT_HEADERS,
    rows.map((row) => [
      row.processedAtIst,
      row.payoutId,
      row.method,
      row.amount,
      row.platformFeeOnRequest,
      row.netAmount,
      row.status,
    ])
  );
}
