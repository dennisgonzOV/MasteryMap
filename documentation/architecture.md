# architecture.md

```mermaid
flowchart TD

%% Frontend Components
subgraph React Frontend
  direction TB
  UserUI[User Interface] -->|HTTP Request| AuthService[Auth Service (NextAuth/Auth0)]
  UserUI -->|HTTP Request| Dashboard[Teacher/Student Dashboard]
  UserUI -->|HTTP Request| SubmissionUI[Essay Submission Interface]
  UserUI -->|HTTP Request| GradingUI[Essay Grading Interface]
  UserUI -->|HTTP Request| FeedbackUI[Feedback & Scores UI]
end

%% Backend Components
subgraph NestJS Backend
  direction TB
  AuthService -->|API Call| NestAuth[Passport.js / JWT Auth]
  Dashboard -->|API Call| NestAPI[REST / GraphQL API]
  SubmissionUI -->|API Call| NestAPI
  GradingUI -->|API Call| NestAPI
  FeedbackUI -->|API Call| NestAPI

  NestAPI -->|Operational Logic| NestServices[NestJS Services & Controllers]
  NestServices -->|Data Operations| TypeORM[TypeORM Entities]
  NestAPI -->|Triggers| AIService[AI Grading Service]
  TypeORM --> PostgreSQL[(PostgreSQL)]
  NestAPI --> Redis[(Redis Cache)]
end

%% AI Integration
subgraph AI Integration
  AIService -->|API Call| OpenAI[OpenAI GPT-4 API]
end

%% Storage
subgraph Storage
  NestAPI --> S3[AWS S3 for Essay & Artifact Storage]
end

%% Authentication Flow
NestAuth --> PostgreSQL
NestAuth --> Redis

%% Data flow
SubmissionUI --> NestAPI --> S3
GradingUI --> NestAPI --> AIService --> OpenAI
AIService -->|Grades & Feedback| NestAPI
NestAPI --> PostgreSQL
FeedbackUI --> NestAPI --> PostgreSQL

%% External Services
classDef external fill:#f96,stroke:#333,stroke-width:2px
class OpenAI,S3 external

%% Style
classDef frontend fill:#bbdefb,stroke:#333
classDef backend fill:#c8e6c9,stroke:#333
classDef database fill:#ffecb3,stroke:#333
class UserUI,AuthService,Dashboard,SubmissionUI,GradingUI,FeedbackUI frontend
class NestAPI,NestServices,NestAuth,AIService backend
class PostgreSQL,Redis database

```

## Explanation

**Frontend (React + Next.js):**
- Manages user interfaces for authentication, project dashboards, essay submission, grading, and feedback display.
- Communicates with the NestJS backend via REST or GraphQL API calls.

**Backend (Node.js + NestJS):**
- **NestAuth:** Handles authentication and authorization using Passport.js strategies or JWT. Sessions may be cached in Redis.
- **NestAPI:** Exposes REST/GraphQL endpoints via controllers. Business logic organized in services.
- **TypeORM Entities:** Map to PostgreSQL tables for users, essays, assessments, grades, credentials, and artifacts.
- **AIService Module:** Encapsulates interactions with the OpenAI GPT-4 API for generating essay grades and feedback.
- **Redis Cache:** Stores session data, API rate limits, and frequently accessed metadata.

**AI Integration:**
- AIService calls the OpenAI GPT-4 API to evaluate essays and generate feedback, then returns structured responses to NestAPI.

**Storage:**
- **AWS S3:** Used for storing submitted essays and portfolio artifacts. Secure, scalable asset delivery.

**Database & Cache:**
- **PostgreSQL:** Primary relational data store for all application entities.
- **Redis:** High-speed cache for session management and hot data.

This architecture ensures a modular, scalable, and maintainable system, leveraging modern Node.js best practices and seamless AI integration.
