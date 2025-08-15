import { Router } from 'express';
import { assessmentService, type AssessmentService } from './assessments.service';
import { assessmentStorage } from './assessments.storage';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../auth';
import { 
  validateIntParam, 
  sanitizeForPrompt, 
  createErrorResponse,
  aiLimiter
} from '../../middleware/security';
import { 
  handleRouteError, 
  handleEntityNotFound, 
  handleAuthorizationError,
  createSuccessResponse,
  wrapRoute
} from '../../utils/routeHelpers';
import { validateIdParam } from '../../middleware/routeValidation';
import { 
  assessments as assessmentsTable, 
  submissions as submissionsTable,
  users as usersTable,
  milestones,
  projects,
  grades as gradesTable,
  credentials,
  portfolioArtifacts,
  assessments,
  submissions
} from "../../../shared/schema";
import { eq, and, desc, asc, isNull, inArray, ne, sql, gte, or } from "drizzle-orm";
import { db } from "../../db";
import { aiService } from "../ai/ai.service";

export class AssessmentController {
  constructor(private service: AssessmentService = assessmentService) {}

  // Create Express router with all assessment routes
  createRouter(): Router {
    const router = Router();

    // Student competency progress route  
    router.get("/competency-progress/student/:studentId", requireAuth, validateIntParam('studentId'), async (req: AuthenticatedRequest, res) => {
      try {
        const studentId = parseInt(req.params.studentId);
        
        if (!req.user) {
          return res.status(401).json({ message: "User not authenticated" });
        }
        
        const { role, id: userId } = req.user;

        // Only allow students to view their own progress, or teachers/admins
        if (role === 'student' && userId !== studentId) {
          return res.status(403).json({ message: "Access denied" });
        }

        const progress = await assessmentStorage.getStudentCompetencyProgress(studentId);
        res.json(progress);
      } catch (error) {
        console.error("Error fetching competency progress:", error);
        res.status(500).json({ error: "Failed to fetch competency progress" });
      }
    });

    // General student competency progress route (what the frontend is actually calling)
    router.get("/students/competency-progress", requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        if (!req.user) {
          return res.status(401).json({ message: "User not authenticated" });
        }

        const { role, id: userId } = req.user;
        const studentId = req.query.studentId ? parseInt(req.query.studentId as string) : userId;

        // Only allow students to view their own progress, or teachers/admins
        if (role === 'student' && userId !== studentId) {
          return res.status(403).json({ message: "Access denied" });
        }

        const progress = await assessmentStorage.getStudentCompetencyProgress(studentId);
        res.json(progress);
      } catch (error) {
        console.error("Error fetching competency progress:", error);
        res.status(500).json({ error: "Failed to fetch competency progress" });
      }
    });

    // Student deadlines route
    router.get("/deadlines/student", requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        if (!req.user) {
          return res.status(401).json({ message: "User not authenticated" });
        }

        // For now, return empty array until deadlines are implemented
        res.json([]);
      } catch (error) {
        console.error("Error fetching student deadlines:", error);
        res.status(500).json({ error: "Failed to fetch student deadlines" });
      }
    });

    // Student assessment submissions
    router.get("/student/assessment-submissions/:studentId", requireAuth, validateIntParam('studentId'), async (req: AuthenticatedRequest, res) => {
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

    // Get standalone assessments
    router.get('/standalone', requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        const assessments = await this.service.getStandaloneAssessments();
        res.json(assessments);
      } catch (error) {
        console.error("Error fetching standalone assessments:", error);
        res.status(500).json({ message: "Failed to fetch standalone assessments" });
      }
    });

    // Get all assessments (both milestone-linked and standalone)
    router.get("/", requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        const assessments = await this.service.getAllAssessments();
        res.json(assessments);
      } catch (error: any) {
        console.error("Error fetching all assessments:", error);
        res.status(500).json({ message: "Failed to fetch assessments" });
      }
    });

    // Get individual assessment by ID
    router.get('/:id', requireAuth, validateIntParam('id'), async (req: AuthenticatedRequest, res) => {
      try {
        const assessmentId = parseInt(req.params.id);
        const assessment = await this.service.getAssessment(assessmentId);

        if (!assessment) {
          return res.status(404).json({ message: "Assessment not found" });
        }

        res.json(assessment);
      } catch (error) {
        console.error("Error fetching assessment:", error);
        res.status(500).json({ message: "Failed to fetch assessment" });
      }
    });

    // Assessment creation route
    router.post('/', requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user!.id;

        if (req.user?.role !== 'teacher' && req.user?.role !== 'admin') {
          return res.status(403).json({ message: "Only teachers can create assessments" });
        }

        const assessment = await this.service.createAssessment(req.body);
        res.json(assessment);
      } catch (error) {
        console.error("Error creating assessment:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        res.status(500).json({ 
          message: "Failed to create assessment", 
          error: errorMessage,
          details: process.env.NODE_ENV === 'development' ? error : undefined
        });
      }
    });

    // Export assessment results
    router.get("/:id/export-results", requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        const assessmentId = parseInt(req.params.id);
        const assessment = await db.select().from(assessmentsTable).where(eq(assessmentsTable.id, assessmentId)).limit(1);

        if (!assessment.length) {
          return res.status(404).json({ message: "Assessment not found" });
        }

        // Get submissions for this assessment
        const submissionResults = await db.select({
          id: submissionsTable.id,
          studentName: sql`${usersTable.firstName} || ' ' || ${usersTable.lastName}`,
          studentEmail: usersTable.email,
          submittedAt: submissionsTable.submittedAt,
          feedback: submissionsTable.feedback
        })
        .from(submissionsTable)
        .innerJoin(usersTable, eq(submissionsTable.studentId, usersTable.id))
        .where(eq(submissionsTable.assessmentId, assessmentId));

        // Create CSV content
        const csvData = [
          ['Student Name', 'Email', 'Submitted At', 'Feedback'],
          ...submissionResults.map((sub: any) => [
            sub.studentName,
            sub.studentEmail,
            sub.submittedAt || '',
            (sub.feedback || '').replace(/,/g, ';') // Replace commas to avoid CSV issues
          ])
        ];

        const csv = csvData.map(row => row.join(',')).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${assessment[0].title}-results.csv"`);
        res.send(csv);
      } catch (error) {
        console.error('Assessment export error:', error);
        res.status(500).json({ message: "Failed to export assessment results" });
      }
    });

    // Export assessment submissions
    router.get("/:id/export-submissions", requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        const assessmentId = parseInt(req.params.id);
        const assessment = await db.select().from(assessmentsTable).where(eq(assessmentsTable.id, assessmentId)).limit(1);

        if (!assessment.length) {
          return res.status(404).json({ message: "Assessment not found" });
        }

        // Get detailed submissions for this assessment
        const detailedSubmissions = await db.select({
          id: submissionsTable.id,
          studentName: sql`${usersTable.firstName} || ' ' || ${usersTable.lastName}`,
          studentEmail: usersTable.email,
          responses: submissionsTable.responses,
          submittedAt: submissionsTable.submittedAt,
          feedback: submissionsTable.feedback
        })
        .from(submissionsTable)
        .innerJoin(usersTable, eq(submissionsTable.studentId, usersTable.id))
        .where(eq(submissionsTable.assessmentId, assessmentId));

        // Create CSV content
        const csvData = [
          ['Student Name', 'Email', 'Responses', 'Submitted At', 'Feedback'],
          ...detailedSubmissions.map((sub: any) => [
            sub.studentName,
            sub.studentEmail,
            JSON.stringify(sub.responses || {}).replace(/,/g, ';'),
            sub.submittedAt || '',
            (sub.feedback || '').replace(/,/g, ';')
          ])
        ];

        const csv = csvData.map(row => row.join(',')).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${assessment[0].title}-submissions.csv"`);
        res.send(csv);
      } catch (error) {
        console.error('Submissions export error:', error);
        res.status(500).json({ message: "Failed to export submissions" });
      }
    });

    // Export detailed assessment results
    router.get("/:id/export-detailed-results", requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        const assessmentId = parseInt(req.params.id);
        const assessment = await db.select().from(assessmentsTable).where(eq(assessmentsTable.id, assessmentId)).limit(1);

        if (!assessment.length) {
          return res.status(404).json({ message: "Assessment not found" });
        }

        // Get detailed submissions with question breakdown
        const detailedResults = await db.select({
          id: submissionsTable.id,
          studentName: sql`${usersTable.firstName} || ' ' || ${usersTable.lastName}`,
          studentEmail: usersTable.email,
          responses: submissionsTable.responses,
          submittedAt: submissionsTable.submittedAt,
          feedback: submissionsTable.feedback
        })
        .from(submissionsTable)
        .innerJoin(usersTable, eq(submissionsTable.studentId, usersTable.id))
        .where(eq(submissionsTable.assessmentId, assessmentId));

        const questions = (assessment[0].questions as any[]) || [];

        // Create detailed CSV with question breakdown
        const headers = ['Student Name', 'Email', 'Submitted At'];
        questions.forEach((q: any, index: number) => {
          headers.push(`Q${index + 1}: ${(q.text || '').substring(0, 50)}...`);
        });
        headers.push('Feedback');

        const csvData = [headers];

        detailedResults.forEach((sub: any) => {
          const row = [
            sub.studentName,
            sub.studentEmail,
            sub.submittedAt || ''
          ];

          const responses = (sub.responses as any) || {};
          questions.forEach((q: any, index: number) => {
            const response = (responses as any)[index] || '';
            row.push(typeof response === 'string' ? response.replace(/,/g, ';') : JSON.stringify(response));
          });

          row.push((sub.feedback || '').replace(/,/g, ';'));
          csvData.push(row);
        });

        const csv = csvData.map(row => row.join(',')).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${assessment[0].title}-detailed-results.csv"`);
        res.send(csv);
      } catch (error) {
        console.error('Detailed export error:', error);
        res.status(500).json({ message: "Failed to export detailed results" });
      }
    });

    // Assessment deletion route
    router.delete('/:id', requireAuth, requireRole(['teacher', 'admin']), async (req: AuthenticatedRequest, res) => {
      try {
        const assessmentId = parseInt(req.params.id);
        await this.service.deleteAssessment(assessmentId);
        res.json({ message: "Assessment deleted successfully" });
      } catch (error) {
        console.error("Error deleting assessment:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        res.status(500).json({ 
          message: "Failed to delete assessment", 
          error: errorMessage,
          details: process.env.NODE_ENV === 'development' ? error : undefined
        });
      }
    });

    // Share code routes for assessments
    router.post('/:id/generate-share-code', requireAuth, requireRole(['teacher', 'admin']), async (req: AuthenticatedRequest, res) => {
      try {
        const assessmentId = parseInt(req.params.id);
        const result = await this.service.generateShareCode(assessmentId);
        res.json(result);
      } catch (error) {
        console.error("Error generating share code:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        res.status(500).json({ 
          message: "Failed to generate share code", 
          error: errorMessage 
        });
      }
    });

    router.get('/by-code/:code', requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        const shareCode = req.params.code;
        const assessment = await this.service.getAssessmentByShareCode(shareCode);
        res.json(assessment);
      } catch (error) {
        console.error("Error accessing assessment by code:", error);
        if (error instanceof Error) {
          if (error.message.includes("Invalid share code format")) {
            return res.status(400).json({ message: error.message });
          }
          if (error.message.includes("Assessment not found")) {
            return res.status(404).json({ message: error.message });
          }
          if (error.message.includes("expired")) {
            return res.status(410).json({ message: error.message });
          }
        }
        res.status(500).json({ message: "Failed to access assessment" });
      }
    });

    router.post('/:id/regenerate-share-code', requireAuth, requireRole(['teacher', 'admin']), async (req: AuthenticatedRequest, res) => {
      try {
        const assessmentId = parseInt(req.params.id);
        const result = await this.service.regenerateShareCode(assessmentId);
        res.json(result);
      } catch (error) {
        console.error("Error regenerating share code:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        res.status(500).json({ 
          message: "Failed to regenerate share code", 
          error: errorMessage 
        });
      }
    });

    // Submissions for assessment
    router.get('/:id/submissions', requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user!.id;

        if (req.user?.role !== 'teacher' && req.user?.role !== 'admin') {
          return res.status(403).json({ message: "Only teachers can view submissions" });
        }

        const assessmentId = parseInt(req.params.id);
        const submissions = await this.service.getSubmissionsByAssessment(assessmentId);

        res.json(submissions);
      } catch (error) {
        console.error("Error fetching submissions:", error);
        res.status(500).json({ message: "Failed to fetch submissions" });
      }
    });

    return router;
  }
}

// Create and export the router
export const assessmentController = new AssessmentController();
export const assessmentsRouter = assessmentController.createRouter();