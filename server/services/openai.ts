import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface SelfEvaluationAnalysis {
  improvementFeedback: string;
  hasRiskyContent: boolean;
  riskType?: "homicide" | "suicide" | "self-harm" | "violence" | "other";
  confidence: number;
}

async function generateSelfEvaluationFeedback(
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
      improvementFeedback:
        result.improvementFeedback ||
        "Continue practicing and reflecting on your progress.",
      hasRiskyContent: result.hasRiskyContent || false,
      riskType: result.riskType || undefined,
      confidence: result.confidence || 0.5,
    };
  } catch (error) {
    console.error("OpenAI API error for self-evaluation feedback:", error);

    // Fallback safety check using keyword detection
    const riskKeywords = [
      "kill",
      "murder",
      "suicide",
      "self-harm",
      "harm others",
      "hurt myself",
      "want to die",
      "end my life",
      "hurt someone",
      "violence",
    ];

    const content = `${justification} ${examples}`.toLowerCase();
    const hasRiskyContent = riskKeywords.some((keyword) =>
      content.includes(keyword),
    );

    return {
      improvementFeedback: hasRiskyContent
        ? "Please speak with your teacher about your response."
        : "Keep working on developing your skills through practice and reflection.",
      hasRiskyContent,
      riskType: hasRiskyContent ? "other" : undefined,
      confidence: 0.7,
    };
  }
}

async function generateAssessmentQuestions(
  componentSkills: any[],
  questionCount: number = 3,
  questionTypes: string[] = ["open-ended"],
): Promise<any[]> {
  try {
    const skillsDescription = componentSkills
      .map(
        (skill) =>
          `${skill.name}: ${Object.entries(skill.rubricLevels || {})
            .map(([level, desc]) => `${level} - ${desc}`)
            .join("; ")}`,
      )
      .join("\n");

    const prompt = `Create ${questionCount} assessment questions for these component skills:

${skillsDescription}

Requirements:
- Question types: ${questionTypes.join(", ")}
- Questions should assess student competency levels from emerging to applying
- Include rubric criteria for grading
- For multiple-choice questions, provide 4 options with correct answer
- Focus on practical application and real-world scenarios

Respond with JSON array of questions in this format:
[
  {
    "text": "question text",
    "type": "open-ended|multiple-choice|short-answer",
    "rubricCriteria": "how to evaluate this question",
    "options": ["option1", "option2", "option3", "option4"], // only for multiple-choice
    "correctAnswer": "correct option" // only for multiple-choice
  }
]`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert educational assessment designer. Create high-quality, competency-based assessment questions.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.questions || [];
  } catch (error) {
    console.error("OpenAI API error for question generation:", error);
    return [];
  }
}

async function generateTutorResponse(
  componentSkill: any,
  conversationHistory: any[],
  currentEvaluation: any,
): Promise<{ response: string; suggestedEvaluation?: any; shouldTerminate?: boolean; safetyFlag?: string }> {
  try {
    // Extract the latest student message
    const studentMessages = conversationHistory.filter(
      (msg) => msg.role === "student",
    );
    const latestMessage =
      studentMessages[studentMessages.length - 1]?.content || "";

    // First, perform safety check for homicidal ideations
    const safetyCheckPrompt = `Analyze the following student message for any homicidal ideations, threats of violence against others, or concerning content about harming other people:

STUDENT MESSAGE: "${latestMessage}"

IMPORTANT: Look specifically for:
- References to killing, murdering, or harming others
- Threats of violence against specific individuals or groups
- Plans or desires to hurt other people
- Any expressions of homicidal thoughts or ideations

Respond with JSON in this format:
{
  "hasHomicidalContent": boolean,
  "riskLevel": "none|low|medium|high",
  "explanation": "brief explanation of findings"
}`;

    const safetyResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a safety analysis AI focused on identifying homicidal ideations and threats of violence against others. Prioritize student and public safety above all else.",
        },
        {
          role: "user",
          content: safetyCheckPrompt,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 200,
      temperature: 0.1,
    });

    const safetyResult = JSON.parse(safetyResponse.choices[0].message.content || "{}");

    // If homicidal content is detected, return immediate termination response
    if (safetyResult.hasHomicidalContent === true) {
      console.log("SAFETY ALERT: Homicidal content detected in student message:", {
        message: latestMessage,
        riskLevel: safetyResult.riskLevel,
        explanation: safetyResult.explanation
      });

      return {
        response: "I'm concerned about what you've shared and want you to know that mental health is very important. This conversation has been flagged and someone will reach out to you soon to provide support. Please speak with a trusted adult, counselor, or call a crisis helpline if you need immediate help.",
        shouldTerminate: true,
        safetyFlag: "homicidal_ideation",
        suggestedEvaluation: undefined,
      };
    }

    // Second, check for inappropriate language
    const languageCheckPrompt = `Analyze the following student message for inappropriate language:

STUDENT MESSAGE: "${latestMessage}"

IMPORTANT: Look specifically for:
- Profanity, vulgar language, or curse words
- Sexually explicit language or references
- Hate speech or discriminatory language
- Bullying, harassment, or threatening language
- Any language inappropriate for a school setting

Respond with JSON in this format:
{
  "hasInappropriateLanguage": boolean,
  "severity": "none|mild|moderate|severe",
  "explanation": "brief explanation of findings"
}`;

    const languageResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a language analysis AI focused on detecting inappropriate language in educational settings. Consider school-appropriate standards.",
        },
        {
          role: "user",
          content: languageCheckPrompt,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 200,
      temperature: 0.1,
    });

    const languageResult = JSON.parse(languageResponse.choices[0].message.content || "{}");

    // Count inappropriate language instances in conversation history
    if (languageResult.hasInappropriateLanguage === true) {
      const inappropriateCount = studentMessages.filter(msg => {
        // This is a simplified check - in production you might want to store flags per message
        const simpleInappropriateWords = [
          'damn', 'hell', 'crap', 'shit', 'fuck', 'bitch', 'ass', 'asshole',
          'bastard', 'piss', 'dick', 'cock', 'pussy', 'whore', 'slut'
        ];
        return simpleInappropriateWords.some(word => 
          msg.content.toLowerCase().includes(word.toLowerCase())
        );
      }).length;

      console.log("LANGUAGE ALERT: Inappropriate language detected:", {
        message: latestMessage,
        severity: languageResult.severity,
        count: inappropriateCount,
        explanation: languageResult.explanation
      });

      // If this is the second instance, terminate conversation
      if (inappropriateCount >= 2) {
        return {
          response: "I've noticed inappropriate language has been used multiple times in our conversation. This has been flagged and someone will reach out to you about appropriate language use at school. This conversation is now closed.",
          shouldTerminate: true,
          safetyFlag: "inappropriate_language_repeated",
          suggestedEvaluation: undefined,
        };
      }
    }

    // If safe, proceed with normal tutoring response
    const prompt = `You are an AI tutor helping students improve their competency in "${componentSkill.name}".

RUBRIC LEVELS:
APPLYING: ${componentSkill.applying}
EMERGING: ${componentSkill.emerging}
DEVELOPING: ${componentSkill.developing}
PROFICIENT: ${componentSkill.proficient}

CURRENT SELF-EVALUATION:
- Self-assessed level: ${currentEvaluation?.selfAssessedLevel || "Not selected"}
- Justification: ${currentEvaluation?.justification || "Not provided"}
- Examples: ${currentEvaluation?.examples || "Not provided"}

CONVERSATION HISTORY:
${conversationHistory.map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`).join("\n")}

LATEST STUDENT MESSAGE:
${latestMessage}

TASK:
Based on the conversation and the student's latest message, provide specific, actionable guidance to help the student understand how to improve and reach the "applying" level. If the student claims to be proficient, probe them to explain why with specific examples.

Keep your response conversational, encouraging, and focused on helping them develop a deeper understanding of the component skill. Ask follow-up questions to help them reflect on their experiences.

Respond in a helpful, encouraging tone that guides them to think more deeply about their competency level.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful and friendly AI tutor focused on guiding students to mastery. Your goal is to help students accurately self-assess their competency levels and provide pathways for improvement.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 800,
      temperature: 0.7,
    });

    const tutorResponse =
      response.choices[0].message.content ||
      "I'm sorry, I don't have any specific feedback at this time. Please try rephrasing your question.";

    return {
      response: tutorResponse,
      suggestedEvaluation: undefined,
      shouldTerminate: false,
    };
  } catch (error) {
    console.error("OpenAI API error for tutor response:", error);
    
    // Fallback safety checks using keyword detection
    const studentMessages = conversationHistory.filter(
      (msg) => msg.role === "student",
    );
    const latestMessage =
      studentMessages[studentMessages.length - 1]?.content || "";
    
    const homicidalKeywords = [
      "kill someone", "murder", "kill them", "kill him", "kill her", 
      "hurt someone", "harm others", "want to kill", "going to kill",
      "planning to hurt", "thinking about killing", "homicide"
    ];

    const inappropriateKeywords = [
      "damn", "hell", "crap", "shit", "fuck", "bitch", "ass", "asshole",
      "bastard", "piss", "dick", "cock", "pussy", "whore", "slut"
    ];

    const content = latestMessage.toLowerCase();
    const hasHomicidalContent = homicidalKeywords.some((keyword) =>
      content.includes(keyword)
    );

    if (hasHomicidalContent) {
      console.log("SAFETY ALERT (Fallback): Potential homicidal content detected:", latestMessage);
      
      return {
        response: "I'm concerned about what you've shared and want you to know that mental health is very important. This conversation has been flagged and someone will reach out to you soon to provide support. Please speak with a trusted adult, counselor, or call a crisis helpline if you need immediate help.",
        shouldTerminate: true,
        safetyFlag: "homicidal_ideation_fallback",
        suggestedEvaluation: undefined,
      };
    }

    // Fallback inappropriate language check
    const hasInappropriateLanguage = inappropriateKeywords.some((keyword) =>
      content.includes(keyword)
    );

    if (hasInappropriateLanguage) {
      // Count inappropriate language instances in conversation history
      const inappropriateCount = studentMessages.filter(msg => 
        inappropriateKeywords.some(word => 
          msg.content.toLowerCase().includes(word)
        )
      ).length;

      console.log("LANGUAGE ALERT (Fallback): Inappropriate language detected:", {
        message: latestMessage,
        count: inappropriateCount
      });

      if (inappropriateCount >= 2) {
        return {
          response: "I've noticed inappropriate language has been used multiple times in our conversation. This has been flagged and someone will reach out to you about appropriate language use at school. This conversation is now closed.",
          shouldTerminate: true,
          safetyFlag: "inappropriate_language_repeated_fallback",
          suggestedEvaluation: undefined,
        };
      }
    }

    return {
      response:
        "I'm having trouble connecting right now. Please try again later, or continue with your self-evaluation.",
      suggestedEvaluation: undefined,
      shouldTerminate: false,
    };
  }
}

export {
  generateSelfEvaluationFeedback,
  generateAssessmentQuestions,
  generateTutorResponse,
};
