# 11 — India Chart / Weekly Drops

**Priority:** P2 (differentiation)
**Timeline:** Week 9–10
**Why:** BeatStars' actual product is traffic from 2M+ users. You don't have that. You need to manufacture discovery without it. A curated India chart and a "New This Week" rail create the sense of a living marketplace and give producers a reason to upload consistently.

---

## Current State

- Homepage has "Trending Beats" (sorted by plays) and "Recently Added" (sorted by createdAt)
- `/beats` has sort options: newest, popular, most_sold, price_asc, price_desc
- `beatRepository.findTrending()` exists — sorts by plays descending
- No editorial curation, no time-windowed charts, no weekly digest, no featured beats
- No email digest or push notification for new drops

## Competitive Bar

| Platform | Discovery |
|----------|----------|
| BeatStars | Charts, trending, featured, genre-specific lists |
| Traktrain | Curated browse, editorial picks |
| Airbit | Primarily storefront-driven |

## Goal

Weekly "India Top 10" chart (auto-generated from sales + plays in the last 7 days). Weekly "New Drops" section. Optional admin-curated "Editor's Picks".

---

## Implementation Plan

### Phase 1: Trending algorithm (time-windowed)

**Files to modify:**

- `src/lib/repositories/beat.repository.ts` — add `findChartBeats(period, limit)`:
  ```
  - Aggregation pipeline:
    1. $match: isPublished, status = "published", createdAt or updatedAt within period
    2. Score = (salesCount in period * 10) + (plays in period * 1) + (likesCount in period * 3)
    3. $sort by score descending
    4. $limit
  ```
  - Challenge: plays/sales are cumulative counters, not time-windowed
  - **Solution A:** Add a `WeeklyStats` collection that snapshots per-beat metrics weekly
  - **Solution B:** Use order/purchase createdAt timestamps to count sales in window
  - **Recommendation:** Solution B for v1 (simpler), use `purchaseRepository` for recent sales count

- `src/lib/services/chart.service.ts` — new:
  ```
  getWeeklyChart(limit = 10): ranked list of beats with chart position
  getNewDrops(limit = 20): beats published in the last 7 days
  getEditorPicks(): admin-curated list (from a simple config or DB collection)
  ```

### Phase 2: Chart page

**Files to create:**

- `src/app/charts/page.tsx` — "India Top 10 This Week"
  - Server component, ISR with 1-hour revalidation
  - Numbered list with cover, title, producer, genre, plays, sales rank
  - "New This Week" section below
  - Editor's Picks section (if curated beats exist)

### Phase 3: Homepage integration

**Files to modify:**

- `src/app/page.tsx`:
  - Replace hardcoded "Trending" with time-windowed chart (top 4)
  - Add "New This Week" rail
  - Link to `/charts` for full view

### Phase 4: Admin curation

**Files to create:**

- `src/lib/models/FeaturedBeat.ts`:
  ```
  { beatId, position, section: "editor_picks" | "featured", startDate, endDate, addedBy }
  ```
- `src/app/(dashboard)/admin/featured/page.tsx` — admin page to add/remove featured beats
- `src/app/api/admin/featured/route.ts` — CRUD for featured beats

### Phase 5: Weekly digest email (optional)

- `src/lib/services/email.service.ts` — add `sendWeeklyDigest()`:
  - To: all buyers who opted in
  - Subject: "This Week on Trishul Beats — Top 10 + New Drops"
  - Body: chart + new drops + CTA to browse
- Cron job or Vercel cron to trigger weekly

---

## Database Indexes

```
Purchase: { createdAt: -1, beatId: 1 } — for time-windowed sales queries
FeaturedBeat: { section: 1, startDate: 1, endDate: 1 }
```

## Edge Cases

- Less than 10 published beats → show what exists, no empty chart
- No sales in a week → fall back to plays-only ranking
- Tie in score → secondary sort by newest

## Estimated Effort

- Chart algorithm + service: 2 days
- Chart page: 1 day
- Homepage integration: 1 day
- Admin curation: 1 day
- Weekly digest (optional): 1 day
- **Total: ~5–6 days**
