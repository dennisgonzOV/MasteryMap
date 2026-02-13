import { createAssessmentsDomain } from "./composition";

const assessmentsDomain = createAssessmentsDomain();

export const assessmentsRouter = assessmentsDomain.assessmentsRouter;
export const assessmentStudentRouter = assessmentsDomain.assessmentStudentRouter;
export const submissionsRouter = assessmentsDomain.submissionsRouter;
export const selfEvaluationsRouter = assessmentsDomain.selfEvaluationsRouter;
export const assessmentService = assessmentsDomain.service;

export { createAssessmentsDomain } from "./composition";
export type { AssessmentService } from "./assessments.service";
