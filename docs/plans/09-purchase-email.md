# 09 — Purchase Email with License

**Priority:** P1 (conversion)
**Timeline:** Week 6–7
**Why:** A Razorpay success page is not a receipt. The buyer needs an email with their purchase confirmation, download links, and license agreement. This builds trust and reduces "where are my files?" support requests.

---

## Current State

- `emailService` exists with Resend (password reset + contact notification)
- Payment verification in `paymentService.verifyPayment()` creates purchases but sends no email
- Cart checkout in `paymentService.checkoutCart()` — same, no email
- No purchase confirmation email template
- Download links are only accessible via the beat PDP (DownloadPanel) or profile

## Competitive Bar

| Platform | Post-purchase communication |
|----------|---------------------------|
| BeatStars | Email with license PDF, download links, receipt |
| Airbit | Email with license contract, download links |
| Traktrain | Email confirmation with downloads |
| Instagram + UPI | Screenshot of UPI payment in WhatsApp |

## Goal

After every successful payment, send the buyer an email with: purchase summary, direct download links (signed, 24h expiry), and license PDF attachment (when plan 03 ships).

---

## Implementation Plan

### Phase 1: Email template

**Files to modify:**

- `src/lib/services/email.service.ts` — add `sendPurchaseConfirmation()`:

```typescript
interface PurchaseEmailParams {
  to: string;
  buyerName: string;
  items: Array<{
    beatTitle: string;
    producerName: string;
    licenseType: string;
    licenseName: string;
    price: number;
    downloadUrl: string;
  }>;
  totalAmount: number;
  orderId: string;
  paymentId: string;
  purchaseDate: Date;
}
```

Email template sections:
1. "Your beats are ready!" header
2. Order summary table (beat title, license, price per item)
3. Download buttons per item (signed URLs, 24h expiry)
4. Total paid
5. Payment reference (Razorpay payment ID)
6. "Access your library anytime" link to /profile/library
7. License PDF attachment link (when plan 03 ships)
8. Footer: support email, unsubscribe (CAN-SPAM compliance)

### Phase 2: Trigger on payment verification

**Files to modify:**

- `src/lib/services/payment.service.ts`:
  - In `verifyPayment()` — after purchases are created and order is marked paid:
    ```
    await emailService.sendPurchaseConfirmation({
      to: buyer.email,
      buyerName: buyer.name,
      items: purchaseItems.map(item => ({
        beatTitle: item.beatTitle,
        producerName: ...,
        licenseType: item.licenseType,
        price: item.price,
        downloadUrl: await downloadService.generateSignedUrl(beat, "master"),
      })),
      totalAmount: order.totalAmount,
      orderId: order.razorpayPaymentId,
      paymentId: order.razorpayPaymentId,
      purchaseDate: new Date(),
    });
    ```
  - Same for `verifyCartPayment()` — multiple items in one email
  - **Important:** Email sending should not block the payment response. Use fire-and-forget with error logging.

### Phase 3: Producer notification email

**Files to modify:**

- `src/lib/services/email.service.ts` — add `sendSaleNotification()`:
  ```
  - To: producer email
  - Subject: "You made a sale! 🎉"
  - Body: "{buyerName} purchased {licenseName} for {beatTitle}"
  - Amount: ₹{price}
  - Link to studio dashboard
  ```

- `src/lib/services/payment.service.ts`:
  - After purchase: send sale notification to each unique producer in the order

### Phase 4: Download link security

- Download links in email use signed S3 URLs with 24-hour expiry
- Include a note: "Links expire in 24 hours. Access your library anytime at trishulbeats.com/profile/library"
- Do NOT include license PDF as an email attachment initially (large files, Resend limits)
- Instead: link to `/api/purchases/{id}/license-pdf` (requires auth)

---

## Email Design

```
Subject: Your beats are ready! — Order #rcpt_abc123

─────────────────────────────────────
  🎵 Trishul Beats — Purchase Confirmation
─────────────────────────────────────

Hi {firstName},

Your purchase is complete! Here are your beats:

┌─────────────────────────────────────────┐
│ "Dark Trap Melody"                      │
│ by ProducerX · Premium License          │
│                                         │
│ [Download WAV]  [Download MP3]          │
│                                    ₹1,499│
├─────────────────────────────────────────┤
│ "Lo-Fi Chill"                           │
│ by ProducerY · Basic License            │
│                                         │
│ [Download MP3]                          │
│                                      ₹499│
├─────────────────────────────────────────┤
│                          Total: ₹1,998  │
└─────────────────────────────────────────┘

Payment ID: pay_abc123
Date: Dec 15, 2025

Access your full library anytime:
[Go to My Library →]

─────────────────────────────────────
Questions? Reply to this email or contact us at support@trishulbeats.com
```

## Security Considerations

- Signed download URLs in email expire in 24h (configurable)
- Email is sent to the authenticated buyer's email only
- Do not include sensitive info (full payment details, card info)
- Resend handles SPF/DKIM — ensure DNS is configured

## Edge Cases

- Email delivery failure → log error, do not fail the purchase
- Cart with 10+ items → email can be long; consider a summary + "View in Library" CTA
- Beat deleted before email is sent → download links still work if S3 keys exist
- Resend rate limits → queue emails if needed (unlikely for beat marketplace volume)

## Testing

- Unit: email template rendering with mock data
- Integration: payment → email sent (Resend sandbox)
- Manual: verify email renders in Gmail, Outlook, Apple Mail

## Estimated Effort

- Purchase confirmation template: 1 day
- Payment service integration: 1 day
- Producer sale notification: 0.5 day
- Testing: 0.5 day
- **Total: ~3 days**
