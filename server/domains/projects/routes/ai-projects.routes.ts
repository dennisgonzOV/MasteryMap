import { Router, type Response } from "express";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../../auth";
import { aiLimiter } from "../../../middleware/security";
import { validateIdParam } from "../../../middleware/routeValidation";
import { UserRole } from "../../../../shared/schema";
import type { AssessmentDTO, MilestoneDTO } from "../../../../shared/contracts/api";
import type { ProjectsService } from "../projects.service";
import { createSuccessResponse, sendErrorResponse } from "../../../utils/routeHelpers";
import { z } from "zod";

type GeneratedMilestoneWithAssessment = {
  milestone: MilestoneDTO;
  assessment?: AssessmentDTO | null;
};

const thumbnailOptionsSchema = z.object({
  subject: z.string().max(100).optional(),
  topic: z.string().max(200).optional(),
});

const thumbnailPreviewSchema = z.object({
  title: z.string().min(1, "Project title is required").max(200),
  description: z.string().max(2000).optional(),
  subject: z.string().max(100).optional(),
  topic: z.string().max(200).optional(),
});

export function registerProjectAIRoutes(router: Router, projectsService: ProjectsService) {
  const ensureFreeTierAdminProjectAccess = async (
    req: AuthenticatedRequest,
    res: Response,
    projectId: number,
  ): Promise<boolean> => {
    if (!(req.user?.role === "admin" && req.user.tier === "free")) {
      return true;
    }

    const project = await projectsService.getProject(projectId);
    if (!project || project.teacherId !== req.user.id) {
      sendErrorResponse(res, { message: "Access denied", statusCode: 403 });
      return false;
    }

    return true;
  };

  router.post('/generate-ideas', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN), aiLimiter, async (req: AuthenticatedRequest, res) => {
    try {
      const { subject, topic, gradeLevel, duration, componentSkillIds } = req.body;

      if (!subject || !topic || !gradeLevel || !duration || !componentSkillIds?.length) {
        return sendErrorResponse(res, { message: "Missing required fields", statusCode: 400 });
      }

      if (!Array.isArray(componentSkillIds) || !componentSkillIds.every(id => typeof id === 'number')) {
        return sendErrorResponse(res, { message: "Invalid component skill IDs format", statusCode: 400 });
      }

      const result = await projectsService.generateProjectIdeasForUser(req.user!.id, {
        subject,
        topic,
        gradeLevel,
        duration,
        componentSkillIds
      });

      createSuccessResponse(res, result);
    } catch (error) {
      console.error("Error generating project ideas:", error);
      if (error instanceof Error && error.message.includes("Free tier limit reached")) {
        return sendErrorResponse(res, {
          message: error.message,
          statusCode: 403,
          error: "Forbidden",
          details: { limitReached: true },
        });
      }
      if (error instanceof Error && error.message.includes("No valid component skills")) {
        return sendErrorResponse(res, { message: error.message, statusCode: 400 });
      }
      sendErrorResponse(res, {
        message: "Failed to generate project ideas",
        statusCode: 500,
        error,
      });
    }
  });

  router.post('/:id/generate-thumbnail', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN), validateIdParam('id'), aiLimiter, async (req: AuthenticatedRequest, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user!.id;
      const userRole = req.user!.role;

      const hasAccess = await ensureFreeTierAdminProjectAccess(req, res, projectId);
      if (!hasAccess) {
        return;
      }

      const parseResult = thumbnailOptionsSchema.safeParse(req.body);
      if (!parseResult.success) {
        return sendErrorResponse(res, {
          message: "Invalid request body",
          statusCode: 400,
          error: "Validation failed",
          details: parseResult.error.errors,
        });
      }
      const { subject, topic } = parseResult.data;

      const result = await projectsService.generateProjectThumbnail(projectId, userId, userRole, { subject, topic });
      createSuccessResponse(res, result);
    } catch (error) {
      console.error("Error generating thumbnail:", error);
      if (error instanceof Error && error.message.includes("Project not found")) {
        return sendErrorResponse(res, { message: error.message, statusCode: 404 });
      }
      if (error instanceof Error && error.message.includes("Access denied")) {
        return sendErrorResponse(res, { message: error.message, statusCode: 403 });
      }
      sendErrorResponse(res, {
        message: "Failed to generate thumbnail",
        statusCode: 500,
        error,
      });
    }
  });

  router.post('/generate-thumbnail-preview', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN), aiLimiter, async (req: AuthenticatedRequest, res) => {
    try {
      const parseResult = thumbnailPreviewSchema.safeParse(req.body);
      if (!parseResult.success) {
        return sendErrorResponse(res, {
          message: "Invalid request body",
          statusCode: 400,
          error: "Validation failed",
          details: parseResult.error.errors,
        });
      }
      const { title, description, subject, topic } = parseResult.data;

      const result = await projectsService.generateThumbnailPreview({ title, description, subject, topic });
      createSuccessResponse(res, result);
    } catch (error) {
      console.error("Error generating thumbnail preview:", error);
      sendErrorResponse(res, {
        message: "Failed to generate thumbnail preview",
        statusCode: 500,
        error,
      });
    }
  });

  router.post('/:id/generate-milestones', requireAuth, validateIdParam('id'), aiLimiter, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;

      if (userRole !== 'teacher' && userRole !== 'admin') {
        return sendErrorResponse(res, { message: "Only teachers can generate milestones", statusCode: 403 });
      }

      if (req.user?.tier === 'free') {
        return sendErrorResponse(res, { message: "Access denied", statusCode: 403 });
      }

      const projectId = parseInt(req.params.id);

      if (isNaN(projectId)) {
        return sendErrorResponse(res, { message: "Invalid project ID", statusCode: 400 });
      }

      const hasAccess = await ensureFreeTierAdminProjectAccess(req, res, projectId);
      if (!hasAccess) {
        return;
      }

      const savedMilestones: MilestoneDTO[] = await projectsService.generateMilestonesForProject(projectId, userId, userRole);

      createSuccessResponse(res, savedMilestones);
    } catch (error) {
      console.error("Error generating milestones:", error);
      if (error instanceof Error && error.message.includes("Project not found")) {
        return sendErrorResponse(res, { message: error.message, statusCode: 404 });
      }
      if (error instanceof Error && error.message.includes("Access denied")) {
        return sendErrorResponse(res, { message: error.message, statusCode: 403 });
      }
      sendErrorResponse(res, {
        message: "Failed to generate milestones",
        statusCode: 500,
        error,
      });
    }
  });

  router.post('/:id/generate-milestones-and-assessments', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;

      if (userRole !== 'teacher' && userRole !== 'admin') {
        return sendErrorResponse(res, { message: "Only teachers can generate milestones and assessments", statusCode: 403 });
      }

      if (req.user?.tier === 'free') {
        return sendErrorResponse(res, { message: "Access denied", statusCode: 403 });
      }

      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return sendErrorResponse(res, { message: "Invalid project ID", statusCode: 400 });
      }

      const hasAccess = await ensureFreeTierAdminProjectAccess(req, res, projectId);
      if (!hasAccess) {
        return;
      }

      const result = await projectsService.generateMilestonesAndAssessmentsForProject(
        projectId,
        userId,
        userRole,
      ) as GeneratedMilestoneWithAssessment[];

      createSuccessResponse(res, {
        milestones: result.map((item) => item.milestone),
        assessments: result.map((item) => item.assessment).filter(Boolean),
        message: `Generated ${result.length} milestones and ${result.filter((item) => item.assessment).length} assessments`
      });
    } catch (error) {
      console.error("Error generating milestones and assessments:", error);
      sendErrorResponse(res, {
        message: "Failed to generate milestones and assessments",
        statusCode: 500,
        error,
        details: process.env.NODE_ENV === 'development' ? error : undefined,
      });
    }
  });
}
