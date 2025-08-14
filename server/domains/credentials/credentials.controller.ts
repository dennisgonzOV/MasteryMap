import { Router } from 'express';
import { credentialService, type ICredentialService } from './credentials.service';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../auth';
import { 
  handleRouteError, 
  handleEntityNotFound, 
  handleAuthorizationError,
  createSuccessResponse,
  wrapRoute
} from '../../utils/routeHelpers';
import { insertCredentialSchema } from "../../../shared/schema";

export class CredentialController {
  constructor(private service: ICredentialService = credentialService) {}

  // Create Express router with all credential routes
  createRouter(): Router {
    const router = Router();

    // Get student's credentials
    router.get('/student', requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user!.id;
        const credentials = await this.service.getStudentCredentials(userId);
        res.json(credentials);
      } catch (error) {
        console.error("Error fetching credentials:", error);
        res.status(500).json({ message: "Failed to fetch credentials" });
      }
    });

    // Get teacher credential stats
    router.get('/teacher-stats', requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user!.id;

        if (req.user?.role !== 'teacher' && req.user?.role !== 'admin') {
          return res.status(403).json({ message: "Only teachers can view credential stats" });
        }

        const credentials = await this.service.getTeacherStats(userId);
        res.json(credentials);
      } catch (error) {
        console.error("Error fetching teacher credential stats:", error);
        res.status(500).json({ message: "Failed to fetch teacher credential stats" });
      }
    });

    // Award a new credential
    router.post('/', requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user!.id;

        if (req.user?.role !== 'teacher' && req.user?.role !== 'admin') {
          return res.status(403).json({ message: "Only teachers can award credentials" });
        }

        const credentialData = insertCredentialSchema.parse({
          ...req.body,
          approvedBy: userId,
        });

        const credential = await this.service.awardCredential(credentialData);
        res.json(credential);
      } catch (error) {
        console.error("Error creating credential:", error);
        res.status(500).json({ message: "Failed to create credential" });
      }
    });

    return router;
  }
}

export const credentialController = new CredentialController();
export const credentialsRouter = credentialController.createRouter();