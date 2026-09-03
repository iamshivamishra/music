# 21 — Buyer CRM (Repeat-buyer Memory)

**Priority:** P3 (producer depth)
**Timeline:** Week 16
**Deps:** Sales list already in `studioService.getSales`; coupons (existing); offers (plan 18) optional for "send offer" CTA.
**Why:** Repeat buyers are the actual business. Today studio sales is a paginated purchase table. The producer cannot see "this artist bought 3 beats, last purchase 40 days ago, mostly Premium." That memory currently lives in Instagram DMs. A tiny CRM — not HubSpot — is enough to stand out.

---

## Current State

- `GET` studio sales via `purchaseRepository.getProducerSales` — order rows, not buyers.
- `Purchase.buyerId` optional (guest has `guestEmail` only).
- Profile `BuyerStats` exists for the **logged-in buyer** (`totalSpend`, `beatCount`, …) — not exposed to producers.
- Follow is buyer→producer, not a purchase graph.
- No producer notes, tags, or "message this buyer" besides public WhatsApp on the producer profile (wrong direction).

## Competitive Bar

| Platform | CRM |
|----------|-----|
| BeatStars | Buyer list is weak; email blasts via separate tools |
| Airbit | Limited customer list |
| Instagram | The producer's head + chat search |
| Mailchimp | External, disconnected from licenses |

## Goal

Studio → Customers: one row per buyer (account or guest email) who has paid this producer. Show purchase count, spend, last date, dominant license, beats bought. Producer can add a private note. CTA: copy email, create coupon for that email (coupons already support email restrictions per gaps/studio), or create offer (if 18 shipped). No outbound email blast in v1.

---

## Implementation Plan

### Phase 1: Aggregation (1.5 days)

**File:** `src/lib/repositories/purchase.repository.ts`

`getCustomersByProducer(producerId, { page, limit, q })`:

- `$match` `{ producerId }`
- `$group` by `buyerId` if present else lowercased `guestEmail`
- Accumulators: `count`, `spend` (`$sum: "$amount"`), `lastPurchaseAt`, `licenseTypes` (`$push`)
- `$sort` lastPurchaseAt desc
- Facet count + page (`limit` max 50)

Join user name/avatar for `buyerId` in a second query (batch `userRepository.findByIds`). Guests: display email masked in UI option? **Show full email to the producer** — they already received it via Razorpay/sale email; it's their customer. Do not expose on any public API.

Dominant license: mode of `licenseType` in the group.

**Service:** `src/lib/services/crm.service.ts`

- `listCustomers(producerId, query)`
- `getCustomer(producerId, customerKey)` — `customerKey` is `user:{id}` or `email:{sha256}` to avoid putting raw email in URLs
- `upsertNote(producerId, customerKey, note)`

### Phase 2: Notes model (0.5 day)

```
IProducerCustomerNote {
  producerId: ObjectId
  buyerId?: ObjectId
  guestEmailHash?: string
  note: string  // max 1000
  updatedAt
}
```

Unique `{ producerId: 1, buyerId: 1 }` sparse; `{ producerId: 1, guestEmailHash: 1 }` sparse.

Never store a second copy of email if `buyerId` exists.

### Phase 3: API (0.5 day)

| Route | Method | Auth |
|-------|--------|------|
| `/api/studio/customers` | GET | Producer |
| `/api/studio/customers/[key]` | GET | Producer |
| `/api/studio/customers/[key]/note` | PUT | Producer |

Ownership: every query scoped by session producerId. Guest email in response only on these routes.

### Phase 4: Studio UI (2 days)

- `src/app/(dashboard)/studio/customers/page.tsx` + `StudioCustomersClient.tsx`
  - Search by name or email
  - Table: name/email, orders, spend, last buy, tier mix, note snippet
  - Drawer: purchase history (reuse sales serializer filtered by buyer), note textarea, actions
- Actions:
  - Copy email
  - "Create coupon" → `/studio/coupons?email=`
  - "Create offer" → `/studio/offers?buyer=` if plan 18 exists (feature-detect the route)
- Empty state: "Customers appear after your first sale"
- Nav: Customers in the three layout files

### Phase 5: Guest → account merge (0.5 day)

Plan 13 already links guest purchases on signup (`buyerId` from `guestEmail`). CRM grouping should treat merged purchases as one customer (`buyerId` wins). When listing, if some rows are still guest-email and others have the same email as a user, merge in the service layer (lookup users by email). Document this so producers don't see duplicates.

---

## Privacy / legal

- Producer sees **their** buyers only.
- No export of all emails as CSV in v1 (easy to spam; add later with explicit "download for GST" in plan 25).
- Notes are private to the producer; never shown to the buyer.
- Do not add "email this customer from Trishul" until we have unsubscribe + purpose limitation.

## Security

- `customerKey` must not be a raw email in the path (use hash or user id).
- Rate limit note updates.
- Admin impersonation: out of scope.

## Edge Cases

- Buyer deleted account — keep aggregated stats; name becomes "Deleted user"; email hidden if we no longer have it.
- Pack sale: still one customer row; list pack title in history.
- Producer buying their own beat (testing) — show it; don't special-case.

## Testing

- Grouping guest vs user vs merged
- Isolation: producer A cannot read producer B's customers
- Pagination totals

## Estimated Effort

- Aggregation + notes: 2 days
- API + UI: 2.5 days
- Merge/guest: 0.5 day
- **Total: ~5 days**
