# Refactor Exit Criteria (Good State)

This checklist defines the minimum bar for considering the anti-slop refactor complete and stable.

## 1) Composition Root Coverage
- `assessments`, `projects`, `auth`, and `admin` each expose a `create<Domain>Domain(...)` composition entrypoint.
- Route construction is dependency-injected from composition roots, not hardwired inside route files.
- Cross-domain consumers import domain APIs from facade exports (`server/domains/<domain>/index.ts`).

## 2) Boundary Guardrails Enforced
- `npm run check:architecture` passes.
- `check:global` includes architecture checks (not optional).
- No direct deep cross-domain imports such as `../other-domain/other-domain.service`.

## 3) HTTP Error Contract Normalized
- API error responses in `projects`, `auth`, and `admin` use `sendErrorResponse(...)`.
- Error payload shape follows `{ message, error, details }` with consistent status handling.
- New routes do not introduce ad-hoc error JSON structures.

## 4) CI Quality Gates Green
- `npm run check:hygiene` passes.
- `npm run check:touched` passes.
- `npm run check:global` passes.
- `npm run test:module` passes for touched scope.

## 5) Slop Regression Controls
- New cross-domain coupling must happen through facade imports or explicit local gateways.
- Route and controller files avoid adding singleton-dependent wiring when composition roots are available.
- Refactor work is accepted only when all checks above pass in the same changeset.
