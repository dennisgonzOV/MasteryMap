import { Router } from "express";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../../auth";
import { aiLimiter, createErrorResponse } from "../../../middleware/security";
import { validateIdParam } from "../../../middleware/routeValidation";
import { UserRole } from "../../../../shared/schema";
import type { AssessmentDTO, MilestoneDTO } from "../../../../shared/contracts/api";
import { projectsService } from "../projects.service";
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

export function registerProjectAIRoutes(router: Router) {
  router.post('/generate-ideas', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN), aiLimiter, async (req: AuthenticatedRequest, res) => {
    try {
      const { subject, topic, gradeLevel, duration, componentSkillIds } = req.body;

      if (!subject || !topic || !gradeLevel || !duration || !componentSkillIds?.length) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      if (!Array.isArray(componentSkillIds) || !componentSkillIds.every(id => typeof id === 'number')) {
        return res.status(400).json({ message: "Invalid component skill IDs format" });
      }

      const result = await projectsService.generateProjectIdeasForUser(req.user!.id, {
        subject,
        topic,
        gradeLevel,
        duration,
        componentSkillIds
      });

      res.json(result);
    } catch (error) {
      console.error("Error generating project ideas:", error);
      if (error instanceof Error && error.message.includes("Free tier limit reached")) {
        return res.status(403).json({ message: error.message, limitReached: true });
      }
      if (error instanceof Error && error.message.includes("No valid component skills")) {
        return res.status(400).json({ message: error.message });
      }
      const errorResponse = createErrorResponse(error, "Failed to generate project ideas", 500);
      res.status(500).json(errorResponse);
    }
  });

  router.post('/:id/generate-thumbnail', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN), validateIdParam('id'), aiLimiter, async (req: AuthenticatedRequest, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user!.id;
      const userRole = req.user!.role;

      const parseResult = thumbnailOptionsSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid request body", errors: parseResult.error.errors });
      }
      const { subject, topic } = parseResult.data;

      const result = await projectsService.generateProjectThumbnail(projectId, userId, userRole, { subject, topic });
      res.json(result);
    } catch (error) {
      console.error("Error generating thumbnail:", error);
      if (error instanceof Error && error.message.includes("Project not found")) {
        return res.status(404).json({ message: error.message });
      }
      if (error instanceof Error && error.message.includes("Access denied")) {
        return res.status(403).json({ message: error.message });
      }
      const errorResponse = createErrorResponse(error, "Failed to generate thumbnail", 500);
      res.status(500).json(errorResponse);
    }
  });

  router.post('/generate-thumbnail-preview', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN), aiLimiter, async (req: AuthenticatedRequest, res) => {
    try {
      const parseResult = thumbnailPreviewSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid request body", errors: parseResult.error.errors });
      }
      const { title, description, subject, topic } = parseResult.data;

      const result = await projectsService.generateThumbnailPreview({ title, description, subject, topic });
      res.json(result);
    } catch (error) {
      console.error("Error generating thumbnail preview:", error);
      const errorResponse = createErrorResponse(error, "Failed to generate thumbnail preview", 500);
      res.status(500).json(errorResponse);
    }
  });

  router.post('/:id/generate-milestones', requireAuth, validateIdParam('id'), aiLimiter, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;

      if (userRole !== 'teacher' && userRole !== 'admin') {
        return res.status(403).json({ message: "Only teachers can generate milestones" });
      }

      const projectId = parseInt(req.params.id);

      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const savedMilestones: MilestoneDTO[] = await projectsService.generateMilestonesForProject(projectId, userId, userRole);

      res.json(savedMilestones);
    } catch (error) {
      console.error("Error generating milestones:", error);
      if (error instanceof Error && error.message.includes("Project not found")) {
        return res.status(404).json({ message: error.message });
      }
      if (error instanceof Error && error.message.includes("Access denied")) {
        return res.status(403).json({ message: error.message });
      }
      const errorResponse = createErrorResponse(error, "Failed to generate milestones", 500);
      res.status(500).json(errorResponse);
    }
  });

  router.post('/:id/generate-milestones-and-assessments', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;

      if (userRole !== 'teacher' && userRole !== 'admin') {
        return res.status(403).json({ message: "Only teachers can generate milestones and assessments" });
      }

      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const result = await projectsService.generateMilestonesAndAssessmentsForProject(
        projectId,
        userId,
        userRole,
      ) as GeneratedMilestoneWithAssessment[];

      res.json({
        milestones: result.map((item) => item.milestone),
        assessments: result.map((item) => item.assessment).filter(Boolean),
        message: `Generated ${result.length} milestones and ${result.filter((item) => item.assessment).length} assessments`
      });
    } catch (error) {
      console.error("Error generating milestones and assessments:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      res.status(500).json({
        message: "Failed to generate milestones and assessments",
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });
}
