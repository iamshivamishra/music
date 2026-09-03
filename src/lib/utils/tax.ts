import type { IGstBreakup } from "@/types";

const DEFAULT_GST_RATE = 18;

/**
 * Compute GST breakup from a GST-inclusive total amount.
 * Defaults to IGST (inter-state); caller can override with CGST+SGST
 * when buyer state matches the platform state.
 */
export function computeGstBreakup(
  totalAmount: number,
  gstRate = parseInt(process.env.GST_RATE || String(DEFAULT_GST_RATE), 10)
): IGstBreakup {
  const baseAmount = Math.round((totalAmount * 100) / (100 + gstRate));
  const gstAmount = totalAmount - baseAmount;

  return {
    baseAmount,
    gstRate,
    gstAmount,
    igst: gstAmount,
  };
}
