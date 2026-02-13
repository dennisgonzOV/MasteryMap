import { Router } from "express";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../../auth";
import { createSuccessResponse, wrapRoute } from "../../../utils/routeHelpers";
import { UserRole } from "../../../../shared/schema";
import { projectsService } from "../projects.service";

export const schoolsRouter = Router();

schoolsRouter.get('/:id/students', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN), async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (req.user.tier === "free") {
      return res.status(403).json({ message: "Access denied" });
    }

    const schoolId = parseInt(req.params.id);
    if (!req.user.schoolId || req.user.schoolId !== schoolId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const students = await projectsService.getStudentsBySchool(schoolId);
    res.json(students);
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ message: "Failed to fetch students" });
  }
});

schoolsRouter.get('/students-progress', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN), wrapRoute(async (req: AuthenticatedRequest, res) => {
  if (req.user?.tier === "free") {
    return res.status(403).json({ message: "Access denied" });
  }

  const teacherId = req.user!.id;

  const studentsProgress = await projectsService.getSchoolStudentsProgress(teacherId);
  createSuccessResponse(res, studentsProgress);
}));
