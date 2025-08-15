import {
  assessments,
  submissions,
  grades,
  selfEvaluations,
  users,
  componentSkills,
  competencies,
  type Assessment,
  type Submission,
  type Grade,
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

  // Student competency progress
  getStudentCompetencyProgress(studentId: number): Promise<Array<{
    competencyId: number;
    competencyName: string;
    componentSkillId: number;
    componentSkillName: string;
    averageScore: number;
    totalScores: number[];
    lastScore: number;
    lastUpdated: string;
    progressDirection: 'improving' | 'declining' | 'stable';
  }>>;
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

  // Student competency progress
  async getStudentCompetencyProgress(studentId: number): Promise<Array<{
    competencyId: number;
    competencyName: string;
    componentSkillId: number;
    componentSkillName: string;
    averageScore: number;
    totalScores: number[];
    lastScore: number;
    lastUpdated: string;
    progressDirection: 'improving' | 'declining' | 'stable';
  }>> {
    try {
      // Get all grades for the student with related component skills and competencies
      // Use separate queries to avoid Drizzle ORM field selection issues
      const allGrades = await db.select().from(grades);
      const allSubmissions = await db.select().from(submissions).where(eq(submissions.studentId, studentId));
      const allComponentSkills = await db.select().from(componentSkills);
      const allCompetencies = await db.select().from(competencies);

      // Filter grades for this student's submissions
      const submissionIds = allSubmissions.map(s => s.id);
      const studentGradesRaw = allGrades.filter(g => g.submissionId && submissionIds.includes(g.submissionId));

      // Create lookup maps
      const skillMap = new Map(allComponentSkills.map(s => [s.id, s]));
      const competencyMap = new Map(allCompetencies.map(c => [c.id, c]));

      // Enrich grades with related data
      const studentGrades = studentGradesRaw.map(grade => {
        const skill = skillMap.get(grade.componentSkillId || 0);
        const competency = skill?.competencyId ? competencyMap.get(skill.competencyId) : null;

        return {
          gradeId: grade.id,
          score: grade.score,
          gradedAt: grade.gradedAt,
          componentSkillId: grade.componentSkillId,
          componentSkillName: skill?.name || 'Unknown Skill',
          competencyId: competency?.id || 0,
          competencyName: competency?.name || 'Unknown Competency',
          submissionId: grade.submissionId,
        };
      }).sort((a, b) => new Date(b.gradedAt || 0).getTime() - new Date(a.gradedAt || 0).getTime());

      // Group by competency and component skill
      const progressMap = new Map<string, {
        competencyId: number;
        competencyName: string;
        componentSkillId: number;
        componentSkillName: string;
        scores: { score: number; date: Date }[];
      }>();

      studentGrades.forEach(grade => {
        const key = `${grade.competencyId}-${grade.componentSkillId}`;
        const score = Number(grade.score) || 0;

        if (!progressMap.has(key)) {
          progressMap.set(key, {
            competencyId: grade.competencyId || 0,
            competencyName: grade.competencyName,
            componentSkillId: grade.componentSkillId || 0,
            componentSkillName: grade.componentSkillName,
            scores: [],
          });
        }

        progressMap.get(key)!.scores.push({
          score,
          date: grade.gradedAt || new Date(),
        });
      });

      // Calculate progress metrics for each competency/component skill
      const results = Array.from(progressMap.values()).map(item => {
        // Sort scores by date (most recent first)
        item.scores.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const totalScores = item.scores.map(s => s.score);
        const averageScore = totalScores.length > 0 ? 
          Math.round(totalScores.reduce((sum, score) => sum + score, 0) / totalScores.length) : 0;

        const lastScore = totalScores[0] || 0;
        const secondLastScore = totalScores[1];

        // Determine progress direction
        let progressDirection: 'improving' | 'declining' | 'stable' = 'stable';
        if (totalScores.length > 1 && secondLastScore !== undefined) {
          if (lastScore > secondLastScore + 5) { // 5-point threshold for improvement
            progressDirection = 'improving';
          } else if (lastScore < secondLastScore - 5) { // 5-point threshold for decline
            progressDirection = 'declining';
          }
        }

        const lastUpdated = item.scores[0]?.date?.toISOString() || new Date().toISOString();

        return {
          competencyId: item.competencyId,
          competencyName: item.competencyName,
          componentSkillId: item.componentSkillId,
          componentSkillName: item.componentSkillName,
          averageScore,
          totalScores,
          lastScore,
          lastUpdated,
          progressDirection,
        };
      });

      return results.sort((a, b) => a.competencyName.localeCompare(b.competencyName));
    } catch (error) {
      console.error("Error fetching student competency progress:", error);
      return [];
    }
  }
}

export const assessmentStorage = new AssessmentStorage();