# 05 — Producer Acquisition (Start Selling)

**Priority:** P0 (launch blocker)
**Timeline:** Week 2–3
**Why:** Two-sided marketplaces die on empty catalogs. "Start Selling" on the homepage is commented out. Producer acquisition should be louder than buyer acquisition until there are 50 live beats from 10 real producers.

---

## Current State

- Homepage "Start Selling" button is commented out (line 219 of `page.tsx`)
- Onboarding page exists at `/onboarding` — lets users pick buyer/producer role
- Signup flow works (Google + credentials)
- No producer waitlist, no founding program, no invitation flow
- No producer-specific landing page explaining the value proposition

## Goal

A working supply-side acquisition funnel: landing page → signup → onboarding → first upload → published beat.

---

## Implementation Plan

### Phase 1: Producer landing page

**Files to create:**

- `src/app/sell/page.tsx` — "Sell Your Beats" landing page
  ```
  Sections:
  1. Hero: "Sell beats to Indian artists. Get paid in rupees."
  2. Value props: INR checkout, real licenses, instant delivery, analytics
  3. How it works: Sign up → Upload → Set prices → Get paid
  4. Comparison: "Why Trishul vs Instagram DMs" table
  5. Pricing: "Free to list. X% platform fee on sales." (transparent)
  6. CTA: "Start Selling" → /signup?role=producer
  ```

### Phase 2: Restore homepage CTA

**Files to modify:**

- `src/app/page.tsx`:
  - Uncomment Start Selling button, link to `/sell`
  - Add a producer-focused section below "How It Works":
    ```
    "Are you a producer? Start selling your beats to artists across India."
    CTA: "Learn More" → /sell
    ```

### Phase 3: Role-hinted signup

**Files to modify:**

- `src/app/(auth)/signup/page.tsx` — accept `?role=producer` query param
- `src/components/SignupForm.tsx` — if role hint is present, pre-select producer on onboarding
- `src/app/onboarding/page.tsx` — if `?role=producer` in URL, pre-select and skip role picker

### Phase 4: Producer waitlist (if not ready for open signup)

If payouts/exclusive aren't shipped yet, a waitlist is safer than open producer signup.

**Files to create:**

- `src/lib/models/Waitlist.ts`:
  ```
  { email, name, role: "producer", genres?: string[], socialLinks?: string, status: "pending" | "invited" | "joined", invitedAt?, joinedAt? }
  ```
- `src/app/api/waitlist/route.ts` — POST to join
- `src/app/sell/page.tsx` — swap CTA to "Join the Waitlist" with email/name form
- Admin: `src/app/(dashboard)/admin/waitlist/page.tsx` — view and invite producers

### Phase 5: First upload nudge

**Files to modify:**

- `src/app/studio/StudioDashboard.tsx`:
  - If producer has 0 beats: show prominent "Upload Your First Beat" CTA instead of empty charts
  - Guide: "Add a tagged preview, master WAV, set your prices, and publish"

- `src/app/(dashboard)/upload/page.tsx`:
  - For first-time producers, show a simplified wizard view or tips alongside the form

### Phase 6: Producer onboarding email

**Files to modify:**

- `src/lib/services/email.service.ts` — add `sendProducerWelcome({ to, name })`:
  - Welcome to Trishul Beats
  - Quick start guide: upload your first beat
  - Link to studio dashboard
  - Link to profile setup

- `src/lib/services/auth.service.ts` — trigger welcome email after producer role is set

---

## Success Metrics

- 20 producers signed up within 4 weeks of launch
- 50 beats published within 4 weeks
- >60% of signed-up producers upload at least one beat
- First upload within 48 hours of signup (measure time-to-first-beat)

## Edge Cases

- User signs up as buyer, later wants to become producer → role upgrade flow (exists in admin, not self-serve)
- Waitlisted producer gets impatient → send regular "you're #X in line" emails
- Producer signs up but never uploads → nudge email at 3 days and 7 days

## Testing

- End-to-end: visit /sell → sign up → onboard as producer → upload first beat → publish
- Email delivery in staging/sandbox

## Estimated Effort

- Landing page + homepage restoration: 2 days
- Signup role hint + onboarding: 1 day
- Waitlist (optional): 2 days
- First-upload nudge + welcome email: 1 day
- **Total: ~4–6 days**
