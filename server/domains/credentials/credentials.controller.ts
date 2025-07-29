// Credentials Controller - extracted from monolithic routes.ts
import { Router, Request, Response } from 'express';
import { CredentialsService } from './credentials.service';
import { requireAuth, type AuthenticatedRequest } from '../../auth';

export const credentialsRouter = Router();
const credentialsService = new CredentialsService();

// GET /api/credentials - Get credentials for current user
credentialsRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const credentials = await credentialsService.getCredentialsByStudent(userId);
    res.json(credentials);
  } catch (error) {
    console.error("Error fetching credentials:", error);
    res.status(500).json({ message: "Failed to fetch credentials" });
  }
});

export default credentialsRouter;