# Producer Studio & Upload

Dashboard, beat list, metadata edit, sales, and basic upload are on par. Trishul adds packs, coupons, large-file upload, asset replace, and studio chrome.

## Major

| Feature | For | Why it matters | Lives in Trishul | Pri |
|---|---|---|---|---|
| Coupon management | Producer | CRUD with draft/active/paused/scheduled states, pack and email restrictions. | `/studio/coupons` | P1 |
| Multipart + stems upload | Producer | Large WAV/ZIP uploads fail or stall without multipart. Music only has single PUT presign. | `/api/upload/multipart`, `/api/upload/stems` | P1 |
| Replace files on beat edit | Producer | Music edit is metadata and licenses only. Cannot swap preview/master/stems/artwork after create. | `EditBeatForm` + `presign-file` | P1 |

## Minor

| Feature | For | Why it matters | Lives in Trishul | Pri |
|---|---|---|---|---|
| Pack column on studio beats | Producer | Table shows linked pack title and jumps to pack edit. | `StudioBeatsClient` pack column | P2 |
| Batch cheapest-license lookup | System | `findCheapestForBeats` for the page. Music N+1 per beat. | `license.repository` | P2 |
| Studio loading skeletons | Producer | studio, beats, and sales each have `loading.tsx`. | `studio/*/loading` | P2 |
| Studio error boundary | Producer | `studio/error.tsx` with retry. Music has no studio-specific error UI. | `studio/error` | P2 |
| Collapsible dashboard nav | Logged-in | Studio / My Library / Account sections with chevron + localStorage. | `DashboardShell` sections | P2 |
| Home + library sidebar links | Logged-in | Escape to marketing home; library links for beats/packs/transactions. | `DashboardShell` | P2 |
| Sidebar profile card | Logged-in | Clickable avatar + role badge linking to `/profile`. | `DashboardShell` profile block | P2 |
