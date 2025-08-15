// Export all projects domain components
export { default as projectsRouter, milestonesRouter, projectTeamsRouter, projectTeamMembersRouter, schoolsRouter } from './projects.controller';
export { projectsService, ProjectsService } from './projects.service';
export { projectsStorage, ProjectsStorage, type IProjectsStorage } from './projects.storage';