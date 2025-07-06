# MasteryMap - AI-Powered Project-Based Learning Management System

MasteryMap is a comprehensive learning management system designed for educational institutions that emphasizes project-based learning with AI-powered assessment generation and competency tracking.

## Features

### 🎯 Project-Based Learning
- **Project Creation**: Teachers can create projects with XQ competency framework integration
- **Milestone Tracking**: AI-generated milestones with progress monitoring
- **Student Assignment**: Bulk assignment capabilities for efficient classroom management

### 🤖 AI-Powered Assessment
- **Dynamic Assessment Creation**: AI generates assessments based on selected competencies
- **Multiple Question Types**: Support for open-ended, multiple choice, and short answer questions
- **Automated Feedback**: Personalized feedback generation for student submissions

### 📊 Competency Framework
- **3-Level Hierarchy**: Learner Outcomes → Competencies → Component Skills
- **XQ Integration**: Built-in XQ competency framework with authentic rubrics
- **Progress Tracking**: Real-time competency mastery tracking

### 🏆 Digital Credentials
- **Hierarchical System**: Stickers (Outcomes) → Badges (Competencies) → Plaques (Subjects)
- **Automated Suggestions**: AI-powered credential recommendations
- **Portfolio Integration**: Automatic artifact collection and curation

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** with custom Apple-inspired design system
- **Radix UI** components with shadcn/ui
- **React Query** for server state management
- **Wouter** for lightweight routing

### Backend
- **Node.js** with Express.js
- **TypeScript** with ES modules
- **PostgreSQL** with Drizzle ORM
- **JWT Authentication** with HTTP-only cookies
- **OpenAI GPT-4** integration for AI features

### Development Tools
- **Vite** for fast development and building
- **Drizzle Kit** for database schema management
- **ESLint** and **TypeScript** for code quality

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- OpenAI API key (for AI features)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/masterymap.git
cd masterymap
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database URL and OpenAI API key
```

4. Initialize the database:
```bash
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Database Schema

The application uses a comprehensive schema supporting:
- **Users** with role-based access (Admin, Teacher, Student)
- **Projects** with competency mapping
- **Assessments** with flexible question types
- **Submissions** with automated grading
- **Credentials** with hierarchical structure
- **Portfolios** with artifact management

## API Endpoints

### Authentication
- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - User registration
- `GET /api/auth/user` - Get current user

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `POST /api/projects/:id/generate-milestones` - Generate AI milestones

### Assessments
- `GET /api/assessments/standalone` - List standalone assessments
- `POST /api/assessments` - Create assessment
- `POST /api/assessments/:id/generate` - AI assessment generation

### Competencies
- `GET /api/learner-outcomes-hierarchy/complete` - Get complete hierarchy
- `GET /api/competencies/:id/outcomes` - Get competency outcomes

## Development

### Project Structure
```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── lib/           # Utilities and API
│   │   └── hooks/         # Custom React hooks
├── server/                 # Express backend
│   ├── auth.ts            # Authentication logic
│   ├── routes.ts          # API routes
│   ├── storage.ts         # Database operations
│   └── openai.ts          # AI integration
├── shared/                 # Shared types and schemas
│   └── schema.ts          # Database schema
└── scripts/               # Utility scripts
```

### Key Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run db:push` - Push schema changes to database
- `npm run db:studio` - Open Drizzle Studio

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- XQ Institute for the competency framework
- OpenAI for AI capabilities
- Radix UI for accessible components
- Tailwind CSS for styling system