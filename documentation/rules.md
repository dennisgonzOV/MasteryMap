

Guidelines and best practices for Cursor (or any AI/developer) when building the PBL Project Management System.

---

## 0. Incremental Changes and Minimal Rewrites
- Keep code changes minimal and incremental; focus on the smallest viable update.  
- Avoid broad, sweeping rewrites of existing code; refactor only when necessary and justify in PR descriptions.  
- Introduce new features with targeted modifications that adhere to existing patterns.  
- Preserve existing tests and ensure they still pass; any large-scale refactoring must include updated tests and clear documentation.

---

---

## 1. Code Style & Formatting

- **Language Standards**  
  - **TypeScript**: Target ES2020+, enable `strict` mode in `tsconfig.json`.  
  - **React**: Use functional components and hooks; favor TypeScript `FC` types.

- **Linting & Formatting**  
  - Enforce **ESLint** with the recommended TypeScript/React configs.  
  - Use **Prettier** for code formatting; integrate with ESLint.  
  - Auto‐format on save and in CI.

- **File Layout**  
  - Keep one React component per file.  
  - Group related files (components, styles, tests) in feature folders under `src/`.  
  - NestJS modules in `src/modules/<feature>`, each with its own controllers, services, and entities.

---

## 2. Branching & Git Workflow

- **Main Branches**  
  - `main` (protected): always releasable.  
  - `develop`: integration branch for upcoming release.

- **Feature Branches**  
  - Named `feature/<short-description>` (e.g. `feature/auth-jwt`).  
  - Always branch from `develop`; merge back via PR.

- **Hotfix & Release**  
  - `hotfix/<issue>` for critical patches off `main`.  
  - `release/<version>` for stabilizing a release; merge into both `main` and `develop`.

---

## 3. Commit Messages

- **Format**:  
  ```
  <type>(<scope>): <short summary>

  <optional longer description>

  <optional footer>
  ```

- **Types**:  
  - `feat`: new feature  
  - `fix`: bug fix  
  - `chore`: tooling/config changes  
  - `docs`: documentation only  
  - `test`: adding or updating tests  
  - `refactor`: code change that neither fixes a bug nor adds a feature

- **Examples**:  
  ```
  feat(auth): implement JWT refresh token rotation
  fix(api): correct error handling in submission endpoint
  ```

---

## 4. Issue & Pull Request Management

- **Issue Templates**  
  - **Bug Report**: steps to reproduce, expected vs. actual, screenshots.  
  - **Feature Request**: user story, acceptance criteria, UI mockups if any.

- **PR Guidelines**  
  - Link to the related issue: `Closes #123`.  
  - Include a concise description of what changed and why.  
  - Ensure all CI checks pass (lint, tests, build).  
  - At least one approving review before merge.

---

## 5. Testing

- **Test-Driven Development (TDD) First**  
  - When adding new features or fixing bugs, write failing tests first, then implement the minimal code to pass them.  
  - Ensure tests cover both happy paths and edge cases before writing production code.

- **Unit Tests**  
  - Use **Jest** + **Supertest** (backend) and **Jest** + **React Testing Library** (frontend).  
  - **Mock external dependencies** (e.g., OpenAI API, S3, Redis) so tests remain fast and deterministic.  
  - Keep unit tests **isolated**, focusing on one function or component at a time.  
  - Name test files and test cases descriptively (e.g., `AuthService.loginSuccess()` or `ProjectController.createProject()`).

- **Integration Tests**  
  - Cover interactions between modules (e.g., API endpoints hitting the database).  
  - Use an **in-memory or test-specific database** to prevent polluting production or development data.  
  - Seed test data via **fixtures** or **factories** to set up known states.  
  - Test the full request → response cycle, including authentication, authorization, and error handling.

- **End-to-End (E2E) Tests**  
  - Use **Cypress** or **Playwright** for critical user flows only (login, project creation, grading flow, portfolio sharing).  
  - Keep E2E test suites **small and stable** — focus on high-value paths.  
  - Use **data teardown** between tests to maintain a clean slate.

- **Coverage & Quality**  
  - Maintain **≥80% coverage** across unit and integration tests; CI should fail if coverage drops.  
  - **Avoid snapshot overuse** — prefer explicit assertions for clarity and maintainability.  
  - **Review test failures promptly** and fix either the code or the test; never disable tests permanently.

- **Performance & Stability**  
  - All tests should complete **under 2 minutes** in CI.  
  - **Parallelize tests** where possible, but ensure no race conditions or shared-state flakiness.  
  - Use **retry logic** sparingly for known external service flakiness; prefer mocking instead.

- **Test Code Maintenance**  
  - Include tests in the **same PR** as the code change they validate.  
  - Refactor test code when refactoring production code; keep test helpers and fixtures DRY.  
  - Document any complex test setups in code comments or a `tests/README.md`.

---

## 6. Documentation

- **In-code**: JSDoc/TSDoc for all public functions, classes, and modules.  
- **API**: OpenAPI/Swagger spec generated from NestJS decorators.  
- **Architecture**: Keep `architecture.md` updated with system diagrams.  
- **User Stories**: Update `Features.md` when adding or changing features.

---

## 7. Security & Compliance

- **Authentication**: HTTP-only, Secure cookies for JWT tokens.  
- **Authorization**: Role‐based guards (`@Roles`).  
- **Data Protection**:  
  - Validate & sanitize all inputs (class‐validator).  
  - Use parameterized queries via TypeORM.  
- **Secrets Management**:  
  - Store API keys, DB credentials in environment variables.  
  - Do **not** commit `.env` files.  
- **Dependencies**:  
  - Regularly run `npm audit` or `yarn audit`.  
  - Apply security patches promptly.

---

## 8. Naming Conventions

- **Database Entities**: PascalCase singular (e.g., `User`, `Project`).  
- **Tables**: snake_case plural (e.g., `users`, `projects`).  
- **REST Routes**: kebab-case plural (e.g., `GET /projects`, `POST /assessments`).  
- **React Components**: PascalCase (e.g., `ProjectCard.tsx`).  
- **Services & Controllers**: `<Feature>Name` (e.g., `AuthService`, `ProjectController`).

---

## 9. API Design

- **RESTful Principles**:  
  - Use HTTP verbs (GET, POST, PUT, DELETE).  
  - Return proper status codes.  
- **Versioning**:  
  - Prefix routes with `/api/v1` for future compatibility.  
- **Error Handling**:  
  - Return consistent error response shape:
    ```json
    { "statusCode": 400, "error": "Bad Request", "message": "Invalid X" }
    ```

---

## 10. AI Prompt Management

- **Prompt Files**: Store in `prompts/` as Markdown or JSON templates.  
- **Template Variables**: Use placeholders like `{{projectDescription}}`.  
- **Validation**: Sanitize outputs; enforce a JSON schema on AI responses.  
- **Rate Limiting**: Queue AI calls via BullMQ and handle retries gracefully.

---

## 11. Environment & Configuration

- **`.env` Keys**:  
  ```
  DATABASE_URL=
  REDIS_URL=
  OPENAI_API_KEY=
  AWS_S3_BUCKET=
  JWT_SECRET=
  ```
- **Config Module**: Use NestJS `@nestjs/config` to load and validate environment variables at startup.

---

## 12. CI/CD

- **Pipeline**:  
  1. Install dependencies  
  2. Lint & format check  
  3. Run tests & coverage  
  4. Build frontend & backend artifacts  
  5. Deploy to staging/production  

- **Checks**: Block merges if any step fails.  
- **Automation**: Auto‐deploy `release/*` branches to a staging environment.

---

## 13. Performance & Monitoring

- **Performance Budgets**:  
  - API responses < 300ms (95th percentile).  
  - Bundle sizes < 250 KB gzipped for critical routes.

- **Logging**:  
  - Use Winston or pino in NestJS for structured logs.  
  - Frontend logs via Sentry.

- **Metrics & Alerts**:  
  - Integrate Datadog or CloudWatch alarms for error rates, latency spikes.

---

## 14. Accessibility

- Follow **WCAG 2.1 AA**:  
  - Semantic HTML, ARIA roles, keyboard navigation.  
  - Automate checks with tools like axe-core in CI.

---

_End of rules.md_
