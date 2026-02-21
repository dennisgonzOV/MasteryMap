import type {
  Assessment,
  ComponentSkill,
  InsertSubmission,
  Submission,
} from "../../../shared/schema";
import type {
  SubmissionGradeItemDTO,
  SubmissionGradeRequestDTO,
} from "../../../shared/contracts/api";
import type { AssessmentService } from "./assessments.service";
import type { CredentialRecord, SubmissionGradeRecord } from "./assessments.contracts";

interface SubmissionGradeInput {
  submissionId: number;
  graderId: number | null;
  gradeRequest: SubmissionGradeRequestDTO;
  generateAiFeedback: boolean;
}

interface QuestionFeedbackInput {
  submissionId: number;
  questionIndex: number;
  rubricLevel: string;
}

interface PreviewFeedbackInput {
  assessmentId: number;
  studentId: number;
  responses: unknown;
}

type ExistingGradeRef = { id: number };
type QuestionRecord = { text?: string };
type GradeWriteScore = string | number | null | undefined;
type RubricLevel = "emerging" | "developing" | "proficient" | "applying";

export interface GradeSubmissionResult {
  grades: SubmissionGradeRecord[];
  feedback: string | null | undefined;
  submission: Awaited<ReturnType<AssessmentService["updateSubmission"]>>;
  stickersAwarded: CredentialRecord[];
}

export interface PreviewFeedbackResult {
  feedback: string;
}

export class SubmissionHttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "SubmissionHttpError";
  }
}

export class SubmissionGradingService {
  constructor(private readonly service: AssessmentService) {}

  async gradeSubmission(input: SubmissionGradeInput): Promise<GradeSubmissionResult> {
    const { submissionId, graderId, gradeRequest, generateAiFeedback } = input;
    const { grades: manualGradeItems, feedback, grade } = gradeRequest;

    let savedGrades: SubmissionGradeRecord[] = [];
    if (Array.isArray(manualGradeItems) && manualGradeItems.length > 0) {
      savedGrades = await Promise.all(
        manualGradeItems.map((gradeItem) =>
          this.upsertGrade(submissionId, graderId, gradeItem),
        ),
      );
    }

    const submission = await this.service.getSubmission(submissionId);
    if (!submission) {
      throw new SubmissionHttpError(404, "Submission not found");
    }

    if (submission.assessmentId == null) {
      throw new SubmissionHttpError(400, "Submission has no assessmentId");
    }

    const assessment = await this.service.getAssessment(submission.assessmentId);
    if (!assessment) {
      throw new SubmissionHttpError(404, "Assessment not found");
    }

    let finalFeedback = feedback;
    const finalGrade = grade;

    if (generateAiFeedback) {
      try {
        const pdfContent = await this.extractPdfText(assessment.pdfUrl);

        if (!manualGradeItems || manualGradeItems.length === 0) {
          savedGrades = await this.generateAndSaveAiGrades(
            submissionId,
            graderId,
            submission,
            assessment,
            pdfContent,
          );
        }

        finalFeedback = await this.service.generateStudentFeedback(submission, savedGrades);
      } catch {
        finalFeedback = "AI feedback generation failed. Please provide manual feedback.";
      }
    }

    const updateData: Record<string, unknown> = { gradedAt: new Date() };
    if (finalFeedback !== undefined) {
      updateData.feedback = finalFeedback;
    }
    if (finalGrade !== undefined) {
      updateData.grade = finalGrade;
    }
    if (generateAiFeedback) {
      updateData.aiGeneratedFeedback = true;
    }

    const updatedSubmission = await this.service.updateSubmission(
      submissionId,
      updateData as unknown as Partial<InsertSubmission>,
    );

    let awardedStickers: CredentialRecord[] = [];
    if (savedGrades.length > 0 && submission.studentId != null) {
      awardedStickers = await this.service.awardStickersForGrades(submission.studentId, savedGrades);
    }

    return {
      grades: savedGrades,
      feedback: finalFeedback,
      submission: updatedSubmission,
      stickersAwarded: awardedStickers,
    };
  }

  async generateQuestionFeedback(input: QuestionFeedbackInput): Promise<string> {
    const { submissionId, questionIndex, rubricLevel } = input;

    const submission = await this.service.getSubmission(submissionId);
    if (!submission) {
      throw new SubmissionHttpError(404, "Submission not found");
    }

    if (submission.assessmentId == null) {
      throw new SubmissionHttpError(400, "Submission has no assessmentId");
    }

    const assessment = await this.service.getAssessment(submission.assessmentId);
    if (!assessment) {
      throw new SubmissionHttpError(404, "Assessment not found");
    }

    const questions = this.toQuestionRecords(assessment.questions);
    if (!questions.length || questionIndex < 0 || questionIndex >= questions.length) {
      throw new SubmissionHttpError(400, "Invalid question index");
    }

    const question = questions[questionIndex];
    const questionText = this.sanitizeForPrompt(question.text ?? "");
    const responseText = this.sanitizeForPrompt(
      this.getResponseForQuestion(submission.responses, questionIndex),
    );

    if (!questionText || !responseText) {
      throw new SubmissionHttpError(400, "Question and response cannot be empty");
    }

    const feedback = await this.service.generateFeedbackForQuestion(
      questionText,
      responseText,
      rubricLevel,
    );

    return feedback || "Unable to generate feedback at this time";
  }

  async generatePreviewFeedback(input: PreviewFeedbackInput): Promise<PreviewFeedbackResult> {
    const { assessmentId, studentId, responses } = input;
    const assessment = await this.service.getAssessment(assessmentId);
    if (!assessment) {
      throw new SubmissionHttpError(404, "Assessment not found");
    }

    const draftSubmission = this.buildDraftSubmission({
      assessmentId,
      studentId,
      responses,
    });

    const pdfContent = await this.extractPdfText(assessment.pdfUrl);
    const aiSkillGrades = await this.generateAiGrades(
      draftSubmission,
      assessment,
      pdfContent,
    );
    const feedback = await this.service.generateStudentFeedback(draftSubmission, aiSkillGrades);

    return {
      feedback: feedback || "Unable to generate feedback at this time",
    };
  }

  private async generateAndSaveAiGrades(
    submissionId: number,
    graderId: number | null,
    submission: Awaited<ReturnType<AssessmentService["getSubmission"]>> extends infer T
      ? Exclude<T, undefined>
      : never,
    assessment: Awaited<ReturnType<AssessmentService["getAssessment"]>> extends infer T
      ? Exclude<T, undefined>
      : never,
    pdfContent: string | undefined,
  ): Promise<SubmissionGradeRecord[]> {
    const aiSkillGrades = await this.generateAiGrades(submission, assessment, pdfContent);

    return Promise.all(
      aiSkillGrades.map((gradeItem) =>
        this.upsertGrade(
          submissionId,
          graderId,
          gradeItem,
          this.normalizeScoreForWrite(gradeItem.score),
        ),
      ),
    );
  }

  private async generateAiGrades(
    submission: Submission,
    assessment: Assessment,
    pdfContent: string | undefined,
  ): Promise<SubmissionGradeItemDTO[]> {
    const componentSkillIds = Array.isArray(assessment.componentSkillIds)
      ? assessment.componentSkillIds.filter((id): id is number => typeof id === "number")
      : [];

    if (componentSkillIds.length === 0) {
      return [];
    }

    const componentSkills = await Promise.all(
      componentSkillIds.map((id) => this.service.getComponentSkill(id)),
    );
    const validSkills = componentSkills.filter(
      (skill): skill is ComponentSkill => skill !== undefined,
    );
    if (validSkills.length === 0) {
      return [];
    }

    return this.service.generateComponentSkillGrades(
      submission,
      assessment,
      validSkills,
      pdfContent,
    );
  }

  private async upsertGrade(
    submissionId: number,
    graderId: number | null,
    gradeItem: SubmissionGradeItemDTO,
    createScoreOverride?: GradeWriteScore,
  ): Promise<SubmissionGradeRecord> {
    const existingGradeRaw = await this.service.getExistingGrade(
      submissionId,
      gradeItem.componentSkillId,
    );
    const normalizedScore = this.normalizeScoreForWrite(gradeItem.score);

    if (this.hasGradeId(existingGradeRaw)) {
      return this.service.updateGrade(existingGradeRaw.id, {
        rubricLevel: this.normalizeRubricLevel(gradeItem.rubricLevel),
        score: normalizedScore,
        feedback: gradeItem.feedback ?? null,
        gradedBy: graderId,
      });
    }

    return this.service.createGrade({
      submissionId,
      componentSkillId: gradeItem.componentSkillId,
      rubricLevel: this.normalizeRubricLevel(gradeItem.rubricLevel),
      score: this.normalizeCreateScore(createScoreOverride ?? gradeItem.score),
      feedback: gradeItem.feedback ?? null,
      gradedBy: graderId,
    });
  }

  private normalizeScoreForWrite(score: GradeWriteScore): string {
    if (score === null || score === undefined) {
      return "0";
    }
    return score.toString();
  }

  private normalizeCreateScore(score: GradeWriteScore): string | null {
    if (score === null || score === undefined) {
      return null;
    }
    return score.toString();
  }

  private normalizeRubricLevel(value: string | null | undefined): RubricLevel | null {
    if (
      value === "emerging" ||
      value === "developing" ||
      value === "proficient" ||
      value === "applying"
    ) {
      return value;
    }
    return null;
  }

  private hasGradeId(value: unknown): value is ExistingGradeRef {
    return this.isRecord(value) && typeof value.id === "number";
  }

  private async extractPdfText(pdfUrl: string | null): Promise<string | undefined> {
    if (!pdfUrl) {
      return undefined;
    }

    try {
      const { extractTextFromPdfUrl } = await import("../../utils/pdf");
      return await extractTextFromPdfUrl(pdfUrl);
    } catch {
      return undefined;
    }
  }

  private toQuestionRecords(value: unknown): QuestionRecord[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter(this.isRecord).map((question) => ({
      text: typeof question.text === "string" ? question.text : "",
    }));
  }

  private getResponseForQuestion(responses: unknown, questionIndex: number): string {
    if (Array.isArray(responses)) {
      const item = responses[questionIndex];
      if (typeof item === "string") {
        return item;
      }
      if (this.isRecord(item) && typeof item.answer === "string") {
        return item.answer;
      }
    }

    if (this.isRecord(responses)) {
      const item = responses[String(questionIndex)];
      if (typeof item === "string") {
        return item;
      }
      if (this.isRecord(item) && typeof item.answer === "string") {
        return item.answer;
      }
    }

    return "";
  }

  private sanitizeForPrompt(value: unknown): string {
    if (typeof value !== "string") {
      return "";
    }

    const sanitized = value.replace(/[\u0000-\u001F\u007F-\u009F]/g, "").trim();
    const collapsed = sanitized.replace(/\s+/g, " ");
    return collapsed.length > 5000 ? collapsed.slice(0, 5000) : collapsed;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
  }

  private buildDraftSubmission(input: {
    assessmentId: number;
    studentId: number;
    responses: unknown;
  }): Submission {
    return {
      id: -1,
      assessmentId: input.assessmentId,
      studentId: input.studentId,
      responses: input.responses,
      artifacts: null,
      submittedAt: null,
      gradedAt: null,
      feedback: null,
      aiGeneratedFeedback: false,
      isSelfEvaluation: false,
      selfEvaluationData: null,
    };
  }
}
