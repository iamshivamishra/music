# Trishul Beats

Trishul Beats is a Next.js App Router marketplace for discovering, licensing, and downloading music beats.

## Tech Stack

- Next.js (App Router)
- TypeScript
- NextAuth (Google + credentials)
- MongoDB + Mongoose
- Razorpay
- Tailwind CSS + shadcn/ui

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Create local environment file:

```bash
cp .env.example .env
```

3. Fill required variables in `.env`.

4. Start development server:

```bash
npm run dev
```

App runs at [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` - start dev server
- `npm run build` - production build
- `npm run start` - run production server
- `npm run lint` - run ESLint
- `npm run typecheck` - run TypeScript checks (`--noEmit`)
- `npm run test` - run tests once
- `npm run test:coverage` - run tests with coverage
- `npm run check` - lint + typecheck + test + build

## Environment Variables

See `.env.example` for all expected variables.

Core groups:
- app/auth (`NEXT_PUBLIC_APP_URL`, `AUTH_SECRET`, Google OAuth keys)
- database (`MONGODB_URI`)
- payments (Razorpay public + server keys)
- storage (`STORAGE_PROVIDER`, R2 or Cloudinary variables)
- analytics/logging (`NEXT_PUBLIC_GA_ID`, `LOG_LEVEL`)

## Architecture Overview

- `src/app` - routes and API route handlers
- `src/components` - shared UI and feature components
- `src/lib/services` - business logic
- `src/lib/repositories` - persistence and query logic
- `src/lib/models` - Mongoose models
- `src/lib/validators` - request/input validation (Zod)
- `src/lib/serializers` - safe DTO shaping for UI/API

## CI

The repository includes a GitHub Actions workflow that runs lint, typecheck, tests, and production build on pushes and pull requests.
