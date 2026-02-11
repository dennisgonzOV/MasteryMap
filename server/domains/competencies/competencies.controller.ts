import { Router } from 'express';
import { competencyService, type ICompetencyService } from './competencies.service';
import { requireAuth, type AuthenticatedRequest } from '../auth';

export class CompetencyController {
  constructor(private service: ICompetencyService = competencyService) {}

  // Create Express router with all competency routes
  createRouter(): Router {
    const router = Router();

    // Get best standards metadata for filters - MUST be before /best-standards to avoid route conflicts
    router.get('/best-standards/metadata', requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        console.log('B.E.S.T. Standards metadata request received');
        const metadata = await this.service.getBestStandardsMetadata();
        console.log('Metadata result:', metadata);
        res.json(metadata);
      } catch (error) {
        console.error("Error fetching best standards metadata:", error);
        console.error("Error details:", {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        res.status(500).json({ message: "Failed to fetch best standards metadata", error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    // Get best standards by competency - MUST be before /best-standards to avoid route conflicts
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

    // Get all best standards with optional filtering - AFTER more specific routes
    router.get('/best-standards', requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        const { search, subject, grade } = req.query;

        const searchParam = search ? String(search).trim() : '';
        const subjectParam = subject ? String(subject).trim() : '';
        const gradeParam = grade ? String(grade).trim() : '';

        const bestStandards = await this.service.getBestStandardsWithFilters({
          search: searchParam || undefined,
          subject: subjectParam || undefined,
          grade: gradeParam || undefined
        });

        res.json(bestStandards);
      } catch (error) {
        console.error("Error fetching best standards:", error);
        res.status(500).json({ message: "Failed to fetch best standards", error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

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

    // Get component skills with details (for assessment creation, etc.)
    router.get('/component-skills/details', requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        const componentSkills = await this.service.getComponentSkillsWithDetails();
        res.json(componentSkills);
      } catch (error) {
        console.error("Error fetching component skills details:", error);
        res.status(500).json({ message: "Failed to fetch component skills details" });
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

    // Get all learner outcomes (legacy endpoint)
    router.get('/learner-outcomes', requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        const learnerOutcomes = await this.service.getLearnerOutcomesWithCompetencies();
        res.json(learnerOutcomes);
      } catch (error) {
        console.error("Error fetching learner outcomes:", error);
        res.status(500).json({ message: "Failed to fetch learner outcomes" });
      }
    });

    // Get learner outcomes hierarchy (3-level hierarchy)
    router.get('/learner-outcomes-hierarchy', requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        const learnerOutcomes = await this.service.getLearnerOutcomes();
        res.json(learnerOutcomes);
      } catch (error) {
        console.error("Error fetching learner outcomes hierarchy:", error);
        res.status(500).json({ message: "Failed to fetch learner outcomes hierarchy" });
      }
    });

    // Get complete learner outcomes hierarchy with competencies and component skills
    router.get('/learner-outcomes-hierarchy/complete', requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        const learnerOutcomes = await this.service.getLearnerOutcomesWithCompetencies();
        console.log('API Response - Learner Outcomes count:', learnerOutcomes.length);
        console.log('API Response - First outcome:', learnerOutcomes[0]);
        console.log('API Response - First outcome competencies count:', learnerOutcomes[0]?.competencies?.length);
        console.log('API Response - First competency component skills count:', learnerOutcomes[0]?.competencies?.[0]?.componentSkills?.length);
        console.log('API Response - About to send JSON:', JSON.stringify(learnerOutcomes).substring(0, 200) + '...');
        console.log('API Response - Is array:', Array.isArray(learnerOutcomes));
        console.log('API Response - Type of learnerOutcomes:', typeof learnerOutcomes);
        res.json(learnerOutcomes);
      } catch (error) {
        console.error("Error fetching complete learner outcomes hierarchy:", error);
        res.status(500).json({ message: "Failed to fetch complete learner outcomes hierarchy" });
      }
    });



    // Get competencies by learner outcome
    router.get('/learner-outcomes-hierarchy/:id/competencies', requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        const learnerOutcomeId = parseInt(req.params.id);
        const competencies = await this.service.getCompetenciesByLearnerOutcome(learnerOutcomeId);
        res.json(competencies);
      } catch (error) {
        console.error("Error fetching competencies by learner outcome:", error);
        res.status(500).json({ message: "Failed to fetch competencies" });
      }
    });

    // Get component skills by competency (for hierarchy)
    router.get('/competencies-hierarchy/:id/component-skills', requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        const competencyId = parseInt(req.params.id);
        const componentSkills = await this.service.getComponentSkillsByCompetency(competencyId);
        res.json(componentSkills);
      } catch (error) {
        console.error("Error fetching component skills by competency:", error);
        res.status(500).json({ message: "Failed to fetch component skills" });
      }
    });

    // Get component skills by specific IDs
    router.post('/component-skills/by-ids', requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        const { skillIds } = req.body;
        
        if (!skillIds || !Array.isArray(skillIds)) {
          return res.status(400).json({ message: "skillIds must be an array" });
        }
        
        const componentSkills = await this.service.getComponentSkillsByIds(skillIds);
        res.json(componentSkills);
      } catch (error) {
        console.error("Error fetching component skills by IDs:", error);
        res.status(500).json({ message: "Failed to fetch component skills by IDs" });
      }
    });

    // Get all component skills with details
    router.get('/component-skills/details', requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        const skills = await this.service.getAllComponentSkills();
        res.json(skills);
      } catch (error) {
        console.error("Error fetching component skills details:", error);
        res.status(500).json({ message: "Failed to fetch component skills" });
      }
    });

    return router;
  }
}

export const competencyController = new CompetencyController();
export const competenciesRouter = competencyController.createRouter();