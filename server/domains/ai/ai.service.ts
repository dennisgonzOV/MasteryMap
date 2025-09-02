import { openAIService } from './openai.service';
import { notifyTeacherOfSafetyIncident } from '../../services/notifications';
import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  apiKey: process.env.AZURE_GPT41_API_KEY,
  baseURL: "https://denni-mf1s8rxz-eastus2.cognitiveservices.azure.com/",
  model: "gpt-4.1"
});

interface SelfEvaluationAnalysis {
  improvementFeedback: string;
  hasRiskyContent: boolean;
  riskType?: "homicide" | "suicide" | "self-harm" | "violence" | "other";
  confidence: number;
}

export class AIService {
  constructor(private openaiService = openAIService) {}

  // High-level project generation methods
  async generateProjectIdeas(criteria: {
    subject: string;
    topic: string;
    gradeLevel: string;
    duration: string;
    componentSkills: any[];
  }) {
    return await this.openaiService.generateProjectIdeas(criteria);
  }

  async generateProjectMilestones(project: any) {
    return await this.openaiService.generateMilestones(project);
  }

  async generateMilestonesFromComponentSkills(
    projectTitle: string,
    projectDescription: string,
    projectDueDate: string,
    componentSkills: any[]
  ) {
    return await this.openaiService.generateMilestonesFromComponentSkills(
      projectTitle,
      projectDescription,
      projectDueDate,
      componentSkills
    );
  }

  // High-level assessment methods
  async generateAssessment(milestone: any) {
    return await this.openaiService.generateAssessment(milestone);
  }

  async generateAssessmentFromComponentSkills(
    milestoneTitle: string,
    milestoneDescription: string,
    milestoneDueDate: string,
    componentSkills: any[]
  ) {
    return await this.openaiService.generateAssessmentFromComponentSkills(
      milestoneTitle,
      milestoneDescription,
      milestoneDueDate,
      componentSkills
    );
  }

  // High-level grading and feedback methods
  async generateStudentFeedback(submission: any, grades: any[]) {
    return await this.openaiService.generateFeedback(submission, grades);
  }

  async generateComponentSkillGrades(submission: any, assessment: any, componentSkills: any[]) {
    return await this.openaiService.generateComponentSkillGrades(submission, assessment, componentSkills);
  }

  async generateQuestionGrade(
    questionText: string,
    studentAnswer: string,
    rubricCriteria: string,
    sampleAnswer: string
  ) {
    return await this.openaiService.generateQuestionGrade(questionText, studentAnswer, rubricCriteria, sampleAnswer);
  }

  async suggestCredentials(submission: any, grades: any[], projectTitle: string) {
    return await this.openaiService.suggestCredentials(submission, grades, projectTitle);
  }

  // Self-evaluation and safety-aware feedback
  async generateSelfEvaluationFeedback(
    componentSkillName: string,
    rubricLevels: any,
    selfAssessedLevel: string,
    justification: string,
    examples: string,
  ): Promise<SelfEvaluationAnalysis> {
    try {
      const prompt = `You are an AI tutor helping students improve their competency in "${componentSkillName}".

RUBRIC LEVELS:
${Object.entries(rubricLevels || {})
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
2. Educational Feedback: If safe, provide specific, actionable guidance to help the student progress from their current level to "applying" (the highest level)

Respond in JSON format:
{
  "hasRiskyContent": boolean,
  "riskType": "string or null",
  "confidence": number (0-1),
  "improvementFeedback": "string with specific recommendations for reaching mastery level"
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4.1",
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
  ): Promise<any[]> {
    try {
      const prompt = `Generate 5-7 educational assessment questions for this learning milestone:

Milestone: ${milestoneDescription}
Learning Objectives: ${learningObjectives}
Difficulty Level: ${difficulty}

Create a mix of question types:
- 2-3 open-ended questions for deep thinking
- 2-3 short-answer questions for specific concepts
- 1-2 multiple-choice questions with 4 options each

For each question, provide:
- Question text
- Type (open-ended, short-answer, multiple-choice)
- Expected answer or answer choices
- Rubric criteria for grading

Return as JSON array:
[
  {
    "text": "Question text",
    "type": "open-ended",
    "rubricCriteria": "How to evaluate this",
    "sampleAnswer": "Example good answer",
    "choices": null
  }
]`;

      const response = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [
          {
            role: "system",
            content: "You are an expert in educational assessment design. Create engaging, pedagogically sound questions."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return result.questions || [];
    } catch (error) {
      console.error("Error generating assessment questions:", error);
      throw new Error("Failed to generate assessment questions");
    }
  }

  async generateTutorResponse(
    componentSkill: any,
    conversationHistory: any[] = [],
    currentEvaluation?: any
  ): Promise<{
    response: string;
    suggestedEvaluation?: any;
    shouldTerminate?: boolean;
    safetyFlag?: string;
  }> {
    try {
      const historyText = conversationHistory
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

      const currentLevel = currentEvaluation?.selfAssessedLevel || 'unknown';
      const skillName = componentSkill.name || 'this skill';
      const rubricLevels = componentSkill.rubricLevels || {};

      const prompt = `You are an AI tutor helping a student develop their competency in "${skillName}".

COMPONENT SKILL: ${skillName}
CURRENT LEVEL: ${currentLevel}

RUBRIC LEVELS:
${Object.entries(rubricLevels)
  .map(([level, description]) => `${level.toUpperCase()}: ${description}`)
  .join("\n")}

Previous conversation:
${historyText}

IMPORTANT SAFETY CHECK:
First, analyze the student's messages for any concerning content including:
- References to homicide, murder, or harming others
- Suicidal ideation or self-harm
- Violence or threats
- Inappropriate or dangerous content

If ANY concerning content is detected, immediately flag it and provide a safety response.

TASKS:
1. Safety Analysis: Check for risky content
2. Educational Response: Provide helpful guidance to progress their skill
3. Suggested Evaluation: Suggest their current level based on the conversation
4. Continue/Terminate: Determine if the conversation should continue

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
        model: "gpt-4.1",
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
        temperature: 0.7,
        max_tokens: 800,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");

      return {
        response: result.response || "I'm here to help you develop this skill!",
        suggestedEvaluation: result.suggestedEvaluation,
        shouldTerminate: result.shouldTerminate || false,
        safetyFlag: result.safetyFlag || undefined
      };
    } catch (error) {
      console.error("Error generating tutor response:", error);
      return {
        response: "I'm here to help you develop this skill! Can you tell me more about what you're working on?",
        shouldTerminate: false
      };
    }
  }

  // Safety incident handling with AI analysis
  async processSelfEvaluationForSafety(analysis: SelfEvaluationAnalysis, studentId: number, teacherId: number): Promise<void> {
    if (analysis.hasRiskyContent && analysis.confidence > 0.7) {
      console.warn(`Safety incident detected for student ${studentId}:`, {
        riskType: analysis.riskType,
        confidence: analysis.confidence
      });

      // Trigger safety incident workflow
      await notifyTeacherOfSafetyIncident(
        studentId,
        teacherId,
        `AI detected potentially concerning content in student self-evaluation: ${analysis.riskType}`,
        analysis.confidence
      );
    }
  }
}

export const aiService = new AIService();