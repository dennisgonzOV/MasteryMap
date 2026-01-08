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
        const portfolioUrl = `${req.protocol}://${req.get('host')}/portfolio/public/${userId}`;
        
        // Generate QR code using the installed library
        const QRCode = await import('qrcode');
        const qrCodeDataUrl = await QRCode.toDataURL(portfolioUrl, {
          width: 200,
          margin: 2,
          color: {
            dark: '#1F2937', // Dark gray
            light: '#FFFFFF', // White
          },
        });
        
        res.json({
          portfolioUrl,
          qrCodeUrl: qrCodeDataUrl
        });
      } catch (error) {
        console.error("Error generating QR code:", error);
        res.status(500).json({ message: "Failed to generate QR code" });
      }
    });

    // Public portfolio endpoint - NO AUTHENTICATION REQUIRED
    // Returns student info, all credentials, and only PUBLIC artifacts
    router.get('/public/:studentId', async (req, res) => {
      try {
        const studentId = parseInt(req.params.studentId);
        if (isNaN(studentId)) {
          return res.status(400).json({ message: "Invalid student ID" });
        }

        const portfolioData = await this.service.getPublicPortfolio(studentId);
        if (!portfolioData) {
          return res.status(404).json({ message: "Portfolio not found" });
        }

        res.json(portfolioData);
      } catch (error) {
        console.error("Error fetching public portfolio:", error);
        res.status(500).json({ message: "Failed to fetch public portfolio" });
      }
    });

    // Update artifact visibility (make public/private)
    router.patch('/artifacts/:id/visibility', requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        const artifactId = parseInt(req.params.id);
        const { isPublic } = req.body;

        if (isNaN(artifactId)) {
          return res.status(400).json({ message: "Invalid artifact ID" });
        }

        if (typeof isPublic !== 'boolean') {
          return res.status(400).json({ message: "isPublic must be a boolean" });
        }

        const artifact = await this.service.updateArtifact(artifactId, { isPublic });
        res.json(artifact);
      } catch (error) {
        console.error("Error updating artifact visibility:", error);
        res.status(500).json({ message: "Failed to update artifact visibility" });
      }
    });

    return router;
  }
}

export const portfolioController = new PortfolioController();
export const portfolioRouter = portfolioController.createRouter();