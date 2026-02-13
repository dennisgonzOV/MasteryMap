import type {
  ComponentSkill,
  Credential,
  Grade,
  InsertSelfEvaluation,
} from "../../../shared/schema";

export interface ExistingGradeRef {
  id: number;
}

export type SubmissionGradeRecord = Pick<
  Grade,
  "componentSkillId" | "rubricLevel"
> & {
  gradedBy?: number | null;
  score?: string | number | null;
  feedback?: string | null;
};

export type GradeUpdateInput = Partial<Pick<Grade, "rubricLevel" | "feedback" | "gradedBy">> & {
  score?: string | null;
};

export interface UpcomingDeadlineDTO {
  milestoneId: number;
  title: string;
  dueDate: Date | null;
  projectTitle: string;
  projectId: number;
}

export interface SchoolComponentSkillProgressDTO {
  id: number;
  name: string;
  competencyId: number;
  competencyName: string;
  learnerOutcomeName: string;
  averageScore: number;
  studentsAssessed: number;
  totalStudents: number;
  passRate: number;
  strugglingStudents: number;
  excellingStudents: number;
  rubricDistribution: {
    emerging: number;
    developing: number;
    proficient: number;
    applying: number;
  };
  trend: "improving" | "declining" | "stable";
  lastAssessmentDate: string | Date;
}

export interface SchoolSkillsStatsDTO {
  totalSkillsAssessed: number;
  averageSchoolScore: number;
  skillsNeedingAttention: number;
  excellentPerformance: number;
  studentsAssessed: number;
  totalStudents: number;
}

export interface StudentCompetencyProgressRecord {
  competencyId: number;
  competencyName: string;
  componentSkillId: number;
  componentSkillName: string;
  averageScore: number;
  totalScores: number[];
  lastScore: number;
  lastUpdated: string;
  progressDirection: "improving" | "declining" | "stable";
}

export type SelfEvaluationCreateInput = InsertSelfEvaluation;
export type ComponentSkillRecord = ComponentSkill;
export interface SubmissionGradeSummaryRecord {
  id: number;
  submissionId: number | null;
  componentSkillId: number | null;
  rubricLevel: Grade["rubricLevel"];
  score: string | null;
  feedback: string | null;
  gradedBy: number | null;
  gradedAt: Date | null;
  componentSkillName?: string | null;
  competencyName?: string | null;
}

export interface AssessmentSubmissionSummaryRecord {
  id: number;
  studentId: number | null;
  studentName: string;
  studentUsername: string;
  responses?: unknown;
  submittedAt?: Date | null;
  feedback?: string | null;
  aiGeneratedFeedback?: boolean | null;
  grades?: SubmissionGradeSummaryRecord[];
  assessmentId?: number | null;
}

export interface StudentAssessmentSubmissionRecord {
  id: number;
  assessmentId?: number | null;
  assessmentTitle: string;
  assessmentDescription?: string | null;
  projectTitle?: string | null;
  milestoneTitle?: string | null;
  questions?: unknown;
  responses?: unknown;
  submittedAt?: Date | string | null;
  feedback?: string | null;
  status?: "graded" | "submitted" | "draft";
  earnedCredentials?: Array<
    Pick<CredentialRecord, "id" | "title" | "description" | "type" | "awardedAt">
  >;
  questionGrades?: Record<string | number, { score: number; rubricLevel?: string | null; feedback?: string | null }>;
  grades?: SubmissionGradeSummaryRecord[];
}

export type CredentialRecord = Credential;
