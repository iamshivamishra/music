# 03 — License PDF + GST Receipt

**Priority:** P0 (launch blocker)
**Timeline:** Week 2–3
**Why:** The only reason a buyer should leave WhatsApp/Instagram for Trishul is a real license. Currently, license terms are just a text string on the model. No downloadable contract, no invoice. Competitors generate license PDFs on every purchase.

---

## Current State

- `ILicense.terms` is a string (e.g., "WAV + MP3 files. Commercial use allowed. Up to 50,000 streams.")
- `IPurchase` records the licenseType, amount, orderId, paymentId
- `IOrder` has a receipt string and razorpayPaymentId
- No PDF generation anywhere in the codebase
- No GST/tax calculation
- `emailService` exists (Resend) but only sends password reset and contact notifications

## Competitive Bar

| Platform | License document |
|----------|-----------------|
| BeatStars | Downloadable license PDF per purchase. Creator Rights Agency for disputes. |
| Airbit | License contracts with Content ID integration. |
| Traktrain | Custom contracts downloadable. |
| Instagram + UPI | Nothing. Handshake only. |

## Goal

Every purchase generates a license PDF (downloadable from profile + emailed). Orders include a GST-compliant invoice if the platform is GST-registered.

---

## Implementation Plan

### Phase 1: PDF generation library

**Decision:** Use a lightweight server-side PDF library. Options:
- **`@react-pdf/renderer`** — React components to PDF. Good for branded documents.
- **`pdfkit`** — Low-level, no React dependency. Lighter.
- **`jspdf`** — Browser-focused, can run server-side.

**Recommendation:** `@react-pdf/renderer` — aligns with the React stack, allows branded templates.

**Install:**
```bash
npm install @react-pdf/renderer
```

### Phase 2: License PDF template

**Files to create:**

- `src/lib/pdf/license-template.tsx` — React PDF component:
  ```
  Props:
    purchaseId: string
    buyerName: string
    buyerEmail: string
    producerName: string
    beatTitle: string
    beatId: string
    licenseType: "basic" | "premium" | "unlimited" | "exclusive"
    licenseName: string
    licenseTerms: string
    features: { includesWav, includesStems, commercialUse, streamLimit }
    price: number
    currency: "INR"
    orderId: string
    paymentId: string
    purchaseDate: Date
    platformName: "Trishul Beats"
    platformUrl: string
  ```
  Template sections:
  1. Header with Trishul Beats branding
  2. "Beat License Agreement" title
  3. Parties: Licensor (producer) and Licensee (buyer)
  4. Beat details: title, genre, BPM, key
  5. License tier and terms (from license.terms)
  6. Rights granted: stream limit, WAV/stems, commercial use
  7. Restrictions: credit requirements, exclusivity clause
  8. Payment confirmation: amount, order ID, payment ID, date
  9. Unique license ID / verification hash
  10. Footer: "Verify at trishulbeats.com/verify-license/{hash}"

### Phase 3: Invoice template (GST)

**Files to create:**

- `src/lib/pdf/invoice-template.tsx` — React PDF component:
  ```
  Sections:
  1. Platform GST details (GSTIN, address)
  2. Buyer details
  3. Line items (beat title, license type, price)
  4. Tax breakup: base amount + IGST/CGST+SGST (18% for digital services)
  5. Total
  6. Invoice number (sequential or receipt-based)
  7. Payment reference (Razorpay payment ID)
  ```

- Environment variables:
  ```
  PLATFORM_GSTIN=
  PLATFORM_LEGAL_NAME=
  PLATFORM_ADDRESS=
  GST_RATE=18
  ```

### Phase 4: Generation service

**Files to create:**

- `src/lib/services/pdf.service.ts`:
  - `generateLicensePdf(purchaseId)`: fetches purchase → beat → license → producer → buyer, renders PDF, returns Buffer
  - `generateInvoicePdf(orderId)`: fetches order → items → buyer, renders PDF, returns Buffer
  - `generateVerificationHash(purchaseId)`: SHA-256 of purchase details for verification URL

**Files to modify:**

- `src/lib/services/payment.service.ts` — after successful payment verification:
  - Call `pdfService.generateLicensePdf()` for each purchase
  - Optionally store PDF in S3 under `licenses/{purchaseId}.pdf`
  - Store S3 key on Purchase model

- `src/lib/models/Purchase.ts`:
  - Add `licensePdfKey?: string` field
  - Add `verificationHash?: string` field

### Phase 5: API routes

**Files to create:**

- `src/app/api/purchases/[id]/license-pdf/route.ts` — GET: auth check → generate or serve cached PDF
- `src/app/api/orders/[id]/invoice/route.ts` — GET: auth check → generate invoice PDF
- Modify `src/app/api/licenses/verify/route.ts` (already exists) — verify by hash

### Phase 6: UI integration

**Files to modify:**

- `src/app/(dashboard)/profile/page.tsx` — add "Download License" button next to each purchase
- `src/components/DownloadPanel.tsx` — add "License Agreement (PDF)" as a download link
- `src/app/(dashboard)/profile/verify-license/page.tsx` (already exists) — connect to verification hash

---

## Security Considerations

- License PDFs should only be accessible to the buyer and the producer
- Verification hash allows public verification without exposing PII
- Invoice generation requires platform GST registration to be legally valid
- PDF generation is CPU-intensive — cache generated PDFs in S3

## Edge Cases

- Purchase with no active license (license deleted after purchase) → use snapshot data from purchase
- Multiple items in one order → one invoice, multiple license PDFs
- Exclusive purchase → license PDF should state exclusive rights clearly

## Testing

- Unit: PDF content verification (mock render, check text inclusion)
- Integration: purchase → PDF generation → S3 storage → download
- Visual: manual review of generated PDFs for formatting

## Estimated Effort

- PDF library setup + license template: 2 days
- Invoice template + GST logic: 1 day
- Service layer + S3 caching: 1 day
- API routes + UI buttons: 1 day
- Testing: 1 day
- **Total: ~6 days**
