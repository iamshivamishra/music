# 25 — Producer GST / Tax Pack

**Priority:** P4 (differentiation)
**Timeline:** Week 19–20
**Deps:** [03 License PDF + GST Receipt](./03-license-pdf-gst.md) (buyer invoices, `gstBreakup`, `PLATFORM_GSTIN`); [01 Payouts](./01-producer-payouts.md) (fee, withdrawable).
**Why:** BeatStars will never care about GSTR-1. Indian producers (and their CAs) will. You already invoice the **buyer** as the platform merchant of record. Producers still need a monthly pack: sales CSV, platform fee, payouts, and a summary they can hand to a CA. This is a moat, not a clone.

---

## Current State

- Orders store `invoiceNumber`, `invoicePdfKey`, `gstBreakup` (`baseAmount`, `gstRate`, `gstAmount`, IGST/CGST/SGST).
- Buyer can download invoice (`/api/orders/[id]/invoice`) and license PDF.
- Platform GSTIN is env (`PLATFORM_GSTIN`, `PLATFORM_LEGAL_NAME`, `PLATFORM_ADDRESS`, `GST_RATE=18`).
- Producer has **no** GSTIN on User. Studio sales table is not tax-ready (no HSN, no invoice numbers per producer).
- Payouts: gross, platform fee %, net to UPI/bank. No monthly statement PDF.

Legal reality (document in-product, not as legal advice): if Trishul is merchant of record, GST on the beat sale is typically the **platform's** output tax. The producer receives a net payout that may be treated as consideration for supply of content to the platform. **A CA must confirm** treatment (TDS 194O, GTA, etc.). The product delivers **books-ready data**, not filed returns.

---

## Goal

Studio → Tax: pick a month (IST). Download:

1. **Sales register CSV** — one row per purchase of this producer's catalog (and collab earnings if plan 23 exists)
2. **Payouts CSV** — withdrawals that month
3. **Summary PDF** — GMV, GST collected by platform (informational), platform fee, net payouts, opening/closing withdrawable

Optional: producer GSTIN on profile for **their** invoices to Trishul later (v1.1). v1 is export only.

---

## Implementation Plan

### Phase 1: Producer tax profile (0.5 day)

```
IUser.taxProfile?: {
  gstin?: string;          // 15-char, optional
  pan?: string;            // optional, masked in UI
  legalName?: string;
  stateCode?: string;      // GST state
  isComposition?: boolean;
}
```

- Validator: GSTIN checksum if present (regex + checksum algorithm)
- Edit profile: "Tax details (optional, for your CA)"
- Never show PAN on public profile

### Phase 2: Sales register query (1.5 days)

`purchaseRepository.getTaxRegister(producerId, from, to)` — `from/to` as IST calendar month converted to UTC Date.

CSV columns:

| column | source |
|--------|--------|
| sale_date_ist | createdAt |
| order_id | orderId |
| invoice_number | Order.invoiceNumber |
| buyer_type | user / guest |
| beat_or_pack | title |
| license_type | |
| gross_inr | amount (tax-inclusive) |
| taxable_value | gstBreakup.baseAmount if available, else reverse-calc |
| gst_rate | |
| gst_amount | |
| gst_split | IGST or CGST+SGST |
| your_share_inr | full amount, or Earning.grossAmount if plan 23 |
| platform_fee_est | share × fee % **at payout policy** — label as estimate |
| notes | exclusive / pack / offer / refund |

Join Order for invoice + gst breakup (batch by orderId).

Refunds: if order `refunded`, include a negative row if you store refunds; else a `status` column.

### Phase 3: Payouts + fee reconciliation (1 day)

- List payouts with `processedAt` in month, status completed
- Summary math:
  - Gross sales (your share)
  - Estimated platform fee (same formula as `payoutService` — founding override)
  - Payouts completed
  - Closing balance = current withdrawable (snapshot at download time, printed)

Be explicit: **"Fee is recognized on payout, not on each sale"** if that matches code (`getBalance` applies fee on gross earnings, not per payout only — **verify against `payout.service.ts`**). Current code: `platformFee = grossEarnings * feePercent`, withdrawable = gross − fee − payouts. Summary PDF must use **that** formula so numbers match the dashboard.

### Phase 4: CSV + PDF export (2 days)

- `src/lib/services/tax.service.ts` — `getMonthPack(producerId, year, month)`
- `src/lib/pdf/producer-tax-summary.ts` — PDFKit or existing `@react-pdf/renderer` pattern from plan 03
- CSV via `src/lib/csv.ts` helper (escape quotes)
- `GET /api/studio/tax?year=2026&month=9&format=csv|pdf|zip`
  - `zip` = sales.csv + payouts.csv + summary.pdf
- Auth: producer session; audit log `tax.export`

Studio UI: `src/app/(dashboard)/studio/tax/page.tsx`

- Month picker
- Live totals (same as zip)
- Download buttons
- Disclaimer block (CA / merchant of record)

Nav: Tax in the three layout files.

### Phase 5: Admin / platform pack (optional, 1 day)

Not v1 unless needed for finance: admin export all GMV by month. Skip to keep producer-only.

---

## Disclaimer copy (must ship in UI)

> Trishul Beats collects payment as the marketplace. GST invoices to buyers are issued by the platform. This pack is a statement of your sales and payouts for your records. It is not a GST return. Consult a chartered accountant for GST, TDS, and income tax.

## Security

- GSTIN/PAN are PII — don't log. PAN masked except last 4 in UI.
- Export rate limit: 10/day/producer.
- Zip built in memory only for typical months; stream if row count > 10k (paginate CSV).

## Edge Cases

- Month with zero sales — still allow payouts CSV + empty sales + summary
- Founding fee 0% — show 0
- Guest buyers — "Guest" in buyer_type, no name required
- Collab share — `your_share_inr` from Earning; don't double-count owner gross
- Timezone: **Asia/Kolkata** month boundaries

## Testing

- IST month boundary (sale at 11:30pm IST last day)
- Numbers match dashboard withdrawable formula
- GSTIN validator
- Producer isolation

## Estimated Effort

- Profile + register query: 2 days
- PDF/CSV/zip + UI: 2.5 days
- Disclaimer + tests: 0.5 day
- **Total: ~5 days**
