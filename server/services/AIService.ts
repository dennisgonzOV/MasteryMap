import OpenAI from "openai";
import { sanitizeForPrompt } from "../middleware/security";
import { AIServiceError, parseAIServiceError, createErrorContext } from "../utils/errorTypes";

/**
 * Base AI service class to eliminate duplication across AI integrations
 */

export interface AIServiceConfig {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIPromptTemplate {
  system?: string;
  user: string;
  variables?: Record<string, any>;
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: string;
  finishReason?: string;
}

export interface AIGenerationOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stream?: boolean;
}

export abstract class BaseAIService {
  protected openai: OpenAI;
  protected config: Required<AIServiceConfig>;

  constructor(config: AIServiceConfig = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "",
      model: config.model || "gpt-4o",
      maxTokens: config.maxTokens || 1500,
      temperature: config.temperature || 0.7,
      timeout: config.timeout || 30000,
    };

    this.openai = new OpenAI({
      apiKey: this.config.apiKey,
      timeout: this.config.timeout,
    });
  }

  /**
   * Generate AI response from messages
   */
  protected async generateResponse(
    messages: AIMessage[],
    options: AIGenerationOptions = {}
  ): Promise<AIResponse> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: this.config.model,
        messages,
        max_tokens: options.maxTokens || this.config.maxTokens,
        temperature: options.temperature || this.config.temperature,
        top_p: options.topP,
        frequency_penalty: options.frequencyPenalty,
        presence_penalty: options.presencePenalty,
        stream: false, // Always disable streaming for type safety
      }) as OpenAI.Chat.Completions.ChatCompletion;

      const choice = completion.choices[0];
      if (!choice || !choice.message?.content) {
        throw new AIServiceError('No valid response generated', 'OpenAI', undefined, 'generateResponse');
      }

      return {
        content: choice.message.content,
        usage: completion.usage ? {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
          totalTokens: completion.usage.total_tokens,
        } : undefined,
        model: completion.model,
        finishReason: choice.finish_reason || undefined,
      };
    } catch (error) {
      const context = createErrorContext('generateResponse', undefined, {
        model: this.config.model,
        messageCount: messages.length
      });
      
  
        context,
        error: error instanceof Error ? error.message : error,
        model: this.config.model,
        timestamp: new Date().toISOString()
      });
      
      throw parseAIServiceError(error, context);
    }
  }

  /**
   * Generate response from template
   */
  protected async generateFromTemplate(
    template: AIPromptTemplate,
    options: AIGenerationOptions = {}
  ): Promise<AIResponse> {
    const messages: AIMessage[] = [];

    // Add system message if provided
    if (template.system) {
      messages.push({
        role: 'system',
        content: this.interpolateTemplate(template.system, template.variables || {})
      });
    }

    // Add user message
    messages.push({
      role: 'user',
      content: this.interpolateTemplate(template.user, template.variables || {})
    });

    return this.generateResponse(messages, options);
  }

  /**
   * Interpolate template variables
   */
  protected interpolateTemplate(template: string, variables: Record<string, any>): string {
    let result = template;
    
    Object.entries(variables).forEach(([key, value]) => {
      const sanitizedValue = this.sanitizeVariable(value);
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), sanitizedValue);
    });

    return result;
  }

  /**
   * Sanitize variables for AI prompts
   */
  protected sanitizeVariable(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    
    const stringValue = String(value);
    return sanitizeForPrompt(stringValue);
  }

  /**
   * Validate AI response
   */
  protected validateResponse(response: AIResponse, expectedFormat?: string): boolean {
    if (!response.content || response.content.trim().length === 0) {
      return false;
    }

    if (expectedFormat === 'json') {
      try {
        JSON.parse(response.content);
        return true;
      } catch {
        return false;
      }
    }

    return true;
  }

  /**
   * Extract JSON from AI response
   */
  protected extractJSON<T = any>(response: AIResponse): T | null {
    try {
      // Try to parse the entire response as JSON
      return JSON.parse(response.content);
    } catch {
      // Try to extract JSON from code blocks
      const jsonMatch = response.content.match(/```json\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[1]);
        } catch {
          return null;
        }
      }

      // Try to extract JSON from the content
      if (!response?.content || typeof response.content !== 'string') {
        return null;
      }
      
      const jsonStart = response.content.indexOf('{');
      const jsonEnd = response.content.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        try {
          return JSON.parse(response.content.slice(jsonStart, jsonEnd + 1));
        } catch {
          return null;
        }
      }

      return null;
    }
  }

  /**
   * Retry AI generation with exponential backoff
   */
  protected async retryGeneration<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries - 1) {
          throw lastError;
        }
        
        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  /**
   * Estimate token count (approximate)
   */
  protected estimateTokens(text: string): number {
    // Rough approximation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Check if content exceeds token limit
   */
  protected exceedsTokenLimit(text: string, maxTokens?: number): boolean {
    const limit = maxTokens || this.config.maxTokens;
    return this.estimateTokens(text) > limit;
  }

  /**
   * Truncate content to fit token limit
   */
  protected truncateToTokenLimit(text: string, maxTokens?: number): string {
    const limit = maxTokens || this.config.maxTokens;
    const estimatedTokens = this.estimateTokens(text);
    
    if (estimatedTokens <= limit) {
      return text;
    }
    
    // Approximate character limit
    const charLimit = limit * 4;
    return text.slice(0, charLimit) + '...';
  }

  /**
   * Abstract methods to be implemented by subclasses
   */
  abstract generateContent(input: any, options?: AIGenerationOptions): Promise<any>;
}

/**
 * Educational AI service specializing in learning content
 */
export class EducationalAIService extends BaseAIService {
  /**
   * Generate educational content
   */
  async generateContent(input: any, options: AIGenerationOptions = {}): Promise<any> {
    // Implement specific educational content generation
    throw new Error('Must be implemented by subclass');
  }

  /**
   * Generate project milestones
   */
  async generateMilestones(project: any, componentSkills: any[], options: AIGenerationOptions = {}): Promise<any[]> {
    const template: AIPromptTemplate = {
      system: `You are an educational expert who creates engaging project-based learning milestones. 
               Create realistic, achievable milestones that build upon each other and align with the specified competencies.`,
      user: `Generate 3-5 milestones for this project:
             Title: {{title}}
             Description: {{description}}
             Grade Level: {{gradeLevel}}
             Duration: {{duration}}
             
             Component Skills: {{skills}}
             
             Return JSON array with: title, description, dueDate (relative), order`,
      variables: {
        title: project.title,
        description: project.description,
        gradeLevel: project.gradeLevel || 'Not specified',
        duration: project.duration || 'Not specified',
        skills: componentSkills.map(skill => skill.name).join(', ')
      }
    };

    try {
      const response = await this.generateFromTemplate(template, options);
      return this.extractJSON(response) || [];
    } catch (error) {
      const context = createErrorContext('generateMilestones', undefined, { projectTitle: project.title });
      throw parseAIServiceError(error, context);
    }
  }

  /**
   * Generate assessment questions
   */
  async generateAssessment(milestone: any, componentSkills: any[], options: AIGenerationOptions = {}): Promise<any> {
    const template: AIPromptTemplate = {
      system: `You are an educational assessment expert. Create engaging, competency-based assessment questions 
               that evaluate student understanding and application of the specified component skills.`,
      user: `Generate an assessment for this milestone:
             Title: {{title}}
             Description: {{description}}
             
             Component Skills: {{skills}}
             
             Return JSON with: title, description, questions array with id, text, type, rubricCriteria`,
      variables: {
        title: milestone.title,
        description: milestone.description,
        skills: componentSkills.map(skill => 
          `${skill.name}: ${skill.rubricLevels?.proficient || 'Demonstrate competency'}`
        ).join('\n')
      }
    };

    try {
      const response = await this.generateFromTemplate(template, options);
      return this.extractJSON(response) || {};
    } catch (error) {
      const context = createErrorContext('generateAssessment', undefined, { milestoneTitle: milestone.title });
      throw parseAIServiceError(error, context);
    }
  }

  /**
   * Generate personalized feedback
   */
  async generateFeedback(
    submission: any,
    componentSkill: any,
    rubricLevel: string,
    options: AIGenerationOptions = {}
  ): Promise<string> {
    const template: AIPromptTemplate = {
      system: `You are a supportive teacher providing constructive feedback to help students improve their skills.
               Be encouraging while providing specific, actionable guidance.`,
      user: `Provide feedback for this student submission:
             Component Skill: {{skillName}}
             Current Level: {{level}}
             Student Response: {{response}}
             
             Rubric Levels:
             {{rubricLevels}}
             
             Provide specific, encouraging feedback with suggestions for improvement.`,
      variables: {
        skillName: componentSkill.name,
        level: rubricLevel,
        response: submission.responses?.[0]?.answer || 'No response provided',
        rubricLevels: Object.entries(componentSkill.rubricLevels || {})
          .map(([level, description]) => `${level}: ${description}`)
          .join('\n')
      }
    };

    try {
      const response = await this.generateFromTemplate(template, options);
      return response.content;
    } catch (error) {
      const context = createErrorContext('generateFeedback', undefined, { 
        skillName: componentSkill.name,
        level: rubricLevel 
      });
      throw parseAIServiceError(error, context);
    }
  }

  /**
   * Generate tutoring chat response
   */
  async generateTutorResponse(
    conversation: AIMessage[],
    componentSkill: any,
    context: any = {},
    options: AIGenerationOptions = {}
  ): Promise<string> {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `You are an AI tutor helping students understand: ${componentSkill.name}
                 
                 Rubric Levels:
                 ${Object.entries(componentSkill.rubricLevels || {})
                   .map(([level, description]) => `${level}: ${description}`)
                   .join('\n')}
                 
                 Be encouraging, ask guiding questions, and help students think through problems.
                 Keep responses concise and age-appropriate.`
      },
      ...conversation
    ];

    try {
      const response = await this.generateResponse(messages, {
        temperature: 0.8,
        maxTokens: 300,
        ...options
      });

      return response.content;
    } catch (error) {
      const context = createErrorContext('generateTutorResponse', undefined, { 
        skillName: componentSkill.name,
        messageCount: conversation.length 
      });
      throw parseAIServiceError(error, context);
    }
  }

  /**
   * Detect potentially risky content in student submissions
   */
  async detectRiskyContent(content: string): Promise<{ hasRisk: boolean; reason?: string }> {
    const template: AIPromptTemplate = {
      system: `You are a content safety moderator for an educational platform. 
               Detect content that may indicate student distress, safety concerns, or need for intervention.
               Look for signs of depression, self-harm, bullying, family issues, or other concerning situations.`,
      user: `Analyze this student content for potential safety concerns:
             
             Content: {{content}}
             
             Return JSON with: hasRisk (boolean), reason (string if hasRisk is true)`,
      variables: { content }
    };

    const response = await this.generateFromTemplate(template, {
      temperature: 0.1, // Lower temperature for consistent safety detection
      maxTokens: 200
    });

    const result = this.extractJSON<{ hasRisk: boolean; reason?: string }>(response);
    return result || { hasRisk: false };
  }
}