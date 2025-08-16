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

    // Get all best standards with optional filtering
    router.get('/best-standards', requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        console.log('B.E.S.T. Standards request received:', {
          query: req.query,
          params: req.params,
          method: req.method,
          url: req.url
        });
        
        const { search, subject, grade } = req.query;
        
        // More lenient parameter validation - only validate if parameters are actually strings
        if (search !== undefined && search !== null && typeof search !== 'string') {
          console.error('Invalid search parameter type:', typeof search, search);
          return res.status(400).json({ message: "Invalid search parameter" });
        }
        
        if (subject !== undefined && subject !== null && typeof subject !== 'string') {
          console.error('Invalid subject parameter type:', typeof subject, subject);
          return res.status(400).json({ message: "Invalid subject parameter" });
        }
        
        if (grade !== undefined && grade !== null && typeof grade !== 'string') {
          console.error('Invalid grade parameter type:', typeof grade, grade);
          return res.status(400).json({ message: "Invalid grade parameter" });
        }
        
        // Handle search query
        if (search && search.trim()) {
          console.log('Searching B.E.S.T. standards with term:', search);
          const bestStandards = await this.service.searchBestStandards(search);
          console.log('Search results count:', bestStandards.length);
          res.json(bestStandards);
          return;
        }
        
        // Handle subject filter
        if (subject && subject !== 'all' && subject.trim()) {
          console.log('Filtering B.E.S.T. standards by subject:', subject);
          const bestStandards = await this.service.getBestStandardsBySubject(subject);
          console.log('Subject filter results count:', bestStandards.length);
          res.json(bestStandards);
          return;
        }
        
        // Handle grade filter
        if (grade && grade !== 'all' && grade.trim()) {
          console.log('Filtering B.E.S.T. standards by grade:', grade);
          const bestStandards = await this.service.getBestStandardsByGrade(grade);
          console.log('Grade filter results count:', bestStandards.length);
          res.json(bestStandards);
          return;
        }
        
        // Default: return all standards
        console.log('Fetching all B.E.S.T. standards');
        const bestStandards = await this.service.getAllBestStandards();
        console.log('All standards count:', bestStandards.length);
        res.json(bestStandards);
      } catch (error) {
        console.error("Error fetching best standards:", error);
        console.error("Error details:", {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          query: req.query,
          params: req.params
        });
        res.status(500).json({ message: "Failed to fetch best standards", error: error instanceof Error ? error.message : 'Unknown error' });
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