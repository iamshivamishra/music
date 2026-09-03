# 01 — Producer Payouts

**Priority:** P0 (launch blocker)
**Timeline:** Week 1–2
**Why:** Without bank/UPI payout, there is no two-sided market. Instagram already pays producers instantly via UPI. If Trishul holds GMV in a platform Razorpay account and only shows "total earnings", serious sellers will not upload masters.

---

## Current State

- `studioService.getAnalytics()` calculates `totalEarnings` from `purchaseRepository.getEarningsByProducer()`.
- Studio dashboard displays revenue, sales, plays, monthly charts, top beats.
- There is **no withdraw button**, no linked bank account, no Razorpay Route/settlement, no platform fee display.
- All payments go to a single Razorpay merchant account. Producer money sits there indefinitely.

## Competitive Bar

| Platform | Payout model |
|----------|-------------|
| BeatStars | Instant payouts to PayPal / bank |
| Airbit | Instant payouts after payment processing |
| Traktrain | Payouts on schedule |
| Instagram + UPI | Immediate — buyer pays producer directly |

## Goal

Producer can withdraw earned balance to their UPI ID or bank account within T+2. Platform fee is transparent.

---

## Implementation Plan

### Phase 1: Data model

**Files to create/modify:**

- `src/lib/models/Payout.ts` — new model

```
IPayoutRequest {
  producerId: ObjectId
  amount: number
  platformFee: number
  netAmount: number
  method: "upi" | "bank_transfer"
  upiId?: string
  bankDetails?: { accountNumber, ifsc, accountName }
  status: "requested" | "processing" | "completed" | "failed"
  razorpayPayoutId?: string
  razorpayFundAccountId?: string
  failureReason?: string
  processedAt?: Date
}
```

- `src/types/index.ts` — add `IPayout`, `PayoutStatus`, `PayoutMethod` types
- `src/lib/models/User.ts` — add optional fields:

```
payoutDetails?: {
  upiId?: string
  bankAccount?: { accountNumber: string, ifsc: string, accountName: string }
  razorpayContactId?: string
  razorpayFundAccountId?: string
}
```

### Phase 2: Platform fee and balance calculation

**Files to modify:**

- `src/lib/repositories/purchase.repository.ts` — add `getWithdrawableBalance(producerId)` that computes:
  - Total earnings from paid purchases of the producer's beats
  - Minus sum of completed/processing payouts
  - Minus platform fee (e.g., 10% — configurable via env `PLATFORM_FEE_PERCENT`)
- `src/lib/validators/payout.ts` — new file with Zod schemas:
  - `requestPayoutSchema`: method, amount (min ₹100), UPI ID or bank details
  - `adminProcessPayoutSchema`: payoutId, action (approve/reject)

### Phase 3: Razorpay Route / RazorpayX integration

**Decision: Razorpay Route vs RazorpayX**

- **Razorpay Route** — split payments at order time. Requires a linked account per producer upfront. Better for real-time splits.
- **RazorpayX** — payout API. Create a payout on demand from platform balance. Simpler to start with; no upfront producer KYC required for basic UPI payouts.

**Recommendation:** Start with **RazorpayX Payouts** for simplicity. Move to Route when volume justifies real-time splits.

**Files to create:**

- `src/lib/razorpayx.ts` — RazorpayX client setup (contacts, fund accounts, payouts API)
- `src/lib/services/payout.service.ts`:
  - `requestPayout(producerId, input)`: validate balance >= amount, create PayoutRequest, call RazorpayX
  - `processWebhook(event)`: handle payout.completed / payout.failed / payout.reversed
  - `getPayoutHistory(producerId, page, limit)`
  - `getBalance(producerId)`: earnings minus completed/processing payouts
- `src/lib/repositories/payout.repository.ts`: CRUD for PayoutRequest model

### Phase 4: API routes

**Files to create:**

- `src/app/api/payouts/route.ts` — GET (list payout history), POST (request payout)
- `src/app/api/payouts/balance/route.ts` — GET (current withdrawable balance)
- `src/app/api/payouts/webhook/route.ts` — POST (RazorpayX webhook, verify signature)
- `src/app/api/admin/payouts/route.ts` — GET (all pending payouts for admin)
- `src/app/api/admin/payouts/[id]/route.ts` — PATCH (approve/reject)

### Phase 5: Studio UI

**Files to modify:**

- `src/app/studio/StudioDashboard.tsx` — add "Withdraw" card showing:
  - Available balance (earnings - payouts - platform fee)
  - Platform fee percentage
  - "Withdraw" button → opens payout form
  - Recent payout history (last 5)
- `src/app/(dashboard)/studio/payouts/page.tsx` — new, full payout history page

**Files to create:**

- `src/components/PayoutForm.tsx` — dialog/sheet with:
  - Amount input (max = available balance)
  - Method toggle: UPI / Bank Transfer
  - UPI ID input or bank details form
  - "Your payout details are saved for next time"
  - Confirmation step showing net amount after fee
- `src/app/(dashboard)/studio/payouts/page.tsx` — paginated payout history

### Phase 6: Admin payout management

**Files to modify:**

- `src/app/(dashboard)/admin/page.tsx` — add pending payouts count stat
- Create `src/app/(dashboard)/admin/payouts/page.tsx` — list of payout requests, approve/reject actions

---

## Database Indexes

```
PayoutRequest: { producerId: 1, status: 1 }
PayoutRequest: { status: 1, createdAt: -1 }
PayoutRequest: { razorpayPayoutId: 1 } (sparse, unique)
```

## Security Considerations

- Only producers can request payouts (role check in service)
- Amount cannot exceed withdrawable balance (race condition: use optimistic locking or `findOneAndUpdate` with balance check)
- RazorpayX webhook must verify `X-Razorpay-Signature` header
- Bank/UPI details are PII — store encrypted or rely on RazorpayX fund account IDs
- Rate limit payout requests: max 1 per day per producer
- Admin approval required for payouts > ₹50,000 (configurable threshold)

## Edge Cases

- Producer requests payout while another is processing → reject or queue
- Refund after payout → platform absorbs or claws back from next payout
- Producer changes UPI ID between request and processing → use snapshot at request time
- RazorpayX downtime → queue and retry with exponential backoff

## Testing

- Unit: `payout.service.test.ts` — balance calculation, fee math, duplicate prevention
- Integration: webhook handling, status transitions
- Manual: end-to-end RazorpayX sandbox payout

## Estimated Effort

- Backend (model + service + API + webhook): 3–4 days
- Frontend (studio UI + payout form + admin): 2–3 days
- RazorpayX integration + testing: 2 days
- **Total: ~7–9 days**
