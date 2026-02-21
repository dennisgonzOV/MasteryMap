# MasteryMap Documentation

This folder documents the current implementation of MasteryMap.

Last reviewed: 2026-02-21

## Files in this folder

- `architecture.md` - Runtime architecture, domain boundaries, security model, and external integrations.
- `features.md` - User-facing capabilities by role (public, student, teacher, admin).
- `requirements.md` - Prerequisites, environment variables, and local run/build/test commands.
- `code_map.md` - Codebase navigation guide for where features live.
- `API_REFERENCE.md` - Mounted API routes and key endpoint groups.
- `Integration_Tests.md` - Current automated and manual integration testing approach.
- `rules.md` - Development/documentation rules for contributors.

## Source-of-truth locations

When docs and implementation differ, implementation is source of truth:

- API mounts: `server/routes.ts`
- Domain endpoints: `server/domains/**`
- Data model: `shared/schema.ts`
- Frontend routes: `client/src/App.tsx`
- Client API wrappers: `client/src/lib/api.ts`
- Test setup: `vitest.config.ts`, `playwright.config.ts`, `tests/`

## Documentation maintenance policy

Update docs in the same PR when you change:

1. Route paths, auth rules, or tier gating.
2. Database schema or contracts.
3. Environment variables or startup/build commands.
4. Major user workflows in dashboards/pages.

