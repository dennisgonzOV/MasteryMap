import {
  assessments,
  submissions,
  grades,
  credentials,
  componentSkills,
  competencies,
  milestones,
  projects,
  users,
  type InsertSubmission,
  type Submission,
  type SubmissionWithAssessment,
} from "../../../shared/schema";
import { db } from "../../db";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import type {
  AssessmentSubmissionSummaryRecord,
  StudentAssessmentSubmissionRecord,
  SubmissionGradeSummaryRecord,
} from "./assessments.contracts";

export class AssessmentSubmissionQueries {
  constructor(
    private readonly getGradesBySubmission: (
      submissionId: number,
    ) => Promise<SubmissionGradeSummaryRecord[]>,
  ) {}

  async createSubmission(submission: InsertSubmission): Promise<Submission> {
    const [newSubmission] = await db.insert(submissions).values(submission).returning();
    return newSubmission;
  }

  async getSubmission(id: number): Promise<Submission | undefined> {
    const [submission] = await db.select().from(submissions).where(eq(submissions.id, id));
    return submission;
  }

  async getSubmissionsByStudent(studentId: number): Promise<SubmissionWithAssessment[]> {
    try {
      const submissionsWithAssessments = await db
        .select({
          id: submissions.id,
          assessmentId: submissions.assessmentId,
          studentId: submissions.studentId,
          responses: submissions.responses,
          artifacts: submissions.artifacts,
          submittedAt: submissions.submittedAt,
          gradedAt: submissions.gradedAt,
          feedback: submissions.feedback,
          aiGeneratedFeedback: submissions.aiGeneratedFeedback,
          isSelfEvaluation: submissions.isSelfEvaluation,
          selfEvaluationData: submissions.selfEvaluationData,
          assessment: assessments,
        })
        .from(submissions)
        .leftJoin(assessments, eq(submissions.assessmentId, assessments.id))
        .where(eq(submissions.studentId, studentId))
        .orderBy(desc(submissions.submittedAt));

      return Promise.all(
        submissionsWithAssessments.map(async (row) => {
          const submissionGrades = await this.getGradesBySubmission(row.id);
          const earnedCredentials = await db
            .select()
            .from(credentials)
            .where(eq(credentials.studentId, studentId))
            .orderBy(desc(credentials.awardedAt));

          return {
            id: row.id,
            assessmentId: row.assessmentId,
            studentId: row.studentId,
            responses: row.responses,
            artifacts: row.artifacts,
            submittedAt: row.submittedAt,
            gradedAt: row.gradedAt,
            feedback: row.feedback,
            aiGeneratedFeedback: row.aiGeneratedFeedback,
            isSelfEvaluation: row.isSelfEvaluation,
            selfEvaluationData: row.selfEvaluationData,
            assessment: row.assessment,
            grades: submissionGrades,
            earnedCredentials,
            status: submissionGrades.length > 0 ? "graded" : row.submittedAt ? "submitted" : "draft",
          };
        }),
      );
    } catch (error) {
      console.error("Error fetching submissions by student:", error);
      return [];
    }
  }

  async getSubmissionsByAssessment(assessmentId: number): Promise<AssessmentSubmissionSummaryRecord[]> {
    try {
      const result = await db
        .select()
        .from(submissions)
        .innerJoin(users, eq(submissions.studentId, users.id))
        .where(eq(submissions.assessmentId, assessmentId))
        .orderBy(desc(submissions.submittedAt));

      return Promise.all(
        result.map(async (row) => {
          const submissionGrades = await this.getGradesBySubmission(row.submissions.id);

          return {
            id: row.submissions.id,
            studentId: row.submissions.studentId,
            studentName: row.users.username,
            studentUsername: row.users.username,
            responses: row.submissions.responses,
            submittedAt: row.submissions.submittedAt,
            feedback: row.submissions.feedback,
            aiGeneratedFeedback: row.submissions.aiGeneratedFeedback,
            grades: submissionGrades,
          };
        }),
      );
    } catch (error) {
      console.error("Error in getSubmissionsByAssessment storage:", error);
      return [];
    }
  }

  async getStudentAssessmentSubmissions(studentId: number): Promise<StudentAssessmentSubmissionRecord[]> {
    const submissionResults = await db
      .select({
        id: submissions.id,
        assessmentId: submissions.assessmentId,
        assessmentTitle: assessments.title,
        assessmentDescription: assessments.description,
        questions: assessments.questions,
        responses: submissions.responses,
        submittedAt: submissions.submittedAt,
        feedback: submissions.feedback,
        projectTitle: projects.title,
        milestoneTitle: milestones.title,
      })
      .from(submissions)
      .innerJoin(assessments, eq(submissions.assessmentId, assessments.id))
      .leftJoin(milestones, eq(assessments.milestoneId, milestones.id))
      .leftJoin(projects, eq(milestones.projectId, projects.id))
      .where(eq(submissions.studentId, studentId))
      .orderBy(desc(submissions.submittedAt));

    return Promise.all(
      submissionResults.map(async (submission) => {
        const submissionGrades = await db
          .select({
            componentSkillId: grades.componentSkillId,
            gradedAt: grades.gradedAt,
          })
          .from(grades)
          .where(eq(grades.submissionId, submission.id));

        const earnedCredentials = [];
        if (submissionGrades.length > 0) {
          const componentSkillIds = submissionGrades
            .map((g) => g.componentSkillId)
            .filter((id): id is number => id !== null);
          const gradeDate = submissionGrades[0].gradedAt;

          if (gradeDate && componentSkillIds.length > 0) {
            const dayBefore = new Date(gradeDate.getTime() - 24 * 60 * 60 * 1000);
            const dayAfter = new Date(gradeDate.getTime() + 24 * 60 * 60 * 1000);

            const submissionCredentials = await db
              .select({
                id: credentials.id,
                title: credentials.title,
                description: credentials.description,
                type: credentials.type,
                awardedAt: credentials.awardedAt,
              })
              .from(credentials)
              .where(
                and(
                  eq(credentials.studentId, studentId),
                  inArray(credentials.componentSkillId, componentSkillIds),
                  gte(credentials.awardedAt, dayBefore),
                  sql`${credentials.awardedAt} <= ${dayAfter}`,
                ),
              );

            earnedCredentials.push(...submissionCredentials);
          }
        }

        const questionGrades = await db
          .select({
            id: grades.id,
            submissionId: grades.submissionId,
            componentSkillId: grades.componentSkillId,
            rubricLevel: grades.rubricLevel,
            score: grades.score,
            feedback: grades.feedback,
            gradedBy: grades.gradedBy,
            gradedAt: grades.gradedAt,
            componentSkillName: componentSkills.name,
            competencyName: competencies.name,
          })
          .from(grades)
          .leftJoin(componentSkills, eq(grades.componentSkillId, componentSkills.id))
          .leftJoin(competencies, eq(componentSkills.competencyId, competencies.id))
          .where(eq(grades.submissionId, submission.id));

        const isGraded = questionGrades.length > 0;

        return {
          ...submission,
          earnedCredentials,
          status: isGraded ? "graded" : submission.submittedAt ? "submitted" : "draft",
          questionGrades: questionGrades.reduce(
            (
              acc: Record<number, { score: number; rubricLevel: string | null; feedback: string | null }>,
              grade,
            ) => {
              if (grade.componentSkillId !== null) {
                acc[grade.componentSkillId] = {
                  score: grade.score ? parseFloat(grade.score) : 0,
                  rubricLevel: grade.rubricLevel,
                  feedback: grade.feedback,
                };
              }
              return acc;
            },
            {},
          ),
          grades: questionGrades,
        };
      }),
    );
  }

  async updateSubmission(id: number, updates: Partial<InsertSubmission>): Promise<Submission> {
    const [updatedSubmission] = await db
      .update(submissions)
      .set(updates)
      .where(eq(submissions.id, id))
      .returning();
    return updatedSubmission;
  }

  async hasSubmissions(assessmentId: number): Promise<boolean> {
    const [submission] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.assessmentId, assessmentId))
      .limit(1);
    return !!submission;
  }
}
