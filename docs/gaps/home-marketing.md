# Home, Marketing & Contact

Both have a landing, about, and contact page. Trishul’s home is a marketing system; Music’s contact form does not submit.

## Major

| Feature | For | Why it matters | Lives in Trishul | Pri |
|---|---|---|---|---|
| Featured pack slider | Guest | Homepage merchandising for packs. | `BeatPackSlider` | P1 |
| YouTube + Spotify showcases | Guest | Brand proof with thumbnail proxies. | `YoutubeBeats`, `SpotifyShowcase` | P2 |
| Social proof, partners, 3D cube, motion | Guest | Conversion modules on home that Music does not render. | `SocialProofStrip`, `PartnerBrands`, `BeatCube3D` | P2 |
| About FAQ + FAQPage schema | Guest | Music about is four static cards. | `/about` + `Faqaccordion` | P2 |
| Working contact form | Guest | Music UI has no submit handler. Trishul posts to `/api/contact` and emails admin via Resend. | `POST /api/contact` | P0 |

## Minor

| Feature | For | Why it matters | Lives in Trishul | Pri |
|---|---|---|---|---|
| Homepage canonical + ItemList JSON-LD | SEO | Canonical `/` and `schema.org` ItemList for trending beats. | home metadata + JSON-LD | P2 |
| Animated hero (beams, spotlight, text reveal) | Guest | `HeroTextReveal`, `BackgroundBeams`, `Spotlight`, shimmer CTA. Music hero is static. | `(home)/HomeHeroSection` | P2 |
| Animated social-proof counters | Guest | IntersectionObserver counts up beats/downloads. Music stats are static copy. | `SocialProofStrip` | P2 |
| About + contact canonical and reveals | Guest | Canonical URLs plus Reveal / Waveform motion. Music pages are static. | about + contact pages | P2 |
| Contact loading / success / toast | Guest | `ContactClient` has submit states. Music form is inert. | `ContactClient` | P1 |
| Contact rate limit 3 / 5 min | System | Spam guard on `/api/contact`. Music has no contact API. | contact route limiter | P2 |
