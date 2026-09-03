# Player & Sharing

Detail waveform, card preview, and bottom player exist in both. Trishul’s player is a real playlist + share surface; Music has disabled and fake controls.

## Major

| Feature | For | Why it matters | Lives in Trishul | Pri |
|---|---|---|---|---|
| Playlist next / previous | Guest, all | Music bottom player has prev/next disabled. | `BottomPlayer` + `AudioPlayerContext` | P2 |
| Share dialog | Guest, all | X, Facebook, WhatsApp, Telegram, Instagram copy, native share. | `ShareDialog` | P2 |

## Minor

| Feature | For | Why it matters | Lives in Trishul | Pri |
|---|---|---|---|---|
| Close player button | Guest | Dismiss control on mobile and desktop. Music player cannot be closed. | `closePlayer()` | P2 |
| Auto-advance on track end | Guest | `onEnded` calls `playNext`. Music stops. | `AudioPlayerContext` onEnded | P2 |
| Split audio contexts | System | `useAudioActions` + `useAudioProgress` to cut re-renders. Music is one context. | `AudioPlayerContext` split | P2 |
| Dedicated mobile player layout | Mobile | Compact row with inline elapsed/total time. | `BottomPlayer` mobile | P2 |
| Seek bar keyboard + a11y | Keyboard | `role=slider`, `aria-valuenow`, ArrowLeft/Right seek. | `BottomPlayer` seek | P2 |
| No fake like on player | Guest | Music toggles local `isLiked` with no API. Trishul omits the misleading heart. | `BottomPlayer` | P2 |
