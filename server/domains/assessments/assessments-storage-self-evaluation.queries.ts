import { selfEvaluations, type SelfEvaluation } from "../../../shared/schema";
import { db } from "../../db";
import { desc, eq } from "drizzle-orm";
import type { SelfEvaluationCreateInput } from "./assessments.contracts";

export class AssessmentSelfEvaluationQueries {
  async getSelfEvaluationsByAssessment(assessmentId: number): Promise<SelfEvaluation[]> {
    return db
      .select()
      .from(selfEvaluations)
      .where(eq(selfEvaluations.assessmentId, assessmentId))
      .orderBy(desc(selfEvaluations.submittedAt));
  }

  async createSelfEvaluation(data: SelfEvaluationCreateInput): Promise<SelfEvaluation> {
    const [result] = await db.insert(selfEvaluations).values(data).returning();
    return result;
  }

  async getSelfEvaluationsByStudent(studentId: number): Promise<SelfEvaluation[]> {
    return db
      .select()
      .from(selfEvaluations)
      .where(eq(selfEvaluations.studentId, studentId))
      .orderBy(desc(selfEvaluations.submittedAt));
  }

  async flagRiskySelfEvaluation(id: number, flagged: boolean): Promise<void> {
    await db
      .update(selfEvaluations)
      .set({ hasRiskyContent: flagged, teacherNotified: flagged })
      .where(eq(selfEvaluations.id, id));
  }
}
