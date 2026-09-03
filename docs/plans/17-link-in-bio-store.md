# 17 — Link-in-Bio Producer Store

**Priority:** P3 (producer depth)
**Timeline:** Week 13–14
**Why:** Producers already put one link in Instagram bios. Today `/producer/[username]` is a public catalog with follow + WhatsApp inquire. It is not a store: no pinned drops, no featured pack, no guest buy on the profile itself, no "copy bio link" that feels like Linktree. Embeds (plan 12) cover YouTube iframes. This plan covers the **destination** those links hit.

---

## Current State

- `/producer/[username]` — avatar, bio, socials, WhatsApp inquire, beat grid, ISR 300s (`producer.service.ts`).
- `OwnerActions.tsx` — owner-only edit shortcuts.
- Embed catalog: `/embed/producer/[username]` (limit 10, iframe).
- Guest UPI checkout works on beat PDP (`LicenseSelector` + `GuestRazorpayButton`), not on the profile grid.
- No pin/featured pack, no store headline, no short URL, no theme.
- Packs have their own `/beat-packs/[slug]` pages and are not merchandised on the producer profile.

## Competitive Bar

| Platform | Store |
|----------|--------|
| BeatStars | Customizable producer page + Blaze Player |
| Airbit | Infinity Store (embeddable + hosted) |
| Linktree / Beacons | Generic links, no licensing |
| Instagram + UPI | Bio link to WhatsApp — no store |

## Goal

Producer copies one URL (`/p/{username}` or existing `/producer/{username}`) into Instagram bio. The page shows: hero, pin 3 beats, featured pack, WhatsApp, guest-capable buy. Studio has a "Store" editor: pins, headline, featured pack. No custom domain in v1.

---

## Implementation Plan

### Phase 1: Store settings on User (0.5 day)

**Files to modify:**

- `src/types/index.ts` / `src/lib/models/User.ts`:

```
store?: {
  headline?: string;          // max 80
  showWhatsApp: boolean;      // default true if number exists
  pinnedBeatIds: ObjectId[];  // max 3, must belong to producer
  featuredPackId?: ObjectId;
}
```

- `src/lib/validators/store.ts` — Zod: headline, pin ids (max 3 unique), featuredPackId
- `src/lib/repositories/user.repository.ts` — `updateStore(producerId, store)`
- `src/lib/services/store.service.ts`:
  - `getStore(username)` — producer + pinned beats + featured pack + rest of catalog
  - `updateStore(producerId, input)` — ownership checks: every pin is this producer's published beat; pack is theirs and published

Pins that become archived/exclusive must be dropped on read (don't fail the page).

### Phase 2: Short URL + store layout (2 days)

**Files to create/modify:**

- `src/app/p/[username]/page.tsx` — **redirect** 308 to `/producer/[username]` (short bio link). Avoid duplicating the page.
- `src/app/producer/[username]/page.tsx` — restructure:

```
Hero: cover, avatar, name, founding/verified, headline
CTAs: Follow | WhatsApp | Share store
Pinned: up to 3 large cards with play + starting price + License CTA
Featured pack: PackCard
Catalog: remaining beats (existing ProducerBeatsGrid)
```

- `src/app/producer/[username]/PinnedBeats.tsx` — client play via audio context, license button
- Guest: License CTA goes to beat PDP (already has guest checkout). Do **not** embed full Razorpay on the grid in v1 — keeps the profile fast. Optional stretch: compact license sheet.

**SEO:** keep existing ProfilePage JSON-LD. Canonical stays `/producer/{username}`. `/p/{username}` is not indexed (redirect).

### Phase 3: Studio Store editor (1.5 days)

**Files to create:**

- `src/app/(dashboard)/studio/store/page.tsx` — server page, auth producer
- `src/app/(dashboard)/studio/store/StoreEditorClient.tsx`:
  - Headline input
  - Beat picker for pins (search own published beats, drag order)
  - Pack picker for featured pack (or none)
  - Live preview (narrow phone frame)
  - "Copy bio link" → `{APP_URL}/p/{username}`
  - "Share store on WhatsApp" using plan 08 helpers

**Nav:** add "Store" to `SidebarNav`, `MobileDrawer`, `DashboardShell` `allLinks` (page-layout rule).

### Phase 4: Owner merchandising on public profile (0.5 day)

- `OwnerActions.tsx` — "Edit store" → `/studio/store`
- Empty pins: fall back to 3 most recent published beats (do not show an empty "Pinned" heading)

### Phase 5: Share + OG (0.5 day)

- Producer OG already uses avatar. If `store.headline` exists, use it as OG description.
- After store save, toast with copy-link.

Stretch (not v1): `username.trishulbeats.com` via wildcard DNS + middleware. Call it out as P5.

---

## UI Design

Mobile-first (this page *is* the Instagram landing):

```
┌─────────────────────────┐
│         cover           │
│     [avatar] Name ★     │
│   headline one line     │
│ [Follow] [WhatsApp]     │
│ ──── Pinned ────        │
│ [big card] [big card]   │
│ ──── Pack ────          │
│ [PackCard]              │
│ ──── All beats ────     │
│ grid…                   │
└─────────────────────────┘
```

## Performance

- Continue `react.cache` + `revalidate = 300`.
- `store.service.getStore` one producer fetch + batch beats/packs (no N+1).
- Pinned IDs are max 3 — `$in` query.

## Security

- Only the producer (or admin) can PATCH store settings.
- Pin IDs must be owned + published. Reject pack_only beats as pins (they cannot be licensed individually).
- Featured pack must be published and owned.
- Public store never leaks drafts, unlisted, or exclusive-sold beats.

## Edge Cases

- Username change → old `/p/old` 404s (same as profile today). Document; no alias table in v1.
- 0 published beats → empty catalog + "Uploading soon" if owner.
- Exclusive sold pin → skip, backfill next published.
- Guest on store → follow requires login; buy goes to PDP guest checkout.

## Testing

- `store.service.test.ts` — pin ownership, max 3, drop archived pins on read
- Redirect `/p/user` → `/producer/user`
- Studio editor validation (Zod)

## Estimated Effort

- Model + service: 0.5 day
- Profile layout + short URL: 2 days
- Studio editor + nav: 1.5 days
- OG + owner actions: 0.5 day
- **Total: ~4.5–5 days**
