import { Router } from "express";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../../auth";
import { validateIdParam } from "../../../middleware/routeValidation";
import { createSuccessResponse, sendErrorResponse, wrapRoute } from "../../../utils/routeHelpers";
import type { ProjectsService } from "../projects.service";
import { UserRole } from "../../../../shared/schema";

async function canUserAccessProject(
  projectsService: ProjectsService,
  user: NonNullable<AuthenticatedRequest["user"]>,
  projectId: number,
): Promise<boolean> {
  if (user.role === "admin") {
    if (user.tier === "free") {
      const project = await projectsService.getProject(projectId);
      return Boolean(project && project.teacherId === user.id);
    }
    return true;
  }

  if (user.role === "teacher") {
    const project = await projectsService.getProject(projectId);
    if (!project) {
      return false;
    }

    if (project.teacherId === user.id) {
      return true;
    }

    return Boolean(user.schoolId && project.schoolId && user.schoolId === project.schoolId);
  }

  if (user.role === "student") {
    const studentProjects = await projectsService.getProjectsByUser(user.id, user.role);
    return studentProjects.some((project) => project.id === projectId);
  }

  return false;
}

async function resolveMilestoneWithAccess(
  projectsService: ProjectsService,
  user: NonNullable<AuthenticatedRequest["user"]>,
  milestoneId: number,
) {
  const milestone = await projectsService.getMilestone(milestoneId);
  if (!milestone) {
    return { status: 404 as const, message: "Milestone not found" };
  }

  if (!milestone.projectId) {
    return { status: 403 as const, message: "Access denied" };
  }

  const allowed = await canUserAccessProject(projectsService, user, milestone.projectId);
  if (!allowed) {
    return { status: 403 as const, message: "Access denied" };
  }

  return { status: 200 as const, milestone };
}

export function registerProjectMilestoneRoutes(router: Router, projectsService: ProjectsService) {
  router.get('/:id/milestones', requireAuth, validateIdParam('id'), wrapRoute(async (req: AuthenticatedRequest, res) => {
    const projectId = parseInt(req.params.id);
    const user = req.user!;

    const canAccess = await canUserAccessProject(projectsService, user, projectId);
    if (!canAccess) {
      return sendErrorResponse(res, { message: "You don't have access to this project", statusCode: 403 });
    }

    const milestones = await projectsService.getMilestonesByProject(projectId);
    createSuccessResponse(res, milestones);
  }));

  router.get('/milestones/:id', requireAuth, validateIdParam(), wrapRoute(async (req: AuthenticatedRequest, res) => {
    const milestoneId = parseInt(req.params.id);
    const resolvedMilestone = await resolveMilestoneWithAccess(projectsService, req.user!, milestoneId);
    if (resolvedMilestone.status !== 200) {
      return sendErrorResponse(res, { message: resolvedMilestone.message, statusCode: resolvedMilestone.status });
    }

    createSuccessResponse(res, resolvedMilestone.milestone);
  }));
}

export function registerProjectTeamRoutes(router: Router, projectsService: ProjectsService) {
  router.post('/:id/teams', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN), wrapRoute(async (req: AuthenticatedRequest, res) => {
    if (req.user?.tier === "free") {
      return sendErrorResponse(res, { message: "Access denied", statusCode: 403 });
    }

    const userId = req.user!.id;
    const userRole = req.user!.role;
    const projectId = parseInt(req.params.id);

    const teamData = { ...req.body, projectId };
    const team = await projectsService.createProjectTeam(teamData, userId, userRole);
    createSuccessResponse(res, team);
  }));

  router.get('/:id/teams', requireAuth, wrapRoute(async (req: AuthenticatedRequest, res) => {
    const projectId = parseInt(req.params.id);
    const canAccess = await canUserAccessProject(projectsService, req.user!, projectId);
    if (!canAccess) {
      return sendErrorResponse(res, { message: "Access denied", statusCode: 403 });
    }

    const teams = await projectsService.getProjectTeams(projectId);
    createSuccessResponse(res, teams);
  }));
}

export function createProjectWorkflowRouters(projectsService: ProjectsService) {
  const milestonesRouter = Router();
  const projectTeamsRouter = Router();
  const projectTeamMembersRouter = Router();

  milestonesRouter.get('/:id/assessments', requireAuth, validateIdParam('id'), wrapRoute(async (req: AuthenticatedRequest, res) => {
    const milestoneId = parseInt(req.params.id);
    const resolvedMilestone = await resolveMilestoneWithAccess(projectsService, req.user!, milestoneId);
    if (resolvedMilestone.status !== 200) {
      return sendErrorResponse(res, { message: resolvedMilestone.message, statusCode: resolvedMilestone.status });
    }

    const assessments = await projectsService.getAssessmentsByMilestone(milestoneId);
    createSuccessResponse(res, assessments);
  }));

  milestonesRouter.get('/:id', requireAuth, validateIdParam('id'), wrapRoute(async (req: AuthenticatedRequest, res) => {
    const milestoneId = parseInt(req.params.id);
    const resolvedMilestone = await resolveMilestoneWithAccess(projectsService, req.user!, milestoneId);
    if (resolvedMilestone.status !== 200) {
      return sendErrorResponse(res, { message: resolvedMilestone.message, statusCode: resolvedMilestone.status });
    }

    createSuccessResponse(res, resolvedMilestone.milestone);
  }));

  milestonesRouter.patch('/:id/deliverable', requireAuth, validateIdParam('id'), wrapRoute(async (req: AuthenticatedRequest, res) => {
    const milestoneId = parseInt(req.params.id);
    const {
      deliverableId,
      deliverableUrl,
      deliverableFileName,
      deliverableDescription,
      includeInPortfolio,
    } = req.body;
    const normalizedDeliverableId = typeof deliverableId === "number"
      ? deliverableId
      : typeof deliverableId === "string"
        ? parseInt(deliverableId, 10)
        : undefined;
    const resolvedMilestone = await resolveMilestoneWithAccess(projectsService, req.user!, milestoneId);
    if (resolvedMilestone.status !== 200) {
      return sendErrorResponse(res, { message: resolvedMilestone.message, statusCode: resolvedMilestone.status });
    }

    const updatedMilestone = await projectsService.updateMilestoneDeliverable(
      milestoneId,
      {
        deliverableId: Number.isFinite(normalizedDeliverableId) ? normalizedDeliverableId : undefined,
        deliverableUrl,
        deliverableFileName,
        deliverableDescription,
        includeInPortfolio,
      },
      req.user?.id,
    );

    createSuccessResponse(res, updatedMilestone);
  }));

  milestonesRouter.post('/', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN), wrapRoute(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const milestone = await projectsService.createMilestone(req.body, userId, userRole);
    createSuccessResponse(res, milestone);
  }));

  milestonesRouter.put('/:id', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN), validateIdParam(), wrapRoute(async (req: AuthenticatedRequest, res) => {
    const milestoneId = parseInt(req.params.id);
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const updatedMilestone = await projectsService.updateMilestone(milestoneId, req.body, userId, userRole);
    createSuccessResponse(res, updatedMilestone);
  }));

  milestonesRouter.delete('/:id', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN), validateIdParam(), wrapRoute(async (req: AuthenticatedRequest, res) => {
    const milestoneId = parseInt(req.params.id);
    const userId = req.user!.id;
    const userRole = req.user!.role;

    await projectsService.deleteMilestone(milestoneId, userId, userRole);
    createSuccessResponse(res, { message: "Milestone deleted successfully" });
  }));

  projectTeamsRouter.post('/', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN), wrapRoute(async (req: AuthenticatedRequest, res) => {
    if (req.user?.tier === "free") {
      return sendErrorResponse(res, { message: "Access denied", statusCode: 403 });
    }

    const userId = req.user!.id;
    const userRole = req.user!.role;

    const team = await projectsService.createProjectTeam(req.body, userId, userRole);
    createSuccessResponse(res, team);
  }));

  projectTeamsRouter.delete('/:id', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN), wrapRoute(async (req: AuthenticatedRequest, res) => {
    const teamId = parseInt(req.params.id);
    const userId = req.user!.id;
    const userRole = req.user!.role;

    await projectsService.deleteProjectTeam(teamId, userId, userRole);
    createSuccessResponse(res, { message: "Team deleted successfully" });
  }));

  projectTeamsRouter.get('/:teamId/members', requireAuth, validateIdParam('teamId'), wrapRoute(async (req: AuthenticatedRequest, res) => {
    if (req.user?.tier === "free") {
      return sendErrorResponse(res, { message: "Access denied", statusCode: 403 });
    }

    const teamId = parseInt(req.params.teamId);
    const team = await projectsService.getProjectTeam(teamId);
    if (!team?.projectId) {
      return sendErrorResponse(res, { message: "Team not found", statusCode: 404 });
    }

    const canAccess = await canUserAccessProject(projectsService, req.user!, team.projectId);
    if (!canAccess) {
      return sendErrorResponse(res, { message: "Access denied", statusCode: 403 });
    }

    const members = await projectsService.getTeamMembersWithStudentInfo(teamId);
    createSuccessResponse(res, members);
  }));

  projectTeamMembersRouter.post('/', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN), wrapRoute(async (req: AuthenticatedRequest, res) => {
    if (req.user?.tier === "free") {
      return sendErrorResponse(res, { message: "Access denied", statusCode: 403 });
    }

    const userId = req.user!.id;
    const userRole = req.user!.role;

    const member = await projectsService.addTeamMember(req.body, userId, userRole);
    createSuccessResponse(res, member);
  }));

  projectTeamMembersRouter.delete('/:id', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN), wrapRoute(async (req: AuthenticatedRequest, res) => {
    const memberId = parseInt(req.params.id);
    const userId = req.user!.id;
    const userRole = req.user!.role;

    await projectsService.removeTeamMember(memberId, userId, userRole);
    createSuccessResponse(res, { message: "Team member removed successfully" });
  }));

  return { milestonesRouter, projectTeamsRouter, projectTeamMembersRouter };
}
