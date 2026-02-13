import { Router } from "express";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../../auth";
import { UserRole } from "../../../../shared/schema";

interface AssessmentShareCodeService {
  generateShareCode(assessmentId: number): Promise<{ shareCode: string; message: string }>;
  getAssessmentByShareCode(shareCode: string): Promise<unknown>;
  regenerateShareCode(assessmentId: number): Promise<{ shareCode: string; message: string }>;
}

export function registerAssessmentShareCodeRoutes(
  router: Router,
  service: AssessmentShareCodeService,
) {
  router.post('/:id/generate-share-code', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN), async (req: AuthenticatedRequest, res) => {
    try {
      const assessmentId = parseInt(req.params.id);
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
      res.json(assessment);
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

  router.post('/:id/regenerate-share-code', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN), async (req: AuthenticatedRequest, res) => {
    try {
      const assessmentId = parseInt(req.params.id);
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
