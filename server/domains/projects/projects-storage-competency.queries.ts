import {
  assessments,
  grades,
  submissions,
  type BestStandard,
} from "../../../shared/schema";
import { db } from "../../db";
import { eq, sql } from "drizzle-orm";
import { competencyStorage } from "../competencies";
import type {
  ComponentSkillWithDetailsDTO,
} from "../../../shared/contracts/api";
import type {
  LearnerOutcomeWithCompetencies,
  StudentCompetencyProgressRecord,
} from "./projects.storage.types";

export class ProjectsCompetencyQueries {
  async getComponentSkillsByIds(ids: number[]): Promise<ComponentSkillWithDetailsDTO[]> {
    return competencyStorage.getComponentSkillsByIds(ids);
  }

  async getComponentSkillsWithDetails(): Promise<ComponentSkillWithDetailsDTO[]> {
    return competencyStorage.getComponentSkillsWithDetails();
  }

  async getBestStandardsByIds(ids: number[]): Promise<BestStandard[]> {
    return competencyStorage.getBestStandardsByIds(ids);
  }

  async getLearnerOutcomesWithCompetencies(): Promise<LearnerOutcomeWithCompetencies[]> {
    return competencyStorage.getLearnerOutcomesWithCompetencies();
  }

  async getAssessmentsByMilestone(milestoneId: number): Promise<Array<Record<string, unknown>>> {
    return db.query.assessments.findMany({
      where: eq(assessments.milestoneId, milestoneId),
      with: {
        milestone: true,
      },
    });
  }

  async getStudentCompetencyProgress(studentId: number): Promise<StudentCompetencyProgressRecord[]> {
    return db
      .select({
        componentSkillId: grades.componentSkillId,
        componentSkillName: sql<string>`'Component Skill'`,
        averageScore: sql<number>`AVG(CAST(${grades.score} AS DECIMAL))`,
        submissionCount: sql<number>`COUNT(DISTINCT ${grades.submissionId})`,
      })
      .from(grades)
      .innerJoin(submissions, eq(grades.submissionId, submissions.id))
      .where(eq(submissions.studentId, studentId))
      .groupBy(grades.componentSkillId);
  }
}
