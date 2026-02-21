import { describe, expect, it, vi } from "vitest";
import { SubmissionGradingService, SubmissionHttpError } from "../../server/domains/assessments/submission-grading.service";
import type { AssessmentService } from "../../server/domains/assessments/assessments.service";

describe("submission grading service", () => {
  it("grades a submission with manual grades and awards stickers", async () => {
    const getExistingGrade = vi.fn()
      .mockResolvedValueOnce({ id: 44 })
      .mockResolvedValueOnce(undefined);

    const updateGrade = vi.fn().mockResolvedValue({ id: 44 });
    const createGrade = vi.fn().mockResolvedValue({ id: 45 });
    const updateSubmission = vi.fn().mockResolvedValue({ id: 10, feedback: "Nice work" });
    const awardStickersForGrades = vi.fn().mockResolvedValue([{ id: 1, type: "sticker" }]);

    const service = {
      getExistingGrade,
      updateGrade,
      createGrade,
      getSubmission: vi.fn().mockResolvedValue({ id: 10, assessmentId: 20, studentId: 30 }),
      getAssessment: vi.fn().mockResolvedValue({ id: 20, componentSkillIds: [1, 2], pdfUrl: null }),
      updateSubmission,
      awardStickersForGrades,
    } as unknown as AssessmentService;

    const gradingService = new SubmissionGradingService(service);
    const result = await gradingService.gradeSubmission({
      submissionId: 10,
      graderId: 99,
      gradeRequest: {
        grades: [
          { componentSkillId: 1, rubricLevel: "proficient", score: 4, feedback: "Good" },
          { componentSkillId: 2, rubricLevel: "developing", score: 2, feedback: "Needs revision" },
        ],
        feedback: "Nice work",
        grade: 90,
      },
      generateAiFeedback: false,
    });

    expect(result.grades).toHaveLength(2);
    expect(updateGrade).toHaveBeenCalledTimes(1);
    expect(createGrade).toHaveBeenCalledTimes(1);
    expect(updateSubmission).toHaveBeenCalledTimes(1);
    expect(awardStickersForGrades).toHaveBeenCalledWith(30, result.grades);
  });

  it("generates preview feedback using the AI grading pipeline", async () => {
    const generateComponentSkillGrades = vi.fn().mockResolvedValue([
      { componentSkillId: 9, rubricLevel: "proficient", score: 3, feedback: "Strong evidence" },
    ]);
    const generateStudentFeedback = vi.fn().mockResolvedValue("Personalized AI feedback");

    const service = {
      getAssessment: vi.fn().mockResolvedValue({
        id: 77,
        componentSkillIds: [9],
        questions: [{ id: "q1", text: "Explain your reasoning." }],
        pdfUrl: null,
      }),
      getComponentSkill: vi.fn().mockResolvedValue({
        id: 9,
        name: "Reasoning",
      }),
      generateComponentSkillGrades,
      generateStudentFeedback,
    } as unknown as AssessmentService;

    const gradingService = new SubmissionGradingService(service);
    const result = await gradingService.generatePreviewFeedback({
      assessmentId: 77,
      studentId: 15,
      responses: [{ questionId: "q1", answer: "Because the evidence supports it." }],
    });

    expect(result.feedback).toBe("Personalized AI feedback");
    expect(generateComponentSkillGrades).toHaveBeenCalledWith(
      expect.objectContaining({
        assessmentId: 77,
        studentId: 15,
        id: -1,
      }),
      expect.objectContaining({ id: 77 }),
      expect.any(Array),
      undefined,
    );
    expect(generateStudentFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ id: -1, assessmentId: 77, studentId: 15 }),
      expect.arrayContaining([
        expect.objectContaining({ componentSkillId: 9, rubricLevel: "proficient" }),
      ]),
    );
  });

  it("generates question-level feedback for a valid submission question", async () => {
    const generateFeedbackForQuestion = vi.fn().mockResolvedValue("Actionable feedback");
    const service = {
      getSubmission: vi.fn().mockResolvedValue({
        id: 1,
        assessmentId: 7,
        responses: ["Student response"],
      }),
      getAssessment: vi.fn().mockResolvedValue({
        id: 7,
        questions: [{ text: "What is photosynthesis?" }],
      }),
      generateFeedbackForQuestion,
    } as unknown as AssessmentService;

    const gradingService = new SubmissionGradingService(service);
    const feedback = await gradingService.generateQuestionFeedback({
      submissionId: 1,
      questionIndex: 0,
      rubricLevel: "proficient",
    });

    expect(feedback).toBe("Actionable feedback");
    expect(generateFeedbackForQuestion).toHaveBeenCalledWith(
      "What is photosynthesis?",
      "Student response",
      "proficient",
    );
  });

  it("throws a 400 error when question index is invalid", async () => {
    const service = {
      getSubmission: vi.fn().mockResolvedValue({
        id: 1,
        assessmentId: 7,
        responses: ["Only one response"],
      }),
      getAssessment: vi.fn().mockResolvedValue({
        id: 7,
        questions: [{ text: "One question" }],
      }),
    } as unknown as AssessmentService;

    const gradingService = new SubmissionGradingService(service);

    await expect(
      gradingService.generateQuestionFeedback({
        submissionId: 1,
        questionIndex: 5,
        rubricLevel: "proficient",
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<SubmissionHttpError>>({
        statusCode: 400,
        message: "Invalid question index",
      }),
    );
  });
});
