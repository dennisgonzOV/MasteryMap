import { Router } from 'express';
import { aiService } from './ai.service';
import { requireAuth, type AuthenticatedRequest } from '../auth';
import { assessmentStorage, type IAssessmentStorage } from '../assessments/assessments.storage';
import type { BestStandard } from '../../../shared/schema';
import { 
  validateIntParam, 
  sanitizeForPrompt, 
  createErrorResponse,
  aiLimiter
} from '../../middleware/security';

export class AIController {
  constructor(
    private service = aiService,
    private assessmentsStorage: IAssessmentStorage = assessmentStorage,
  ) {}

  // Create Express router with all AI routes
  createRouter(): Router {
    const router = Router();

    // AI Tutor Chat endpoint
    router.post('/tutor/chat', requireAuth, aiLimiter, async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user!.id;

        if (req.user?.role !== 'student' && req.user?.role !== 'teacher') {
          return res.status(403).json({ message: "Only students and teachers can use the AI tutor" });
        }

        const { componentSkill, conversationHistory, currentEvaluation, assessmentId } = req.body;
        const parsedAssessmentId =
          typeof assessmentId === "number"
            ? assessmentId
            : typeof assessmentId === "string"
              ? Number(assessmentId)
              : NaN;
        const conversationHistoryList: Array<Record<string, unknown>> = Array.isArray(conversationHistory)
          ? conversationHistory.filter(
            (msg: unknown): msg is Record<string, unknown> =>
              typeof msg === "object" && msg !== null,
          )
          : [];

        if (!componentSkill || conversationHistoryList.length === 0) {
          return res.status(400).json({ message: "Missing required fields" });
        }

        // Add studentId to conversation history for safety incident tracking
        const enhancedConversationHistory = conversationHistoryList.map((msg: Record<string, unknown>) => ({
          ...msg,
          studentId: req.user?.role === 'student' ? userId : msg.studentId
        }));
        let teacherAssessmentDescription: string | undefined;
        let assessmentPdfContext: string | undefined;
        if (Number.isInteger(parsedAssessmentId) && parsedAssessmentId > 0) {
          const assessment = await this.assessmentsStorage.getAssessment(parsedAssessmentId);
          teacherAssessmentDescription = sanitizeForPrompt(assessment?.description || "");

          if (assessment?.pdfUrl) {
            try {
              const { extractTextFromPdfUrl } = await import('../../utils/pdf');
              assessmentPdfContext = sanitizeForPrompt(await extractTextFromPdfUrl(assessment.pdfUrl));
            } catch (pdfError) {
              console.error("Error extracting assessment PDF for tutor context:", pdfError);
            }
          }
        }

        // Generate AI tutor response
        const tutorResponse = await this.service.generateTutorResponse(
          componentSkill,
          enhancedConversationHistory,
          currentEvaluation,
          teacherAssessmentDescription,
          assessmentPdfContext
        );

        // Handle safety flags by creating notifications
        if (tutorResponse.safetyFlag) {
          // Create safety incident and notify teachers
          const studentId = userId; // Simplified - both branches were returning userId
          const latestMessage = String(conversationHistoryList
            .filter((msg: Record<string, unknown>) => msg.role === 'student')
            .map((msg) => msg.content)
            .pop() || '');

          try {
            // Import notification helper
            const { notifyTeacherOfSafetyIncident } = await import('../../services/notifications');

            // Map safety flags to incident types using a mapping object
            const safetyFlagMapping = {
              'homicidal_ideation': 'homicidal_ideation',
              'suicidal_ideation': 'suicidal_ideation',
              'inappropriate_language': 'inappropriate_language',
              'homicidal_ideation_fallback': 'homicidal_ideation_fallback',
              'suicidal_ideation_fallback': 'suicidal_ideation_fallback',
              'inappropriate_language_fallback': 'inappropriate_language_fallback'
            } as const;

            type SafetyIncidentType = typeof safetyFlagMapping[keyof typeof safetyFlagMapping];
            const incidentType: SafetyIncidentType =
              safetyFlagMapping[tutorResponse.safetyFlag as keyof typeof safetyFlagMapping] || 'inappropriate_language';

            await notifyTeacherOfSafetyIncident({
              studentId: studentId,
              assessmentId:
                Number.isInteger(parsedAssessmentId) && parsedAssessmentId > 0
                  ? parsedAssessmentId
                  : undefined,
              componentSkillId: componentSkill.id,
              incidentType: incidentType,
              message: latestMessage,
              timestamp: new Date(),
              conversationHistory: enhancedConversationHistory
            });

          } catch (notificationError) {
            console.error("Error creating safety incident notification:", notificationError);
          }
        }

        res.json({
          response: tutorResponse.response,
          suggestedEvaluation: tutorResponse.suggestedEvaluation,
          shouldTerminate: tutorResponse.shouldTerminate || false,
          safetyFlag: tutorResponse.safetyFlag
        });
      } catch (error) {
        console.error("Error generating tutor response:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        res.status(500).json({ 
          message: "Failed to generate tutor response", 
          error: errorMessage,
          details: process.env.NODE_ENV === 'development' ? error : undefined
        });
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

    router.post('/generate-assessment', requireAuth, aiLimiter, async (req: AuthenticatedRequest, res) => {
      try {
        const {
          milestoneTitle,
          milestoneDescription,
          milestoneDueDate,
          componentSkills,
          bestStandards = [],
          questionCount = 5,
          questionTypes = ['open-ended'],
          pdfUrl,
        } = req.body;

        if (!componentSkills || !Array.isArray(componentSkills) || componentSkills.length === 0) {
          return res.status(400).json({
            error: "Component skills are required for assessment generation"
          });
        }

        let pdfContent: string | undefined;
        if (pdfUrl) {
          try {
            const { extractTextFromPdfUrl } = await import('../../utils/pdf');
            pdfContent = await extractTextFromPdfUrl(pdfUrl);
          } catch (pdfError) {
            console.error('Error extracting PDF text for AI generation:', pdfError);
          }
        }

        const assessment = await this.service.generateAssessmentFromComponentSkills(
          milestoneTitle,
          milestoneDescription,  
          milestoneDueDate,
          componentSkills,
          Array.isArray(bestStandards) ? (bestStandards as BestStandard[]) : [],
          questionCount,
          questionTypes,
          pdfContent
        );

        res.json(assessment);
      } catch (error) {
        console.error('Error generating assessment from skills:', error);
        res.status(500).json({ 
          error: "Failed to generate assessment from component skills" 
        });
      }
    });

    return router;
  }
}

export const aiController = new AIController();
export const aiRouter = aiController.createRouter();
