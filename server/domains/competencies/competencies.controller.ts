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
        res.json(learnerOutcomes);
      } catch (error) {
        console.error("Error fetching complete learner outcomes hierarchy:", error);
        res.status(500).json({ message: "Failed to fetch complete learner outcomes hierarchy" });
      }
    });

    // Handle root path for learner-outcomes-hierarchy
    router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        const learnerOutcomes = await this.service.getLearnerOutcomesWithCompetencies();
        res.json(learnerOutcomes);
      } catch (error) {
        console.error("Error fetching learner outcomes hierarchy:", error);
        res.status(500).json({ message: "Failed to fetch learner outcomes hierarchy" });
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

    // B.E.S.T. Standards routes
    router.get('/best-standards', requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        const { subject, grade, search } = req.query;

        let standards;
        if (search) {
          standards = await this.service.searchBestStandards(search as string);
        } else if (subject) {
          standards = await this.service.getBestStandardsBySubject(subject as string);
        } else if (grade) {
          standards = await this.service.getBestStandardsByGrade(grade as string);
        } else {
          standards = await this.service.getAllBestStandards();
        }

        res.json(standards);
      } catch (error) {
        console.error("Error fetching B.E.S.T. standards:", error);
        res.status(500).json({ message: "Failed to fetch B.E.S.T. standards" });
      }
    });

    // Get unique subjects and grades from B.E.S.T. standards
    router.get('/best-standards/metadata', requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        const standards = await this.service.getAllBestStandards();

        const subjects = Array.from(new Set(standards.map(s => s.subject).filter(Boolean))).sort();
        const grades = Array.from(new Set(standards.map(s => s.grade).filter(Boolean))).sort();
        const bodyOfKnowledge = Array.from(new Set(standards.map(s => s.bodyOfKnowledge).filter(Boolean))).sort();

        res.json({ subjects, grades, bodyOfKnowledge });
      } catch (error) {
        console.error("Error fetching B.E.S.T. standards metadata:", error);
        res.status(500).json({ message: "Failed to fetch B.E.S.T. standards metadata" });
      }
    });

    return router;
  }
}

export const competencyController = new CompetencyController();
export const competenciesRouter = competencyController.createRouter();