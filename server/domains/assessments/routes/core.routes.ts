import { Router } from "express";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../../auth";
import { validateIntParam } from "../../../middleware/security";
import { UserRole } from "../../../../shared/schema";
import type {
  AssessmentCreateRequestDTO,
  AssessmentDTO,
  AssessmentUpdateRequestDTO,
} from "../../../../shared/contracts/api";
import type { AssessmentService } from "../assessments.service";
import type { AssessmentProjectGateway } from "../assessment-project-gateway";
import { canTeacherManageAssessment } from "../assessment-ownership";
import { canUserAccessAssessment, filterAccessibleAssessments } from "../assessment-access";

export function registerAssessmentCoreRoutes(
  router: Router,
  service: AssessmentService,
  projectGateway: AssessmentProjectGateway,
) {
  router.get('/standalone', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const assessments = await service.getStandaloneAssessments();
      const visibleAssessments = await filterAccessibleAssessments(assessments, req.user, projectGateway);
      res.json(visibleAssessments);
    } catch (error) {
      console.error("Error fetching standalone assessments:", error);
      res.status(500).json({ message: "Failed to fetch standalone assessments" });
    }
  });

  router.get('/', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const scope = req.query.scope === "school" ? "school" : "mine";

      if (req.user.role === UserRole.TEACHER) {
        if (req.user.tier === "free") {
          const ownAssessments = await service.getAssessmentsForTeacher(req.user.id);
          return res.json(ownAssessments);
        }

        if (scope === "school") {
          if (!req.user.schoolId) {
            return res.json([]);
          }
          const schoolAssessments = await service.getAssessmentsForSchool(req.user.schoolId);
          return res.json(schoolAssessments);
        }

        const ownAssessments = await service.getAssessmentsForTeacher(req.user.id);
        return res.json(ownAssessments);
      }

      const assessments = await service.getAllAssessments();
      const visibleAssessments = await filterAccessibleAssessments(assessments, req.user, projectGateway);
      res.json(visibleAssessments);
    } catch (error) {
      console.error("Error fetching all assessments:", error);
      res.status(500).json({ message: "Failed to fetch assessments" });
    }
  });

  router.get('/:id', requireAuth, validateIntParam('id'), async (req: AuthenticatedRequest, res) => {
    try {
      const assessmentId = parseInt(req.params.id);
      const assessment = await service.getAssessment(assessmentId);

      if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
      }

      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const canAccess = await canUserAccessAssessment(assessment, req.user, projectGateway);
      if (!canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(assessment);
    } catch (error) {
      console.error("Error fetching assessment:", error);
      res.status(500).json({ message: "Failed to fetch assessment" });
    }
  });

  router.patch('/:id', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN), validateIntParam('id'), async (req: AuthenticatedRequest, res) => {
    try {
      const assessmentId = parseInt(req.params.id);
      const updates: AssessmentUpdateRequestDTO = req.body;

      const assessment = await service.getAssessment(assessmentId);
      if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
      }

      if (assessment.createdBy) {
        if (!req.user || (assessment.createdBy !== req.user.id && req.user.role !== "admin")) {
          return res.status(403).json({ message: "Access denied - you can only update assessments you created" });
        }
      } else if (req.user?.role === "teacher") {
        const canManage = await canTeacherManageAssessment(
          assessment,
          req.user.id,
          projectGateway,
        );
        if (!canManage) {
          return res.status(403).json({
            message: "Access denied - you can only update assessments from your own projects"
          });
        }
      }

      const updatedAssessment: AssessmentDTO = await service.updateAssessment(
        assessmentId,
        updates as Parameters<AssessmentService["updateAssessment"]>[1]
      );
      res.json(updatedAssessment);
    } catch (error) {
      console.error("Error updating assessment:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      res.status(500).json({
        message: "Failed to update assessment",
        error: errorMessage
      });
    }
  });

  router.post('/', requireAuth, requireRole(UserRole.TEACHER, UserRole.ADMIN), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Only teachers can create assessments" });
      }

      const payload: AssessmentCreateRequestDTO = {
        ...req.body,
        createdBy: req.user.id,
      };
      const assessment: AssessmentDTO = await service.createAssessment(payload);
      res.json(assessment);
    } catch (error) {
      console.error("Error creating assessment:", error);

      if (error instanceof Error) {
        const errorMessage = error.message;

        if (errorMessage.includes("must have at least one question") ||
          errorMessage.includes("must have non-empty text") ||
          errorMessage.includes("Teacher assessments must have")) {
          return res.status(400).json({
            message: "Validation Error",
            error: errorMessage
          });
        }

        if (errorMessage.includes("Teacher assessments must have at least one question with non-empty text")) {
          return res.status(400).json({
            message: "Validation Error",
            error: "Teacher assessments must have at least one question with non-empty text"
          });
        }
      }

      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      res.status(500).json({
        message: "Failed to create assessment",
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });
}
