import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authRouter, requireAuth, requireRole, type AuthenticatedRequest } from "./domains/auth";
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
  const { projectsRouter, milestonesRouter, projectTeamsRouter, projectTeamMembersRouter } = await import('./domains/projects');
  app.use('/api/projects', projectsRouter);
  app.use('/api/milestones', milestonesRouter);
  app.use('/api/project-teams', projectTeamsRouter);
  app.use('/api/project-team-members', projectTeamMembersRouter);

  // Student assessment submissions
  app.get("/api/student/assessment-submissions/:studentId", requireAuth, validateIntParam('studentId'), async (req: AuthRequest, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const { role, id: userId } = req.user;

      // Only allow students to view their own submissions, or teachers/admins
      if (role === 'student' && userId !== studentId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const submissionResults = await db
        .select({
          id: submissions.id,
          assessmentId: submissions.assessmentId,
          assessmentTitle: assessments.title,
          assessmentDescription: assessments.description,
          questions: assessments.questions,
          responses: submissions.responses,
          submittedAt: submissions.submittedAt,
          feedback: submissions.feedback,
          projectTitle: projects.title,
          milestoneTitle: milestones.title,
        })
        .from(submissions)
        .innerJoin(assessments, eq(submissions.assessmentId, assessments.id))
        .leftJoin(milestones, eq(assessments.milestoneId, milestones.id))
        .leftJoin(projects, eq(milestones.projectId, projects.id))
        .where(eq(submissions.studentId, studentId))
        .orderBy(desc(submissions.submittedAt));

      // Get earned credentials for each submission
      const submissionsWithCredentials = await Promise.all(
        submissionResults.map(async (submission) => {
          // Get credentials earned for this specific assessment submission
          // First get grades for this submission to find associated component skills
          const submissionGrades = await db
            .select({
              componentSkillId: gradesTable.componentSkillId,
              gradedAt: gradesTable.gradedAt
            })
            .from(gradesTable)
            .where(eq(gradesTable.submissionId, submission.id));

          // Get credentials earned for component skills that were graded in this submission
          // and awarded around the time of grading (within 1 day)
          const earnedCredentials = [];
          if (submissionGrades.length > 0) {
            // Filter out null componentSkillIds to prevent database query failures
            const componentSkillIds = submissionGrades
              .map(g => g.componentSkillId)
              .filter((id): id is number => id !== null);
            const gradeDate = submissionGrades[0].gradedAt;

            if (gradeDate && componentSkillIds.length > 0) {
              const dayBefore = new Date(gradeDate.getTime() - 24 * 60 * 60 * 1000);
              const dayAfter = new Date(gradeDate.getTime() + 24 * 60 * 60 * 1000);

              const submissionCredentials = await db
                .select({
                  id: credentials.id,
                  title: credentials.title,
                  description: credentials.description,
                  type: credentials.type,
                  awardedAt: credentials.awardedAt,
                })
                .from(credentials)
                .where(and(
                  eq(credentials.studentId, studentId),
                  inArray(credentials.componentSkillId, componentSkillIds),
                  gte(credentials.awardedAt, dayBefore),
                  sql`${credentials.awardedAt} <= ${dayAfter}`
                ));

              earnedCredentials.push(...submissionCredentials);
            }
          }

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


