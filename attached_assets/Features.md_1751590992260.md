

This document contains user stories and acceptance criteria for each major feature of the PBL Project Management System.

---

## 1. Authentication & User Management

### User Story 1.1: User Registration
**As a** new user (Teacher or Student),
**I want to** register an account with my email and password,
**so that** I can access the system securely.

#### Acceptance Criteria
- Given I provide a valid email and password,
  when I submit the registration form,
  then my account is created and I receive a confirmation email.
- Given I provide an already registered email,
  when I submit the form,
  then I see an error message indicating the email is in use.
- Passwords must be at least 8 characters long and include a number.

### User Story 1.2: User Login & Password Reset
**As a** registered user,
**I want to** log in with my credentials or reset my password,
**so that** I can regain access if I forget my password.

#### Acceptance Criteria
- Given valid credentials,
  when I submit the login form,
  then I am granted access to my role-based dashboard.
- Given invalid credentials,
  when I attempt to log in,
  then I see an error message and remain on the login page.
- Given I click “Forgot Password” and enter my email,
  when the email exists in the system,
  then I receive a password reset link.

### User Story 1.3: Role-Based Access Control
**As an** Admin,
**I want to** assign roles (Teacher, Student) to users,
**so that** each user sees only the functionality appropriate to their role.

#### Acceptance Criteria
- Given I am an Admin,
  when I create or edit a user,
  then I can set their role from a dropdown (Admin, Teacher, Student).
- Given a user with a Teacher role,
  when they log in,
  then they see the Teacher Dashboard and no Admin functions.
- Given a Student role,
  when they log in,
  then they see only the Student Dashboard and cannot access management pages.

---

## 2. Dashboards

### 2.1 Teacher Dashboard

#### User Story 2.1.1: Overview of Class Projects
**As a** Teacher,
**I want to** see all my active projects and upcoming milestones,
**so that** I can quickly monitor class progress.

##### Acceptance Criteria
- Upon login, the Teacher Dashboard lists active projects with progress bars.
- Milestones due within 7 days are highlighted.
- Clicking a project navigates to its detail page.

#### User Story 2.1.2: Notifications & To-Dos
**As a** Teacher,
**I want to** receive notifications for pending grading tasks,
**so that** I stay on top of assessment deadlines.

##### Acceptance Criteria
- Notifications panel shows ungraded submissions count.
- Clicking a notification navigates to the grading interface.
- Notifications update in real time as submissions arrive.

### 2.2 Student Dashboard

#### User Story 2.2.1: View Assigned Projects
**As a** Student,
**I want to** see my assigned projects and due milestones,
**so that** I know what tasks to complete next.

##### Acceptance Criteria
- Dashboard lists each assigned project with milestone status.
- Milestones due soon are flagged with a red badge.
- Clicking a milestone opens the submission interface.

#### User Story 2.2.2: View Credentials & Feedback
**As a** Student,
**I want to** view my earned stickers, badges, plaques, and feedback,
**so that** I understand my progress and areas for improvement.

##### Acceptance Criteria
- Dashboard displays earned stickers/badges/plaques.
- Feedback notifications link to detailed feedback pages.
- Students can filter credentials by competency.

### 2.3 Admin Dashboard

#### User Story 2.3.1: System Analytics
**As an** Admin,
**I want to** see school-wide usage metrics,
**so that** I can evaluate system adoption and performance.

##### Acceptance Criteria
- Dashboard shows total active users, projects created, assessments graded.
- Charts display trends over time (last 30 days).
- Admin can export analytics as CSV.

#### User Story 2.3.2: User Management
**As an** Admin,
**I want to** create, edit, and deactivate user accounts,
**so that** I can manage access for all teachers and students.

##### Acceptance Criteria
- Admin can view a paginated list of all users.
- Admin can edit user details and roles.
- Admin can deactivate/reactivate users; deactivated users cannot log in.

---

## 3. Project Management

### User Story 3.1: Create New Project
**As a** Teacher,
**I want to** create a project with title, description, and XQ competencies,
**so that** I can align student work to specific learning outcomes.

#### Acceptance Criteria
- Project creation form includes fields: Title, Description, Competency selector.
- Competency selector allows multiple outcomes to be chosen.
- Submitting the form creates the project and redirects to the project detail page.

### User Story 3.2: AI Milestone Generation
**As a** Teacher,
**I want to** receive AI-generated milestone suggestions,
**so that** I can scaffold the project effectively.

#### Acceptance Criteria
- After selecting competencies, Teacher clicks “Generate Milestones.”
- System calls AI service and displays at least 3 milestone suggestions.
- Teacher can edit, delete, or add milestones before saving.

### User Story 3.3: Assign Students to Project
**As a** Teacher,
**I want to** assign individual students or groups to a project,
**so that** each student has access to relevant project tasks.

#### Acceptance Criteria
- Assignment interface lists all class rosters with checkboxes.
- Submitting assignments sets project visibility for selected students.
- Assigned students see the project in their dashboards immediately.

---

## 4. Assessment Module

### User Story 4.1: Create Assessment for Milestone
**As a** Teacher,
**I want to** generate an assessment aligned to a milestone,
**so that** I can measure student performance on specific outcomes.

#### Acceptance Criteria
- In project milestone view, Teacher clicks “Create Assessment.”
- System triggers AI to generate open-ended questions and sample answers.
- Teacher reviews and publishes the assessment; it then appears for students.

### User Story 4.2: Grade Submission with Rubric
**As a** Teacher,
**I want to** grade student submissions against the XQ rubric,
**so that** I can provide consistent, competency-based feedback.

#### Acceptance Criteria
- Grading interface shows student answer and rubric levels side by side.
- Teacher selects a level (Emerging–Applying) for each question.
- Submitting grades updates student profile and triggers feedback generation.

### User Story 4.3: Automated Feedback & Sticker Suggestion
**As a** Teacher,
**I want to** receive AI-generated feedback and sticker suggestions,
**so that** I can quickly approve and provide meaningful guidance.

#### Acceptance Criteria
- After grading, AI feedback appears in an editable textarea.
- System suggests a sticker for levels ≥ Proficient.
- Teacher can approve or adjust feedback and sticker before finalizing.

---

## 5. Student Progress & Credential Tracking

### User Story 5.1: View Competency Progress
**As a** Teacher,
**I want to** view a student’s progression across all competencies,
**so that** I can identify areas needing more practice.

#### Acceptance Criteria
- Teacher can open a student’s progress profile from any dashboard.
- Profile shows each outcome with current rubric level and history chart.
- Opportunity count (number of assessments) is displayed per outcome.

### User Story 5.2: Automatic Badge & Plaque Awarding
**As a** System,
**I want to** award badges and plaques when criteria are met,
**so that** students are recognized for cumulative achievements.

#### Acceptance Criteria
- Upon sticker award, system checks if all sub-skills in a competency are ≥ Proficient.
- If yes and no existing badge, system creates Badge record and notifies Teacher.
- Upon badge award, system checks learner outcomes and awards Plaque if criteria met.

---

## 6. Digital Portfolio

### User Story 6.1: Auto-Compile Artifacts
**As a** Student,
**I want to** have my project artifacts collected in a portfolio,
**so that** I can showcase my work and achievements.

#### Acceptance Criteria
- After each graded milestone, system flags associated artifact for portfolio.
- Student/Teacher can mark artifacts as "include in portfolio."
- Portfolio page lists selected artifacts with thumbnails and descriptions.

### User Story 6.2: Share Portfolio via QR Code
**As a** Student,
**I want to** generate a QR code link to my public portfolio,
**so that** external viewers can access it without logging in.

#### Acceptance Criteria
- On Portfolio page, clicking “Share” generates a unique URL and QR code.
- Public URL displays only approved artifacts and credential icons.
- Non-authenticated users can view but not edit the portfolio.

---

**End of Features.md**