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

export async function generateProjectIdeas(criteria: {
  subject: string;
  topic: string;
  gradeLevel: string;
  duration: string;
  componentSkills: any[];
}) {
  // Format component skills for the prompt
  const skillsText = criteria.componentSkills.map(skill => 
    `- ${skill.name} (${skill.competencyName} - ${skill.learnerOutcomeName})`
  ).join('\n');

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
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert in project-based learning and curriculum design. Generate creative, engaging, and pedagogically sound project ideas that align with modern educational standards and XQ competency framework practices."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 4000
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content received from OpenAI");
    }

    // Clean the response content to remove markdown code blocks
    let cleanContent = content.trim();
    
    // Remove markdown code block markers if present
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/^```json\s*/, '');
    }
    if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```\s*/, '');
    }
    if (cleanContent.endsWith('```')) {
      cleanContent = cleanContent.replace(/\s*```$/, '');
    }
    
    // Parse the cleaned JSON response
    const ideas = JSON.parse(cleanContent);
    return Array.isArray(ideas) ? ideas : [ideas];

  } catch (error) {
    console.error("Error generating project ideas:", error);
    throw new Error("Failed to generate project ideas");
  }
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
  componentSkills: ComponentSkill[],
  bestStandards?: any[]
): Promise<GeneratedMilestone[]> {
  try {
    // Format component skills with full hierarchical context
    const skillsText = componentSkills.map(skill => 
      `- ${skill.name} (Competency: ${skill.competencyName || 'N/A'} | Learner Outcome: ${skill.learnerOutcomeName || 'N/A'})`
    ).join('\n');
    
    const standardsText = bestStandards?.length 
      ? bestStandards.map(standard => `${standard.benchmarkNumber}: ${standard.description}`).join('\n')
      : '';

    // Calculate date constraints
    const todayDate = new Date();
    const projectDueDateObj = new Date(projectDueDate);
    const todayStr = todayDate.toISOString().split('T')[0];

    // Determine the primary focus based on what's selected
    const hasComponentSkills = componentSkills.length > 0;
    const hasBestStandards = bestStandards?.length > 0;
    
    let primaryFocus = '';
    let targetSection = '';
    
    if (hasComponentSkills && hasBestStandards) {
      primaryFocus = 'develop and assess the selected XQ component skills while also addressing B.E.S.T. standards';
      targetSection = `XQ COMPONENT SKILLS TO DEVELOP:
${skillsText}

B.E.S.T. STANDARDS TO ADDRESS:
${standardsText}`;
    } else if (hasComponentSkills) {
      primaryFocus = 'develop and assess the selected XQ component skills';
      targetSection = `XQ COMPONENT SKILLS TO DEVELOP:
${skillsText}`;
    } else if (hasBestStandards) {
      primaryFocus = 'address the selected B.E.S.T. standards';
      targetSection = `B.E.S.T. STANDARDS TO ADDRESS:
${standardsText}`;
    } else {
      primaryFocus = 'support general project-based learning objectives';
      targetSection = 'PROJECT-BASED LEARNING FOCUS:\nDevelop critical thinking, collaboration, and communication skills through authentic project work.';
    }

    const prompt = `
You are an expert educational consultant specializing in project-based learning and competency-based education with deep knowledge of the XQ Institute framework. 
Generate 4-6 meaningful milestones for the following project that specifically ${primaryFocus}.

Project Title: ${projectTitle}
Project Description: ${projectDescription}
Project Due Date: ${projectDueDate}

${targetSection}

CRITICAL DATE REQUIREMENTS:
- Today's date: ${todayStr}
- Project due date: ${projectDueDate}
- ALL milestone due dates must be between ${todayStr} and ${projectDueDate}
- Space milestones evenly between these dates
- No milestone can be due before today or after the project due date

CRITICAL REQUIREMENTS FOR LEARNING TARGET INTEGRATION:
${hasComponentSkills ? `1. Each milestone MUST explicitly target and develop specific XQ component skills from the list above
2. Milestone descriptions must clearly explain HOW students will demonstrate each component skill
3. Build progressively toward the project goal while scaffolding component skill development
4. Allow for authentic assessment of component skills at each stage${hasBestStandards ? ' while meeting B.E.S.T. standards' : ''}
5. Include both individual and collaborative elements that align with XQ competency framework
6. Follow a logical sequence that develops component skills from foundational to advanced application
7. Each milestone should target 1-3 specific component skills with clear performance expectations
8. Earlier milestones focus on foundational component skills, later ones on synthesis and real-world application
${hasBestStandards ? '9. Integrate B.E.S.T. standards seamlessly with XQ component skill development' : ''}
10. Ensure every component skill from the selected list is addressed across the milestone sequence` : ''}
${hasBestStandards && !hasComponentSkills ? `1. Each milestone MUST explicitly address specific B.E.S.T. standards from the list above
2. Milestone descriptions must clearly explain HOW students will demonstrate mastery of the standards
3. Build progressively toward the project goal while ensuring comprehensive standards coverage
4. Allow for authentic assessment of standard mastery at each stage
5. Include both individual and collaborative elements that support standards achievement
6. Follow a logical sequence that develops understanding from foundational to advanced application
7. Each milestone should target 1-3 specific standards with clear performance expectations
8. Earlier milestones focus on foundational concepts, later ones on synthesis and real-world application
9. Ensure every B.E.S.T. standard from the selected list is addressed across the milestone sequence` : ''}
${!hasComponentSkills && !hasBestStandards ? `1. Each milestone MUST support authentic project-based learning
2. Milestone descriptions must clearly explain learning objectives and expected outcomes
3. Build progressively toward the project goal with clear scaffolding
4. Allow for authentic assessment of student learning at each stage
5. Include both individual and collaborative elements
6. Follow a logical sequence from foundational to advanced application
7. Each milestone should have clear, measurable learning objectives
8. Focus on developing 21st-century skills through project work` : ''}

Calculate appropriate due dates for each milestone, spacing them evenly between today and the project due date.

Respond with JSON in this format:
{
  "milestones": [
    {
      "title": "Milestone title",
      "description": "Detailed description of what students will accomplish${hasComponentSkills ? ', explicitly naming which XQ component skills they will demonstrate and HOW they will demonstrate them (e.g., \'Students will demonstrate Creative Knowledge Building by generating multiple innovative solutions...\')' : ''}${hasBestStandards ? ', and how B.E.S.T. standards are addressed' : ''}${!hasComponentSkills && !hasBestStandards ? ', with clear learning objectives and expected outcomes' : ''}",
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
    const milestones = result.milestones || [];

    // Validate and fix milestone dates with educational best practices
    const todayValidation = new Date();
    const projectDueValidation = new Date(projectDueDate);

    const validatedMilestones = milestones.map((milestone: any, index: number) => {
      let milestoneDate = new Date(milestone.dueDate);

      // If milestone date is invalid, before today, or after project due date, fix it
      if (isNaN(milestoneDate.getTime()) || milestoneDate < todayValidation || milestoneDate > projectDueValidation) {
        const totalDays = Math.ceil((projectDueValidation.getTime() - todayValidation.getTime()) / (1000 * 60 * 60 * 24));

        // Ensure minimum 3 days between milestones and reasonable distribution
        const minimumDaysBetween = 3;
        const numberOfMilestones = milestones.length;

        // Calculate if we have enough time for proper spacing
        const minimumRequiredDays = numberOfMilestones * minimumDaysBetween;

        let daysFromToday: number;
        if (totalDays < minimumRequiredDays) {
          // If not enough time, space as evenly as possible
          daysFromToday = Math.floor((totalDays / numberOfMilestones) * (index + 1));
        } else {
          // Use progressive distribution: earlier milestones closer together, later ones more spaced
          // This reflects typical project phases (planning, development, refinement, completion)
          const progressiveWeights = [0.15, 0.35, 0.65, 0.85, 0.95]; // Sample weights for up to 5 milestones
          const weight = progressiveWeights[Math.min(index, progressiveWeights.length - 1)] || (index + 1) / numberOfMilestones;
          daysFromToday = Math.floor(totalDays * weight);
        }

        // Ensure minimum spacing from previous milestone
        if (index > 0) {
          const previousMilestoneDate = new Date(validatedMilestones[index - 1].dueDate);
          const earliestAllowedDate = new Date(previousMilestoneDate);
          earliestAllowedDate.setDate(earliestAllowedDate.getDate() + minimumDaysBetween);

          const candidateDate = new Date(todayValidation);
          candidateDate.setDate(candidateDate.getDate() + daysFromToday);

          if (candidateDate < earliestAllowedDate) {
            daysFromToday = Math.ceil((earliestAllowedDate.getTime() - todayValidation.getTime()) / (1000 * 60 * 60 * 24));
          }
        }

        const fixedDate = new Date(todayValidation);
        fixedDate.setDate(fixedDate.getDate() + daysFromToday);

        // Prefer weekdays for due dates (avoid Saturdays and Sundays)
        const dayOfWeek = fixedDate.getDay();
        if (dayOfWeek === 0) { // Sunday
          fixedDate.setDate(fixedDate.getDate() + 1); // Move to Monday
        } else if (dayOfWeek === 6) { // Saturday
          fixedDate.setDate(fixedDate.getDate() + 2); // Move to Monday
        }

        // Ensure we don't exceed project due date
        if (fixedDate > projectDueValidation) {
          fixedDate.setTime(projectDueValidation.getTime() - (24 * 60 * 60 * 1000)); // Day before project due
        }

        milestone.dueDate = fixedDate.toISOString().split('T')[0];
      }

      return milestone;
    });

    return validatedMilestones;
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
  componentSkills: ComponentSkill[],
  bestStandards?: any[]
): Promise<GeneratedAssessment> {
  try {
    console.log('Generating assessment for milestone:', milestoneTitle);
    
    // Format component skills with full context for better AI understanding
    const skillsText = componentSkills.map(skill => 
      `- ${skill.name} (Competency: ${skill.competencyName || 'N/A'} | Learner Outcome: ${skill.learnerOutcomeName || 'N/A'})`
    ).join('\n');
    
    const standardsText = bestStandards?.length 
      ? bestStandards.map(standard => `${standard.benchmarkNumber}: ${standard.description}`).join('\n')
      : '';

    const prompt = `
You are an expert educational assessment designer specializing in XQ competency-based education. Create a comprehensive assessment for the following milestone that specifically measures and evaluates the XQ component skills${bestStandards?.length ? ' while addressing B.E.S.T. standards' : ''}.

Milestone Title: ${milestoneTitle}
Milestone Description: ${milestoneDescription}
Due Date: ${milestoneDueDate}

XQ COMPONENT SKILLS TO ASSESS:
${skillsText}
${bestStandards?.length ? `
B.E.S.T. STANDARDS TO ADDRESS:
${standardsText}` : ''}

CRITICAL REQUIREMENTS FOR XQ COMPONENT SKILL ASSESSMENT:
1. Each question MUST explicitly assess one or more specific XQ component skills from the list above
2. Questions must be designed to reveal student proficiency levels in the targeted component skills
3. Include 3-5 questions (mix of open-ended, short-answer, and multiple-choice) that authentically measure component skills
4. Align with XQ competency rubrics (Emerging, Developing, Proficient, Applying) for each component skill
5. Create questions that require students to demonstrate their component skill understanding through authentic tasks
6. Include clear rubric criteria that specifically describe what component skill demonstration looks like at each level
7. Provide sample responses that exemplify different proficiency levels for each component skill
8. For multiple-choice questions, provide exactly 4 answer options that test component skill understanding
${bestStandards?.length ? '9. Seamlessly integrate B.E.S.T. standards assessment within component skill evaluation' : ''}
10. Ensure every component skill listed above is assessed through at least one question

IMPORTANT: For multiple-choice questions, the "options" field must be an array of strings, not a string.

Respond with JSON in this format:
{
  "title": "Assessment title",
  "description": "Brief description of the assessment that explicitly lists which XQ component skills it measures and how students will demonstrate them${bestStandards?.length ? ', plus how B.E.S.T. standards are integrated' : ''}",
  "questions": [
    {
      "id": "unique_id",
      "text": "Question text",
      "type": "open-ended",
      "rubricCriteria": "Specific criteria for assessing XQ component skill demonstration - what evidence shows Emerging, Developing, Proficient, or Applying level performance for the targeted component skill${bestStandards?.length ? ' while meeting B.E.S.T. standards' : ''}",
      "sampleAnswer": "Example of a proficient response"
    },
    {
      "id": "unique_id_2",
      "text": "Multiple choice question text",
      "type": "multiple-choice",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "rubricCriteria": "What to look for in the correct response",
      "sampleAnswer": "Option A - because [explanation]"
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
      `Component Skill: ${g.componentSkillId}, Level: ${g.rubricLevel}, Score: ${g.score}`
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
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
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

export async function generateFeedbackForQuestion(
  questionId: string,
  studentAnswer: string,
  rubricCriteria?: string,
  sampleAnswer?: string
): Promise<string> {
  try {
    const prompt = `
You are an expert educator providing specific feedback on a student's answer to a single question. 
Analyze the student's response and provide constructive, personalized feedback.

Question ID: ${questionId}
Student Answer: ${studentAnswer}
${rubricCriteria ? `Rubric Criteria: ${rubricCriteria}` : ''}
${sampleAnswer ? `Sample Answer: ${sampleAnswer}` : ''}

Provide feedback that:
1. Acknowledges what the student did well
2. Identifies specific strengths in their response
3. Points out areas for improvement with specific examples
4. Provides actionable suggestions for enhancement
5. Maintains an encouraging and supportive tone
6. Connects to the rubric criteria if provided

Keep the feedback focused, specific, and approximately 50-100 words.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert educator providing specific, constructive feedback on individual student responses."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
    });

    return response.choices[0].message.content || "Good effort! Consider reviewing the rubric criteria for additional guidance.";
  } catch (error) {
    console.error("Error generating question feedback:", error);
    throw new Error("Failed to generate question feedback");
  }
}

export async function generateQuestionGrade(
  questionText: string,
  studentAnswer: string,
  rubricCriteria: string,
  sampleAnswer: string
): Promise<{ score: number; rationale: string }> {
  try {
    const prompt = `
You are an expert educator grading a student's response to a specific question. Analyze the quality, accuracy, and depth of the student's answer.

QUESTION: ${questionText}

STUDENT ANSWER: ${studentAnswer}

RUBRIC CRITERIA: ${rubricCriteria || 'Evaluate based on accuracy, completeness, and understanding demonstrated'}

SAMPLE/IDEAL ANSWER: ${sampleAnswer || 'Not provided'}

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

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert educator with extensive experience in assessment and grading. Provide fair, consistent, and educationally sound grades."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3, // Lower temperature for more consistent grading
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    // Validate the response
    const score = typeof result.score === 'number' ? Math.max(0, Math.min(100, result.score)) : -1;
    const rationale = typeof result.rationale === 'string' ? result.rationale : 'AI grading analysis completed';
    
    return { score, rationale };
  } catch (error) {
    console.error("Error in AI question grading:", error);
    return { score: -1, rationale: 'AI grading failed - manual review recommended' };
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