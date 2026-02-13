import type { Submission, SubmissionResponses, RubricLevel } from "./types";

const RUBRIC_SET: ReadonlySet<RubricLevel> = new Set<RubricLevel>([
  "emerging",
  "developing",
  "proficient",
  "applying",
]);

export function parseSkillIds(componentSkillIds: unknown): number[] {
  if (Array.isArray(componentSkillIds)) {
    return componentSkillIds.filter((value): value is number => typeof value === "number");
  }

  if (componentSkillIds && typeof componentSkillIds === "object") {
    return Object.values(componentSkillIds).filter((value): value is number => typeof value === "number");
  }

  return [];
}

export function isRubricLevel(value: string): value is RubricLevel {
  return RUBRIC_SET.has(value as RubricLevel);
}

export function getSubmissionResponseText(
  responses: SubmissionResponses,
  questionId?: string,
): string {
  if (!questionId) {
    return "No answer provided";
  }

  if (Array.isArray(responses)) {
    const response = responses.find((entry) => entry.questionId === questionId);
    return response?.answer || "No answer provided";
  }

  if (responses && typeof responses === "object") {
    return responses[questionId] || "No answer provided";
  }

  return "No answer provided";
}

export function isSubmissionGraded(submission: Submission): boolean {
  return !!submission.grades?.length || (submission.grade !== undefined && submission.grade !== null);
}

export function toNumericScore(score: string | number | null | undefined): number {
  if (typeof score === "number") {
    return score;
  }
  if (typeof score === "string") {
    const parsed = parseFloat(score);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function getSubmissionStats(submissions: Submission[]) {
  const total = submissions.length;
  const graded = submissions.filter((sub) => isSubmissionGraded(sub)).length;
  const ungraded = total - graded;
  const aiGraded = submissions.filter((sub) => !!sub.aiGeneratedFeedback).length;

  return { total, graded, ungraded, aiGraded };
}

export function getAverageScore(submission: Submission): number | null {
  if (submission.grade !== undefined && submission.grade !== null) {
    return toNumericScore(submission.grade);
  }

  if (!submission.grades?.length) {
    return null;
  }

  const totalScore = submission.grades.reduce((sum, grade) => sum + toNumericScore(grade.score), 0);
  return Math.round((totalScore / submission.grades.length) * 25);
}
