import { Router } from 'express';
import { aiService } from './ai.service';
import { requireAuth, type AuthenticatedRequest } from '../auth';
import { 
  validateIntParam, 
  sanitizeForPrompt, 
  createErrorResponse,
  aiLimiter
} from '../../middleware/security';

export class AIController {
  constructor(private service = aiService) {}

  // Create Express router with all AI routes
  createRouter(): Router {
    const router = Router();

    // AI Tutor Chat endpoint
    router.post('/tutor/chat', requireAuth, aiLimiter, async (req: AuthenticatedRequest, res) => {
      try {
        const { question, context, conversationHistory } = req.body;

        if (!question || typeof question !== 'string') {
          return res.status(400).json({ message: "Question is required" });
        }

        // Sanitize inputs for AI
        const sanitizedQuestion = sanitizeForPrompt(question);
        const sanitizedContext = context ? sanitizeForPrompt(context) : '';

        const response = await this.service.generateTutorResponse(
          sanitizedQuestion,
          sanitizedContext,
          conversationHistory || []
        );

        res.json({ response });
      } catch (error) {
        console.error("Error in AI tutor chat:", error);
        res.status(500).json({ message: "Failed to generate tutor response" });
      }
    });

    // Generate assessment questions
    router.post('/assessment/generate-questions', requireAuth, aiLimiter, async (req: AuthenticatedRequest, res) => {
      try {
        const { milestoneDescription, learningObjectives, difficulty } = req.body;

        if (!milestoneDescription || !learningObjectives) {
          return res.status(400).json({ message: "Milestone description and learning objectives are required" });
        }

        const questions = await this.service.generateAssessmentQuestions(
          sanitizeForPrompt(milestoneDescription),
          sanitizeForPrompt(learningObjectives),
          difficulty
        );

        res.json({ questions });
      } catch (error) {
        console.error("Error generating assessment questions:", error);
        res.status(500).json({ message: "Failed to generate questions" });
      }
    });

    return router;
  }
}

export const aiController = new AIController();
export const aiRouter = aiController.createRouter();