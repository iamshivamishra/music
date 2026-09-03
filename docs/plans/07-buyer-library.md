# 07 — Buyer Library

**Priority:** P1 (conversion)
**Timeline:** Week 5–6
**Why:** Re-download is the retention loop. Current profile shows only the last 10 purchases. Download from history hits a generic endpoint. Buyers will lose files. Competitors keep a permanent library with license PDF attached.

---

## Current State

- `src/app/(dashboard)/profile/page.tsx`: shows `purchases.slice(0, 10)` — hardcoded limit
- Each purchase has a "Download" link pointing to `/api/beats/${beat._id}/download`
- `DownloadPanel` component (on beat PDP) is more sophisticated: signed URLs, per-file-type, entitlement checks
- `purchaseRepository.findByBuyerId()` returns all purchases but profile only renders 10
- No dedicated "My Library" page
- No license PDF download (see plan 03)
- No re-download tracking or download count

## Competitive Bar

| Platform | Buyer library |
|----------|--------------|
| BeatStars | Permanent library. Per-file downloads. License PDF attached. |
| Airbit | Permanent library. License contracts. |
| Traktrain | Download from profile. |
| Instagram + UPI | Google Drive link that may expire. |

## Goal

Dedicated `/profile/library` page showing every purchase ever made, with per-file-type download buttons and license PDF download. Paginated, searchable.

---

## Implementation Plan

### Phase 1: Library page

**Files to create:**

- `src/app/(dashboard)/profile/library/page.tsx` — server component:
  ```
  - Auth check
  - Fetch all purchases with pagination (page, limit=20)
  - For each purchase: fetch beat (title, cover, genre), license info
  - Batch queries to avoid N+1
  - Render LibraryClient
  ```

- `src/app/(dashboard)/profile/library/LibraryClient.tsx` — client component:
  ```
  - Grid/list of purchased beats
  - Each card shows: cover, title, producer, license type, purchase date, amount
  - Expand to show download links (preview, master, stems based on entitlement)
  - "Download License PDF" button (when plan 03 is shipped)
  - Search/filter by title
  - Pagination
  ```

### Phase 2: Download links per purchase

**Files to modify:**

- `src/lib/services/download.service.ts`:
  - `getDownloadAccess()` already handles entitlements correctly
  - Ensure it works when called from library context (by purchaseId, not just beatId)
  - Add `getDownloadAccessByPurchase(purchaseId, userId)` variant that validates ownership via purchase record

- `src/app/api/user/downloads/route.ts` (already exists):
  - This may already serve download history — verify and extend
  - Should support pagination: `?page=1&limit=20`

### Phase 3: Improved purchase card UI

Each library item should show:

```
┌──────────────────────────────────────────────┐
│ [Cover]  Beat Title                          │
│          by Producer Name                    │
│          Premium License · ₹1,499            │
│          Purchased Dec 15, 2025              │
│                                              │
│   [▼ MP3]  [▼ WAV]  [🔒 Stems]  [📄 License]│
└──────────────────────────────────────────────┘
```

- Available files get download buttons
- Locked files show the lock icon with "Upgrade to Premium/Unlimited"
- License PDF button (link to plan 03)

### Phase 4: Navigation integration

**Files to modify:**

- `src/components/layout/DashboardShell.tsx` — add "My Library" nav item for buyers
- `src/app/(dashboard)/profile/page.tsx`:
  - Replace inline purchase history with a link: "View all in My Library →"
  - Keep last 3 purchases as a preview

### Phase 5: License upgrade from library

**Files to create (future, can stub):**

- Upgrade CTA on each library item: "Upgrade to Unlimited for ₹8,500 more"
- Calculate upgrade price = new license price - existing purchase amount
- This is a P2 feature but the UI stub can be placed now

---

## API Design

```
GET /api/user/library?page=1&limit=20&search=trap
Response: {
  purchases: [{
    purchaseId, beatId, beatTitle, beatCoverUrl, beatGenre,
    producerName, licenseType, licenseName, amount, purchaseDate,
    downloads: {
      preview: { available: true, url: "..." },
      master: { available: true, url: "..." },
      stems: { available: false, reason: "Upgrade to Unlimited" },
    },
    licensePdfUrl?: string
  }],
  total, page, limit, totalPages
}
```

## Database Indexes

- `Purchase: { buyerId: 1, createdAt: -1 }` — already exists via existing queries
- Consider denormalizing beat title/cover on Purchase for faster library queries

## Edge Cases

- Beat deleted by producer after purchase → still show in library with "[Deleted Beat]" label, downloads from S3 still work if keys exist
- Beat exclusively sold → buyer (non-exclusive) still has download access for their license tier
- Producer changes beat title → library shows title at time of purchase (if denormalized) or current title
- Large library (100+ purchases) → pagination essential

## Testing

- Unit: library query with pagination, entitlement checks
- Integration: purchase → library shows beat → download works
- Edge: deleted beat still downloadable

## Estimated Effort

- Library page + client component: 2 days
- API endpoint + service changes: 1 day
- Navigation + profile integration: 0.5 day
- Download link generation per item: 1 day
- **Total: ~4–5 days**
