# 23 — Collab Payout Splits

**Priority:** P4 (differentiation)
**Timeline:** Week 18–19
**Deps:** [01 Producer Payouts](./01-producer-payouts.md) (RazorpayX, withdrawable balance).
**Why:** Indian beats are often 60/40 between two producers. Today `Purchase.producerId` is a single user. The collab partner is paid in DMs. Automatic split at sale time (ledger) + independent UPI withdraw is a trust unlock BeatStars has and Instagram does not.

---

## Current State

- `Purchase.producerId` denormalized from beat/pack owner.
- `payoutService.getBalance` = gross earnings for that producerId − fee − payouts.
- Beats have one `producerId`. Packs have one owner.
- RazorpayX payouts are per producer account, not per order split at checkout (Route was deferred in plan 01).

## Competitive Bar

| Platform | Splits |
|----------|--------|
| BeatStars | Split payments to collab accounts |
| DistroKid | Collaborator splits |
| Instagram | Spreadsheet + UPI |
| Trishul | 100% to uploader |

## Goal

Beat owner invites a collab by username/email. Both accept a percent split that sums to 100. On each paid sale of that beat, ledger entries credit each party. Each withdraws their own balance. v1: **two collaborators max** besides the owner? Simpler: **owner + up to 2 collabs**, percents integer, sum 100.

Do **not** use Razorpay Route in v1 (linked accounts + KYC per collab). Keep platform-balance + RazorpayX as today; only the **ledger** changes.

---

## Implementation Plan

### Phase 1: Split definition on beat (1 day)

```
IBeatCollaborator {
  userId: ObjectId
  sharePercent: number  // 1–99
  status: "pending" | "accepted" | "declined"
  invitedAt, respondedAt
}
```

On `IBeat`: `collaborators?: IBeatCollaborator[]` (max 2). Owner implicit share = 100 − sum(accepted).

- Invite by username; collab must be a producer account.
- Pending invites do **not** split. If nobody has accepted, 100% owner (current behavior).
- Changing splits: only allowed when no `open` payout race — actually splits apply to **future** purchases only. Historical purchases stay as credited.

Validator: unique userIds, no owner in the array, sum of accepted+pending proposed ≤ 99? **On accept, re-validate sum of accepted percents < 100**, owner gets residual.

**Better UX:** owner sets percents including themselves:

```
splits: { userId, percent }[]  // must include owner, sum 100, 2–3 people
```

Pending invite: split not active until all listed non-owner members accepted. Status `splitsStatus: "inactive" | "pending" | "active"`.

### Phase 2: Ledger (2 days)

**Do not** overwrite `Purchase.producerId` (keep beat owner for support/admin). Add:

```
IEarning {
  purchaseId: ObjectId
  orderId: ObjectId
  beatId?: ObjectId
  packId?: ObjectId
  producerId: ObjectId          // the person who can withdraw this row
  grossAmount: number           // their share of item amount
  createdAt
}
```

Unique `{ purchaseId: 1, producerId: 1 }`.

Fulfillment (`order-fulfillment.ts`): after creating Purchase, insert earning rows:

- If beat has `splitsStatus !== "active"`: one earning, 100% to owner (same as now)
- If active: rupee split with **remainder to owner** (avoid 1-paise leaks: use integer paise; leftover paise → owner)

**Balance rewrite:** `getEarningsByProducer` / `getWithdrawableBalance` should sum `Earning.grossAmount` instead of `Purchase.amount` where producerId matches.

**Backfill script:** `scripts/backfill-earnings-from-purchases.mjs` — one Earning per historical Purchase (producerId, full amount). **Required before switching the balance query.**

Packs: v1 splits on **beats only**. Pack sales credit pack owner 100% unless we add pack-level splits later.

### Phase 3: Invite UX (1.5 days)

- Edit beat: Collaborators card — search producer username, percent, send
- Email: `sendCollabInvite()` (Resend)
- `/studio/collabs` or notifications on dashboard: Accept / Decline
- Public PDP: optional "ft. @username" if accepted (link to their profile). Owner toggle `showCollabCredits`.

Pending invite expiry: 14 days → inactive, revert 100% owner.

### Phase 4: Payout + tax display (1 day)

- Studio payouts / dashboard: "Includes collab shares from other people's beats"
- Sale row: show "Your share ₹X (40%)" for collab
- GST invoice to **buyer** stays platform-level (unchanged). Collab tax among producers is their problem; show a note in plan 25 CSV ("split earnings").

### Phase 5: Guards (0.5 day)

- Cannot invite non-producers
- Cannot invite yourself
- Exclusive sale splits the exclusive price the same way
- Coupon discounts: split the **net item amount** after discount, not list price

---

## Database Indexes

```
Earning: { producerId: 1, createdAt: -1 }
Earning: { purchaseId: 1, producerId: 1 } unique
Earning: { beatId: 1 }
Beat: { "collaborators.userId": 1 }
```

## Security

- Only beat owner can invite / change percents (changes apply going forward; require all collabs to re-accept if percents change — simplest: percent change sets status back to `pending`)
- Collab can decline; cannot edit percent
- Earnings inserts inside the existing payment transaction (`withTransaction`)

## Edge Cases

- Collab account banned — still owe ledger; payouts role-gated? Keep paying if they were producer at sale time.
- Beat transferred — out of scope (no transfer feature).
- 33/33/34 — integers only, owner residual.
- Two pending invites, one accepts — still inactive until all accept (or owner can "activate with those who accepted" — skip in v1 to avoid math fights).

## Testing

- Split 70/30 rupee remainder
- Balance uses Earning after backfill
- Inactive splits → 100% owner
- Unique earning constraint on double webhook

## Estimated Effort

- Schema + ledger + backfill: 3 days
- Invite UI + emails: 1.5 days
- Studio sale display: 1 day
- **Total: ~5.5–6 days**
