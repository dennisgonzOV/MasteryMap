// Barrel exports for all domain schemas - maintains backward compatibility
// This file aggregates all domain-specific schemas into a single import

// Re-export all tables and types from domain schemas
export * from './common';
export * from './auth';
export * from './projects';
export * from './assessments';
export * from './portfolio';
export * from './credentials';
export * from './system';

// Legacy compatibility exports (maintain existing import patterns)
import { sessions, schools, learnerOutcomes, competencies, componentSkills, bestStandards } from './common';
import { users, authTokens } from './auth';
import { projects, milestones, projectTeams, projectTeamMembers, projectAssignments } from './projects';
import { assessments, submissions, selfEvaluations, grades } from './assessments';
import { portfolioArtifacts, portfolios } from './portfolio';
import { credentials } from './credentials';
import { safetyIncidents, notifications } from './system';

// Aggregate all tables for easy import
export {
  // Common/System tables
  sessions,
  schools,
  learnerOutcomes,
  competencies,
  componentSkills,
  bestStandards,
  
  // Auth domain
  users,
  authTokens,
  
  // Projects domain
  projects,
  milestones,
  projectTeams,
  projectTeamMembers,
  projectAssignments,
  
  // Assessments domain
  assessments,
  submissions,
  selfEvaluations,
  grades,
  
  // Portfolio domain
  portfolioArtifacts,
  portfolios,
  
  // Credentials domain
  credentials,
  
  // System domain
  safetyIncidents,
  notifications
};

// Re-export relations (if needed for Drizzle ORM setup)
export { authTokensRelations, usersRelations } from './auth';
export { 
  projectsRelations, 
  milestonesRelations, 
  projectTeamsRelations, 
  projectTeamMembersRelations, 
  projectAssignmentsRelations 
} from './projects';
export { 
  assessmentsRelations, 
  submissionsRelations, 
  selfEvaluationsRelations, 
  gradesRelations 
} from './assessments';
export { portfolioArtifactsRelations, portfoliosRelations } from './portfolio';
export { credentialsRelations } from './credentials';
export { safetyIncidentsRelations, notificationsRelations } from './system';