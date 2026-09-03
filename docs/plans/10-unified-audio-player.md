# 10 — Unified Audio Player

**Priority:** P1 (conversion)
**Timeline:** Week 7–8
**Why:** `GlobalAudioPlayer.tsx` is an empty file. `AudioPlayer` (beat PDP) and `BottomPlayer` (global bar) are two separate implementations. `AudioPlayerContext` drives the bottom player from `BeatCard` clicks but the PDP audio player doesn't use it. Preview should continue seamlessly across browse → PDP → cart.

---

## Current State

- `src/components/AudioPlayerContext.tsx` — context with `playBeat()`, `togglePlay()`, `seek()`, `setVolume()`
- `src/components/BottomPlayer.tsx` — global bottom bar, uses `AudioPlayerContext`
- `src/components/AudioPlayer.tsx` — standalone player on beat PDP, uses its own `<audio>` element
- `src/components/GlobalAudioPlayer.tsx` — **empty file**
- `src/components/BeatCard.tsx` — calls `playBeat()` from context → BottomPlayer plays
- `src/app/beats/[id]/page.tsx` — uses standalone `AudioPlayer`, not the context

### Problems:
1. Clicking play on browse page → bottom player starts → navigate to PDP → PDP has a **separate** player
2. Two audio elements can play simultaneously (PDP player + bottom player)
3. No queue, no skip-to-next, no playlist
4. Waveform only on PDP player, not bottom player

## Competitive Bar

| Platform | Player |
|----------|--------|
| BeatStars | Blaze player — persistent, works everywhere, queue, waveform |
| Airbit | Embeddable store player, persistent |
| Traktrain | Site-wide player, persistent |

## Goal

One audio source. One player state. Preview persists across navigation. PDP shows enhanced view (waveform) of the same playback.

---

## Implementation Plan

### Phase 1: Consolidate audio source in context

**Files to modify:**

- `src/components/AudioPlayerContext.tsx`:
  - Ensure the context owns the **only** `<audio>` element in the app
  - Add missing features:
    ```
    queue: BeatInfo[]
    currentIndex: number
    playNext(): void
    playPrev(): void
    addToQueue(beat: BeatInfo): void
    repeat: "none" | "one" | "all"
    shuffle: boolean
    waveformData?: number[]  // for waveform rendering
    ```
  - Expose `audioRef` for waveform visualization
  - Track play count (fire `/api/beats/{id}/plays` once per beat session)

### Phase 2: Remove standalone AudioPlayer from PDP

**Files to modify:**

- `src/app/beats/[id]/page.tsx`:
  - Remove `<AudioPlayer>` component
  - Instead, auto-play the beat via context when PDP mounts (if not already playing this beat)
  - Show an enhanced player card that reads from `AudioPlayerContext`:
    - Waveform visualization (from `Waveform` component)
    - Seek bar, volume, time display
    - "Playing from: {beatTitle}" label
  - This card is a **view** of the context state, not a separate player

- `src/components/AudioPlayer.tsx`:
  - Repurpose as `EnhancedPlayerView` — a display-only component that connects to `AudioPlayerContext`
  - Renders waveform, seek, volume, time — but does NOT own an `<audio>` element
  - Or deprecate entirely if BottomPlayer is sufficient on PDP

### Phase 3: Enhanced BottomPlayer

**Files to modify:**

- `src/components/BottomPlayer.tsx`:
  - Already works well for basic playback
  - Add queue indicator: "1 of 5" with skip buttons
  - Mini waveform (optional — may be too small on the bottom bar)
  - Like button (already has an icon, not connected)
  - "Add to cart" quick action

### Phase 4: Queue from browse page

**Files to modify:**

- `src/app/beats/BeatsGridClient.tsx`:
  - When displaying a grid of beats, populate the queue in context
  - Playing a beat from the grid → sets the queue to all visible beats, current index to the clicked one
  - Skip next/prev cycles through the grid

- `src/components/BeatCard.tsx`:
  - `playBeat()` already fires — extend to include queue context

### Phase 5: Delete GlobalAudioPlayer.tsx

**Files to delete:**

- `src/components/GlobalAudioPlayer.tsx` — empty file, remove to avoid confusion

---

## Architecture

```
AudioPlayerContext (single <audio> element)
    │
    ├── BottomPlayer (always visible when playing)
    │     └── compact: cover, title, play/pause, seek, volume, skip
    │
    ├── BeatCard.playBeat() → context.playBeat()
    │
    ├── BeatsGrid → sets queue in context
    │
    └── BeatPDP → EnhancedPlayerView (waveform, full controls)
          └── reads from context, does NOT own audio
```

## Edge Cases

- Navigate away from PDP while playing → bottom player continues (already works)
- Navigate to PDP of the currently playing beat → enhanced view syncs with current position
- Navigate to PDP of a different beat → option: auto-play or show "Play" button
- Queue exhausted → stop playback
- Browser tab hidden → audio continues (already handled by browser)
- Mobile: only one audio context per page (already handled)

## Testing

- Play from card → bottom player appears → navigate to PDP → same beat, same position
- Skip next/prev cycles through queue
- No two audio elements playing simultaneously
- Waveform on PDP syncs with playback position

## Estimated Effort

- Context consolidation + queue: 2 days
- PDP player replacement: 1 day
- BottomPlayer enhancements: 1 day
- Queue from browse grid: 1 day
- **Total: ~5 days**
