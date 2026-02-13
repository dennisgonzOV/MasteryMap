import { aiService, type AIService } from "../ai/ai.service";
import {
  assessmentProjectGateway,
  type AssessmentProjectGateway,
} from "./assessment-project-gateway";
import { AssessmentController } from "./assessments.controller";
import { AssessmentService } from "./assessments.service";
import { assessmentStorage, type IAssessmentStorage } from "./assessments.storage";
import { SelfEvaluationController } from "./self-evaluations.controller";
import { SubmissionController } from "./submissions.controller";

interface AssessmentsDomainDependencies {
  storage?: IAssessmentStorage;
  projectGateway?: AssessmentProjectGateway;
  ai?: AIService;
}

export function createAssessmentsDomain(
  dependencies: AssessmentsDomainDependencies = {},
) {
  const storage = dependencies.storage ?? assessmentStorage;
  const projectGateway = dependencies.projectGateway ?? assessmentProjectGateway;
  const ai = dependencies.ai ?? aiService;

  const service = new AssessmentService(storage, projectGateway);
  const assessmentController = new AssessmentController(service, projectGateway);
  const submissionController = new SubmissionController(service, projectGateway);
  const selfEvaluationController = new SelfEvaluationController(service, ai, projectGateway);

  return {
    service,
    assessmentsRouter: assessmentController.createRouter(),
    assessmentStudentRouter: assessmentController.createStudentRouter(),
    submissionsRouter: submissionController.createRouter(),
    selfEvaluationsRouter: selfEvaluationController.createRouter(),
  };
}
