import {
  assessments,
  submissions,
  selfEvaluations,
  milestones,
  projects,
  users,
  type Assessment,
  type InsertAssessment,
} from "../../../shared/schema";
import { db } from "../../db";
import { eq, and, desc, isNull, sql, or } from "drizzle-orm";

type ErrorWithCode = { code?: string };

function hasErrorCode(error: unknown): error is ErrorWithCode {
  return typeof error === "object" && error !== null && "code" in error;
}

function generateRandomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export class AssessmentAssessmentQueries {
  async createAssessment(data: InsertAssessment): Promise<Assessment> {
    let shareCode = "";
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      shareCode = generateRandomCode();
      attempts++;

      const [existing] = await db
        .select()
        .from(assessments)
        .where(eq(assessments.shareCode, shareCode))
        .limit(1);

      if (!existing) {
        break;
      }
    }

    if (attempts >= maxAttempts) {
      throw new Error("Unable to generate unique share code after maximum attempts");
    }

    const baseDate = data.dueDate ? new Date(data.dueDate) : new Date();
    const expiresAt = new Date(baseDate);
    expiresAt.setDate(expiresAt.getDate() + 7);

    const processedData = {
      ...data,
      questions: data.questions || [],
      shareCode,
      shareCodeExpiresAt: expiresAt,
      createdBy: data.createdBy,
    };

    const [assessment] = await db.insert(assessments).values(processedData).returning();
    return assessment;
  }

  async getAssessment(id: number): Promise<Assessment | undefined> {
    const [assessment] = await db.select().from(assessments).where(eq(assessments.id, id));
    return assessment;
  }

  async getAssessmentsByMilestone(milestoneId: number): Promise<Assessment[]> {
    return db
      .select()
      .from(assessments)
      .where(eq(assessments.milestoneId, milestoneId))
      .orderBy(desc(assessments.createdAt));
  }

  async getAssessmentsForTeacher(teacherId: number): Promise<Assessment[]> {
    const rows = await db
      .select({ assessment: assessments })
      .from(assessments)
      .leftJoin(milestones, eq(assessments.milestoneId, milestones.id))
      .leftJoin(projects, eq(milestones.projectId, projects.id))
      .where(
        or(
          eq(assessments.createdBy, teacherId),
          and(isNull(assessments.createdBy), eq(projects.teacherId, teacherId)),
        ),
      )
      .orderBy(desc(assessments.createdAt));

    return rows.map((row) => row.assessment);
  }

  async getAssessmentsForSchool(schoolId: number): Promise<Assessment[]> {
    const rows = await db
      .select({ assessment: assessments })
      .from(assessments)
      .leftJoin(users, eq(assessments.createdBy, users.id))
      .leftJoin(milestones, eq(assessments.milestoneId, milestones.id))
      .leftJoin(projects, eq(milestones.projectId, projects.id))
      .where(or(eq(users.schoolId, schoolId), eq(projects.schoolId, schoolId)))
      .orderBy(desc(assessments.createdAt));

    return rows.map((row) => row.assessment);
  }

  async getStandaloneAssessments(): Promise<Assessment[]> {
    return db
      .select()
      .from(assessments)
      .where(sql`${assessments.milestoneId} IS NULL`)
      .orderBy(desc(assessments.createdAt));
  }

  async getAllAssessments(): Promise<Assessment[]> {
    return db.select().from(assessments).orderBy(desc(assessments.createdAt));
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
    await db.delete(selfEvaluations).where(eq(selfEvaluations.assessmentId, id));
    await db.delete(submissions).where(eq(submissions.assessmentId, id));
    await db.delete(assessments).where(eq(assessments.id, id));
  }

  async generateShareCode(assessmentId: number): Promise<string> {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const shareCode = generateRandomCode();
      attempts++;

      try {
        const [existing] = await db
          .select()
          .from(assessments)
          .where(eq(assessments.shareCode, shareCode))
          .limit(1);

        if (!existing) {
          await db
            .update(assessments)
            .set({ shareCode })
            .where(eq(assessments.id, assessmentId));

          return shareCode;
        }
      } catch (error: unknown) {
        if (hasErrorCode(error) && error.code === "23505") {
          continue;
        }
        throw error;
      }
    }

    throw new Error("Unable to generate unique share code after maximum attempts");
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
}
