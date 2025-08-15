import type { Express } from "express";

// Import all domain routers
import { authRouter } from "./domains/auth";
import { projectsRouter, milestonesRouter, projectTeamsRouter, projectTeamMembersRouter, schoolsRouter } from "./domains/projects";
import { assessmentsRouter, submissionsRouter, selfEvaluationsRouter } from "./domains/assessments";
import { credentialsRouter } from "./domains/credentials";
import { portfolioRouter } from "./domains/portfolio";
import { aiRouter } from "./domains/ai";
import { competenciesRouter } from "./domains/competencies";
import { notificationsRouter } from "./domains/notifications";
import { safetyIncidentsRouter } from "./domains/safety-incidents";

export function setupRoutes(app: Express) {
  // Mount all domain routers
  app.use("/api/auth", authRouter);
  app.use("/api/projects", projectsRouter);
  app.use("/api/milestones", milestonesRouter);
  app.use("/api/project-teams", projectTeamsRouter);
  app.use("/api/project-team-members", projectTeamMembersRouter);
  app.use("/api/schools", schoolsRouter);
  app.use("/api/assessments", assessmentsRouter);
  app.use("/api/submissions", submissionsRouter);
  app.use("/api/self-evaluations", selfEvaluationsRouter);
  app.use("/api/credentials", credentialsRouter);
  app.use("/api/portfolio", portfolioRouter);
  app.use("/api/ai", aiRouter);
  app.use("/api/competencies", competenciesRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/safety-incidents", safetyIncidentsRouter);

  // Additional student-specific routes
  app.use('/api', assessmentsRouter);
}