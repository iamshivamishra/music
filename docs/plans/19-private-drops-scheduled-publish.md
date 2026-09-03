# 19 — Private Drops + Scheduled Publish

**Priority:** P3 (producer depth)
**Timeline:** Week 14
**Why:** Producers already send a private preview to one artist before going public ("if they don't buy exclusive this week, it goes live Friday"). Today a beat is `draft | published | archived`. Drafts are invisible; published is fully marketplace-visible. There is no unlisted URL and no schedule. Exclusive unlist (plan 02) is post-sale, not pre-release.

---

## Current State

- `BeatStatus = "draft" | "published" | "archived"` (`src/lib/models/Beat.ts`).
- `isPublished` boolean denormalized; marketplace queries `isPublished: true`.
- Studio can toggle publish (`StudioBeatsClient`).
- Coupons already have `scheduled` + `scheduledAt` — pattern to copy, but coupons do **not** have a cron; status is derived at validate time.
- No `publishedAt`, no share token, no cron route.

## Competitive Bar

| Platform | Pre-release |
|----------|-------------|
| BeatStars | Unlisted / private links, schedule |
| SoundCloud | Private / scheduled (music, not licenses) |
| Instagram | Close-friends / DM a snippet |
| Trishul | Draft or live — nothing in between |

## Goal

Producer can (1) mark a beat **unlisted** and copy a secret link, (2) set `publishAt` and have it go live automatically. Unlisted beats are playable/licensable by anyone with the link (and guest UPI), but absent from browse, charts, sitemap, producer catalog, and embeds.

---

## Implementation Plan

### Phase 1: Status + fields (1 day)

**Files to modify:**

- `src/types/index.ts` — `BeatStatus = "draft" | "scheduled" | "unlisted" | "published" | "archived"`
- `src/lib/models/Beat.ts`:

```
status enum includes scheduled, unlisted
publishAt?: Date
publishedAt?: Date
privateToken?: string   // nanoid, unique sparse — only for unlisted
```

- Indexes: `{ privateToken: 1 }` unique sparse; `{ status: 1, publishAt: 1 }`; keep `{ producerId: 1, status: 1 }`
- `isPublished` remains **true only for `published`**. Unlisted/scheduled → `isPublished: false` so existing marketplace queries stay correct.
- `src/lib/validators/beat.ts` — publish action: `draft | unlisted | scheduled | published`; `publishAt` required if scheduled, must be future, max 90 days.

**Serializers:** public beat DTO must not include `privateToken` except to the owner.

### Phase 2: Access rules (1.5 days)

**File:** `src/lib/services/beat.service.ts` + marketplace/chart/pack/embed queries

Visibility matrix:

| Surface | draft | scheduled | unlisted | published | archived |
|---------|-------|-----------|----------|-----------|----------|
| /beats, marketplace, charts, home | no | no | no | yes | no |
| Producer public profile / embed catalog | no | no | no | yes | no |
| Sitemap | no | no | no | yes | no |
| `/beats/[id]` default | owner | owner | **token or owner** | yes | owner / exclusive buyer |
| License + guest checkout | no | no | **token or owner** | yes | no |
| Studio list | yes | yes | yes | yes | yes |

Unlisted PDP: `GET /beats/[id]?t={privateToken}` or cookie after first unlock. Service compares token with `timingSafeEqual`.

**Files to audit (must filter `status: "published"` / `isPublished: true`):**

- `beat.repository.ts` — findPublished, search, charts
- `marketplace.service.ts`, `home.service.ts`, `chart.service.ts`, `embed.service.ts`, `producer.service.ts`
- Sitemap generation

Do not rely on `status !== "draft"` — that would leak unlisted into browse.

### Phase 3: Cron publish (0.5 day)

No in-process scheduler today. Add:

- `src/app/api/cron/publish-scheduled/route.ts` — `GET` or `POST`, Authorization `Bearer ${CRON_SECRET}`
- `beatService.publishDueScheduled(now)` — `find({ status: "scheduled", publishAt: { $lte: now } })`, set `published`, `isPublished: true`, `publishedAt: now`, clear `privateToken` if any
- Cap 100 per run; log remainder
- `vercel.json` cron every 5 minutes (or document GitHub Action ping)

After publish, optional: plan 16 drop WhatsApp / Status is a follow-up, not blocking.

### Phase 4: Studio UI (1.5 days)

- `StudioBeatsClient` — status badges for scheduled/unlisted; actions: Unlist, Schedule, Copy private link, Publish now
- `UploadForm` — after files: "Save draft" | "Unlisted link" | "Schedule" | "Publish"
- `EditBeatForm` — same status controls; datetime-local for `publishAt` (IST display, store UTC)
- Copy link: `{APP}/beats/{id}?t={privateToken}`

Private token generated on first transition to `unlisted`; rotating the token invalidates old links (button: "Reset link").

### Phase 5: PDP + SEO (0.5 day)

- Unlisted/scheduled: `noindex, nofollow`
- Open Graph still works for the person with the link (intentional — they will paste in WhatsApp)
- If token missing/wrong → 404 (do not 403 "this is unlisted" — avoids probing)

---

## Interaction with other plans

- **02 Exclusive:** exclusive purchase from unlisted still archives + `exclusiveBuyerId`.
- **17 Store:** unlisted beats cannot be pinned.
- **18 Offers:** producer can attach an offer to an unlisted beat; pay link does not need `?t=` if the offer token is enough — offer.service loads beat by id as owner-authorized. Public offer page should work for unlisted beats.
- **11 Charts:** unlisted never scores.

## Security

- Token entropy: `nanoid(21)`.
- Rate limit token guesses per IP on PDP.
- Cron secret required; no public publish endpoint without it.
- Owner/admin always allowed.

## Edge Cases

- Schedule in the past → reject.
- Unlisted beat in a **published pack** → pack page must not list it, or pack cannot include unlisted (prefer: packs only allow published members).
- `pack_only` + unlisted — allowed (send private pack? out of scope). Keep simple: unlisted is for individual beats.
- DST/timezone: store UTC; label "India time (IST)" in the form.

## Testing

- `beat.service.test.ts` — visibility matrix, token compare, cron publish batch
- Marketplace/chart queries never return unlisted
- Sitemap test if one exists

## Estimated Effort

- Schema + visibility audit: 2.5 days
- Cron: 0.5 day
- Studio + PDP: 2 days
- **Total: ~5 days**
