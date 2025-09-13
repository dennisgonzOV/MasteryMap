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
        const userId = req.user!.id;

        if (req.user?.role !== 'student' && req.user?.role !== 'teacher') {
          return res.status(403).json({ message: "Only students and teachers can use the AI tutor" });
        }

        const { componentSkill, conversationHistory, currentEvaluation, assessmentId } = req.body;

        if (!componentSkill || !conversationHistory) {
          return res.status(400).json({ message: "Missing required fields" });
        }

        console.log("AI Tutor Chat Request:", {
          userId,
          componentSkillName: componentSkill.name,
          messageCount: conversationHistory.length,
          currentLevel: currentEvaluation?.selfAssessedLevel
        });

        // Add studentId to conversation history for safety incident tracking
        const enhancedConversationHistory = conversationHistory.map((msg: any) => ({
          ...msg,
          studentId: req.user?.role === 'student' ? userId : msg.studentId
        }));

        // Generate AI tutor response
        const tutorResponse = await this.service.generateTutorResponse(
          componentSkill,
          enhancedConversationHistory,
          currentEvaluation
        );

        // Handle safety flags by creating notifications
        if (tutorResponse.safetyFlag) {
          console.log("SAFETY FLAG RAISED:", {
            userId,
            flag: tutorResponse.safetyFlag,
            componentSkill: componentSkill.name,
            timestamp: new Date().toISOString()
          });

          // Create safety incident and notify teachers
          const studentId = userId; // Simplified - both branches were returning userId
          const latestMessage = conversationHistory.filter((msg: any) => msg.role === 'student').pop()?.content || '';

          try {
            // Import the notification service
            const { notificationService } = await import('../notifications');

            // Map safety flags to incident types using a mapping object
            const safetyFlagMapping: Record<string, string> = {
              'homicidal_ideation': 'homicidal_ideation',
              'suicidal_ideation': 'suicidal_ideation',
              'inappropriate_language': 'inappropriate_language',
              'homicidal_ideation_fallback': 'homicidal_ideation_fallback',
              'suicidal_ideation_fallback': 'suicidal_ideation_fallback',
              'inappropriate_language_fallback': 'inappropriate_language_fallback'
            };

            const incidentType = safetyFlagMapping[tutorResponse.safetyFlag] || 'inappropriate_language';

            await notificationService.notifyTeacherOfSafetyIncident({
              studentId: studentId,
              assessmentId: assessmentId || undefined,
              componentSkillId: componentSkill.id,
              incidentType: incidentType,
              message: latestMessage,
              timestamp: new Date(),
              conversationHistory: enhancedConversationHistory
            });

            console.log("Safety incident notification created successfully");
          } catch (notificationError) {
            console.error("Error creating safety incident notification:", notificationError);
          }
        }

        console.log("AI Tutor Response generated successfully");

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

    // Generate assessment from component skills
    router.post('/generate-assessment', requireAuth, aiLimiter, async (req: AuthenticatedRequest, res) => {
      try {
        const { milestoneTitle, milestoneDescription, milestoneDueDate, componentSkills, questionCount = 5, questionTypes = ['open-ended'] } = req.body;

        if (!componentSkills || !Array.isArray(componentSkills) || componentSkills.length === 0) {
          return res.status(400).json({
            error: "Component skills are required for assessment generation"
          });
        }

        const assessment = await this.service.generateAssessmentFromComponentSkills(
          milestoneTitle,
          milestoneDescription,  
          milestoneDueDate,
          componentSkills,
          questionCount,
          questionTypes
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
