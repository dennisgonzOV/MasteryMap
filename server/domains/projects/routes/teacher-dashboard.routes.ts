import { Router } from "express";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../../auth";
import { createSuccessResponse, wrapRoute } from "../../../utils/routeHelpers";
import { UserRole } from "../../../../shared/schema";
import { projectsService } from "../projects.service";

export const teacherRouter = Router();

teacherRouter.get('/dashboard-stats', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN), wrapRoute(async (req: AuthenticatedRequest, res) => {
  if (req.user?.tier === "free") {
    return res.status(403).json({ message: "Access denied" });
  }

  const teacherId = req.user!.id;

  const stats = await projectsService.getTeacherDashboardStats(teacherId);
  createSuccessResponse(res, stats);
}));

teacherRouter.get('/projects', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN), wrapRoute(async (req: AuthenticatedRequest, res) => {
  if (req.user?.tier === "free") {
    return res.status(403).json({ message: "Access denied" });
  }

  const teacherId = req.user!.id;

  const projects = await projectsService.getTeacherProjects(teacherId);
  createSuccessResponse(res, projects);
}));

teacherRouter.get('/pending-tasks', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN), wrapRoute(async (req: AuthenticatedRequest, res) => {
  if (req.user?.tier === "free") {
    return res.status(403).json({ message: "Access denied" });
  }

  const teacherId = req.user!.id;

  const tasks = await projectsService.getTeacherPendingTasks(teacherId);
  createSuccessResponse(res, tasks);
}));

teacherRouter.get('/current-milestones', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN), wrapRoute(async (req: AuthenticatedRequest, res) => {
  if (req.user?.tier === "free") {
    return res.status(403).json({ message: "Access denied" });
  }

  const teacherId = req.user!.id;

  const milestones = await projectsService.getTeacherCurrentMilestones(teacherId);
  createSuccessResponse(res, milestones);
}));
