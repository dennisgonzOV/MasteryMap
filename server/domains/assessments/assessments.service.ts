import { assessmentStorage, type IAssessmentStorage } from './assessments.storage';
import {
  type Assessment,
  type ComponentSkill,
  type Credential,
  type InsertSelfEvaluation,
  type Submission,
  type SubmissionWithAssessment,
  type Grade,
  InsertAssessment,
  InsertSubmission,
  insertAssessmentSchema,
  insertSubmissionSchema
} from "../../../shared/schema";
import type {
  AssessmentCreateRequestDTO,
  SubmissionGradeItemDTO,
  SubmissionCreateRequestDTO,
} from '../../../shared/contracts/api';
import { aiService } from '../ai';
import {
  assessmentProjectGateway,
  type AssessmentProjectGateway,
} from "./assessment-project-gateway";
import type {
  AssessmentSubmissionSummaryRecord,
  GradeUpdateInput,
  SchoolComponentSkillProgressDTO,
  SchoolSkillsStatsDTO,
  StudentAssessmentSubmissionRecord,
  SubmissionGradeRecord,
  SubmissionGradeSummaryRecord,
  UpcomingDeadlineDTO,
} from "./assessments.contracts";

export class AssessmentService {
  constructor(
    private storage: IAssessmentStorage = assessmentStorage,
    private projectGateway: AssessmentProjectGateway = assessmentProjectGateway,
  ) { }

  // Assessment business logic
  async createAssessment(data: AssessmentCreateRequestDTO): Promise<Assessment> {
    // Handle date conversion manually
    const { dueDate, ...bodyData } = data;

    // Additional validation for teacher assessments
    if (bodyData.assessmentType === "teacher") {
      if (!bodyData.questions || !Array.isArray(bodyData.questions) || bodyData.questions.length === 0) {
        throw new Error("Teacher assessments must have at least one question");
      }

      // Check for questions with empty text
      const emptyQuestions = bodyData.questions.filter(
        (q): boolean => typeof q?.text !== "string" || q.text.trim().length === 0,
      );
      if (emptyQuestions.length > 0) {
        throw new Error("All questions in teacher assessments must have non-empty text");
      }
    }

    // Ensure questions have proper IDs
    if (bodyData.questions && Array.isArray(bodyData.questions)) {
      bodyData.questions = bodyData.questions.map((question, index: number) => ({
        ...question,
        id: question.id || `q_${Date.now()}_${index}` // Generate ID if missing
      }));
    }

    const assessmentData = insertAssessmentSchema.parse({
      ...bodyData,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      createdBy: data.createdBy // Ensure this is passed through
    });

    // Ensure componentSkillIds is properly handled
    let componentSkillIds: number[] = [];
    if (assessmentData.componentSkillIds) {
      if (Array.isArray(assessmentData.componentSkillIds)) {
        componentSkillIds = assessmentData.componentSkillIds.filter(
          (id): id is number => typeof id === "number",
        );
      } else if (typeof assessmentData.componentSkillIds === 'object') {
        // Handle Drizzle returning object for generic jsonb - cast to unknown first to break type checking
        const rawSkills = assessmentData.componentSkillIds as unknown;
        componentSkillIds = Object.values(rawSkills as Record<string, unknown>).filter((id): id is number => typeof id === 'number');
      }
    }

    const assessmentToCreate = {
      ...assessmentData,
      componentSkillIds,
      createdBy: assessmentData.createdBy
    };

    return await this.storage.createAssessment(assessmentToCreate);
  }

  async getAssessment(id: number): Promise<Assessment | undefined> {
    return await this.storage.getAssessment(id);
  }

  async getAssessmentsByMilestone(milestoneId: number): Promise<Assessment[]> {
    return await this.storage.getAssessmentsByMilestone(milestoneId);
  }

  async getAssessmentsForTeacher(teacherId: number): Promise<Assessment[]> {
    return await this.storage.getAssessmentsForTeacher(teacherId);
  }

  async getAssessmentsForSchool(schoolId: number): Promise<Assessment[]> {
    return await this.storage.getAssessmentsForSchool(schoolId);
  }

  async getStandaloneAssessments(): Promise<Assessment[]> {
    return await this.storage.getStandaloneAssessments();
  }

  async getAllAssessments(): Promise<Assessment[]> {
    return await this.storage.getAllAssessments();
  }

  async updateAssessment(id: number, updates: Partial<InsertAssessment> & { dueDate?: string | Date }): Promise<Assessment> {
    const formattedUpdates = { ...updates };
    if (formattedUpdates.dueDate && typeof formattedUpdates.dueDate === 'string') {
      formattedUpdates.dueDate = new Date(formattedUpdates.dueDate);
    }
    if (formattedUpdates.dueDate) {
      const expiresAt = new Date(formattedUpdates.dueDate as Date);
      expiresAt.setDate(expiresAt.getDate() + 7);
      formattedUpdates.shareCodeExpiresAt = expiresAt;
    }
    return await this.storage.updateAssessment(id, formattedUpdates);
  }

  async deleteAssessment(id: number): Promise<void> {
    return await this.storage.deleteAssessment(id);
  }

  async hasSubmissions(assessmentId: number): Promise<boolean> {
    return await this.storage.hasSubmissions(assessmentId);
  }

  // Share code business logic
  async generateShareCode(assessmentId: number): Promise<{ shareCode: string; message: string }> {
    const assessment = await this.storage.getAssessment(assessmentId);

    if (!assessment) {
      throw new Error("Assessment not found");
    }

    const shareCode = await this.storage.generateShareCode(assessmentId);

    return {
      shareCode,
      message: "Share code generated successfully"
    };
  }

  async getAssessmentByShareCode(shareCode: string): Promise<Assessment> {
    if (shareCode.length !== 5) {
      throw new Error("Invalid share code format");
    }

    const assessment = await this.storage.getAssessmentByShareCode(shareCode.toUpperCase());

    if (!assessment) {
      throw new Error("Assessment not found with this code");
    }

    // Check if the code has expired (if expiration is set)
    if (assessment.shareCodeExpiresAt && new Date() > new Date(assessment.shareCodeExpiresAt)) {
      throw new Error("This share code has expired");
    }

    return assessment;
  }

  async regenerateShareCode(assessmentId: number): Promise<{ shareCode: string; message: string }> {
    const assessment = await this.storage.getAssessment(assessmentId);

    if (!assessment) {
      throw new Error("Assessment not found");
    }

    const newShareCode = await this.storage.regenerateShareCode(assessmentId);

    const baseDate = assessment.dueDate ? new Date(assessment.dueDate) : new Date();
    const expiresAt = new Date(baseDate);
    expiresAt.setDate(expiresAt.getDate() + 7);
    await this.storage.updateAssessment(assessmentId, { shareCodeExpiresAt: expiresAt });

    return {
      shareCode: newShareCode,
      message: "Share code regenerated successfully"
    };
  }

  // Submission business logic
  async createSubmission(data: SubmissionCreateRequestDTO, studentId: number): Promise<Submission> {
    const submissionData = insertSubmissionSchema.parse({
      ...data,
      studentId,
    });

    return await this.storage.createSubmission(submissionData);
  }

  async getSubmission(id: number): Promise<Submission | undefined> {
    return await this.storage.getSubmission(id);
  }

  async getSubmissionsByStudent(studentId: number): Promise<SubmissionWithAssessment[]> {
    return await this.storage.getSubmissionsByStudent(studentId);
  }

  async getSubmissionsByAssessment(assessmentId: number): Promise<AssessmentSubmissionSummaryRecord[]> {
    try {
      // Validate input
      if (!assessmentId || isNaN(assessmentId)) {
        return [];
      }

      const submissions = await this.storage.getSubmissionsByAssessment(assessmentId);
      const assessment = await this.storage.getAssessment(assessmentId);

      if (!submissions || submissions.length === 0) {
        return [];
      }

      // Add enhanced data including grades and late status
      const enhancedSubmissions = await Promise.all(
        submissions.map(async (submission) => {
          try {
            // Ensure submission has required properties
            if (!submission || !submission.id) {
              return null;
            }

            const grades = await this.storage.getGradesBySubmission(submission.id);

            return {
              ...submission,
              answers: submission.responses || {},
              grades: grades || [],
              isLate: assessment?.dueDate && submission.submittedAt
                ? new Date(submission.submittedAt) > new Date(assessment.dueDate)
                : false
            };
          } catch (_error) {
            return {
              ...submission,
              answers: submission?.responses || {},
              grades: [],
              isLate: false
            };
          }
        })
      );

      // Filter out null submissions
      return enhancedSubmissions.filter(submission => submission !== null);
    } catch (_error) {
      return []; // Return empty array instead of throwing
    }
  }

  async getStudentCompetencyProgress(studentId: number) {
    return this.storage.getStudentCompetencyProgress(studentId);
  }

  async getStudentAssessmentSubmissions(studentId: number): Promise<StudentAssessmentSubmissionRecord[]> {
    return this.storage.getStudentAssessmentSubmissions(studentId);
  }

  async updateSubmission(id: number, updates: Partial<InsertSubmission>): Promise<Submission> {
    return await this.storage.updateSubmission(id, updates);
  }

  // Grade business logic
  async createGrade(grade: Omit<Grade, "id" | "gradedAt">): Promise<Grade> {
    return await this.storage.createGrade(grade);
  }

  async getGradesBySubmission(submissionId: number): Promise<SubmissionGradeSummaryRecord[]> {
    return await this.storage.getGradesBySubmission(submissionId);
  }

  // Self-evaluation business logic
  async getSelfEvaluationsByAssessment(assessmentId: number) {
    return await this.storage.getSelfEvaluationsByAssessment(assessmentId);
  }

  async createSelfEvaluation(data: InsertSelfEvaluation) {
    return await this.storage.createSelfEvaluation(data);
  }

  async getSelfEvaluationsByStudent(studentId: number) {
    return await this.storage.getSelfEvaluationsByStudent(studentId);
  }

  async flagRiskySelfEvaluation(id: number, flagged: boolean): Promise<void> {
    return await this.storage.flagRiskySelfEvaluation(id, flagged);
  }

  // Teacher-specific methods for school skills tracking
  async getSchoolComponentSkillsProgress(teacherId: number): Promise<SchoolComponentSkillProgressDTO[]> {
    return await this.storage.getSchoolComponentSkillsProgress(teacherId);
  }

  async getSchoolSkillsStats(teacherId: number): Promise<SchoolSkillsStatsDTO> {
    return await this.storage.getSchoolSkillsStats(teacherId);
  }

  async getComponentSkill(id: number): Promise<ComponentSkill | undefined> {
    return await this.storage.getComponentSkill(id);
  }

  async generateComponentSkillGrades(
    submission: Submission,
    assessment: Assessment,
    componentSkills: ComponentSkill[],
    pdfContent?: string,
  ): Promise<SubmissionGradeItemDTO[]> {
    return await aiService.generateComponentSkillGrades(submission, assessment, componentSkills, pdfContent);
  }

  async generateStudentFeedback(
    submission: Submission,
    grades: Array<SubmissionGradeRecord | SubmissionGradeItemDTO>,
  ): Promise<string> {
    return await aiService.generateStudentFeedback(submission, grades);
  }

  async generateFeedbackForQuestion(question: string, response: string, rubricLevel: string): Promise<string> {
    const aiFeedbackService = aiService as unknown as {
      generateFeedbackForQuestion?: (
        questionText: string,
        studentResponse: string,
        rubric: string,
      ) => Promise<string>;
    };

    if (!aiFeedbackService.generateFeedbackForQuestion) {
      throw new Error("Question feedback generation is not configured");
    }

    return aiFeedbackService.generateFeedbackForQuestion(question, response, rubricLevel);
  }

  async getExistingGrade(submissionId: number, componentSkillId: number): Promise<Grade | undefined> {
    return await this.storage.getExistingGrade(submissionId, componentSkillId);
  }

  async updateGrade(gradeId: number, updates: GradeUpdateInput): Promise<Grade> {
    return await this.storage.updateGrade(gradeId, updates);
  }

  async awardStickersForGrades(studentId: number, grades: SubmissionGradeRecord[]): Promise<Credential[]> {
    return await this.storage.awardStickersForGrades(studentId, grades);
  }

  async getUpcomingDeadlines(projectIds: number[]): Promise<UpcomingDeadlineDTO[]> {
    return await this.storage.getUpcomingDeadlines(projectIds);
  }

  async generateAssessmentForMilestone(
    milestoneId: number,
    userId: number,
    userRole: string,
    userTier?: string,
  ) {
    const milestone = await this.projectGateway.getMilestone(milestoneId);

    if (!milestone) {
      throw new Error("Milestone not found");
    }

    const mustOwnProject =
      (userRole === "teacher" || (userRole === "admin" && userTier === "free")) &&
      Boolean(milestone.projectId);
    if (mustOwnProject && milestone.projectId) {
      const project = await this.projectGateway.getProject(milestone.projectId);
      if (!project || project.teacherId !== userId) {
        throw new Error("Access denied");
      }
    }

    const assessmentData = await aiService.generateAssessment(milestone);
    return this.createAssessment({
      milestoneId,
      title: assessmentData.title,
      description: assessmentData.description,
      questions: assessmentData.questions,
      aiGenerated: true,
      createdBy: userId,
    });
  }
}
