# Missing features: Trishul Beats vs Music

What ships on `trishulbeats.com` that `music` does not. Split by product area.

Compared from live routes and APIs on 3 Sep 2026.

**On par — do not rebuild:** email/password + Google login, role onboarding, beat browse (genre / key / mood / search), beat detail, likes, follow, related beats, guest+server cart for single beats, Razorpay buy-now and cart pay, three license tiers, entitlement downloads, studio dashboard / upload / sales, public producer profiles, admin users-beats-sales, theme, toasts, sitemap, robots.

Guest cart still does not hydrate title/price in either app. Admin tables cap at 50 rows in both.

| File | Area | Major | Minor |
|---|---|---|---|
| [beat-packs.md](./beat-packs.md) | Beat Packs | 8 | 3 |
| [auth.md](./auth.md) | Auth & Accounts | 2 | 3 |
| [navigation.md](./navigation.md) | Navigation & App Shell | 3 | 6 |
| [browse.md](./browse.md) | Browse / Marketplace | 0 | 9 |
| [beat-detail.md](./beat-detail.md) | Beat Detail | 0 | 11 |
| [license-selector.md](./license-selector.md) | License Selector | 0 | 7 |
| [checkout.md](./checkout.md) | Cart, Checkout & Payments | 4 | 5 |
| [buyer-library.md](./buyer-library.md) | Buyer Library & Licenses | 3 | 5 |
| [studio.md](./studio.md) | Producer Studio & Upload | 3 | 7 |
| [player.md](./player.md) | Player & Sharing | 2 | 6 |
| [producer-profile.md](./producer-profile.md) | Public Producer Profile | 0 | 5 |
| [home-marketing.md](./home-marketing.md) | Home, Marketing & Contact | 5 | 6 |
| [seo.md](./seo.md) | SEO, PWA & Analytics | 4 | 2 |
| [storage.md](./storage.md) | Storage & Media | 2 | 0 |
| [admin.md](./admin.md) | Admin | 0 | 1 |

**Priority:** P0 = blocks live replacement. P1 = producer/buyer depth. P2 = brand, SEO, player, chrome.

**Suggested sequence**

1. Payment webhook + checkout success + cart in nav
2. Password reset and contact email
3. Beat packs as a full vertical
4. Coupons, receipts, buyer library, multipart, file replace
5. Cheap minors: brand copy, skip link, close player, sticky buy bar, share, ellipsis pagination, route skeletons
6. Homepage merchandising and OG / PWA / GTM
