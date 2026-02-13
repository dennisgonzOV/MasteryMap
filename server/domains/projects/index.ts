import { createProjectsDomain } from "./composition";

const projectsDomain = createProjectsDomain();

export const projectsRouter = projectsDomain.projectsRouter;
export const milestonesRouter = projectsDomain.milestonesRouter;
export const projectTeamsRouter = projectsDomain.projectTeamsRouter;
export const projectTeamMembersRouter = projectsDomain.projectTeamMembersRouter;
export const schoolsRouter = projectsDomain.schoolsRouter;
export const teacherRouter = projectsDomain.teacherRouter;
export const projectsService = projectsDomain.service;

export { createProjectsDomain } from "./composition";
export type { ProjectsService } from "./projects.service";
