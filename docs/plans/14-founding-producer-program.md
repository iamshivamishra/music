# 14 — Founding Producer Program

**Priority:** P2 (differentiation)
**Timeline:** Week 10–12
**Why:** A curated roster of 10–20 real Indian producers beats a hollow "1K+ beats" claim. BeatStars has scale. You need quality and identity. Founding producers are the supply-side growth engine for quarter one.

---

## Current State

- No producer program, no invitation flow, no producer tiers
- Waitlist model doesn't exist yet (see plan 05)
- Producer profile exists with avatar, bio, genres, social links, follow
- No verified/featured producer distinction beyond the `verified` boolean on User model
- Admin can change user roles but no structured producer management

## Goal

Recruit 10–20 real Indian producers. Give them founding status (badge, featured placement, reduced or zero platform fee for 6 months). Use their names and catalogs as the real social proof.

---

## Implementation Plan

### Phase 1: Founding producer tier

**Files to modify:**

- `src/lib/models/User.ts` — add:
  ```
  producerTier?: "founding" | "standard"
  producerTierExpiresAt?: Date
  platformFeeOverride?: number  // e.g., 0 for founding, null for default
  ```

- `src/types/index.ts` — update `IUser`

### Phase 2: Admin producer management

**Files to create:**

- `src/app/(dashboard)/admin/producers/page.tsx`:
  - List all producers with: name, beats count, sales, earnings, tier, verified status
  - Actions: Set as Founding, Verify, Set fee override, Send invitation

- `src/app/api/admin/producers/[id]/tier/route.ts`:
  - PATCH: set producerTier, platformFeeOverride, expiresAt

### Phase 3: Founding badge UI

**Files to modify:**

- `src/app/producer/[username]/page.tsx`:
  - If `producerTier === "founding"`: show "Founding Producer" badge (gold/distinct from verified)

- `src/components/BeatCard.tsx`:
  - If beat's producer is founding: small "Founding" indicator

- `src/app/page.tsx`:
  - "Featured Producers" section showcasing founding producers
  - Real avatars, real names, real beat counts

### Phase 4: Invitation flow

**Files to create:**

- `src/lib/services/email.service.ts` — add `sendFoundingInvitation()`:
  ```
  Subject: "You're invited to be a Founding Producer on Trishul Beats"
  Body:
  - What Trishul Beats is
  - Founding benefits: 0% platform fee for 6 months, featured placement, founding badge
  - What we need: 5+ published beats within 2 weeks
  - CTA: "Accept Invitation" → /sell?invite={token}
  ```

- `src/lib/models/Invitation.ts`:
  ```
  { email, name, token, status: "sent" | "accepted" | "expired", expiresAt, producerTier: "founding" }
  ```

- `src/app/api/admin/invitations/route.ts` — POST (send invitation), GET (list)
- `src/app/sell/page.tsx` — if `?invite={token}`: show personalized welcome, auto-set founding tier on signup

### Phase 5: Outreach playbook (non-code)

This is a PM/ops task, but the code should support:

1. Identify 50 Indian producers active on Instagram/YouTube (Trap, Hip Hop, Punjabi, Lo-Fi)
2. Send personalized invitations via the admin panel
3. Offer: 0% platform fee for 6 months + featured on homepage
4. Ask: 5+ published beats within 2 weeks of joining
5. Track: acceptance rate, time-to-first-beat, 30-day retention

### Phase 6: Founding producer dashboard perks

**Files to modify:**

- `src/app/studio/StudioDashboard.tsx`:
  - If founding producer: show "Founding Producer" banner with perks reminder
  - Show platform fee: "0% (Founding benefit — expires {date})"
  - Countdown to founding period end

---

## Fee Logic

**Files to modify:**

- `src/lib/services/payout.service.ts` (from plan 01):
  - When calculating payout: check `user.platformFeeOverride`
  - If set, use override; else use default `PLATFORM_FEE_PERCENT`
  - If `producerTierExpiresAt` has passed, ignore override

## Success Metrics

- 20 invitations sent in week 10
- 10 acceptances by week 11
- 50+ published beats from founding producers by week 12
- At least 3 founding producers with 10+ beats each

## Edge Cases

- Invitation token expires → show "Invitation expired, join the waitlist"
- Producer accepts but never uploads → follow-up email at 3 days, 7 days
- Founding period expires → graceful transition to standard tier (email notification)
- Producer disputes fee change → clear communication in invitation terms

## Estimated Effort

- Model changes + admin UI: 2 days
- Invitation flow + emails: 2 days
- Badge + homepage feature: 1 day
- Fee override logic: 1 day
- **Total: ~6 days**
