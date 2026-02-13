import { describe, expect, it } from "vitest";
import {
  getAverageScore,
  getSubmissionStats,
  isRubricLevel,
  isSubmissionGraded,
  parseSkillIds,
  toNumericScore,
} from "../../client/src/pages/teacher/assessment-submissions/utils";
import type { Submission } from "../../client/src/pages/teacher/assessment-submissions/types";

describe("assessment submissions utils", () => {
  it("parses skill ids from array and object payloads", () => {
    expect(parseSkillIds([1, "x", 2, null])).toEqual([1, 2]);
    expect(parseSkillIds({ a: 3, b: "x", c: 4 })).toEqual([3, 4]);
  });

  it("validates rubric level literals", () => {
    expect(isRubricLevel("emerging")).toBe(true);
    expect(isRubricLevel("invalid")).toBe(false);
  });

  it("converts score values to numbers", () => {
    expect(toNumericScore(2)).toBe(2);
    expect(toNumericScore("3.5")).toBe(3.5);
    expect(toNumericScore("bad")).toBe(0);
    expect(toNumericScore(null)).toBe(0);
  });

  it("calculates grading state and average scores", () => {
    const gradedWithOverall: Submission = {
      id: 1,
      studentId: 10,
      studentName: "Ada Lovelace",
      studentUsername: "ada",
      grade: "88",
    };
    const gradedWithComponentScores: Submission = {
      id: 2,
      studentId: 11,
      studentName: "Alan Turing",
      studentUsername: "alan",
      grades: [
        {
          id: 1,
          submissionId: 2,
          componentSkillId: 100,
          rubricLevel: "proficient",
          score: "3",
          feedback: "",
          gradedBy: 7,
          gradedAt: null,
        },
        {
          id: 2,
          submissionId: 2,
          componentSkillId: 101,
          rubricLevel: "developing",
          score: "2",
          feedback: "",
          gradedBy: 7,
          gradedAt: null,
        },
      ],
    };
    const ungraded: Submission = {
      id: 3,
      studentId: 12,
      studentName: "Grace Hopper",
      studentUsername: "grace",
    };

    expect(isSubmissionGraded(gradedWithOverall)).toBe(true);
    expect(isSubmissionGraded(gradedWithComponentScores)).toBe(true);
    expect(isSubmissionGraded(ungraded)).toBe(false);

    expect(getAverageScore(gradedWithOverall)).toBe(88);
    expect(getAverageScore(gradedWithComponentScores)).toBe(63);
    expect(getAverageScore(ungraded)).toBeNull();

    expect(getSubmissionStats([gradedWithOverall, gradedWithComponentScores, ungraded])).toEqual({
      total: 3,
      graded: 2,
      ungraded: 1,
      aiGraded: 0,
    });
  });
});
