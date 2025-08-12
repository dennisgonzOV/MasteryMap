// Export all projects domain components
export { 
  projectsRouter, 
  milestonesRouter, 
  projectTeamsRouter, 
  projectTeamMembersRouter 
} from './projects.controller';
export { ProjectsService } from './projects.service';
export { projectsStorage, type IProjectsStorage } from './projects.storage';