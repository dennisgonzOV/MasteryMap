import {
  type Assessment,
  type Grade,
  type InsertAssessment,
  type InsertSubmission,
  type SelfEvaluation,
  type Submission,
  type SubmissionWithAssessment,
} from "../../../shared/schema";
import type {
  AssessmentSubmissionSummaryRecord,
  ComponentSkillRecord,
  CredentialRecord,
  GradeUpdateInput,
  SchoolComponentSkillProgressDTO,
  SchoolSkillsStatsDTO,
  SelfEvaluationCreateInput,
  StudentAssessmentSubmissionRecord,
  StudentCompetencyProgressRecord,
  SubmissionGradeRecord,
  SubmissionGradeSummaryRecord,
  UpcomingDeadlineDTO,
} from "./assessments.contracts";
import { AssessmentAnalyticsQueries } from "./assessments-storage-analytics.queries";
import { AssessmentAssessmentQueries } from "./assessments-storage-assessment.queries";
import { AssessmentGradeQueries } from "./assessments-storage-grade.queries";
import { AssessmentSelfEvaluationQueries } from "./assessments-storage-self-evaluation.queries";
import { AssessmentSubmissionQueries } from "./assessments-storage-submission.queries";

export interface IAssessmentStorage {
  createAssessment(assessment: InsertAssessment): Promise<Assessment>;
  getAssessment(id: number): Promise<Assessment | undefined>;
  getAssessmentsByMilestone(milestoneId: number): Promise<Assessment[]>;
  getAssessmentsForTeacher(teacherId: number): Promise<Assessment[]>;
  getAssessmentsForSchool(schoolId: number): Promise<Assessment[]>;
  getStandaloneAssessments(): Promise<Assessment[]>;
  getAllAssessments(): Promise<Assessment[]>;
  updateAssessment(id: number, updates: Partial<InsertAssessment>): Promise<Assessment>;
  deleteAssessment(id: number): Promise<void>;

  generateShareCode(assessmentId: number): Promise<string>;
  getAssessmentByShareCode(shareCode: string): Promise<Assessment | undefined>;
  regenerateShareCode(assessmentId: number): Promise<string>;

  createSubmission(submission: InsertSubmission): Promise<Submission>;
  getSubmission(id: number): Promise<Submission | undefined>;
  getSubmissionsByStudent(studentId: number): Promise<SubmissionWithAssessment[]>;
  getSubmissionsByAssessment(assessmentId: number): Promise<AssessmentSubmissionSummaryRecord[]>;
  getStudentAssessmentSubmissions(studentId: number): Promise<StudentAssessmentSubmissionRecord[]>;
  updateSubmission(id: number, updates: Partial<InsertSubmission>): Promise<Submission>;
  hasSubmissions(assessmentId: number): Promise<boolean>;

  createGrade(grade: Omit<Grade, "id" | "gradedAt">): Promise<Grade>;
  getGradesBySubmission(submissionId: number): Promise<SubmissionGradeSummaryRecord[]>;
  getComponentSkill(id: number): Promise<ComponentSkillRecord | undefined>;
  getExistingGrade(submissionId: number, componentSkillId: number): Promise<Grade | undefined>;
  updateGrade(gradeId: number, updates: GradeUpdateInput): Promise<Grade>;
  awardStickersForGrades(studentId: number, grades: SubmissionGradeRecord[]): Promise<CredentialRecord[]>;
  checkAndAwardBadge(studentId: number, competencyId: number, gradedBy: number): Promise<CredentialRecord[]>;

  getSelfEvaluationsByAssessment(assessmentId: number): Promise<SelfEvaluation[]>;
  createSelfEvaluation(data: SelfEvaluationCreateInput): Promise<SelfEvaluation>;
  getSelfEvaluationsByStudent(studentId: number): Promise<SelfEvaluation[]>;
  flagRiskySelfEvaluation(id: number, flagged: boolean): Promise<void>;

  getUpcomingDeadlines(projectIds: number[]): Promise<UpcomingDeadlineDTO[]>;
  getStudentCompetencyProgress(studentId: number): Promise<StudentCompetencyProgressRecord[]>;
  getSchoolComponentSkillsProgress(teacherId: number): Promise<SchoolComponentSkillProgressDTO[]>;
  getSchoolSkillsStats(teacherId: number): Promise<SchoolSkillsStatsDTO>;
}

export class AssessmentStorage implements IAssessmentStorage {
  private readonly submissionQueries: AssessmentSubmissionQueries;

  constructor(
    private readonly assessmentQueries: AssessmentAssessmentQueries = new AssessmentAssessmentQueries(),
    private readonly gradeQueries: AssessmentGradeQueries = new AssessmentGradeQueries(),
    private readonly selfEvaluationQueries: AssessmentSelfEvaluationQueries = new AssessmentSelfEvaluationQueries(),
    private readonly analyticsQueries: AssessmentAnalyticsQueries = new AssessmentAnalyticsQueries(),
  ) {
    this.submissionQueries = new AssessmentSubmissionQueries(
      this.gradeQueries.getGradesBySubmission.bind(this.gradeQueries),
    );
  }

  async createAssessment(assessment: InsertAssessment): Promise<Assessment> {
    return this.assessmentQueries.createAssessment(assessment);
  }

  async getAssessment(id: number): Promise<Assessment | undefined> {
    return this.assessmentQueries.getAssessment(id);
  }

  async getAssessmentsByMilestone(milestoneId: number): Promise<Assessment[]> {
    return this.assessmentQueries.getAssessmentsByMilestone(milestoneId);
  }

  async getAssessmentsForTeacher(teacherId: number): Promise<Assessment[]> {
    return this.assessmentQueries.getAssessmentsForTeacher(teacherId);
  }

  async getAssessmentsForSchool(schoolId: number): Promise<Assessment[]> {
    return this.assessmentQueries.getAssessmentsForSchool(schoolId);
  }

  async getStandaloneAssessments(): Promise<Assessment[]> {
    return this.assessmentQueries.getStandaloneAssessments();
  }

  async getAllAssessments(): Promise<Assessment[]> {
    return this.assessmentQueries.getAllAssessments();
  }

  async updateAssessment(id: number, updates: Partial<InsertAssessment>): Promise<Assessment> {
    return this.assessmentQueries.updateAssessment(id, updates);
  }

  async deleteAssessment(id: number): Promise<void> {
    return this.assessmentQueries.deleteAssessment(id);
  }

  async generateShareCode(assessmentId: number): Promise<string> {
    return this.assessmentQueries.generateShareCode(assessmentId);
  }

  async getAssessmentByShareCode(shareCode: string): Promise<Assessment | undefined> {
    return this.assessmentQueries.getAssessmentByShareCode(shareCode);
  }

  async regenerateShareCode(assessmentId: number): Promise<string> {
    return this.assessmentQueries.regenerateShareCode(assessmentId);
  }

  async createSubmission(submission: InsertSubmission): Promise<Submission> {
    return this.submissionQueries.createSubmission(submission);
  }

  async getSubmission(id: number): Promise<Submission | undefined> {
    return this.submissionQueries.getSubmission(id);
  }

  async getSubmissionsByStudent(studentId: number): Promise<SubmissionWithAssessment[]> {
    return this.submissionQueries.getSubmissionsByStudent(studentId);
  }

  async getSubmissionsByAssessment(assessmentId: number): Promise<AssessmentSubmissionSummaryRecord[]> {
    return this.submissionQueries.getSubmissionsByAssessment(assessmentId);
  }

  async getStudentAssessmentSubmissions(studentId: number): Promise<StudentAssessmentSubmissionRecord[]> {
    return this.submissionQueries.getStudentAssessmentSubmissions(studentId);
  }

  async updateSubmission(id: number, updates: Partial<InsertSubmission>): Promise<Submission> {
    return this.submissionQueries.updateSubmission(id, updates);
  }

  async hasSubmissions(assessmentId: number): Promise<boolean> {
    return this.submissionQueries.hasSubmissions(assessmentId);
  }

  async createGrade(grade: Omit<Grade, "id" | "gradedAt">): Promise<Grade> {
    return this.gradeQueries.createGrade(grade);
  }

  async getGradesBySubmission(submissionId: number): Promise<SubmissionGradeSummaryRecord[]> {
    return this.gradeQueries.getGradesBySubmission(submissionId);
  }

  async getComponentSkill(id: number): Promise<ComponentSkillRecord | undefined> {
    return this.gradeQueries.getComponentSkill(id);
  }

  async getExistingGrade(submissionId: number, componentSkillId: number): Promise<Grade | undefined> {
    return this.gradeQueries.getExistingGrade(submissionId, componentSkillId);
  }

  async updateGrade(gradeId: number, updates: GradeUpdateInput): Promise<Grade> {
    return this.gradeQueries.updateGrade(gradeId, updates);
  }

  async awardStickersForGrades(studentId: number, grades: SubmissionGradeRecord[]): Promise<CredentialRecord[]> {
    return this.gradeQueries.awardStickersForGrades(studentId, grades);
  }

  async checkAndAwardBadge(studentId: number, competencyId: number, gradedBy: number): Promise<CredentialRecord[]> {
    return this.gradeQueries.checkAndAwardBadge(studentId, competencyId, gradedBy);
  }

  async getSelfEvaluationsByAssessment(assessmentId: number): Promise<SelfEvaluation[]> {
    return this.selfEvaluationQueries.getSelfEvaluationsByAssessment(assessmentId);
  }

  async createSelfEvaluation(data: SelfEvaluationCreateInput): Promise<SelfEvaluation> {
    return this.selfEvaluationQueries.createSelfEvaluation(data);
  }

  async getSelfEvaluationsByStudent(studentId: number): Promise<SelfEvaluation[]> {
    return this.selfEvaluationQueries.getSelfEvaluationsByStudent(studentId);
  }

  async flagRiskySelfEvaluation(id: number, flagged: boolean): Promise<void> {
    return this.selfEvaluationQueries.flagRiskySelfEvaluation(id, flagged);
  }

  async getUpcomingDeadlines(projectIds: number[]): Promise<UpcomingDeadlineDTO[]> {
    return this.analyticsQueries.getUpcomingDeadlines(projectIds);
  }

  async getStudentCompetencyProgress(studentId: number): Promise<StudentCompetencyProgressRecord[]> {
    return this.analyticsQueries.getStudentCompetencyProgress(studentId);
  }

  async getSchoolComponentSkillsProgress(teacherId: number): Promise<SchoolComponentSkillProgressDTO[]> {
    return this.analyticsQueries.getSchoolComponentSkillsProgress(teacherId);
  }

  async getSchoolSkillsStats(teacherId: number): Promise<SchoolSkillsStatsDTO> {
    return this.analyticsQueries.getSchoolSkillsStats(teacherId);
  }
}

export const assessmentStorage = new AssessmentStorage();
