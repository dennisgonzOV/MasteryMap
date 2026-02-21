# MasteryMap Requirements and Setup

Last reviewed: 2026-02-21

## 1. Runtime Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL-compatible database (Neon recommended)
- Optional but supported:
  - Azure OpenAI deployment (for AI features)
  - FLUX image endpoint (for thumbnail generation)
  - S3-compatible bucket(s) for uploads

## 2. Environment Variables

## Required for core app startup

- `DATABASE_URL` (or set `DATABASE_POOL_URL` and keep `DATABASE_URL` fallback available)
- `JWT_SECRET` (strongly recommended to set explicitly)
- `JWT_REFRESH_SECRET` (strongly recommended to set explicitly)

## Recommended database tuning (optional)

- `DATABASE_POOL_URL`
- `DB_POOL_MAX`
- `DB_IDLE_TIMEOUT_MS`
- `DB_CONNECTION_TIMEOUT_MS`

## AI features

- `AZURE_GPT41_API_KEY`
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_DEPLOYMENT`
- `AZURE_OPENAI_API_VERSION`

Notes:

- Domain AI services currently provide defaults for endpoint/deployment/version.
- `AZURE_GPT41_API_KEY` is the critical credential for AI request execution.

## Thumbnail/image generation

- `FLUX_API_KEY`
- `FLUX_API_URI`

## File/object storage

- `AWS_REGION`
- `UPLOADS_S3_BUCKET`
- `THUMBNAIL_S3_BUCKET` (optional; falls back to uploads bucket)
- `STUDENT_DELIVERABLES_PREFIX` (optional)
- `ASSESSMENT_PDF_PREFIX` (optional)
- `THUMBNAIL_OBJECT_PREFIX` (optional)

## Server/runtime

- `PORT` (default `5000`)
- `NODE_ENV` (`development` or `production`)

## 3. Install and Run

```bash
npm install
npm run db:push
npm run dev
```

App entry points:

- API + app server: `server/index.ts`
- Frontend dev served through same Express process via Vite middleware
- Default local URL: `http://localhost:5000`

## 4. Build and Production Run

```bash
npm run build
npm run start
```

Build output:

- Server bundle: `dist/index.js`
- Client static assets: `dist/public/`

## 5. Quality and CI Commands

```bash
npm run check                # TypeScript check
npm run check:architecture   # Domain boundary checks
npm run check:hygiene        # CI hygiene checks
npm run check:touched        # Typecheck touched files
npm run check:global         # check + architecture
npm run test:module          # related module tests via vitest
npm run ci:progressive       # full progressive pipeline
```

## 6. Test Commands

```bash
# Unit/integration tests
npx vitest --run

# E2E tests
npx playwright test
```

Notes:

- Playwright config launches `npm run dev` automatically (`playwright.config.ts`).
- Vitest setup is configured via `tests/setup.ts`.

## 7. Operational Constraints

- AI routes are rate-limited (`aiLimiter`).
- Auth and API routes are rate-limited globally (`authLimiter`, `apiLimiter`).
- Some teacher/admin endpoints are tier-gated (`user.tier === "free"` checks).
