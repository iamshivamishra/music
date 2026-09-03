# Auth & Accounts

Login, signup, Google, onboarding, and RBAC are on par. Music has no recovery path, and post-login routing is thinner.

## Major

| Feature | For | Why it matters | Lives in Trishul | Pri |
|---|---|---|---|---|
| Forgot password | Guest | No recovery flow. Credentials users are locked out. | `/forgot-password` | P0 |
| Reset password + email | Guest | Time-limited token email via Resend. Music has no email provider at all. | `/reset-password`, Resend | P0 |

## Minor

| Feature | For | Why it matters | Lives in Trishul | Pri |
|---|---|---|---|---|
| Forgot-password link on login | Guest | Login form links to recovery. Music login has no recovery affordance. | `LoginForm → /forgot-password` | P2 |
| Login `callbackUrl` | Guest | Trishul honors `?callbackUrl=` after sign-in. Music always sends `/dashboard`. | `LoginForm` callbackUrl | P2 |
| `User.resetToken` fields | System | Indexed token prefix + expiry on the user model. Music has no reset fields. | `User.resetToken*` | P2 |
