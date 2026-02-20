# MasteryMap - Development Guidelines & Best Practices

Guidelines and best practices for developing and maintaining the MasteryMap Project-Based Learning Management System.

---

## 0. Current Technology Stack & Architecture

### Frontend Stack (React + TypeScript + Vite):
- **React 18** with TypeScript for type safety and modern React patterns
- **Vite** for build tooling, development server, and optimized production builds
- **Radix UI** with shadcn/ui components for accessible UI primitives
- **Tailwind CSS** with custom Apple-inspired design system and responsive layouts
- **TanStack React Query v5** for server state management and intelligent caching
- **Wouter** for lightweight client-side routing with role-based protection
- **React Hook Form** with Zod validation schemas for type-safe form handling
- **Framer Motion** for smooth animations and micro-interactions

### Backend Stack (Node.js + Express + TypeScript):
- **Node.js** with Express.js framework for RESTful API architecture
- **TypeScript** with ES modules for full-stack type safety and modern syntax
- **Drizzle ORM** with PostgreSQL dialect for type-safe database operations
- **Custom JWT Authentication** with HTTP-only cookies and refresh token rotation
- **PostgreSQL Session Storage** with connect-pg-simple for server-side sessions
- **OpenAI GPT-4o API** for AI-powered content generation and feedback
- **bcryptjs** for secure password hashing with configurable salt rounds

### Database & External Services:
- **Neon Database** (serverless PostgreSQL) with connection pooling
- **OpenAI GPT-4o** for milestone generation, assessment creation, and personalized feedback
- **QR Code Generation** (qrcode library) for public portfolio sharing
- **Express Session Management** with PostgreSQL-backed session storage

---

## 1. Code Style & Formatting

### Language Standards
- **TypeScript**: Target ES2020+, strict mode enabled in `tsconfig.json`
- **React**: Functional components with hooks, TypeScript `FC` types preferred
- **Backend**: Express.js with TypeScript, async/await patterns

### File Organization
- **Frontend**: One React component per file in `client/src/`
- **Backend**: Express routes in `server/routes.ts`, services in separate files
- **Shared**: Database schema and types in `shared/schema.ts`
- **Components**: Feature-based organization under `client/src/components/`

### Current Project Structure:
```
├── client/src/
│   ├── components/         # Reusable UI components
│   ├── pages/             # Page-level components
│   ├── hooks/             # Custom React hooks
│   └── lib/               # Utilities and configurations
├── server/                # Express.js backend
├── shared/                # Shared types and schemas
└── documentation/         # Project documentation
```

---

## 2. Database & Schema Management

### Current Implementation:
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema**: Centralized in `shared/schema.ts` with Zod validation
- **Migrations**: Use `npm run db:push` for schema deployment
- **Types**: Auto-generated types with `createInsertSchema` and `$inferSelect`

### Best Practices:
- **Never edit the schema directly in production**
- **Always use the storage interface for database operations**
- **Maintain referential integrity with proper foreign keys**
- **Use `serial` for auto-incrementing primary keys**
- **Array columns**: Use `.array()` method, not wrapper function

### Current Schema Structure (16 Core Tables):
- **XQ Competency Framework**: learner_outcomes (5) → competencies (28) → component_skills (80)
- **School Organization**: schools table with user association and data isolation
- **Authentication**: users, auth_tokens with JWT refresh token management
- **Project Management**: projects, milestones, project_assignments with AI milestone generation
- **Team Collaboration**: project_teams, project_team_members with dynamic membership
- **Assessment System**: assessments with 5-letter share codes and component skill tracking
- **Grading**: submissions, grades with XQ rubric levels and AI feedback integration
- **Credential System**: credentials (3-tier: stickers, badges, plaques)
- **Digital Portfolio**: portfolio_artifacts with QR code generation capabilities

---

## 3. Authentication & Security

### Current Implementation:
- **JWT Tokens**: Access tokens with refresh token rotation
- **Storage**: HTTP-only cookies for security
- **Session Management**: PostgreSQL-based with connect-pg-simple
- **Password Security**: bcryptjs with salt rounds

### Security Rules:
- **Never store JWT secrets in client-side code**
- **Use middleware for route protection** (`requireAuth`, `requireRole`)
- **Validate all inputs** with Zod schemas before database operations
- **Maintain school-based data isolation**
- **Hash passwords** before storing in database

### Middleware Usage:
```typescript
// Protect routes requiring authentication
app.get('/api/protected', requireAuth, handler);

// Protect routes requiring specific roles
app.post('/api/admin', requireAuth, requireRole(['admin']), handler);
```

---

## 4. AI Integration Guidelines

### Current Implementation:
- **Service**: OpenAI GPT-4o API (latest model released May 2024) for intelligent content generation
- **Features**: AI milestone generation, assessment question creation, personalized feedback, credential suggestions
- **Prompt Management**: Structured prompts with JSON response formatting and validation
- **Error Handling**: Comprehensive retry logic and graceful fallbacks for API failures
- **Date Constraints**: Intelligent date validation for milestone scheduling within project timelines

### AI Development Rules:
- **Always use GPT-4o** (newest model, not GPT-4)
- **Validate AI responses** with JSON schemas
- **Handle API failures** gracefully with user feedback
- **Include date constraints** for milestone generation
- **Sanitize AI outputs** before storing in database

### Example AI Integration:
```typescript
// Always specify the newest model
const response = await openai.chat.completions.create({
  model: "gpt-4o", // newest OpenAI model released May 13, 2024
  messages: [...],
  response_format: { type: "json_object" }
});
```

---

## 5. Frontend Development Guidelines

### Component Development:
- **Use shadcn/ui components** wherever possible
- **Implement proper loading states** for all async operations
- **Handle error states** with user-friendly messages
- **Use React Query** for all server state management
- **Implement proper form validation** with React Hook Form + Zod

### Current UI Patterns:
- **Modals**: Use Dialog components for forms and confirmations
- **Navigation**: Wouter with role-based route protection
- **Styling**: Tailwind CSS with consistent Apple-inspired design
- **Icons**: Lucide React for consistent iconography

### State Management Rules:
- **Server State**: Use React Query with proper cache invalidation
- **Form State**: React Hook Form with Zod validation
- **Local State**: useState for component-level state
- **Global State**: Avoid Redux, use React Query for server state

---

## 6. API Design & Backend Development

### Current API Structure (50+ Endpoints):
- **RESTful Endpoints**: Standard HTTP methods with consistent URL patterns
- **Authentication**: JWT middleware with role-based access control (Admin/Teacher/Student)
- **Validation**: Zod schemas for all request/response validation with type safety
- **Error Handling**: Consistent error response format with proper HTTP status codes
- **School-based Routes**: Multi-school support with data isolation and security boundaries
- **Assessment Sharing**: 5-letter code system for easy student access to assessments
- **Team Management**: Comprehensive team creation and member management endpoints

### API Development Rules:
- **Use the storage interface** for all database operations
- **Validate request bodies** with Zod schemas before processing
- **Return proper HTTP status codes** (200, 201, 400, 401, 403, 404, 500)
- **Log errors** but don't expose sensitive information to clients
- **Implement role-based authorization** for sensitive operations

### Example API Pattern:
```typescript
app.post('/api/resource', requireAuth, async (req, res) => {
  try {
    const data = insertSchema.parse(req.body);
    const result = await storage.createResource(data);
    res.status(201).json(result);
  } catch (error) {
    console.error("Error creating resource:", error);
    res.status(500).json({ message: "Failed to create resource" });
  }
});
```

---

## 7. Testing Guidelines

### Current Testing Approach:
- **Manual Testing**: Comprehensive user flow testing
- **Type Safety**: TypeScript compilation catches many errors
- **Validation**: Zod schemas prevent runtime errors
- **Error Handling**: Graceful error handling throughout application

### Testing Priorities:
1. **Authentication Flow**: Login, registration, role-based access
2. **Project Management**: Creation, milestone generation, team assignment
3. **Assessment System**: Creation, taking, grading workflows
4. **AI Integration**: Milestone and assessment generation
5. **Portfolio Features**: QR code generation and public access

---

## 8. Deployment & Environment

### Current Environment:
- **Development**: Local environment with Vite dev server and tsx for backend
- **Database**: Neon Database (serverless PostgreSQL)
- **Build**: Vite production build with static file serving
- **Environment Variables**: Managed through standard environment configuration

### Environment Configuration:
```
DATABASE_URL=         # Neon Database connection string
OPENAI_API_KEY=      # OpenAI GPT-4o API key
JWT_SECRET=          # Token signing secret
SESSION_SECRET=      # Session encryption key
```

### Deployment Rules:
- **Never commit secrets** to version control
- **Use environment variables** for all configuration
- **Test database connections** before starting server
- **Serve static files** through Express in production

---

## 9. Performance Guidelines

### Current Optimizations:
- **Database**: Proper indexing and connection pooling
- **Frontend**: Vite build optimization and code splitting
- **Caching**: React Query caching for improved UX
- **AI Calls**: Optimized prompts for faster responses

### Performance Targets:
- **API Responses**: < 300ms for most endpoints
- **AI Generation**: < 3 seconds for OpenAI calls
- **Page Loads**: < 2 seconds initial load time
- **Database Queries**: Optimized with proper indexes

---

## 10. XQ Competency Framework Guidelines

### Implementation Rules:
- **3-Level Hierarchy**: Always maintain Learner Outcomes → Competencies → Component Skills
- **Rubric Consistency**: Use 4-level rubric (Emerging, Developing, Proficient, Applying)
- **Skill Tracking**: Associate assessments with specific component skills
- **Progress Monitoring**: Track student development across all skill levels

### Current Framework Implementation:
- **5 Learner Outcomes**: Creative Knowledge Building, Critical Thinking, Citizenship & Service, Communication, Collaboration
- **28 Competencies**: Specific skill areas within outcomes with proper categorization
- **80 Component Skills**: Granular skills with detailed 4-level rubrics (Emerging → Developing → Proficient → Applying)
- **Assessment Integration**: Direct mapping of assessments to component skills for targeted evaluation
- **Progress Tracking**: Comprehensive skill development monitoring with visual progress indicators
- **Credential Mapping**: 3-tier credential system aligned to competency hierarchy

---

## 11. Error Handling & Logging

### Current Approach:
- **Backend Errors**: console.error for server-side issues
- **Frontend Errors**: User-friendly error messages with toast notifications
- **Validation Errors**: Zod validation with field-specific error messages
- **AI Errors**: Graceful fallbacks when AI services are unavailable

### Logging Rules:
- **Log all errors** with sufficient context for debugging
- **Don't log sensitive information** (passwords, tokens)
- **Use structured logging** for easier parsing
- **Include request context** for API errors

---

## 12. Maintenance & Updates

### Current Maintenance Tasks:
- **Dependency Updates**: Regular npm audit and updates
- **Documentation**: Keep docs synchronized with implementation
- **Schema Changes**: Use proper migration procedures
- **Performance Monitoring**: Monitor AI response times and database performance

### Update Procedures:
1. **Test changes** in development environment
2. **Update documentation** to reflect changes
3. **Check compatibility** with existing data
4. **Deploy incrementally** with rollback capability

---

## 13. Code Quality Standards

### Current Quality Measures:
- **TypeScript Strict Mode**: Enabled for type safety
- **Zod Validation**: Runtime type checking for all inputs
- **Consistent Naming**: PascalCase for components, camelCase for functions
- **Error Boundaries**: Graceful error handling in React components

### Quality Rules:
- **Write self-documenting code** with clear variable names
- **Use TypeScript interfaces** for all data structures
- **Implement proper error handling** at all levels
- **Follow established patterns** for consistency
- **Remove unused code** regularly to maintain cleanliness

---

## 14. Collaboration Guidelines

### Current Workflow:
- **Documentation First**: Update docs before making changes
- **Incremental Changes**: Make small, focused changes
- **Test Thoroughly**: Verify all functionality after changes
- **Communicate Changes**: Update team on significant modifications

### Collaboration Rules:
- **Follow established patterns** when adding new features
- **Maintain backward compatibility** when possible
- **Document breaking changes** clearly
- **Test integration points** between components

---

## 15. Current Feature Implementation Status

### Fully Implemented Features ✅:
- **Authentication & User Management**: JWT-based with school organization
- **Project Management**: Full lifecycle with AI milestone generation
- **Assessment System**: Creation, 5-letter code sharing, completion workflows
- **Grading & Feedback**: XQ rubric-based with AI-generated personalized feedback
- **Digital Portfolio**: Automated artifact collection with QR code public sharing
- **Team Management**: Advanced collaboration with member management interface
- **Analytics Dashboard**: Comprehensive progress tracking and school-wide metrics
- **Credential System**: 3-tier recognition with AI-powered suggestions
- **Multi-School Support**: Complete data isolation with cross-school analytics

### Advanced Features ✅:
- **Assessment Code Sharing**: 5-letter codes (Nearpod-style) for easy student access
- **AI Integration Suite**: OpenAI GPT-4o for content generation across all modules
- **Component Skills Tracking**: Detailed progress monitoring across 80 XQ skills
- **Public Portfolio Sharing**: QR code generation with external accessibility
- **Team Collaboration**: Dynamic team creation with automatic milestone distribution

### Production Readiness ✅:
- **Type Safety**: End-to-end TypeScript implementation with comprehensive error handling
- **Security**: JWT authentication, role-based access, school data isolation, password hashing
- **Performance**: Optimized database queries, React Query caching, Vite build optimization
- **Scalability**: Multi-school architecture with proper data boundaries and connection pooling
- **Maintainability**: Clean code structure with modular design and comprehensive documentation

## 16. Development Workflow & Best Practices

### Current Workflow:
1. **Documentation First**: Always update relevant documentation before making changes
2. **Type-Safe Development**: Leverage TypeScript strict mode throughout the stack
3. **Component-Based Architecture**: Build reusable components with consistent patterns
4. **API-First Design**: Design APIs with proper validation and error handling
5. **Test User Flows**: Validate complete user workflows after implementation changes

### Quality Assurance:
- **Code Review**: Follow established patterns and maintain consistency
- **Error Handling**: Implement graceful error handling at all application levels
- **Performance Monitoring**: Track AI response times and database query performance
- **Security Validation**: Regularly audit authentication and authorization mechanisms
- **Documentation Sync**: Keep all documentation synchronized with implementation changes

### Future Development Considerations:
- **Feature Extensibility**: Modular architecture supports easy feature additions
- **AI Enhancement**: Additional OpenAI capabilities can be integrated seamlessly
- **Horizontal Scaling**: Stateless backend design supports multi-instance deployment
- **Educational Standards**: Framework designed to accommodate additional competency standards

---

_This document reflects the current implementation of MasteryMap and should be updated as the system evolves._
