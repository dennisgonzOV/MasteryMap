# MasteryMap End-to-End Integration Use Cases

Last reviewed: 2026-02-21

## 1. Purpose

This document defines a complete set of automated end-to-end use cases for MasteryMap, covering public, student, teacher, and admin feature areas plus cross-cutting concerns (security, tier gating, safety, and rate limits).

Goal: use this as the source test catalog for Playwright-based browser E2E and API-assisted E2E suites.

## 2. Automation Strategy

Use two layers:

1. UI E2E (`@ui`) via Playwright browser flows for user-visible workflows.
2. API-assisted E2E (`@api-e2e`) via Playwright `request` context (or supertest) for flows not fully exposed in UI.

Recommended tags per test:

- `@smoke`: critical health checks for CI every PR
- `@regression`: full feature coverage in nightly/merge-to-main
- `@security`: auth, access control, school isolation, tier gating
- `@rate-limit`: limiter behavior

## 3. Required Test Data Fixtures

Seed at least:

- Schools: `School A`, `School B`
- Users:
  - `adminA` (admin, School A, enterprise)
  - `adminB` (admin, School B, enterprise)
  - `teacherA` (teacher, School A, enterprise)
  - `teacherFree` (teacher, free tier)
  - `teacherB` (teacher, School B, enterprise)
  - `studentA1`, `studentA2` (students, School A)
  - `studentB1` (student, School B)
- Reusable seeded entities:
  - At least one public project in School A
  - One private project in School A
  - One milestone-linked assessment
  - One standalone assessment

## 4. Environment Requirements

- DB configured and reachable (`DATABASE_URL`)
- Auth secrets set (`JWT_SECRET`, `JWT_REFRESH_SECRET`)
- AI credentials set for AI tests (`AZURE_GPT41_API_KEY`)
- Object storage set for upload tests (`UPLOADS_S3_BUCKET`, `AWS_REGION`)

## 5. Use Case Catalog

## 5.1 Public and Landing

### PUB-01 `@smoke @ui` Landing page load

Steps:

1. Open `/` while logged out.
2. Verify hero content and primary CTA buttons render.

Assertions:

- HTTP 200, no console errors.
- Login/register links are reachable.

### PUB-02 `@regression @ui` Contact form success

Steps:

1. Open landing contact modal/form.
2. Submit valid `name`, `email`, `message`.

Assertions:

- Success toast/message shown.
- Network call: `POST /api/contact` returns success.

### PUB-03 `@security @api-e2e @rate-limit` Contact rate-limit

Steps:

1. Submit valid contact request 4 times from same client/IP context in one hour window.

Assertions:

- First 3 requests succeed.
- 4th returns limiter response (HTTP 429).

### PUB-04 `@regression @ui` Public project explorer and filters

Steps:

1. Open `/explore`.
2. Apply filter combinations (subject, grade, duration).
3. Open project detail `/explore/project/:id`.

Assertions:

- Filter options populate from API-backed metadata.
- Filtered list updates correctly.
- Public project detail renders project, milestones, and assessments.

### PUB-05 `@regression @ui` Public portfolio view

Steps:

1. Open `/portfolio/public/:publicUrl` for a student portfolio.

Assertions:

- Portfolio artifacts and credentials render without login.

### PUB-06 `@security @api-e2e` Signed portfolio URL validation

Steps:

1. Generate signed share link as student via `/api/portfolio/share-link?expirationDays=7`.
2. Request public URL with valid `expiresAt`/`sig`.
3. Request same URL with modified signature.
4. Request same URL with past expiration.

Assertions:

- Valid signature returns 200.
- Invalid signature returns 403.
- Expired signature returns 410.

## 5.2 Authentication and Session

### AUTH-01 `@smoke @ui` Register student account

Steps:

1. Open `/register`.
2. Submit valid student registration.
3. Log in with created credentials.

Assertions:

- Account created and authenticated.
- `/api/auth/user` returns student role profile.

### AUTH-02 `@smoke @ui` Register teacher account

Steps:

1. Register teacher in School A.
2. Log in.

Assertions:

- Teacher role returned.
- Teacher routes become accessible.

### AUTH-03 `@smoke @ui` Login + logout flow

Steps:

1. Log in with existing user.
2. Verify authenticated landing/home.
3. Trigger logout.

Assertions:

- Cookies set on login.
- Cookies cleared on logout.
- Protected routes redirect/deny after logout.

### AUTH-04 `@security @api-e2e` Refresh token flow

Steps:

1. Authenticate to get cookies.
2. Call `POST /api/auth/refresh`.

Assertions:

- Refresh returns success.
- New auth session remains valid.

### AUTH-05 `@security @ui` Role-based route access

Steps:

1. Log in as student and attempt teacher/admin pages.
2. Log in as teacher and attempt admin pages.

Assertions:

- Student blocked from teacher/admin pages.
- Teacher blocked from admin pages.

### AUTH-06 `@rate-limit @security @api-e2e` Login limiter

Steps:

1. Perform repeated invalid logins on `/api/auth/login`.

Assertions:

- Limiter triggers (HTTP 429) after threshold.

## 5.3 Teacher Project Workflows

### TPROJ-01 `@smoke @ui` Create project manually

Steps:

1. Log in as `teacherA`.
2. Open teacher projects page.
3. Create project with title, description, due date, component skills.

Assertions:

- Project appears in teacher list.
- `GET /api/projects?scope=mine` includes new project.

### TPROJ-02 `@regression @ui` Generate project ideas

Steps:

1. Open project ideas modal.
2. Submit subject/topic/grade/duration/skills.

Assertions:

- AI ideas list is returned and selectable.

### TPROJ-03 `@regression @api-e2e` Free-tier project idea monthly cap

Steps:

1. Authenticate as `teacherFree`.
2. Call project idea generation 6 times in same month.

Assertions:

- First 5 succeed.
- 6th is blocked with free-tier-limit error.

### TPROJ-04 `@regression @ui` Generate thumbnail preview and persist thumbnail

Steps:

1. Create/open project.
2. Generate thumbnail preview.
3. Generate and save thumbnail for project.

Assertions:

- Thumbnail preview URL/object path returned.
- Project stores thumbnail URL.

### TPROJ-05 `@regression @ui` Generate milestones

Steps:

1. Trigger milestone generation for project.

Assertions:

- Milestones are created and listed under project.

### TPROJ-06 `@regression @ui` Generate milestones and assessments together

Steps:

1. Trigger combined generation.

Assertions:

- Response includes both milestones and assessments.
- Assessment list reflects generated assessments.

### TPROJ-07 `@regression @ui` Project visibility toggle to public explorer

Steps:

1. Set project visibility to public in management flow.
2. Open public explorer logged out.

Assertions:

- Project appears in `/explore` results.

### TPROJ-08 `@security @api-e2e` School-scope project visibility for teachers

Steps:

1. As `teacherA`, query `/api/projects?scope=school`.
2. As `teacherB`, query same for School B.

Assertions:

- Each teacher sees only own-school projects.

## 5.4 Teams, Assignment, and Milestones

### TEAM-01 `@smoke @ui` Create team and add members

Steps:

1. In project management, create team.
2. Add `studentA1`, `studentA2`.

Assertions:

- Team created.
- Team member list reflects both students.

### TEAM-02 `@regression @ui` Remove and re-add team members

Steps:

1. Remove one member.
2. Re-add member.

Assertions:

- Member list updates correctly after each action.

### TEAM-03 `@regression @api-e2e` Assign students to project

Steps:

1. Call `POST /api/projects/:id/assign` with student IDs.

Assertions:

- Assigned students see project on dashboard.

### MILE-01 `@regression @ui` Manual milestone CRUD

Steps:

1. Create milestone.
2. Update title/description/date.
3. Delete milestone.

Assertions:

- CRUD behavior is reflected in project timeline and API responses.

### MILE-02 `@regression @ui` Deliverable upload and portfolio linkage

Steps:

1. Log in as student assigned to project.
2. Upload milestone deliverable.
3. Set include-in-portfolio true.

Assertions:

- Deliverable stored with object path.
- Portfolio artifact is created/updated.

## 5.5 Assessment Authoring and Sharing

### ASSESS-01 `@smoke @ui` Create standalone assessment

Steps:

1. Teacher creates standalone assessment with multiple questions.

Assertions:

- Assessment appears in assessment list.
- Assessment type and due date persist.

### ASSESS-02 `@regression @ui` Create milestone-linked assessment

Steps:

1. Teacher creates assessment linked to a milestone.

Assertions:

- Assessment visible under milestone and teacher assessments view.

### ASSESS-03 `@regression @ui` Generate AI questions during assessment creation

Steps:

1. Use AI question generation flow from assessment modal.

Assertions:

- Generated questions are inserted and editable.

### ASSESS-04 `@regression @ui` AI generate assessment from skills + standards

Steps:

1. Provide component skills and optional standards context.
2. Trigger generation.

Assertions:

- Generated assessment title/description/questions returned.

### ASSESS-05 `@regression @ui` Attach PDF for AI context

Steps:

1. Upload assessment PDF.
2. Generate AI assessment/questions with PDF context.

Assertions:

- Upload path saved to assessment.
- Generation succeeds with PDF input.

### ASSESS-06 `@smoke @ui` Generate and regenerate share code

Steps:

1. Generate share code for assessment.
2. Regenerate code.

Assertions:

- 5-letter code created.
- Regenerated code differs and old code invalidates/expires per backend behavior.

## 5.6 Student Assessment Completion

### SUBMIT-01 `@smoke @ui` Join assessment by code

Steps:

1. Student opens `/student/enter-code`.
2. Enters valid share code.

Assertions:

- Student routed to assessment page.

### SUBMIT-02 `@regression @ui` Invalid/expired code handling

Steps:

1. Enter invalid code.
2. Enter expired code.

Assertions:

- Error message shown for invalid code.
- Expired code path handled with clear message.

### SUBMIT-03 `@smoke @ui` Submit teacher assessment

Steps:

1. Student answers all questions.
2. Submit assessment.

Assertions:

- Submission saved.
- Student can view status in dashboard/submission history.

### SUBMIT-04 `@regression @ui` Preview feedback request limit

Steps:

1. Request pre-submit AI feedback 4 times.

Assertions:

- First 3 preview requests succeed.
- 4th request is blocked with limit message.

### SUBMIT-05 `@regression @api-e2e` Background auto-grading path

Steps:

1. Submit teacher assessment with no existing grades.
2. Poll submission/grades endpoints.

Assertions:

- Auto-grading process creates feedback/grades asynchronously.

## 5.7 Grading, Feedback, and Exports

### GRADE-01 `@smoke @ui` Teacher grades submission

Steps:

1. Open submission review.
2. Apply rubric levels and feedback.
3. Save grading.

Assertions:

- Submission marked graded.
- Student-visible feedback updates.

### GRADE-02 `@regression @ui` Question-level AI feedback generation

Steps:

1. From submission review, trigger per-question feedback generation.

Assertions:

- Feedback text returned and usable in grading UI.

### GRADE-03 `@regression @api-e2e` Export results CSV

Steps:

1. Call each export endpoint for an assessment:
   - `/export-results`
   - `/export-submissions`
   - `/export-detailed-results`

Assertions:

- Response content type is CSV.
- File includes expected row structure.

### GRADE-04 `@security @api-e2e` Prevent assessment delete with submissions

Steps:

1. Attempt to delete assessment that already has submissions.

Assertions:

- Backend rejects delete with validation message.

## 5.8 Self-Evaluation and AI Tutor

### SELF-01 `@smoke @ui` Complete self-evaluation assessment

Steps:

1. Student opens self-evaluation assessment.
2. Chooses rubric level and submits justification/examples.

Assertions:

- Self-evaluation record created.
- AI improvement feedback returned.

### SELF-02 `@regression @api-e2e` Retrieve self-evaluations by assessment and student

Steps:

1. Student requests `/api/self-evaluations/student`.
2. Teacher requests `/api/self-evaluations/assessment/:assessmentId`.

Assertions:

- Student sees only own records.
- Teacher sees assessment records they can access.

### TUTOR-01 `@regression @ui` AI tutor chat happy path

Steps:

1. Student opens tutor in assessment flow.
2. Sends multiple messages.

Assertions:

- Tutor returns response and optional suggested evaluation.

### TUTOR-02 `@security @api-e2e` Tutor safety flag creates incident workflow

Steps:

1. Submit tutor chat payload expected to trigger safety flag.
2. Query safety incidents and notifications.

Assertions:

- Incident exists with expected metadata.
- Teacher notifications include incident-related event.

## 5.9 Credentials, Portfolio, and Sharing

### CRED-01 `@regression @api-e2e` Award credential and verify student visibility

Steps:

1. Teacher awards credential to student.
2. Student loads dashboard and portfolio.

Assertions:

- Credential appears in student credential endpoints/UI.

### PORT-01 `@smoke @ui` Portfolio artifact management

Steps:

1. Student edits artifact tags/visibility.
2. Saves artifact.

Assertions:

- Artifact updates persist.

### PORT-02 `@regression @ui` Replace artifact file from portfolio editor

Steps:

1. Student uploads replacement file for existing artifact.

Assertions:

- Artifact URL/type updates.
- If milestone-linked, milestone deliverable sync path succeeds.

### PORT-03 `@smoke @ui` Portfolio settings update

Steps:

1. Update portfolio title/description.

Assertions:

- Updated settings returned by `/api/portfolio/settings`.

### PORT-04 `@smoke @ui` Share link + QR code generation

Steps:

1. Generate share link with no expiration.
2. Generate share link with `expirationDays`.
3. Generate QR code with and without expiration.

Assertions:

- Returned payload includes expected URL, slug, expiry fields, and QR data URL.

## 5.10 Notifications and Safety Incidents

### NOTE-01 `@smoke @ui` Notification retrieval and mark-read

Steps:

1. Trigger event that creates notification.
2. Open notifications UI.
3. Mark single notification read.
4. Mark all read.

Assertions:

- Unread counts and statuses update correctly.

### SAFE-01 `@regression @api-e2e` Safety incident lifecycle

Steps:

1. Create safety incident.
2. Update status (admin).
3. Resolve incident (teacher/admin).

Assertions:

- Status and resolution fields update correctly.

### SAFE-02 `@regression @api-e2e` Flag risky self-evaluation

Steps:

1. Create self-evaluation record.
2. Teacher/admin calls `POST /api/self-evaluations/:id/flag-risky`.

Assertions:

- Self-evaluation is marked as risky/notified per backend behavior.

## 5.11 Admin Operations

### ADMIN-01 `@smoke @ui` Admin users list

Steps:

1. Log in as `adminA`.
2. Open admin users page.

Assertions:

- Only School A users shown.

### ADMIN-02 `@regression @ui` Admin create single user

Steps:

1. Create new student user with required fields.

Assertions:

- User appears in admin list.

### ADMIN-03 `@regression @ui` Admin bulk create users

Steps:

1. Upload/paste bulk user rows and submit.

Assertions:

- Successful and failed entries are reported correctly.

### ADMIN-04 `@regression @ui` Admin delete user

Steps:

1. Delete non-admin user.

Assertions:

- User removed and no longer retrievable in list.

### ADMIN-05 `@regression @ui` Admin reset user password

Steps:

1. Reset target user password.
2. Login as target user with new password.

Assertions:

- Password reset is effective.

### ADMIN-06 `@security @api-e2e` Cross-school admin restriction

Steps:

1. `adminA` attempts to manage `School B` user.

Assertions:

- Operation denied.

### ADMIN-07 `@regression @api-e2e` Admin analytics endpoint

Steps:

1. Call `/api/admin/analytics/dashboard` and `/api/analytics/dashboard` as admin.

Assertions:

- Analytics payload returned for admin school scope.

## 5.12 Competency and Standards Data

### COMP-01 `@smoke @api-e2e` Learner outcome hierarchy retrieval

Steps:

1. Call `/api/competencies/learner-outcomes-hierarchy/complete` as authenticated user.

Assertions:

- Hierarchy payload contains learner outcomes, competencies, and component skills.

### COMP-02 `@regression @api-e2e` Standards metadata and filtering

Steps:

1. Call `/api/competencies/best-standards/metadata`.
2. Call `/api/competencies/best-standards` with subject/grade/search filters.
3. Call `/api/competencies/best-standards/by-ids` for selected standards.

Assertions:

- Metadata fields return valid filter options.
- Filtered standards return expected subset.
- By-IDs lookup returns exact requested standards.

## 5.13 Tier Gating and Access Control

### TIER-01 `@security @api-e2e` Free-tier teacher blocked from gated teacher endpoints

Steps:

1. Authenticate as `teacherFree`.
2. Call representative gated endpoints:
   - `/api/teacher/dashboard-stats`
   - `/api/schools/students-progress`
   - `/api/assessments/teacher/school-skills-stats`

Assertions:

- Access denied for gated routes.

### ACL-01 `@security @api-e2e` Teacher cannot manage other-school project resources

Steps:

1. `teacherB` attempts to update/delete School A project, milestones, teams, or assessments.

Assertions:

- Forbidden/denied responses returned.

### ACL-02 `@security @api-e2e` Student cannot access another student submissions

Steps:

1. `studentA1` requests `studentA2` submission data endpoints.

Assertions:

- Access denied.

## 5.14 Uploads and Object Serving

### FILE-01 `@smoke @api-e2e` File upload endpoint

Steps:

1. Upload assessment PDF and deliverable files via `/api/uploads/file`.

Assertions:

- `objectPath` returned.

### FILE-02 `@regression @api-e2e` Object retrieval endpoint

Steps:

1. Request returned `objectPath` through `/objects/*`.

Assertions:

- Stored object streams successfully.
- Correct content type is set.

## 5.15 Known UI/API Drift Checks

These tests intentionally capture current drift and should be tracked until resolved.

### DRIFT-01 `@regression @ui` Admin export button behavior

Steps:

1. Open admin dashboard.
2. Click "Export Data".

Assertions:

- If export endpoint is unavailable, user receives failure toast and app remains stable.
- If endpoint is implemented later, update assertion to expect successful file download.

## 6. Suggested Execution Sets

## PR Smoke Set

- PUB-01, AUTH-03, TPROJ-01, ASSESS-01, SUBMIT-03, GRADE-01, PORT-04, ADMIN-01

## Nightly Full Regression

- All use cases in sections 5.1 to 5.15

## Security Focused Run

- AUTH-05, AUTH-06, PUB-06, TIER-01, ACL-01, ACL-02, ADMIN-06, TUTOR-02

## 7. Implementation Notes for Test Authors

- Prefer deterministic seed fixtures over UI setup for cross-role dependencies.
- Use API setup/teardown hooks for heavy data creation (projects, teams, assessments).
- Keep test IDs stable in UI components where possible; avoid brittle selectors.
- Assert both UI state and network/API side effects for each end-to-end flow.
