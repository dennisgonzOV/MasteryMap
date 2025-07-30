# MasteryMap - System Architecture

```mermaid
flowchart TD

%% Frontend Components
subgraph React Frontend
  direction TB
  UserUI[User Interface] -->|HTTP Request| AuthService[Custom JWT Auth]
  UserUI -->|HTTP Request| Dashboard[Role-Based Dashboards]
  UserUI -->|HTTP Request| ProjectUI[Project Management Interface]
  UserUI -->|HTTP Request| AssessmentUI[Assessment Creation & Taking]
  UserUI -->|HTTP Request| GradingUI[Grading Interface]
  UserUI -->|HTTP Request| PortfolioUI[Digital Portfolio with QR Codes]
end

%% Backend Components
subgraph Express.js Backend
  direction TB
  AuthService -->|API Call| JWTAuth[JWT Authentication Service]
  Dashboard -->|API Call| ExpressAPI[REST API Endpoints]
  ProjectUI -->|API Call| ExpressAPI
  AssessmentUI -->|API Call| ExpressAPI
  GradingUI -->|API Call| ExpressAPI
  PortfolioUI -->|API Call| ExpressAPI

  ExpressAPI -->|Business Logic| StorageService[Storage Service Layer]
  StorageService -->|Data Operations| DrizzleORM[Drizzle ORM]
  ExpressAPI -->|AI Triggers| OpenAIService[OpenAI Integration Service]
  DrizzleORM --> PostgreSQL[(PostgreSQL Database)]
  ExpressAPI --> SessionStore[PostgreSQL Session Store]
end

%% AI Integration
subgraph AI Integration
  OpenAIService -->|API Call| OpenAI[OpenAI GPT-4o API]
  OpenAIService -->|Generates| Milestones[Project Milestones]
  OpenAIService -->|Generates| Assessments[Assessment Questions]
  OpenAIService -->|Generates| Feedback[Personalized Feedback]
  OpenAIService -->|Suggests| Credentials[Credential Recommendations]
end

%% XQ Competency Framework
subgraph XQ Framework
  LearnerOutcomes[Learner Outcomes] --> Competencies
  Competencies --> ComponentSkills[Component Skills]
  ComponentSkills --> RubricLevels[Rubric Levels: Emerging → Developing → Proficient → Applying]
end

%% School & Team Management
subgraph School System
  Schools[School Organizations] --> Users[Users by School]
  Projects[Projects] --> Teams[Project Teams]
  Teams --> TeamMembers[Team Members]
end

%% Authentication Flow
JWTAuth --> PostgreSQL
JWTAuth --> SessionStore

%% Data flow
ProjectUI --> ExpressAPI --> OpenAIService --> OpenAI
AssessmentUI --> ExpressAPI --> OpenAIService
GradingUI --> ExpressAPI --> StorageService --> DrizzleORM
PortfolioUI --> ExpressAPI --> QRGenerator[QR Code Generator]
XQ Framework --> StorageService --> PostgreSQL

%% External Services
classDef external fill:#f96,stroke:#333,stroke-width:2px
class OpenAI external

%% Style
classDef frontend fill:#bbdefb,stroke:#333
classDef backend fill:#c8e6c9,stroke:#333
classDef database fill:#ffecb3,stroke:#333
classDef ai fill:#ffe0b2,stroke:#333
class UserUI,AuthService,Dashboard,ProjectUI,AssessmentUI,GradingUI,PortfolioUI frontend
class ExpressAPI,StorageService,JWTAuth,OpenAIService backend
class PostgreSQL,SessionStore database
class OpenAI,Milestones,Assessments,Feedback,Credentials ai

```

## Current Implementation Architecture

### Frontend (React + TypeScript + Vite)
- **Framework**: React 18 with TypeScript for type safety
- **Build Tool**: Vite for fast development and optimized production builds
- **UI Library**: Radix UI primitives with shadcn/ui components for consistent design
- **Styling**: Tailwind CSS with custom Apple-inspired design system
- **State Management**: TanStack React Query for server state and caching
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation schemas

### Backend (Node.js + Express + TypeScript)
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules for full-stack type safety
- **Authentication**: Custom JWT-based system with HTTP-only cookies
- **Database ORM**: Drizzle ORM with PostgreSQL dialect for type-safe database operations
- **Session Management**: PostgreSQL-based sessions using connect-pg-simple
- **API Design**: RESTful endpoints with consistent error handling and logging

### Database Strategy (PostgreSQL + Drizzle ORM)
- **Database**: Neon Database serverless PostgreSQL instance
- **ORM**: Drizzle ORM for type-safe database operations and migrations
- **Schema**: Centralized schema definition in `shared/schema.ts`
- **Migration Strategy**: `npm run db:push` for direct schema deployment

### AI Integration (OpenAI GPT-4o)
- **Service**: OpenAI GPT-4o API for intelligent content generation
- **Capabilities**:
  - **Milestone Generation**: Creates project milestones based on component skills and descriptions
  - **Assessment Creation**: Generates questions aligned to XQ competency rubrics
  - **Feedback Generation**: Provides personalized student feedback based on performance
  - **Credential Suggestions**: Recommends stickers, badges, and plaques based on competency achievement

### XQ Competency Framework Implementation
- **3-Level Hierarchy**: Learner Outcomes → Competencies → Component Skills
- **Rubric Integration**: 4-level rubric system (Emerging, Developing, Proficient, Applying)
- **Database Structure**: Normalized tables with proper relationships
- **Selection Interface**: Collapsible tree structure for competency selection

### Key Features Implemented

#### Authentication & User Management ✅ COMPLETE
- Custom JWT authentication with HTTP-only cookies and refresh token rotation
- Role-based access control (Admin, Teacher, Student) with middleware protection
- School-based user organization with data isolation
- Password hashing with bcryptjs and secure session management
- Registration with school selection and automatic role assignment

#### Project Management ✅ COMPLETE
- Comprehensive project creation with XQ component skill selection
- AI-powered milestone generation using OpenAI GPT-4o with date validation
- Team-based project assignments with automatic milestone distribution
- Progress tracking with visual indicators and completion statistics
- Project management modal with team creation and member management

#### Assessment System ✅ COMPLETE
- Standalone assessments independent of milestones with 5-letter share codes
- Assessment taking interface with multi-question navigation and progress tracking
- Multiple question types (open-ended, multiple-choice, short-answer) with dynamic forms
- Component skill tracking per assessment with XQ competency alignment
- AI-powered assessment generation with rubric criteria and sample answers

#### Grading & Feedback ✅ COMPLETE
- XQ rubric-based grading interface with 4-level assessment (Emerging → Developing → Proficient → Applying)
- AI-generated personalized feedback using OpenAI GPT-4o based on performance
- Comprehensive submission review with grade history and tracking
- Teacher grading workflow with AI assistance and manual override capabilities

#### Digital Portfolio ✅ COMPLETE
- Automatic artifact collection from completed milestones and assessments
- QR code generation for public portfolio sharing without authentication
- Credential display system (stickers, badges, plaques) with achievement dates
- Portfolio curation tools for students and teachers with public URL access

#### School & Team Management ✅ COMPLETE
- Multi-school organization system with PSI High School as default
- Project team creation and management with student selection interface
- Automatic milestone assignment to all team members with progress tracking
- Student roster management by school with team member addition/removal
- Team edit modal with comprehensive member management interface

#### Credential System ✅ COMPLETE
- 3-tier credential hierarchy (Stickers → Badges → Plaques) based on XQ competencies
- AI-powered credential suggestions based on competency mastery
- Teacher approval workflow for credential awarding with timestamps
- Credential tracking and display in student portfolios and dashboards

#### Analytics & Reporting ✅ COMPLETE
- School-wide analytics dashboard with usage metrics and performance data
- Component skills progress tracking across all students with detailed reporting
- Teacher dashboard statistics with project, student, and grading metrics
- Export functionality for analytics data with CSV format support

#### Notification System ✅ COMPLETE
- Real-time notifications for assignments, deadlines, and feedback
- Assessment completion alerts and grading notifications
- Credential award notifications with portfolio integration
- System-wide announcement capabilities for important updates

### Development Environment
- **Dev Server**: Vite development server with Hot Module Replacement
- **Backend**: tsx for TypeScript execution without compilation
- **Database**: Drizzle Kit for schema management and migrations
- **Environment**: Optimized for Replit development environment

### Deployment Architecture
- **Frontend**: Vite production build served as static assets
- **Backend**: Single Express server handling both API and static file serving
- **Database**: Neon Database with connection pooling
- **Environment**: Environment variables for configuration management

### Assessment Code Sharing System ✅ COMPLETE
- 5-letter assessment codes (similar to Nearpod) for easy student access
- Automatic code generation with 7-day expiration for security
- Student code entry interface with validation and error handling
- Prominent share code display in teacher interfaces with copy functionality

### Advanced Features ✅ COMPLETE
- AI-powered milestone generation with proper date constraints
- Assessment sharing via persistent codes instead of URLs for security
- Team collaboration tools with member management interface
- Public portfolio sharing with QR codes for external audiences
- Comprehensive progress tracking with visual milestone indicators

This architecture provides a complete, production-ready foundation for project-based learning management with AI-powered features, comprehensive XQ competency tracking, and advanced collaboration tools. The system supports multi-school deployment with proper data isolation and security boundaries.
