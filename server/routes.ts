import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuthRoutes } from "./authRoutes";
import { requireAuth, requireRole, type AuthenticatedRequest } from "./auth";
import { 
  insertProjectSchema, 
  insertMilestoneSchema, 
  insertAssessmentSchema, 
  insertSubmissionSchema,
  insertCredentialSchema,
  insertPortfolioArtifactSchema,
  type User
} from "@shared/schema";
import { generateMilestones, generateAssessment, generateFeedback } from "./openai";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup auth routes
  setupAuthRoutes(app);

  // Project routes
  app.post('/api/projects', requireAuth, requireRole(['teacher', 'admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      
      if (req.user?.role !== 'teacher' && req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only teachers can create projects" });
      }

      // Handle date conversion manually
      const { dueDate, ...bodyData } = req.body;
      console.log('Received request body:', req.body);
      
      const projectData = insertProjectSchema.parse({
        ...bodyData,
        teacherId: userId,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      });
      
      console.log('Parsed project data:', projectData);
      console.log('Component skills field:', projectData.componentSkillIds);
      
      // Ensure componentSkillIds is properly handled
      if (!projectData.componentSkillIds || projectData.componentSkillIds.length === 0) {
        console.warn('Project created without component skills');
      }
      
      const project = await storage.createProject(projectData);
      console.log('Created project:', project);
      res.json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.get('/api/projects', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      
      let projects;
      if (req.user?.role === 'teacher') {
        projects = await storage.getProjectsByTeacher(userId);
      } else if (req.user?.role === 'student') {
        projects = await storage.getProjectsByStudent(userId);
      } else {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get('/api/projects/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  // AI Milestone generation
  app.post('/api/projects/:id/generate-milestones', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      
      if (req.user?.role !== 'teacher' && req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only teachers can generate milestones" });
      }

      console.log('Generate milestones request - Project ID param:', req.params.id);
      const projectId = parseInt(req.params.id);
      console.log('Parsed project ID:', projectId);
      
      if (isNaN(projectId)) {
        console.log('Invalid project ID received:', req.params.id);
        return res.status(400).json({ message: "Invalid project ID" });
      }
      
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const competencies = await storage.getCompetencies();
      const selectedCompetencies = competencies.filter(c => 
        (project.competencyIds as number[])?.includes(c.id)
      );

      const milestones = await generateMilestones(project, selectedCompetencies);
      
      // Save generated milestones to database
      const savedMilestones = await Promise.all(
        milestones.map((milestone, index) => 
          storage.createMilestone({
            projectId,
            title: milestone.title,
            description: milestone.description,
            dueDate: milestone.dueDate ? new Date(milestone.dueDate) : null,
            order: index + 1,
            aiGenerated: true,
          })
        )
      );

      res.json(savedMilestones);
    } catch (error) {
      console.error("Error generating milestones:", error);
      res.status(500).json({ message: "Failed to generate milestones" });
    }
  });

  // Milestone routes
  app.get('/api/projects/:id/milestones', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const milestones = await storage.getMilestonesByProject(projectId);
      res.json(milestones);
    } catch (error) {
      console.error("Error fetching milestones:", error);
      res.status(500).json({ message: "Failed to fetch milestones" });
    }
  });

  app.post('/api/milestones', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      
      if (req.user?.role !== 'teacher' && req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only teachers can create milestones" });
      }

      const milestoneData = insertMilestoneSchema.parse(req.body);
      const milestone = await storage.createMilestone(milestoneData);
      res.json(milestone);
    } catch (error) {
      console.error("Error creating milestone:", error);
      res.status(500).json({ message: "Failed to create milestone" });
    }
  });

  // Assessment routes
  app.post('/api/milestones/:id/generate-assessment', (req, res, next) => {
    console.log('Route hit: generate-assessment for milestone', req.params.id);
    next();
  }, requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      console.log('Assessment generation request received for milestone:', req.params.id);
      const userId = req.user!.id;
      
      if (req.user?.role !== 'teacher' && req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only teachers can generate assessments" });
      }

      const milestoneId = parseInt(req.params.id);
      console.log('Fetching milestone:', milestoneId);
      const milestone = await storage.getMilestone(milestoneId);
      
      if (!milestone) {
        return res.status(404).json({ message: "Milestone not found" });
      }

      const competencies = await storage.getCompetencies();
      const assessmentData = await generateAssessment(milestone, competencies);
      
      const assessment = await storage.createAssessment({
        milestoneId,
        title: assessmentData.title,
        description: assessmentData.description,
        questions: assessmentData.questions,
        aiGenerated: true,
      });

      res.json(assessment);
    } catch (error) {
      console.error("Error generating assessment:", error);
      res.status(500).json({ message: "Failed to generate assessment" });
    }
  });

  app.get('/api/milestones/:id/assessments', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const milestoneId = parseInt(req.params.id);
      const assessments = await storage.getAssessmentsByMilestone(milestoneId);
      res.json(assessments);
    } catch (error) {
      console.error("Error fetching assessments:", error);
      res.status(500).json({ message: "Failed to fetch assessments" });
    }
  });

  // Get standalone assessments
  app.get('/api/assessments/standalone', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const assessments = await storage.getStandaloneAssessments();
      res.json(assessments);
    } catch (error) {
      console.error("Error fetching standalone assessments:", error);
      res.status(500).json({ message: "Failed to fetch standalone assessments" });
    }
  });

  // Get individual assessment by ID
  app.get('/api/assessments/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const assessmentId = parseInt(req.params.id);
      const assessment = await storage.getAssessment(assessmentId);
      
      if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
      }
      
      res.json(assessment);
    } catch (error) {
      console.error("Error fetching assessment:", error);
      res.status(500).json({ message: "Failed to fetch assessment" });
    }
  });

  // Assessment creation route
  app.post('/api/assessments', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      
      if (req.user?.role !== 'teacher' && req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only teachers can create assessments" });
      }

      // Handle date conversion manually
      const { dueDate, ...bodyData } = req.body;
      const assessmentData = insertAssessmentSchema.parse({
        ...bodyData,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      });
      
      const assessment = await storage.createAssessment(assessmentData);
      res.json(assessment);
    } catch (error) {
      console.error("Error creating assessment:", error);
      res.status(500).json({ message: "Failed to create assessment" });
    }
  });

  // Submission routes
  app.post('/api/submissions', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      
      if (req.user?.role !== 'student') {
        return res.status(403).json({ message: "Only students can submit assessments" });
      }

      const submissionData = insertSubmissionSchema.parse({
        ...req.body,
        studentId: userId,
      });

      const submission = await storage.createSubmission(submissionData);
      res.json(submission);
    } catch (error) {
      console.error("Error creating submission:", error);
      res.status(500).json({ message: "Failed to create submission" });
    }
  });

  app.get('/api/submissions/student', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const submissions = await storage.getSubmissionsByStudent(userId);
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      res.status(500).json({ message: "Failed to fetch submissions" });
    }
  });

  app.get('/api/assessments/:id/submissions', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      
      if (req.user?.role !== 'teacher' && req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only teachers can view submissions" });
      }

      const assessmentId = parseInt(req.params.id);
      const submissions = await storage.getSubmissionsByAssessment(assessmentId);
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      res.status(500).json({ message: "Failed to fetch submissions" });
    }
  });

  // Grading routes
  app.post('/api/submissions/:id/grade', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      
      if (req.user?.role !== 'teacher' && req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only teachers can grade submissions" });
      }

      const submissionId = parseInt(req.params.id);
      const { grades: gradeData, feedback } = req.body;

      // Save grades
      const savedGrades = await Promise.all(
        gradeData.map((grade: any) => 
          storage.createGrade({
            submissionId,
            componentSkillId: grade.componentSkillId,
            rubricLevel: grade.rubricLevel,
            score: grade.score,
            feedback: grade.feedback,
            gradedBy: userId,
          })
        )
      );

      // Generate AI feedback if requested
      let aiFeedback = feedback;
      if (req.body.generateAiFeedback) {
        const submission = await storage.getSubmission(submissionId);
        if (submission) {
          aiFeedback = await generateFeedback(submission, savedGrades);
        }
      }

      // Update submission with feedback
      await storage.updateSubmission(submissionId, {
        feedback: aiFeedback,
        gradedAt: new Date(),
        aiGeneratedFeedback: req.body.generateAiFeedback || false,
      });

      res.json({ grades: savedGrades, feedback: aiFeedback });
    } catch (error) {
      console.error("Error grading submission:", error);
      res.status(500).json({ message: "Failed to grade submission" });
    }
  });

  // Credential routes
  app.get('/api/credentials/student', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const credentials = await storage.getCredentialsByStudent(userId);
      res.json(credentials);
    } catch (error) {
      console.error("Error fetching credentials:", error);
      res.status(500).json({ message: "Failed to fetch credentials" });
    }
  });

  app.get('/api/credentials/teacher-stats', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      
      if (req.user?.role !== 'teacher' && req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only teachers can view credential stats" });
      }

      // For now, return a simple count - this would be enhanced to show 
      // credentials awarded by this teacher across their projects
      const credentials = await storage.getCredentialsByStudent(userId); // This would be modified to get teacher stats
      res.json(credentials);
    } catch (error) {
      console.error("Error fetching teacher credential stats:", error);
      res.status(500).json({ message: "Failed to fetch teacher credential stats" });
    }
  });

  app.post('/api/credentials', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      
      if (req.user?.role !== 'teacher' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Only teachers can award credentials" });
      }

      const credentialData = insertCredentialSchema.parse({
        ...req.body,
        approvedBy: userId,
      });

      const credential = await storage.createCredential(credentialData);
      res.json(credential);
    } catch (error) {
      console.error("Error creating credential:", error);
      res.status(500).json({ message: "Failed to create credential" });
    }
  });

  // Portfolio routes
  app.get('/api/portfolio/artifacts', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const artifacts = await storage.getPortfolioArtifactsByStudent(userId);
      res.json(artifacts);
    } catch (error) {
      console.error("Error fetching portfolio artifacts:", error);
      res.status(500).json({ message: "Failed to fetch portfolio artifacts" });
    }
  });

  app.post('/api/portfolio/artifacts', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const artifactData = insertPortfolioArtifactSchema.parse({
        ...req.body,
        studentId: userId,
      });

      const artifact = await storage.createPortfolioArtifact(artifactData);
      res.json(artifact);
    } catch (error) {
      console.error("Error creating portfolio artifact:", error);
      res.status(500).json({ message: "Failed to create portfolio artifact" });
    }
  });

  // Project assignment routes
  app.post('/api/projects/:id/assign', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      
      if (req.user?.role !== 'teacher' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Only teachers can assign projects" });
      }

      const projectId = parseInt(req.params.id);
      const { studentIds } = req.body;

      const assignments = await Promise.all(
        studentIds.map((studentId: string) => 
          storage.assignStudentToProject(projectId, studentId)
        )
      );

      res.json(assignments);
    } catch (error) {
      console.error("Error assigning project:", error);
      res.status(500).json({ message: "Failed to assign project" });
    }
  });

  // Competency routes
  app.get('/api/competencies', async (req, res) => {
    try {
      const competencies = await storage.getCompetencies();
      res.json(competencies);
    } catch (error) {
      console.error("Error fetching competencies:", error);
      res.status(500).json({ message: "Failed to fetch competencies" });
    }
  });

  app.get('/api/competencies/:id/outcomes', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const competencyId = parseInt(req.params.id);
      const outcomes = await storage.getOutcomesByCompetency(competencyId);
      res.json(outcomes);
    } catch (error) {
      console.error("Error fetching outcomes:", error);
      res.status(500).json({ message: "Failed to fetch outcomes" });
    }
  });

  // Get all learner outcomes with their competencies (legacy)
  app.get('/api/learner-outcomes', async (req, res) => {
    try {
      const outcomes = await storage.getAllOutcomesWithCompetencies();
      res.json(outcomes);
    } catch (error) {
      console.error("Error fetching learner outcomes:", error);
      res.status(500).json({ message: "Failed to fetch learner outcomes" });
    }
  });

  // 3-Level Hierarchy Routes
  // Get all learner outcomes
  app.get('/api/learner-outcomes-hierarchy', async (_req, res) => {
    try {
      const learnerOutcomes = await storage.getLearnerOutcomes();
      res.json(learnerOutcomes);
    } catch (error) {
      console.error("Error fetching learner outcomes:", error);
      res.status(500).json({ message: "Failed to fetch learner outcomes" });
    }
  });

  // Get learner outcomes with complete hierarchy
  app.get('/api/learner-outcomes-hierarchy/complete', async (_req, res) => {
    try {
      const learnerOutcomes = await storage.getLearnerOutcomesWithCompetencies();
      res.json(learnerOutcomes);
    } catch (error) {
      console.error("Error fetching learner outcomes with competencies:", error);
      res.status(500).json({ message: "Failed to fetch learner outcomes with competencies" });
    }
  });

  // Get competencies by learner outcome
  app.get('/api/learner-outcomes-hierarchy/:id/competencies', async (req, res) => {
    try {
      const learnerOutcomeId = parseInt(req.params.id);
      const competencies = await storage.getCompetenciesByLearnerOutcome(learnerOutcomeId);
      res.json(competencies);
    } catch (error) {
      console.error("Error fetching competencies by learner outcome:", error);
      res.status(500).json({ message: "Failed to fetch competencies" });
    }
  });

  // Get component skills by competency
  app.get('/api/competencies-hierarchy/:id/component-skills', async (req, res) => {
    try {
      const competencyId = parseInt(req.params.id);
      const componentSkills = await storage.getComponentSkillsByCompetency(competencyId);
      res.json(componentSkills);
    } catch (error) {
      console.error("Error fetching component skills by competency:", error);
      res.status(500).json({ message: "Failed to fetch component skills" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
