import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authRouter, requireAuth, requireRole, type AuthenticatedRequest } from "./domains/auth";
import { 
  projectsRouter, 
  milestonesRouter, 
  projectTeamsRouter, 
  projectTeamMembersRouter, 
  schoolsRouter 
} from "./domains/projects";
import { 
  assessmentsRouter, 
  submissionsRouter, 
  selfEvaluationsRouter 
} from "./domains/assessments";
import { credentialsRouter } from "./domains/credentials";
import { portfolioRouter } from "./domains/portfolio";
import { 
  validateIntParam, 
  sanitizeForPrompt, 
  createErrorResponse,
  csrfProtection,
  aiLimiter
} from "./middleware/security";
import { 
  handleRouteError, 
  handleEntityNotFound, 
  handleAuthorizationError,
  createSuccessResponse,
  wrapRoute
} from "./utils/routeHelpers";
import { validateIdParam } from "./middleware/routeValidation";
import { checkProjectAccess } from "./middleware/resourceAccess";
import { 
  insertProjectSchema, 
  insertMilestoneSchema, 
  insertAssessmentSchema, 
  insertSubmissionSchema,
  insertCredentialSchema,
  insertPortfolioArtifactSchema,
  insertSelfEvaluationSchema,
  type User
} from "@shared/schema";
import { generateMilestones, generateAssessment, generateFeedback, generateFeedbackForQuestion, generateMilestonesFromComponentSkills, generateAssessmentFromComponentSkills, generateProjectIdeas, generateQuestionGrade, generateComponentSkillGrades } from "./openai";
import { generateSelfEvaluationFeedback, generateAssessmentQuestions, generateTutorResponse } from "./services/openai";
import { z } from "zod";
import { 
  users as usersTable, 
  projects as projectsTable, 
  milestones as milestonesTable, 
  assessments as assessmentsTable, 
  submissions as submissionsTable, 
  credentials as credentialsTable, 
  portfolioArtifacts as portfolioArtifactsTable,
  learnerOutcomes as learnerOutcomesTable,
  competencies as competenciesTable,
  projectTeamMembers,
  grades as gradesTable,
  selfEvaluations as selfEvaluationsTable,
  componentSkills as componentSkillsTable,
  bestStandards as bestStandardsTable,
  projectAssignments,
  projects,
  milestones,
  assessments,
  submissions,
  portfolioArtifacts,
  credentials,
  safetyIncidents as safetyIncidentsTable,
  notifications as notificationsTable,
} from "../shared/schema";
import { eq, and, desc, asc, isNull, inArray, ne, sql, gte, or } from "drizzle-orm";
import { db } from "./db";

// Define AuthRequest type if it's not globally available
type AuthRequest = AuthenticatedRequest;

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup auth routes
  app.use('/api/auth', authRouter);

  // Setup projects domain routes
  app.use('/api/projects', projectsRouter);
  app.use('/api/milestones', milestonesRouter);
  app.use('/api/project-teams', projectTeamsRouter);
  app.use('/api/project-team-members', projectTeamMembersRouter);
  app.use('/api/schools', schoolsRouter);

  // Setup assessments domain routes
  app.use('/api/assessments', assessmentsRouter);
  app.use('/api/submissions', submissionsRouter);
  app.use('/api/self-evaluations', selfEvaluationsRouter);

  // Setup credentials domain routes
  app.use('/api/credentials', credentialsRouter);

  // Setup portfolio domain routes
  app.use('/api/portfolio', portfolioRouter);

  // Competency routes
  app.get('/api/competencies', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const competencies = await storage.getCompetencies();
      res.json(competencies);
    } catch (error) {
      console.error("Error fetching competencies:", error);
      res.status(500).json({ message: "Failed to fetch competencies" });
    }
  });

  app.get('/api/component-skills', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const componentSkills = await storage.getComponentSkills();
      res.json(componentSkills);
    } catch (error) {
      console.error("Error fetching component skills:", error);
      res.status(500).json({ message: "Failed to fetch component skills" });
    }
  });

  app.get('/api/component-skills/by-competency/:competencyId', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const competencyId = parseInt(req.params.competencyId);
      const componentSkills = await storage.getComponentSkillsByCompetency(competencyId);
      res.json(componentSkills);
    } catch (error) {
      console.error("Error fetching component skills by competency:", error);
      res.status(500).json({ message: "Failed to fetch component skills" });
    }
  });

  app.get('/api/best-standards', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const bestStandards = await storage.getBestStandards();
      res.json(bestStandards);
    } catch (error) {
      console.error("Error fetching best standards:", error);
      res.status(500).json({ message: "Failed to fetch best standards" });
    }
  });

  app.get('/api/best-standards/by-competency/:competencyId', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const competencyId = parseInt(req.params.competencyId);
      const bestStandards = await storage.getBestStandardsByCompetency(competencyId);
      res.json(bestStandards);
    } catch (error) {
      console.error("Error fetching best standards by competency:", error);
      res.status(500).json({ message: "Failed to fetch best standards" });
    }
  });

  // Notification routes
  app.get('/api/notifications', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const notifications = await storage.getNotificationsByUser(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.post('/api/notifications/:id/mark-read', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // Verify the notification belongs to the user
      const notification = await db.select()
        .from(notificationsTable)
        .where(and(
          eq(notificationsTable.id, notificationId),
          eq(notificationsTable.userId, userId)
        ))
        .limit(1);

      if (notification.length === 0) {
        return res.status(404).json({ message: "Notification not found" });
      }

      await storage.markNotificationAsRead(notificationId);
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.post('/api/notifications/mark-all-read', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      await storage.markAllNotificationsAsRead(userId);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  // Safety incident routes
  app.get('/api/safety-incidents', requireAuth, requireRole(['teacher', 'admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const safetyIncidents = await storage.getSafetyIncidents();
      res.json(safetyIncidents);
    } catch (error) {
      console.error("Error fetching safety incidents:", error);
      res.status(500).json({ message: "Failed to fetch safety incidents" });
    }
  });

  app.post('/api/safety-incidents', requireAuth, requireRole(['teacher', 'admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      
      const incidentData = {
        ...req.body,
        reportedBy: userId,
        reportedAt: new Date(),
      };

      const incident = await storage.createSafetyIncident(incidentData);
      res.json(incident);
    } catch (error) {
      console.error("Error creating safety incident:", error);
      res.status(500).json({ message: "Failed to create safety incident" });
    }
  });

  app.patch('/api/safety-incidents/:id/status', requireAuth, requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const incidentId = parseInt(req.params.id);
      const { status, resolution } = req.body;

      if (!['open', 'investigating', 'resolved', 'closed'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      await storage.updateSafetyIncidentStatus(incidentId, status, resolution);
      res.json({ message: "Safety incident status updated" });
    } catch (error) {
      console.error("Error updating safety incident status:", error);
      res.status(500).json({ message: "Failed to update safety incident status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}