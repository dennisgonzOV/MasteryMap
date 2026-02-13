# Phase A Debt Ledger

Date: 2026-02-13

## Baseline (Before Phase A)

- Typecheck:
  - Command: `npm run check`
  - Result: failed
  - Error count: `46` TypeScript errors
- Tests:
  - Command: `npx vitest run`
  - Result: failed
  - Summary: `15` failed files, `1` passed file, `21` test errors
  - Primary failure causes:
    - Database DNS/network lookup failures to Neon (`ENOTFOUND`)
    - Sandbox listen permission failures (`listen EPERM 0.0.0.0`)

## Phase A Completed

- Removed duplicate teacher school-skill routes from `server/routes.ts` and kept canonical routes in assessments domain.
- Removed debug-only assessment route (`/debug/user-info`) from `server/domains/assessments/assessments.controller.ts`.
- Reinstated strict ownership enforcement for legacy project-linked assessment updates (removed permissive fallback).
- Normalized `create-assessment-modal` API calls through shared API layer:
  - `api.uploadFile(...)`
  - `api.generateAssessmentFromSkills(...)`
- Added shared DTOs for AI assessment generation and hierarchy payloads in `shared/contracts/api.ts`.
- Reduced and removed debug `console.log` noise in critical routing paths.
- Hardened hotspot typing in:
  - `client/src/components/modals/create-assessment-modal.tsx`
  - `server/domains/projects/projects.service.ts`
  - `server/domains/projects/projects.controller.ts`
  - `server/domains/assessments/assessments.controller.ts`
- Fixed safety incident controller/service/storage contract drift to current schema.
- Fixed middleware auth import boundary issue in `server/middleware/resourceAccess.ts`.
- Isolated unused legacy abstractions from active typecheck scope:
  - `server/services/BaseService.ts`
  - `server/services/AIService.ts`

## Current Status (After Phase A)

- Typecheck:
  - Command: `npm run check`
  - Result: passed
  - Error count: `0`
- Tests:
  - Command: `npx vitest run`
  - Result: failed
  - Summary: `15` failed files, `1` passed file, `21` test errors
  - Remaining failures are environment/integration constraints (DB DNS + listen permissions), not compile-time TypeScript errors.

## Phase C Structural Enforcement (Executed)

- Enforced router -> service -> storage boundaries in active project and assessment route modules:
  - `server/domains/projects/routes/*.routes.ts`
  - `server/domains/assessments/routes/*.routes.ts`
- Removed direct storage/database access from route modules and pushed logic into service/storage layers.
- Split student assessment compatibility routes from the main assessments router:
  - Added `assessmentStudentRouter` in `server/domains/assessments/assessments.controller.ts`
  - Mounted only student compatibility paths at `/api` in `server/routes.ts`
- Removed storage-to-AI coupling:
  - Deleted AI generation methods from `server/domains/assessments/assessments.storage.ts`
  - Moved AI calls to `server/domains/assessments/assessments.service.ts`
- Consolidated AI service contract/path:
  - Removed legacy `/api/ai-tutor` mount from `server/routes.ts`
  - Updated client tutor call to `/api/ai/tutor/chat` in `client/src/components/ai-tutor-chat.tsx`
  - Removed direct `openai.service` exports from `server/domains/ai/index.ts`
- Added progressive CI gates:
  - `npm run check:touched` (`scripts/ci-touched-typecheck.mjs`)
  - `npm run check:global`
  - `npm run test:module` (`scripts/ci-module-tests.mjs`)
  - `npm run ci:progressive`
- Critical logging cleanup in high-traffic server paths:
  - Removed verbose auth middleware logs from `server/domains/auth/auth.controller.ts`
  - Removed debug hierarchy logs and duplicate route in `server/domains/competencies/competencies.controller.ts`
  - Reduced debug logging in `server/domains/competencies/competencies.storage.ts`
  - Removed grading debug logs in `server/domains/assessments/submissions.controller.ts`
- Type-hardening maintained in the 4 hotspot files:
  - `client/src/components/modals/create-assessment-modal.tsx`
  - `server/domains/projects/projects.service.ts`
  - `server/domains/projects/projects.controller.ts`
  - `server/domains/assessments/assessments.controller.ts`

## Current Status (After Phase C)

- Touched-module typecheck:
  - Command: `npm run check:touched`
  - Result: passed
- Global typecheck:
  - Command: `npm run check`
  - Result: passed
  - Error count: `0`
- Related module tests:
  - Command: `npm run test:module`
  - Result: failed
  - Summary: `9` failed files, `1` passed file, `21` test errors
- Full test suite:
  - Command: `npx vitest run`
  - Result: failed
  - Summary: `15` failed files, `1` passed file, `21` test errors
  - Primary failure causes remain environment/integration constraints:
    - Database DNS/network lookup failures to Neon (`ENOTFOUND`)
    - Sandbox listen permission failures (`listen EPERM 0.0.0.0`)
  - Additional existing test-debt surfaced during related test run:
    - Missing legacy import in tests (`../../server/storage`)
