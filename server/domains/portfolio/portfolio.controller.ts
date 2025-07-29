// Portfolio Controller - extracted from monolithic routes.ts
import { Router, Request, Response } from 'express';
import { PortfolioService } from './portfolio.service';
import { requireAuth, type AuthenticatedRequest } from '../../auth';

export const portfolioRouter = Router();
const portfolioService = new PortfolioService();

// GET /api/portfolio/artifacts - Get portfolio artifacts for current user
portfolioRouter.get('/artifacts', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const artifacts = await portfolioService.getPortfolioArtifacts(userId);
    res.json(artifacts);
  } catch (error) {
    console.error("Error fetching portfolio artifacts:", error);
    res.status(500).json({ message: "Failed to fetch portfolio artifacts" });
  }
});

export default portfolioRouter;