// Domain Components - Centralized barrel exports
// This file provides centralized access to all domain-specific components

// Assessments Domain
export * from './assessments';

// Projects Domain  
export * from './projects';

// Analytics Domain
export * from './analytics';

// Portfolio Domain
export * from './portfolio';

// Individual component exports for direct access
export { AssessmentCreation, GradingInterface } from './assessments';
export { ProjectCreation, ProjectManagement } from './projects';
export { AnalyticsDashboard } from './analytics';
export { DigitalPortfolio } from './portfolio';