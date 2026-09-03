# Cart, Checkout & Payments

Single-beat cart and Razorpay buy-now exist in both. Trishul is a real checkout system; Music stops at client verify.

## Major

| Feature | For | Why it matters | Lives in Trishul | Pri |
|---|---|---|---|---|
| Razorpay webhook | System | HMAC capture, idempotent purchase creation. Without it, closed browsers / retries lose paid orders. | `POST /api/payment/webhook` | P0 |
| Checkout success page | Buyer | Post-pay confirmation with order summary and download links. Music has no success route. | `/checkout/success` | P0 |
| Order receipt PDF | Buyer | Branded PDF receipt for paid orders. | `GET /api/orders/[id]/receipt` | P1 |
| Coupon apply at cart | Buyer | Validate producer codes on pack items (flat / percent, caps, limits). | `POST /api/coupons/validate` | P1 |

## Minor

| Feature | For | Why it matters | Lives in Trishul | Pri |
|---|---|---|---|---|
| Redirect to success after pay | Buyer | Cart navigates to `/checkout/success?orderId=`. Music only shows an inline toast/state. | `CartClient` redirect | P1 |
| Batch license fetch on cart | Buyer | Parent loads all item licenses once. Music fetches per row in `useEffect`. | `CartClient` batch licenses | P2 |
| `payment/fail` rate limit | System | 10/min on fail callback. Music fail route is unrated. | `payment/fail` limiter | P2 |
| Order discount / coupon fields | System | `subtotalAmount`, `discountAmount`, `couponCode`, `couponId`, `discountPerPack` on Order. | Order model | P2 |
| Cart route error + loading | Buyer | `cart/error.tsx` and `cart/loading.tsx`. Music has neither. | `cart/error` + `loading` | P2 |
