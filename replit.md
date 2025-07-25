# MasteryMap - Project-Based Learning Management System

## Overview

MasteryMap is a comprehensive AI-powered Project-Based Learning (PBL) management system designed for educational institutions. The application facilitates project creation, milestone tracking, competency-based assessments, and digital portfolio management for teachers and students.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **UI Library**: Radix UI with shadcn/ui components
- **Styling**: Tailwind CSS with custom Apple-inspired design system
- **State Management**: React Query for server state management
- **Routing**: Wouter for client-side routing
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: PostgreSQL-based sessions with connect-pg-simple
- **AI Integration**: OpenAI GPT-4 for content generation

### Database Strategy
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Connection**: Neon Database serverless connection
- **Schema**: Centralized schema definition in `shared/schema.ts`
- **Migrations**: Drizzle Kit for schema management

## Key Components

### Authentication System
- **Provider**: Custom JWT-based authentication system
- **Session Storage**: HTTP-only cookies with JWT tokens
- **Role-Based Access**: Admin, Teacher, Student roles
- **Authorization**: Middleware-based route protection
- **Password Security**: bcryptjs for password hashing

### AI Integration
- **Service**: OpenAI GPT-4 API integration
- **Capabilities**: 
  - Automated milestone generation based on project competencies
  - Assessment creation with rubric-aligned questions
  - Personalized feedback generation
  - Credential recommendation system

### Project Management
- **Project Creation**: Teacher-initiated with competency mapping
- **Milestone Tracking**: AI-generated and manually created milestones
- **Student Assignment**: Bulk assignment capabilities
- **Progress Monitoring**: Real-time progress tracking with visual indicators

### Assessment Module
- **Dynamic Assessment Creation**: AI-powered question generation
- **Rubric Integration**: XQ competency-based rubrics
- **Grading Interface**: Teacher-friendly grading workflows
- **Feedback System**: Automated and manual feedback mechanisms

### Credential System
- **Hierarchy**: Stickers (Outcomes) → Badges (Competencies) → Plaques (Subjects)
- **Automation**: AI-suggested credential awarding
- **Approval Workflow**: Teacher oversight for credential validation

### Digital Portfolio
- **Artifact Collection**: Automatic inclusion of milestone deliverables
- **Curation Tools**: Teacher and student portfolio management
- **Public Sharing**: QR code generation for portfolio access

## Data Flow

### User Authentication Flow
1. User initiates login through Replit Auth
2. OpenID Connect handles authentication
3. Session created in PostgreSQL
4. User redirected to role-specific dashboard

### Project Creation Flow
1. Teacher creates project with competency selection
2. AI generates milestone suggestions
3. Teacher reviews and approves milestones
4. Students assigned to project
5. Progress tracking begins

### Assessment Flow
1. Teacher or AI creates assessment for milestone
2. Students complete assessment submissions
3. AI provides initial grading suggestions
4. Teacher reviews and finalizes grades
5. Feedback generated and delivered to students

### Credential Flow
1. Student completes assessments
2. AI evaluates performance against competencies
3. Credential suggestions generated
4. Teacher approves or modifies recommendations
5. Credentials awarded to student portfolio

## External Dependencies

### Core Dependencies
- **Database**: Neon Database (PostgreSQL)
- **Authentication**: Replit Auth service
- **AI Service**: OpenAI GPT-4 API
- **UI Components**: Radix UI primitives

### Development Dependencies
- **Build Tools**: Vite, esbuild
- **TypeScript**: Full-stack type safety
- **Linting**: ESLint configuration
- **CSS Processing**: PostCSS with Tailwind CSS

### Runtime Dependencies
- **Session Storage**: PostgreSQL with connect-pg-simple
- **Form Handling**: React Hook Form with Zod validation
- **Date Management**: date-fns for date formatting
- **Icons**: Lucide React icons

## Deployment Strategy

### Development Environment
- **Dev Server**: Vite development server with HMR
- **Backend**: tsx for TypeScript execution
- **Database**: Drizzle Kit for schema management
- **Environment**: Replit-optimized development setup

### Production Build
- **Frontend**: Vite production build to `dist/public`
- **Backend**: esbuild bundle to `dist/index.js`
- **Assets**: Static asset optimization
- **Database**: Schema deployment via Drizzle migrations

### Environment Configuration
- **Database**: `DATABASE_URL` for PostgreSQL connection
- **Authentication**: Replit Auth configuration
- **AI Service**: OpenAI API key configuration
- **Session**: Session secret for security

## User Preferences

Preferred communication style: Simple, everyday language.

## Changelog

- July 04, 2025: Initial setup with Replit Auth
- July 04, 2025: **Major Update** - Replaced Replit Auth with custom JWT authentication system
  - Migrated from string-based to integer-based user IDs
  - Added custom login/register pages with Apple-inspired design
  - Implemented JWT tokens with HTTP-only cookies
  - Added password hashing with bcryptjs
  - Updated database schema and all authentication flows
- July 04, 2025: **Application Updates**
  - Renamed application from EduFlow to MasteryMap
  - Fixed API request parameter order in queryClient
  - Fixed landing page "Learn More" button visibility (blue text on white background)
  - Updated all branding and UI references
- July 04, 2025: **Backend Fixes & XQ Competencies**
  - Fixed variable name conflicts in routes.ts (user vs req.user)
  - Added comprehensive XQ competencies database with 10 core and subject-specific competencies
  - Added competency outcomes with rubric levels (Emerging → Developing → Proficient → Applying)
  - Made competencies endpoint publicly accessible for frontend consumption
  - Verified project creation with competency selection working correctly
- July 05, 2025: **3-Level Hierarchy Implementation & Database Fixes**
  - Implemented complete 3-level hierarchy: Learner Outcomes → Competencies → Component Skills
  - Fixed database schema: removed description from component_skills (belongs to competencies)
  - Added proper category mapping to competencies based on learner outcome type
  - Populated database with authentic XQ Competency Framework data
  - Fixed API endpoints to return complete hierarchy with proper relationships
  - Created project creation modal with checkbox tree design for 3-level selection
- July 05, 2025: **Complete Database Schema Optimization**
  - Removed legacy outcomes table - no longer needed with proper 3-level hierarchy
  - Updated grades and credentials tables to reference component_skills instead of outcomes
  - Loaded complete XQ Competency Rubric CSV data: 5 learner outcomes, 28 competencies, 80 component skills
  - Optimized database structure by keeping category column on competencies for performance
  - Updated schema types and relations to reflect new structure
- July 05, 2025: **Assessment System Enhancement & Project Learner Outcomes**
  - Made assessments standalone by making milestoneId optional in assessments table
  - Added componentSkillIds field to assessments for XQ competency tracking
  - Implemented getStandaloneAssessments API endpoint
  - Projects now properly record selected learner outcomes in learnerOutcomes field
  - Created StandaloneAssessmentModal for creating assessments not tied to milestones
  - Both milestone-linked and standalone assessments can measure XQ competencies
- July 05, 2025: **Codebase Cleanup**
  - Removed vestigial files: cookies.txt, server/replitAuth.ts, test-project-creation.js
  - Deleted unused import scripts: import-complete-csv.ts, import-xq-3level-hierarchy.ts, import-xq-competencies.ts, import-xq-fixed.ts
  - Removed old project-creation-modal.tsx (replaced by project-creation-modal-new.tsx)
  - Cleaned up codebase for better maintainability
- July 06, 2025: **Project Component Skills & Standalone Assessments**
  - Replaced learner_outcomes column with component_skill_ids in projects table
  - Projects now properly save selected component skills (verified in logs)
  - Made assessments fully standalone with optional milestoneId and required dueDate
  - Updated assessment creation UI to include due date field and remove milestone dependency
  - Enhanced assessment schema to support standalone assessments with component skills tracking
- July 06, 2025: **Modern Assessment Creation System**
  - Created new CreateAssessmentModal with modern design matching project creation style
  - Implemented collapsible component skills selection with 3-level hierarchy
  - Added multiple choice question support with dynamic options management
  - Integrated AI-powered assessment generation feature
  - Fixed authentication redirect issues and removed unnecessary database columns
  - Streamlined assessments page to focus on standalone assessment creation
- July 06, 2025: **Complete Feature Implementation & Bug Fixes**
  - Added Progress Tracker component with visual milestone tracking and completion stats
  - Implemented comprehensive Grading Interface with XQ rubric levels and AI feedback
  - Created Notification System with real-time alerts for assignments, deadlines, and feedback
  - Built Analytics Dashboard for admins with system-wide metrics and export functionality
  - Developed Digital Portfolio with QR code sharing and artifact curation
  - Fixed backend variable name conflicts and database schema issues
  - Enhanced system with all missing features from requirements analysis
- July 06, 2025: **AI Milestone & Assessment Generation Enhancement**
  - Enhanced milestone generation with proper date validation (milestones must be between today and project due date)
  - Fixed assessments page to display both milestone-linked and standalone assessments
  - Added getAllAssessments endpoint to show complete assessment list
  - Improved project creation with automatic milestone/assessment generation checkbox
  - Added visual indicators for milestone-linked assessments vs standalone assessments
  - Enhanced AI prompts with strict date constraints and validation logic
- July 06, 2025: **School Integration & Team Management System**
  - Added schools table with PSI High School as default entry
  - Updated user registration to require school selection
  - Added schoolId to users and projects tables for proper association
  - Created project teams functionality with team creation and member management
  - Built ProjectTeamSelectionModal for teachers to select students and create teams
  - Implemented automatic milestone assignment to all team members
  - Enhanced project management modal with team creation and management section
  - Added API endpoints for schools, project teams, and team member management
- July 07, 2025: **Student Interface Enhancement & QR Code Implementation**
  - Fixed student project navigation buttons (View Project, Complete milestone, View all milestones)
  - Created comprehensive project detail pages with milestone timelines and progress tracking
  - Added milestone detail pages that list required assessments with completion links
  - Updated student projects query to include team-based projects properly
  - Replaced QR code generation button with actual QR code display in portfolio
  - QR codes automatically generate and link to public portfolio URLs
  - Established clear navigation flow: Projects → Project Detail → Milestone Detail → Assessment Completion
- July 07, 2025: **Comprehensive Codebase Cleanup**
  - Removed 24 unused UI components (accordion, alert-dialog, pagination, slider, popover, etc.)
  - Cleaned up debugging console.log statements from server/routes.ts
  - Removed all unused attached assets (22 PNG files and 1 TXT file)
  - Fixed documentation file extension (rules.md.md → rules.md)
  - Removed empty scripts directory
  - Maintained all console.error statements for proper error logging
  - Optimized codebase by removing approximately 2MB of unused UI component files
- July 07, 2025: **Complete Documentation Overhaul**
  - Updated architecture.md with current React+Express+Drizzle+OpenAI implementation
  - Rewrote features.md to reflect 100% implementation status of all major features
  - Updated requirements.md with detailed technical specifications and implementation status
  - Overhauled rules.md with current technology stack and development practices
  - All documentation now accurately reflects the production-ready MasteryMap system
  - Documented complete XQ competency framework implementation (5 outcomes, 28 competencies, 80 skills)
  - Added comprehensive implementation status tracking with checkmarks for completed features
- July 07, 2025: **Team Management Enhancement & Authentication Fix**
  - Replaced "0 members" label with "Edit Team" button in project team management interface
  - Created comprehensive TeamEditModal with two-panel interface for adding/removing students
  - Added backend API endpoint for removing team members (DELETE /api/project-team-members/:id)
  - Enhanced storage layer with removeTeamMember method and improved team member queries
  - Fixed authentication redirect issue - now properly redirects to /login instead of /api/login
  - Teachers can now fully manage team composition with drag-and-drop style interface
- July 12, 2025: **Data Structure Consistency Fix**
  - Fixed inconsistent data structures in frontend components that didn't align with database schema
  - Updated PortfolioArtifact and Credential interfaces to use proper database field names
  - Fixed field access issues: artifactType instead of type, artifactUrl instead of url, awardedAt instead of earnedAt
  - Replaced mock data with real API calls in digital portfolio, student dashboard, and analytics components
  - Updated date formatting to handle both Date objects and ISO strings correctly
  - Removed deprecated field references (projectTitle, milestoneTitle, competencyArea, rubricLevel)
  - Enhanced React Query usage with proper user ID parameters for data fetching
- July 12, 2025: **AI Feedback Generation Implementation**
  - Implemented complete AI feedback generation system using OpenAI GPT-4o
  - Created generateFeedbackForQuestion function for individual question feedback
  - Added /api/submissions/:id/generate-question-feedback endpoint for question-specific AI feedback
  - Enhanced existing /api/submissions/:id/grade endpoint with AI feedback generation flag
  - Updated GradingInterface component to directly call AI feedback API endpoints
  - Fixed submission review page to properly generate AI feedback for overall submissions
  - Integrated rubric criteria and sample answers into AI feedback prompts for better quality
  - All AI feedback generation now uses authentic OpenAI API calls instead of placeholder functions

## Action List Based on Documentation Analysis

### High Priority Features (Phase 1)
1. **Dashboard Implementation** - Create role-specific dashboards for Teachers, Students, and Admins
2. **Project Management Core** - Implement project creation with competency selection
3. **AI Milestone Generation** - Connect project competencies to AI-generated milestones
4. **Student Assignment System** - Bulk assignment of students to projects
5. **Assessment Module** - AI-powered assessment creation with rubric alignment

### Medium Priority Features (Phase 2)
6. **Progress Tracking** - Visual progress bars and milestone status tracking
7. **Grading Interface** - Teacher-friendly grading with XQ rubric levels
8. **Feedback System** - AI-generated personalized feedback for students
9. **Credential System** - Stickers → Badges → Plaques hierarchy implementation
10. **Notification System** - Real-time notifications for assignments and deadlines

### Advanced Features (Phase 3)
11. **Digital Portfolio** - Auto-compilation of student artifacts with QR sharing
12. **Analytics Dashboard** - School-wide usage metrics and performance tracking
13. **Collaboration Tools** - Group project assignments and peer feedback
14. **Advanced AI Features** - Competency-based credential suggestions
15. **Portfolio Curation** - Teacher/student portfolio management tools

### Technical Implementation Requirements
- **Testing**: Implement comprehensive unit and integration tests
- **Performance**: Ensure sub-3-second AI response times
- **Security**: HTTPS, role-based access control, FERPA compliance
- **Accessibility**: WCAG 2.1 AA compliance throughout
- **Monitoring**: Logging system with Winston/pino for structured logs