# 06 — Discovery Filters (BPM + Price Range)

**Priority:** P1 (conversion)
**Timeline:** Week 5
**Why:** BPM and price range filters are already defined in the API schema (`beatFilterSchema`) but missing from the UI. BeatStars buyers filter BPM first. This is a conversion leak, not a polish item.

---

## Current State

- `beatFilterSchema` already supports: `bpmMin`, `bpmMax`, `priceMin`, `priceMax`
- `BeatsFilters.tsx` renders: search, genre, key, mood, sort — **no BPM or price**
- `marketplaceService.list()` passes filters to `beatService.list()` which supports BPM ranges
- Price filtering requires a join with licenses (cheapest license per beat) — already computed in `marketplaceService`
- Sort options include `price_asc` and `price_desc` but there's no price range filter

## Competitive Bar

| Platform | Discovery filters |
|----------|------------------|
| BeatStars | BPM range, price range, genre, mood, key, tags, charts, trending |
| Airbit | Store search, tags, genre |
| Traktrain | Genre-based browse, curated |

## Goal

Add BPM range slider and price range slider to `/beats` filter sidebar. Zero backend changes needed.

---

## Implementation Plan

### Phase 1: BPM range slider

**Files to modify:**

- `src/app/beats/BeatsFilters.tsx`:
  - Add dual-thumb slider for BPM (range: 40–300, step: 5)
  - Use existing `Slider` component from `src/components/ui/slider.tsx`
  - On change: update URL params `bpmMin` and `bpmMax`
  - Show current range as text: "80 – 160 BPM"
  - Default: full range (no params = no filter)

### Phase 2: Price range slider

**Files to modify:**

- `src/app/beats/BeatsFilters.tsx`:
  - Add dual-thumb slider for price (range: ₹0–₹50,000, step: 100)
  - On change: update URL params `priceMin` and `priceMax`
  - Show current range: "₹500 – ₹5,000"

**Files to modify (backend):**

- `src/lib/services/marketplace.service.ts`:
  - Price filtering currently happens client-side or not at all
  - Need to filter beats by cheapest license price range **after** the license join
  - Add post-filter: if `priceMin` or `priceMax` is set, filter `beats` array where `startingPrice` is in range
  - Adjust pagination counts accordingly (or move price filter to the aggregation pipeline)

- `src/lib/repositories/beat.repository.ts`:
  - Alternative: add an aggregation pipeline that joins with License collection and filters by price range
  - This is more performant for large catalogs than filtering after the join

### Phase 3: Quick filter pills

**Files to modify:**

- `src/app/beats/BeatsFilters.tsx` or `src/app/beats/page.tsx`:
  - Add quick-filter pills above the grid: "Under ₹500", "Under ₹1,000", "60–90 BPM", "120–150 BPM"
  - Clicking sets the corresponding filter params

### Phase 4: Filter persistence

- Filters already persist via URL search params (good)
- Ensure "Clear" button resets BPM and price filters too
- Back/forward navigation preserves filters (already works via URL)

---

## UI Design

```
Filter sidebar:
┌─────────────────────────┐
│ Filters            Clear│
├─────────────────────────┤
│ Search: [__________]    │
│                         │
│ Genre: [All genres  ▼]  │
│                         │
│ Key: [All keys     ▼]   │
│                         │
│ Mood: [All moods   ▼]   │
│                         │
│ BPM Range               │
│ ●━━━━━━━━━━━━━━━●       │
│ 80 – 160 BPM           │
│                         │
│ Price Range             │
│ ●━━━━━━━━━━━━━━━●       │
│ ₹499 – ₹9,999          │
│                         │
│ Sort: [Newest      ▼]   │
└─────────────────────────┘
```

## Database Considerations

- BPM filtering uses existing index `{ bpm: 1 }` (add if not present)
- Price filtering requires either:
  - Denormalized `startingPrice` on Beat document (cache the cheapest license price), or
  - Aggregation pipeline with `$lookup` on License collection
- **Recommendation:** Add `startingPrice` cache field to Beat, update on license create/update/delete

## Edge Cases

- Beat with no active licenses → `startingPrice = null` → excluded from price filters
- BPM not set on beat → excluded from BPM filter results (show warning?)
- Slider on mobile: ensure touch targets are large enough (44x44px)
- Debounce slider changes to avoid excessive URL updates

## Testing

- Verify BPM filter returns correct beats
- Verify price filter with edge values (min=0, max=50000)
- Verify clear button resets all filters
- Mobile responsiveness of sliders

## Estimated Effort

- BPM slider + URL integration: 0.5 day
- Price slider + backend post-filter: 1 day
- Denormalized `startingPrice` field (optional optimization): 1 day
- Quick filter pills: 0.5 day
- **Total: ~2–3 days**
