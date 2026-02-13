import { Router } from "express";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../../auth";
import { validateIdParam } from "../../../middleware/routeValidation";
import { createSuccessResponse, wrapRoute } from "../../../utils/routeHelpers";
import { projectsService } from "../projects.service";
import { UserRole } from "../../../../shared/schema";

export function registerProjectMilestoneRoutes(router: Router) {
  router.get('/:id/milestones', requireAuth, validateIdParam('id'), wrapRoute(async (req: AuthenticatedRequest, res) => {
    const projectId = parseInt(req.params.id);
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (userRole === 'student') {
      const studentProjects = await projectsService.getProjectsByUser(userId, userRole);
      const hasAccess = studentProjects.some((p) => p.id === projectId);
      if (!hasAccess) {
        return res.status(403).json({ message: "You don't have access to this project" });
      }
    }

    const milestones = await projectsService.getMilestonesByProject(projectId);
    createSuccessResponse(res, milestones);
  }));

  router.get('/milestones/:id', requireAuth, validateIdParam(), wrapRoute(async (req: AuthenticatedRequest, res) => {
    const milestoneId = parseInt(req.params.id);
    const milestone = await projectsService.getMilestone(milestoneId);

    if (!milestone) {
      return res.status(404).json({ message: "Milestone not found" });
    }

    createSuccessResponse(res, milestone);
  }));
}

export function registerProjectTeamRoutes(router: Router) {
  router.post('/:id/teams', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN), wrapRoute(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const projectId = parseInt(req.params.id);

    const teamData = { ...req.body, projectId };
    const team = await projectsService.createProjectTeam(teamData, userId, userRole);
    createSuccessResponse(res, team);
  }));

  router.get('/:id/teams', requireAuth, wrapRoute(async (req: AuthenticatedRequest, res) => {
    const projectId = parseInt(req.params.id);
    const teams = await projectsService.getProjectTeams(projectId);
    createSuccessResponse(res, teams);
  }));
}

export const milestonesRouter = Router();

milestonesRouter.get('/:id/assessments', requireAuth, validateIdParam('id'), wrapRoute(async (req: AuthenticatedRequest, res) => {
  const milestoneId = parseInt(req.params.id);
  const assessments = await projectsService.getAssessmentsByMilestone(milestoneId);
  createSuccessResponse(res, assessments);
}));

milestonesRouter.get('/:id', requireAuth, validateIdParam('id'), wrapRoute(async (req: AuthenticatedRequest, res) => {
  const milestoneId = parseInt(req.params.id);
  const milestone = await projectsService.getMilestone(milestoneId);

  if (!milestone) {
    return res.status(404).json({ message: "Milestone not found" });
  }

  createSuccessResponse(res, milestone);
}));

milestonesRouter.patch('/:id/deliverable', requireAuth, validateIdParam('id'), wrapRoute(async (req: AuthenticatedRequest, res) => {
  const milestoneId = parseInt(req.params.id);
  const { deliverableUrl, deliverableFileName, deliverableDescription, includeInPortfolio } = req.body;

  const updatedMilestone = await projectsService.updateMilestoneDeliverable(
    milestoneId,
    {
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

export const projectTeamsRouter = Router();

projectTeamsRouter.post('/', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN), wrapRoute(async (req: AuthenticatedRequest, res) => {
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
  const teamId = parseInt(req.params.teamId);
  const members = await projectsService.getTeamMembersWithStudentInfo(teamId);
  createSuccessResponse(res, members);
}));

export const projectTeamMembersRouter = Router();

projectTeamMembersRouter.post('/', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN), wrapRoute(async (req: AuthenticatedRequest, res) => {
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
