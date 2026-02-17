import { Router } from 'express';
import { type AssessmentService } from './assessments.service';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../auth';
import { UserRole } from '../../../shared/schema';
import type {
  SubmissionCreateRequestDTO,
  SubmissionDTO,
  SubmissionGradeRequestDTO,
} from '../../../shared/contracts/api';
import { 
  validateIntParam, 
  aiLimiter
} from '../../middleware/security';
import { SubmissionGradingService, SubmissionHttpError } from './submission-grading.service';
import {
  assessmentProjectGateway,
  type AssessmentProjectGateway,
} from "./assessment-project-gateway";
import { canUserAccessAssessment } from "./assessment-access";
import { canTeacherManageAssessment } from "./assessment-ownership";

export class SubmissionController {
  private gradingService: SubmissionGradingService;

  constructor(
    private service: AssessmentService,
    private projectGateway: AssessmentProjectGateway = assessmentProjectGateway,
  ) {
    this.gradingService = new SubmissionGradingService(this.service);
  }

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

        const payload: SubmissionCreateRequestDTO = req.body;
        const submission: SubmissionDTO = await this.service.createSubmission(payload, userId);
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
    router.get('/:id', requireAuth, validateIntParam('id'), async (req: AuthenticatedRequest, res) => {
      try {
        const submissionId = parseInt(req.params.id);
        const access = await this.checkSubmissionAccess(req.user, submissionId);
        if (!access.allowed) {
          return res.status(access.status).json({ message: access.message });
        }

        res.json(access.submission);
      } catch (error) {
        console.error("Error fetching submission:", error);
        res.status(500).json({ message: "Failed to fetch submission" });
      }
    });

    // Grade submission route - teacher and admin only
    router.post('/:submissionId/grade', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN), validateIntParam('submissionId'), async (req: AuthenticatedRequest, res) => {
      try {
        const submissionId = parseInt(req.params.submissionId);
        const submission = await this.service.getSubmission(submissionId);
        if (!submission) {
          return res.status(404).json({ message: "Submission not found" });
        }
        if (!submission.assessmentId) {
          return res.status(400).json({ message: "Submission has no assessment" });
        }

        const assessment = await this.service.getAssessment(submission.assessmentId);
        if (!assessment) {
          return res.status(404).json({ message: "Assessment not found" });
        }

        if (req.user?.role === UserRole.TEACHER || (req.user?.role === UserRole.ADMIN && req.user?.tier === "free")) {
          const canManage = await canTeacherManageAssessment(assessment, req.user.id, this.projectGateway);
          if (!canManage) {
            return res.status(403).json({
              message: "Access denied - you can only grade submissions for assessments you manage",
            });
          }
        }

        const gradeRequest: SubmissionGradeRequestDTO = req.body;
        const rawBody = this.toRecord(req.body);
        const generateAiFeedback =
          gradeRequest.generateAiFeedback === true || rawBody.generateAIFeedback === true;

        const result = await this.gradingService.gradeSubmission({
          submissionId,
          graderId: req.user!.id,
          gradeRequest,
          generateAiFeedback,
        });

        res.json(result);
      } catch (error) {
        if (error instanceof SubmissionHttpError) {
          return res.status(error.statusCode).json({ message: error.message });
        }

        console.error("Error grading submission:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        res.status(500).json({ 
          message: "Failed to grade submission", 
          error: errorMessage,
          context: "Submission ID: " + req.params.submissionId,
          details: process.env.NODE_ENV === 'development' ? error : undefined
        });
      }
    });

    // Get grades for submission
    router.get('/:id/grades', requireAuth, validateIntParam('id'), async (req: AuthenticatedRequest, res) => {
      try {
        const submissionId = parseInt(req.params.id);
        const access = await this.checkSubmissionAccess(req.user, submissionId);
        if (!access.allowed) {
          return res.status(access.status).json({ message: access.message });
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
        const access = await this.checkSubmissionAccess(req.user, submissionId);
        if (!access.allowed) {
          return res.status(access.status).json({ message: access.message });
        }

        const payload = this.toRecord(req.body);
        const questionIndex = payload.questionIndex;
        const rubricLevel = payload.rubricLevel;

        if (typeof questionIndex !== "number" || typeof rubricLevel !== "string" || !rubricLevel.trim()) {
          return res.status(400).json({ message: "Question index and rubric level are required" });
        }

        const feedback = await this.gradingService.generateQuestionFeedback({
          submissionId,
          questionIndex,
          rubricLevel: rubricLevel.trim(),
        });

        res.json({ feedback: feedback || "Unable to generate feedback at this time" });
      } catch (error) {
        if (error instanceof SubmissionHttpError) {
          return res.status(error.statusCode).json({ message: error.message });
        }

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

  private toRecord(value: unknown): Record<string, unknown> {
    if (typeof value === "object" && value !== null) {
      return value as Record<string, unknown>;
    }
    return {};
  }

  private async checkSubmissionAccess(
    user: AuthenticatedRequest["user"],
    submissionId: number,
  ): Promise<{
    allowed: boolean;
    status: number;
    message: string;
    submission?: Awaited<ReturnType<AssessmentService["getSubmission"]>>;
  }> {
    if (!user) {
      return { allowed: false, status: 401, message: "Unauthorized" };
    }

    const submission = await this.service.getSubmission(submissionId);
    if (!submission) {
      return { allowed: false, status: 404, message: "Submission not found" };
    }

    if (user.role === "student") {
      if (submission.studentId !== user.id) {
        return { allowed: false, status: 403, message: "Access denied" };
      }
      return { allowed: true, status: 200, message: "OK", submission };
    }

    if (user.role === "teacher" || user.role === "admin") {
      if (!submission.assessmentId) {
        return { allowed: false, status: 403, message: "Access denied" };
      }

      const assessment = await this.service.getAssessment(submission.assessmentId);
      if (!assessment) {
        return { allowed: false, status: 404, message: "Assessment not found" };
      }

      const canAccess = await canUserAccessAssessment(
        assessment,
        user as typeof user & { role: "teacher" | "admin" | "student" },
        this.projectGateway,
      );
      if (!canAccess) {
        return { allowed: false, status: 403, message: "Access denied" };
      }

      return { allowed: true, status: 200, message: "OK", submission };
    }

    return { allowed: false, status: 403, message: "Access denied" };
  }
}
