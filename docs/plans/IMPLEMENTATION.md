# Full Implementation Plan — Trishul Beats

**Generated:** Sep 3, 2026
**Source:** Plans 01–25 + codebase analysis
**Success targets:** 20 live producers, >8% PDP→paid conversion, <48h payout time; post-P3 WhatsApp opt-in and attributed off-platform sales

---

## Dependency Graph

```
Phase 0 (Earnings Fix) ──┐
                          ├── 01 Payouts ──── 14 Founding Program (fee override)
                          │
04 Trust Cleanup ─────────┤ (can start day 1, no deps)
                          │
05 Producer Acquisition ──┤ (needs 04 done for homepage)
                          │
02 Exclusive License ─────┤
                          │
03 License PDF + GST ─────┼── 09 Purchase Email (needs PDF attachment)
                          │         │
                          │         └── 07 Buyer Library (needs download links + PDF)
                          │
06 Discovery Filters ─────┤ (independent, backend already exists)
                          │
08 WhatsApp Share ────────┤ (independent)
                          │
10 Unified Player ────────┼── 12 Embeddable Player (needs unified context)
                          │
11 India Chart ───────────┤ (independent)
                          │
13 Guest UPI Checkout ────┤ (independent)
                          │
15 Hindi + English i18n ──┘ (should go last — touches all UI)
```

P3–P4 (after 01–15):

```
08 + 09 ── 16 WhatsApp sale alerts
12 + 13 ── 17 Link-in-bio store
Beat status ── 19 Private drops ── 18 Custom offers
Play/share ── 20 Source analytics
Studio sales ── 21 Buyer CRM
01 Payouts ── 23 Collab splits ── 25 Tax pack (share column)
03 GST invoices ── 25 Producer tax pack
Tagged preview ── 24 Free download leads
(independent) ── 22 Custom services (heaviest; 22a listings-only possible)
```

---

## Sprint Schedule

### P0 — Launch Blockers (Weeks 1–4)

| Week | Plan | Est. Days | Parallel? |
|------|------|-----------|-----------|
| 1 | **04 Trust & Brand Cleanup** | 1–2 | Yes — start day 1 |
| 1 | **Phase 0: Earnings foundation fix** | 0.5 | Yes — alongside 04 |
| 1–2 | **01 Producer Payouts** (Phases 1–4: backend) | 5 | After Phase 0 |
| 2 | **01 Producer Payouts** (Phases 5–6: UI) | 3 | After backend |
| 2–3 | **02 Exclusive License** | 6 | Parallel with 01 UI |
| 2–3 | **03 License PDF + GST** | 6 | Parallel with 02 |
| 2–3 | **05 Producer Acquisition** | 4–6 | After 04 |

**Week 1 goal:** Trust cleanup live, earnings foundation fixed, payout backend started.
**Week 2 goal:** Payouts UI, exclusive license schema + service layer.
**Week 3 goal:** All P0 features code-complete.
**Week 4 goal:** Integration testing, bug fixes, staging validation.

### P1 — Conversion (Weeks 5–8)

| Week | Plan | Est. Days | Parallel? |
|------|------|-----------|-----------|
| 5 | **06 Discovery Filters** | 2–3 | Yes |
| 5–6 | **07 Buyer Library** | 4–5 | Yes — parallel with 06 |
| 6 | **08 WhatsApp Share** | 2–3 | Yes |
| 6–7 | **09 Purchase Email** | 3 | After 03 (needs PDF) |
| 7–8 | **10 Unified Audio Player** | 5 | Independent |

**Week 5 goal:** Filters + library started.
**Week 8 goal:** All P1 features live.

### P2 — Differentiation (Weeks 9–12)

| Week | Plan | Est. Days | Parallel? |
|------|------|-----------|-----------|
| 9–10 | **11 India Chart** | 5–6 | Yes |
| 10–11 | **12 Embeddable Player** | 5–6 | After 10 (needs unified player) |
| 10–12 | **14 Founding Producer Program** | 6 | After 01 (needs payout fee logic) |
| 11 | **13 Guest UPI Checkout** | 7 | Independent |
| 11–12 | **15 Hindi + English i18n** | 8 | Last (touches all UI) |

### P3 — Producer Depth (Weeks 13–16)

| Week | Plan | Est. Days | Parallel? |
|------|------|-----------|-----------|
| 13 | **16 WhatsApp Sale Alerts** | 4 | Yes with 17 |
| 13–14 | **17 Link-in-Bio Store** | 4.5–5 | Yes with 16 |
| 14 | **19 Private Drops + Schedule** | 5 | After 17 layout settles; before 18 |
| 15 | **18 Custom Offers** | 7 | After 19 (unlisted + tokens) |
| 15–16 | **20 Source Analytics** | 5 | Tag 17/18/08 links as they land |
| 16 | **21 Buyer CRM** | 5 | Independent of 18 |

**Week 16 goal:** producers get WhatsApp sale pings, a bio store, private/scheduled drops, negotiate links, and can see traffic + customers.

### P4 — Standout (Weeks 17–20)

| Week | Plan | Est. Days | Parallel? |
|------|------|-----------|-----------|
| 17 | **24 Free Download Leads** | 4–4.5 | Yes — parallel with 22a |
| 17–18 | **22 Custom Services** | 9 (or 22a ~2 days) | Split if needed |
| 18–19 | **23 Collab Splits** | 5.5–6 | After 01; backfill earnings before tax |
| 19–20 | **25 Producer GST / Tax Pack** | 5 | After 23 if collab shares must appear |

**Week 20 goal:** work-for-hire or lead magnet live; collab money is automatic; CA-ready monthly export.

---

## Phase 0 — Earnings Foundation Fix (Prerequisite)

**Why:** All producer revenue methods join `beats` only — pack sales are silently dropped. No `producerId` on Purchase means every balance query needs an expensive `$lookup`. Payouts would show wrong numbers from day one.

### Tasks

| # | Task | File | Description |
|---|------|------|-------------|
| 0.1 | Add `producerId` to Purchase | `src/lib/models/Purchase.ts` | New `producerId: ObjectId, ref: "User"` field + `{ producerId: 1 }` index |
| 0.2 | Update types | `src/types/index.ts` | Add `producerId` to `IPurchase` |
| 0.3 | Denormalize in fulfillOrder | `src/lib/services/payment.service.ts` | Resolve `producerId` from beat/pack and pass into `purchaseRepository.create()` |
| 0.4 | Rewrite earnings queries | `src/lib/repositories/purchase.repository.ts` | `getEarningsByProducer()` uses `producerId` directly (no `$lookup`), covers beat + pack |
| 0.5 | Backfill script | `scripts/backfill-purchase-producer-ids.mjs` | One-time: lookup beat/pack → set `producerId` on existing purchases |

**Est:** 0.5 days

---

## Plan 01 — Producer Payouts

**Priority:** P0 | **Est:** 9.5 days | **Deps:** Phase 0

### Phase 1: Data model (0.5 day)

| # | File | Change |
|---|------|--------|
| 1.1 | `src/types/index.ts` | Add `IPayout`, `PayoutStatus`, `PayoutMethod`, `IPayoutDetails` |
| 1.2 | `src/lib/models/Payout.ts` | **Create.** Schema: `producerId`, `amount`, `platformFee`, `netAmount`, `method`, `upiId?`, `bankDetails?`, `status`, `razorpayPayoutId?`, `razorpayFundAccountId?`, `failureReason?`, `processedAt?` |
| 1.3 | `src/lib/models/User.ts` | Add `payoutDetails?: { upiId?, bankAccount?, razorpayContactId?, razorpayFundAccountId? }` |

**Indexes:** `{ producerId: 1, status: 1 }`, `{ status: 1, createdAt: -1 }`, `{ razorpayPayoutId: 1 }` sparse unique

### Phase 2: Balance + validators (1 day)

| # | File | Change |
|---|------|--------|
| 2.1 | `.env.example` | Add `PLATFORM_FEE_PERCENT=10` |
| 2.2 | `src/lib/repositories/payout.repository.ts` | **Create.** `create()`, `findById()`, `updateStatus()`, `getCompletedAndProcessingTotal()`, `findByProducer()`, `findPending()` |
| 2.3 | `src/lib/repositories/purchase.repository.ts` | Add `getWithdrawableBalance(producerId)` — gross earnings minus payouts minus fee |
| 2.4 | `src/lib/validators/payout.ts` | **Create.** `requestPayoutSchema` (min ₹100, conditional UPI/bank), `adminProcessPayoutSchema` |

### Phase 3: RazorpayX integration (2 days)

| # | File | Change |
|---|------|--------|
| 3.1 | `.env.example` | Add `RAZORPAYX_KEY_ID`, `RAZORPAYX_KEY_SECRET`, `RAZORPAYX_ACCOUNT_NUMBER`, `RAZORPAYX_WEBHOOK_SECRET`, `PAYOUT_AUTO_APPROVE_LIMIT=50000` |
| 3.2 | `src/lib/razorpayx.ts` | **Create.** Lazy-init client (Proxy pattern). `createContact()`, `createFundAccount()`, `createPayout()`, `verifyWebhookSignature()` |
| 3.3 | `src/lib/services/payout.service.ts` | **Create.** `requestPayout()`, `processWebhook()`, `getPayoutHistory()`, `getBalance()`, `adminApprovePayout()`, `adminRejectPayout()` |

**Race condition:** `findOneAndUpdate` with `{ producerId, status: { $nin: ["processing", "requested"] } }` guard.

### Phase 4: API routes (1 day)

| # | File | Method | Auth |
|---|------|--------|------|
| 4.1 | `src/app/api/payouts/route.ts` | GET (history), POST (request) | Producer |
| 4.2 | `src/app/api/payouts/balance/route.ts` | GET | Producer |
| 4.3 | `src/app/api/payouts/webhook/route.ts` | POST | RazorpayX signature |
| 4.4 | `src/app/api/admin/payouts/route.ts` | GET (pending) | Admin |
| 4.5 | `src/app/api/admin/payouts/[id]/route.ts` | PATCH (approve/reject) | Admin |

### Phase 5: Studio UI (2 days)

| # | File | Change |
|---|------|--------|
| 5.1 | `src/components/layout/DashboardShell.tsx` | Add "Payouts" nav item (Wallet icon) |
| 5.2 | `src/app/studio/StudioDashboard.tsx` | Withdraw card: balance, fee %, button, last 5 payouts |
| 5.3 | `src/components/PayoutForm.tsx` | **Create.** Dialog: amount, UPI/bank toggle, saved details, confirmation |
| 5.4 | `src/app/(dashboard)/studio/payouts/page.tsx` | **Create.** Paginated history with status badges |

### Phase 6: Admin UI (1 day)

| # | File | Change |
|---|------|--------|
| 6.1 | `src/app/(dashboard)/admin/layout.tsx` | Add "Payouts" to navItems |
| 6.2 | `src/app/(dashboard)/admin/page.tsx` | Add pending payouts count card |
| 6.3 | `src/app/(dashboard)/admin/payouts/page.tsx` | **Create.** Payout requests table with approve/reject |

### Security

- Role gate: only `producer` / `admin`
- Atomic balance check via `findOneAndUpdate`
- Webhook: verify `X-Razorpay-Signature` with `RAZORPAYX_WEBHOOK_SECRET`
- PII: store RazorpayX fund account IDs, not raw bank numbers
- Rate limit: max 1 payout/day/producer
- Admin approval: payouts > `PAYOUT_AUTO_APPROVE_LIMIT`

### Tests

- `payout.service.test.ts` — balance math, fee calc, duplicate prevention, threshold
- Webhook status transitions
- RazorpayX sandbox end-to-end

---

## Plan 02 — Exclusive License + Unlist

**Priority:** P0 | **Est:** 6 days | **Deps:** None

### Phase 1: Schema changes (1 day)

| # | File | Change |
|---|------|--------|
| 1.1 | `src/lib/validators/license.ts` | Add `"exclusive"` to `LICENSE_TYPES` + defaults (₹49,999, all rights) |
| 1.2 | `src/lib/models/License.ts` | Add `"exclusive"` to type enum |
| 1.3 | `src/types/index.ts` | Update `LicenseType` union |
| 1.4 | `src/lib/models/Beat.ts` | Add `exclusiveBuyerId?: ObjectId`, `exclusiveSoldAt?: Date` |
| 1.5 | `src/types/index.ts` | Add exclusive fields to `IBeat` |

### Phase 2: Purchase flow (2 days)

| # | File | Change |
|---|------|--------|
| 2.1 | `src/lib/services/payment.service.ts` | After exclusive payment: set beat `"archived"`, set `exclusiveBuyerId`, deactivate other licenses |
| 2.2 | `src/lib/services/beat.service.ts` | Add `markExclusivelySold()`, prevent re-publish of exclusive beats |
| 2.3 | `src/lib/repositories/beat.repository.ts` | Add `markExclusive(beatId, buyerId, session?)` |

### Phase 3: Guards (0.5 day)

| # | File | Change |
|---|------|--------|
| 3.1 | `src/lib/services/payment.service.ts` | `createOrder()`: reject if beat has `exclusiveBuyerId`; reject exclusive if beat already has exclusive purchase |
| 3.2 | `src/lib/services/license.service.ts` | One exclusive license per beat; can't delete if leases exist |

### Phase 4: UI (2 days)

| # | File | Change |
|---|------|--------|
| 4.1 | `src/components/LicenseSelector.tsx` | Gold exclusive tier card; "removes beat from marketplace" warning; "Sold exclusively" state |
| 4.2 | `src/components/UploadForm.tsx` | Exclusive price field |
| 4.3 | `src/app/beats/[id]/page.tsx` | "Exclusively Licensed" badge; hide license picker for non-owners |
| 4.4 | `src/lib/license-ui.ts` | Gold accent for exclusive tier |

### Phase 5: Notifications (0.5 day)

- Email producer on exclusive sale via `emailService`

### Security

- Transaction (`withTransaction`) for exclusive purchase to prevent race conditions
- Only the beat's producer can create/price exclusive licenses
- Existing lease holders retain download access forever

---

## Plan 03 — License PDF + GST Receipt

**Priority:** P0 | **Est:** 6 days | **Deps:** None

### Phase 1: Setup (0.5 day)

- `npm install @react-pdf/renderer`

### Phase 2: License PDF template (2 days)

| # | File | Change |
|---|------|--------|
| 2.1 | `src/lib/pdf/license-template.tsx` | **Create.** React PDF component: header, parties, beat details, license tier/terms, rights, payment confirmation, verification hash |
| 2.2 | `src/lib/services/pdf.service.ts` | **Create.** `generateLicensePdf(purchaseId)`, `generateVerificationHash(purchaseId)` |

### Phase 3: Invoice template (1 day)

| # | File | Change |
|---|------|--------|
| 3.1 | `src/lib/pdf/invoice-template.tsx` | **Create.** Platform GST details, buyer details, line items, tax breakup (IGST 18%), total, invoice number |
| 3.2 | `.env.example` | Add `PLATFORM_GSTIN`, `PLATFORM_LEGAL_NAME`, `PLATFORM_ADDRESS`, `GST_RATE=18` |

### Phase 4: Storage + model (1 day)

| # | File | Change |
|---|------|--------|
| 4.1 | `src/lib/models/Purchase.ts` | Add `licensePdfKey?: string`, `verificationHash?: string` |
| 4.2 | `src/lib/services/payment.service.ts` | After payment: generate + store PDF in S3 (`licenses/{purchaseId}.pdf`) |

### Phase 5: API + UI (1.5 days)

| # | File | Change |
|---|------|--------|
| 5.1 | `src/app/api/purchases/[id]/license-pdf/route.ts` | **Create.** GET: auth check → serve PDF |
| 5.2 | `src/app/api/orders/[id]/invoice/route.ts` | **Create.** GET: auth check → generate invoice |
| 5.3 | `src/app/(dashboard)/profile/page.tsx` | "Download License" button per purchase |
| 5.4 | `src/app/(dashboard)/profile/verify-license/page.tsx` | Connect to verification hash |

---

## Plan 04 — Trust & Brand Cleanup

**Priority:** P0 | **Est:** 1–2 days | **Deps:** None (start day 1)

| # | File | Change |
|---|------|--------|
| 1 | `src/components/Navbar.tsx` | "Test Mode" → "Trishul Beats" |
| 2 | `src/app/page.tsx` | Replace hardcoded stats with live DB counts (`beatRepository.countPublished()`, `userRepository.countByRole("producer")`, `beatRepository.countDistinctGenres()`) |
| 3 | `src/app/page.tsx` | Remove `TESTIMONIALS` array + "What Users Say" section |
| 4 | `src/app/page.tsx` | Fix empty emoji strings in genre cards |
| 5 | `src/app/page.tsx` | Uncomment "Start Selling" CTA → link to `/sell` |
| 6 | `src/app/about/page.tsx` | Remove "exclusive" from feature claims until 02 ships |
| 7 | `src/lib/repositories/beat.repository.ts` | Add `countPublished()`, `countDistinctGenres()` |
| 8 | Verify | `og-default.png`, `opengraph-image.tsx` show real branding |

---

## Plan 05 — Producer Acquisition

**Priority:** P0 | **Est:** 4–6 days | **Deps:** 04

### Phase 1: Landing page (2 days)

| # | File | Change |
|---|------|--------|
| 1.1 | `src/app/sell/page.tsx` | **Create.** Hero, value props, how it works, comparison table, pricing, CTA |
| 1.2 | `src/app/page.tsx` | Uncomment + link "Start Selling" to `/sell`; add producer section |

### Phase 2: Signup role hint (1 day)

| # | File | Change |
|---|------|--------|
| 2.1 | `src/app/(auth)/signup/page.tsx` | Accept `?role=producer` |
| 2.2 | `src/components/SignupForm.tsx` | Pre-select producer if role hint present |
| 2.3 | `src/app/onboarding/page.tsx` | Skip role picker if `?role=producer` |

### Phase 3: Waitlist (optional, 2 days)

| # | File | Change |
|---|------|--------|
| 3.1 | `src/lib/models/Waitlist.ts` | **Create.** `{ email, name, role, genres?, status, invitedAt? }` |
| 3.2 | `src/app/api/waitlist/route.ts` | **Create.** POST to join |
| 3.3 | `src/app/(dashboard)/admin/waitlist/page.tsx` | **Create.** View + invite producers |

### Phase 4: First upload nudge + welcome email (1 day)

| # | File | Change |
|---|------|--------|
| 4.1 | `src/app/studio/StudioDashboard.tsx` | If 0 beats: show "Upload Your First Beat" CTA instead of empty charts |
| 4.2 | `src/lib/services/email.service.ts` | Add `sendProducerWelcome()` |
| 4.3 | `src/lib/services/auth.service.ts` | Trigger welcome email on producer role set |

---

## Plan 06 — Discovery Filters

**Priority:** P1 | **Est:** 2–3 days | **Deps:** None (backend schema already exists)

| # | File | Change |
|---|------|--------|
| 1 | `src/app/beats/BeatsFilters.tsx` | Add dual-thumb BPM slider (40–300, step 5) + price range slider (₹0–₹50,000, step 100) |
| 2 | `src/app/beats/BeatsFilters.tsx` | Quick-filter pills: "Under ₹500", "Under ₹1,000", "60–90 BPM", "120–150 BPM" |
| 3 | `src/lib/services/marketplace.service.ts` | Post-filter beats by `startingPrice` within range |
| 4 | `src/lib/models/Beat.ts` (optional) | Denormalize `startingPrice` cache field; update on license CRUD |

**Index:** `{ bpm: 1 }` if not present.

---

## Plan 07 — Buyer Library

**Priority:** P1 | **Est:** 4–5 days | **Deps:** 03 (license PDF download)

| # | File | Change |
|---|------|--------|
| 1 | `src/app/(dashboard)/profile/library/page.tsx` | **Create.** Server component: auth, paginated purchases with beat/license info |
| 2 | `src/app/(dashboard)/profile/library/LibraryClient.tsx` | **Create.** Grid with cover, title, producer, license, date, per-file downloads, license PDF button |
| 3 | `src/lib/services/download.service.ts` | Add `getDownloadAccessByPurchase(purchaseId, userId)` |
| 4 | `src/components/layout/DashboardShell.tsx` | Add "My Library" nav item for buyers |
| 5 | `src/app/(dashboard)/profile/page.tsx` | Replace inline purchases with "View all in My Library →" |

---

## Plan 08 — WhatsApp Share + Inquire

**Priority:** P1 | **Est:** 2–3 days | **Deps:** None

| # | File | Change |
|---|------|--------|
| 1 | `src/app/beats/[id]/page.tsx` | Share row: WhatsApp, Copy Link, Native Share |
| 2 | `src/components/BeatCard.tsx` | Share icon in card actions dropdown |
| 3 | `src/lib/models/User.ts` | Add `whatsappNumber?: string` to socialLinks |
| 4 | `src/app/producer/[username]/page.tsx` | "Message on WhatsApp" button if number exists |
| 5 | `src/app/beats/[id]/page.tsx` | "Inquire on WhatsApp" in producer card |
| 6 | `src/app/api/beats/[id]/share/route.ts` | **Create.** POST to increment `sharesCount` |
| 7 | `src/lib/models/Beat.ts` | Add `sharesCount?: number` |

---

## Plan 09 — Purchase Email

**Priority:** P1 | **Est:** 3 days | **Deps:** 03 (license PDF attachment)

| # | File | Change |
|---|------|--------|
| 1 | `src/lib/services/email.service.ts` | Add `sendPurchaseConfirmation()` + `sendSaleNotification()` |
| 2 | `src/lib/services/payment.service.ts` | Fire-and-forget email after `verifyPayment()` and `verifyCartPayment()` |
| 3 | Email template | "Your beats are ready!" — order summary, signed download links (24h), library link |
| 4 | Producer email | "You made a sale!" — buyer, beat, amount, studio link |

**Note:** Email must not block payment response. Use fire-and-forget with error logging.

---

## Plan 10 — Unified Audio Player

**Priority:** P1 | **Est:** 5 days | **Deps:** None

| # | File | Change |
|---|------|--------|
| 1 | `src/components/AudioPlayerContext.tsx` | Add `queue[]`, `currentIndex`, `playNext()`, `playPrev()`, `repeat`, `shuffle`, expose `audioRef` |
| 2 | `src/app/beats/[id]/page.tsx` | Remove standalone `<AudioPlayer>`; auto-play via context; render `EnhancedPlayerView` (waveform, seek from context) |
| 3 | `src/components/BottomPlayer.tsx` | Add queue indicator ("1 of 5"), skip buttons, like button |
| 4 | `src/app/beats/BeatsGridClient.tsx` | Populate queue from visible beats; playing a card sets queue + index |
| 5 | Delete `src/components/GlobalAudioPlayer.tsx` | Empty file, remove |

**Architecture:** Single `<audio>` element in context. BottomPlayer = compact view. PDP = enhanced view. Both read from same state.

---

## Plan 11 — India Chart / Weekly Drops

**Priority:** P2 | **Est:** 5–6 days | **Deps:** None

| # | File | Change |
|---|------|--------|
| 1 | `src/lib/repositories/beat.repository.ts` | Add `findChartBeats(period, limit)` — score = (sales×10) + (plays×1) + (likes×3) within time window |
| 2 | `src/lib/services/chart.service.ts` | **Create.** `getWeeklyChart()`, `getNewDrops()`, `getEditorPicks()` |
| 3 | `src/app/charts/page.tsx` | **Create.** "India Top 10" — ISR 1h revalidation |
| 4 | `src/app/page.tsx` | Replace hardcoded "Trending" with time-windowed chart (top 4) + "New This Week" rail |
| 5 | `src/lib/models/FeaturedBeat.ts` | **Create.** `{ beatId, position, section, startDate, endDate, addedBy }` |
| 6 | `src/app/(dashboard)/admin/featured/page.tsx` | **Create.** Admin curation UI |

---

## Plan 12 — Embeddable Player

**Priority:** P2 | **Est:** 5–6 days | **Deps:** 10 (unified player context)

| # | File | Change |
|---|------|--------|
| 1 | `src/app/embed/[beatId]/page.tsx` | **Create.** Lightweight iframe page: cover, title, play/pause, "License on Trishul Beats →" CTA. `?theme=dark\|light&size=compact\|full` |
| 2 | `src/app/embed/[beatId]/layout.tsx` | **Create.** Stripped layout (no AppShell) |
| 3 | `src/app/embed/producer/[username]/page.tsx` | **Create.** Mini catalog: producer's beats (limit 10), inline play |
| 4 | `src/components/EmbedCodeGenerator.tsx` | **Create.** Size/theme options, iframe snippet + copy + preview |
| 5 | `src/app/api/embed/[beatId]/route.ts` | **Create.** Public JSON: title, producer, coverUrl, previewUrl, price. CORS headers |
| 6 | Studio integration | "Get Embed Code" button in studio + beat PDP (for owner) |

---

## Plan 13 — Guest UPI Checkout

**Priority:** P2 | **Est:** 7 days | **Deps:** None

| # | File | Change |
|---|------|--------|
| 1 | `src/lib/validators/payment.ts` | Add `createGuestOrderSchema` (beatId, licenseId, guestEmail) |
| 2 | `src/lib/services/payment.service.ts` | Add `createGuestOrder()`, `verifyGuestPayment()` |
| 3 | `src/lib/models/Order.ts` | Add `guestEmail?`, `guestName?` |
| 4 | `src/lib/models/Purchase.ts` | Make `buyerId` optional, add `guestEmail?` |
| 5 | `src/app/api/payment/guest/create-order/route.ts` | **Create.** No auth, rate limited by IP |
| 6 | `src/app/api/payment/guest/verify/route.ts` | **Create.** Verify, create purchase, send email, return download links |
| 7 | `src/components/LicenseSelector.tsx` | If not logged in: "Buy Now" → guest checkout modal (collect email) |
| 8 | `src/components/RazorpayButton.tsx` | Support `guestMode` prop |
| 9 | `src/app/download/[token]/page.tsx` | **Create.** Token-based download page (no auth, 48h expiry) |
| 10 | Guest-to-account linking | On signup: find purchases by `guestEmail`, set `buyerId` |

---

## Plan 14 — Founding Producer Program

**Priority:** P2 | **Est:** 6 days | **Deps:** 01 (payout fee logic)

| # | File | Change |
|---|------|--------|
| 1 | `src/lib/models/User.ts` | Add `producerTier?: "founding" \| "standard"`, `producerTierExpiresAt?`, `platformFeeOverride?` |
| 2 | `src/app/(dashboard)/admin/producers/page.tsx` | **Create.** Producer list with tier/verify/fee management |
| 3 | `src/app/producer/[username]/page.tsx` | "Founding Producer" gold badge |
| 4 | `src/components/BeatCard.tsx` | Small "Founding" indicator for founding producers |
| 5 | `src/app/page.tsx` | "Featured Producers" section with real founding producers |
| 6 | `src/lib/models/Invitation.ts` | **Create.** `{ email, name, token, status, expiresAt, producerTier }` |
| 7 | `src/lib/services/email.service.ts` | Add `sendFoundingInvitation()` |
| 8 | `src/lib/services/payout.service.ts` | Use `user.platformFeeOverride` if set + not expired |

---

## Plan 15 — Hindi + English i18n

**Priority:** P2 | **Est:** 8 days | **Deps:** All UI features (should go last)

| # | File | Change |
|---|------|--------|
| 1 | Install | `npm install next-intl` |
| 2 | `src/i18n/config.ts` | **Create.** Locales: `["en", "hi"]`, default: `"en"` |
| 3 | `src/i18n/messages/en.json` | **Create.** All buyer-facing strings |
| 4 | `src/i18n/messages/hi.json` | **Create.** Hindi translations (human-reviewed) |
| 5 | `src/middleware.ts` | Locale detection: URL prefix → Accept-Language → default |
| 6 | Buyer pages | Extract strings from: homepage, browse, beat PDP, cart, checkout, license selector, navbar, footer |
| 7 | `src/components/Navbar.tsx` | Language toggle: "EN \| हि" |
| 8 | `src/app/layout.tsx` | `lang` attribute + `hreflang` alternates |
| 9 | Font | Add Noto Sans Devanagari as fallback via `next/font` |

**Not localized in v1:** Studio, admin, upload form, API error messages.

---

## Cross-Cutting Concerns

### Files touched by 3+ plans (merge carefully)

| File | Plans |
|------|-------|
| `src/types/index.ts` | 0, 01, 02, 03, 05, 08, 13, 14, 16–25 |
| `src/lib/models/User.ts` | 01, 08, 14, 16, 17, 25 |
| `src/lib/models/Beat.ts` | 02, 06, 08, 11, 19, 20, 23, 24 |
| `src/lib/models/Purchase.ts` | 0, 03, 13 |
| `src/lib/services/payment.service.ts` | 0, 01, 02, 03, 09, 13, 18, 22 |
| `src/app/page.tsx` | 04, 05, 11, 14, 15 |
| `src/app/beats/[id]/page.tsx` | 02, 08, 10, 15, 18, 19, 24 |
| `src/components/LicenseSelector.tsx` | 02, 13, 15, 18, 24 |
| `src/components/layout/DashboardShell.tsx` | 01, 07, 17, 18, 20, 21, 22, 25 |
| `src/app/(dashboard)/admin/layout.tsx` | 01, 14 |
| `src/lib/services/email.service.ts` | 05, 09, 14, 16, 23 |
| `src/lib/services/order-fulfillment.ts` | 18, 22, 23 |
| `src/app/producer/[username]/page.tsx` | 08, 17, 22, 23 |
| `.env.example` | 01, 03, 16, 19 |

### New dependencies

| Package | Plan | Purpose |
|---------|------|---------|
| `@react-pdf/renderer` | 03 | License PDF generation |
| `next-intl` | 15 | i18n for App Router |

### New models

| Model | Plan | Collection |
|-------|------|------------|
| `Payout` | 01 | payouts |
| `Waitlist` | 05 | waitlists |
| `FeaturedBeat` | 11 | featuredbeats |
| `Invitation` | 14 | invitations |
| `NotificationLog` | 16 | notificationlogs |
| `Offer` | 18 | offers |
| `BeatEvent` | 20 | beatevents |
| `ProducerCustomerNote` | 21 | producercustomernotes |
| `ServiceListing` | 22 | servicelistings |
| `ServiceJob` | 22 | servicejobs |
| `Earning` | 23 | earnings |
| `Lead` | 24 | leads |

### New database indexes

| Collection | Index | Plan |
|------------|-------|------|
| Purchase | `{ producerId: 1 }` | Phase 0 |
| Payout | `{ producerId: 1, status: 1 }` | 01 |
| Payout | `{ status: 1, createdAt: -1 }` | 01 |
| Payout | `{ razorpayPayoutId: 1 }` sparse unique | 01 |
| Beat | `{ bpm: 1 }` | 06 |
| Purchase | `{ guestEmail: 1 }` | 13 |
| Purchase | `{ createdAt: -1, beatId: 1 }` | 11 |
| FeaturedBeat | `{ section: 1, startDate: 1, endDate: 1 }` | 11 |
| NotificationLog | `{ orderId: 1, producerId: 1, kind: 1, channel: 1 }` unique sparse | 16 |
| Offer | `{ token: 1 }` unique | 18 |
| Beat | `{ privateToken: 1 }` unique sparse; `{ status: 1, publishAt: 1 }` | 19 |
| BeatEvent | `{ producerId: 1, createdAt: -1 }`; TTL on `createdAt` 90d | 20 |
| Earning | `{ purchaseId: 1, producerId: 1 }` unique; `{ producerId: 1, createdAt: -1 }` | 23 |
| Lead | `{ beatId: 1, email: 1 }` sparse unique | 24 |

### New env vars

| Variable | Plan | Default |
|----------|------|---------|
| `PLATFORM_FEE_PERCENT` | 01 | `10` |
| `RAZORPAYX_KEY_ID` | 01 | — |
| `RAZORPAYX_KEY_SECRET` | 01 | — |
| `RAZORPAYX_ACCOUNT_NUMBER` | 01 | — |
| `RAZORPAYX_WEBHOOK_SECRET` | 01 | — |
| `PAYOUT_AUTO_APPROVE_LIMIT` | 01 | `50000` |
| `PLATFORM_GSTIN` | 03 | — |
| `PLATFORM_LEGAL_NAME` | 03 | — |
| `PLATFORM_ADDRESS` | 03 | — |
| `GST_RATE` | 03 | `18` |
| `WHATSAPP_PROVIDER` | 16 | `gupshup` |
| `WHATSAPP_API_KEY` | 16 | — |
| `WHATSAPP_TEMPLATE_SALE` | 16 | `sale_alert_v1` |
| `CRON_SECRET` | 19 | — |

---

## Total Effort Summary

| Tier | Plans | Total Days | Calendar Weeks |
|------|-------|------------|----------------|
| P0 | 01 + 02 + 03 + 04 + 05 | ~28–31 days | Weeks 1–4 (with parallelism) |
| P1 | 06 + 07 + 08 + 09 + 10 | ~16–19 days | Weeks 5–8 |
| P2 | 11 + 12 + 13 + 14 + 15 | ~31–33 days | Weeks 9–12 |
| P3 | 16–21 | ~30–32 days | Weeks 13–16 |
| P4 | 22–25 | ~23–25 days | Weeks 17–20 |
| **Grand total** | **25 plans** | **~128–140 dev-days** | **20 weeks** |

With a single developer, the parallelism opportunities are limited to context-switching between frontend and backend tasks. With 2 developers, P0 can realistically ship in 3 weeks by splitting backend (01, 02, 03) from frontend/content (04, 05). P3 can split 16+17 vs 19+20; P4 should not start 23 until the Earning backfill is designed against live payout math.

**If you only ship four P3 items:** 16 → 17 → 19 → 20 (WhatsApp pings, bio store, private/scheduled drops, source analytics). Then 18 (offers) and 21 (CRM).
