import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
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
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Project routes
  app.post('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'teacher' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Only teachers can create projects" });
      }

      const projectData = insertProjectSchema.parse({
        ...req.body,
        teacherId: userId,
      });

      const project = await storage.createProject(projectData);
      res.json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.get('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      let projects;
      if (user?.role === 'teacher') {
        projects = await storage.getProjectsByTeacher(userId);
      } else if (user?.role === 'student') {
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

  app.get('/api/projects/:id', isAuthenticated, async (req: any, res) => {
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
  app.post('/api/projects/:id/generate-milestones', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'teacher' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Only teachers can generate milestones" });
      }

      const projectId = parseInt(req.params.id);
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
  app.get('/api/projects/:id/milestones', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const milestones = await storage.getMilestonesByProject(projectId);
      res.json(milestones);
    } catch (error) {
      console.error("Error fetching milestones:", error);
      res.status(500).json({ message: "Failed to fetch milestones" });
    }
  });

  app.post('/api/milestones', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'teacher' && user?.role !== 'admin') {
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
  app.post('/api/milestones/:id/generate-assessment', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'teacher' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Only teachers can generate assessments" });
      }

      const milestoneId = parseInt(req.params.id);
      const milestone = await storage.getMilestonesByProject(milestoneId);
      
      if (!milestone) {
        return res.status(404).json({ message: "Milestone not found" });
      }

      const competencies = await storage.getCompetencies();
      const assessmentData = await generateAssessment(milestone[0], competencies);
      
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

  app.get('/api/milestones/:id/assessments', isAuthenticated, async (req: any, res) => {
    try {
      const milestoneId = parseInt(req.params.id);
      const assessments = await storage.getAssessmentsByMilestone(milestoneId);
      res.json(assessments);
    } catch (error) {
      console.error("Error fetching assessments:", error);
      res.status(500).json({ message: "Failed to fetch assessments" });
    }
  });

  // Submission routes
  app.post('/api/submissions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'student') {
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

  app.get('/api/submissions/student', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const submissions = await storage.getSubmissionsByStudent(userId);
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      res.status(500).json({ message: "Failed to fetch submissions" });
    }
  });

  app.get('/api/assessments/:id/submissions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'teacher' && user?.role !== 'admin') {
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
  app.post('/api/submissions/:id/grade', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'teacher' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Only teachers can grade submissions" });
      }

      const submissionId = parseInt(req.params.id);
      const { grades: gradeData, feedback } = req.body;

      // Save grades
      const savedGrades = await Promise.all(
        gradeData.map((grade: any) => 
          storage.createGrade({
            submissionId,
            outcomeId: grade.outcomeId,
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
  app.get('/api/credentials/student', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const credentials = await storage.getCredentialsByStudent(userId);
      res.json(credentials);
    } catch (error) {
      console.error("Error fetching credentials:", error);
      res.status(500).json({ message: "Failed to fetch credentials" });
    }
  });

  app.post('/api/credentials', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'teacher' && user?.role !== 'admin') {
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
  app.get('/api/portfolio/artifacts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const artifacts = await storage.getPortfolioArtifactsByStudent(userId);
      res.json(artifacts);
    } catch (error) {
      console.error("Error fetching portfolio artifacts:", error);
      res.status(500).json({ message: "Failed to fetch portfolio artifacts" });
    }
  });

  app.post('/api/portfolio/artifacts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.post('/api/projects/:id/assign', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'teacher' && user?.role !== 'admin') {
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
  app.get('/api/competencies', isAuthenticated, async (req: any, res) => {
    try {
      const competencies = await storage.getCompetencies();
      res.json(competencies);
    } catch (error) {
      console.error("Error fetching competencies:", error);
      res.status(500).json({ message: "Failed to fetch competencies" });
    }
  });

  app.get('/api/competencies/:id/outcomes', isAuthenticated, async (req: any, res) => {
    try {
      const competencyId = parseInt(req.params.id);
      const outcomes = await storage.getOutcomesByCompetency(competencyId);
      res.json(outcomes);
    } catch (error) {
      console.error("Error fetching outcomes:", error);
      res.status(500).json({ message: "Failed to fetch outcomes" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
