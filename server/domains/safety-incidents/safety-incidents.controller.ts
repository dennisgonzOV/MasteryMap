import { Router } from 'express';
import { safetyIncidentService, type ISafetyIncidentService } from './safety-incidents.service';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../auth';

export class SafetyIncidentController {
  constructor(private service: ISafetyIncidentService = safetyIncidentService) {}

  // Create Express router with all safety incident routes
  createRouter(): Router {
    const router = Router();

    // Get all safety incidents (teachers and admins only)
    router.get('/', requireAuth, requireRole('teacher', 'admin'), async (req: AuthenticatedRequest, res) => {
      try {
        const safetyIncidents = await this.service.getAllSafetyIncidents();
        res.json(safetyIncidents);
      } catch (error) {
        console.error("Error fetching safety incidents:", error);
        res.status(500).json({ message: "Failed to fetch safety incidents" });
      }
    });

    // Create safety incident (teachers and admins only)
    router.post('/', requireAuth, requireRole('teacher', 'admin'), async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user!.id;
        
        const incidentData = {
          ...req.body,
          reportedBy: userId,
          reportedAt: new Date(),
        };

        const incident = await this.service.createSafetyIncident(incidentData);
        res.json(incident);
      } catch (error) {
        console.error("Error creating safety incident:", error);
        res.status(500).json({ message: "Failed to create safety incident" });
      }
    });

    // Update safety incident status (admins only)
    router.patch('/:id/status', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
      try {
        const incidentId = parseInt(req.params.id);
        const { status, resolution } = req.body;

        await this.service.updateSafetyIncidentStatus(incidentId, status, resolution);
        res.json({ message: "Safety incident status updated" });
      } catch (error) {
        console.error("Error updating safety incident status:", error);
        res.status(400).json({ message: error instanceof Error ? error.message : "Failed to update safety incident status" });
      }
    });

    return router;
  }
}

export const safetyIncidentController = new SafetyIncidentController();
export const safetyIncidentsRouter = safetyIncidentController.createRouter();