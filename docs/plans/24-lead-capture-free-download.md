# 24 — Free Tagged Download + Lead Capture

**Priority:** P4 (differentiation)
**Timeline:** Week 17 (can parallel 22a)
**Why:** Airbit/BeatStars grow producer audiences with a free tagged MP3 in exchange for email. In India, WhatsApp number is more useful than email. This is the growth loop: producer gets leads (plan 21 CRM), platform gets a buyer graph, tagged file is already the public preview asset.

---

## Current State

- Tagged preview `audioTaggedUrl` is publicly streamable. Anyone can record it; we still should not offer a clean download without consent.
- No lead model. Follow is an account-only graph.
- Guest checkout collects email at pay time, not at listen time.
- Download entitlements are purchase-gated (`download.service.ts`).

## Competitive Bar

| Platform | Leads |
|----------|-------|
| BeatStars | Free download + email gate |
| Airbit | Free download widgets |
| Instagram | Follow / broadcast channel |
| Trishul | Stream only |

## Goal

Producer toggles **Free tagged download** per beat. Visitor enters email **or** WhatsApp number (+ consent). They get a short-lived signed URL to the tagged MP3 (not WAV, not stems). Lead appears in studio (CRM-adjacent). Optional: one coupon auto-sent ("10% off your first license").

---

## Implementation Plan

### Phase 1: Beat flag + lead model (1 day)

- `IBeat.freeDownloadEnabled?: boolean` (default false)
- Only if `status === "published"` (not unlisted in v1 — keeps private drops actually private)

```
ILead {
  producerId: ObjectId
  beatId: ObjectId
  email?: string
  whatsappNumber?: string     // normalized 10 digit
  source: "free_download"
  consentAt: Date
  userId?: ObjectId           // if logged in
  createdAt
}
```

Unique: `{ beatId: 1, email: 1 }` sparse; `{ beatId: 1, whatsappNumber: 1 }` sparse — one lead per identity per beat.

Validators: email **or** WhatsApp required; consent checkbox required (`consent === true`).

### Phase 2: Service + download (1.5 days)

- `lead.service.ts`:
  - `captureAndGrant(beatId, input, ip)` — rate limit, create lead, return `{ downloadUrl, expiresIn }`
  - Signed GET on **preview** key only (`storageKeys.preview` / tagged URL). Never master/stems.
  - Expiry 1 hour; regenerate if they submit again (same unique key)
- `download.service.ts` — add `getTaggedPreviewDownload(beatId)` used only after lead capture
- API: `POST /api/beats/[id]/free-download` public, rate limit by IP (e.g. 10/hour) and by identity

Logged-in users: still require consent; attach `userId`; prefill email.

### Phase 3: UI (1.5 days)

- Beat PDP + `LicenseSelector` area: if flag on, card "Free tagged MP3" above paid tiers
- Modal: email, WhatsApp (optional either), consent "I agree to hear from {producer} and Trishul Beats about this catalog"
- After submit: start download + toast
- `EditBeatForm` / `UploadForm`: toggle "Offer free tagged download"
- Studio: `src/app/(dashboard)/studio/leads/page.tsx` — list, filter by beat, copy CSV **for that producer only** (this is the one allowed email export; include unsubscribe note)

Integrate with plan 21: leads without a purchase still show as "Leads" tab on customers page if 21 shipped — or keep a separate Leads page to avoid blocking.

### Phase 4: Optional first-license coupon (0.5 day)

If producer has an active coupon with `firstPurchase` restriction (check coupon model — may need a new flag `autoGrantOnLead`):

- Skip in v1 if coupon restrictions are already complex
- v1.1: create a single-use code `LEAD-XXXX` emailed to them

WhatsApp send of the file link via Cloud API is **out of v1** (plan 16 templates). Email the link via Resend if they gave email; if only WhatsApp, the in-browser download is the delivery.

---

## Trust / quality

- File must be tagged. Copy in UI: "MP3 includes producer tags. WAV/stems require a license."
- Disable free download on exclusive-sold / archived.
- Abuse: same file is already streamable; the gate is for **leads**, not DRM.

## Privacy

- Consent text required. Store `consentAt`.
- Producer CSV export: email/phone they collected — lawful as the producer is the campaign owner; still add a footer "Do not buy third-party lists."
- Do not send marketing from Trishul's domain on the producer's behalf in v1 (that needs unsubscribe).

## Security

- Preview-only signed URLs.
- Rate limit + captcha later if scraped; start with IP limit.
- Do not leak whether an email already exists globally — unique is per beat.

## Edge Cases

- Producer enables free download without a preview file — reject toggle.
- `pack_only` beats — no free download (no individual PDP funnel).
- Guest later buys — CRM merge by email (plan 21).

## Testing

- Cannot grant master via this API (entitlement unit test)
- Unique lead per beat+email
- Flag off → 404

## Estimated Effort

- Model + signed preview: 2.5 days
- PDP modal + studio leads: 1.5 days
- Coupon stretch: 0.5 day
- **Total: ~4–4.5 days**
