import { Router } from 'express';
import { competencyService, type ICompetencyService } from './competencies.service';
import { requireAuth, type AuthenticatedRequest } from '../auth';

export class CompetencyController {
  constructor(private service: ICompetencyService = competencyService) {}

  // Create Express router with all competency routes
  createRouter(): Router {
    const router = Router();

    // Get all competencies
    router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        const competencies = await this.service.getAllCompetencies();
        res.json(competencies);
      } catch (error) {
        console.error("Error fetching competencies:", error);
        res.status(500).json({ message: "Failed to fetch competencies" });
      }
    });

    // Get all component skills
    router.get('/component-skills', requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        const componentSkills = await this.service.getAllComponentSkills();
        res.json(componentSkills);
      } catch (error) {
        console.error("Error fetching component skills:", error);
        res.status(500).json({ message: "Failed to fetch component skills" });
      }
    });

    // Get component skills by competency
    router.get('/component-skills/by-competency/:competencyId', requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        const competencyId = parseInt(req.params.competencyId);
        const componentSkills = await this.service.getComponentSkillsByCompetency(competencyId);
        res.json(componentSkills);
      } catch (error) {
        console.error("Error fetching component skills by competency:", error);
        res.status(500).json({ message: "Failed to fetch component skills" });
      }
    });

    // Get all best standards
    router.get('/best-standards', requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        const bestStandards = await this.service.getAllBestStandards();
        res.json(bestStandards);
      } catch (error) {
        console.error("Error fetching best standards:", error);
        res.status(500).json({ message: "Failed to fetch best standards" });
      }
    });

    // Get best standards by competency
    router.get('/best-standards/by-competency/:competencyId', requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        const competencyId = parseInt(req.params.competencyId);
        const bestStandards = await this.service.getBestStandardsByCompetency(competencyId);
        res.json(bestStandards);
      } catch (error) {
        console.error("Error fetching best standards by competency:", error);
        res.status(500).json({ message: "Failed to fetch best standards" });
      }
    });

    return router;
  }
}

export const competencyController = new CompetencyController();
export const competenciesRouter = competencyController.createRouter();