import type { Express } from "express";

// Import all domain routers
import { adminRouter } from "./domains/admin";
import { authRouter, analyticsRouter } from "./domains/auth";
import { projectsRouter, milestonesRouter, projectTeamsRouter, projectTeamMembersRouter, schoolsRouter, teacherRouter } from "./domains/projects";
import { assessmentsRouter, assessmentStudentRouter, submissionsRouter, selfEvaluationsRouter } from "./domains/assessments";
import { credentialsRouter } from "./domains/credentials";
import { portfolioRouter } from "./domains/portfolio";
import { aiRouter } from "./domains/ai";
import { competenciesRouter } from "./domains/competencies";
import { notificationsRouter } from "./domains/notifications";
import { safetyIncidentsRouter } from "./domains/safety-incidents";
import { contactRouter } from "./domains/contact";
import { registerObjectStorageRoutes } from "./integrations/s3_storage";

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
  // Map learner-outcomes-hierarchy routes to competencies router FIRST
  // IMPORTANT: These must be defined BEFORE the competencies router to avoid conflicts
  app.use("/api/learner-outcomes-hierarchy", competenciesRouter);
  app.use("/api/learner-outcomes", competenciesRouter);
  app.use("/api/competencies-hierarchy", competenciesRouter);

  app.use("/api/competencies", competenciesRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/safety-incidents", safetyIncidentsRouter);
  app.use("/api/teacher", teacherRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/analytics", analyticsRouter);
  app.use("/api/contact", contactRouter);

  // Register object storage routes for file uploads
  registerObjectStorageRoutes(app);

  // Student-specific compatibility routes (mounted separately to avoid exposing full assessments router at /api)
  app.use('/api', assessmentStudentRouter);
}
