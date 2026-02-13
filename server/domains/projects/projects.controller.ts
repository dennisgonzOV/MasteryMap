import { Router } from "express";
import { registerProjectCoreRoutes } from "./routes/core-projects.routes";
import { registerPublicProjectRoutes } from "./routes/public-projects.routes";
import { registerProjectAIRoutes } from "./routes/ai-projects.routes";
import {
  registerProjectMilestoneRoutes,
  registerProjectTeamRoutes,
  milestonesRouter,
  projectTeamsRouter,
  projectTeamMembersRouter,
} from "./routes/project-workflow.routes";
import { schoolsRouter } from "./routes/schools.routes";
import { teacherRouter } from "./routes/teacher-dashboard.routes";

const router = Router();

registerPublicProjectRoutes(router);
registerProjectCoreRoutes(router);
registerProjectAIRoutes(router);
registerProjectMilestoneRoutes(router);
registerProjectTeamRoutes(router);

export { milestonesRouter, projectTeamsRouter, projectTeamMembersRouter, schoolsRouter, teacherRouter };
export default router;
