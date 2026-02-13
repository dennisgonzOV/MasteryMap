import { Router } from "express";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../../auth";
import { createSuccessResponse, sendErrorResponse, wrapRoute } from "../../../utils/routeHelpers";
import { validateIdParam } from "../../../middleware/routeValidation";
import { checkProjectAccess } from "../../../middleware/resourceAccess";
import { UserRole } from "../../../../shared/schema";
import type {
  ProjectCreateRequestDTO,
  ProjectDTO,
  ProjectUpdateRequestDTO,
} from "../../../../shared/contracts/api";
import type { ProjectsService } from "../projects.service";

type ProjectRequest = AuthenticatedRequest & { project: ProjectDTO };

export function registerProjectCoreRoutes(router: Router, projectsService: ProjectsService) {
  router.patch('/:id/visibility', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN), validateIdParam(), checkProjectAccess(), wrapRoute(async (req: AuthenticatedRequest, res) => {
    const projectId = parseInt(req.params.id);
    const { isPublic } = req.body;

    if (typeof isPublic !== 'boolean') {
      return sendErrorResponse(res, {
        message: "isPublic must be a boolean",
        statusCode: 400,
      });
    }

    const updatedProject = await projectsService.toggleProjectVisibility(
      projectId,
      isPublic,
      req.user!.id,
      req.user!.role,
    );
    createSuccessResponse(res, updatedProject);
  }));

  router.post('/', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN), wrapRoute(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id;
    const payload: ProjectCreateRequestDTO = req.body;

    const project: ProjectDTO = await projectsService.createProjectForCurrentTeacher(payload, userId);
    createSuccessResponse(res, project);
  }));

  router.get('/', requireAuth, wrapRoute(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const scope = req.query.scope === "school" ? "school" : "mine";

    const projects = await projectsService.getProjectsForDashboard(userId, userRole, req.user!.tier, scope);
    createSuccessResponse(res, projects);
  }));

  router.get('/:id', requireAuth, validateIdParam(), checkProjectAccess({
    allowedRoles: ['teacher', 'admin', 'student'],
    customAccessCheck: (user, project) => {
      if (user.role === 'teacher') {
        return project.teacherId === user.id;
      }
      if (user.role === 'admin') {
        const userTier = (user as { tier?: string }).tier;
        if (userTier === 'free') {
          return project.teacherId === user.id;
        }
        return true;
      }
      if (user.role === 'student') {
        return true;
      }
      return false;
    }
  }), wrapRoute(async (req: AuthenticatedRequest, res) => {
    const project = (req as ProjectRequest).project;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (userRole === 'student') {
      const studentProjects = await projectsService.getProjectsByUser(userId, userRole);
      const hasAccess = studentProjects.some((p) => p.id === project.id);
      if (!hasAccess) {
        return sendErrorResponse(res, {
          message: "You don't have access to this project",
          statusCode: 403,
        });
      }
    }

    createSuccessResponse(res, project);
  }));

  router.put('/:id', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN), validateIdParam(), checkProjectAccess(), wrapRoute(async (req: AuthenticatedRequest, res) => {
    const projectId = parseInt(req.params.id);
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const payload: ProjectUpdateRequestDTO = req.body;

    const updatedProject: ProjectDTO = await projectsService.updateProject(
      projectId,
      payload as Parameters<typeof projectsService.updateProject>[1],
      userId,
      userRole
    );
    createSuccessResponse(res, updatedProject);
  }));

  router.delete('/:id', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN), validateIdParam(), checkProjectAccess(), wrapRoute(async (req: AuthenticatedRequest, res) => {
    const projectId = parseInt(req.params.id);
    const userId = req.user!.id;
    const userRole = req.user!.role;

    await projectsService.deleteProject(projectId, userId, userRole);
    createSuccessResponse(res, { message: "Project deleted successfully" });
  }));

  router.post('/:id/start', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN), validateIdParam('id'), checkProjectAccess(), wrapRoute(async (req: AuthenticatedRequest, res) => {
    const projectId = parseInt(req.params.id);
    const userId = req.user!.id;
    const userRole = req.user!.role;

    await projectsService.startProject(projectId, userId, userRole);
    createSuccessResponse(res, { message: "Project started successfully" });
  }));

  router.post('/:id/assign', requireAuth, wrapRoute(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (userRole !== 'teacher' && userRole !== 'admin') {
      return sendErrorResponse(res, {
        message: "Only teachers can assign projects",
        statusCode: 403,
      });
    }

    if (req.user?.tier === 'free') {
      return sendErrorResponse(res, {
        message: "Access denied",
        statusCode: 403,
      });
    }

    const projectId = parseInt(req.params.id);
    const { studentIds } = req.body;

    await projectsService.assignStudentsToProject(projectId, studentIds, userId, userRole);
    createSuccessResponse(res, { message: "Students assigned successfully" });
  }));
}
