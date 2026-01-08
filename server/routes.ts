import type { Express } from "express";

// Import all domain routers
import { authRouter, adminRouter, analyticsRouter, requireAuth, type AuthenticatedRequest } from "./domains/auth";
import { projectsRouter, milestonesRouter, projectTeamsRouter, projectTeamMembersRouter, schoolsRouter, teacherRouter } from "./domains/projects";
import { assessmentsRouter, submissionsRouter, selfEvaluationsRouter, assessmentStorage } from "./domains/assessments";
import { credentialsRouter } from "./domains/credentials";
import { portfolioRouter } from "./domains/portfolio";
import { aiRouter } from "./domains/ai";
import { competenciesRouter } from "./domains/competencies";
import { notificationsRouter } from "./domains/notifications";
import { safetyIncidentsRouter } from "./domains/safety-incidents";
import { contactRouter } from "./domains/contact";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";

import { db } from './db';
import { users as usersTable } from '../shared/schema';
import { eq } from 'drizzle-orm';


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
  // Map learner-outcomes-hierarchy routes to competencies router FIRST
  // IMPORTANT: These must be defined BEFORE the competencies router to avoid conflicts
  console.log('Setting up learner-outcomes-hierarchy routes');
  app.use("/api/learner-outcomes-hierarchy", (req, res, next) => {
    console.log('Learner outcomes hierarchy middleware hit:', req.method, req.path);
    next();
  }, competenciesRouter);
  app.use("/api/learner-outcomes", (req, res, next) => {
    console.log('Learner outcomes middleware hit:', req.method, req.path);
    next();
  }, competenciesRouter);
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

  // School-wide component skills tracking for teachers
  app.get("/api/teacher/school-component-skills-progress", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user?.role !== 'teacher') {
        return res.status(403).json({ message: "Access denied" });
      }

      const teacher = await db.select().from(usersTable).where(eq(usersTable.id, req.user.id)).limit(1);
      if (!teacher.length || !teacher[0].schoolId) {
        return res.status(400).json({ message: "Teacher school not found" });
      }

      const skillsProgress = await assessmentStorage.getSchoolComponentSkillsProgress(req.user.id);
      res.json(skillsProgress);
    } catch (error) {
      console.error('School component skills progress error:', error);
      res.status(500).json({ message: "Failed to fetch school component skills progress" });
    }
  });

  // School-wide skills statistics
  app.get("/api/teacher/school-skills-stats", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user?.role !== 'teacher') {
        return res.status(403).json({ message: "Access denied" });
      }

      const teacher = await db.select().from(usersTable).where(eq(usersTable.id, req.user.id)).limit(1);
      if (!teacher.length || !teacher[0].schoolId) {
        return res.status(400).json({ message: "Teacher school not found" });
      }

      const stats = await assessmentStorage.getSchoolSkillsStats(req.user.id);
      res.json(stats);
    } catch (error) {
      console.error('School skills stats error:', error);
      res.status(500).json({ message: "Failed to fetch school skills statistics" });
    }
  });

  // Additional student-specific routes
  app.use('/api', assessmentsRouter);

  // Students routes (for competency progress)
  app.use('/api/students', assessmentsRouter);
}