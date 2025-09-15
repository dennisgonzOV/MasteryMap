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

    // Grade submission route - teacher and admin only
    router.post('/:submissionId/grade', requireAuth, requireRole('teacher', 'admin'), validateIntParam('id'), async (req: AuthenticatedRequest, res) => {
      try {
        const submissionId = parseInt(req.params.id);
        const { grades: gradeData, feedback, grade, generateAiFeedback } = req.body;

        console.log("Starting grading for submission " + submissionId + ", generateAiFeedback: " + generateAiFeedback);

        // Save grades - support both detailed component skill grading and simple overall grading
        // Check for existing grades and update them instead of creating duplicates
        let savedGrades: any[] = [];
        if (gradeData && Array.isArray(gradeData)) {
          savedGrades = await Promise.all(
            gradeData.map(async (gradeItem: any) => {
              // Check if grade already exists for this submission and component skill
              const existingGrades = await this.service.getExistingGrade(submissionId, gradeItem.componentSkillId);

              if (existingGrades) {
                // Update existing grade
                const updatedGrade = await this.service.updateGrade(existingGrades.id, {
                  rubricLevel: gradeItem.rubricLevel,
                  score: gradeItem.score?.toString() || "0",
                  feedback: gradeItem.feedback,
                  gradedBy: req.user!.id,
                });
                return updatedGrade;
              } else {
                // Create new grade if none exists
                return this.service.createGrade({
                  submissionId,
                  componentSkillId: gradeItem.componentSkillId,
                  rubricLevel: gradeItem.rubricLevel,
                  score: gradeItem.score,
                  feedback: gradeItem.feedback,
                  gradedBy: req.user!.id,
                });
              }
            })
          );
        }

        // Get submission and assessment data
        const submission = await this.service.getSubmission(submissionId);
        if (!submission) {
          return res.status(404).json({ message: "Submission not found" });
        }

        const assessment = await this.service.getAssessment(submission.assessmentId);
        if (!assessment) {
          return res.status(404).json({ message: "Assessment not found" });
        }

        // Generate AI feedback and grade if requested
        let finalFeedback = feedback;
        let finalGrade = grade;

        if (generateAiFeedback) {
          console.log("Generating AI feedback for submission " + submissionId);

          try {
            // If no component skill grades were provided, generate them using AI
            if (!gradeData || gradeData.length === 0) {
              // Get component skills for this assessment
              const componentSkillIds = (assessment.componentSkillIds as number[]) || [];
              if (componentSkillIds.length > 0) {
                // Fetch component skills with their rubric levels
                const componentSkills = await Promise.all(
                  componentSkillIds.map(id => this.service.getComponentSkill(id))
                );
                const validSkills = componentSkills.filter(skill => skill !== undefined);

                if (validSkills.length > 0) {
                  console.log("Generating component skill grades for " + validSkills.length + " skills");

                  // Generate AI-based component skill grades
                  const aiSkillGrades = await this.service.generateComponentSkillGrades(
                    submission,
                    assessment,
                    validSkills as any[]
                  );

                  console.log("Successfully generated AI component skill grades:", aiSkillGrades.map(g => 
                    `${g.componentSkillId}: ${g.rubricLevel} (${g.score})`
                  ).join(', '));

                  // Save the AI-generated component skill grades
                  savedGrades = await Promise.all(
                    aiSkillGrades.map(gradeItem => 
                      this.service.createGrade({
                        submissionId,
                        componentSkillId: gradeItem.componentSkillId,
                        rubricLevel: gradeItem.rubricLevel,
                        score: gradeItem.score?.toString() || "0",
                        feedback: gradeItem.feedback,
                        gradedBy: req.user!.id,
                      })
                    )
                  );
                }
              }
            }

            // Generate comprehensive AI feedback based on the component skill grades
            finalFeedback = await this.service.generateStudentFeedback(submission, savedGrades);
            console.log("Generated AI feedback: " + (finalFeedback?.substring(0, 100) || "") + "...");

          } catch (aiError) {
            console.error("Error generating AI feedback:", aiError);
            finalFeedback = "AI feedback generation failed. Please provide manual feedback.";
          }
        }

        // Update submission with feedback and grade
        const updateData: any = {
          gradedAt: new Date(),
        };

        if (finalFeedback !== undefined) {
          updateData.feedback = finalFeedback;
        }

        if (finalGrade !== undefined) {
          updateData.grade = finalGrade;
        }

        if (generateAiFeedback) {
          updateData.aiGeneratedFeedback = true;
        }

        console.log("Updating submission " + submissionId + " with grade: " + finalGrade + ", feedback length: " + (finalFeedback?.length || 0));
        const updatedSubmission = await this.service.updateSubmission(submissionId, updateData);

        // Award stickers for component skill grades
        let awardedStickers: any[] = [];
        if (savedGrades.length > 0) {
          const submission = await this.service.getSubmission(submissionId);
          if (submission) {
            awardedStickers = await this.service.awardStickersForGrades(submission.studentId, savedGrades);
          }
        }

        res.json({ 
          grades: savedGrades, 
          feedback: finalFeedback,
          submission: updatedSubmission,
          stickersAwarded: awardedStickers
        });
      } catch (error) {
        console.error("Error grading submission:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        res.status(500).json({ 
          message: "Failed to grade submission", 
          error: errorMessage,
          context: "Submission ID: " + req.params.id,
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