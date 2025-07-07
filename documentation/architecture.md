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

#### Authentication & User Management
- Custom JWT authentication with refresh tokens
- Role-based access control (Admin, Teacher, Student)
- School-based user organization
- Password hashing with bcryptjs

#### Project Management
- Project creation with component skill selection
- AI-powered milestone generation with date validation
- Team-based project assignments
- Progress tracking with visual indicators

#### Assessment System
- Standalone assessments with optional milestone linking
- Multiple question types (open-ended, multiple-choice, short-answer)
- Component skill tracking per assessment
- Due date management and notifications

#### Grading & Feedback
- XQ rubric-based grading interface
- AI-generated personalized feedback
- Grade history and submission tracking
- Credential recommendation system

#### Digital Portfolio
- Automatic artifact collection from milestone deliverables
- QR code generation for public portfolio sharing
- Credential display (stickers, badges, plaques)
- Portfolio curation tools

#### School & Team Management
- School organization system
- Project team creation and management
- Automatic milestone assignment to team members
- Student roster management by school

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

This architecture provides a scalable, maintainable foundation for project-based learning management with AI-powered features and comprehensive competency tracking.
