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
- storage (`AWS_S3_REGION`, `AWS_S3_BUCKET`, `AWS_S3_PUBLIC_URL`, AWS credentials)
- analytics/logging (`NEXT_PUBLIC_GA_ID`, `LOG_LEVEL`)

## S3 Storage

All beat and profile files go to a single AWS S3 bucket.

Required bucket setup:
- **CORS** — allow `PUT` from the app origin with the `Content-Type` header (browser uploads use presigned PUT URLs).
- **Public reads** — previews, artwork, and profile images are served from `AWS_S3_PUBLIC_URL` (CloudFront or a public prefix). Keep master WAV and stems private; downloads use time-limited signed GET URLs.
- **IAM** — the app user needs `s3:PutObject`, `s3:GetObject`, and `s3:DeleteObject` on the bucket.

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
