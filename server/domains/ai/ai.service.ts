import {
  openAIService,
  type GeneratedAssessment,
  type GeneratedMilestone,
  type GeneratedProjectIdea,
} from './openai.service';
import { notifyTeacherOfSafetyIncident } from '../../services/notifications';
import OpenAI from "openai";
import type {
  BestStandard,
  Grade,
  Milestone,
  Project,
  Submission,
} from "../../../shared/schema";
import type {
  ComponentSkillWithDetailsDTO,
  SubmissionGradeItemDTO,
} from "../../../shared/contracts/api";

// Use the same Azure OpenAI endpoint as openai.service.ts for consistency
const openai = new OpenAI({
  apiKey: process.env.AZURE_GPT41_API_KEY,
  baseURL: "https://trueaimopenai.openai.azure.com/openai/deployments/gpt-4o",
  defaultQuery: { 'api-version': '2025-01-01-preview' },
  defaultHeaders: {
    'api-key': process.env.AZURE_GPT41_API_KEY,
  },
});

interface SelfEvaluationAnalysis {
  improvementFeedback: string;
  hasRiskyContent: boolean;
  riskType?: "homicide" | "suicide" | "self-harm" | "violence" | "other";
  confidence: number;
}

type GradeInput = {
  componentSkillId: number | null;
  rubricLevel?: string | null;
  score?: string | number | null;
};

type AssessmentWithQuestions = {
  questions?: unknown;
};

type AssessmentQuestion = {
  text: string;
  type: "open-ended" | "short-answer" | "multiple-choice" | string;
  rubricCriteria?: string;
  sampleAnswer?: string;
  choices?: string[];
  correctAnswer?: string;
  [key: string]: unknown;
};

type TutorConversationMessage = {
  role?: string;
  content?: string;
  [key: string]: unknown;
};

type TutorComponentSkill = {
  id?: number;
  name?: string;
  emerging?: string | null;
  developing?: string | null;
  proficient?: string | null;
  applying?: string | null;
};

type TutorEvaluation = {
  selfAssessedLevel?: string;
  confidence?: number;
  [key: string]: unknown;
};

type TutorResponsePayload = {
  response?: string;
  suggestedEvaluation?: TutorEvaluation;
  shouldTerminate?: boolean;
  safetyFlag?: string;
};

const VALID_SELF_ASSESSMENT_LEVELS = new Set([
  "emerging",
  "developing",
  "proficient",
  "applying",
]);

const normalizeSuggestedEvaluation = (value: unknown): TutorEvaluation | undefined => {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const normalized: TutorEvaluation = {};

  if (
    typeof record.selfAssessedLevel === "string" &&
    VALID_SELF_ASSESSMENT_LEVELS.has(record.selfAssessedLevel)
  ) {
    normalized.selfAssessedLevel = record.selfAssessedLevel;
  }

  if (typeof record.confidence === "number" && Number.isFinite(record.confidence)) {
    normalized.confidence = Math.max(0, Math.min(1, record.confidence));
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

type CredentialSuggestion = {
  type: string;
  title: string;
  description: string;
};

export class AIService {
  constructor(private openaiService = openAIService) { }

  private parseRubricLevel(level: string | null | undefined): Grade["rubricLevel"] {
    if (level === "emerging" || level === "developing" || level === "proficient" || level === "applying") {
      return level;
    }
    return null;
  }

  private normalizeGradesForAI(submission: Submission, grades: GradeInput[]): Grade[] {
    return grades.map((grade, index) => ({
      id: -(index + 1),
      submissionId: submission.id,
      componentSkillId: grade.componentSkillId ?? null,
      rubricLevel: this.parseRubricLevel(grade.rubricLevel),
      score: grade.score === undefined ? null : String(grade.score),
      feedback: null,
      gradedBy: null,
      gradedAt: null,
    }));
  }

  private parseErrorDetails(error: unknown): {
    message?: string;
    status?: number;
    code?: string;
    type?: string;
  } {
    if (typeof error === "object" && error !== null) {
      const err = error as {
        message?: string;
        status?: number;
        code?: string;
        type?: string;
      };
      return {
        message: err.message,
        status: err.status,
        code: err.code,
        type: err.type,
      };
    }

    return {};
  }

  // High-level project generation methods
  async generateProjectIdeas(criteria: {
    subject: string;
    topic: string;
    gradeLevel: string;
    duration: string;
    componentSkills: ComponentSkillWithDetailsDTO[];
  }): Promise<GeneratedProjectIdea[]> {
    return await this.openaiService.generateProjectIdeas(
      criteria as Parameters<typeof this.openaiService.generateProjectIdeas>[0],
    );
  }

  async generateProjectMilestones(project: Project): Promise<GeneratedMilestone[]> {
    return await this.openaiService.generateMilestones(project);
  }

  async generateMilestonesFromComponentSkills(
    projectTitle: string,
    projectDescription: string,
    projectDueDate: string,
    componentSkills: ComponentSkillWithDetailsDTO[]
  ): Promise<GeneratedMilestone[]> {
    return await this.openaiService.generateMilestonesFromComponentSkills(
      projectTitle,
      projectDescription,
      projectDueDate,
      componentSkills as Parameters<typeof this.openaiService.generateMilestonesFromComponentSkills>[3],
    );
  }

  // High-level assessment methods
  async generateAssessment(milestone: Milestone): Promise<GeneratedAssessment> {
    return await this.openaiService.generateAssessment(milestone);
  }

  async generateAssessmentFromComponentSkills(
    milestoneTitle: string,
    milestoneDescription: string,
    milestoneDueDate: string,
    componentSkills: ComponentSkillWithDetailsDTO[],
    bestStandards: BestStandard[] = [],
    questionCount: number = 5,
    questionTypes: string[] = ['open-ended'],
    pdfContent?: string
  ): Promise<GeneratedAssessment> {
    return await this.openaiService.generateAssessmentFromComponentSkills(
      milestoneTitle,
      milestoneDescription,
      milestoneDueDate,
      componentSkills as Parameters<typeof this.openaiService.generateAssessmentFromComponentSkills>[3],
      bestStandards,
      questionCount,
      questionTypes,
      pdfContent
    );
  }

  // High-level grading and feedback methods
  async generateStudentFeedback(submission: Submission, grades: GradeInput[]): Promise<string> {
    const normalizedGrades = this.normalizeGradesForAI(submission, grades);
    return await this.openaiService.generateFeedback(submission, normalizedGrades);
  }

  async generateComponentSkillGrades(
    submission: Submission,
    assessment: AssessmentWithQuestions,
    componentSkills: ComponentSkillWithDetailsDTO[],
    pdfContent?: string,
  ): Promise<SubmissionGradeItemDTO[]> {
    return await this.openaiService.generateComponentSkillGrades(
      submission,
      assessment,
      componentSkills as Parameters<typeof this.openaiService.generateComponentSkillGrades>[2],
      pdfContent,
    );
  }

  async generateQuestionGrade(
    questionText: string,
    studentAnswer: string,
    rubricCriteria: string,
    sampleAnswer: string,
    pdfContent?: string
  ) {
    return await this.openaiService.generateQuestionGrade(questionText, studentAnswer, rubricCriteria, sampleAnswer, pdfContent);
  }

  async suggestCredentials(
    submission: Submission,
    grades: GradeInput[],
    projectTitle: string,
  ): Promise<CredentialSuggestion[]> {
    const normalizedGrades = this.normalizeGradesForAI(submission, grades);
    return await this.openaiService.suggestCredentials(
      submission,
      normalizedGrades,
      projectTitle,
    ) as CredentialSuggestion[];
  }

  // Self-evaluation and safety-aware feedback
  async generateSelfEvaluationFeedback(
    componentSkillName: string,
    rubricLevels: unknown,
    selfAssessedLevel: string,
    justification: string,
    examples: string,
    assessmentDescription?: string,
  ): Promise<SelfEvaluationAnalysis> {
    try {
      const rubricEntries = typeof rubricLevels === "object" && rubricLevels !== null
        ? Object.entries(rubricLevels as Record<string, unknown>).filter((entry): entry is [string, string] => {
          const [, description] = entry;
          return typeof description === "string";
        })
        : [];
      const teacherAssessmentDescription =
        typeof assessmentDescription === "string" && assessmentDescription.trim().length > 0
          ? assessmentDescription.trim()
          : "No teacher-provided assessment description available.";

      const prompt = `You are an AI tutor helping students improve their competency in "${componentSkillName}".

ASSESSMENT CONTEXT (TEACHER DESCRIPTION):
${teacherAssessmentDescription}

RUBRIC LEVELS:
${rubricEntries
          .map(([level, description]) => `${level.toUpperCase()}: ${description}`)
          .join("\n")}

STUDENT SELF-EVALUATION:
- Self-assessed level: ${selfAssessedLevel}
- Justification: ${justification}
- Examples provided: ${examples}

IMPORTANT SAFETY CHECK:
First, analyze the student's response for any concerning content including:
- References to homicide, murder, or harming others
- Suicidal ideation or self-harm
- Violence or threats
- Inappropriate or dangerous content

If ANY concerning content is detected, immediately flag it and do not provide educational feedback.

TASKS:
1. Safety Analysis: Check for risky content (yes/no)
2. Educational Feedback: If safe, provide specific, actionable guidance aligned to the teacher's assessment description and rubric expectations to help the student progress from their current level to "applying" (the highest level)

Respond in JSON format:
{
  "hasRiskyContent": boolean,
  "riskType": "string or null",
  "confidence": number (0-1),
  "improvementFeedback": "string with specific recommendations for reaching mastery level"
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are a safety-aware educational AI assistant. Always prioritize student safety and provide constructive learning guidance.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 800,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");

      return {
        improvementFeedback: result.improvementFeedback || "Keep practicing and reflecting on your progress!",
        hasRiskyContent: result.hasRiskyContent || false,
        riskType: result.riskType || undefined,
        confidence: result.confidence || 0.9,
      };
    } catch (error) {
      console.error("Error generating self-evaluation feedback:", error);
      return {
        improvementFeedback: "Keep working on developing this skill through practice and reflection.",
        hasRiskyContent: false,
        riskType: undefined,
        confidence: 0.5,
      };
    }
  }

  // AI tutoring and question generation
  async generateAssessmentQuestions(
    milestoneDescription: string,
    learningObjectives: string,
    difficulty: string = "intermediate"
  ): Promise<AssessmentQuestion[]> {
    try {
      const prompt = `Generate 5-7 educational assessment questions for this learning milestone:

Milestone: ${milestoneDescription}
Learning Objectives: ${learningObjectives}
Difficulty Level: ${difficulty}

Create a mix of question types:
- 2-3 open-ended questions for deep thinking
- 2-3 short-answer questions for specific concepts
- 1-2 multiple-choice questions with 4 answer options each
- For multiple-choice questions, provide exactly 4 answer choices in a "choices" array
        - Include a "correctAnswer" field that matches one of the choices exactly
        - The correctAnswer field is REQUIRED for all multiple-choice questions

Each question should include:
- Question text (string)
- Type (string: "open-ended", "short-answer", "multiple-choice")
- Rubric criteria for grading (string)
- Sample answer (string, for open-ended and short-answer)
- Choices (array of strings, for multiple-choice questions only)
- Correct answer (string, for multiple-choice questions only)

Return as JSON array of question objects. Ensure the JSON is valid and follows the specified structure.
Example JSON structure:
[
  {
    "text": "What is the capital of France?",
    "type": "multiple-choice",
    "rubricCriteria": "Correctly identify the capital city.",
    "choices": ["Berlin", "Madrid", "Paris", "Rome"],
    "correctAnswer": "Paris"
  },
  {
    "text": "Explain the process of photosynthesis.",
    "type": "open-ended",
    "rubricCriteria": "Describe the key steps and components of photosynthesis.",
    "sampleAnswer": "Photosynthesis is the process plants use to convert light energy into chemical energy..."
  }
]`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert in educational assessment design. Create engaging, pedagogically sound questions. Ensure all required fields, especially 'correctAnswer' for multiple-choice questions, are present and valid in the JSON output."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}") as { questions?: AssessmentQuestion[] };
      const questions = Array.isArray(result.questions) ? result.questions : [];

      // Post-processing to ensure correctAnswer is valid for multiple-choice questions
      return questions.map((question) => {
        if (question.type === 'multiple-choice' && question.choices) {
          // Ensure we have a correct answer for multiple choice
          if (!question.correctAnswer && question.choices.length > 0) {
            question.correctAnswer = question.choices[0]; // Default to first choice if not specified
          }
          // Validate that the correct answer is one of the choices
          if (question.correctAnswer && !question.choices.includes(question.correctAnswer)) {
            question.correctAnswer = question.choices[0]; // Fallback to first choice
          }
        }
        return question;
      });
    } catch (error) {
      console.error("Error generating assessment questions:", error);
      throw new Error("Failed to generate assessment questions");
    }
  }

  async generateTutorResponse(
    componentSkill: TutorComponentSkill,
    conversationHistory: TutorConversationMessage[] = [],
    currentEvaluation?: TutorEvaluation,
    assessmentDescription?: string,
    assessmentPdfContext?: string,
  ): Promise<TutorResponsePayload> {
    try {
      const historyText = conversationHistory
        .map((msg) => `${String(msg.role || "unknown")}: ${String(msg.content || "")}`)
        .join('\n');
      const latestStudentMessage = conversationHistory
        .filter((msg) => msg.role === "student")
        .map((msg) => String(msg.content || "").trim())
        .filter((content) => content.length > 0)
        .pop() || "No student response provided.";
      const recentTutorMessages = conversationHistory
        .filter((msg) => msg.role === "tutor")
        .map((msg) => String(msg.content || "").trim())
        .filter((content) => content.length > 0)
        .slice(-2)
        .join("\n---\n");

      const studentMessageCount = conversationHistory.filter(msg => msg.role === 'student').length;
      const isFinalTurn = studentMessageCount >= 3;

      const currentLevel = currentEvaluation?.selfAssessedLevel || 'unknown';
      const skillName = componentSkill.name || 'this skill';
      const teacherAssessmentDescription =
        typeof assessmentDescription === "string" && assessmentDescription.trim().length > 0
          ? assessmentDescription.trim()
          : "No teacher-provided assessment description available.";
      const teacherAssessmentPdfContext =
        typeof assessmentPdfContext === "string" && assessmentPdfContext.trim().length > 0
          ? assessmentPdfContext.trim()
          : "No teacher-provided PDF context available.";

      // Build rubric levels from individual component skill fields
      const rubricLevels = {
        emerging: componentSkill.emerging || '',
        developing: componentSkill.developing || '',
        proficient: componentSkill.proficient || '',
        applying: componentSkill.applying || ''
      };

      const prompt = `You are an AI tutor helping a student develop their competency in "${skillName}".

COMPONENT SKILL: ${skillName}
CURRENT LEVEL: ${currentLevel}
ASSESSMENT CONTEXT (TEACHER DESCRIPTION): ${teacherAssessmentDescription}
ASSESSMENT MATERIAL CONTEXT (TEACHER PDF): ${teacherAssessmentPdfContext}
${isFinalTurn ? "NOTE: This is the FINAL turn. You must provide a summarizing statement and conclude the session. Do NOT ask any follow-up questions." : ""}

RUBRIC LEVELS:
${Object.entries(rubricLevels)
          .filter(([_, description]) => description) // Only include non-empty levels
          .map(([level, description]) => `${level.toUpperCase()}: ${description}`)
          .join("\n")}

Previous conversation:
${historyText}

LATEST STUDENT RESPONSE TO CRITIQUE:
${latestStudentMessage}

RECENT TUTOR RESPONSES (DO NOT REPEAT THESE PHRASES):
${recentTutorMessages || "None"}

IMPORTANT SAFETY CHECK:
First, analyze the student's messages for any concerning content including:
- References to homicide, murder, or harming others
- Suicidal ideation or self-harm
- Violence or threats
- Inappropriate or dangerous content

If ANY concerning content is detected, immediately flag it and provide a safety response.

TASKS:
1. Safety Analysis: Check for risky content
2. Educational Response: Provide detailed, constructive critique of the latest student response and align all feedback to the teacher's assessment description, teacher-provided PDF material context, and rubric.
3. Suggested Evaluation: Suggest their current level based on evidence in the conversation.
4. Continue/Terminate: Determine if the conversation should continue
5. Summary: If this is the 3rd student response, provide a comprehensive summary and concluding statement. Do not ask a follow-up question.

RUBRIC CALIBRATION RULES (CRITICAL):
- If a student claims "proficient" or "applying", require concrete evidence, not general statements.
- "proficient" should show consistent independent performance with specific context and outcomes.
- "applying" should show transfer to complex/novel situations and impact on others (for example mentoring peers, leading, or adapting strategy).
- If evidence does not meet the claimed level, explicitly and respectfully say the evidence currently fits a lower level, explain why, and state what evidence would justify moving up.

RESPONSE STYLE (BALANCED + DETAILED):
- Maintain a balanced tone: supportive but direct.
- Avoid repeating wording from recent tutor responses.
- The "response" field must include these exact section headers in this order:
  1) Strengths
  2) Constructive Critique
  3) How to Improve Next Submission
  4) Suggested Next Evidence
- In "Constructive Critique" include at least 2 concrete gaps tied to rubric language.
- In "How to Improve Next Submission" include specific, actionable steps the student can do in their next response.
- If not final turn, end with exactly one targeted follow-up question.
- If final turn, end with a concise summary and no follow-up question.

Respond in JSON format:
{
  "response": "Your helpful educational response",
  "suggestedEvaluation": {
    "selfAssessedLevel": "emerging|developing|proficient|applying",
    "confidence": 0.8
  },
  "shouldTerminate": false,
  "safetyFlag": null
}

If safety concerns are detected:
{
  "response": "I'm concerned about what you've shared. Please talk to a trusted adult or counselor.",
  "safetyFlag": "homicidal_ideation|suicidal_ideation|inappropriate_language",
  "shouldTerminate": true
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a safety-aware educational AI tutor. Always prioritize student safety and provide constructive learning guidance."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.5,
        max_tokens: 1000,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}") as TutorResponsePayload;
      const normalizedSuggestedEvaluation = normalizeSuggestedEvaluation(result.suggestedEvaluation);
      const normalizedSafetyFlag = typeof result.safetyFlag === "string" ? result.safetyFlag : undefined;

      return {
        response: typeof result.response === "string" && result.response.trim().length > 0
          ? result.response
          : "I'm here to help you develop this skill!",
        suggestedEvaluation: normalizedSuggestedEvaluation,
        shouldTerminate: result.shouldTerminate || false,
        safetyFlag: normalizedSafetyFlag
      };
    } catch (error: unknown) {
      const errorDetails = this.parseErrorDetails(error);
      console.error("Error generating tutor response:", {
        message: errorDetails.message,
        status: errorDetails.status,
        code: errorDetails.code,
        type: errorDetails.type,
        error,
      });
      return {
        response: "I'm here to help you develop this skill! Can you tell me more about what you're working on?",
        shouldTerminate: false
      };
    }
  }

  // Safety incident handling with AI analysis
  async processSelfEvaluationForSafety(analysis: SelfEvaluationAnalysis, studentId: number, teacherId: number): Promise<void> {
    if (analysis.hasRiskyContent && analysis.confidence > 0.7) {
      console.error(`Safety incident detected for student ${studentId}:`, {
        riskType: analysis.riskType,
        confidence: analysis.confidence
      });

      // Trigger safety incident workflow
      // Trigger safety incident workflow
      await notifyTeacherOfSafetyIncident({
        studentId,
        teacherId,
        message: `AI detected potentially concerning content in student self-evaluation: ${analysis.riskType}`,
        incidentType: 'inappropriate_language', // Default fallback as specific type mapping might be needed
        timestamp: new Date()
      });
    }
  }
}

export const aiService = new AIService();
