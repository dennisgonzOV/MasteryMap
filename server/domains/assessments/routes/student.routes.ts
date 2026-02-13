import { Router } from "express";
import { requireAuth, type AuthenticatedRequest } from "../../auth";
import { validateIntParam } from "../../../middleware/security";
import { projectsService } from "../../projects/projects.service";
import type { AssessmentService } from "../assessments.service";

export function registerAssessmentStudentRoutes(
  router: Router,
  service: AssessmentService,
) {
  router.get("/competency-progress/student/:studentId", requireAuth, validateIntParam('studentId'), async (req: AuthenticatedRequest, res) => {
    try {
      const studentId = parseInt(req.params.studentId);

      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { role, id: userId } = req.user;

      if (role === 'student' && userId !== studentId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const progress = await service.getStudentCompetencyProgress(studentId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching competency progress:", error);
      res.status(500).json({ error: "Failed to fetch competency progress" });
    }
  });

  router.get("/students/competency-progress", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { role, id: userId } = req.user;
      const studentId = req.query.studentId ? parseInt(req.query.studentId as string) : userId;

      if (role === 'student' && userId !== studentId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const progress = await service.getStudentCompetencyProgress(studentId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching competency progress:", error);
      res.status(500).json({ error: "Failed to fetch competency progress" });
    }
  });

  router.get("/deadlines/student", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      if (req.user?.role !== 'student') {
        return res.status(403).json({ message: "Access denied" });
      }

      const studentId = req.user.id;
      const projects = await projectsService.getProjectsByUser(studentId, 'student');
      const projectIds = projects.map((p) => p.id);

      const upcomingDeadlines = projectIds.length > 0
        ? await service.getUpcomingDeadlines(projectIds)
        : [];

      const deadlines = upcomingDeadlines.map((deadline) => {
        const daysUntil = Math.ceil((new Date(deadline.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

        return {
          id: deadline.milestoneId,
          title: deadline.title,
          project: deadline.projectTitle,
          dueDate: daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : "In " + daysUntil + " days",
          priority: daysUntil <= 1 ? 'high' as const : daysUntil <= 3 ? 'medium' as const : 'low' as const,
        };
      });

      res.json(deadlines);
    } catch (error) {
      console.error("Error fetching student deadlines:", error);
      res.status(500).json({ error: "Failed to fetch student deadlines" });
    }
  });

  router.get("/student/assessment-submissions/:studentId", requireAuth, validateIntParam('studentId'), async (req: AuthenticatedRequest, res) => {
    try {
      const studentId = parseInt(req.params.studentId);

      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { role, id: userId } = req.user;

      if (role === 'student' && userId !== studentId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const submissionsWithCredentials = await service.getStudentAssessmentSubmissions(studentId);
      res.json(submissionsWithCredentials);
    } catch (error) {
      console.error("Error fetching student assessment submissions:", error);
      res.status(500).json({ error: "Failed to fetch assessment submissions" });
    }
  });
}
