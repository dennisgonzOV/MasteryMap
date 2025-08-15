import { Router } from 'express';
import { assessmentService, type AssessmentService } from './assessments.service';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../auth';
import { 
  validateIntParam, 
  sanitizeForPrompt, 
  createErrorResponse,
  aiLimiter
} from '../../middleware/security';

export class SelfEvaluationController {
  constructor(private service: AssessmentService = assessmentService) {}

  // Create Express router with all self-evaluation routes
  createRouter(): Router {
    const router = Router();

    // Get self evaluations for assessment
    router.get('/assessment/:assessmentId', requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        const assessmentId = parseInt(req.params.assessmentId);
        const selfEvaluations = await this.service.getSelfEvaluationsByAssessment(assessmentId);
        res.json(selfEvaluations);
      } catch (error) {
        console.error("Error fetching self evaluations:", error);
        res.status(500).json({ message: "Failed to fetch self evaluations" });
      }
    });

    return router;
  }
}

// Create and export the router
export const selfEvaluationController = new SelfEvaluationController();
export const selfEvaluationsRouter = selfEvaluationController.createRouter();