# Public Producer Profile

Both have `/producer/[username]` with follow and a beat grid. Trishul is tighter on SEO, caching, and purchase badges.

## Minor

| Feature | For | Why it matters | Lives in Trishul | Pri |
|---|---|---|---|---|
| ProfilePage JSON-LD | SEO | `schema.org` ProfilePage + Person. Music has none on this route. | `producer/[username]` JSON-LD | P2 |
| Canonical + OG fallback | SEO | Canonical to `/producer/{username}` and `/og-default.png` when no avatar. | producer metadata | P2 |
| Batch purchased-badge lookup | Buyer | `hasPurchasedBatch` for the grid. Music N+1 `hasPurchased` per beat. | `purchase.repository` | P2 |
| Cached producer fetch + ISR 300s | System | `react.cache` + revalidate. Music fetches twice (metadata + page). | producer page cache | P2 |
| Producer loading skeleton | Guest | `producer/[username]/loading.tsx`. | producer loading | P2 |
