# Buyer Library & Licenses

Music shows last-10 purchases on `/profile`. Trishul splits library into beats, packs, transactions, and license verify, with richer stats.

## Major

| Feature | For | Why it matters | Lives in Trishul | Pri |
|---|---|---|---|---|
| My Beats library | Buyer | Dedicated purchased-beat list with download panels. Music API exists, no page. | `/profile/beats` | P1 |
| Transaction history | Buyer | Full order list with Razorpay ID and receipt download. | `/profile/transactions` | P1 |
| License verification | Buyer | Look up a pack certificate by license number. | `/profile/verify-license` | P2 |

## Minor

| Feature | For | Why it matters | Lives in Trishul | Pri |
|---|---|---|---|---|
| Analytics-rich profile home | Buyer | Spend, beats/packs owned, license mix bars, dominant tier, recent tx, member-since, quick links. | `/profile` stats | P1 |
| Paginated purchase query | System | `findByBuyerIdPaginated`. Music loads every purchase into the profile page. | `purchase.repository` | P2 |
| Pack-aware purchase stats | Buyer | Splits individual vs pack via `sourceType` / `sourcePackId`. | `Purchase.sourceType` | P2 |
| Profile loading skeleton | Buyer | `(dashboard)/profile/loading.tsx`. | `profile/loading` | P2 |
| Edit-profile form kit | Logged-in | `FormField` / `FormSection` / `InputGroup`. Music uses raw Card + Label. | `form-field`, `form-section` | P2 |
