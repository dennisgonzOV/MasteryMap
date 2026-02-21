# MasteryMap API Reference

Last reviewed: 2026-02-21

This reference is derived from mounted routers in `server/routes.ts` and domain route definitions.

## Notes

- Most routes require cookie auth (`access_token`) unless marked public.
- Authorization is role-based (`admin`, `teacher`, `student`) and in some routes tier-based (`free`, `enterprise`).
- Response format is mixed across domains (raw JSON and wrapped responses both exist).

## Core

- `GET /api/health` - health check

## Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`
- `POST /api/auth/admin-reset-password`
- `GET /api/auth/user`

## Analytics

- `GET /api/analytics/dashboard` (admin)

## Admin (`/api/admin`)

- `GET /users`
- `POST /users`
- `POST /users/bulk`
- `DELETE /users/:id`
- `POST /users/:id/password`
- `GET /analytics/dashboard`
- `GET /school-users`
- `POST /reset-password`

## Projects (`/api/projects`)

### Public

- `GET /public`
- `GET /public-filters`
- `GET /public/:id`

### Protected

- `POST /`
- `GET /`
- `GET /:id`
- `PUT /:id`
- `DELETE /:id`
- `PATCH /:id/visibility`
- `POST /:id/start`
- `POST /:id/assign`
- `GET /:id/milestones`
- `GET /milestones/:id`
- `POST /:id/teams`
- `GET /:id/teams`

### AI Project Endpoints

- `POST /generate-ideas`
- `POST /:id/generate-thumbnail`
- `POST /generate-thumbnail-preview`
- `POST /:id/generate-milestones`
- `POST /:id/generate-milestones-and-assessments`

## Milestones (`/api/milestones`)

- `GET /:id/assessments`
- `GET /:id`
- `PATCH /:id/deliverable`
- `POST /`
- `PUT /:id`
- `DELETE /:id`

## Project Teams

### `/api/project-teams`

- `POST /`
- `DELETE /:id`
- `GET /:teamId/members`

### `/api/project-team-members`

- `POST /`
- `DELETE /:id`

## Schools and Teacher Dashboards

### `/api/schools`

- `GET /:id/students`
- `GET /students-progress`

### `/api/teacher`

- `GET /dashboard-stats`
- `GET /projects`
- `GET /pending-tasks`
- `GET /current-milestones`

## Assessments (`/api/assessments`)

### Core

- `GET /standalone`
- `GET /`
- `GET /:id`
- `PATCH /:id`
- `POST /`
- `DELETE /:id`

### Lifecycle

- `POST /milestones/:id/generate-assessment`
- `GET /:id/submissions`

### Export

- `GET /:id/export-results`
- `GET /:id/export-submissions`
- `GET /:id/export-detailed-results`

### Share Code

- `POST /:id/generate-share-code`
- `GET /by-code/:code`
- `POST /:id/regenerate-share-code`

### Teacher Skill Stats

- `GET /teacher/school-component-skills-progress`
- `GET /teacher/school-skills-stats`

## Student Compatibility Routes (mounted at `/api`)

- `GET /competency-progress/student/:studentId`
- `GET /students/competency-progress`
- `GET /deadlines/student`
- `GET /student/assessment-submissions/:studentId`

## Submissions (`/api/submissions`)

- `POST /`
- `GET /student`
- `POST /preview-feedback`
- `GET /:id`
- `POST /:submissionId/grade`
- `GET /:id/grades`
- `POST /:id/generate-question-feedback`

## Self-Evaluations (`/api/self-evaluations`)

- `POST /`
- `GET /assessment/:assessmentId`
- `GET /student`
- `POST /:id/flag-risky`

## Competencies

The competencies router is mounted at:

- `/api/competencies`
- `/api/learner-outcomes-hierarchy`
- `/api/learner-outcomes`
- `/api/competencies-hierarchy`

Routes exposed by this router:

- `GET /best-standards/metadata`
- `GET /best-standards/by-competency/:competencyId`
- `POST /best-standards/by-ids`
- `GET /best-standards`
- `GET /`
- `GET /component-skills`
- `GET /component-skills/details`
- `GET /component-skills/by-competency/:competencyId`
- `GET /learner-outcomes`
- `GET /learner-outcomes-hierarchy`
- `GET /learner-outcomes-hierarchy/complete`
- `GET /learner-outcomes-hierarchy/:id/competencies`
- `GET /competencies-hierarchy/:id/component-skills`
- `POST /component-skills/by-ids`

## Credentials (`/api/credentials`)

- `GET /student`
- `GET /teacher-stats`
- `POST /`

## Portfolio (`/api/portfolio`)

### Authenticated

- `GET /artifacts`
- `POST /artifacts`
- `PATCH /artifacts/:id`
- `PATCH /artifacts/:id/visibility`
- `GET /settings`
- `PATCH /settings`
- `GET /share-link`
- `GET /qr-code`

### Public

- `GET /public/:publicUrl`

## AI (`/api/ai`)

- `POST /tutor/chat`
- `POST /assessment/generate-questions`
- `POST /generate-assessment`

## Notifications (`/api/notifications`)

- `GET /`
- `POST /:id/mark-read`
- `POST /mark-all-read`

## Safety Incidents (`/api/safety-incidents`)

- `GET /`
- `POST /`
- `PATCH /:id/status`
- `PUT /:id/resolve`

## Contact (`/api/contact`)

- `POST /` (public, rate-limited)

## Uploads and Objects

- `POST /api/uploads/file`
- `GET /objects/:objectPath(*)`

