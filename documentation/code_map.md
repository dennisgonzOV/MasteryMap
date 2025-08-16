# MasteryMap Code Map

## Overview

MasteryMap is an AI-powered project-based learning management system built with React/TypeScript frontend and Node.js/Express backend. This document provides a comprehensive reference for AI agents to understand the codebase structure and locate functionality for updates and enhancements.

## Architecture Overview

### Technology Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS + Radix UI
- **Backend**: Node.js + Express + TypeScript + PostgreSQL + Drizzle ORM
- **AI Integration**: OpenAI GPT-4 for assessment generation and feedback
- **Authentication**: JWT with HTTP-only cookies
- **State Management**: React Query (TanStack Query)
- **Routing**: Wouter (lightweight router)

### Project Structure

```
MasteryMap/
├── client/                 # React frontend application
├── server/                 # Express backend API
├── shared/                 # Shared types and database schema
├── documentation/          # Project documentation
├── scripts/               # Database and utility scripts
└── tests/                 # Test files and fixtures
```

## Backend Architecture (server/)

### Core Files

- **`server/index.ts`** - Main server entry point, middleware setup
- **`server/routes.ts`** - Central route registration for all domain routers
- **`server/db.ts`** - Database connection and Drizzle ORM setup

### Domain-Driven Architecture

The backend follows a domain-driven design with clear separation of concerns:

#### Domain Structure

Each domain contains:

- **`controller.ts`** - HTTP request handling and response formatting
- **`service.ts`** - Business logic and orchestration
- **`storage.ts`** - Database operations and data access
- **`index.ts`** - Router setup and domain exports

#### Available Domains

1. **`server/domains/auth/`** - Authentication and user management
2. **`server/domains/projects/`** - Project creation, management, and team assignments
3. **`server/domains/assessments/`** - Assessment creation, submission, and grading
4. **`server/domains/competencies/`** - XQ competency framework management
5. **`server/domains/credentials/`** - Digital badges and credential system
6. **`server/domains/portfolio/`** - Student portfolio management
7. **`server/domains/ai/`** - OpenAI integration for AI features
8. **`server/domains/notifications/`** - Real-time notification system
9. **`server/domains/safety-incidents/`** - Safety incident reporting

#### Teacher Functionality Distribution

Teacher-specific functionality is distributed across multiple domains rather than centralized:

- **Projects Domain** (`server/domains/projects/`): Teacher project management, creation, and ownership
- **Assessments Domain** (`server/domains/assessments/`): Teacher assessment creation, grading, and school skills tracking
- **Credentials Domain** (`server/domains/credentials/`): Teacher credential awarding and statistics
- **AI Domain** (`server/domains/ai/`): Teacher safety incident notifications
- **Notifications Domain** (`server/domains/notifications/`): Teacher notification management
- **Route Registration** (`server/routes.ts`): Teacher-specific routes mounted at `/api/teacher`

#### Teacher-Specific API Endpoints

- `/api/teacher` - Teacher assessment routes (mounted from assessments domain)
- `/api/credentials/teacher-stats` - Teacher credential statistics
- `/api/assessments/school-skills-progress` - School skills tracking for teachers
- `/api/assessments/school-skills-stats` - School skills statistics for teachers

### Middleware Layer

- **`server/middleware/errorHandler.ts`** - Global error handling
- **`server/middleware/security.ts`** - Security headers and rate limiting
- **`server/middleware/routeValidation.ts`** - Request validation
- **`server/middleware/resourceAccess.ts`** - Role-based access control

### Services Layer

- **`server/services/BaseService.ts`** - Base service class with common operations
- **`server/services/AIService.ts`** - AI service abstraction
- **`server/services/notifications.ts`** - Notification service

### Utilities

- **`server/utils/databaseErrorHandler.ts`** - Database error handling utilities
- **`server/utils/errorTypes.ts`** - Custom error type definitions
- **`server/utils/routeHelpers.ts`** - Common route helper functions

## Frontend Architecture (client/)

### Core Files

- **`client/src/App.tsx`** - Main application component with routing
- **`client/src/main.tsx`** - Application entry point
- **`client/index.html`** - HTML template

### Page Structure (client/src/pages/)

Pages are organized by user role:

#### Public Pages

- **`landing.tsx`** - Landing page for non-authenticated users
- **`login.tsx`** - User authentication
- **`register.tsx`** - User registration
- **`home.tsx`** - Post-authentication home page
- **`not-found.tsx`** - 404 error page

#### Role-Based Pages

- **`admin/`** - Admin dashboard and password reset
- **`teacher/`** - Teacher dashboard, projects, assessments, submissions
- **`student/`** - Student dashboard, projects, portfolio, assessments

### Component Architecture (client/src/components/)

#### UI Components (client/src/components/ui/)

Reusable UI components built with Radix UI and Tailwind:

- **`button.tsx`**, **`card.tsx`**, **`dialog.tsx`** - Basic UI elements
- **`form.tsx`**, **`input.tsx`**, **`select.tsx`** - Form components
- **`toast.tsx`**, **`toaster.tsx`** - Notification system
- **`progress.tsx`**, **`loading-spinner.tsx`** - Feedback components

#### Feature Components

- **`ai-tutor-chat.tsx`** - AI chat interface
- **`analytics-dashboard.tsx`** - Data visualization
- **`competency-progress.tsx`** - Competency tracking
- **`credential-badge.tsx`** - Digital credential display
- **`digital-portfolio.tsx`** - Portfolio management
- **`notification-system.tsx`** - Real-time notifications
- **`project-card.tsx`** - Project display component
- **`school-skills-tracker.tsx`** - Skills tracking interface
- **`student-progress-view.tsx`** - Student progress visualization

#### Modal Components (client/src/components/modals/)

- **`ai-feedback-modal.tsx`** - AI-generated feedback display
- **`assessment-modal.tsx`** - Assessment creation/editing
- **`create-assessment-modal.tsx`** - Assessment creation workflow
- **`project-creation-modal-new.tsx`** - Project creation interface
- **`project-ideas-modal.tsx`** - Project idea suggestions
- **`project-management-modal.tsx`** - Project management tools
- **`project-team-selection-modal.tsx`** - Team assignment interface
- **`standalone-assessment-modal.tsx`** - Standalone assessment interface
- **`team-edit-modal.tsx`** - Team editing interface
- **`view-submissions-modal.tsx`** - Submission review interface

### Hooks (client/src/hooks/)

Custom React hooks for shared functionality:

- **`useAuth.ts`** - Authentication state management
- **`useDataFetching.ts`** - Data fetching and caching
- **`useErrorHandling.ts`** - Error handling utilities
- **`useRoleBasedAccess.ts`** - Role-based access control
- **`useToast.ts`** - Toast notification management
- **`use-mobile.tsx`** - Mobile device detection

### Library Layer (client/src/lib/)

Core utilities and API integration:

- **`api.ts`** - API client configuration
- **`apiHelpers.ts`** - API helper functions
- **`authUtils.ts`** - Authentication utilities
- **`competencyUtils.ts`** - Competency-related utilities
- **`queryClient.ts`** - React Query client configuration
- **`utils.ts`** - General utility functions

## Shared Layer (shared/)

### Database Schema (shared/schema.ts)

Comprehensive database schema defining all entities:

- **Users and Authentication**: `users`, `auth_tokens`, `sessions`
- **Educational Structure**: `schools`, `learner_outcomes`, `competencies`, `component_skills`
- **Projects**: `projects`, `milestones`, `project_teams`, `project_team_members`
- **Assessments**: `assessments`, `questions`, `submissions`, `self_evaluations`
- **Credentials**: `credentials`, `credential_assignments`
- **Portfolio**: `portfolio_artifacts`, `portfolio_competencies`
- **Notifications**: `notifications`
- **Safety**: `safety_incidents`

### Base Types (shared/baseTypes.ts)

Shared TypeScript interfaces and types used across frontend and backend.

## API Endpoints Reference

### Authentication (`/api/auth`)

- `POST /login` - User authentication
- `POST /register` - User registration
- `GET /user` - Get current user
- `POST /logout` - User logout

### Projects (`/api/projects`)

- `GET /` - List projects
- `POST /` - Create project
- `GET /:id` - Get project details
- `PUT /:id` - Update project
- `DELETE /:id` - Delete project
- `POST /:id/generate-milestones` - AI milestone generation

### Assessments (`/api/assessments`)

- `GET /` - List assessments
- `POST /` - Create assessment
- `GET /:id` - Get assessment details
- `POST /:id/generate` - AI assessment generation
- `GET /standalone` - List standalone assessments

### Competencies (`/api/competencies`)

- `GET /learner-outcomes-hierarchy/complete` - Get complete hierarchy
- `GET /:id/outcomes` - Get competency outcomes

### Credentials (`/api/credentials`)

- `GET /` - List credentials
- `POST /` - Create credential
- `GET /:id` - Get credential details
- `POST /assign` - Assign credential to user

### Portfolio (`/api/portfolio`)

- `GET /` - Get user portfolio
- `POST /artifacts` - Add portfolio artifact
- `GET /artifacts` - List portfolio artifacts

## Development Guidelines for AI Agents

### Where to Place New Features

#### Backend Features

1. **New Domain**: Create new directory in `server/domains/`
2. **New API Endpoint**: Add to existing domain or create new domain
3. **Database Changes**: Update `shared/schema.ts` and run `npm run db:push`
4. **Middleware**: Add to `server/middleware/` if global, or domain-specific
5. **Services**: Add to `server/services/` for shared business logic

#### Frontend Features

1. **New Page**: Add to appropriate role directory in `client/src/pages/`
2. **New Component**: Add to `client/src/components/` or `client/src/components/ui/`
3. **New Hook**: Add to `client/src/hooks/`
4. **New Utility**: Add to `client/src/lib/`
5. **New Route**: Update `client/src/App.tsx` routing

### Common Patterns

#### Database Operations

```typescript
// Use Drizzle ORM with proper error handling
import { db } from "../db";
import { users } from "../../shared/schema";

// Query pattern
const user = await db.select().from(users).where(eq(users.id, userId));

// Insert pattern
const newUser = await db.insert(users).values(userData).returning();
```

#### API Response Pattern

```typescript
// Controller pattern
export const getUser = async (req: Request, res: Response) => {
  try {
    const user = await userService.getUser(req.params.id);
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

#### React Component Pattern

```typescript
// Component with proper TypeScript and error handling
import { useQuery } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const MyComponent = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["myData"],
    queryFn: () => fetchMyData(),
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return <div>{/* Component JSX */}</div>;
};
```

### Error Handling

- **Backend**: Use `server/middleware/errorHandler.ts` for global error handling
- **Frontend**: Use `ErrorBoundary` components and `useErrorHandling` hook
- **Database**: Use `server/utils/databaseErrorHandler.ts` for database errors

### Authentication & Authorization

- **JWT Tokens**: Stored in HTTP-only cookies
- **Role-Based Access**: Use `useRoleBasedAccess` hook and middleware
- **Protected Routes**: Check authentication in `App.tsx` routing

### State Management

- **Server State**: Use React Query for API data
- **Client State**: Use React useState/useReducer for local state
- **Global State**: Use React Context for shared state

### Testing

- **Unit Tests**: Place in `tests/` directory
- **E2E Tests**: Use Playwright in `tests/e2e/`
- **API Tests**: Use supertest in `tests/api/`

## Common Update Scenarios

### Adding New API Endpoint

1. Add route to domain controller (`server/domains/[domain]/controller.ts`)
2. Add business logic to service (`server/domains/[domain]/service.ts`)
3. Add database operations to storage (`server/domains/[domain]/storage.ts`)
4. Register route in domain index (`server/domains/[domain]/index.ts`)

### Adding New Frontend Page

1. Create page component in `client/src/pages/[role]/`
2. Add route to `client/src/App.tsx`
3. Create necessary components in `client/src/components/`
4. Add API integration in `client/src/lib/api.ts`

### Adding New Database Table

1. Define schema in `shared/schema.ts`
2. Run `npm run db:push` to update database
3. Create storage layer in appropriate domain
4. Update types in `shared/baseTypes.ts`

### Adding New UI Component

1. Create component in `client/src/components/ui/` (reusable) or `client/src/components/` (feature-specific)
2. Add to `client/src/components/ui/index.ts` if reusable
3. Import and use in pages/components

This code map should help AI agents understand the codebase structure and make informed decisions about where to place new functionality or updates.
