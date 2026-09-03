# 04 — Trust & Brand Cleanup

**Priority:** P0 (launch blocker)
**Timeline:** Week 1 (can start day 1, ship in 2 days)
**Why:** A trust product cannot ship with invented testimonials, hardcoded vanity metrics, and "Test Mode" in the nav. Fake proof is worse than sparse proof. This is the fastest P0 to close.

---

## Current State

### Problems identified in codebase:

1. **Navbar** (`src/components/Navbar.tsx` line 39): `<span>Test Mode</span>` — brand name placeholder
2. **Homepage stats** (`src/app/page.tsx` lines 229–234): Hardcoded `"1K+"`, `"50+"`, `"15+"`, `"Free"` — not from database
3. **Homepage testimonials** (lines 29–52): Fake names ("Rahul Sharma", "Priya Patel", "Arjun Singh"), fake quotes, emoji avatars
4. **Homepage genre cards** (lines 18–27): Empty emoji strings in genre cards
5. **"Start Selling" CTA** (line 219): Commented out `<Link href="/signup">Start Selling</Link>`
6. **About page** (`src/app/about/page.tsx`): Claims "exclusive" licensing which doesn't exist yet

## What Needs to Change

### 1. Replace "Test Mode" with real brand name

**File:** `src/components/Navbar.tsx`

- Replace `<span>Test Mode</span>` with `<span>Trishul Beats</span>`
- Ensure the logo SVG `/icon.svg` is the real logo (or remove if not ready)

### 2. Replace hardcoded stats with live counts

**File:** `src/app/page.tsx`

- Query actual counts from repositories:
  ```
  const [beatCount, producerCount, genreCount] = await Promise.all([
    beatRepository.countPublished(),
    userRepository.countByRole("producer"),
    beatRepository.countDistinctGenres(),
  ]);
  ```
- Display real numbers or remove the section entirely if counts are embarrassingly low
- Acceptable alternative: remove the stats bar until there are meaningful numbers

**Files to modify:**
- `src/lib/repositories/beat.repository.ts` — add `countPublished()`, `countDistinctGenres()`
- `src/lib/repositories/user.repository.ts` — `countByRole()` already exists

### 3. Remove fake testimonials

**File:** `src/app/page.tsx`

Two options:
- **Option A (recommended):** Remove the testimonials section entirely until real users exist
- **Option B:** Replace with a "What you get" value prop section (no fake social proof)

### 4. Fix genre card emojis or remove them

**File:** `src/app/page.tsx`

- Genre cards have empty emoji strings (`""`). Either add real emoji or remove the emoji span entirely.
- The colored left border is already a visual indicator — emoji is not needed.

### 5. Restore "Start Selling" CTA

**File:** `src/app/page.tsx`

- Uncomment and link to producer signup/onboarding
- If not ready for open signup: link to a waitlist (see plan 05)

### 6. Fix About page copy

**File:** `src/app/about/page.tsx`

- Remove "exclusive" from license tier claims until exclusive licenses are shipped (plan 02)
- Or change to "Clear license tiers with defined terms"

### 7. OG image and metadata

- `src/app/opengraph-image.tsx` exists (new file in git status) — ensure it shows real branding, not placeholder
- `public/og-default.png` — verify it's a real branded image

---

## Implementation Checklist

- [ ] `Navbar.tsx`: "Test Mode" → "Trishul Beats"
- [ ] `page.tsx`: Replace hardcoded stats with live DB counts (or remove section)
- [ ] `page.tsx`: Remove `TESTIMONIALS` array and the "What Users Say" section
- [ ] `page.tsx`: Fix genre card empty emoji strings
- [ ] `page.tsx`: Uncomment "Start Selling" CTA or link to waitlist
- [ ] `about/page.tsx`: Remove "exclusive" from feature claims
- [ ] Verify `og-default.png` and `opengraph-image.tsx` are real branded assets
- [ ] Search for any other hardcoded fake data (`grep -r "1K+" "50+" "Rahul" "Priya"`)

## Security Considerations

- None — this is a copy/content change.

## Testing

- Visual: review homepage, about page, navbar in both light and dark mode
- Check OG tags with a social media debugger

## Estimated Effort

- **1–2 days** — this is mostly copy editing and a couple of DB queries
