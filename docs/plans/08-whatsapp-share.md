# 08 — WhatsApp Share + Inquire

**Priority:** P1 (conversion)
**Timeline:** Week 6
**Why:** Instagram + UPI is the real incumbent in India. WhatsApp is where deals close. Meeting the buyer on their channel (share a beat link on WhatsApp, contact the producer via WhatsApp) is the lowest-friction growth loop.

---

## Current State

- `BottomPlayer.tsx` has a share button that uses `navigator.share()` or clipboard
- No WhatsApp-specific sharing
- No producer WhatsApp/contact integration
- `ShareDialog` component exists in git status but is new/unmerged
- Producer profile has `socialLinks` (instagram, youtube, twitter, website, spotify, soundcloud) — **no WhatsApp**
- Beat PDP has no share button (only the bottom player does)

## Competitive Bar

| Platform | Sharing |
|----------|--------|
| BeatStars | Share links, embeddable player |
| Airbit | Share links, embeddable store |
| Instagram + UPI | Native IG/WhatsApp sharing — the winner |

## Goal

One-tap WhatsApp share from beat PDP and beat cards. Optional producer WhatsApp "Inquire" button on their profile and beat PDP.

---

## Implementation Plan

### Phase 1: WhatsApp share on Beat PDP

**Files to modify:**

- `src/app/beats/[id]/page.tsx`:
  - Add share button row below title/meta area
  - Buttons: WhatsApp, Copy Link, Native Share (on mobile)

- `src/components/ShareDialog.tsx` (new file in git):
  - Review and integrate
  - WhatsApp share URL format:
    ```
    https://wa.me/?text={encodedText}
    ```
  - Share text template:
    ```
    Check out "{beatTitle}" by {producerName} on Trishul Beats! 🎵
    {beatUrl}
    ```

### Phase 2: Share from BeatCard

**Files to modify:**

- `src/components/BeatCard.tsx`:
  - Add a share icon in the card actions (the `MoreVertical` icon area)
  - Dropdown or bottom sheet: "Share on WhatsApp", "Copy Link"
  - Keep it lightweight — no full dialog on cards

### Phase 3: Producer WhatsApp contact

**Files to modify:**

- `src/lib/models/User.ts` — add `whatsappNumber?: string` to socialLinks
- `src/types/index.ts` — update `socialLinks` interface
- `src/app/(dashboard)/profile/edit/page.tsx` — add WhatsApp number input in social links section
- `src/lib/validators/auth.ts` — validate WhatsApp number (Indian mobile: 10 digits)

**Producer profile:**

- `src/app/producer/[username]/page.tsx`:
  - If producer has WhatsApp number, show "Message on WhatsApp" button
  - WhatsApp URL: `https://wa.me/91{number}?text={encodedText}`
  - Pre-filled text: "Hi! I'm interested in your beats on Trishul Beats."

**Beat PDP:**

- `src/app/beats/[id]/page.tsx`:
  - In the producer card section, add "Inquire on WhatsApp" if producer has whatsappNumber
  - Pre-filled text: "Hi! I'm interested in your beat \"{beatTitle}\" on Trishul Beats."

### Phase 4: Share tracking (lightweight)

**Files to create:**

- `src/app/api/beats/[id]/share/route.ts` — POST endpoint to increment a share counter
  - Fire-and-forget from the client (like plays tracking)
  - Add `sharesCount` to Beat model (optional, for analytics)

**Files to modify:**

- `src/lib/models/Beat.ts` — add `sharesCount?: number` (optional)

---

## WhatsApp URL Formats

```
# Share a beat link
https://wa.me/?text=Check%20out%20%22{title}%22%20on%20Trishul%20Beats!%20🎵%20{url}

# Contact producer
https://wa.me/91{number}?text=Hi!%20I'm%20interested%20in%20your%20beat%20%22{title}%22%20on%20Trishul%20Beats.

# Share to specific contact (not possible — WhatsApp doesn't support this)
```

## UI Design

**Beat PDP share row:**
```
[▶ Play]  ❤️ 12 likes  |  📤 Share  💬 WhatsApp  🔗 Copy Link
```

**Producer card on PDP:**
```
┌─────────────────────────────────┐
│ [Avatar]  Producer Name         │
│           @username · Verified  │
│           [Profile] [💬 WhatsApp]│
└─────────────────────────────────┘
```

## Privacy Considerations

- Producer WhatsApp number is **opt-in** — only shown if they add it
- Number is displayed as a link, not as plain text (prevents scraping)
- Consider showing only "Message on WhatsApp" without exposing the number
- WhatsApp `wa.me` links work without exposing the number in the UI

## Edge Cases

- Producer hasn't added WhatsApp → don't show the button
- International numbers → support country code prefix, default to +91
- WhatsApp not installed on desktop → opens WhatsApp Web
- Share text too long → keep under 200 characters

## Testing

- Verify WhatsApp links open correctly on mobile and desktop
- Verify share text encoding (special characters in beat titles)
- Verify producer contact is opt-in only

## Estimated Effort

- Share buttons (PDP + card): 1 day
- WhatsApp contact integration (model + UI): 1 day
- Share tracking: 0.5 day
- **Total: ~2–3 days**
