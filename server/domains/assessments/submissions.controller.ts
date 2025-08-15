import { Router } from 'express';
import { assessmentService, type AssessmentService } from './assessments.service';
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
import { aiService } from "../ai/ai.service";

export class SubmissionController {
  constructor(private service: AssessmentService = assessmentService) {}

  // Create Express router with all submission routes
  createRouter(): Router {
    const router = Router();

    // Submission creation route
    router.post('/', requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user!.id;

        if (req.user?.role !== 'student') {
          return res.status(403).json({ message: "Only students can submit assessments" });
        }

        const submission = await this.service.createSubmission(req.body, userId);
        res.json(submission);
      } catch (error) {
        console.error("Error creating submission:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        res.status(500).json({ 
          message: "Failed to create submission", 
          error: errorMessage,
          details: process.env.NODE_ENV === 'development' ? error : undefined
        });
      }
    });

    // Get submissions for current student
    router.get('/student', requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user!.id;
        const submissions = await this.service.getSubmissionsByStudent(userId);
        res.json(submissions);
      } catch (error) {
        console.error("Error fetching submissions:", error);
        res.status(500).json({ message: "Failed to fetch submissions" });
      }
    });

    // Get individual submission by ID
    router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        const submissionId = parseInt(req.params.id);
        const submission = await this.service.getSubmission(submissionId);

        if (!submission) {
          return res.status(404).json({ message: "Submission not found" });
        }

        res.json(submission);
      } catch (error) {
        console.error("Error fetching submission:", error);
        res.status(500).json({ message: "Failed to fetch submission" });
      }
    });

    // Grade submission route
    router.post('/:id/grade', requireAuth, requireRole(['teacher', 'admin']), validateIntParam('id'), async (req: AuthenticatedRequest, res) => {
      try {
        const submissionId = parseInt(req.params.id);
        const { grades: gradeUpdates } = req.body;

        if (!gradeUpdates || !Array.isArray(gradeUpdates)) {
          return res.status(400).json({ message: "Grades array is required" });
        }

        const submission = await this.service.getSubmission(submissionId);
        if (!submission) {
          return res.status(404).json({ message: "Submission not found" });
        }

        const gradedBy = req.user!.id;

        // Create or update grades for each component skill
        const createdGrades = await Promise.all(
          gradeUpdates.map(async (gradeUpdate: any) => {
            const { componentSkillId, score, rubricLevel, feedback } = gradeUpdate;

            if (!componentSkillId) {
              throw new Error("Component skill ID is required for grading");
            }

            // Create the grade record
            const grade = await this.service.createGrade({
              submissionId,
              componentSkillId,
              score: score?.toString() || "0",
              rubricLevel: rubricLevel || "emerging",
              feedback: feedback || "",
              gradedBy,
            });

            return grade;
          })
        );

        // Update submission with gradedAt timestamp to mark it as completed
        await this.service.updateSubmission(submissionId, {
          gradedAt: new Date()
        });

        res.json({
          message: "Submission graded successfully",
          grades: createdGrades,
        });
      } catch (error) {
        console.error("Error grading submission:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        res.status(500).json({
          message: "Failed to grade submission",
          error: errorMessage,
          details: process.env.NODE_ENV === 'development' ? error : undefined
        });
      }
    });

    // Get grades for submission
    router.get('/:id/grades', requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        const submissionId = parseInt(req.params.id);
        
        const submission = await this.service.getSubmission(submissionId);
        if (!submission) {
          return res.status(404).json({ message: "Submission not found" });
        }

        // Check if user has access to view grades
        if (req.user?.role === 'student' && req.user.id !== submission.studentId) {
          return res.status(403).json({ message: "Access denied" });
        }

        const grades = await this.service.getGradesBySubmission(submissionId);
        res.json(grades);
      } catch (error) {
        console.error("Error fetching grades:", error);
        res.status(500).json({ message: "Failed to fetch grades" });
      }
    });

    // Generate question feedback using AI
    router.post('/:id/generate-question-feedback', requireAuth, validateIntParam('id'), aiLimiter, async (req: AuthenticatedRequest, res) => {
      try {
        const submissionId = parseInt(req.params.id);
        const { questionIndex, rubricLevel } = req.body;

        if (questionIndex === undefined || !rubricLevel) {
          return res.status(400).json({ message: "Question index and rubric level are required" });
        }

        const submission = await this.service.getSubmission(submissionId);
        if (!submission) {
          return res.status(404).json({ message: "Submission not found" });
        }

        const assessment = await this.service.getAssessment(submission.assessmentId);
        if (!assessment) {
          return res.status(404).json({ message: "Assessment not found" });
        }

        const questions = assessment.questions as any[];
        const responses = submission.responses as any;

        if (!questions || questionIndex >= questions.length) {
          return res.status(400).json({ message: "Invalid question index" });
        }

        const question = questions[questionIndex];
        const studentResponse = responses[questionIndex] || "";

        // Validate and sanitize input
        const sanitizedResponse = sanitizeForPrompt(studentResponse);
        const sanitizedQuestion = sanitizeForPrompt(question.text || "");

        if (!sanitizedResponse || !sanitizedQuestion) {
          return res.status(400).json({ message: "Question and response cannot be empty" });
        }

        const feedback = await aiService.generateFeedbackForQuestion(
          sanitizedQuestion,
          sanitizedResponse,
          rubricLevel
        );

        res.json({ feedback: feedback || "Unable to generate feedback at this time" });
      } catch (error) {
        console.error("Error generating question feedback:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        res.status(500).json({
          message: "Failed to generate feedback",
          error: errorMessage,
        });
      }
    });

    return router;
  }
}

// Create and export the router
export const submissionController = new SubmissionController();
export const submissionsRouter = submissionController.createRouter();