# Beat Detail

Both have a beat page with player, licenses, related. Trishul splits hero/producer, adds share, SEO schema, ISR, and route-level error/loading.

## Minor

| Feature | For | Why it matters | Lives in Trishul | Pri |
|---|---|---|---|---|
| BeatHeroCard + stats grid | Guest | Extracted hero with published/genre/BPM/key/mood stats. Music is a flatter layout. | `BeatHeroCard` | P2 |
| BeatProducerCard | Guest | Dedicated producer card vs Music’s inline block. | `BeatProducerCard` | P2 |
| Share on hero | Guest | ShareDialog sits beside Like in the hero row. | `BeatHeroCard` + `ShareDialog` | P2 |
| Auto-generated description fallback | SEO, guest | Always shows a description card; writes SEO copy when the producer left it empty. | `beats/[id]` description card | P2 |
| Breadcrumb JSON-LD | SEO | Home → Browse → Beat `BreadcrumbList` schema. | `beats/[id]` JSON-LD | P2 |
| OG fallback image | Social | Uses `/og-default.png` when no cover. Music passes an empty image array. | `beats/[id]` metadata | P2 |
| ISR + cached beat fetch | System | `revalidate 60` and `react.cache` between metadata and page. Music is `force-dynamic`. | `beats/[id]` revalidate | P2 |
| Presigned preview vs full audio | Buyer vs guest | Signs the right file based on purchase. Related covers are batch-presigned too. | `storageService` + `withPresignedBeatCovers` | P1 |
| Broken audio source UX | Guest | `normalizeAudioSource` + user-facing error if preview URL is invalid. Music assumes it works. | `audio-source.ts` | P2 |
| Detail error + loading routes | Guest | `beats/[id]/error.tsx` retry and `loading.tsx` skeleton. Music has neither. | `beats/[id]/error` + `loading` | P2 |
| Mobile padding for sticky license bar | Mobile buyer | `pb-20` so the sticky buy bar does not cover related beats. | `beats/[id]` layout | P2 |
