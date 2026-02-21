# MasteryMap Development Rules

Last reviewed: 2026-02-21

These are project-specific rules for safe changes.

## 1. Architectural Rules

1. Keep domain logic inside `server/domains/<domain>/`.
2. Mount routers only through `server/routes.ts`.
3. Put shared persistence schema in `shared/schema.ts`.
4. Keep shared request/response contracts in `shared/contracts/api.ts`.

## 2. API Rules

1. Protect private routes with `requireAuth`.
2. Use `requireRole` where role restrictions apply.
3. Enforce school/tier constraints consistently when endpoints are school-scoped or enterprise-only.
4. Use route-level validation (`validateIntParam` or Zod) for untrusted input.
5. Prefer consistent error payloads via shared helpers where possible.

## 3. Security Rules

1. Do not bypass security middleware in `server/middleware/security.ts`.
2. Keep JWTs in HTTP-only cookies; do not move auth tokens to local storage.
3. Sanitize user-generated content before AI prompting.
4. Never log secrets, raw tokens, or plaintext passwords.

## 4. Data Rules

1. Update schema and contracts together when changing persisted models.
2. Run `npm run db:push` after schema updates.
3. Preserve foreign-key and ownership assumptions used by access checks.

## 5. Frontend Rules

1. Add new pages to `client/src/pages/` and register routes in `client/src/App.tsx`.
2. Prefer typed API wrappers in `client/src/lib/api.ts` over ad-hoc fetch calls.
3. Use query invalidation when mutations change cached entities.

## 6. Testing Rules

1. Add or update Vitest coverage for backend/domain logic changes.
2. Add/adjust Playwright coverage for critical UI workflow changes.
3. Run at least `npm run check` and relevant tests before merge.
4. For broader confidence, run `npm run ci:progressive`.

## 7. Documentation Rules

1. Update documentation in `documentation/` in the same PR as behavior changes.
2. Treat these files as implementation notes, not roadmap promises.
3. Avoid “100% complete” language unless backed by automated coverage and acceptance criteria.
4. Reference concrete source files whenever possible.

## 8. Operational Rules

1. Keep environment-variable requirements synchronized with code.
2. Preserve backward-compatible endpoints unless a deliberate migration is planned.
3. Call out breaking API changes explicitly in PR descriptions and docs.

