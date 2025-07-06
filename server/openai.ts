import OpenAI from "openai";
import type { Project, Milestone, Competency, Submission, Grade, ComponentSkill } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || ""
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
    type: 'open-ended' | 'multiple-choice' | 'short-answer';
    rubricCriteria?: string;
    sampleAnswer?: string;
  }>;
}

export async function generateMilestones(
  project: Project, 
  competencies: Competency[]
): Promise<GeneratedMilestone[]> {
  try {
    const competencyNames = competencies.map(c => c.name).join(', ');
    
    const prompt = `
You are an expert educational consultant specializing in project-based learning. 
Generate 4-6 meaningful milestones for the following project that align with the specified competencies.

Project Title: ${project.title}
Project Description: ${project.description}
Target Competencies: ${competencyNames}

Create milestones that:
1. Build progressively toward the project goal
2. Allow for competency assessment at each stage
3. Include both individual and collaborative elements
4. Are specific, measurable, and achievable
5. Follow a logical sequence

Respond with JSON in this format:
{
  "milestones": [
    {
      "title": "Milestone title",
      "description": "Detailed description of what students will accomplish",
      "order": 1
    }
  ]
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert educational consultant. Provide detailed, actionable milestones for project-based learning."
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
    return result.milestones || [];
  } catch (error) {
    console.error("Error generating milestones:", error);
    throw new Error("Failed to generate milestones");
  }
}

export async function generateMilestonesFromComponentSkills(
  projectTitle: string,
  projectDescription: string,
  projectDueDate: string,
  componentSkills: ComponentSkill[]
): Promise<GeneratedMilestone[]> {
  try {
    const skillNames = componentSkills.map(skill => skill.name).join(', ');
    
    const prompt = `
You are an expert educational consultant specializing in project-based learning and competency-based education. 
Generate 4-6 meaningful milestones for the following project that align with the specified XQ component skills.

Project Title: ${projectTitle}
Project Description: ${projectDescription}
Project Due Date: ${projectDueDate}
Target Component Skills: ${skillNames}

Create milestones that:
1. Build progressively toward the project goal
2. Allow for component skill assessment at each stage
3. Include both individual and collaborative elements
4. Are specific, measurable, and achievable
5. Follow a logical sequence leading to the project due date
6. Each milestone should target 1-3 specific component skills
7. Earlier milestones should focus on foundational skills, later ones on synthesis and application

Calculate appropriate due dates for each milestone, spacing them evenly between now and the project due date.

Respond with JSON in this format:
{
  "milestones": [
    {
      "title": "Milestone title",
      "description": "Detailed description of what students will accomplish and which component skills they will demonstrate",
      "dueDate": "YYYY-MM-DD",
      "order": 1
    }
  ]
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert educational consultant specializing in competency-based project learning. Provide detailed, actionable milestones with realistic timelines."
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
    return result.milestones || [];
  } catch (error) {
    console.error("Error generating milestones from component skills:", error);
    throw new Error("Failed to generate milestones");
  }
}

export async function generateAssessment(
  milestone: Milestone,
  competencies: Competency[]
): Promise<GeneratedAssessment> {
  try {
    console.log('Generating assessment for milestone:', milestone.title);
    const competencyNames = competencies.map(c => c.name).join(', ');
    
    const prompt = `
You are an expert educational assessment designer. Create a comprehensive assessment for the following milestone that aligns with the specified competencies.

Milestone Title: ${milestone.title}
Milestone Description: ${milestone.description}
Target Competencies: ${competencyNames}

Create an assessment that:
1. Includes 3-5 open-ended questions
2. Aligns with XQ competency rubrics (Emerging, Developing, Proficient, Applying)
3. Allows for authentic demonstration of learning
4. Includes clear rubric criteria for each question
5. Provides sample high-quality responses

Respond with JSON in this format:
{
  "title": "Assessment title",
  "description": "Brief description of the assessment",
  "questions": [
    {
      "id": "unique_id",
      "text": "Question text",
      "type": "open-ended",
      "rubricCriteria": "What to look for in responses",
      "sampleAnswer": "Example of a proficient response"
    }
  ]
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert educational assessment designer. Create authentic, competency-based assessments."
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
    return result;
  } catch (error) {
    console.error("Error generating assessment:", error);
    throw new Error("Failed to generate assessment");
  }
}

export async function generateAssessmentFromComponentSkills(
  milestoneTitle: string,
  milestoneDescription: string,
  milestoneDueDate: string,
  componentSkills: ComponentSkill[]
): Promise<GeneratedAssessment> {
  try {
    console.log('Generating assessment for milestone:', milestoneTitle);
    const skillNames = componentSkills.map(skill => skill.name).join(', ');
    
    const prompt = `
You are an expert educational assessment designer specializing in competency-based education. Create a comprehensive assessment for the following milestone that measures the specified XQ component skills.

Milestone Title: ${milestoneTitle}
Milestone Description: ${milestoneDescription}
Due Date: ${milestoneDueDate}
Target Component Skills: ${skillNames}

Create an assessment that:
1. Includes 3-5 questions (mix of open-ended, short-answer, and multiple-choice)
2. Aligns with XQ competency rubrics (Emerging, Developing, Proficient, Applying)
3. Allows for authentic demonstration of component skills
4. Includes clear rubric criteria for each question
5. Provides sample high-quality responses
6. Each question should target specific component skills

Respond with JSON in this format:
{
  "title": "Assessment title",
  "description": "Brief description of the assessment and which component skills it measures",
  "questions": [
    {
      "id": "unique_id",
      "text": "Question text",
      "type": "open-ended",
      "rubricCriteria": "What to look for in responses to assess the component skill",
      "sampleAnswer": "Example of a proficient response"
    }
  ]
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert educational assessment designer specializing in competency-based learning. Create authentic assessments that measure specific component skills."
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
    return result;
  } catch (error) {
    console.error("Error generating assessment from component skills:", error);
    throw new Error("Failed to generate assessment");
  }
}

export async function generateFeedback(
  submission: Submission,
  grades: Grade[]
): Promise<string> {
  try {
    const gradesSummary = grades.map(g => 
      `Outcome: ${g.outcomeId}, Level: ${g.rubricLevel}, Score: ${g.score}`
    ).join('\n');

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

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert educator providing personalized, constructive feedback to students."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
    });

    return response.choices[0].message.content || "Great work! Keep up the excellent effort.";
  } catch (error) {
    console.error("Error generating feedback:", error);
    throw new Error("Failed to generate feedback");
  }
}

export async function suggestCredentials(
  studentId: string,
  grades: Grade[]
): Promise<Array<{ type: string; title: string; description: string }>> {
  try {
    const proficientGrades = grades.filter(g => 
      g.rubricLevel === 'proficient' || g.rubricLevel === 'applying'
    );

    if (proficientGrades.length === 0) {
      return [];
    }

    const prompt = `
Based on the following student achievements, suggest appropriate credentials (stickers) to award:

Student Achievements:
${proficientGrades.map(g => `Outcome ${g.outcomeId}: ${g.rubricLevel} level`).join('\n')}

Suggest 1-3 stickers that recognize specific skills or competencies demonstrated. 
Stickers should be:
- Specific to the achievements
- Motivating and meaningful
- Appropriate for the proficiency level

Respond with JSON in this format:
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

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert educator designing meaningful micro-credentials for student achievements."
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
    return result.credentials || [];
  } catch (error) {
    console.error("Error suggesting credentials:", error);
    return [];
  }
}
