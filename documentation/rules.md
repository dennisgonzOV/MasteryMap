# MasteryMap - Development Guidelines & Best Practices

Guidelines and best practices for developing and maintaining the MasteryMap Project-Based Learning Management System.

---

## 0. Current Technology Stack & Architecture

### Frontend Stack:
- **React 18** with TypeScript for type safety
- **Vite** for build tooling and development server  
- **Radix UI** with shadcn/ui components for UI primitives
- **Tailwind CSS** with Apple-inspired design system
- **TanStack React Query** for server state management
- **Wouter** for lightweight client-side routing
- **React Hook Form** with Zod validation schemas

### Backend Stack:
- **Node.js** with Express.js framework
- **TypeScript** with ES modules for full-stack type safety
- **Drizzle ORM** with PostgreSQL for database operations
- **Custom JWT Authentication** with HTTP-only cookies
- **PostgreSQL Session Storage** with connect-pg-simple
- **OpenAI GPT-4o API** for AI-powered features

### Database & External Services:
- **Neon Database** (serverless PostgreSQL)
- **OpenAI GPT-4o** for milestone, assessment, and feedback generation
- **QR Code Generation** for portfolio sharing

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

### Current Schema Structure:
- **3-Level XQ Hierarchy**: learner_outcomes → competencies → component_skills
- **School-based Organization**: schools table with user association
- **Team Management**: project_teams and project_team_members
- **Assessment System**: Standalone and milestone-linked assessments

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
- **Service**: OpenAI GPT-4o API for content generation
- **Features**: Milestone generation, assessment creation, feedback generation
- **Prompt Management**: Structured prompts with validation

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

### Current API Structure:
- **RESTful Endpoints**: Standard HTTP methods and status codes
- **Authentication**: JWT middleware on protected routes
- **Validation**: Zod schemas for request validation
- **Error Handling**: Consistent error response format

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
- **Development**: Replit with Vite dev server and tsx for backend
- **Database**: Neon Database (serverless PostgreSQL)
- **Build**: Vite production build with static file serving
- **Environment Variables**: Managed through Replit secrets

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

### Current Framework:
- **5 Learner Outcomes**: Core educational goals
- **28 Competencies**: Specific skill areas within outcomes
- **80 Component Skills**: Granular skills with detailed rubrics

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

## 15. Future Development Considerations

### Current Architecture Supports:
- **Multi-school deployment** with proper data isolation
- **Horizontal scaling** with stateless backend design
- **Feature extensibility** through modular component architecture
- **AI enhancement** with additional OpenAI capabilities

### Development Principles:
- **Favor composition over inheritance**
- **Maintain loose coupling** between components
- **Design for testability** and maintainability
- **Keep external dependencies** to a minimum

---

_This document reflects the current implementation of MasteryMap and should be updated as the system evolves._