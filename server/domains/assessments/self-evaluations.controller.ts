import { Router } from 'express';
import { assessmentService, type AssessmentService } from './assessments.service';
import { aiService, type AIService } from '../ai/ai.service';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../auth';
import { UserRole } from '../../../shared/schema';
import { 
  validateIntParam, 
  sanitizeForPrompt, 
  createErrorResponse,
  aiLimiter
} from '../../middleware/security';

export class SelfEvaluationController {
  constructor(
    private service: AssessmentService = assessmentService,
    private ai: AIService = aiService
  ) {}

  // Create Express router with all self-evaluation routes
  createRouter(): Router {
    const router = Router();

    // Create self-evaluation with AI feedback
    router.post('/', requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user!.id;

        if (req.user?.role !== 'student') {
          return res.status(403).json({ message: "Only students can submit self-evaluations" });
        }

        const data = {
          ...req.body,
          studentId: userId,
        };

        // Get component skill details for AI feedback
        const componentSkill = await this.service.getComponentSkill(data.componentSkillId);

        if (!componentSkill) {
          return res.status(400).json({ message: "Component skill not found" });
        }

        // Generate AI feedback and safety check
        const aiAnalysis = await this.ai.generateSelfEvaluationFeedback(
          componentSkill.name,
          componentSkill.rubricLevels,
          data.selfAssessedLevel,
          data.justification,
          data.examples || ""
        );

        // Create self-evaluation with AI feedback
        const selfEvaluation = await this.service.createSelfEvaluation({
          ...data,
          aiImprovementFeedback: aiAnalysis.improvementFeedback,
          hasRiskyContent: aiAnalysis.hasRiskyContent,
          teacherNotified: aiAnalysis.hasRiskyContent, // Auto-notify teacher if risky content detected
        });

        res.json({ 
          selfEvaluation,
          aiAnalysis: {
            improvementFeedback: aiAnalysis.improvementFeedback,
            hasRiskyContent: aiAnalysis.hasRiskyContent
          }
        });
      } catch (error) {
        console.error("Error creating self-evaluation:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        res.status(500).json({ 
          message: "Failed to create self-evaluation", 
          error: errorMessage,
          details: process.env.NODE_ENV === 'development' ? error : undefined
        });
      }
    });

    // Get self evaluations for assessment
    router.get('/assessment/:assessmentId', requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        const assessmentId = parseInt(req.params.assessmentId);
        const selfEvaluations = await this.service.getSelfEvaluationsByAssessment(assessmentId);

        // Filter based on role
        if (req.user?.role === 'student') {
          // Students can only see their own self-evaluations
          const studentSelfEvaluations = selfEvaluations.filter(se => se.studentId === req.user!.id);
          res.json(studentSelfEvaluations);
        } else {
          // Teachers and admins can see all self-evaluations for the assessment
          res.json(selfEvaluations);
        }
      } catch (error) {
        console.error("Error fetching self-evaluations:", error);
        res.status(500).json({ message: "Failed to fetch self-evaluations" });
      }
    });

    // Get student's self-evaluations
    router.get('/student', requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user!.id;

        if (req.user?.role !== 'student') {
          return res.status(403).json({ message: "Only students can view their self-evaluations" });
        }

        const selfEvaluations = await this.service.getSelfEvaluationsByStudent(userId);
        res.json(selfEvaluations);
      } catch (error) {
        console.error("Error fetching student self-evaluations:", error);
        res.status(500).json({ message: "Failed to fetch self-evaluations" });
      }
    });

    // Flag risky self-evaluation
    router.post('/:id/flag-risky', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN), async (req: AuthenticatedRequest, res) => {
      try {
        const selfEvaluationId = parseInt(req.params.id);
        await this.service.flagRiskySelfEvaluation(selfEvaluationId, true);
        res.json({ message: "Self-evaluation flagged and teacher notified" });
      } catch (error) {
        console.error("Error flagging risky self-evaluation:", error);
        res.status(500).json({ message: "Failed to flag self-evaluation" });
      }
    });

    return router;
  }
}

// Create and export the router
export const selfEvaluationController = new SelfEvaluationController();
export const selfEvaluationsRouter = selfEvaluationController.createRouter();