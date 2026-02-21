# MasteryMap Code Map

Last reviewed: 2026-02-21

This is a practical navigation map for making code changes safely.

## 1. Top-Level Structure

```text
client/        React frontend
server/        Express backend
shared/        Shared schema and API DTO contracts
tests/         Vitest + Playwright suites
scripts/       CI and utility scripts
documentation/ Project docs
```

## 2. Frontend Map (`client/src`)

- `App.tsx` - Route registration and role-based route gates.
- `pages/` - Screen-level pages by role:
  - `pages/student/*`
  - `pages/teacher/*`
  - `pages/admin/*`
  - plus public pages (`landing`, `project-explorer`, `public-portfolio`)
- `components/` - Reusable and feature components.
- `components/modals/` - Complex create/edit workflows.
- `hooks/` - Shared hooks (`useAuth`, data hooks, upload hooks).
- `lib/` - API wrappers and query client:
  - `lib/queryClient.ts` (fetch + auth refresh behavior)
  - `lib/api.ts` (typed endpoint wrappers)

## 3. Backend Map (`server`)

## Entry and Routing

- `server/index.ts` - app bootstrap, middleware, server startup.
- `server/routes.ts` - central mount points for every domain router.

## Domain Modules

`server/domains/*` is the core backend architecture.

Main domains:

- `auth` - auth router, middleware factory, token lifecycle
- `projects` - projects, milestones, teams, teacher dashboard data
- `assessments` - assessments, submissions, grading, self-evaluations
- `competencies` - hierarchy and B.E.S.T. standards data
- `portfolio` - artifacts, settings, public sharing/QR flows
- `credentials` - credential retrieval/awarding
- `notifications` - notification retrieval and mark-read endpoints
- `ai` - tutor + generation endpoints
- `safety-incidents` - incident management
- `admin` - school-scoped admin operations
- `contact` - public contact intake endpoint

## Shared Backend Support

- `middleware/` - security, validation, resource access checks, global errors
- `integrations/s3_storage/` - object storage upload and retrieval routes
- `utils/` - route helpers and error helpers
- `db.ts` - database pool + retry behavior

## 4. Shared Types and Contracts (`shared`)

- `shared/schema.ts`
  - Drizzle table definitions
  - relations
  - Zod insert schemas
  - role/tier enums
- `shared/contracts/api.ts`
  - shared DTO/type contracts consumed by client and server

## 5. Testing Map (`tests`)

- `tests/api/` - API-focused tests
- `tests/shared/` - pure module/service tests
- `tests/e2e/` - Playwright browser tests
- `tests/helpers/` and `tests/fixtures/` - test utilities and data
- `tests/setup.ts` - Vitest setup

## 6. Script Map (`scripts`)

- `check-domain-boundaries.mjs` - architecture guardrails
- `ci-hygiene.mjs` - repository hygiene checks
- `ci-touched-typecheck.mjs` - scoped typechecking
- `ci-module-tests.mjs` - run vitest related tests for touched files
- data utilities like `sync_student_grades.ts`, debug/fix helpers

## 7. Typical Change Paths

## Add a new API endpoint in existing domain

1. Add route in domain controller/router file.
2. Add or extend service method in same domain.
3. Add storage query in same domain storage files.
4. Update `shared/contracts/api.ts` if request/response shape is shared with frontend.
5. Add tests under `tests/api` or `tests/shared`.

## Add a new user-facing feature page

1. Create page under `client/src/pages/<role>/`.
2. Register route in `client/src/App.tsx`.
3. Add API wrappers in `client/src/lib/api.ts` if needed.
4. Add reusable components/hooks as needed.
5. Add e2e coverage in `tests/e2e` when workflow-critical.

## Add a new persisted entity

1. Update `shared/schema.ts`.
2. Run `npm run db:push`.
3. Add storage/service/controller logic in target domain.
4. Update contracts and frontend usage.

## 8. High-Risk Areas

- Auth and role/tier checks (`server/domains/auth`, route middleware usage)
- Cross-domain access rules for project/assessment ownership
- AI flows that trigger safety behavior and notifications
- Object storage path and access handling (`/api/uploads/file`, `/objects/*`)

