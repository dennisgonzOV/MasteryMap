# MasteryMap - Project-Based Learning Management System

## Overview
MasteryMap is an AI-powered Project-Based Learning (PBL) management system for educational institutions. It streamlines project creation, milestone tracking, competency-based assessments, and digital portfolio management for teachers and students. The project aims to enhance modern education by leveraging AI for personalized learning paths and efficient administrative workflows.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React with TypeScript
- **UI**: Radix UI, shadcn/ui components, Apple-inspired Tailwind CSS design
- **State Management**: React Query
- **Routing**: Wouter
- **Build Tool**: Vite

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Custom JWT-based system with bcryptjs for password hashing and PostgreSQL-based sessions
- **AI Integration**: OpenAI GPT-4 for content generation and feedback

### Database Strategy
- **ORM**: Drizzle ORM (PostgreSQL dialect)
- **Connection**: Neon Database serverless
- **Schema**: Centralized with Drizzle Kit for migrations. Modularity efforts focus on splitting large schema files by domain for better maintainability.

### Core Features
- **Authentication**: Role-based access (Admin, Teacher, Student) with secure JWT and session management.
- **AI Integration**: Powers automated milestone generation, assessment creation, personalized feedback, and credential recommendations.
- **Project Management**: Teacher-initiated project creation with competency mapping, AI-generated/manual milestones, student assignment, and real-time progress tracking.
- **Assessment Module**: Dynamic AI-powered question generation, XQ competency-based rubric integration, teacher-friendly grading, and automated/manual feedback.
- **Credential System**: Hierarchy of Stickers (Outcomes) → Badges (Competencies) → Plaques (Subjects) with AI-suggested awarding and teacher approval.
- **Digital Portfolio**: Automatic collection of milestone deliverables, curation tools, and public sharing via QR codes.
- **Team Management**: Functionality for creating and managing student project teams, including student assignment and team member removal.
- **Assessment Code Sharing**: 5-letter share code system for students to access assessments, replacing URL-based sharing for improved security.

### Design Decisions
- **Modularity**: Focus on domain-driven structure, service layer pattern, and modular schema definition to improve code organization and facilitate updates.
- **UI/UX**: Clean, intuitive interface inspired by Apple's design principles, prioritizing ease of use for educators and students.

## External Dependencies

### Core
- **Database**: Neon Database (PostgreSQL)
- **Authentication**: Replit Auth service (used for initial setup, replaced by custom JWT system)
- **AI Service**: OpenAI GPT-4 API
- **UI Components**: Radix UI

### Runtime
- **Session Storage**: PostgreSQL with connect-pg-simple
- **Form Handling**: React Hook Form with Zod validation
- **Date Management**: date-fns
- **Icons**: Lucide React