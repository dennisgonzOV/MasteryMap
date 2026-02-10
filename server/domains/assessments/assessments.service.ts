import { assessmentStorage, type IAssessmentStorage } from './assessments.storage';
import {
  type Assessment,
  type Submission,
  type SubmissionWithAssessment,
  type Grade,
  InsertAssessment,
  InsertSubmission,
  insertAssessmentSchema,
  insertSubmissionSchema
} from "../../../shared/schema";

export class AssessmentService {
  constructor(private storage: IAssessmentStorage = assessmentStorage) { }

  // Assessment business logic
  async createAssessment(data: any): Promise<Assessment> {
    // Handle date conversion manually
    const { dueDate, ...bodyData } = data;

    // Additional validation for teacher assessments
    if (bodyData.assessmentType === "teacher") {
      if (!bodyData.questions || !Array.isArray(bodyData.questions) || bodyData.questions.length === 0) {
        throw new Error("Teacher assessments must have at least one question");
      }

      // Check for questions with empty text
      const emptyQuestions = bodyData.questions.filter((q: any) => !q.text || q.text.trim().length === 0);
      if (emptyQuestions.length > 0) {
        throw new Error("All questions in teacher assessments must have non-empty text");
      }
    }

    // Ensure questions have proper IDs
    if (bodyData.questions && Array.isArray(bodyData.questions)) {
      bodyData.questions = bodyData.questions.map((question: any, index: number) => ({
        ...question,
        id: question.id || `q_${Date.now()}_${index}` // Generate ID if missing
      }));
    }

    const assessmentData = insertAssessmentSchema.parse({
      ...bodyData,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      createdBy: data.createdBy // Ensure this is passed through
    });

    console.log("Creating assessment with questions:", assessmentData.questions);

    // Ensure componentSkillIds is properly handled
    let componentSkillIds: number[] = [];
    if (assessmentData.componentSkillIds) {
      if (Array.isArray(assessmentData.componentSkillIds)) {
        componentSkillIds = assessmentData.componentSkillIds;
      } else if (typeof assessmentData.componentSkillIds === 'object') {
        // Handle Drizzle returning object for generic jsonb - cast to unknown first to break type checking
        const rawSkills = assessmentData.componentSkillIds as unknown;
        componentSkillIds = Object.values(rawSkills as Record<string, unknown>).filter((id): id is number => typeof id === 'number');
      }
    }

    if (componentSkillIds.length === 0) {
      console.warn('Project created without component skills');
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
      (formattedUpdates as any).shareCodeExpiresAt = expiresAt;
    }
    return await this.storage.updateAssessment(id, formattedUpdates as any);
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
    await this.storage.updateAssessment(assessmentId, { shareCodeExpiresAt: expiresAt } as any);

    return {
      shareCode: newShareCode,
      message: "Share code regenerated successfully"
    };
  }

  // Submission business logic
  async createSubmission(data: any, studentId: number): Promise<Submission> {
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

  async getSubmissionsByAssessment(assessmentId: number): Promise<any[]> {
    try {
      // Validate input
      if (!assessmentId || isNaN(assessmentId)) {
        console.error("Invalid assessmentId:", assessmentId);
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
              console.error("Invalid submission object:", submission);
              return null;
            }

            const grades = await this.storage.getGradesBySubmission(submission.id);

            console.log(`Submission ${submission.id} has ${grades?.length || 0} grades:`, grades);

            return {
              ...submission,
              answers: submission.responses || {},
              grades: grades || [],
              isLate: assessment?.dueDate && submission.submittedAt
                ? new Date(submission.submittedAt) > new Date(assessment.dueDate)
                : false
            };
          } catch (error) {
            console.error(`Error processing submission ${submission?.id}:`, error);
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
    } catch (error) {
      console.error("Error in getSubmissionsByAssessment service:", error);
      return []; // Return empty array instead of throwing
    }
  }

  async updateSubmission(id: number, updates: Partial<InsertSubmission>): Promise<Submission> {
    return await this.storage.updateSubmission(id, updates);
  }

  // Grade business logic
  async createGrade(grade: Omit<Grade, "id" | "gradedAt">): Promise<Grade> {
    return await this.storage.createGrade(grade);
  }

  async getGradesBySubmission(submissionId: number): Promise<Grade[]> {
    return await this.storage.getGradesBySubmission(submissionId);
  }

  // Self-evaluation business logic
  async getSelfEvaluationsByAssessment(assessmentId: number): Promise<any[]> {
    return await this.storage.getSelfEvaluationsByAssessment(assessmentId);
  }

  // Teacher-specific methods for school skills tracking
  async getSchoolComponentSkillsProgress(teacherId: number): Promise<any[]> {
    return await this.storage.getSchoolComponentSkillsProgress(teacherId);
  }

  async getSchoolSkillsStats(teacherId: number): Promise<any> {
    return await this.storage.getSchoolSkillsStats(teacherId);
  }

  async getComponentSkill(id: number): Promise<any> {
    return await this.storage.getComponentSkill(id);
  }

  async generateComponentSkillGrades(submission: any, assessment: any, componentSkills: any[], pdfContent?: string): Promise<any[]> {
    return await this.storage.generateComponentSkillGrades(submission, assessment, componentSkills, pdfContent);
  }

  async generateStudentFeedback(submission: any, grades: any[]): Promise<string> {
    return await this.storage.generateStudentFeedback(submission, grades);
  }

  async getExistingGrade(submissionId: number, componentSkillId: number): Promise<any> {
    return await this.storage.getExistingGrade(submissionId, componentSkillId);
  }

  async updateGrade(gradeId: number, updates: any): Promise<any> {
    return await this.storage.updateGrade(gradeId, updates);
  }

  async awardStickersForGrades(studentId: number, grades: any[]): Promise<any[]> {
    return await this.storage.awardStickersForGrades(studentId, grades);
  }

  async getUpcomingDeadlines(projectIds: number[]): Promise<any[]> {
    return await this.storage.getUpcomingDeadlines(projectIds);
  }
}

export const assessmentService = new AssessmentService();