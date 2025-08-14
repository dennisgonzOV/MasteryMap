import {
  assessments,
  submissions,
  grades,
  selfEvaluations,
  users,
  type Assessment,
  type Submission,
  type Grade,
  type SelfEvaluation,
  InsertAssessment,
  InsertSubmission,
} from "../../../shared/schema";
import { db } from "../../db";
import { eq, and, desc, asc, isNull, inArray, ne, sql, like, or } from "drizzle-orm";

// Utility function to generate random 5-letter codes
function generateRandomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Interface for assessment-related storage operations
export interface IAssessmentStorage {
  // Assessment operations
  createAssessment(assessment: InsertAssessment): Promise<Assessment>;
  getAssessment(id: number): Promise<Assessment | undefined>;
  getAssessmentsByMilestone(milestoneId: number): Promise<Assessment[]>;
  getStandaloneAssessments(): Promise<Assessment[]>;
  getAllAssessments(): Promise<Assessment[]>;
  updateAssessment(id: number, updates: Partial<InsertAssessment>): Promise<Assessment>;
  deleteAssessment(id: number): Promise<void>;

  // Share code operations
  generateShareCode(assessmentId: number): Promise<string>;
  getAssessmentByShareCode(shareCode: string): Promise<Assessment | undefined>;
  regenerateShareCode(assessmentId: number): Promise<string>;

  // Submission operations
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  getSubmission(id: number): Promise<Submission | undefined>;
  getSubmissionsByStudent(studentId: number): Promise<Submission[]>;
  getSubmissionsByAssessment(assessmentId: number): Promise<any[]>;
  updateSubmission(id: number, updates: Partial<InsertSubmission>): Promise<Submission>;

  // Grade operations
  createGrade(grade: Omit<Grade, "id" | "gradedAt">): Promise<Grade>;
  getGradesBySubmission(submissionId: number): Promise<Grade[]>;

  // Self-evaluation operations
  getSelfEvaluationsByAssessment(assessmentId: number): Promise<SelfEvaluation[]>;
}

export class AssessmentStorage implements IAssessmentStorage {
  // Assessment operations
  async createAssessment(data: InsertAssessment): Promise<Assessment> {
    // Generate a unique share code
    let shareCode: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      shareCode = generateRandomCode();
      attempts++;

      // Check if code already exists
      const [existing] = await db
        .select()
        .from(assessments)
        .where(eq(assessments.shareCode, shareCode))
        .limit(1);

      if (!existing) {
        break;
      }

      if (attempts >= maxAttempts) {
        throw new Error('Unable to generate unique share code');
      }
    } while (true);

    // Calculate expiration date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Ensure questions with options have them properly serialized
    const processedData = {
      ...data,
      questions: data.questions || [],
      shareCode,
      shareCodeExpiresAt: expiresAt
    };

    const [assessment] = await db.insert(assessments).values(processedData).returning();
    return assessment;
  }

  async getAssessment(id: number): Promise<Assessment | undefined> {
    const [assessment] = await db.select().from(assessments).where(eq(assessments.id, id));
    return assessment;
  }

  async getAssessmentsByMilestone(milestoneId: number): Promise<Assessment[]> {
    return await db
      .select()
      .from(assessments)
      .where(eq(assessments.milestoneId, milestoneId))
      .orderBy(desc(assessments.createdAt));
  }

  async getStandaloneAssessments(): Promise<Assessment[]> {
    return await db
      .select()
      .from(assessments)
      .where(sql`${assessments.milestoneId} IS NULL`)
      .orderBy(desc(assessments.createdAt));
  }

  async getAllAssessments(): Promise<Assessment[]> {
    return await db
      .select()
      .from(assessments)
      .orderBy(desc(assessments.createdAt));
  }

  async updateAssessment(id: number, updates: Partial<InsertAssessment>): Promise<Assessment> {
    const [updatedAssessment] = await db
      .update(assessments)
      .set(updates)
      .where(eq(assessments.id, id))
      .returning();
    return updatedAssessment;
  }

  async deleteAssessment(id: number): Promise<void> {
    await db.delete(assessments).where(eq(assessments.id, id));
  }

  // Share code operations
  async generateShareCode(assessmentId: number): Promise<string> {
    let shareCode: string;
    let attempts = 0;
    const maxAttempts = 10;

    // Try to generate a unique code
    do {
      shareCode = generateRandomCode();
      attempts++;

      // Check if code already exists
      const [existing] = await db
        .select()
        .from(assessments)
        .where(eq(assessments.shareCode, shareCode))
        .limit(1);

      if (!existing) {
        break;
      }

      if (attempts >= maxAttempts) {
        throw new Error('Unable to generate unique share code');
      }
    } while (true);

    // Update the assessment with the new share code
    await db
      .update(assessments)
      .set({ shareCode })
      .where(eq(assessments.id, assessmentId));

    return shareCode;
  }

  async getAssessmentByShareCode(shareCode: string): Promise<Assessment | undefined> {
    const [assessment] = await db
      .select()
      .from(assessments)
      .where(eq(assessments.shareCode, shareCode))
      .limit(1);

    return assessment;
  }

  async regenerateShareCode(assessmentId: number): Promise<string> {
    return this.generateShareCode(assessmentId);
  }

  // Submission operations
  async createSubmission(submission: InsertSubmission): Promise<Submission> {
    const [newSubmission] = await db
      .insert(submissions)
      .values(submission)
      .returning();
    return newSubmission;
  }

  async getSubmission(id: number): Promise<Submission | undefined> {
    const [submission] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, id));
    return submission;
  }

  async getSubmissionsByStudent(studentId: number): Promise<Submission[]> {
    return await db
      .select()
      .from(submissions)
      .where(eq(submissions.studentId, studentId))
      .orderBy(desc(submissions.submittedAt));
  }

  async getSubmissionsByAssessment(assessmentId: number): Promise<any[]> {
    return await db
      .select({
        id: submissions.id,
        assessmentId: submissions.assessmentId,
        studentId: submissions.studentId,
        responses: submissions.responses,
        submittedAt: submissions.submittedAt,
        studentName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        studentEmail: users.email,
      })
      .from(submissions)
      .innerJoin(users, eq(submissions.studentId, users.id))
      .where(eq(submissions.assessmentId, assessmentId))
      .orderBy(desc(submissions.submittedAt));
  }

  async updateSubmission(id: number, updates: Partial<InsertSubmission>): Promise<Submission> {
    const [updatedSubmission] = await db
      .update(submissions)
      .set(updates)
      .where(eq(submissions.id, id))
      .returning();
    return updatedSubmission;
  }

  // Grade operations
  async createGrade(grade: Omit<Grade, "id" | "gradedAt">): Promise<Grade> {
    const [newGrade] = await db
      .insert(grades)
      .values(grade)
      .returning();
    return newGrade;
  }

  async getGradesBySubmission(submissionId: number): Promise<Grade[]> {
    return await db
      .select()
      .from(grades)
      .where(eq(grades.submissionId, submissionId))
      .orderBy(desc(grades.gradedAt));
  }

  // Self-evaluation operations
  async getSelfEvaluationsByAssessment(assessmentId: number): Promise<SelfEvaluation[]> {
    return await db.select()
      .from(selfEvaluations)
      .where(eq(selfEvaluations.assessmentId, assessmentId))
      .orderBy(desc(selfEvaluations.submittedAt));
  }
}

export const assessmentStorage = new AssessmentStorage();