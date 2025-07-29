// New Modular Routes Setup - Domain-Driven Architecture
import type { Express } from "express";
import { createServer, type Server } from "http";

// Import domain routers
import { authRouter } from './domains/auth';
import { projectsRouter } from './domains/projects';
import { assessmentsRouter } from './domains/assessments';
import { portfolioRouter } from './domains/portfolio';
import { credentialsRouter } from './domains/credentials';

// Import remaining legacy routes temporarily (will be modularized next)
import { setupAuthRoutes } from "./authRoutes";
import { requireAuth, requireRole, type AuthenticatedRequest } from "./auth";
import { storage } from "./storage";

// Import schemas and AI services for remaining routes
import { 
  insertAssessmentSchema, 
  insertSubmissionSchema,
  insertCredentialSchema,
  insertPortfolioArtifactSchema,
  insertSelfEvaluationSchema,
  type User
} from "@shared/schema";
import { generateAssessment, generateFeedback, generateFeedbackForQuestion, generateAssessmentFromComponentSkills, generateQuestionGrade, generateComponentSkillGrades } from "./openai";
import { generateSelfEvaluationFeedback, generateAssessmentQuestions, generateTutorResponse } from "./services/openai";
import { z } from "zod";
import { 
  users as usersTable, 
  assessments as assessmentsTable, 
  submissions as submissionsTable, 
  credentials as credentialsTable, 
  portfolioArtifacts as portfolioArtifactsTable,
  learnerOutcomes as learnerOutcomesTable,
  competencies as competenciesTable,
  grades as gradesTable,
  selfEvaluations as selfEvaluationsTable,
  componentSkills as componentSkillsTable,
  bestStandards as bestStandardsTable,
  notifications as notificationsTable,
  safetyIncidents as safetyIncidentsTable,
  schools as schoolsTable
} from "../shared/schema";
import { eq, and, desc, asc, isNull, inArray, ne, sql, gte, or } from "drizzle-orm";
import { db } from "./db";

export async function registerRoutes(app: Express): Promise<Server> {
  // Mount domain routers
  app.use('/api/auth', authRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api/assessments', assessmentsRouter);
  app.use('/api/portfolio', portfolioRouter);
  app.use('/api/credentials', credentialsRouter);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Schools endpoint (public)
  app.get('/api/schools', async (req, res) => {
    try {
      const schools = await db.select().from(schoolsTable);
      res.json(schools);
    } catch (error) {
      console.error("Error fetching schools:", error);
      res.status(500).json({ message: "Failed to fetch schools" });
    }
  });

  // Competencies endpoint (public)
  app.get('/api/competencies', async (req, res) => {
    try {
      const competencies = await db.select().from(competenciesTable);
      res.json(competencies);
    } catch (error) {
      console.error("Error fetching competencies:", error);
      res.status(500).json({ message: "Failed to fetch competencies" });
    }
  });

  // Learner outcomes hierarchy endpoint (public)
  app.get('/api/learner-outcomes-hierarchy/complete', async (req, res) => {
    try {
      // Get learner outcomes with competencies and component skills
      const learnerOutcomes = await db.select().from(learnerOutcomesTable);
      const competencies = await db.select().from(competenciesTable);
      const componentSkills = await db.select().from(componentSkillsTable);

      const hierarchy = learnerOutcomes.map(outcome => ({
        ...outcome,
        competencies: competencies
          .filter(comp => comp.learnerOutcomeId === outcome.id)
          .map(comp => ({
            ...comp,
            componentSkills: componentSkills.filter(skill => skill.competencyId === comp.id)
          }))
      }));

      res.json(hierarchy);
    } catch (error) {
      console.error("Error fetching learner outcomes hierarchy:", error);
      res.status(500).json({ message: "Failed to fetch learner outcomes hierarchy" });
    }
  });

  // All core domains now modularized and mounted above

  // Generic 404 handler for unknown API routes
  app.use('/api/*', (req, res) => {
    res.status(404).json({ message: `Route ${req.method} ${req.path} not found` });
  });

  const server = createServer(app);
  return server;
}