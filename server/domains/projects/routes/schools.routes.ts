import { Router } from "express";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../../auth";
import { createSuccessResponse, sendErrorResponse, wrapRoute } from "../../../utils/routeHelpers";
import { UserRole } from "../../../../shared/schema";
import type { ProjectsService } from "../projects.service";

export function createSchoolsRouter(projectsService: ProjectsService): Router {
const schoolsRouter = Router();

schoolsRouter.get('/:id/students', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN), async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return sendErrorResponse(res, { message: "Unauthorized", statusCode: 401 });
    }

    if (req.user.tier === "free") {
      return sendErrorResponse(res, { message: "Access denied", statusCode: 403 });
    }

    const schoolId = parseInt(req.params.id);
    if (!req.user.schoolId || req.user.schoolId !== schoolId) {
      return sendErrorResponse(res, { message: "Access denied", statusCode: 403 });
    }

    const students = await projectsService.getStudentsBySchool(schoolId);
    createSuccessResponse(res, students);
  } catch (error) {
    return sendErrorResponse(res, {
      message: "Failed to fetch students",
      statusCode: 500,
      error,
      details: error,
    });
  }
});

schoolsRouter.get('/students-progress', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN), wrapRoute(async (req: AuthenticatedRequest, res) => {
  if (req.user?.tier === "free") {
    return sendErrorResponse(res, { message: "Access denied", statusCode: 403 });
  }

  const teacherId = req.user!.id;

  const studentsProgress = await projectsService.getSchoolStudentsProgress(teacherId);
  createSuccessResponse(res, studentsProgress);
}));

return schoolsRouter;
}
