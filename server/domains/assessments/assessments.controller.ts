// Assessments Controller - extracted from monolithic routes.ts
import { Router, Request, Response } from 'express';
import { AssessmentsService } from './assessments.service';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../../auth';

export const assessmentsRouter = Router();
const assessmentsService = new AssessmentsService();

// GET /api/assessments - Get assessments for current user
assessmentsRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    let assessments;

    if (req.user?.role === 'teacher') {
      assessments = await assessmentsService.getAssessmentsByTeacher(userId);
    } else if (req.user?.role === 'student') {
      assessments = await assessmentsService.getAssessmentsForStudent(userId);
    } else {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(assessments);
  } catch (error) {
    console.error("Error fetching assessments:", error);
    res.status(500).json({ message: "Failed to fetch assessments" });
  }
});

export default assessmentsRouter;