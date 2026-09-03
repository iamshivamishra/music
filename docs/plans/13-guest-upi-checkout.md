# 13 — Guest UPI Checkout

**Priority:** P2 (differentiation)
**Timeline:** Week 11
**Why:** Instagram + UPI wins on friction: no account, scan QR, get files. Trishul requires sign-in before payment. Every forced signup before the money moment is a drop-off. Guest checkout with UPI makes Trishul strictly easier than BeatStars for an Indian buyer.

---

## Current State

- `CartClient.tsx` checks for session: if no session, shows "Sign in to checkout"
- `RazorpayButton` assumes a logged-in user: fetches `createOrder` with `buyerId` from session
- `paymentService.createOrder()` requires `buyerId` parameter
- `CartProvider` supports guest cart in localStorage, syncs to server on login
- No guest purchase flow exists

## Competitive Bar

| Platform | Guest checkout |
|----------|---------------|
| BeatStars | Account required |
| Airbit | Account required |
| Traktrain | Account required |
| Instagram + UPI | No account — the ultimate guest checkout |

## Goal

Buyer can pay via Razorpay (UPI/cards) without creating an account. After payment, collect email for delivery. Optionally create account post-purchase.

---

## Implementation Plan

### Phase 1: Guest order creation

**Files to modify:**

- `src/lib/validators/payment.ts` — add `createGuestOrderSchema`:
  ```
  {
    beatId: string,
    licenseId: string,
    guestEmail: string,
    guestName?: string,
  }
  ```

- `src/lib/services/payment.service.ts`:
  - Add `createGuestOrder(input)`:
    - No `buyerId` — use email as identifier
    - Create order with `guestEmail` field
    - Razorpay prefill with guest email
    - Return Razorpay order details

- `src/lib/models/Order.ts`:
  - Add optional fields: `guestEmail?: string`, `guestName?: string`

- `src/types/index.ts`:
  - Update `IOrder` with guest fields

### Phase 2: Guest payment API

**Files to create:**

- `src/app/api/payment/guest/create-order/route.ts`:
  - No auth required
  - Rate limited by IP (prevent abuse)
  - Accepts `beatId`, `licenseId`, `guestEmail`
  - Returns Razorpay order details

- `src/app/api/payment/guest/verify/route.ts`:
  - Verify Razorpay payment
  - Create Purchase with `guestEmail` instead of `buyerId`
  - Send purchase confirmation email to guest
  - Generate download links (24h signed URLs)
  - Return download links in response

### Phase 3: Guest purchase model

**Files to modify:**

- `src/lib/models/Purchase.ts`:
  - Make `buyerId` optional
  - Add `guestEmail?: string`
  - Add index: `{ guestEmail: 1 }`

- `src/lib/services/download.service.ts`:
  - Support download access by guestEmail + orderId (not just userId)
  - Or: generate one-time download tokens in the verification response

### Phase 4: UI — Guest checkout flow

**Files to modify:**

- `src/components/LicenseSelector.tsx`:
  - If not logged in: instead of "Sign in to Purchase", show "Buy Now" → guest checkout modal
  - Collect: email (required), name (optional)
  - Then trigger Razorpay with guest order

- `src/components/RazorpayButton.tsx`:
  - Support `guestMode` prop
  - Use `/api/payment/guest/create-order` instead of `/api/payment/create-order`
  - Prefill Razorpay with guest email

- `src/app/cart/CartClient.tsx`:
  - For guest users with items in localStorage cart:
    - Show "Checkout as Guest" alongside "Sign in to checkout"
    - Collect email → process cart as guest order

### Phase 5: Post-purchase account creation

After successful guest purchase, show:
```
✅ Payment successful! Your beats are ready.

[Download Now]

Want to save your purchases and re-download anytime?
[Create Account with {guestEmail}]
```

**Files to create:**

- Guest-to-account linking service:
  - If guest creates account with the same email later, link all guest purchases to the new account
  - Run on signup: find purchases with `guestEmail = user.email`, set `buyerId`

### Phase 6: Guest download page

**Files to create:**

- `src/app/download/[token]/page.tsx`:
  - Token-based download page (no auth required)
  - Token generated at payment verification, stored on order
  - Shows: purchase summary + download links
  - Links expire in 48 hours
  - "Create account to save your library permanently"

---

## Security Considerations

- Rate limit guest order creation by IP: max 5 orders per hour
- Rate limit by email: max 3 orders per email per day
- Download tokens must be single-use or time-limited (48h)
- Guest email validation (format + DNS check)
- No access to full library without account — only per-purchase download page
- Razorpay still handles payment security (PCI compliance)

## Edge Cases

- Guest buys same beat twice → check by email + beatId before creating order
- Guest creates account later with same email → auto-link purchases
- Download token expired → show "Create account to access your library"
- Guest email typo → no recovery without account (show confirmation step)
- Refund for guest → refund via Razorpay, revoke download token

## Testing

- End-to-end: guest visits PDP → enters email → pays → gets download page
- Guest-to-account linking after signup
- Download token expiry
- Rate limiting

## Estimated Effort

- Backend (guest order + verify + download tokens): 3 days
- UI (guest checkout flow + download page): 2 days
- Guest-to-account linking: 1 day
- Testing: 1 day
- **Total: ~7 days**
