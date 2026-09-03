# 20 — Source & Funnel Analytics

**Priority:** P3 (producer depth)
**Timeline:** Week 15–16
**Why:** Studio shows revenue, sales, plays, monthly charts, top beats (`studioService.getAnalytics`). It cannot answer "did this sale come from Instagram, my embed, WhatsApp share, or marketplace search?" Producers will not keep uploading into a black box. BeatStars' traffic reports are a reason power sellers stay.

---

## Current State

- Plays: fire-and-forget `POST /api/beats/[id]/plays` from `AudioPlayerContext` — increments `Beat.plays` only. No source, no unique visitor, no funnel.
- Shares: `POST /api/beats/[id]/share` increments `sharesCount`.
- Embeds: plan 12 noted embed view tracking; confirm whether `/api/embed/[beatId]/view` shipped — treat as missing if not wired into studio.
- Purchases store `producerId`, beat/pack, amount — **no `utm` / `referrer` / `source`**.
- Orders have no attribution fields.
- GA/GTM exist for the app (`NEXT_PUBLIC_GA_ID`) — not producer-facing, not per-beat.

## Competitive Bar

| Platform | Analytics |
|----------|-----------|
| BeatStars | Traffic sources, plays, unique listeners, sales |
| Airbit | Store analytics |
| Instagram Insights | Reach / profile visits — not license funnels |
| Trishul | Totals only |

## Goal

For each producer: plays, PDP views, checkouts started, paid conversions — by beat and by **source** (`marketplace`, `profile`, `embed`, `whatsapp`, `instagram`, `direct`, `offer`, `other`). Attribution on the **order**, not only the play. Studio page with a simple funnel and last-30-days source table.

Not a data warehouse. No Mixpanel required in v1.

---

## Attribution model

First-touch for the **session**, last-touch for the **order**.

1. Landing with `?src=` or known referrer sets a first-party cookie `tb_src` (90 days) + `tb_src_beat` if on a PDP.
2. Play events store `source`.
3. `create-order` copies cookie → `Order.attribution`.
4. Paid order is the conversion row.

Allowed `src` values (allowlist, max 32 chars):

```
marketplace | search | profile | embed | whatsapp | instagram | youtube | offer | charts | direct | other
```

Unknown `src` → `other`. Never store raw URLs with query PII.

Share links (plan 08) and store bio link (plan 17) and offer links (plan 18) and embed CTAs (plan 12) must append `?src=`.

---

## Implementation Plan

### Phase 1: Event + order fields (1 day)

**New model** `BeatEvent` (high write, keep tiny):

```
IBeatEvent {
  beatId: ObjectId
  producerId: ObjectId
  kind: "play" | "pdp_view" | "embed_view" | "share" | "checkout_start"
  source: AttributionSource
  createdAt: Date
}
```

Do **not** store IP or userId on events in v1 (privacy + size). Optional hash later.

TTL index: `{ createdAt: 1 }` expireAfterSeconds = 90 days (events). Aggregates live on Order/Purchase forever.

**Order:**

```
attribution?: {
  source: AttributionSource
  beatId?: ObjectId
}
```

**Files:** `src/lib/models/BeatEvent.ts`, repository with `insertOne` + `aggregateFunnel(producerId, from, to)`.

Indexes:

```
BeatEvent: { producerId: 1, createdAt: -1 }
BeatEvent: { beatId: 1, kind: 1, createdAt: -1 }
BeatEvent: { createdAt: 1 } TTL 90d
Order: { "attribution.source": 1, paidAt: -1 }
```

### Phase 2: Capture (1.5 days)

- `src/lib/attribution.ts` — parse `src`, map Referer host (`instagram.com` → instagram, `youtube.com`/`youtu.be` → youtube, `wa.me`/`web.whatsapp.com` → whatsapp, same-origin `/embed` → embed, `/producer` → profile, `/beats` list → marketplace, `/charts` → charts, `/offer` → offer)
- Middleware or a tiny client `AttributionCapture.tsx` in AppShell — sets cookie if `src` present (doesn't overwrite a newer campaign within 30 min — last-touch cookie update on new `src`)
- Plays route: accept optional `source` from cookie/header, write BeatEvent + keep incrementing `Beat.plays`
- PDP server page: record `pdp_view` (sampled if needed; start unsampled)
- Embed: `embed_view` on embed page load
- Share route: pass `source: whatsapp` when that button is used
- Payment create-order: copy cookie onto Order; kind `checkout_start` event

Fire-and-forget; never block audio or payment.

**Cap:** 1 play event per beat per session per 30s (reuse existing play increment behavior if it already debounces — check `AudioPlayerContext`).

### Phase 3: Studio analytics API + UI (2 days)

- `studioService.getAnalytics` extends with `{ from, to }` (default 30d):
  - funnel: plays, pdp views, checkouts, paid
  - by source: plays, paid count, GMV
  - by beat: plays, paid, conversion (paid/pdp_views)
  - "high play, zero sales" list (play > N, sales 0 in window)
- `src/app/api/studio/analytics/route.ts` — producer session only
- `src/app/(dashboard)/studio/analytics/page.tsx` + `StudioAnalyticsClient.tsx`
  - Date range: 7 / 30 / 90
  - Funnel row
  - Source table
  - Beat table sorted by plays
- Nav: "Analytics" (or upgrade Overview charts and keep Overview as summary — prefer a dedicated page so Overview stays light)

Reuse `MiniChart` if it fits; otherwise a simple table is enough. No new chart library.

### Phase 4: Tag outbound links (0.5 day)

- WhatsApp share text URLs: append `?src=whatsapp`
- Store copy-link: `?src=instagram` is wrong (they might paste anywhere) — use `?src=profile` on `/p/username`
- Embed CTA: `?src=embed`
- Offer pay link: `?src=offer`
- Charts cards: `?src=charts`

---

## Privacy

- No third-party pixels on producer pages beyond existing GTM.
- No buyer identity on BeatEvent.
- Cookie is first-party, `SameSite=Lax`, not used for ads.
- Document in privacy policy: "We record anonymous play and referral source to show sellers their stats."

## Performance

- BeatEvent writes are the hot path. Use unordered insert, no transactions.
- If volume hurts, switch plays to sampled events (1/10) while keeping `Beat.plays` exact.
- Aggregations always bounded by date + producerId index.
- Pre-aggregate daily rollup (`AnalyticsDaily`) only if profiling says so — not v1.

## Security

- Analytics API: producer can only query own `producerId`.
- `src` allowlist — ignore anything else (no log injection).
- Cron/admin cannot dump raw events to CSV in v1 (PII creep).

## Edge Cases

- Guest checkout: attribution still on Order (`guestEmail` path).
- Cart with multiple beats: one order-level source (last touch). Item-level source is a later enhancement.
- Missing cookie → `direct`.
- Producer playing their own beat → still counts (v1); optional exclude-self later via session.

## Testing

- `attribution.test.ts` — referrer mapping, allowlist
- Create-order copies cookie
- Analytics service filters other producers' events
- Funnel math fixture

## Estimated Effort

- Model + capture plumbing: 2.5 days
- Studio page: 2 days
- Link tagging: 0.5 day
- **Total: ~5 days**
