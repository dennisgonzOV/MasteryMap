import { Router } from 'express';
import { type AssessmentService } from './assessments.service';
import { registerAssessmentCoreRoutes } from './routes/core.routes';
import { registerAssessmentExportRoutes } from './routes/export.routes';
import { registerAssessmentLifecycleRoutes } from './routes/lifecycle.routes';
import { registerAssessmentShareCodeRoutes } from './routes/share-code.routes';
import { registerAssessmentStudentRoutes } from './routes/student.routes';
import { registerAssessmentTeacherSkillsRoutes } from './routes/teacher-skills.routes';
import {
  assessmentProjectGateway,
  type AssessmentProjectGateway,
} from "./assessment-project-gateway";

export class AssessmentController {
  constructor(
    private service: AssessmentService,
    private projectGateway: AssessmentProjectGateway = assessmentProjectGateway,
  ) { }

  createRouter(): Router {
    const router = Router();

    registerAssessmentCoreRoutes(router, this.service, this.projectGateway);
    registerAssessmentLifecycleRoutes(router, this.service, this.projectGateway);
    registerAssessmentExportRoutes(router, this.service, this.projectGateway);
    registerAssessmentShareCodeRoutes(router, this.service, this.projectGateway);
    registerAssessmentTeacherSkillsRoutes(router, this.service);

    return router;
  }

  createStudentRouter(): Router {
    const router = Router();
    registerAssessmentStudentRoutes(router, this.service, this.projectGateway);
    return router;
  }
}
