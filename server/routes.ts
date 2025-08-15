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
  app.use("/api/competencies", competenciesRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/safety-incidents", safetyIncidentsRouter);

  // Additional student-specific routes
  app.use('/api', assessmentsRouter);
  
  // Students routes (for competency progress)
  app.use('/api/students', assessmentsRouter);

  // Student competency progress endpoint (restore from original routes)
  app.get('/api/students/competency-progress', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;

      // Students can only view their own progress
      if (req.user?.role !== 'student' && req.user?.role !== 'teacher' && req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      // For students, get their own progress. For teachers/admins, allow studentId query param
      let studentId = userId;
      if (req.user.role === 'teacher' || req.user.role === 'admin') {
        const queryStudentId = req.query.studentId;
        if (queryStudentId) {
          studentId = parseInt(queryStudentId as string);
        }
      }

      // Import storage here to avoid circular dependency
      const { storage } = await import('./storage');
      const progress = await storage.getStudentCompetencyProgress(studentId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching competency progress:", error);
      res.status(500).json({ message: "Failed to fetch competency progress" });
    }
  });
}