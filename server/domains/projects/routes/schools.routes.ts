import { Router } from "express";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../../auth";
import { createSuccessResponse, wrapRoute } from "../../../utils/routeHelpers";
import { UserRole } from "../../../../shared/schema";
import { projectsService } from "../projects.service";

export const schoolsRouter = Router();

schoolsRouter.get('/:id/students', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const schoolId = parseInt(req.params.id);
    const students = await projectsService.getStudentsBySchool(schoolId);
    res.json(students);
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ message: "Failed to fetch students" });
  }
});

schoolsRouter.get('/students-progress', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN), wrapRoute(async (req: AuthenticatedRequest, res) => {
  const teacherId = req.user!.id;

  const studentsProgress = await projectsService.getSchoolStudentsProgress(teacherId);
  createSuccessResponse(res, studentsProgress);
}));
