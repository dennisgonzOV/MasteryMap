## Project-Based Learning Project Management System

## Overview

This document provides comprehensive requirements and detailed instructions to build a robust, web-based, AI-powered Project-Based Learning (PBL) Project Management System.

---

## Application Structure

The application will have the following modules/pages:

### 1. Authentication & User Management
- Login, Registration, and Password Reset
- Roles: Admin, Teacher, Student

### 2. Dashboard
- **Teacher Dashboard:** Overview of class projects, milestones, assessments, notifications.
- **Student Dashboard:** Projects assigned, milestones due, badges/stickers/plaques earned, recent feedback.
- **Admin Dashboard:** School-wide analytics, user management, and system configuration.

### 3. Project Management
- **Project Creation:** Teachers input title, description, select XQ competencies/outcomes.
- **AI Milestone Generation:** AI suggests milestones based on competencies and project description.
- **Student Assignment:** Teachers assign projects to students/groups.
- **Milestone Management:** Create, edit, delete milestones with deadlines.

### 4. Assessment Module
- **Assessment Creation:** AI-generated assessments with open-ended questions aligned to selected XQ competencies.
- **Sample Responses:** AI-generated rubric-aligned answers for teachers.
- **Grading Interface:** Teachers grade assessments against XQ rubrics.
- **Feedback Mechanism:** Automated personalized feedback for students.
- **Credential Suggestions:** AI suggests stickers for achieving Proficient/Applying.

### 5. Student Progress & Credential Tracking
- **Progress Dashboard:** Visualizes skill progression for students and classes.
- **Credential Awarding:** Automatic assignment of Stickers (Outcomes), Badges (Competencies), and Plaques (Subjects).
- **Credential Management:** Teachers can approve or override AI suggestions.

### 6. Digital Portfolio
- **Portfolio Generation:** Automatically includes artifacts from completed milestones and assessments.
- **Curation & Sharing:** Teachers/students can curate and approve artifacts.
- **QR Code Generation:** Public access via unique URL/QR code.

---

## Detailed Technical Requirements

### Database Model
- **Tables:** Users, Projects, Milestones, Assessments, Submissions, Competencies, Outcomes, Credentials (Stickers, Badges, Plaques), Artifacts, Comments.
- **Relations:** Clearly defined foreign keys linking entities (Projects → Milestones, Assessments → Outcomes, Submissions → Assessments).

### AI Integration
- **Milestone Generation:** AI model prompt clearly linked to selected competencies and project description.
- **Assessment Generation:** Questions and sample answers directly mapped from rubric criteria.
- **Feedback Generation:** Automated, based on rubric level comparisons.

### User Interface (UI) Flow

#### Teacher
- Login → Dashboard → Create Project → Select Competencies → AI Milestones → Edit/Confirm → Assign Students → Manage Milestones → Create Assessment → Grade Submissions → Review Credential Suggestions → Approve → Student Progress → Curate Portfolio

#### Student
- Login → Dashboard → View Assigned Projects → Complete Milestones → Submit Assessment Responses → Review Feedback → Earn/Review Credentials → View/Share Portfolio

#### Admin
- Login → Dashboard → Manage Users → View Reports → Configure System Settings

---

## Non-Functional Requirements

### Scalability
- Handle thousands of concurrent users across multiple schools.

### Security & Privacy
- HTTPS, Role-based access control, FERPA compliance, secure storage.

### Accessibility & Usability
- WCAG 2.1 AA compliance, intuitive UI/UX.

### Performance
- Fast page loads and AI generation (sub 3 seconds).

### Maintainability & Extensibility
- Modular design, clear documentation, easily updatable XQ competency data.

---

## AI Agent Instructions

### Step-by-Step Development

1. **Initial Setup:**
   - Set up project repository (Git), CI/CD pipeline, staging/production environments.
   - Implement basic authentication/user management.

2. **Database Development:**
   - Create tables and relationships based on provided model.

3. **Backend Development:**
   - Implement CRUD APIs for each module.
   - Integrate authentication, authorization.

4. **AI Integration:**
   - Select appropriate AI service (OpenAI API recommended).
   - Develop clearly defined prompts:
     - Milestone creation based on competencies/project descriptions.
     - Assessment questions/answers based on rubric levels.
     - Feedback generation based on grading.

5. **Frontend Development:**
   - Implement user interfaces using React (recommended).
   - Responsive design following provided UI flow.

6. **Testing & Validation:**
   - Comprehensive unit tests, integration tests.
   - Security vulnerability assessments.
   - Accessibility checks.

7. **Deployment & Monitoring:**
   - Deploy to cloud environment (AWS/GCP/Azure).
   - Set up monitoring/logging for performance/security.

---

## Use Cases (Key Scenarios)

1. **Teacher creates a project:** AI generates milestones → Teacher edits/approves.
2. **Student completes milestone assessment:** Submission graded → feedback generated → sticker suggested/approved.
3. **Teacher views student competency progression:** Stickers/Badges automatically awarded based on criteria.
4. **Student shares portfolio via QR:** Portfolio artifacts and credentials publicly visible.

---
