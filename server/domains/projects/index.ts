// Export all projects domain components
export { projectsRouter, projectTeamsRouter, projectTeamMembersRouter, schoolsRouter } from './projects.controller';
export { milestonesRouter } from './milestones.controller';
export { projectsService, ProjectsService } from './projects.service';
export { projectsStorage, ProjectsStorage, type IProjectsStorage } from './projects.storage';