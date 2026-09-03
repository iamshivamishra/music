# 12 — Embeddable Player

**Priority:** P2 (differentiation)
**Timeline:** Week 10–11
**Why:** BeatStars has "Blaze Player" — an embeddable player producers put in YouTube descriptions, Instagram bio links, and their own websites. Airbit has an embeddable store. This is how producers distribute beyond the marketplace and bring their own traffic.

---

## Current State

- No embeddable player or widget
- No public API for beat metadata
- Beat PDP has a working audio player with waveform
- Presigned URLs are used for downloads, but preview URLs (`audioTaggedUrl`) are public

## Competitive Bar

| Platform | Embed |
|----------|-------|
| BeatStars | Blaze Player — embed single beat or full catalog, customizable |
| Airbit | Infinity Store — embeddable beat store widget |
| Traktrain | No embed |

## Goal

Producers can embed a single-beat player or a mini catalog player on external sites. The player links back to Trishul Beats for licensing.

---

## Implementation Plan

### Phase 1: Embed page (iframe source)

**Files to create:**

- `src/app/embed/[beatId]/page.tsx` — lightweight page designed for iframe embedding:
  ```
  - Minimal layout (no navbar, no footer, no shell)
  - Beat cover, title, producer name
  - Play/pause button with audio
  - "License on Trishul Beats →" CTA linking to full PDP
  - Responsive: 300x80px compact mode, 400x300px full mode
  - Query params: ?theme=dark|light&size=compact|full
  ```

- `src/app/embed/[beatId]/layout.tsx` — stripped layout (no AppShell)

- `src/app/embed/producer/[username]/page.tsx` — mini catalog:
  ```
  - List of producer's published beats (limit 10)
  - Play any beat inline
  - Each beat links to Trishul Beats PDP
  - Producer branding (avatar, name)
  ```

### Phase 2: Embed code generator

**Files to create:**

- `src/components/EmbedCodeGenerator.tsx` — client component:
  ```
  - Input: beatId or producer username
  - Options: size (compact/full), theme (dark/light)
  - Output: <iframe> code snippet + preview
  - Copy button
  ```

**Integration points:**

- `src/app/beats/[id]/page.tsx` — "Embed" button (for producer/admin of the beat)
- `src/app/producer/[username]/page.tsx` — "Embed My Store" button (for the producer)
- `src/app/studio/StudioDashboard.tsx` — "Get Embed Code" in quick actions

### Phase 3: Public API for embed

**Files to create:**

- `src/app/api/embed/[beatId]/route.ts` — public JSON endpoint:
  ```
  GET /api/embed/{beatId}
  Response: { title, producer, coverUrl, previewUrl, genre, bpm, pdpUrl, price }
  ```
  - No auth required (public data only)
  - Rate limited
  - CORS headers for cross-origin iframe/fetch

- `src/app/api/embed/producer/[username]/route.ts` — public catalog endpoint:
  ```
  GET /api/embed/producer/{username}?limit=10
  Response: { producer: { name, avatar }, beats: [{ title, coverUrl, previewUrl, price, pdpUrl }] }
  ```

### Phase 4: Embed styling

- Dark theme (default): dark background, white text — matches most websites
- Light theme: white background
- Compact mode: 300x80px — title, play, price, CTA
- Full mode: 400x300px — cover art, title, waveform, play, price, CTA
- Responsive: scales within iframe bounds

### Phase 5: Analytics

- Track embed loads: `POST /api/embed/[beatId]/view` (fire-and-forget)
- Track click-throughs to PDP from embed
- Show embed views in studio analytics

---

## Embed Code Output

```html
<!-- Single beat -->
<iframe
  src="https://trishulbeats.com/embed/{beatId}?theme=dark&size=compact"
  width="300"
  height="80"
  frameborder="0"
  allow="autoplay"
  style="border-radius: 8px;"
></iframe>

<!-- Producer catalog -->
<iframe
  src="https://trishulbeats.com/embed/producer/{username}?theme=dark"
  width="400"
  height="500"
  frameborder="0"
  allow="autoplay"
  style="border-radius: 8px;"
></iframe>
```

## Security Considerations

- Embed pages serve public data only (no auth, no user session)
- CORS headers must be set for cross-origin embedding
- Rate limit the embed API to prevent abuse
- Preview audio URLs are already public — no signed URL needed for tagged previews
- X-Frame-Options must allow embedding (remove `DENY` header for `/embed/*` routes)

## Testing

- Embed renders correctly in iframe on an external HTML page
- Audio plays in iframe (autoplay policies)
- CTA links open in parent window (`target="_parent"`)
- Mobile iframe responsiveness

## Estimated Effort

- Embed pages (single + catalog): 3 days
- Embed code generator: 1 day
- Public API endpoints: 1 day
- Analytics tracking: 0.5 day
- **Total: ~5–6 days**
