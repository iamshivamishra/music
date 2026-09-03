# 02 — Exclusive License + Unlist

**Priority:** P0 (launch blocker)
**Timeline:** Week 2–3
**Why:** About page promises exclusive licenses. Purchase model already has `"exclusive"` in the enum. But the license system only ships basic / premium / unlimited. Without exclusive buyouts + marketplace unlist, a hit beat stays listed after a buyout — instant disputes.

---

## Current State

- `ILicense.type` enum: `"basic" | "premium" | "unlimited"` — no exclusive
- `IPurchase.licenseType` includes `"exclusive"` but it cannot actually be purchased
- `LICENSE_DEFAULTS` in `validators/license.ts` only covers basic/premium/unlimited
- `LicenseSelector` UI only renders three tiers
- No concept of "beat sold exclusively" → status stays `published`
- About page copy: "Clear license tiers (basic, premium, exclusive)"

## Competitive Bar

| Platform | Exclusive flow |
|----------|---------------|
| BeatStars | Exclusive listed alongside leases. Purchase → beat removed from store. Existing leases honored. |
| Airbit | Custom exclusive contracts. Beat removed on purchase. |
| Traktrain | Exclusive support with custom pricing. |
| Instagram + UPI | Informal "you bought it, I'll delete it" via DM. |

## Goal

Producer can set an exclusive price. Buyer can buy exclusive. On purchase, beat is unlisted from marketplace. Existing lease holders keep their rights. New leases stop.

---

## Implementation Plan

### Phase 1: Schema changes

**Files to modify:**

- `src/lib/validators/license.ts`:
  - Add `"exclusive"` to `LICENSE_TYPES`
  - Add exclusive defaults:
    ```
    exclusive: {
      name: "Exclusive Rights",
      price: 49999,
      streamLimit: -1,
      includesWav: true,
      includesStems: true,
      commercialUse: true,
      terms: "Full exclusive rights. Beat removed from marketplace. All stems included. Buyer owns commercial rights. Existing leases honored until expiry.",
    }
    ```

- `src/lib/models/License.ts`:
  - Add `"exclusive"` to type enum

- `src/types/index.ts`:
  - Update `LicenseType` to `"basic" | "premium" | "unlimited" | "exclusive"`

- `src/lib/models/Beat.ts`:
  - Add `exclusiveBuyerId?: ObjectId` field
  - Add `exclusiveSoldAt?: Date` field

- `src/types/index.ts`:
  - Add `exclusiveBuyerId?` and `exclusiveSoldAt?` to `IBeat`

### Phase 2: Exclusive purchase flow

**Files to modify:**

- `src/lib/services/payment.service.ts` — `verifyPayment()`:
  - After payment confirmed, check if purchased license is exclusive
  - If exclusive: update beat status to `"archived"`, set `exclusiveBuyerId`, set `exclusiveSoldAt`
  - Deactivate all other licenses for the beat (`isActive = false`)
  - Audit log: `beat.exclusive_sold`

- `src/lib/services/beat.service.ts`:
  - Add `markExclusivelySold(beatId, buyerId)` method
  - Prevents re-publishing a beat that was exclusively sold

- `src/lib/repositories/beat.repository.ts`:
  - Add `markExclusive(beatId, buyerId, session?)` — sets archived + exclusiveBuyerId

### Phase 3: Guard existing purchases

**Files to modify:**

- `src/lib/services/payment.service.ts` — `createOrder()`:
  - Before creating order, check if beat has `exclusiveBuyerId` → reject with "Beat is no longer available (sold exclusively)"
  - Before creating order for exclusive: check beat has no existing exclusive purchase

- `src/lib/services/license.service.ts`:
  - Exclusive license can only exist once per beat
  - Cannot delete exclusive license if beat has lease purchases (existing leases must be honored)

### Phase 4: UI changes

**Files to modify:**

- `src/components/LicenseSelector.tsx`:
  - Render exclusive tier (if active) with distinct styling — gold/premium card
  - Show warning: "Buying exclusive removes this beat from the marketplace"
  - If beat is exclusively sold: show "This beat has been sold exclusively" instead of license picker

- `src/components/UploadForm.tsx`:
  - Add exclusive price field alongside basic/premium/unlimited

- `src/components/LicenseEditor.tsx`:
  - Support editing exclusive license tier

- `src/app/beats/[id]/page.tsx`:
  - If `beat.exclusiveBuyerId` exists, show "Exclusively licensed" badge
  - Hide license picker; show only download panel for the exclusive buyer

- `src/lib/license-ui.ts`:
  - Add `"exclusive"` tier accent (gold)

### Phase 5: Producer notifications

- When exclusive is purchased, the producer should be notified (email via existing `emailService`)
- Studio dashboard should show "Beat X was sold exclusively for ₹Y" in an activity feed

---

## Database Indexes

```
Beat: add exclusiveBuyerId to existing indexes where relevant
License: existing { beatId: 1, type: 1 } unique index already handles exclusive uniqueness
```

## Security Considerations

- Race condition: two buyers attempting exclusive purchase simultaneously → use transaction (`withTransaction`)
- Only the beat's producer can create/price exclusive licenses
- Exclusive buyer should not be able to re-sell on the platform (out of scope for now)
- Existing lease holders must retain their download access forever

## Edge Cases

- Beat has 0 lease purchases → straightforward exclusive
- Beat has existing lease purchases → exclusive sale succeeds but leases remain honored (downloads still work)
- Producer tries to re-publish exclusively sold beat → blocked at service layer
- Exclusive buyer wants to resell → not supported in v1; flag for future
- Refund of exclusive → beat returns to marketplace (use `withTransaction`)

## Testing

- Unit: exclusive purchase flow, guard against double exclusive, lease honoring
- Integration: end-to-end exclusive purchase → beat archived → existing leases still downloadable
- Edge: simultaneous exclusive purchase attempts

## Estimated Effort

- Schema + types + validators: 1 day
- Service layer (payment flow, guards): 2 days
- UI (license selector, upload form, PDP): 2 days
- Testing: 1 day
- **Total: ~6 days**
