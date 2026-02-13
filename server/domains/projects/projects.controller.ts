import { Router } from "express";
import { registerProjectCoreRoutes } from "./routes/core-projects.routes";
import { registerPublicProjectRoutes } from "./routes/public-projects.routes";
import { registerProjectAIRoutes } from "./routes/ai-projects.routes";
import {
  registerProjectMilestoneRoutes,
  registerProjectTeamRoutes,
  createProjectWorkflowRouters,
} from "./routes/project-workflow.routes";
import { createSchoolsRouter } from "./routes/schools.routes";
import { createTeacherRouter } from "./routes/teacher-dashboard.routes";
import type { ProjectsService } from "./projects.service";

export interface ProjectsRouterBundle {
  projectsRouter: Router;
  milestonesRouter: Router;
  projectTeamsRouter: Router;
  projectTeamMembersRouter: Router;
  schoolsRouter: Router;
  teacherRouter: Router;
}

export function createProjectsRouters(projectsService: ProjectsService): ProjectsRouterBundle {
  const projectsRouter = Router();

  registerPublicProjectRoutes(projectsRouter, projectsService);
  registerProjectCoreRoutes(projectsRouter, projectsService);
  registerProjectAIRoutes(projectsRouter, projectsService);
  registerProjectMilestoneRoutes(projectsRouter, projectsService);
  registerProjectTeamRoutes(projectsRouter, projectsService);

  const {
    milestonesRouter,
    projectTeamsRouter,
    projectTeamMembersRouter,
  } = createProjectWorkflowRouters(projectsService);

  return {
    projectsRouter,
    milestonesRouter,
    projectTeamsRouter,
    projectTeamMembersRouter,
    schoolsRouter: createSchoolsRouter(projectsService),
    teacherRouter: createTeacherRouter(projectsService),
  };
}
