# 22 — Custom Beat & Mixing Services

**Priority:** P4 (differentiation)
**Timeline:** Week 17–18
**Why:** A large share of Indian producer income is **work for hire** ("make me a beat this week", mixing/mastering), not lease catalogs. BeatStars is a catalog. Instagram is a freelance inbox. Listing a service with a brief, deposit, and delivery date is a category BeatStars will not copy quickly — and it keeps GMV on Trishul.

---

## Current State

- Products are beats and beat packs only.
- Cart/order items: `beatId` / `packId` + license.
- No service listing, brief, milestone, or file delivery except beat entitlements.
- Payouts assume `Purchase.producerId` + amount from licenses.
- Upload/storage is S3 entitlements for masters/stems — reusable for delivery ZIPs.

## Competitive Bar

| Platform | Services |
|----------|----------|
| BeatStars | No real custom-beat workflow |
| Fiverr / Instagram | The actual market — messy, no license PDF |
| SoundBetter | Mixing marketplace (global, USD) |
| Trishul | None |

## Goal

Producer publishes 1–3 **services** (custom beat, mixing, mastering) with a starting price and turnaround days. Buyer submits a brief + 20–100% deposit via Razorpay. Producer accepts → in-progress → delivers files via signed download. Remaining balance before files unlock (or full pay upfront — producer choice). License PDF optional for custom beat (reuse plan 03 template with type `work_for_hire`).

v1 is **not** a messaging product. Use existing WhatsApp inquire for chat; the app holds money and files.

---

## Implementation Plan

### Phase 1: Listings (1.5 days)

```
IServiceListing {
  producerId: ObjectId
  type: "custom_beat" | "mixing" | "mastering" | "other"
  title: string
  description: string
  startingPrice: number
  depositPercent: 20 | 50 | 100
  turnaroundDays: number
  extras?: { name: string; price: number }[]  // max 5
  isPublished: boolean
  status: "draft" | "published" | "paused"
}
```

- Model, repository, `serviceListing.service.ts`, validators
- Studio CRUD: `src/app/(dashboard)/studio/services/`
- Public: section on producer profile + `/services/[id]` PDP (brief form)
- Max 10 listings per producer

### Phase 2: Brief + job (2 days)

```
IServiceJob {
  listingId, producerId
  buyerId?: ObjectId
  guestEmail?: string
  status: "pending_deposit" | "awaiting_acceptance" | "in_progress"
        | "delivered" | "revision_requested" | "completed"
        | "cancelled" | "disputed"
  brief: { referencesUrl?: string; notes: string; bpm?: number; genre?: string; duePreference?: string }
  extras: ObjectId[] or names snapshot
  quotedTotal: number
  depositAmount: number
  balanceAmount: number
  depositOrderId?: ObjectId
  balanceOrderId?: ObjectId
  deliveryKey?: string          // S3 key
  revisionCount: number         // max 2 in v1
  acceptBy?: Date               // auto-cancel if producer ignores
}
```

Buyer flow: listing → brief → Razorpay for deposit → job `awaiting_acceptance`.

Producer: Accept (timer 72h) or decline (refund deposit — see payments). Decline must call Razorpay refund API (new; payments currently have fail/webhook but confirm refund helper).

### Phase 3: Payments (2 days)

- Extend `IOrderItem` with `serviceJobId` + `kind: "service_deposit" | "service_balance"`
- Fulfillment: **do not** create a beat `Purchase`. Create/update `ServiceJob` payment fields only.
- `producerId` on a new `ServicePayment` or reuse Purchase with `sourceType: "service"` and no beatId — **prefer a dedicated `ServicePayment` collection** so earnings queries in plan 01 don't treat deposits as beat GMV incorrectly.

**Earnings:** deposits should hit withdrawable **only after producer accepts**. Balance hits after `completed`. Platform fee same percent.

Refunds: if producer declines or `acceptBy` passes → refund deposit, job `cancelled`. Implement `paymentService.refundOrder` wrapping Razorpay refunds + webhook.

### Phase 4: Delivery (1.5 days)

- Producer uploads ZIP via existing multipart presign (`category: "service-delivery"`)
- Buyer downloads via signed GET, same pattern as `download.service.ts`
- Unlock rule: `deliveryKey` set AND (`balanceAmount === 0` OR balance order paid)
- Revision: buyer clicks "Request revision" (max 2) → status `revision_requested`; producer replaces file

### Phase 5: UI surfaces (2 days)

- Listing PDP + brief form (logged-in v1; guest can wait — or reuse guest email like plan 13)
- Studio jobs inbox: filters by status
- Buyer: `/profile/jobs` (or under library) — status + download
- Emails: new job, accepted, delivered (Resend). WhatsApp optional via plan 16 templates later
- Nav: Services (studio) + My Jobs (buyer, if any)

WhatsApp CTA on listing: "Discuss on WhatsApp" (plan 08) **in addition to** book — not instead of.

---

## Disputes (v1)

No in-app arbitration. Status `disputed` + email `CONTACT_TO_EMAIL`. Admin marks refund or complete. Document SLA (e.g. 5 business days). Do not hold all funds in escrow beyond Razorpay settlement — be honest in copy: deposit is prepaid for work.

## Security

- Delivery objects private; only job buyer or producer.
- Producer cannot access other producers' jobs.
- Brief notes max 5000 chars; references URL must be http(s).
- File type: zip only, size cap aligned with stems.

## Edge Cases

- Producer pauses listing with open jobs — jobs continue.
- Exclusive catalog beat vs custom beat — different products; custom delivery is not auto-published to marketplace.
- GST: service invoices still 18% if platform is the merchant of record (same as beats). Confirm with CA; treat as same GST invoice line type `service`.

## Testing

- Deposit → accept → balance → download happy path
- Decline refund
- Revision cap
- Earnings not counted before accept

## Estimated Effort

- Listings + jobs: 3.5 days
- Payments/refunds: 2 days
- Delivery + UI: 3.5 days
- **Total: ~9 days**

This is the heaviest P4 plan. If capacity is tight, ship **listings + WhatsApp inquire only** (Phase 1 + CTA) as 22a, and jobs/payments as 22b.
