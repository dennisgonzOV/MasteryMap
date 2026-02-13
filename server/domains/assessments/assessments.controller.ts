import { Router } from 'express';
import { assessmentService, type AssessmentService } from './assessments.service';
import { registerAssessmentCoreRoutes } from './routes/core.routes';
import { registerAssessmentExportRoutes } from './routes/export.routes';
import { registerAssessmentLifecycleRoutes } from './routes/lifecycle.routes';
import { registerAssessmentShareCodeRoutes } from './routes/share-code.routes';
import { registerAssessmentStudentRoutes } from './routes/student.routes';
import { registerAssessmentTeacherSkillsRoutes } from './routes/teacher-skills.routes';

export class AssessmentController {
  constructor(private service: AssessmentService = assessmentService) { }

  createRouter(): Router {
    const router = Router();

    registerAssessmentCoreRoutes(router, this.service);
    registerAssessmentLifecycleRoutes(router, this.service);
    registerAssessmentExportRoutes(router, this.service);
    registerAssessmentShareCodeRoutes(router, this.service);
    registerAssessmentTeacherSkillsRoutes(router, this.service);

    return router;
  }

  createStudentRouter(): Router {
    const router = Router();
    registerAssessmentStudentRoutes(router, this.service);
    return router;
  }
}

export const assessmentController = new AssessmentController();
export const assessmentsRouter = assessmentController.createRouter();
export const assessmentStudentRouter = assessmentController.createStudentRouter();
