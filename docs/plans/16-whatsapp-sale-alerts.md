# 16 — WhatsApp Sale + Drop Alerts

**Priority:** P3 (producer depth)
**Timeline:** Week 13
**Why:** Sale email exists (`emailService.sendSaleNotification`) but producers live in WhatsApp. Instagram + UPI already pings them the second money lands. If Trishul only emails, they will keep taking DMs. A 10-second WhatsApp ping is the reason they stop selling off-platform.

---

## Current State

- `purchase-email.service.ts` fires `sendSaleNotification()` after paid orders (logged-in and guest).
- Template is HTML email via Resend. No SMS, no WhatsApp outbound.
- `User.socialLinks.whatsappNumber` is opt-in (10-digit Indian mobile, normalized in `src/lib/utils/whatsapp.ts`).
- `wa.me` links are **click-to-chat only**. They cannot send a message to the producer.
- No producer notification preferences. No WhatsApp Business / Cloud API client.
- Studio has no "share this drop to Status" prompt after publish.

## Competitive Bar

| Platform | Producer ping |
|----------|---------------|
| BeatStars | Email + in-app |
| Airbit | Email |
| Instagram + UPI | Instant WhatsApp / IG notification — the winner |
| Indian BSPs (Gupshup, Interakt) | Template messages used by D2C brands |

## Goal

After every paid sale, the producer gets a WhatsApp template message within ~10s: beat/pack, license, amount, withdraw CTA. After a beat is published, studio offers a one-tap "Share to WhatsApp Status" card. Opt-in, rate-limited, never blocks payment.

---

## Provider decision

Outbound WhatsApp requires Meta Cloud API (or an India BSP). `wa.me` cannot do this.

**Recommendation:** Gupshup or Interakt as BSP (India DLT/template ops are easier than raw Cloud API). Wrap behind `whatsappService` so the vendor can change.

Template messages (business-initiated) must be pre-approved. Use one utility template:

```
sale_alert_v1
{{1}} you made a sale!
{{2}} — {{3}}
Amount: ₹{{4}}
Withdraw: {{5}}
```

Example: `Sandeep you made a sale! Midnight Drill — Premium. Amount: ₹2499. Withdraw: https://trishulbeats.com/studio/payouts`

---

## Implementation Plan

### Phase 1: Notification preferences + consent (0.5 day)

**Files to modify:**

- `src/types/index.ts` — add to `IUser`:

```
notificationPrefs?: {
  saleWhatsApp: boolean;
  dropWhatsApp: boolean;
  saleEmail: boolean; // default true, already sending
}
```

- `src/lib/models/User.ts` — nested object, defaults `{ saleWhatsApp: false, dropWhatsApp: false, saleEmail: true }`
- `src/lib/validators/auth.ts` — `notificationPrefsSchema`
- `src/app/profile/edit/EditProfileForm.tsx` — toggles under WhatsApp number:
  - "Text me on WhatsApp when I make a sale"
  - Disabled until `whatsappNumber` is set
  - Copy: "We send one message per sale. You can turn this off anytime."

**Rule:** `saleWhatsApp` cannot be true without a valid `whatsappNumber`.

### Phase 2: WhatsApp client (1.5 days)

**Files to create:**

- `src/lib/whatsapp.ts` — lazy client (same Proxy pattern as `razorpayx.ts`)
  - `sendTemplate({ to, templateName, bodyParams })`
  - Verify webhook signature if using Cloud API inbound later
- `src/lib/services/whatsapp.service.ts`:
  - `notifySale(producerId, payload)` — no-op if prefs off or no number
  - `notifyDropPublished(producerId, beat)` — optional, if `dropWhatsApp`
  - Never throw to caller; log failures
- `src/lib/models/NotificationLog.ts` + repository — audit trail, prevent double-send

```
INotificationLog {
  producerId: ObjectId
  channel: "whatsapp" | "email"
  kind: "sale" | "drop"
  orderId?: ObjectId
  beatId?: ObjectId
  status: "queued" | "sent" | "failed" | "skipped"
  providerMessageId?: string
  error?: string
}
```

**Env:**

```
WHATSAPP_PROVIDER=gupshup|interakt|meta
WHATSAPP_API_KEY=
WHATSAPP_API_URL=
WHATSAPP_TEMPLATE_SALE=sale_alert_v1
WHATSAPP_TEMPLATE_DROP=drop_published_v1
WHATSAPP_SENDER=
```

### Phase 3: Hook into fulfillment (0.5 day)

**Files to modify:**

- `src/lib/services/purchase-email.service.ts` (or a renamed `purchase-notify.service.ts`):
  - After email fire-and-forget, also call `whatsappService.notifySale()`
  - Group by `producerId` (cart can have multiple producers)
  - Payload: first item title, license, INR amount, studio payouts URL
- Payment response must not await WhatsApp. Same pattern as email.

Idempotency: unique index `{ orderId, producerId, kind: "sale", channel: "whatsapp" }`. Skip if already `sent`.

### Phase 4: Share-to-Status after publish (1 day)

Not outbound API — opens WhatsApp with prefilled Status/chat text (existing `buildBeatShareText`).

**Files to create/modify:**

- `src/app/studio/beats/PublishSuccessCard.tsx` — after upload or status → published:
  - "Your beat is live"
  - Buttons: Copy link, Share on WhatsApp, View store
- `src/components/UploadForm.tsx` + `StudioBeatsClient.tsx` — show the card on success
- Reuse `src/lib/utils/whatsapp.ts` share URL helper from plan 08

Drop WhatsApp **outbound** template (`drop_published_v1`) is optional v1.2 — Status share is enough for launch.

### Phase 5: Studio indicator (0.5 day)

- `src/app/studio/StudioDashboard.tsx` — if producer has `whatsappNumber` but `saleWhatsApp` is false, banner: "Get sale alerts on WhatsApp"
- Link to `/profile/edit#notifications`

---

## Database Indexes

```
NotificationLog: { orderId: 1, producerId: 1, kind: 1, channel: 1 } unique sparse
NotificationLog: { producerId: 1, createdAt: -1 }
```

## Security

- Opt-in only. Never send to a number that is not on the producer account.
- Do not log full phone numbers in info logs (last 4 digits only).
- Rate limit: max 1 sale WhatsApp per order per producer; max 20/day/producer (abuse / flapping webhooks).
- Template params must be sanitized (no URLs except allowlisted `NEXT_PUBLIC_APP_URL` paths).
- API keys server-only. Pages never call the BSP.

## Edge Cases

- Guest cart with two producers → two WhatsApp messages, not one blob.
- Exclusive sale → mention "Exclusive — beat unlisted" in template param if it fits, else keep generic.
- Producer changed number after opt-in → send to current number; log old as skipped.
- BSP downtime → log `failed`, email still went out. No retry storm; one retry via queue later.
- Founding fee / net vs gross → show **gross sale amount** (what the buyer paid for that item), not withdrawable balance.

## Testing

- `whatsapp.service.test.ts` — skip when prefs off, skip when no number, idempotent on duplicate order
- `purchase-email.service.test.ts` — assert `notifySale` called fire-and-forget after verify
- Manual: Gupshup/Interakt sandbox to a test number

## Estimated Effort

- Prefs + UI: 0.5 day
- Provider client + log model: 1.5 days
- Fulfillment hook: 0.5 day
- Publish Status card: 1 day
- Studio banner: 0.5 day
- **Total: ~4 days**
