# Feature Modules

This directory is reserved for feature-scoped modules that can be shared by
routes, components, and services without leaking implementation details.

Current boundaries:
- `beats/` for listing, filtering, and beat presentation helpers.
- `payments/` for checkout client/server orchestration helpers.
- `studio/` for producer dashboard domain helpers.
