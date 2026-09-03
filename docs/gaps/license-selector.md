# License Selector

Both sell three tiers. Trishul’s picker is a dialog + sticky mobile bar with trust copy and badges. Music is inline cards only.

## Minor

| Feature | For | Why it matters | Lives in Trishul | Pri |
|---|---|---|---|---|
| Buy-now dialog on desktop | Buyer | Desktop Buy Now opens a tier picker dialog instead of only inline cards. | `LicenseSelector` dialog | P2 |
| Starting-at price hero | Buyer | Gradient header with starting price and tier count. | `LicenseSelector` hero | P2 |
| Sticky mobile buy bar | Mobile buyer | Fixed bottom bar lifts above the player (`bottom-[60px]`). | `LicenseSelector` mobile bar | P1 |
| Most Popular / Best Value badges | Buyer | Premium and unlimited tiers are labeled. Music is flatter. | `license-ui` badges | P2 |
| Secure payment / instant download copy | Buyer | Trust signals in the dialog and outer card. | `LicenseSelector` footer | P2 |
| You own this beat treatment | Buyer | Purchased state with icon circle, not just a badge. | `LicenseSelector` owned state | P2 |
| Dynamic Razorpay import | Buyer | `next/dynamic` + loading skeleton so checkout JS is not on first paint. | dynamic `RazorpayButton` | P2 |
