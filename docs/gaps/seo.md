# SEO, PWA & Analytics

Both have sitemap, robots, and optional GA. Trishul is closer to a live storefront: OG images, PWA, GTM, filtered noindex.

## Major

| Feature | For | Why it matters | Lives in Trishul | Pri |
|---|---|---|---|---|
| Dynamic Open Graph images | Crawlers, social | Global + per-beat OG. Music has none. | `opengraph-image.tsx` | P2 |
| PWA manifest and icons | Guest | Installable web app chrome. | `manifest.ts`, `icon.tsx` | P2 |
| Filtered catalog noindex | SEO | Paginated/filtered `/beats` views noindex with canonical to `/beats`. | `beats/page` metadata | P2 |
| GTM + Search Console | Marketing | Live GTM container and GSC verification. Music only has optional gtag. | `layout.tsx` GTM-5P7LC6C9 | P2 |

## Minor

| Feature | For | Why it matters | Lives in Trishul | Pri |
|---|---|---|---|---|
| Viewport themeColor | Mobile chrome | `#0d0d0d` in viewport export so the browser chrome matches the brand. | layout viewport | P2 |
| CSP for GTM / GA / Meta | System | `next.config` CSP allowlists analytics and Facebook pixel domains. | `next.config.ts` | P2 |
