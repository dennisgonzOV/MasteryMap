import OpenAI from "openai";
import type {
  Project,
  Milestone,
  Competency,
  Submission,
  Grade,
  ComponentSkill,
} from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  apiKey: process.env.AZURE_GPT41_API_KEY,
  baseURL:
    "https://denni-mf2i6jxh-eastus2.cognitiveservices.azure.com/openai/deployments/gpt-4.1",
  defaultQuery: { "api-version": "2024-08-01-preview" },
  defaultHeaders: {
    "api-key": process.env.AZURE_GPT41_API_KEY,
  },
});

export interface GeneratedMilestone {
  title: string;
  description: string;
  dueDate?: string;
  order: number;
}

export interface GeneratedAssessment {
  title: string;
  description: string;
  questions: Array<{
    id: string;
    text: string;
    type: "open-ended" | "multiple-choice" | "short-answer";
    rubricCriteria?: string;
    sampleAnswer?: string;
  }>;
}

export interface ProjectIdeaCriteria {
  subject: string;
  topic: string;
  gradeLevel: string;
  duration: string;
  learningObjectives: string;
  competencyFocus?: string;
}

export interface GeneratedProjectIdea {
  title: string;
  description: string;
  overview: string;
  suggestedMilestones: Array<{
    title: string;
    description: string;
    estimatedDuration: string;
  }>;
  assessmentSuggestions: Array<{
    type: string;
    description: string;
  }>;
  requiredResources: string[];
  learningOutcomes: string[];
  competencyAlignment: string[];
}

export class OpenAIService {
  private openai = openai;

  async generateProjectIdeas(criteria: {
    subject: string;
    topic: string;
    gradeLevel: string;
    duration: string;
    componentSkills: any[];
  }): Promise<GeneratedProjectIdea[]> {
    // Format component skills for the prompt
    const skillsText = criteria.componentSkills
      .map(
        (skill) =>
          `- ${skill.name} (${skill.competencyName} - ${skill.learnerOutcomeName})`,
      )
      .join("\n");

    const prompt = `Generate 3 creative and engaging project-based learning ideas based on the following criteria:

Subject: ${criteria.subject}
Topic/Theme: ${criteria.topic}
Grade Level: ${criteria.gradeLevel}
Duration: ${criteria.duration}

Target Component Skills:
${skillsText}

For each project idea, provide:
1. Title - An engaging and descriptive project title
2. Overview - A brief 1-2 sentence summary
3. Description - A detailed description of the project (2-3 paragraphs)
4. Suggested Milestones - 3-5 key milestones with titles, descriptions, and estimated durations
5. Assessment Suggestions - 2-3 different types of assessments that would work well
6. Required Resources - List of materials, tools, or resources needed
7. Learning Outcomes - Specific skills and knowledge students will gain
8. Competency Alignment - How this project develops the selected component skills

Make the projects authentic, relevant to students' lives, and designed to develop both subject knowledge and the specified component skills. Ensure they are appropriate for the specified grade level and can realistically be completed in the given timeframe.

Return the response as a JSON array of project objects with the following structure:
{
  "title": "string",
  "overview": "string", 
  "description": "string",
  "suggestedMilestones": [
    {
      "title": "string",
      "description": "string", 
      "estimatedDuration": "string"
    }
  ],
  "assessmentSuggestions": [
    {
      "type": "string",
      "description": "string"
    }
  ],
  "requiredResources": ["string"],
  "learningOutcomes": ["string"],
  "competencyAlignment": ["string"]
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [
          {
            role: "system",
            content:
              "You are an expert in project-based learning and curriculum design. Generate creative, engaging, and pedagogically sound project ideas that align with modern educational standards and XQ competency framework practices.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.8,
        response_format: { type: "json_object" },
      });

      let content = response.choices[0].message.content || "[]";

      // Clean up any markdown formatting
      let cleanContent = content.trim();
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.replace(/^```json\s*/, "");
      }
      if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.replace(/^```\s*/, "");
      }
      if (cleanContent.endsWith("```")) {
        cleanContent = cleanContent.replace(/\s*```$/, "");
      }

      // Parse the cleaned JSON response
      const parsed = JSON.parse(cleanContent);

      // Handle different response structures
      if (parsed.projects && Array.isArray(parsed.projects)) {
        return parsed.projects;
      } else if (parsed.ideas && Array.isArray(parsed.ideas)) {
        return parsed.ideas;
      } else if (Array.isArray(parsed)) {
        return parsed;
      } else {
        return [parsed];
      }
    } catch (error) {
      console.error("Error generating project ideas:", error);
      throw new Error("Failed to generate project ideas");
    }
  }

  async generateMilestones(project: Project): Promise<GeneratedMilestone[]> {
    const prompt = `Generate 4-6 meaningful project milestones for the following project:

Title: ${project.title}
Description: ${project.description}
Grade Level: ${project.gradeLevel}
Duration: ${project.duration}

Create milestones that:
1. Break the project into logical phases
2. Build upon each other progressively
3. Are appropriate for the grade level and duration
4. Include clear deliverables and checkpoints
5. Are spaced appropriately throughout the project timeline

For each milestone, provide:
- Title: A clear, engaging milestone title
- Description: 2-3 sentences explaining what students will accomplish
- DueDate: When this milestone should be completed (relative to project start)
- Order: The sequence number (1, 2, 3, etc.)

Return as JSON array with this structure:
[
  {
    "title": "string",
    "description": "string",
    "dueDate": "YYYY-MM-DD or relative date like '2 weeks'",
    "order": 1
  }
]`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [
          {
            role: "system",
            content:
              "You are an expert in project-based learning and milestone planning. Create well-structured, achievable milestones that guide student progress.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return result.milestones || [];
    } catch (error) {
      console.error("Error generating milestones:", error);
      throw new Error("Failed to generate milestones");
    }
  }

  async generateMilestonesFromComponentSkills(
    projectTitle: string,
    projectDescription: string,
    projectDueDate: string,
    componentSkills: ComponentSkill[],
  ): Promise<GeneratedMilestone[]> {
    const skillsText = componentSkills
      .map(
        (skill) =>
          `- ${skill.name} (${skill.competencyName} - ${skill.learnerOutcomeName})`,
      )
      .join("\n");

    const prompt = `Generate 3-5 meaningful project milestones that will develop the specified component skills:

Project Title: ${projectTitle}
Project Description: ${projectDescription}
Project Due Date: ${projectDueDate}

Target Component Skills:
${skillsText}

Create milestones that:
1. Systematically develop each component skill
2. Build progressively toward the final project goal
3. Include authentic assessments and deliverables
4. Are spaced appropriately throughout the project timeline
5. Connect learning to real-world applications

For each milestone, provide:
- Title: A clear, engaging milestone title that reflects the skill focus
- Description: 2-3 sentences explaining what students will accomplish and how it develops the targeted skills
- DueDate: When this milestone should be completed (as a date string)
- Order: The sequence number (1, 2, 3, etc.)

Return as JSON with this structure:
{
  "milestones": [
    {
      "title": "string",
      "description": "string",
      "dueDate": "YYYY-MM-DD",
      "order": 1
    }
  ]
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [
          {
            role: "system",
            content:
              "You are an expert in competency-based education and project milestone design. Create milestones that systematically develop component skills through authentic project work.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return result.milestones || [];
    } catch (error) {
      console.error(
        "Error generating milestones from component skills:",
        error,
      );
      throw new Error("Failed to generate milestones");
    }
  }

  async generateAssessment(milestone: Milestone): Promise<GeneratedAssessment> {
    const prompt = `Generate a comprehensive assessment for the following project milestone:

Milestone Title: ${milestone.title}
Milestone Description: ${milestone.description}
Due Date: ${milestone.dueDate}

Create an assessment that:
1. Evaluates student understanding and skill development
2. Includes a variety of question types
3. Is appropriate for the milestone's learning objectives
4. Provides opportunities for students to demonstrate mastery
5. Includes clear rubric criteria for each question

Generate 5-8 assessment questions with a mix of:
- Open-ended questions for deep thinking
- Short-answer questions for specific knowledge
- Multiple-choice questions for foundational understanding

For each question, provide:
- ID: A unique identifier
- Text: The question text
- Type: 'open-ended', 'multiple-choice', or 'short-answer'
- RubricCriteria: How to evaluate the response
- SampleAnswer: An example of a good response

Return as JSON with this structure:
{
  "title": "Assessment Title",
  "description": "Brief description of what this assessment evaluates",
  "questions": [
    {
      "id": "q1",
      "text": "Question text here",
      "type": "open-ended",
      "rubricCriteria": "Evaluation criteria",
      "sampleAnswer": "Example answer"
    }
  ]
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [
          {
            role: "system",
            content:
              "You are an expert in educational assessment design. Create fair, comprehensive assessments that accurately measure student learning and skill development.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      });

      return JSON.parse(response.choices[0].message.content || "{}");
    } catch (error) {
      console.error("Error generating assessment:", error);
      throw new Error("Failed to generate assessment");
    }
  }

  async generateAssessmentFromComponentSkills(
    milestoneTitle: string,
    milestoneDescription: string,
    milestoneDueDate: string,
    componentSkills: ComponentSkill[],
  ): Promise<GeneratedAssessment> {
    const skillsText = componentSkills
      .map(
        (skill) =>
          `- ${skill.name}: ${skill.description} (${skill.competencyName} - ${skill.learnerOutcomeName})`,
      )
      .join("\n");

    const prompt = `Generate a comprehensive competency-based assessment for the following milestone:

Milestone Title: ${milestoneTitle}
Milestone Description: ${milestoneDescription}
Due Date: ${milestoneDueDate}

Target Component Skills to Assess:
${skillsText}

Create an assessment that:
1. Systematically evaluates each component skill
2. Uses authentic, performance-based questions
3. Includes multiple question types and formats
4. Provides clear rubric criteria aligned to skill development levels
5. Enables demonstration of skill mastery through varied approaches

Generate 6-10 assessment questions that collectively assess all component skills. Include:
- Performance-based questions that demonstrate skill application
- Reflective questions that show understanding of skill development
- Scenario-based questions that test skill transfer
- Self-assessment components where appropriate

For each question, provide:
- ID: A unique identifier
- Text: The question text
- Type: 'open-ended', 'multiple-choice', or 'short-answer'
- RubricCriteria: Detailed evaluation criteria tied to skill levels
- SampleAnswer: An example demonstrating proficient skill level
- ComponentSkillFocus: Which component skill(s) this question primarily assesses

Return as JSON with this structure:
{
  "title": "Assessment Title",
  "description": "Brief description focusing on component skill assessment",
  "questions": [
    {
      "id": "q1",
      "text": "Question text here",
      "type": "open-ended",
      "rubricCriteria": "Evaluation criteria aligned to skill levels",
      "sampleAnswer": "Example answer showing skill proficiency",
      "componentSkillFocus": ["skill1", "skill2"]
    }
  ]
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [
          {
            role: "system",
            content:
              "You are an expert in competency-based assessment and XQ framework implementation. Create assessments that authentically measure component skill development and mastery.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return result;
    } catch (error) {
      console.error(
        "Error generating assessment from component skills:",
        error,
      );
      throw new Error("Failed to generate assessment");
    }
  }

  async generateFeedback(
    submission: Submission,
    grades: Grade[],
  ): Promise<string> {
    try {
      const gradesSummary = grades
        .map(
          (g) =>
            `Component Skill: ${g.componentSkillId}, Level: ${g.rubricLevel}, Score: ${g.score}`,
        )
        .join("\n");

      const prompt = `
You are an expert educator providing personalized feedback to a student. 
Based on the submission and grades, provide constructive, encouraging feedback that:

1. Acknowledges strengths and achievements
2. Identifies specific areas for improvement
3. Provides actionable next steps
4. Maintains a positive, growth-oriented tone
5. Connects to the learning objectives

Student Responses: ${JSON.stringify(submission.responses)}
Grades Summary:
${gradesSummary}

Provide feedback that is:
- Specific and detailed
- Constructive and encouraging  
- Focused on learning growth
- Approximately 100-200 words
`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [
          {
            role: "system",
            content:
              "You are an expert educator providing personalized, constructive feedback to students.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
      });

      return (
        response.choices[0].message.content ||
        "Great work! Keep up the excellent effort."
      );
    } catch (error) {
      console.error("Error generating feedback:", error);
      throw new Error("Failed to generate feedback");
    }
  }

  async generateComponentSkillGrades(
    submission: Submission,
    assessment: any,
    componentSkills: ComponentSkill[],
  ): Promise<
    Array<{
      componentSkillId: number;
      rubricLevel: "emerging" | "developing" | "proficient" | "applying";
      feedback: string;
      score: number;
    }>
  > {
    try {
      // Map rubric levels to scores for consistency
      const rubricLevelScores = {
        emerging: 1,
        developing: 2,
        proficient: 3,
        applying: 4,
      };

      const skillGrades = await Promise.all(
        componentSkills.map(async (skill) => {
          const prompt = `
You are an expert educator evaluating a student's component skill development. Analyze the student's submission to determine their current level for this specific component skill.

Component Skill: ${skill.name}
Skill Description: ${skill.description}
Competency Area: ${skill.competencyName}
Learning Outcome: ${skill.learnerOutcomeName}

Student Submission Responses: ${JSON.stringify(submission.responses)}
Assessment Questions: ${JSON.stringify(assessment.questions)}

Evaluate the student's performance on this component skill using the XQ Framework rubric levels:

1. EMERGING (Score 1): Student shows initial awareness and attempts at the skill but needs significant support and guidance. Work demonstrates basic understanding but limited application.

2. DEVELOPING (Score 2): Student demonstrates growing competence with the skill. Can apply it with some support and guidance. Shows understanding of core concepts but application may be inconsistent.

3. PROFICIENT (Score 3): Student demonstrates solid competence with the skill. Can apply it independently in familiar contexts. Shows clear understanding and consistent application.

4. APPLYING (Score 4): Student demonstrates advanced competence with the skill. Can apply it independently in new and complex contexts. Shows deep understanding and can transfer the skill to novel situations.

Based on the student's responses, determine:
1. The appropriate rubric level (emerging, developing, proficient, or applying)
2. Specific evidence from their responses that supports this level
3. Constructive feedback for continued growth in this skill

Respond in JSON format:
{
  "rubricLevel": "emerging|developing|proficient|applying",
  "feedback": "Specific feedback about their skill demonstration and growth areas",
  "score": 1|2|3|4
}`;

          const response = await this.openai.chat.completions.create({
            model: "gpt-4.1",
            messages: [
              {
                role: "system",
                content:
                  "You are an expert in competency-based assessment and the XQ Framework. Provide accurate, fair evaluations of student component skill development.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            response_format: { type: "json_object" },
            temperature: 0.3,
          });

          const result = JSON.parse(
            response.choices[0].message.content || "{}",
          );

          return {
            componentSkillId: skill.id,
            rubricLevel: result.rubricLevel || "emerging",
            feedback: result.feedback || "",
            score: rubricLevelScores[result.rubricLevel] || 1,
          };
        }),
      );

      return skillGrades;
    } catch (error) {
      console.error("Error generating component skill grades:", error);
      throw new Error("Failed to generate component skill grades");
    }
  }

  async generateQuestionGrade(
    questionText: string,
    studentAnswer: string,
    rubricCriteria: string,
    sampleAnswer: string,
  ): Promise<{ score: number; rationale: string }> {
    try {
      const prompt = `
You are an expert educator grading a student's response to a specific question. Analyze the quality, accuracy, and depth of the student's answer.

QUESTION: ${questionText}

STUDENT ANSWER: ${studentAnswer}

RUBRIC CRITERIA: ${rubricCriteria || "Evaluate based on accuracy, completeness, and understanding demonstrated"}

SAMPLE/IDEAL ANSWER: ${sampleAnswer || "Not provided"}

Grade this response on a scale of 0-100 based on:
1. Accuracy and correctness of information
2. Completeness of the response
3. Depth of understanding demonstrated
4. Clarity and organization of thoughts
5. Use of relevant examples or evidence
6. Alignment with rubric criteria

Consider:
- A score of 90-100: Exceptional understanding, complete and accurate
- A score of 80-89: Strong understanding, mostly complete and accurate
- A score of 70-79: Good understanding, adequate response with minor gaps
- A score of 60-69: Basic understanding, partially complete or some inaccuracies
- A score of 50-59: Limited understanding, significant gaps or errors
- A score of 0-49: Poor understanding, incorrect or insufficient response

Respond with JSON in this format:
{
  "score": 85,
  "rationale": "Brief explanation of the grade (1-2 sentences)"
}
`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [
          {
            role: "system",
            content:
              "You are an expert educator with extensive experience in assessment and grading. Provide fair, consistent, and educationally sound grades.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3, // Lower temperature for more consistent grading
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");

      // Validate the response
      const score =
        typeof result.score === "number"
          ? Math.max(0, Math.min(100, result.score))
          : -1;
      const rationale =
        typeof result.rationale === "string"
          ? result.rationale
          : "AI grading analysis completed";

      return { score, rationale };
    } catch (error) {
      console.error("Error in AI question grading:", error);
      return { score: -1, rationale: "Error occurred during AI grading" };
    }
  }

  async suggestCredentials(
    submission: Submission,
    grades: Grade[],
    projectTitle: string,
  ): Promise<any[]> {
    try {
      const gradesSummary = grades
        .map(
          (g) =>
            `Component Skill ${g.componentSkillId}: ${g.rubricLevel} (Score: ${g.score})`,
        )
        .join("\n");

      const prompt = `
Based on this student's performance, suggest appropriate micro-credentials they have earned:

Project: ${projectTitle}
Student Performance:
${gradesSummary}

Responses: ${JSON.stringify(submission.responses)}

Suggest 1-3 micro-credentials this student has demonstrated based on their work. Only suggest credentials for skills where they show proficient or applying level performance.

For each credential, provide:
- Type: Choose from 'badge', 'certificate', 'sticker', 'medal'
- Title: A specific, meaningful credential name
- Description: What achievement this recognizes (1-2 sentences)

Return as JSON:
{
  "credentials": [
    {
      "type": "sticker",
      "title": "Credential title",
      "description": "Brief description of what this recognizes"
    }
  ]
}
`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [
          {
            role: "system",
            content:
              "You are an expert educator designing meaningful micro-credentials for student achievements.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return result.credentials || [];
    } catch (error) {
      console.error("Error suggesting credentials:", error);
      return [];
    }
  }
}

export const openAIService = new OpenAIService();
