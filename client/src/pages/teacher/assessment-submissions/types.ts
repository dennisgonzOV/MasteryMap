import type {
  AssessmentSubmissionGradeDTO,
  AssessmentSubmissionSummaryDTO,
} from "@shared/contracts/api";

export type RubricLevel = "emerging" | "developing" | "proficient" | "applying";

export interface AssessmentQuestion {
  id?: string;
  text: string;
  type?: string;
  rubricCriteria?: string | null;
}

export interface SubmissionResponseItem {
  questionId?: string;
  answer?: string;
}

export type SubmissionResponses =
  | SubmissionResponseItem[]
  | Record<string, string>
  | null
  | undefined;

export type Submission = AssessmentSubmissionSummaryDTO & {
  isLate?: boolean;
  responses?: SubmissionResponses;
  grades?: AssessmentSubmissionGradeDTO[];
};

export type GradingEntry = {
  rubricLevel: RubricLevel;
  feedback: string;
  score: number;
};

export type GradingData = Record<number, Record<number, GradingEntry>>;
