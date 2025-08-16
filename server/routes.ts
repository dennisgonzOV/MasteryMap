import type { Express } from "express";

// Import all domain routers
import { authRouter, adminRouter, analyticsRouter } from "./domains/auth";
import { projectsRouter, milestonesRouter, projectTeamsRouter, projectTeamMembersRouter, schoolsRouter, teacherRouter } from "./domains/projects";
import { assessmentsRouter, submissionsRouter, selfEvaluationsRouter } from "./domains/assessments";
import { credentialsRouter } from "./domains/credentials";
import { portfolioRouter } from "./domains/portfolio";
import { aiRouter } from "./domains/ai";
import { competenciesRouter } from "./domains/competencies";
import { notificationsRouter } from "./domains/notifications";
import { safetyIncidentsRouter } from "./domains/safety-incidents";


import { requireAuth, type AuthenticatedRequest } from "./domains/auth";

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
  app.use("/api/ai-tutor", aiRouter); // Add the legacy path for AI tutor chat
  app.use("/api/competencies", competenciesRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/safety-incidents", safetyIncidentsRouter);
  app.use("/api/teacher", teacherRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/analytics", analyticsRouter);

  // Map learner-outcomes-hierarchy routes to competencies router
  console.log('Setting up learner-outcomes-hierarchy routes');
  app.use("/api/learner-outcomes-hierarchy", (req, res, next) => {
    console.log('Learner outcomes hierarchy middleware hit:', req.method, req.path);
    next();
  }, competenciesRouter);
  app.use("/api/learner-outcomes", competenciesRouter);
  app.use("/api/competencies-hierarchy", competenciesRouter);

  // Additional student-specific routes
  app.use('/api', assessmentsRouter);

  // Students routes (for competency progress)
  app.use('/api/students', assessmentsRouter);
}