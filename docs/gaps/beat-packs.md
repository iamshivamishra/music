# Beat Packs

Entire product vertical is missing. Trishul sells bundles as a first-class catalog, cart, studio, and license surface. Music only sells single beats.

## Major

| Feature | For | Why it matters | Lives in Trishul | Pri |
|---|---|---|---|---|
| Public pack catalog | Guest, buyer | Second storefront. Music has no `/beat-packs` browse, sort, or preview grid. | `/beat-packs` | P0 |
| Pack detail + track player | Guest, buyer | Carousel, tier picker, track-list previews, and mobile sticky buy bar. | `/beat-packs/[id]` | P0 |
| Pack cart and combined checkout | Buyer | Buyers can mix beats and packs in one Razorpay order. Music cart is beats-only. | `/api/cart/packs`, cart checkout | P0 |
| Direct pack purchase + tier upgrade | Buyer | Buy from pack page; later pay the delta to upgrade basic → premium → unlimited. | `PackRazorpayButton`, `PackUpgradeRazorpayButton` | P0 |
| Pack-only beats | Producer, buyer | Beats can be locked to a pack (no individual buy). Music has no `saleMode`. | `Beat.saleMode = pack_only` | P1 |
| Studio pack create / edit / reorder | Producer | Create packs from new or existing beats, gallery images, drag-and-drop track order. | `/studio/beat-packs` | P0 |
| Pack license PDF + public verify | Buyer, admin | Certificate with license number and HMAC verification page. | `/profile/verify-license` | P1 |
| Buyer My Packs library | Buyer | Owned packs with per-tier download checklist. | `/profile/packs` | P1 |

## Minor

| Feature | For | Why it matters | Lives in Trishul | Pri |
|---|---|---|---|---|
| Pack-only badge on cards | Guest, buyer | Amber Pack Only overlay so buyers know the beat is not sold alone. | `BeatCard` saleMode overlay | P2 |
| Footer Beat Packs link | Guest | Browse column includes `/beat-packs`. Music footer has no packs destination. | Footer browse column | P2 |
| `packId` on play payload | System | Card play can carry pack context so the player knows the parent bundle. | `BeatCard → playBeat({ packId })` | P2 |
