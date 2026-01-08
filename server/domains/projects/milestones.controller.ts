
import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../auth';
import { validateIdParam } from '../../middleware/routeValidation';
import { assessmentStorage } from '../assessments';
import { projectsStorage } from './projects.storage';
import { portfolioStorage } from '../portfolio/portfolio.storage';

const router = Router();

// Get a specific milestone by ID
router.get('/:id', requireAuth, validateIdParam('id'), async (req: AuthenticatedRequest, res) => {
  try {
    const milestoneId = parseInt(req.params.id);
    const milestone = await projectsStorage.getMilestone(milestoneId);
    
    if (!milestone) {
      return res.status(404).json({ message: "Milestone not found" });
    }
    
    res.json(milestone);
  } catch (error) {
    console.error("Error fetching milestone:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    res.status(500).json({ 
      message: "Failed to fetch milestone", 
      error: errorMessage
    });
  }
});

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

// Update milestone deliverable
router.patch('/:id/deliverable', requireAuth, validateIdParam('id'), async (req: AuthenticatedRequest, res) => {
  try {
    const milestoneId = parseInt(req.params.id);
    const { deliverableUrl, deliverableFileName, deliverableDescription, includeInPortfolio } = req.body;

    // Verify the milestone exists
    const milestone = await projectsStorage.getMilestone(milestoneId);
    if (!milestone) {
      return res.status(404).json({ message: "Milestone not found" });
    }

    // Update the milestone with deliverable info
    const updates: any = {};
    if (deliverableUrl !== undefined) updates.deliverableUrl = deliverableUrl;
    if (deliverableFileName !== undefined) updates.deliverableFileName = deliverableFileName;
    if (deliverableDescription !== undefined) updates.deliverableDescription = deliverableDescription;
    if (includeInPortfolio !== undefined) updates.includeInPortfolio = includeInPortfolio;

    const updatedMilestone = await projectsStorage.updateMilestone(milestoneId, updates);

    // If includeInPortfolio is true, create/update portfolio artifact
    if (includeInPortfolio && deliverableUrl && req.user) {
      try {
        await portfolioStorage.upsertPortfolioArtifact({
          studentId: req.user.id,
          milestoneId: milestoneId,
          title: milestone.title,
          description: deliverableDescription || milestone.description || '',
          artifactUrl: deliverableUrl,
          artifactType: getArtifactType(deliverableFileName || ''),
          tags: [],
          isPublic: true,
          isApproved: false
        });
      } catch (artifactError) {
        console.error("Error creating/updating portfolio artifact:", artifactError);
      }
    }

    res.json(updatedMilestone);
  } catch (error) {
    console.error("Error updating milestone deliverable:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    res.status(500).json({ 
      message: "Failed to update milestone deliverable", 
      error: errorMessage
    });
  }
});

// Helper function to determine artifact type from filename
function getArtifactType(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'mov', 'avi'].includes(ext)) return 'video';
  if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(ext)) return 'document';
  if (['ppt', 'pptx', 'key'].includes(ext)) return 'presentation';
  return 'file';
}

export { router as milestonesRouter };
