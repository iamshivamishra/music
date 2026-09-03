# Browse / Marketplace

Both have `/beats` with genre, key, mood, search. Trishul’s catalog is richer in pagination, empty states, SEO, and SSR media.

## Minor

| Feature | For | Why it matters | Lives in Trishul | Pri |
|---|---|---|---|---|
| Ellipsis pagination | Guest | Prev/next + ellipsis. Music renders every page number inline. | `Pagination.tsx` | P2 |
| Richer empty state | Guest | Clear-all-filters plus Browse Beat Packs CTA when no results. | beats empty state | P2 |
| Dynamic browse metadata | SEO | Title/description change with genre, mood, search, and page. | `beats/page` `generateMetadata` | P2 |
| Presigned cover + preview on SSR | Guest | Grid images and audio are signed before render. Music can serve stale/private URLs. | `withPresignedBeatCovers` | P1 |
| Image priority on first cards | Guest | First four cards get Next/Image priority for LCP. | `BeatsGridClient` priority | P2 |
| EQ waveform overlay on cards | Guest | Animated equalizer on cover when idle/playing. Music cards are static. | `BeatCard` EQ overlay | P2 |
| No dead MoreVertical icon | Guest | Music shows a non-functional overflow icon on the title row. | `BeatCard` omits it | P2 |
| `GET /api/beats` rate limit | System | 60/min on catalog list. Music list is unrated. | beats route limiter | P2 |
| `GET /api/marketplace` rate limit | System | 60/min. Music marketplace route is unrated. | marketplace route limiter | P2 |
