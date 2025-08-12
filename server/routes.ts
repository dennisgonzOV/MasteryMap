import express from "express";
import type { Express } from "express";
import { createServer, type Server } from "http";
import { eq, inArray, desc, and, ne, isNull, asc } from "drizzle-orm";
import {
  insertProjectSchema,
  insertMilestoneSchema,
  insertAssessmentSchema,
  insertSubmissionSchema,
  assessments,
  submissions as submissionsTable,
  grades as gradesTable,
  credentials,
  componentSkills,
  projects,
  milestones,
  users,
  ProjectAssignment,
  type Submission,
  type Assessment,
  type User,
  type Credential,
  type ComponentSkill,
  type Grade,
  type SelfEvaluation,
  type InsertSelfEvaluation,
} from "../shared/schema";
import { storage } from "./storage";
import { db } from "./db";
import { validateIntParam, sanitizeForPrompt, createErrorResponse, csrfProtection, aiLimiter } from "./middleware/security";
import {
  handleRouteError,
  handleEntityNotFound,
  handleAuthorizationError,
  createSuccessResponse,
  wrapRoute
} from "./utils/routeHelpers";
import { validateIdParam } from "./middleware/routeValidation";
import { checkProjectAccess } from "./middleware/resourceAccess";
import { authRouter, requireAuth, requireRole, type AuthenticatedRequest } from "./domains/auth";
import { generateAssessment, generateMilestones, generateMilestonesFromComponentSkills, generateProjectIdeas } from "./openai";

// Define AuthRequest type if it's not globally available
type AuthRequest = AuthenticatedRequest;

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup auth routes
  app.use('/api/auth', authRouter);
  
  // Setup projects domain routes
  const { projectsRouter, milestonesRouter, projectTeamsRouter, projectTeamMembersRouter } = await import('./domains/projects');
  app.use('/api/projects', projectsRouter);
  app.use('/api/milestones', milestonesRouter);
  app.use('/api/project-teams', projectTeamsRouter);
  app.use('/api/project-team-members', projectTeamMembersRouter);

  // Assessment routes
  app.get('/api/assessments/standalone', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const assessments = await storage.getStandaloneAssessments();
      res.json(assessments);
    } catch (error) {
      console.error("Error fetching standalone assessments:", error);
      res.status(500).json({ message: "Failed to fetch standalone assessments" });
    }
  });

  // Get all assessments (both milestone-linked and standalone)
  app.get("/api/assessments", requireAuth, async (req, res) => {
    try {
      const assessments = await storage.getAllAssessments();
      res.json(assessments);
    } catch (error: any) {
      console.error("Error fetching all assessments:", error);
      res.status(500).json({ message: "Failed to fetch assessments" });
    }
  });

  // Get individual assessment by ID
  app.get('/api/assessments/:id', requireAuth, validateIntParam('id'), async (req: AuthenticatedRequest, res) => {
    try {
      const assessmentId = parseInt(req.params.id);
      const assessment = await storage.getAssessment(assessmentId);

      if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
      }

      res.json(assessment);
    } catch (error) {
      console.error("Error fetching assessment:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      res.status(500).json({ 
        message: "Failed to fetch assessment", 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });

  // Get assessment by share code
  app.get('/api/assessments/share/:shareCode', async (req, res) => {
    try {
      const { shareCode } = req.params;
      const assessment = await storage.getAssessmentByShareCode(shareCode);

      if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
      }

      res.json(assessment);
    } catch (error) {
      console.error("Error fetching assessment by share code:", error);
      res.status(500).json({ message: "Failed to fetch assessment" });
    }
  });

  // Create standalone assessment
  app.post('/api/assessments', requireAuth, requireRole(['teacher', 'admin']), csrfProtection, wrapRoute(async (req: AuthenticatedRequest, res) => {
    const assessmentData = insertAssessmentSchema.parse(req.body);
    const assessment = await storage.createAssessment(assessmentData);
    createSuccessResponse(res, assessment);
  }));

  // Update assessment
  app.put('/api/assessments/:id', requireAuth, requireRole(['teacher', 'admin']), validateIdParam(), csrfProtection, wrapRoute(async (req: AuthenticatedRequest, res) => {
    const assessmentId = parseInt(req.params.id);
    const updatedAssessment = await storage.updateAssessment(assessmentId, req.body);
    createSuccessResponse(res, updatedAssessment);
  }));

  // Delete assessment
  app.delete('/api/assessments/:id', requireAuth, requireRole(['teacher', 'admin']), validateIdParam(), csrfProtection, wrapRoute(async (req: AuthenticatedRequest, res) => {
    const assessmentId = parseInt(req.params.id);
    await storage.deleteAssessment(assessmentId);
    createSuccessResponse(res, { message: "Assessment deleted successfully" });
  }));

  // Generate new share code for assessment
  app.post('/api/assessments/:id/regenerate-share-code', requireAuth, requireRole(['teacher', 'admin']), validateIntParam('id'), csrfProtection, async (req: AuthenticatedRequest, res) => {
    try {
      const assessmentId = parseInt(req.params.id);
      const newShareCode = await storage.regenerateShareCode(assessmentId);
      res.json({ shareCode: newShareCode });
    } catch (error) {
      console.error("Error regenerating share code:", error);
      res.status(500).json({ message: "Failed to regenerate share code" });
    }
  });

  // Get submissions for an assessment
  app.get('/api/assessments/:id/submissions', requireAuth, validateIntParam('id'), async (req: AuthenticatedRequest, res) => {
    try {
      const assessmentId = parseInt(req.params.id);
      const submissions = await storage.getSubmissionsByAssessment(assessmentId);

      // Enrich submissions with grades for display
      const enrichedSubmissions = await Promise.all(
        submissions.map(async (submission) => {
          const grades = await storage.getGradesBySubmission(submission.id);
          
          console.log(`Submission ${submission.id} has ${grades.length} grades:`, grades);

          return {
            ...submission,
            grades,
            isGraded: grades.length > 0,
          };
        })
      );

      res.json(enrichedSubmissions);
    } catch (error) {
      console.error("Error fetching assessment submissions:", error);
      res.status(500).json({ message: "Failed to fetch submissions" });
    }
  });

  // Create submission
  app.post('/api/submissions', requireAuth, csrfProtection, wrapRoute(async (req: AuthenticatedRequest, res) => {
    const submissionData = insertSubmissionSchema.parse(req.body);
    const submission = await storage.createSubmission(submissionData);
    createSuccessResponse(res, submission);
  }));

  // Update submission
  app.put('/api/submissions/:id', requireAuth, validateIdParam(), csrfProtection, wrapRoute(async (req: AuthenticatedRequest, res) => {
    const submissionId = parseInt(req.params.id);
    const updatedSubmission = await storage.updateSubmission(submissionId, req.body);
    createSuccessResponse(res, updatedSubmission);
  }));

  // Get student submissions for an assessment with credentials and status
  app.get('/api/students/:studentId/assessments/:assessmentId/submissions', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      const assessmentId = parseInt(req.params.assessmentId);

      if (isNaN(studentId) || isNaN(assessmentId)) {
        return res.status(400).json({ error: "Invalid student ID or assessment ID" });
      }

      // Get submissions for this student and assessment
      const allSubmissions = await storage.getSubmissionsByAssessment(assessmentId);
      const studentSubmissions = allSubmissions.filter(sub => sub.studentId === studentId);

      // Add earned credentials and status for each submission
      const submissionsWithCredentials = await Promise.all(
        studentSubmissions.map(async (submission) => {
          // Get earned credentials for this submission
          const allCredentials = await db
            .select()
            .from(credentials)
            .where(eq(credentials.submissionId, submission.id));

          const earnedCredentials = allCredentials.map(cred => ({
            id: cred.id,
            type: cred.type,
            componentSkillId: cred.componentSkillId,
            rubricLevel: cred.rubricLevel,
            earnedAt: cred.earnedAt,
          }));

          // Get grades for this submission
          const grades = await db
            .select()
            .from(gradesTable)
            .where(eq(gradesTable.submissionId, submission.id));

          // Determine if submission is graded (has grades)
          const isGraded = grades.length > 0;

          return {
            ...submission,
            earnedCredentials,
            status: isGraded ? 'graded' : (submission.submittedAt ? 'submitted' : 'draft'),
            questionGrades: grades.reduce((acc: any, grade) => {
              if (grade.componentSkillId !== null) {
                acc[grade.componentSkillId] = {
                  score: grade.score ? parseFloat(grade.score) : 0,
                  rubricLevel: grade.rubricLevel,
                  feedback: grade.feedback
                };
              }
              return acc;
            }, {}),
          };
        })
      );

      res.json(submissionsWithCredentials);
    } catch (error) {
      console.error("Error fetching student assessment submissions:", error);
      res.status(500).json({ error: "Failed to fetch assessment submissions" });
    }
  });

  // Create grade
  app.post('/api/grades', requireAuth, requireRole(['teacher', 'admin']), csrfProtection, wrapRoute(async (req: AuthenticatedRequest, res) => {
    const grade = await storage.createGrade(req.body);
    createSuccessResponse(res, grade);
  }));

  // Create credential
  app.post('/api/credentials', requireAuth, requireRole(['teacher', 'admin']), csrfProtection, wrapRoute(async (req: AuthenticatedRequest, res) => {
    const credential = await storage.createCredential(req.body);
    createSuccessResponse(res, credential);
  }));

  // Get credentials for a student
  app.get('/api/students/:id/credentials', requireAuth, validateIdParam(), wrapRoute(async (req: AuthenticatedRequest, res) => {
    const studentId = parseInt(req.params.id);
    const credentials = await storage.getCredentialsByStudent(studentId);
    createSuccessResponse(res, credentials);
  }));

  // Get student competency progress
  app.get('/api/students/:id/competency-progress', requireAuth, validateIdParam(), wrapRoute(async (req: AuthenticatedRequest, res) => {
    const studentId = parseInt(req.params.id);
    const progress = await storage.getStudentCompetencyProgress(studentId);
    createSuccessResponse(res, progress);
  }));

  // Get portfolio artifacts for a student
  app.get('/api/students/:id/portfolio', requireAuth, validateIdParam(), wrapRoute(async (req: AuthenticatedRequest, res) => {
    const studentId = parseInt(req.params.id);
    const artifacts = await storage.getPortfolioArtifactsByStudent(studentId);
    createSuccessResponse(res, artifacts);
  }));

  // Create portfolio artifact
  app.post('/api/portfolio-artifacts', requireAuth, csrfProtection, wrapRoute(async (req: AuthenticatedRequest, res) => {
    const artifact = await storage.createPortfolioArtifact(req.body);
    createSuccessResponse(res, artifact);
  }));

  // Update portfolio artifact
  app.put('/api/portfolio-artifacts/:id', requireAuth, validateIdParam(), csrfProtection, wrapRoute(async (req: AuthenticatedRequest, res) => {
    const artifactId = parseInt(req.params.id);
    const updatedArtifact = await storage.updatePortfolioArtifact(artifactId, req.body);
    createSuccessResponse(res, updatedArtifact);
  }));

  // Get users (for school administration)
  app.get('/api/users', requireAuth, requireRole(['admin']), wrapRoute(async (req: AuthenticatedRequest, res) => {
    const users = await storage.getUsers();
    createSuccessResponse(res, users);
  }));

  // Get user by ID
  app.get('/api/users/:id', requireAuth, validateIdParam(), wrapRoute(async (req: AuthenticatedRequest, res) => {
    const userId = parseInt(req.params.id);
    const user = await storage.getUser(userId);
    if (!user) {
      return handleEntityNotFound(res, "User not found");
    }
    createSuccessResponse(res, user);
  }));

  // Update user
  app.put('/api/users/:id', requireAuth, requireRole(['admin']), validateIdParam(), csrfProtection, wrapRoute(async (req: AuthenticatedRequest, res) => {
    const userId = parseInt(req.params.id);
    const updatedUser = await storage.updateUser(userId, req.body);
    createSuccessResponse(res, updatedUser);
  }));

  // Delete user
  app.delete('/api/users/:id', requireAuth, requireRole(['admin']), validateIdParam(), csrfProtection, wrapRoute(async (req: AuthenticatedRequest, res) => {
    const userId = parseInt(req.params.id);
    await storage.deleteUser(userId);
    createSuccessResponse(res, { message: "User deleted successfully" });
  }));

  // Get learner outcomes with competencies and component skills
  app.get('/api/learner-outcomes', requireAuth, wrapRoute(async (req: AuthenticatedRequest, res) => {
    const outcomes = await storage.getLearnerOutcomesWithCompetencies();
    createSuccessResponse(res, outcomes);
  }));

  // Get competencies
  app.get('/api/competencies', requireAuth, wrapRoute(async (req: AuthenticatedRequest, res) => {
    const competencies = await storage.getCompetencies();
    createSuccessResponse(res, competencies);
  }));

  // Get component skills with full details (enriched with competency and learner outcome info)
  app.get('/api/component-skills/detailed', requireAuth, wrapRoute(async (req: AuthenticatedRequest, res) => {
    const skills = await storage.getComponentSkillsWithDetails();
    createSuccessResponse(res, skills);
  }));

  // Get students by school
  app.get('/api/schools/:schoolId/students', requireAuth, requireRole(['teacher', 'admin']), validateIdParam('schoolId'), wrapRoute(async (req: AuthenticatedRequest, res) => {
    const schoolId = parseInt(req.params.schoolId);
    const students = await storage.getStudentsBySchool(schoolId);
    createSuccessResponse(res, students);
  }));

  // Self-evaluation routes
  app.post('/api/self-evaluations', requireAuth, csrfProtection, wrapRoute(async (req: AuthenticatedRequest, res) => {
    const selfEvaluation = await storage.createSelfEvaluation(req.body);
    createSuccessResponse(res, selfEvaluation);
  }));

  app.get('/api/self-evaluations/:id', requireAuth, validateIdParam(), wrapRoute(async (req: AuthenticatedRequest, res) => {
    const selfEvaluationId = parseInt(req.params.id);
    const selfEvaluation = await storage.getSelfEvaluation(selfEvaluationId);
    if (!selfEvaluation) {
      return handleEntityNotFound(res, "Self-evaluation not found");
    }
    createSuccessResponse(res, selfEvaluation);
  }));

  app.get('/api/assessments/:assessmentId/self-evaluations', requireAuth, validateIdParam('assessmentId'), wrapRoute(async (req: AuthenticatedRequest, res) => {
    const assessmentId = parseInt(req.params.assessmentId);
    const selfEvaluations = await storage.getSelfEvaluationsByAssessment(assessmentId);
    createSuccessResponse(res, selfEvaluations);
  }));

  app.get('/api/students/:studentId/self-evaluations', requireAuth, validateIdParam('studentId'), wrapRoute(async (req: AuthenticatedRequest, res) => {
    const studentId = parseInt(req.params.studentId);
    const selfEvaluations = await storage.getSelfEvaluationsByStudent(studentId);
    createSuccessResponse(res, selfEvaluations);
  }));

  app.put('/api/self-evaluations/:id', requireAuth, validateIdParam(), csrfProtection, wrapRoute(async (req: AuthenticatedRequest, res) => {
    const selfEvaluationId = parseInt(req.params.id);
    const updatedSelfEvaluation = await storage.updateSelfEvaluation(selfEvaluationId, req.body);
    createSuccessResponse(res, updatedSelfEvaluation);
  }));

  const httpServer = createServer(app);
  return httpServer;
}