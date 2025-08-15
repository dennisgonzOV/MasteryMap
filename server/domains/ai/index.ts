// Export controller and router
export { aiRouter, AIController } from './ai.controller';

// Export services
export { aiService, AIService } from './ai.service';
export { openAIService, OpenAIService } from './openai.service';

// Export types and interfaces
export type {
  GeneratedMilestone,
  GeneratedAssessment,
  ProjectIdeaCriteria,
  GeneratedProjectIdea
} from './openai.service';