import { Router } from "express";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../../auth";
import { UserRole, type Assessment } from "../../../../shared/schema";
import { validateIntParam } from "../../../middleware/security";
import type { AssessmentProjectGateway } from "../assessment-project-gateway";
import { canTeacherManageAssessment } from "../assessment-ownership";
import { canUserAccessAssessment } from "../assessment-access";

interface AssessmentShareCodeService {
  getAssessment(assessmentId: number): Promise<Assessment | undefined>;
  generateShareCode(assessmentId: number): Promise<{ shareCode: string; message: string }>;
  getAssessmentByShareCode(shareCode: string): Promise<Assessment>;
  regenerateShareCode(assessmentId: number): Promise<{ shareCode: string; message: string }>;
}

export function registerAssessmentShareCodeRoutes(
  router: Router,
  service: AssessmentShareCodeService,
  projectGateway: AssessmentProjectGateway,
) {
  router.post('/:id/generate-share-code', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN), validateIntParam('id'), async (req: AuthenticatedRequest, res) => {
    try {
      const assessmentId = parseInt(req.params.id);
      const assessment = await service.getAssessment(assessmentId);
      if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
      }

      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (req.user.role === "teacher" || req.user.tier === "free") {
        const canManage = await canTeacherManageAssessment(
          assessment,
          req.user.id,
          projectGateway,
        );
        if (!canManage) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const result = await service.generateShareCode(assessmentId);
      res.json(result);
    } catch (error) {
      console.error("Error generating share code:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      res.status(500).json({
        message: "Failed to generate share code",
        error: errorMessage
      });
    }
  });

  router.get('/by-code/:code', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const shareCode = req.params.code;
      const assessment = await service.getAssessmentByShareCode(shareCode);

      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const canAccess = await canUserAccessAssessment(assessment, req.user, projectGateway);
      if (!canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (req.user.role === "student") {
        return res.json(assessment);
      }

      return res.json(assessment);
    } catch (error) {
      console.error("Error accessing assessment by code:", error);
      if (error instanceof Error) {
        if (error.message.includes("Invalid share code format")) {
          return res.status(400).json({ message: error.message });
        }
        if (error.message.includes("Assessment not found")) {
          return res.status(404).json({ message: error.message });
        }
        if (error.message.includes("expired")) {
          return res.status(410).json({ message: error.message });
        }
      }
      res.status(500).json({ message: "Failed to access assessment" });
    }
  });

  router.post('/:id/regenerate-share-code', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN), validateIntParam('id'), async (req: AuthenticatedRequest, res) => {
    try {
      const assessmentId = parseInt(req.params.id);
      const assessment = await service.getAssessment(assessmentId);
      if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
      }

      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (req.user.role === "teacher" || req.user.tier === "free") {
        const canManage = await canTeacherManageAssessment(
          assessment,
          req.user.id,
          projectGateway,
        );
        if (!canManage) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const result = await service.regenerateShareCode(assessmentId);
      res.json(result);
    } catch (error) {
      console.error("Error regenerating share code:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      res.status(500).json({
        message: "Failed to regenerate share code",
        error: errorMessage
      });
    }
  });
}
