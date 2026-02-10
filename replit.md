# MasteryMap - Project-Based Learning Management System

## Overview
MasteryMap is an AI-powered Project-Based Learning (PBL) management system designed for educational institutions. Its primary purpose is to streamline project creation, milestone tracking, competency-based assessments, and digital portfolio management for both teachers and students. The project aims to significantly enhance modern education by leveraging AI for personalized learning paths and efficient administrative workflows, offering significant market potential in the EdTech sector.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React with TypeScript
- **UI**: Radix UI, shadcn/ui components, Apple-inspired Tailwind CSS for a clean and intuitive interface.
- **State Management**: React Query
- **Routing**: Wouter
- **Build Tool**: Vite

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **Architecture**: Domain-driven modular design, organizing functionality into distinct domains (e.g., auth, projects, assessments, credentials, portfolio, ai, competencies, notifications, safety-incidents). Each domain follows a consistent pattern of controller (routing) → service (business logic) → storage (database) layers, ensuring clean separation of concerns and high modularity.
- **Database**: PostgreSQL with Drizzle ORM.
- **Authentication**: Custom JWT-based system with bcryptjs for password hashing and PostgreSQL-based sessions, enhanced with comprehensive security measures like CSRF protection and rate limiting.
- **AI Integration**: Utilizes OpenAI GPT-4 for advanced content generation (project ideas, milestones, assessments) and personalized feedback.

### Database Strategy
- **ORM**: Drizzle ORM (PostgreSQL dialect).
- **Connection**: Neon Database serverless.
- **Schema**: Centralized schema managed with Drizzle Kit for migrations, with ongoing efforts to modularize schema files by domain for improved maintainability.

### Core Features
- **Authentication**: Robust role-based access control (Admin, Teacher, Student).
- **AI-Powered Workflows**: Includes AI for generating project ideas, milestones, assessments, personalized feedback, and credential recommendations.
- **Project Management**: Teachers can create projects, map competencies, and utilize AI-generated or manual milestones. Includes student assignment and progress tracking.
- **Assessment Module**: Supports dynamic AI-powered question generation, XQ competency-based rubric integration, streamlined grading, and automated/manual feedback. Features a secure 5-letter share code system for students to access assessments.
- **Credential System**: Implements a hierarchical credentialing system (Stickers for outcomes, Badges for competencies, Plaques for subjects) with AI suggestions and teacher approval.
- **Digital Portfolio**: Enables automatic collection of milestone deliverables, curation tools, and public sharing functionalities.
- **Team Management**: Facilitates the creation and management of student project teams, including student assignment.

### Design Decisions
- **Domain-Driven Architecture**: Core architectural principle for the backend, ensuring clear separation of concerns, modularity, and scalability.
- **Modularity**: Emphasizes encapsulated domains, each with its own storage interface, business logic service, and Express router.
- **Service Layer Pattern**: Business logic is abstracted into a dedicated service layer, enhancing testability and maintainability.
- **UI/UX**: Prioritizes a clean, intuitive, and user-friendly interface inspired by Apple's design principles, aiming for ease of use for educators and students.

## External Dependencies

### Core
- **Database**: Neon Database (PostgreSQL)
- **AI Service**: OpenAI GPT-4 API
- **UI Components**: Radix UI

### Runtime
- **Session Storage**: PostgreSQL with connect-pg-simple
- **Form Handling**: React Hook Form with Zod validation
- **Date Management**: date-fns
- **Icons**: Lucide React

## Recent Updates (February 2026)

### PDF Upload for Teacher Assessments
- Teachers can optionally upload a PDF (e.g. reading material, class handout) during assessment creation
- PDF is stored in Replit Object Storage via presigned URL upload flow
- When AI assessment generation is used, the PDF content is extracted (via pdf-parse) and included in the AI prompt so questions reference the reading material
- When AI grading is used, the PDF content is also passed to the grading AI so student responses are evaluated against the actual reading material
- The PDF URL is stored on the assessment record (`pdf_url` column) for persistence
- Only available for teacher-type assessments (not self-evaluations)
- Files: server/utils/pdf.ts, shared/schema.ts (pdfUrl field), AI service/controller updates, create-assessment-modal.tsx

## Previous Updates (August 2025)

### XQ Competencies Database Synchronization ✅ COMPLETE
**Data Import Achievement:**
- Successfully synchronized XQ Competency Framework from XQ_Competency_Rubric.csv to database
- Imported 14 missing competencies and 38 missing component skills
- Resolved missing "Learners for Life" skills that were previously incomplete
- Database now contains complete 3-tier hierarchy: learner outcomes → competencies → component skills
- Total counts: 42 competencies, 118 component skills across all learner outcomes

**Technical Implementation:**
- Enhanced scripts/sync-xq-competencies.ts to handle CSV encoding issues
- Fixed BOM detection and CRLF line ending support matching B.E.S.T. standards approach
- Maintained hierarchical data integrity across 3 related database tables
- Added proper duplicate checking to prevent data corruption during incremental updates

### B.E.S.T. Standards Database Synchronization ✅ COMPLETE
**Data Import Achievement:**
- Successfully synchronized B.E.S.T. Standards data from BestStandards.csv to database
- Imported 973 missing standards that were not in the database
- Database now contains complete set of 1,413 B.E.S.T. educational standards
- Fixed CSV parsing issues with BOM (Byte Order Mark) and CRLF line endings
- Script now properly handles multi-line descriptions and edge cases

**Technical Implementation:**
- Enhanced scripts/sync-best-standards.ts to handle CSV encoding issues
- Added proper BOM detection and removal for UTF-8 encoded files
- Improved CSV parsing with multiple line ending formats support
- Maintained data integrity with duplicate checking and incremental updates
- Added comprehensive logging for synchronization process monitoring

### Comprehensive Error Handling Implementation ✅ COMPLETE
**Frontend Error Resilience:**
- Implemented React Error Boundaries with comprehensive fallback UI
- Added specialized error boundaries for Navigation, Modals, and Component-level errors
- Created structured error logging with correlation IDs and context
- Protected critical components (App, Router, Navigation, AI Chat, Project Cards, Modals)

**Backend Error Management:**
- Created standardized error types (AppError, ValidationError, AuthenticationError, AIServiceError, etc.)
- Implemented centralized error handler middleware with detailed logging
- Added database transaction safety with automatic rollback mechanisms
- Enhanced AI service error handling with context and retry logic

**Infrastructure Improvements:**
- Uncaught exception handlers for graceful shutdown
- Database health checking with retry mechanisms
- Enhanced logging with request correlation and user context
- API error responses with consistent structure and development details

**Previous Updates (December 2024):**
### Dependency Optimization ✅ COMPLETE
**Bundle Cleanup Achievements:**
- Removed 8+ unused dependencies (passport, express-session, csv-parse, framer-motion, connect-pg-simple, embla-carousel-react, next-themes, csurf)
- Eliminated unused CSRF protection (redundant with JWT authentication)
- Moved testing packages to devDependencies for proper categorization
- Reduced node_modules size from ~360MB to ~330MB
- Fixed all TypeScript import errors preventing server startup

**Security Enhancement:**
- Simplified security model to JWT + HTTP-only cookies + rate limiting + helmet
- Removed redundant CSRF protection middleware that was never properly integrated
- Maintained robust authentication with cleaner codebase architecture