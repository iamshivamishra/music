# Navigation & App Shell

Music navbar is thinner: no search, no cart, no packs entry. Brand still says Test Mode. Shell a11y and session hydration also lag.

## Major

| Feature | For | Why it matters | Lives in Trishul | Pri |
|---|---|---|---|---|
| Global search (⌘K) | Guest, all | Command palette jumps to `/beats?search=`. Music only has the sidebar search field. | `SearchCommand` | P1 |
| Cart icon and badge | Guest, buyer | Music cart exists but is not discoverable from the header. | Navbar + `CartProvider` count | P0 |
| Beat Packs nav link | Guest | Primary catalog entry in Trishul. Music has no packs destination. | Navbar → `/beat-packs` | P0 |

## Minor

| Feature | For | Why it matters | Lives in Trishul | Pri |
|---|---|---|---|---|
| Role-aware dashboard link | Logged-in | Navbar sends producers/admins to `/studio` and buyers to `/profile`. Music always uses `/dashboard`. | Navbar `dashboardHref` | P2 |
| Skip-to-content link | Keyboard / a11y | AppShell has an accessible skip-to-main-content anchor. Music does not. | AppShell skip link | P2 |
| Player-aware main padding | All | Extra bottom padding when BottomPlayer is open so content is not covered. | AppShell `pb-36` when playing | P2 |
| Server session hydration | Logged-in | Root layout passes session into Providers. Music fetches session on the client (flash). | `layout → <Providers session>` | P2 |
| Navbar brand copy | Guest | Trishul Beats vs Music Test Mode placeholder. | Navbar brand | P2 |
| Producer-specific footer blurb | Guest | Footer names the independent producer. Music uses generic marketplace copy. | Footer | P2 |
