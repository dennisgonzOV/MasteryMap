import { Router } from "express";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../../auth";
import { validateIntParam, aiLimiter } from "../../../middleware/security";
import { UserRole } from "../../../../shared/schema";
import type { AssessmentService } from "../assessments.service";
import type { AssessmentProjectGateway } from "../assessment-project-gateway";
import { canTeacherManageAssessment } from "../assessment-ownership";
import { canUserAccessAssessment } from "../assessment-access";

export function registerAssessmentLifecycleRoutes(
  router: Router,
  service: AssessmentService,
  projectGateway: AssessmentProjectGateway,
) {
  router.delete('/:id', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN), validateIntParam('id'), async (req: AuthenticatedRequest, res) => {
    try {
      const assessmentId = parseInt(req.params.id);
      const userId = req.user!.id;

      const assessment = await service.getAssessment(assessmentId);
      if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
      }

      if (req.user?.role === 'teacher' || req.user?.tier === 'free') {
        const canManage = await canTeacherManageAssessment(
          assessment,
          userId,
          projectGateway,
        );
        if (!canManage) {
          return res.status(403).json({
            message: "Access denied - you can only delete assessments from your own projects"
          });
        }
      }

      const hasSubmissions = await service.hasSubmissions(assessmentId);
      if (hasSubmissions) {
        return res.status(400).json({
          message: "Cannot delete assessment - it has existing submissions. Please review and grade all submissions before deleting."
        });
      }

      await service.deleteAssessment(assessmentId);
      res.json({ message: "Assessment deleted successfully" });
    } catch (error) {
      console.error("Error deleting assessment:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      res.status(500).json({
        message: "Failed to delete assessment",
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });

  router.post('/milestones/:id/generate-assessment', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN), validateIntParam('id'), aiLimiter, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;

      if (req.user?.role !== 'teacher' && req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only teachers can generate assessments" });
      }

      const milestoneId = parseInt(req.params.id);
      const assessment = await service.generateAssessmentForMilestone(
        milestoneId,
        userId,
        req.user.role,
        req.user.tier,
      );

      res.json(assessment);
    } catch (error) {
      console.error("Error generating assessment:", error);
      if (error instanceof Error && error.message.includes("Milestone not found")) {
        return res.status(404).json({ message: error.message });
      }
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      res.status(500).json({
        message: "Failed to generate assessment",
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });

  router.get('/:id/submissions', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN), validateIntParam('id'), async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user?.role !== 'teacher' && req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only teachers can view submissions" });
      }

      const assessmentId = parseInt(req.params.id);
      const assessment = await service.getAssessment(assessmentId);
      if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
      }

      const canAccess = await canUserAccessAssessment(assessment, req.user, projectGateway);
      if (!canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const submissions = await service.getSubmissionsByAssessment(assessmentId);

      res.json(submissions);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      res.status(500).json({ message: "Failed to fetch submissions" });
    }
  });
}
