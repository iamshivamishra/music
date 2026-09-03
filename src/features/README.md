# Feature Modules

Feature-scoped UI shared by routes. Pages stay orchestration-only and import from here.

Current boundaries:
- `beats/` — browse, cards, filters, beat detail player, license selector, embed chrome
- `payments/` — checkout helpers and Razorpay buttons
- `studio/` — producer dashboard clients (beats, packs, store, coupons, sales, …)
- `profile/` — buyer profile, library, transactions, license verify
- `cart/` — cart UI
- `services/` — custom service listings and jobs UI
