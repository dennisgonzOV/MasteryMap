
import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../auth';
import { validateIdParam } from '../../middleware/routeValidation';
import { assessmentStorage } from '../assessments';

const router = Router();

// Get assessments for a specific milestone
router.get('/:id/assessments', requireAuth, validateIdParam('id'), async (req: AuthenticatedRequest, res) => {
  try {
    const milestoneId = parseInt(req.params.id);
    const assessments = await assessmentStorage.getAssessmentsByMilestone(milestoneId);
    res.json(assessments);
  } catch (error) {
    console.error("Error fetching assessments:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    res.status(500).json({ 
      message: "Failed to fetch assessments", 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

export { router as milestonesRouter };
