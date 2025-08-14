// Export all assessment domain components
export { assessmentsRouter } from './assessments.controller';
export { submissionsRouter } from './submissions.controller';
export { selfEvaluationsRouter } from './self-evaluations.controller';

export { assessmentService } from './assessments.service';
export { assessmentStorage } from './assessments.storage';

export type { IAssessmentStorage } from './assessments.storage';
export type { AssessmentService } from './assessments.service';