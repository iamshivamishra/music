# 18 — Custom Offers / Negotiate

**Priority:** P3 (producer depth)
**Timeline:** Week 15
**Deps:** [19 Private Drops](./19-private-drops-scheduled-publish.md) for unlisted beat tokens; [13 Guest UPI](./13-guest-upi-checkout.md) for paying without an account.
**Why:** Indian licensing is haggling. Fixed basic/premium/unlimited/exclusive tiers lose deals that currently close in DMs ("₹8k exclusive for this one track"). WhatsApp inquire (plan 08) starts the chat but the money still happens off-platform. A 48-hour private checkout link is the feature that replaces the thread.

---

## Current State

- Licenses are catalog prices on `License` (`basic | premium | unlimited | exclusive`).
- Coupons are producer-wide (`/studio/coupons`) — percent/amount off, not a one-buyer price on one beat.
- No offer, quote, or counter-offer model.
- Guest checkout is beat + existing `licenseId` only (`createGuestOrderSchema`).
- Inquire WhatsApp pre-fills interest text; producer cannot send a pay link back through the product.

## Competitive Bar

| Platform | Negotiation |
|----------|-------------|
| BeatStars | Limited "contact for exclusive"; mostly fixed |
| Airbit | Custom contracts |
| Instagram + UPI | Full haggling — the winner |
| Bandcamp | Pay-what-you-want (not a fit) |

## Goal

Buyer can request a price. Producer can send a named offer: beat, license shape (or exclusive), custom INR amount, expiry (default 48h), optional buyer email. Link checks out via existing Razorpay guest/logged-in flow. Offer is single-use.

---

## Implementation Plan

### Phase 1: Data model (1 day)

**Files to create:**

- `src/types/index.ts` — `IOffer`
- `src/lib/models/Offer.ts`

```
IOffer {
  producerId: ObjectId
  beatId: ObjectId
  token: string                 // nanoid 21, unique
  status: "pending_request" | "open" | "accepted" | "expired" | "withdrawn"
  requestedByUserId?: ObjectId  // if logged-in buyer requested
  requesterEmail?: string
  requesterNote?: string        // max 500
  licenseType: BeatLicenseType  // snapshot of rights being sold
  licenseSnapshot: {            // copy of rights, not a live License row
    name, includesWav, includesStems, commercialUse, streamLimit, terms
  }
  amount: number                // INR, integer rupees
  expiresAt: Date
  acceptedOrderId?: ObjectId
  acceptedPurchaseId?: ObjectId
}
```

Indexes:

```
{ token: 1 } unique
{ producerId: 1, status: 1, createdAt: -1 }
{ beatId: 1, status: 1 }
{ expiresAt: 1 }  // TTL optional on expired only — don't TTL-delete, just query
```

- `src/lib/repositories/offer.repository.ts`
- `src/lib/validators/offer.ts`:
  - `createOfferSchema` — beatId, licenseType, amount (min ₹100, max ₹500_000), expiresInHours (1–168, default 48), buyerEmail optional, note optional
  - `requestOfferSchema` — beatId, note, email if guest
  - `offerCheckoutSchema` — token

### Phase 2: Service (2 days)

**File:** `src/lib/services/offer.service.ts`

- `requestOffer(beatId, actor)` — creates `pending_request`. Rate limit 5/day/IP and per beat. Email + in-studio list for producer. Optional WhatsApp if plan 16 `saleWhatsApp` is on (reuse template later; email is enough in v1).
- `createOffer(producerId, input)` — producer-initiated (the common path: they already talked on WhatsApp). Status `open`. Generate token.
- `withdraw(producerId, offerId)`
- `getByToken(token)` — if `expiresAt < now` and `open`, mark `expired`
- `prepareCheckout(token, buyer)` — returns Razorpay order via payment service with `offerId` on the Order

**Payment integration:**

- Add optional `offerId` to `IOrder`
- `payment-checkout.service.ts` / `guest-payment.service.ts`:
  - If `offerId`: ignore catalog license price; use `offer.amount`
  - Validate offer `open` and not expired inside a transaction
  - On verify: fulfill using `licenseSnapshot` (do not require a matching `License` document for custom amounts)
  - Mark offer `accepted`, set `acceptedOrderId`
  - Exclusive offers reuse plan 02 `markExclusive` path

**Race:** two checkouts on the same token — `findOneAndUpdate({ _id, status: "open", expiresAt: { $gt: now } }, { status: "accepted" })`. Loser gets 409.

### Phase 3: API (1 day)

| Route | Method | Auth |
|-------|--------|------|
| `/api/offers` | POST create (producer) | Producer |
| `/api/offers` | GET list (producer, paginated) | Producer |
| `/api/offers/request` | POST buyer request | Public, rate limited |
| `/api/offers/[id]` | PATCH withdraw | Producer |
| `/api/offers/token/[token]` | GET public offer summary | Public |
| `/api/payment/offer/create-order` | POST | Session or guest email |

Public GET returns: beat title, cover, producer name, amount, license label, expiry. No requester PII.

### Phase 4: Studio UI (1.5 days)

- `src/app/(dashboard)/studio/offers/page.tsx` + `StudioOffersClient.tsx`
  - Tabs: Requests | Open | Closed
  - Create offer dialog: pick beat, license type (or exclusive), amount, expiry, optional email
  - "Copy pay link" → `{APP}/offer/{token}`
  - "Send on WhatsApp" (`wa.me/?text=` with link) — click-to-chat, not Cloud API
- Nav: Offers in SidebarNav / MobileDrawer / DashboardShell

Beat PDP owner menu: "Create offer for this beat"

### Phase 5: Public offer page + PDP request (1.5 days)

- `src/app/offer/[token]/page.tsx` — beat card, terms from snapshot, countdown, Buy (guest or logged-in)
- `src/components/LicenseSelector.tsx` — tertiary: "Request a custom price" → short form (email if guest, note). Does not replace primary license cards.
- Success: existing `/checkout/success` + purchase email (plan 09). Attach offer id in metadata for emails.

---

## Pricing / GST

Offer amount is the **tax-inclusive** INR total (same as catalog licenses today). Reuse `computeGstBreakup` on the order. Platform fee still taken at payout time (plan 01), not at checkout.

## Security

- Token is unguessable (`nanoid`). Do not use sequential ids in the URL.
- Producer can only offer **their** beats, not exclusive-already-sold.
- Buyer request must not expose other buyers' emails in studio beyond the request row.
- Rate limit request endpoint (IP + beatId).
- Custom exclusive: same unlist rules as plan 02.

## Edge Cases

- Catalog coupon + offer → **reject coupons** on offer checkout (price is already negotiated).
- Beat archived after offer created → checkout fails; producer can withdraw.
- Existing lease holders on exclusive offer → honor downloads forever (plan 02).
- Offer amount below cheapest catalog tier — allowed (that's the point).
- Logged-in buyer whose email ≠ requesterEmail — still allowed; token is the authz.

## Testing

- `offer.service.test.ts` — expiry, single-use, exclusive unlist, wrong producer
- Payment verify with offerId vs catalog licenseId
- Guest checkout on offer token

## Estimated Effort

- Model + service + payment hook: 3 days
- API + studio UI: 2.5 days
- Public page + PDP request: 1.5 days
- **Total: ~7 days**
