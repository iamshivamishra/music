# 15 — Hindi + English Localization

**Priority:** P2 (differentiation)
**Timeline:** Week 11–12
**Why:** India has 600M+ Hindi speakers. Most Indian beat producers and buyers outside metros are more comfortable in Hindi. No competitor offers Hindi. This expands the addressable market beyond metro English speakers.

---

## Current State

- All copy is hardcoded English strings throughout the codebase
- No internationalization framework
- No language toggle
- Next.js App Router supports i18n via middleware and route segments

## Competitive Bar

| Platform | Languages |
|----------|----------|
| BeatStars | English only |
| Airbit | English only |
| Traktrain | English only |
| Instagram | Native multilingual |

## Goal

Buyer-facing pages (homepage, browse, beat PDP, cart, checkout) available in Hindi and English. Producer studio and admin remain English-only in v1.

---

## Implementation Plan

### Phase 1: Choose i18n approach

**Options for Next.js App Router:**

1. **`next-intl`** — most popular i18n library for App Router. Supports server components, RSC, middleware locale detection.
2. **Sub-path routing** (`/hi/beats`, `/en/beats`) — SEO-friendly, clean URLs.
3. **Cookie/header-based** — no URL change, simpler but worse for SEO.

**Recommendation:** `next-intl` with sub-path routing. Install:
```bash
npm install next-intl
```

### Phase 2: Setup

**Files to create/modify:**

- `src/i18n/config.ts`:
  ```
  export const locales = ["en", "hi"] as const;
  export const defaultLocale = "en";
  ```

- `src/i18n/messages/en.json`:
  ```json
  {
    "nav": { "browse": "Browse", "about": "About", "contact": "Contact" },
    "home": { "hero_title": "Find the perfect beat for your track", ... },
    "beats": { "filter_genre": "Genre", "filter_bpm": "BPM Range", ... },
    "license": { "basic": "Basic License", "premium": "Premium License", ... },
    "cart": { "empty": "Your cart is empty", "checkout": "Checkout", ... },
    "common": { "price": "₹{amount}", "plays": "{count} plays", ... }
  }
  ```

- `src/i18n/messages/hi.json`:
  ```json
  {
    "nav": { "browse": "ब्राउज़ करें", "about": "हमारे बारे में", "contact": "संपर्क करें" },
    "home": { "hero_title": "अपने ट्रैक के लिए सही बीट खोजें", ... },
    "beats": { "filter_genre": "शैली", "filter_bpm": "BPM रेंज", ... },
    "license": { "basic": "बेसिक लाइसेंस", "premium": "प्रीमियम लाइसेंस", ... },
    "cart": { "empty": "आपकी कार्ट खाली है", "checkout": "चेकआउट", ... },
    "common": { "price": "₹{amount}", "plays": "{count} प्लेज़", ... }
  }
  ```

- `src/middleware.ts` — add locale detection:
  ```
  - Check URL prefix (/hi or /en)
  - Fall back to Accept-Language header
  - Default to English
  ```

### Phase 3: Extract strings from buyer-facing pages

**Priority pages to localize:**

1. `src/app/page.tsx` — homepage (hero, features, how it works, CTAs)
2. `src/app/beats/page.tsx` — browse page (filters, empty state)
3. `src/app/beats/[id]/page.tsx` — beat PDP (stats labels, license section)
4. `src/components/LicenseSelector.tsx` — license names, features, CTAs
5. `src/app/cart/CartClient.tsx` — cart UI
6. `src/components/Navbar.tsx` — navigation links
7. `src/components/Footer.tsx` — footer links

**Not localized in v1:**
- Studio dashboard
- Admin pages
- Upload form
- License editor
- API error messages

### Phase 4: Language switcher

**Files to modify:**

- `src/components/Navbar.tsx`:
  - Add language toggle: "EN | हि" (small, next to theme toggle)
  - Clicking switches locale in URL

- `src/components/Footer.tsx`:
  - Language selector in footer

### Phase 5: SEO

**Files to modify:**

- `src/app/layout.tsx` — set `lang` attribute based on locale
- All localized pages — `hreflang` alternate tags:
  ```html
  <link rel="alternate" hreflang="en" href="https://trishulbeats.com/en/beats" />
  <link rel="alternate" hreflang="hi" href="https://trishulbeats.com/hi/beats" />
  ```
- `src/app/sitemap.ts` — generate URLs for both locales

---

## Translation Workflow

1. Extract all user-facing strings into `en.json`
2. Translate to Hindi (human review — not machine translation for launch)
3. Use `next-intl`'s `useTranslations()` hook in components
4. For server components: `getTranslations()` from `next-intl/server`

## Fonts

- Ensure the font stack supports Devanagari:
  - Geist (current) does NOT support Hindi
  - Add Noto Sans Devanagari as fallback for Hindi locale
  - `next/font` with `subsets: ["devanagari"]`

## Edge Cases

- Beat titles and descriptions are in the producer's language (don't translate user content)
- Genre names remain in English (music industry standard)
- Price formatting is the same in both locales (₹ symbol)
- URL structure: `/hi/beats/[id]` — beat ID doesn't change

## Testing

- Visual: review all localized pages in Hindi — layout doesn't break with longer text
- RTL: Hindi is LTR so no RTL issues
- SEO: verify hreflang tags, sitemap entries
- Font rendering: Devanagari characters render correctly

## Estimated Effort

- i18n setup (next-intl + middleware): 1 day
- String extraction + English JSON: 1 day
- Hindi translation (outsource or manual): 2 days
- Component integration: 2 days
- Language switcher + SEO: 1 day
- Font setup + testing: 1 day
- **Total: ~8 days**
