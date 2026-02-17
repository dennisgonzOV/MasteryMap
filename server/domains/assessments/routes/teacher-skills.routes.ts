import { Router } from "express";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../../auth";
import { UserRole } from "../../../../shared/schema";

interface AssessmentTeacherSkillsService {
  getSchoolComponentSkillsProgress(teacherId: number, grade?: string): Promise<unknown>;
  getSchoolSkillsStats(teacherId: number, grade?: string): Promise<unknown>;
}

export function registerAssessmentTeacherSkillsRoutes(
  router: Router,
  service: AssessmentTeacherSkillsService,
) {
  router.get('/teacher/school-component-skills-progress', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN), async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user?.tier === "free") {
        return res.status(403).json({ message: "Access denied" });
      }

      const teacherId = req.user!.id;
      const grade = typeof req.query.grade === "string" ? req.query.grade : undefined;
      const skillsProgress = await service.getSchoolComponentSkillsProgress(teacherId, grade);
      res.json(skillsProgress);
    } catch (error) {
      console.error("Error fetching school component skills progress:", error);
      res.status(500).json({ message: "Failed to fetch school component skills progress" });
    }
  });

  router.get('/teacher/school-skills-stats', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN), async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user?.tier === "free") {
        return res.status(403).json({ message: "Access denied" });
      }

      const teacherId = req.user!.id;
      const grade = typeof req.query.grade === "string" ? req.query.grade : undefined;
      const stats = await service.getSchoolSkillsStats(teacherId, grade);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching school skills stats:", error);
      res.status(500).json({ message: "Failed to fetch school skills stats" });
    }
  });
}
