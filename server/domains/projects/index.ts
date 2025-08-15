// Export all projects domain components
export { default as projectsRouter, projectTeamsRouter, projectTeamMembersRouter, schoolsRouter } from './projects.controller';
export { milestonesRouter } from './milestones.controller';
export { projectsService, ProjectsService } from './projects.service';
export { projectsStorage, ProjectsStorage, type IProjectsStorage } from './projects.storage';