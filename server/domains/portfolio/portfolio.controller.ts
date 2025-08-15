import { Router } from 'express';
import { portfolioService, type IPortfolioService } from './portfolio.service';
import { requireAuth, type AuthenticatedRequest } from '../auth';
import { 
  handleRouteError, 
  handleEntityNotFound, 
  handleAuthorizationError,
  createSuccessResponse,
  wrapRoute
} from '../../utils/routeHelpers';
import { insertPortfolioArtifactSchema } from "../../../shared/schema";

export class PortfolioController {
  constructor(private service: IPortfolioService = portfolioService) {}

  // Create Express router with all portfolio routes
  createRouter(): Router {
    const router = Router();

    // Get student's portfolio artifacts
    router.get('/artifacts', requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user!.id;
        const artifacts = await this.service.getStudentArtifacts(userId);
        res.json(artifacts);
      } catch (error) {
        console.error("Error fetching portfolio artifacts:", error);
        res.status(500).json({ message: "Failed to fetch portfolio artifacts" });
      }
    });

    // Create a new portfolio artifact
    router.post('/artifacts', requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user!.id;

        if (req.user?.role !== 'student') {
          return res.status(403).json({ message: "Only students can create portfolio artifacts" });
        }

        const artifactData = insertPortfolioArtifactSchema.parse({
          ...req.body,
          studentId: userId,
        });

        const artifact = await this.service.createArtifact(artifactData);
        res.json(artifact);
      } catch (error) {
        console.error("Error creating portfolio artifact:", error);
        res.status(500).json({ message: "Failed to create portfolio artifact" });
      }
    });

    // Generate QR code for portfolio sharing
    router.get('/qr-code', requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user!.id;
        const portfolioUrl = `${req.protocol}://${req.get('host')}/portfolio/student/${userId}`;
        
        // For now, return the URL without generating QR code since library is not installed
        res.json({
          portfolioUrl,
          qrCodeUrl: null,
          message: "QR code generation requires qrcode library installation"
        });
      } catch (error) {
        console.error("Error generating QR code:", error);
        res.status(500).json({ message: "Failed to generate QR code" });
      }
    });

    return router;
  }
}

export const portfolioController = new PortfolioController();
export const portfolioRouter = portfolioController.createRouter();