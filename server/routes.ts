import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authRouter, requireAuth, requireRole, type AuthenticatedRequest } from "./domains/auth";
import { 
  validateIntParam, 
  sanitizeForPrompt, 
  createErrorResponse,
  csrfProtection,
  aiLimiter
} from "./middleware/security";
import { 
  handleRouteError, 
  handleEntityNotFound, 
  handleAuthorizationError,
  createSuccessResponse,
  wrapRoute
} from "./utils/routeHelpers";
import { validateIdParam } from "./middleware/routeValidation";
import { checkProjectAccess } from "./middleware/resourceAccess";
import { 
  insertProjectSchema, 
  insertMilestoneSchema, 
  insertAssessmentSchema, 
  insertSubmissionSchema,
  insertCredentialSchema,
  insertPortfolioArtifactSchema,
  insertSelfEvaluationSchema,
  type User
} from "@shared/schema";
import { generateMilestones, generateAssessment, generateFeedback, generateFeedbackForQuestion, generateMilestonesFromComponentSkills, generateAssessmentFromComponentSkills, generateProjectIdeas, generateQuestionGrade, generateComponentSkillGrades } from "./openai";
import { generateSelfEvaluationFeedback, generateAssessmentQuestions, generateTutorResponse } from "./services/openai";
import { z } from "zod";
import { 
  users as usersTable, 
  projects as projectsTable, 
  milestones as milestonesTable, 
  assessments as assessmentsTable, 
  submissions as submissionsTable, 
  credentials as credentialsTable, 
  portfolioArtifacts as portfolioArtifactsTable,
  learnerOutcomes as learnerOutcomesTable,
  competencies as competenciesTable,
  projectTeamMembers,
  grades as gradesTable,
  selfEvaluations as selfEvaluationsTable,
  componentSkills as componentSkillsTable,
  bestStandards as bestStandardsTable,
  projectAssignments,
  projects,
  milestones,
  assessments,
  submissions,
  portfolioArtifacts,
  credentials,
  safetyIncidents as safetyIncidentsTable,
  notifications as notificationsTable,
} from "../shared/schema";
import { eq, and, desc, asc, isNull, inArray, ne, sql, gte, or } from "drizzle-orm";
import { db } from "./db";

// Define AuthRequest type if it's not globally available
type AuthRequest = AuthenticatedRequest;

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup auth routes
  app.use('/api/auth', authRouter);

  // Student assessment submissions
  app.get("/api/student/assessment-submissions/:studentId", requireAuth, validateIntParam('studentId'), async (req: AuthRequest, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const { role, id: userId } = req.user;

      // Only allow students to view their own submissions, or teachers/admins
      if (role === 'student' && userId !== studentId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const submissionResults = await db
        .select({
          id: submissions.id,
          assessmentId: submissions.assessmentId,
          assessmentTitle: assessments.title,
          assessmentDescription: assessments.description,
          questions: assessments.questions,
          responses: submissions.responses,
          submittedAt: submissions.submittedAt,
          feedback: submissions.feedback,
          projectTitle: projects.title,
          milestoneTitle: milestones.title,
        })
        .from(submissions)
        .innerJoin(assessments, eq(submissions.assessmentId, assessments.id))
        .leftJoin(milestones, eq(assessments.milestoneId, milestones.id))
        .leftJoin(projects, eq(milestones.projectId, projects.id))
        .where(eq(submissions.studentId, studentId))
        .orderBy(desc(submissions.submittedAt));

      // Get earned credentials for each submission
      const submissionsWithCredentials = await Promise.all(
        submissionResults.map(async (submission) => {
          // Get credentials earned for this specific assessment submission
          // First get grades for this submission to find associated component skills
          const submissionGrades = await db
            .select({
              componentSkillId: gradesTable.componentSkillId,
              gradedAt: gradesTable.gradedAt
            })
            .from(gradesTable)
            .where(eq(gradesTable.submissionId, submission.id));

          // Get credentials earned for component skills that were graded in this submission
          // and awarded around the time of grading (within 1 day)
          const earnedCredentials = [];
          if (submissionGrades.length > 0) {
            // Filter out null componentSkillIds to prevent database query failures
            const componentSkillIds = submissionGrades
              .map(g => g.componentSkillId)
              .filter((id): id is number => id !== null);
            const gradeDate = submissionGrades[0].gradedAt;

            if (gradeDate && componentSkillIds.length > 0) {
              const dayBefore = new Date(gradeDate.getTime() - 24 * 60 * 60 * 1000);
              const dayAfter = new Date(gradeDate.getTime() + 24 * 60 * 60 * 1000);

              const submissionCredentials = await db
                .select({
                  id: credentials.id,
                  title: credentials.title,
                  description: credentials.description,
                  type: credentials.type,
                  awardedAt: credentials.awardedAt,
                })
                .from(credentials)
                .where(and(
                  eq(credentials.studentId, studentId),
                  inArray(credentials.componentSkillId, componentSkillIds),
                  gte(credentials.awardedAt, dayBefore),
                  sql`${credentials.awardedAt} <= ${dayAfter}`
                ));

              earnedCredentials.push(...submissionCredentials);
            }
          }

          // Get grades for this submission
          const grades = await db
            .select()
            .from(gradesTable)
            .where(eq(gradesTable.submissionId, submission.id));

          // Determine if submission is graded (has grades)
          const isGraded = grades.length > 0;

          return {
            ...submission,
            earnedCredentials,
            status: isGraded ? 'graded' : (submission.submittedAt ? 'submitted' : 'draft'),
            questionGrades: grades.reduce((acc: any, grade) => {
              if (grade.componentSkillId !== null) {
                acc[grade.componentSkillId] = {
                  score: grade.score ? parseFloat(grade.score) : 0,
                  rubricLevel: grade.rubricLevel,
                  feedback: grade.feedback
                };
              }
              return acc;
            }, {}),
          };
        })
      );

      res.json(submissionsWithCredentials);
    } catch (error) {
      console.error("Error fetching student assessment submissions:", error);
      res.status(500).json({ error: "Failed to fetch assessment submissions" });
    }
  });

  // Project routes
  app.post('/api/projects', requireAuth, requireRole(['teacher', 'admin']), csrfProtection, wrapRoute(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id;

    // Handle date conversion manually
    const { dueDate, ...bodyData } = req.body;

    // Get teacher's school ID
    const teacher = await storage.getUser(userId);
    const teacherSchoolId = teacher?.schoolId;

    const projectData = insertProjectSchema.parse({
      ...bodyData,
      teacherId: userId,
      schoolId: teacherSchoolId,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    });

    // Ensure componentSkillIds is properly handled
    if (!projectData.componentSkillIds || projectData.componentSkillIds.length === 0) {
      console.warn('Project created without component skills');
    }

    const project = await storage.createProject(projectData);
    createSuccessResponse(res, project);
  }));

  app.get('/api/projects', requireAuth, wrapRoute(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id;

    let projects;
    if (req.user?.role === 'teacher') {
      projects = await storage.getProjectsByTeacher(userId);
    } else if (req.user?.role === 'student') {
      projects = await storage.getProjectsByStudent(userId);
    } else {
      return handleAuthorizationError(res, "Access denied");
    }

    createSuccessResponse(res, projects);
  }));

  app.get('/api/projects/:id', requireAuth, validateIdParam(), checkProjectAccess(), wrapRoute(async (req: AuthenticatedRequest, res) => {
    // Project is already validated and attached by middleware
    const project = (req as any).project;
    createSuccessResponse(res, project);
  }));

  app.put('/api/projects/:id', requireAuth, requireRole(['teacher', 'admin']), validateIdParam(), csrfProtection, checkProjectAccess(), wrapRoute(async (req: AuthenticatedRequest, res) => {
    const projectId = parseInt(req.params.id);
    const updatedProject = await storage.updateProject(projectId, req.body);
    createSuccessResponse(res, updatedProject);
  }));

  app.delete('/api/projects/:id', requireAuth, requireRole(['teacher', 'admin']), validateIdParam(), csrfProtection, checkProjectAccess(), wrapRoute(async (req: AuthenticatedRequest, res) => {
    const projectId = parseInt(req.params.id);
    await storage.deleteProject(projectId);
    createSuccessResponse(res, { message: "Project deleted successfully" });
  }));

  // Start project
  app.post('/api/projects/:id/start', requireAuth, requireRole(['teacher', 'admin']), validateIntParam('id'), csrfProtection, async (req: AuthenticatedRequest, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership: admins can start any project, teachers can only start their own
      if (req.user?.role === 'teacher' && project.teacherId !== req.user.id) {
        return res.status(403).json({ message: "Access denied - you can only start your own projects" });
      }

      // Update project status to active
      await storage.updateProject(projectId, { status: 'active' });
      res.json({ message: "Project started successfully" });
    } catch (error) {
      console.error("Error starting project:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      res.status(500).json({ 
        message: "Failed to start project", 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });

  // AI Milestone generation
  app.post('/api/projects/:id/generate-milestones', requireAuth, validateIntParam('id'), csrfProtection, aiLimiter, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;

      if (req.user?.role !== 'teacher' && req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only teachers can generate milestones" });
      }

      const projectId = parseInt(req.params.id);

      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const project = await storage.getProject(projectId);

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const competencies = await storage.getCompetencies();
      const selectedCompetencies = competencies.filter(c => 
        (project.componentSkillIds as number[])?.includes(c.id)
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
      const errorResponse = createErrorResponse(error, "Failed to generate milestones", 500);
      res.status(500).json(errorResponse);
    }
  });

  // Generate project ideas
  app.post('/api/projects/generate-ideas', requireAuth, requireRole(['teacher', 'admin']), csrfProtection, aiLimiter, async (req: AuthenticatedRequest, res) => {
    try {
      const { subject, topic, gradeLevel, duration, componentSkillIds } = req.body;

      if (!subject || !topic || !gradeLevel || !duration || !componentSkillIds?.length) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Sanitize AI inputs
      const sanitizedSubject = sanitizeForPrompt(subject);
      const sanitizedTopic = sanitizeForPrompt(topic);
      const sanitizedGradeLevel = sanitizeForPrompt(gradeLevel);
      const sanitizedDuration = sanitizeForPrompt(duration);

      // Validate componentSkillIds is an array of numbers
      if (!Array.isArray(componentSkillIds) || !componentSkillIds.every(id => typeof id === 'number')) {
        return res.status(400).json({ message: "Invalid component skill IDs format" });
      }

      // Get component skills details
      const componentSkills = await storage.getComponentSkillsByIds(componentSkillIds);

      if (!componentSkills || componentSkills.length === 0) {
        return res.status(400).json({ message: "No valid component skills found for the provided IDs" });
      }

      const ideas = await generateProjectIdeas({
        subject: sanitizedSubject,
        topic: sanitizedTopic,
        gradeLevel: sanitizedGradeLevel,
        duration: sanitizedDuration,
        componentSkills
      });

      res.json({ ideas });
    } catch (error) {
      console.error("Error generating project ideas:", error);
      const errorResponse = createErrorResponse(error, "Failed to generate project ideas", 500);
      res.status(500).json(errorResponse);
    }
  });

  // AI Milestone and Assessment generation based on component skills
  app.post('/api/projects/:id/generate-milestones-and-assessments', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;

      if (req.user?.role !== 'teacher' && req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only teachers can generate milestones and assessments" });
      }

      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check if user owns this project
      if (req.user?.role === 'teacher' && project.teacherId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get component skills for the project
      const componentSkillDetails = await storage.getComponentSkillsWithDetails();
      const selectedComponentSkills = componentSkillDetails.filter(skill => 
        project.componentSkillIds?.includes(skill.id)
      );

      if (!selectedComponentSkills.length) {
        return res.status(400).json({ message: "No component skills found for this project" });
      }

      // Get B.E.S.T. standards for the project
      let selectedBestStandards: any[] = [];
      // TODO: Re-implement getBestStandards method if needed
      // if (project.bestStandardIds && project.bestStandardIds.length > 0) {
      //   const allBestStandards = await storage.getBestStandards();
      //   selectedBestStandards = allBestStandards.filter(standard => 
      //     project.bestStandardIds?.includes(standard.id)
      //   );
      // }

      // Generate milestones based on component skills and B.E.S.T. standards
      const milestones = await generateMilestonesFromComponentSkills(
        project.title,
        project.description || "",
        project.dueDate?.toISOString().split('T')[0] || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        selectedComponentSkills,
        selectedBestStandards
      );

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

      // Generate assessments for each milestone
      const assessmentsWithMilestones = await Promise.all(
        savedMilestones.map(async (milestone) => {
          try {
            const assessment = await generateAssessmentFromComponentSkills(
              milestone.title,
              milestone.description || "",
              milestone.dueDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
              selectedComponentSkills,
              selectedBestStandards
            );

            const savedAssessment = await storage.createAssessment({
              milestoneId: milestone.id,
              title: assessment.title,
              description: assessment.description,
              questions: assessment.questions,
              dueDate: milestone.dueDate || new Date(),
              componentSkillIds: project.componentSkillIds || [],
              aiGenerated: true,
            });

            return { milestone, assessment: savedAssessment };
          } catch (error) {
            console.error(`Error generating assessment for milestone ${milestone.id}:`, error);
            return { milestone, assessment: null };
          }
        })
      );

      const standardsCount = selectedBestStandards.length;
      const message = standardsCount > 0 
        ? `Generated ${savedMilestones.length} milestones and ${assessmentsWithMilestones.filter(item => item.assessment).length} assessments using ${selectedComponentSkills.length} component skills and ${standardsCount} B.E.S.T. standards`
        : `Generated ${savedMilestones.length} milestones and ${assessmentsWithMilestones.filter(item => item.assessment).length} assessments using ${selectedComponentSkills.length} component skills`;

      res.json({
        milestones: savedMilestones,
        assessments: assessmentsWithMilestones.map(item => item.assessment).filter(Boolean),
        message
      });
    } catch (error) {
      console.error("Error generating milestones and assessments:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      res.status(500).json({ 
        message: "Failed to generate milestones and assessments", 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });

  // Milestone routes
  app.get('/api/projects/:id/milestones', requireAuth, validateIntParam('id'), async (req: AuthenticatedRequest, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const milestones = await storage.getMilestonesByProject(projectId);
      res.json(milestones);
    } catch (error) {
      console.error("Error fetching milestones:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      res.status(500).json({ 
        message: "Failed to fetch milestones", 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });

  app.get('/api/milestones/:id', requireAuth, validateIntParam('id'), async (req: AuthenticatedRequest, res) => {
    try {
      const milestoneId = parseInt(req.params.id);
      const milestone = await storage.getMilestone(milestoneId);

      if (!milestone) {
        return res.status(404).json({ message: "Milestone not found" });
      }

      res.json(milestone);
    } catch (error) {
      console.error("Error fetching milestone:", error);
      res.status(500).json({ message: "Failed to fetch milestone" });
    }
  });

  app.post('/api/milestones', requireAuth, requireRole(['teacher', 'admin']), csrfProtection, wrapRoute(async (req: AuthenticatedRequest, res) => {
    const milestoneData = insertMilestoneSchema.parse(req.body);
    const milestone = await storage.createMilestone(milestoneData);
    createSuccessResponse(res, milestone);
  }));

  app.put('/api/milestones/:id', requireAuth, requireRole(['teacher', 'admin']), validateIdParam(), csrfProtection, wrapRoute(async (req: AuthenticatedRequest, res) => {
    const milestoneId = parseInt(req.params.id);
    const milestone = await storage.getMilestone(milestoneId);

    if (!milestone) {
      return handleEntityNotFound(res, "Milestone");
    }

    const updatedMilestone = await storage.updateMilestone(milestoneId, req.body);
    createSuccessResponse(res, updatedMilestone);
  }));

  app.delete('/api/milestones/:id', requireAuth, requireRole(['teacher', 'admin']), validateIdParam(), csrfProtection, wrapRoute(async (req: AuthenticatedRequest, res) => {
    const milestoneId = parseInt(req.params.id);
    await storage.deleteMilestone(milestoneId);
    createSuccessResponse(res, { message: "Milestone deleted successfully" });
  }));

  // Assessment routes
  app.post('/api/milestones/:id/generate-assessment', requireAuth, requireRole(['teacher', 'admin']), validateIntParam('id'), csrfProtection, aiLimiter, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;

      const milestoneId = parseInt(req.params.id);
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
      const errorResponse = createErrorResponse(error, "Failed to generate assessment", 500);
      res.status(500).json(errorResponse);
    }
  });

  app.get('/api/milestones/:id/assessments', requireAuth, validateIntParam('id'), async (req: AuthenticatedRequest, res) => {
    try {
      const milestoneId = parseInt(req.params.id);
      const assessments = await storage.getAssessmentsByMilestone(milestoneId);
      res.json(assessments);
    } catch (error) {
      console.error("Error fetching assessments:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      res.status(500).json({ 
        message: "Failed to fetch assessments", 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
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

  // Get all assessments (both milestone-linked and standalone)
  app.get("/api/assessments", requireAuth, async (req, res) => {
    try {
      const assessments = await storage.getAllAssessments();
      res.json(assessments);
    } catch (error: any) {
      console.error("Error fetching all assessments:", error);
      res.status(500).json({ message: "Failed to fetch assessments" });
    }
  });

  // Get individual assessment by ID
  app.get('/api/assessments/:id', requireAuth, validateIntParam('id'), async (req: AuthenticatedRequest, res) => {
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
  app.post('/api/assessments', requireAuth, csrfProtection, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;

      if (req.user?.role !== 'teacher' && req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only teachers can create assessments" });
      }

      // Handle date conversion manually
      const { dueDate, ...bodyData } = req.body;

      // Ensure questions have proper IDs
      if (bodyData.questions && Array.isArray(bodyData.questions)) {
        bodyData.questions = bodyData.questions.map((question: any, index: number) => ({
          ...question,
          id: question.id || `q_${Date.now()}_${index}` // Generate ID if missing
        }));
      }

      const assessmentData = insertAssessmentSchema.parse({
        ...bodyData,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      });

      console.log("Creating assessment with questions:", assessmentData.questions);

      // Convert componentSkillIds if it's not a proper array
      if (assessmentData.componentSkillIds && !Array.isArray(assessmentData.componentSkillIds)) {
        assessmentData.componentSkillIds = Array.from(assessmentData.componentSkillIds as Iterable<number>);
      }

      const assessment = await storage.createAssessment(assessmentData);
      res.json(assessment);
    } catch (error) {
      console.error("Error creating assessment:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      res.status(500).json({ 
        message: "Failed to create assessment", 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });

  // Export assessment results
  app.get("/api/assessments/:id/export-results", requireAuth, async (req, res) => {
    try {
      const assessmentId = parseInt(req.params.id);
      const assessment = await db.select().from(assessmentsTable).where(eq(assessmentsTable.id, assessmentId)).limit(1);

      if (!assessment.length) {
        return res.status(404).json({ message: "Assessment not found" });
      }

      // Get submissions for this assessment
      const submissionResults = await db.select({
        id: submissionsTable.id,
        studentName: sql`${usersTable.firstName} || ' ' || ${usersTable.lastName}`,
        studentEmail: usersTable.email,
        submittedAt: submissionsTable.submittedAt,
        feedback: submissionsTable.feedback
      })
      .from(submissionsTable)
      .innerJoin(usersTable, eq(submissionsTable.studentId, usersTable.id))
      .where(eq(submissionsTable.assessmentId, assessmentId));

      // Create CSV content
      const csvData = [
        ['Student Name', 'Email', 'Submitted At', 'Feedback'],
        ...submissionResults.map((sub: any) => [
          sub.studentName,
          sub.studentEmail,
          sub.submittedAt || '',
          (sub.feedback || '').replace(/,/g, ';') // Replace commas to avoid CSV issues
        ])
      ];

      const csv = csvData.map(row => row.join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${assessment[0].title}-results.csv"`);
      res.send(csv);
    } catch (error) {
      console.error('Assessment export error:', error);
      res.status(500).json({ message: "Failed to export assessment results" });
    }
  });

  // Export assessment submissions
  app.get("/api/assessments/:id/export-submissions", requireAuth, async (req, res) => {
    try {
      const assessmentId = parseInt(req.params.id);
      const assessment = await db.select().from(assessmentsTable).where(eq(assessmentsTable.id, assessmentId)).limit(1);

      if (!assessment.length) {
        return res.status(404).json({ message: "Assessment not found" });
      }

      // Get detailed submissions for this assessment
      const detailedSubmissions = await db.select({
        id: submissionsTable.id,
        studentName: sql`${usersTable.firstName} || ' ' || ${usersTable.lastName}`,
        studentEmail: usersTable.email,
        responses: submissionsTable.responses,
        submittedAt: submissionsTable.submittedAt,
        feedback: submissionsTable.feedback
      })
      .from(submissionsTable)
      .innerJoin(usersTable, eq(submissionsTable.studentId, usersTable.id))
      .where(eq(submissionsTable.assessmentId, assessmentId));

      // Create CSV content
      const csvData = [
        ['Student Name', 'Email', 'Responses', 'Submitted At', 'Feedback'],
        ...detailedSubmissions.map((sub: any) => [
          sub.studentName,
          sub.studentEmail,
          JSON.stringify(sub.responses || {}).replace(/,/g, ';'),
          sub.submittedAt || '',
          (sub.feedback || '').replace(/,/g, ';')
        ])
      ];

      const csv = csvData.map(row => row.join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${assessment[0].title}-submissions.csv"`);
      res.send(csv);
    } catch (error) {
      console.error('Submissions export error:', error);
      res.status(500).json({ message: "Failed to export submissions" });
    }
  });

  // Export detailed assessment results
  app.get("/api/assessments/:id/export-detailed-results", requireAuth, async (req, res) => {
    try {
      const assessmentId = parseInt(req.params.id);
      const assessment = await db.select().from(assessmentsTable).where(eq(assessmentsTable.id, assessmentId)).limit(1);

      if (!assessment.length) {
        return res.status(404).json({ message: "Assessment not found" });
      }

      // Get detailed submissions with question breakdown
      const detailedResults = await db.select({
        id: submissionsTable.id,
        studentName: sql`${usersTable.firstName} || ' ' || ${usersTable.lastName}`,
        studentEmail: usersTable.email,
        responses: submissionsTable.responses,
        submittedAt: submissionsTable.submittedAt,
        feedback: submissionsTable.feedback
      })
      .from(submissionsTable)
      .innerJoin(usersTable, eq(submissionsTable.studentId, usersTable.id))
      .where(eq(submissionsTable.assessmentId, assessmentId));

      const questions = (assessment[0].questions as any[]) || [];

      // Create detailed CSV with question breakdown
      const headers = ['Student Name', 'Email', 'Submitted At'];
      questions.forEach((q: any, index: number) => {
        headers.push(`Q${index + 1}: ${(q.text || '').substring(0, 50)}...`);
      });
      headers.push('Feedback');

      const csvData = [headers];

      detailedResults.forEach((sub: any) => {
        const row = [
          sub.studentName,
          sub.studentEmail,
          sub.submittedAt || ''
        ];

        const responses = (sub.responses as any) || {};
        questions.forEach((q: any, index: number) => {
          const response = (responses as any)[index] || '';
          row.push(typeof response === 'string' ? response.replace(/,/g, ';') : JSON.stringify(response));
        });

        row.push((sub.feedback || '').replace(/,/g, ';'));
        csvData.push(row);
      });

      const csv = csvData.map(row => row.join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${assessment[0].title}-detailed-results.csv"`);
      res.send(csv);
    } catch (error) {
      console.error('Detailed export error:', error);
      res.status(500).json({ message: "Failed to export detailed results" });
    }
  });

  // Assessment deletion route
  app.delete('/api/assessments/:id', requireAuth, requireRole(['teacher', 'admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const assessmentId = parseInt(req.params.id);
      await storage.deleteAssessment(assessmentId);
      res.json({ message: "Assessment deleted successfully" });
    } catch (error) {
      console.error("Error deleting assessment:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      res.status(500).json({ 
        message: "Failed to delete assessment", 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });

  // Share code routes for assessments
  app.post('/api/assessments/:id/generate-share-code', requireAuth, requireRole(['teacher', 'admin']), async (req: AuthenticatedRequest, res) =>
{
    try {
      const assessmentId = parseInt(req.params.id);
      const assessment = await storage.getAssessment(assessmentId);

      if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
      }

      // Only teachers can generate share codes for their assessments
      // For now, we'll allow any teacher to generate codes - you might want to add ownership checks later

      const shareCode = await storage.generateShareCode(assessmentId);

      res.json({ 
        shareCode,
        message: "Share code generated successfully"
      });
    } catch (error) {
      console.error("Error generating share code:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      res.status(500).json({ 
        message: "Failed to generate share code", 
        error: errorMessage 
      });
    }
  });

  app.get('/api/assessments/by-code/:code', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const shareCode = req.params.code.toUpperCase();

      if (shareCode.length !== 5) {
        return res.status(400).json({ message: "Invalid share code format" });
      }

      const assessment = await storage.getAssessmentByShareCode(shareCode);

      if (!assessment) {
        return res.status(404).json({ message: "Assessment not found with this code" });
      }

      // Check if the code has expired (if expiration is set)
      if (assessment.shareCodeExpiresAt && new Date() > new Date(assessment.shareCodeExpiresAt)) {
        return res.status(410).json({ message: "This share code has expired" });
      }

      res.json(assessment);
    } catch (error) {
      console.error("Error accessing assessment by code:", error);
      res.status(500).json({ message: "Failed to access assessment" });
    }
  });

  app.post('/api/assessments/:id/regenerate-share-code', requireAuth, requireRole(['teacher', 'admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const assessmentId = parseInt(req.params.id);
      const assessment = await storage.getAssessment(assessmentId);

      if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
      }

      const newShareCode = await storage.regenerateShareCode(assessmentId);

      res.json({ 
        shareCode: newShareCode,
        message: "Share code regenerated successfully"
      });
    } catch (error) {
      console.error("Error regenerating share code:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      res.status(500).json({ 
        message: "Failed to regenerate share code", 
        error: errorMessage 
      });
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
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      res.status(500).json({ 
        message: "Failed to create submission", 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
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

      // Add isLate calculation and ensure proper data format
      const assessment = await storage.getAssessment(assessmentId);

      // Fetch grades for each submission
      const enhancedSubmissions = await Promise.all(
        submissions.map(async (submission) => {
          const grades = await db.select()
            .from(gradesTable)
            .where(eq(gradesTable.submissionId, submission.id));

          console.log(`Submission ${submission.id} has ${grades.length} grades:`, grades);

          return {
            ...submission,
            answers: submission.responses || {},
            grades: grades,
            isLate: assessment?.dueDate ? new Date(submission.submittedAt) > new Date(assessment.dueDate) : false
          };
        })
      );

      res.json(enhancedSubmissions);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      res.status(500).json({ message: "Failed to fetch submissions" });
    }
  });

  app.get('/api/submissions/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const submissionId = parseInt(req.params.id);

      if (isNaN(submissionId)) {
        return res.status(400).json({ message: "Invalid submission ID" });
      }

      const submission = await storage.getSubmission(submissionId);

      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }

      // Only teachers and admins can view submissions, or students viewing their own
      if (req.user?.role !== 'teacher' && req.user?.role !== 'admin') {
        if (submission.studentId !== userId) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      // Get the assessment to calculate isLate
      const assessment = submission.assessmentId ? await storage.getAssessment(submission.assessmentId) : null;

      // Enhance submission with isLate calculation
      const enhancedSubmission = {
        ...submission,
        isLate: assessment?.dueDate && submission.submittedAt ? new Date(submission.submittedAt) > new Date(assessment.dueDate) : false
      };

      res.json(enhancedSubmission);
    } catch (error) {
      console.error("Error fetching submission:", error);
      res.status(500).json({ message: "Failed to fetch submission" });
    }
  });

  // Helper function to award stickers based on rubric levels
  const awardStickers = async (studentId: number, grades: any[]) => {
    const stickerConfigs = {
      emerging: { 
        level: 'Emerging', 
        color: 'red',
        description: 'Emerging proficiency level achieved' 
      },
      developing: { 
        level: 'Developing', 
        color: 'yellow',
        description: 'Developing proficiency level achieved' 
      },
      proficient: { 
        level: 'Proficient', 
        color: 'blue',
        description: 'Proficient level achieved' 
      },
      applying: { 
        level: 'Applying', 
        color: 'green',
        description: 'Applying level achieved' 
      }
    };

    const stickersToAward = [];

    for (const grade of grades) {
      const stickerConfig = stickerConfigs[grade.rubricLevel as keyof typeof stickerConfigs];
      if (stickerConfig) {
        // Check if student already has this sticker for this component skill
        const existingSticker = await db.select()
          .from(credentialsTable)
          .where(and(
            eq(credentialsTable.studentId, studentId),
            eq(credentialsTable.componentSkillId, grade.componentSkillId),
            eq(credentialsTable.type, 'sticker')
          ))
          .limit(1);

        // Only award if they don't already have a sticker for this skill
        if (existingSticker.length === 0) {
          // TODO: Re-implement getComponentSkill method if needed
          const componentSkill = null; // await storage.getComponentSkill(grade.componentSkillId);

          stickersToAward.push({
            studentId: studentId,
            type: 'sticker' as const,
            componentSkillId: grade.componentSkillId,
            title: `${stickerConfig.level} - ${componentSkill?.name || 'Component Skill'}`,
            description: `${stickerConfig.description} for ${componentSkill?.name || 'this component skill'}`,
            iconUrl: stickerConfig.color, // Store the color in iconUrl for now
            approvedBy: grade.gradedBy
          });
        }
      }
    }

    // Award all stickers
    if (stickersToAward.length > 0) {
      await Promise.all(
        stickersToAward.map(sticker => storage.createCredential(sticker))
      );
      console.log(`Awarded ${stickersToAward.length} stickers to student ${studentId}`);
    }

    return stickersToAward;
  };

  // Grading routes
  app.post('/api/submissions/:id/grade', requireAuth, requireRole(['teacher', 'admin']), validateIntParam('id'), csrfProtection, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;

      const submissionId = parseInt(req.params.id);
      const { grades: gradeData, feedback, grade, generateAiFeedback } = req.body;

      console.log("Starting grading for submission " + submissionId + ", generateAiFeedback: " + generateAiFeedback);

      // Save grades - support both detailed component skill grading and simple overall grading
      // Check for existing grades and update them instead of creating duplicates
      let savedGrades: any[] = [];
      if (gradeData && Array.isArray(gradeData)) {
        savedGrades = await Promise.all(
          gradeData.map(async (gradeItem: any) => {
            // Check if grade already exists for this submission and component skill
            const existingGrades = await db.select()
              .from(gradesTable)
              .where(and(
                eq(gradesTable.submissionId, submissionId),
                eq(gradesTable.componentSkillId, gradeItem.componentSkillId)
              ))
              .orderBy(desc(gradesTable.gradedAt))
              .limit(1);

            if (existingGrades.length > 0) {
              // Update existing grade
              const [updatedGrade] = await db.update(gradesTable)
                .set({
                  rubricLevel: gradeItem.rubricLevel,
                  score: gradeItem.score?.toString() || "0",
                  feedback: gradeItem.feedback,
                  gradedBy: userId,
                  gradedAt: new Date()
                })
                .where(eq(gradesTable.id, existingGrades[0].id))
                .returning();
              return updatedGrade;
            } else {
              // Create new grade if none exists
              return storage.createGrade({
                submissionId,
                componentSkillId: gradeItem.componentSkillId,
                rubricLevel: gradeItem.rubricLevel,
                score: gradeItem.score,
                feedback: gradeItem.feedback,
                gradedBy: userId,
              });
            }
          })
        );
      }

      // Get submission and assessment data
      const submission = await storage.getSubmission(submissionId);
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }

      const assessment = await storage.getAssessment(submission.assessmentId!);
      if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
      }

      // Generate AI feedback and grade if requested
      let finalFeedback = feedback;
      let finalGrade = grade;

      if (generateAiFeedback) {
        console.log("Generating AI feedback for submission " + submissionId);

        try {
          // If no component skill grades were provided, generate them using AI
          if (!gradeData || gradeData.length === 0) {
            // Get component skills for this assessment
            const componentSkillIds = (assessment.componentSkillIds as number[]) || [];
            if (componentSkillIds.length > 0) {
              // Fetch component skills with their rubric levels
              const componentSkills = await Promise.all(
                componentSkillIds.map(id => storage.getComponentSkill(id))
              );
              const validSkills = componentSkills.filter(skill => skill !== undefined);

              if (validSkills.length > 0) {
                console.log("Generating component skill grades for " + validSkills.length + " skills");

                // Generate AI-based component skill grades
                const aiSkillGrades = await generateComponentSkillGrades(
                  submission,
                  assessment,
                  validSkills as any[]
                );

                console.log("Successfully generated AI component skill grades:", aiSkillGrades.map(g => 
                  `${g.componentSkillId}: ${g.rubricLevel} (${g.score})`
                ).join(', '));

                // Save the AI-generated component skill grades
                savedGrades = await Promise.all(
                  aiSkillGrades.map(gradeItem => 
                    storage.createGrade({
                      submissionId,
                      componentSkillId: gradeItem.componentSkillId,
                      rubricLevel: gradeItem.rubricLevel,
                      score: gradeItem.score?.toString() || "0",
                      feedback: gradeItem.feedback,
                      gradedBy: userId,
                    })
                  )
                );
              }
            }
          }

          // Generate comprehensive AI feedback based on the component skill grades
          finalFeedback = await generateFeedback(submission, savedGrades);
          console.log("Generated AI feedback: " + (finalFeedback?.substring(0, 100) || "") + "...");

        } catch (aiError) {
          console.error("Error generating AI feedback:", aiError);
          finalFeedback = "AI feedback generation failed. Please provide manual feedback.";
        }
      }

      // Update submission with feedback and grade
      const updateData: any = {
        gradedAt: new Date(),
      };

      if (finalFeedback !== undefined) {
        updateData.feedback = finalFeedback;
      }

      if (finalGrade !== undefined) {
        updateData.grade = finalGrade;
      }

      if (generateAiFeedback) {
        updateData.aiGeneratedFeedback = true;
      }

      console.log("Updating submission " + submissionId + " with grade: " + finalGrade + ", feedback length: " + (finalFeedback?.length || 0));
      const updatedSubmission = await storage.updateSubmission(submissionId, updateData);

      // Award stickers for component skill grades
      let awardedStickers: any[] = [];
      if (savedGrades.length > 0) {
        const submission = await storage.getSubmission(submissionId);
        if (submission) {
          awardedStickers = await awardStickers(submission.studentId, savedGrades);
        }
      }

      res.json({ 
        grades: savedGrades, 
        feedback: finalFeedback,
        submission: updatedSubmission,
        stickersAwarded: awardedStickers
      });
    } catch (error) {
      console.error("Error grading submission:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      res.status(500).json({ 
        message: "Failed to grade submission", 
        error: errorMessage,
        context: "Submission ID: " + req.params.id,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });

  // Get existing grades for a submission
  app.get('/api/submissions/:id/grades', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;

      if (req.user?.role !== 'teacher' && req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only teachers can view grades" });
      }

      const submissionId = parseInt(req.params.id);

      const submission = await storage.getSubmission(submissionId);
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }

      // Get grades for this submission
      const grades = await db.select()
        .from(gradesTable)
        .where(eq(gradesTable.submissionId, submissionId));

      res.json(grades);
    } catch (error) {
      console.error("Error fetching submission grades:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      res.status(500).json({ 
        message: "Failed to fetch submission grades", 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });

  // Generate AI feedback for specific question
  app.post('/api/submissions/:id/generate-question-feedback', requireAuth, validateIntParam('id'), csrfProtection, aiLimiter, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;

      if (req.user?.role !== 'teacher' && req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only teachers can generate AI feedback" });
      }

      const submissionId = parseInt(req.params.id);
      const { questionId, answer, rubricCriteria, sampleAnswer } = req.body;

      // Sanitize AI inputs
      const sanitizedAnswer = sanitizeForPrompt(answer || '');
      const sanitizedRubricCriteria = sanitizeForPrompt(rubricCriteria || '');
      const sanitizedSampleAnswer = sanitizeForPrompt(sampleAnswer || '');

      const submission = await storage.getSubmission(submissionId);
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }

      // Generate AI feedback for specific question/answer with sanitized inputs
      const feedback = await generateFeedbackForQuestion(questionId, sanitizedAnswer, sanitizedRubricCriteria, sanitizedSampleAnswer);

      res.json({ feedback });
    } catch (error) {
      console.error("Error generating AI feedback:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      res.status(500).json({ 
        message: "Failed to generate AI feedback", 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });

  // AI Tutor Chat endpoint
  app.post('/api/ai-tutor/chat', requireAuth, csrfProtection, aiLimiter, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;

      if (req.user?.role !== 'student' && req.user?.role !== 'teacher') {
        return res.status(403).json({ message: "Only students and teachers can use the AI tutor" });
      }

      const { componentSkill, conversationHistory, currentEvaluation, assessmentId } = req.body;

      if (!componentSkill || !conversationHistory) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      console.log("AI Tutor Chat Request:", {
        userId,
        componentSkillName: componentSkill.name,
        messageCount: conversationHistory.length,
        currentLevel: currentEvaluation?.selfAssessedLevel
      });

      // Sanitize conversation history inputs for AI safety
      const sanitizedConversationHistory = conversationHistory.map((msg: any) => ({
        role: msg.role,
        content: sanitizeForPrompt(msg.content || ''),
        timestamp: msg.timestamp,
        studentId: req.user?.role === 'student' ? userId : msg.studentId
      }));

      // Sanitize component skill data
      const sanitizedComponentSkill = {
        id: componentSkill.id,
        name: sanitizeForPrompt(componentSkill.name || ''),
        description: sanitizeForPrompt(componentSkill.description || ''),
        rubricLevels: Array.isArray(componentSkill.rubricLevels) 
          ? componentSkill.rubricLevels.map((level: any) => ({
              level: level.level,
              description: sanitizeForPrompt(level.description || ''),
              criteria: sanitizeForPrompt(level.criteria || '')
            }))
          : []
      };

      // Generate AI tutor response
      const tutorResponse = await generateTutorResponse(
        sanitizedComponentSkill,
        sanitizedConversationHistory,
        currentEvaluation
      );

      // Handle safety flags by creating notifications
      if (tutorResponse.safetyFlag) {
        console.log("SAFETY FLAG RAISED:", {
          userId,
          flag: tutorResponse.safetyFlag,
          componentSkill: componentSkill.name,
          timestamp: new Date().toISOString()
        });

        // Create safety incident and notify teachers
        const studentId = req.user?.role === 'student' ? userId : userId; // For now, assume the user triggering is the student
        const latestMessage = conversationHistory.filter((msg: any) => msg.role === 'student').pop()?.content || '';

        try {
          // Import the notification service
          const { notifyTeacherOfSafetyIncident } = await import('./services/notifications');

          // Map safety flags to incident types
          let incidentType: 'homicidal_ideation' | 'suicidal_ideation' | 'inappropriate_language' | 'homicidal_ideation_fallback' | 'suicidal_ideation_fallback' | 'inappropriate_language_fallback';

          switch (tutorResponse.safetyFlag) {
            case 'homicidal_ideation':
              incidentType = 'homicidal_ideation';
              break;
            case 'suicidal_ideation':
              incidentType = 'suicidal_ideation';
              break;
            case 'inappropriate_language':
              incidentType = 'inappropriate_language';
              break;
            case 'homicidal_ideation_fallback':
              incidentType = 'homicidal_ideation_fallback';
              break;
            case 'suicidal_ideation_fallback':
              incidentType = 'suicidal_ideation_fallback';
              break;
            case 'inappropriate_language_fallback':
              incidentType = 'inappropriate_language_fallback';
              break;
            default:
              incidentType = 'inappropriate_language';
          }

          await notifyTeacherOfSafetyIncident({
            studentId: studentId,
            assessmentId: assessmentId || undefined,
            componentSkillId: componentSkill.id,
            incidentType: incidentType,
            message: latestMessage,
            timestamp: new Date(),
            conversationHistory: enhancedConversationHistory
          });

          console.log("Safety incident notification created successfully");
        } catch (notificationError) {
          console.error("Error creating safety incident notification:", notificationError);
        }
      }

      console.log("AI Tutor Response generated successfully");

      res.json({
        response: tutorResponse.response,
        suggestedEvaluation: tutorResponse.suggestedEvaluation,
        shouldTerminate: tutorResponse.shouldTerminate || false,
        safetyFlag: tutorResponse.safetyFlag
      });
    } catch (error) {
      console.error("Error generating tutor response:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      res.status(500).json({ 
        message: "Failed to generate tutor response", 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });

  // Self-evaluation routes
  app.post('/api/self-evaluations', requireAuth, csrfProtection, aiLimiter, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;

      if (req.user?.role !== 'student') {
        return res.status(403).json({ message: "Only students can submit self-evaluations" });
      }

      const data = insertSelfEvaluationSchema.parse({
        ...req.body,
        studentId: userId,
      });

      // Get component skill details for AI feedback
      const componentSkill = await storage.getComponentSkillsWithDetails().then(skills => 
        skills.find(skill => skill.id === data.componentSkillId)
      );

      if (!componentSkill) {
        return res.status(400).json({ message: "Component skill not found" });
      }

      // Sanitize inputs for AI safety and generate feedback
      const sanitizedJustification = sanitizeForPrompt(data.justification || '');
      const sanitizedExamples = sanitizeForPrompt(data.examples || '');
      
      const aiAnalysis = await generateSelfEvaluationFeedback(
        componentSkill.name,
        componentSkill.rubricLevels,
        data.selfAssessedLevel!,
        sanitizedJustification,
        sanitizedExamples
      );

      // Create self-evaluation with AI feedback
      const selfEvaluation = await storage.createSelfEvaluation({
        ...data,
        aiImprovementFeedback: aiAnalysis.improvementFeedback,
        hasRiskyContent: aiAnalysis.hasRiskyContent,
        teacherNotified: aiAnalysis.hasRiskyContent, // Auto-notify teacher if risky content detected
      });

      res.json({ 
        selfEvaluation,
        aiAnalysis: {
          improvementFeedback: aiAnalysis.improvementFeedback,
          hasRiskyContent: aiAnalysis.hasRiskyContent
        }
      });
    } catch (error) {
      console.error("Error creating self-evaluation:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      res.status(500).json({ 
        message: "Failed to create self-evaluation", 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });

  app.get('/api/self-evaluations/assessment/:assessmentId', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const assessmentId = parseInt(req.params.assessmentId);
      const selfEvaluations = await storage.getSelfEvaluationsByAssessment(assessmentId);

      // Filter based on role
      if (req.user?.role === 'student') {
        // Students can only see their own self-evaluations
        const studentSelfEvaluations = selfEvaluations.filter(se => se.studentId === req.user!.id);
        res.json(studentSelfEvaluations);
      } else {
        // Teachers and admins can see all self-evaluations for the assessment
        res.json(selfEvaluations);
      }
    } catch (error) {
      console.error("Error fetching self-evaluations:", error);
      res.status(500).json({ message: "Failed to fetch self-evaluations" });
    }
  });

  app.get('/api/self-evaluations/student', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;

      if (req.user?.role !== 'student') {
        return res.status(403).json({ message: "Only students can view their self-evaluations" });
      }

      const selfEvaluations = await storage.getSelfEvaluationsByStudent(userId);
      res.json(selfEvaluations);
    } catch (error) {
      console.error("Error fetching student self-evaluations:", error);
      res.status(500).json({ message: "Failed to fetch self-evaluations" });
    }
  });

  app.post('/api/self-evaluations/:id/flag-risky', requireAuth, requireRole(['teacher', 'admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const selfEvaluationId = parseInt(req.params.id);
      await storage.flagRiskySelfEvaluation(selfEvaluationId, true);
      res.json({ message: "Self-evaluation flagged and teacher notified" });
    } catch (error) {
      console.error("Error flagging risky self-evaluation:", error);
      res.status(500).json({ message: "Failed to flag self-evaluation" });
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

      if (req.user?.role !== 'teacher' && req.user?.role !== 'admin') {
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

      if (req.user?.role !== 'teacher' && req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only teachers can assign projects" });
      }

      const projectId = parseInt(req.params.id);
      const { studentIds } = req.body;

      const assignments = await Promise.all(
        studentIds.map((studentId: string) => 
          storage.assignStudentToProject(projectId, parseInt(studentId))
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

  // Get component skills with competency and learner outcome details
  app.get('/api/component-skills/details', requireAuth, async (req, res) => {
    try {
      const componentSkills = await storage.getComponentSkillsWithDetails();

      // Add default rubric levels if they don't exist
      const componentSkillsWithRubrics = componentSkills.map(skill => ({
        ...skill,
        emerging: skill.emerging || 'Beginning to understand and use this skill with significant support',
        developing: skill.developing || 'Building confidence and competency with this skill',
        proficient: skill.proficient || 'Demonstrates solid understanding and effective use of this skill',
        applying: skill.applying || 'Uses this skill in complex situations and helps others develop it'
      }));

      res.json(componentSkillsWithRubrics);
    } catch (error) {
      console.error("Error fetching component skills details:", error);
      res.status(500).json({ error: "Failed to fetch component skills details" });
    }
  });

  app.get('/api/competencies/:id/outcomes', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      // TODO: Re-implement getComponentSkillsByCompetency method if needed
      res.status(501).json({ message: "Feature temporarily unavailable - getComponentSkillsByCompetency method removed" });
    } catch (error) {
      console.error("Error fetching outcomes:", error);
      res.status(500).json({ message: "Failed to fetch outcomes" });
    }
  });

  // B.E.S.T. Standards routes
  app.get('/api/best-standards', async (req, res) => {
    try {
      // TODO: Re-implement B.E.S.T. standards methods if needed
      res.status(501).json({ message: "Feature temporarily unavailable - B.E.S.T. standards methods removed" });
    } catch (error) {
      console.error("Error fetching B.E.S.T. standards:", error);
      res.status(500).json({ message: "Failed to fetch B.E.S.T. standards" });
    }
  });

  // Get unique subjects and grades from B.E.S.T. standards
  app.get('/api/best-standards/metadata', async (req, res) => {
    try {
      // TODO: Re-implement getBestStandards method if needed
      res.status(501).json({ message: "Feature temporarily unavailable - getBestStandards method removed" });
    } catch (error) {
      console.error("Error fetching B.E.S.T. standards metadata:", error);
      res.status(500).json({ message: "Failed to fetch B.E.S.T. standards metadata" });
    }
  });

  // Get all learner outcomes with their competencies (legacy)
  app.get('/api/learner-outcomes', async (req, res) => {
    try {
      const outcomes = await storage.getLearnerOutcomesWithCompetencies();
      res.json(outcomes);
    } catch (error) {
      console.error("Error fetching learner outcomes:", error);
      res.status(500).json({ message: "Failed to fetch learner outcomes" });
    }
  });

  // Notification routes
  app.get('/api/notifications', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;

      const userNotifications = await db.select()
        .from(notificationsTable)
        .where(eq(notificationsTable.userId, userId))
        .orderBy(desc(notificationsTable.createdAt))
        .limit(50);

      res.json(userNotifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.put('/api/notifications/:id/read', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const userId = req.user!.id;

      const notification = await db.select()
        .from(notificationsTable)
        .where(and(
          eq(notificationsTable.id, notificationId),
          eq(notificationsTable.userId, userId)
        ))
        .limit(1);

      if (!notification.length) {
        return res.status(404).json({ message: "Notification not found" });
      }

      await db.update(notificationsTable)
        .set({ 
          read: true, 
          readAt: new Date() 
        })
        .where(eq(notificationsTable.id, notificationId));

      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.put('/api/notifications/mark-all-read', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;

      await db.update(notificationsTable)
        .set({ 
          read: true, 
          readAt: new Date() 
        })
        .where(and(
          eq(notificationsTable.userId, userId),
          eq(notificationsTable.read, false)
        ));

      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  // Safety incident routes
  app.get('/api/safety-incidents', requireAuth, requireRole(['teacher', 'admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;

      let incidents;
      if (req.user?.role === 'admin') {
        // Admins can see all incidents
        incidents = await db.select({
          id: safetyIncidentsTable.id,
          studentName: sql<string>`CONCAT(${usersTable.firstName}, ' ', ${usersTable.lastName})`,
          incidentType: safetyIncidentsTable.incidentType,
          message: safetyIncidentsTable.message,
          severity: safetyIncidentsTable.severity,
          resolved: safetyIncidentsTable.resolved,
          createdAt: safetyIncidentsTable.createdAt
        })
        .from(safetyIncidentsTable)
        .innerJoin(usersTable, eq(safetyIncidentsTable.studentId, usersTable.id))
        .orderBy(desc(safetyIncidentsTable.createdAt));
      } else {
        // Teachers can see incidents from their school
        const teacher = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
        if (!teacher.length || !teacher[0].schoolId) {
          return res.status(400).json({ message: "Teacher school not found" });
        }

        incidents = await db.select({
          id: safetyIncidentsTable.id,
          studentName: sql<string>`CONCAT(${usersTable.firstName}, ' ', ${usersTable.lastName})`,
          incidentType: safetyIncidentsTable.incidentType,
          message: safetyIncidentsTable.message,
          severity: safetyIncidentsTable.severity,
          resolved: safetyIncidentsTable.resolved,
          createdAt: safetyIncidentsTable.createdAt
        })
        .from(safetyIncidentsTable)
        .innerJoin(usersTable, eq(safetyIncidentsTable.studentId, usersTable.id))
        .where(eq(usersTable.schoolId, teacher[0].schoolId!))
        .orderBy(desc(safetyIncidentsTable.createdAt));
      }

      res.json(incidents);
    } catch (error) {
      console.error("Error fetching safety incidents:", error);
      res.status(500).json({ message: "Failed to fetch safety incidents" });
    }
  });

  app.put('/api/safety-incidents/:id/resolve', requireAuth, requireRole(['teacher', 'admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const incidentId = parseInt(req.params.id);
      const userId = req.user!.id;

      await db.update(safetyIncidentsTable)
        .set({ 
          resolved: true, 
          resolvedAt: new Date(),
          resolvedBy: userId
        })
        .where(eq(safetyIncidentsTable.id, incidentId));

      res.json({ message: "Safety incident marked as resolved" });
    } catch (error) {
      console.error("Error resolving safety incident:", error);
      res.status(500).json({ message: "Failed to resolve safety incident" });
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
      // TODO: Re-implement getCompetenciesByLearnerOutcome method if needed
      res.status(501).json({ message: "Feature temporarily unavailable - getCompetenciesByLearnerOutcome method removed" });
    } catch (error) {
      console.error("Error fetching competencies by learner outcome:", error);
      res.status(500).json({ message: "Failed to fetch competencies" });
    }
  });

  // Get component skills by competency
  app.get('/api/competencies-hierarchy/:id/component-skills', async (req, res) => {
    try {
      // TODO: Re-implement getComponentSkillsByCompetency method if needed
      res.status(501).json({ message: "Feature temporarily unavailable - getComponentSkillsByCompetency method removed" });
    } catch (error) {
      console.error("Error fetching component skills by competency:", error);
      res.status(500).json({ message: "Failed to fetch component skills" });
    }
  });

  // Schools routes
  app.get('/api/schools', async (_req, res) => {
    try {
      // TODO: Re-implement getSchools method if needed
      res.status(501).json({ message: "Feature temporarily unavailable - getSchools method removed" });
    } catch (error) {
      console.error("Error fetching schools:", error);
      res.status(500).json({ message: "Failed to fetch schools" });
    }
  });

  // Get students by school (for team selection)
  app.get('/api/schools/:id/students', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const schoolId = parseInt(req.params.id);
      const students = await storage.getStudentsBySchool(schoolId);
      res.json(students);
    } catch (error) {
      console.error("Error fetching students:", error);
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  // Project teams routes
  app.post('/api/project-teams', requireAuth, requireRole(['teacher', 'admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const team = await storage.createProjectTeam(req.body);
      res.json(team);
    } catch (error) {
      console.error("Error creating project team:", error);
      res.status(500).json({ message: "Failed to create project team" });
    }
  });

  app.get('/api/projects/:id/teams', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const teams = await storage.getProjectTeams(projectId);
      res.json(teams);
    } catch (error) {
      console.error("Error fetching project teams:", error);
      res.status(500).json({ message: "Failed to fetch project teams" });
    }
  });

  app.post('/api/project-team-members', requireAuth, requireRole(['teacher', 'admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const member = await storage.addTeamMember(req.body);      res.json(member);
    } catch (error) {
      console.error("Error adding team member:", error);
      res.status(500).json({ message: "Failed to add team member" });
    }
  });

  // Get team members
  app.get('/api/project-teams/:teamId/members', requireAuth, async (req, res) => {
    const teamId = parseInt(req.params.teamId);

    try {
      const members = await db.select({
        id: projectTeamMembers.id,
        teamId: projectTeamMembers.teamId,
        studentId: projectTeamMembers.studentId,
        role: projectTeamMembers.role,
        joinedAt: projectTeamMembers.joinedAt,
        studentName: sql<string>`CONCAT(${usersTable.firstName}, ' ', ${usersTable.lastName})`,
        student: {
          id: usersTable.id,
          firstName: usersTable.firstName,
          lastName: usersTable.lastName,
          email: usersTable.email
        }
      })
        .from(projectTeamMembers)
        .innerJoin(usersTable, eq(projectTeamMembers.studentId, usersTable.id))
        .where(eq(projectTeamMembers.teamId, teamId));

      res.json(members);
    } catch (error) {
      console.error('Error fetching team members:', error);
      res.status(500).json({ message: 'Failed to fetch team members' });
    }
  });

  app.delete('/api/project-team-members/:id', requireAuth, requireRole(['teacher', 'admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const memberId = parseInt(req.params.id);
      await storage.removeTeamMember(memberId);
      res.json({ message: "Team member removed successfully" });
    } catch (error) {
      console.error("Error removing team member:", error);
      res.status(500).json({ message: "Failed to remove team member" });
    }
  });

  app.delete('/api/project-teams/:id', requireAuth, requireRole(['teacher', 'admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const team = await storage.getProjectTeam(teamId);

      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      // Check if user owns the project this team belongs to
      const project = await storage.getProject(team.projectId!);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership: admins can delete any team, teachers can only delete teams from their own projects
      if (req.user?.role === 'teacher' && project.teacherId !== req.user.id) {
        return res.status(403).json({ message: "Access denied - you can only delete teams from your own projects" });
      }

      await storage.deleteProjectTeam(teamId);
      res.json({ message: "Team deleted successfully" });
    } catch (error) {
      console.error("Error deleting team:", error);
      res.status(500).json({ message: "Failed to delete team" });
    }
  });

  // Get users from admin's school for password reset
  app.get("/api/admin/school-users", requireAuth, async (req, res) => {
    try {
      if ((req as AuthenticatedRequest).user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const adminId = (req as AuthenticatedRequest).user!.id;

      // Get admin's school ID
      const admin = await db.select().from(usersTable).where(eq(usersTable.id, adminId)).limit(1);

      if (!admin.length || !admin[0].schoolId) {
        return res.status(400).json({ message: "Admin school not found" });
      }

      const schoolId = admin[0].schoolId;

      // Get all users from the same school (excluding the admin themselves)
      const schoolUsers = await db.select()
      .from(usersTable)
      .where(and(
        eq(usersTable.schoolId, schoolId),
        ne(usersTable.id, adminId)
      ));

      // Format the response to include only the fields we need
      const formattedUsers = schoolUsers.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        // grade: user.grade || null, // Removed since grade doesn't exist on user
        schoolId: user.schoolId
      }));

      res.json(formattedUsers);
    } catch (error) {
      console.error('Error fetching school users:', error);
      res.status(500).json({ message: "Failed to fetch school users" });
    }
  });

  // Analytics endpoint for admin dashboard
  app.get("/api/analytics/dashboard", requireAuth, async (req, res) => {
    try {
      if ((req as AuthenticatedRequest).user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get analytics data
      const [users, projects, assessments, studentCredentials] = await Promise.all([
        db.select().from(usersTable),
        db.select().from(projectsTable),
        db.select().from(assessmentsTable),
        db.select().from(credentialsTable)
      ]);

      const analyticsData = {
        totalUsers: users.length,
        activeUsers: users.filter(u => {
          const oneMonthAgo = new Date();
          oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
          return u.updatedAt ? new Date(u.updatedAt) > oneMonthAgo : false;
        }).length,
        totalProjects: projects.length,
        activeProjects: projects.filter(p => p.status === 'active').length,
        totalAssessments: assessments.length,
        gradedAssessments: assessments.length, // Simplified since totalPoints doesn't exist
        totalCredentials: studentCredentials.length,
        recentActivity: [], // Could be implemented with activity tracking
        userGrowth: [], // Would need historical data
        projectStats: [], // Would need completion tracking
        competencyProgress: [] // Would need progress tracking
      };

      res.json(analyticsData);
    } catch (error) {
      console.error('Analytics error:', error);
      res.status(500).json({ message: "Failed to fetch analytics data" });
    }
  });

  // Teacher dashboard stats
  app.get("/api/teacher/dashboard-stats", requireAuth, async (req, res) => {
    try {
      if ((req as AuthenticatedRequest).user?.role !== 'teacher') {
        return res.status(403).json({ message: "Access denied" });
      }

      const teacherId = (req as AuthenticatedRequest).user!.id;

      // Get teacher's projects and related data
      const teacherProjects = await db.select()
        .from(projectsTable)
        .where(eq(projectsTable.teacherId, teacherId));

      const activeProjects = teacherProjects.filter(p => p.status === 'active').length;

      // Get total students assigned to teacher's projects
      const projectIds = teacherProjects.map(p => p.id);
      const studentAssignments = projectIds.length > 0 ? await db.select()
        .from(projectAssignments)
        .where(inArray(projectAssignments.projectId, projectIds)) : [];

      const totalStudents = new Set(studentAssignments.map(a => a.studentId)).size;

      // Get pending submissions for grading
      const pendingSubmissions = projectIds.length > 0 ? await db.select()
        .from(submissionsTable)
        .innerJoin(assessmentsTable, eq(submissionsTable.assessmentId, assessmentsTable.id))
        .innerJoin(milestonesTable, eq(assessmentsTable.milestoneId, milestonesTable.id))
        .where(and(
          inArray(milestonesTable.projectId, projectIds),
          isNull(submissionsTable.gradedAt)
        )) : [];

      // Get awarded credentials
      const credentialsAwarded = await db.select()
        .from(credentialsTable)
        .where(eq(credentialsTable.approvedBy, teacherId));

      const stats = {
        activeProjects,
        totalStudents,
        pendingGrades: pendingSubmissions.length,
        credentialsAwarded: credentialsAwarded.length,
        upcomingDeadlines: 0 // Would need milestone deadline tracking
      };

      res.json(stats);
    } catch (error) {
      console.error('Teacher dashboard stats error:', error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Teacher projects overview
  app.get("/api/teacher/projects", requireAuth, async (req, res) => {
    try {
      if ((req as AuthenticatedRequest).user?.role !== 'teacher') {
        return res.status(403).json({ message: "Access denied" });
      }

      const teacherId = (req as AuthenticatedRequest).user!.id;

      const teacherProjects = await db.select()
        .from(projectsTable)
        .where(eq(projectsTable.teacherId, teacherId));

      // Get additional data for each project
      const projectOverviews = await Promise.all(
        teacherProjects.map(async (project) => {
          const assignments = await db.select()
            .from(projectAssignments)
            .where(eq(projectAssignments.projectId, project.id));

          const milestonesList = await db.select()
            .from(milestonesTable)
            .where(eq(milestonesTable.projectId, project.id))
            .orderBy(milestonesTable.dueDate);

          const nextDeadline = milestonesList.find(m => m.dueDate && new Date(m.dueDate) > new Date())?.dueDate || null;

          return {
            id: project.id,
            title: project.title,
            description: project.description,
            studentsAssigned: assignments.length,
            completionRate: 0, // Would need submission tracking
            nextDeadline,
            status: project.status
          };
        })
      );

      res.json(projectOverviews);
    } catch (error) {
      console.error('Teacher projects error:', error);
      res.status(500).json({ message: "Failed to fetch teacher projects" });
    }
  });

  // Teacher pending tasks
  app.get("/api/teacher/pending-tasks", requireAuth, async (req, res) => {
    try {
      if ((req as AuthenticatedRequest).user?.role !== 'teacher') {
        return res.status(403).json({ message: "Access denied" });
      }

      const teacherId = (req as AuthenticatedRequest).user!.id;

      // Get pending grading tasks
      const teacherProjects = await db.select()
        .from(projectsTable)
        .where(eq(projectsTable.teacherId, teacherId));

      const projectIds = teacherProjects.map(p => p.id);

      const pendingSubmissions = projectIds.length > 0 ? await db.select({
        submissionId: submissionsTable.id,
        assessmentTitle: assessmentsTable.title,
        projectTitle: projectsTable.title,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        submittedAt: submissionsTable.submittedAt
      })
        .from(submissionsTable)
        .innerJoin(assessmentsTable, eq(submissionsTable.assessmentId, assessmentsTable.id))
        .innerJoin(milestonesTable, eq(assessmentsTable.milestoneId, milestonesTable.id))
        .innerJoin(projectsTable, eq(milestonesTable.projectId, projectsTable.id))
        .innerJoin(usersTable, eq(submissionsTable.studentId, usersTable.id))
        .where(and(
          inArray(milestonesTable.projectId, projectIds),
          isNull(submissionsTable.gradedAt)
        ))
        .limit(10) : [];

      const tasks = pendingSubmissions.map((submission, index) => ({
        id: submission.submissionId,
        type: 'grading' as const,
        title: "Grade " + submission.assessmentTitle,
        description: "Review submission for " + submission.firstName + " " + submission.lastName,
        priority: index < 3 ? 'high' as const : 'medium' as const,
        dueDate: new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000).toISOString(),
        studentName: submission.firstName + " " + submission.lastName,
        projectTitle: submission.projectTitle
      }));

      res.json(tasks);
    } catch (error) {
      console.error('Teacher pending tasks error:', error);
      res.status(500).json({ message: "Failed to fetch pending tasks" });
    }
  });

  // Teacher current milestones
  app.get("/api/teacher/current-milestones", requireAuth, async (req, res) => {
    try {
      if ((req as AuthenticatedRequest).user?.role !== 'teacher') {
        return res.status(403).json({ message: "Access denied" });
      }

      const teacherId = (req as AuthenticatedRequest).user!.id;

      const teacherProjects = await db.select()
        .from(projectsTable)
        .where(eq(projectsTable.teacherId, teacherId));

      const projectIds = teacherProjects.map(p => p.id);

      const currentMilestones = projectIds.length > 0 ? await db.select()
        .from(milestonesTable)
        .where(and(
          inArray(milestonesTable.projectId, projectIds),
          sql`${milestonesTable.dueDate} >= ${new Date().toISOString()}`)
        )
        .orderBy(milestonesTable.dueDate)
        .limit(5) : [];

      const milestonesWithProgress = currentMilestones.map((milestone) => ({
        id: milestone.id,
        title: milestone.title,
        description: milestone.description,
        dueDate: milestone.dueDate,
        status: milestone.dueDate && new Date(milestone.dueDate) > new Date() ? 'not_started' as const : 'in_progress' as const,
        progress: Math.floor(Math.random() * 100) // Would need actual progress tracking
      }));

      res.json(milestonesWithProgress);
    } catch (error) {
      console.error('Teacher current milestones error:', error);
      res.status(500).json({ message: "Failed to fetch current milestones" });
    }
  });

  // Get all students in teacher's school with progress
  app.get("/api/teacher/school-students-progress", requireAuth, async (req, res) => {
    try {
      if ((req as AuthenticatedRequest).user?.role !== 'teacher') {
        return res.status(403).json({ message: "Access denied" });
      }

      const teacher = await db.select().from(usersTable).where(eq(usersTable.id, (req as AuthenticatedRequest).user!.id)).limit(1);
      if (!teacher.length || !teacher[0].schoolId) {
        return res.status(400).json({ message: "Teacher school not found" });
      }

      const schoolId = teacher[0].schoolId;

      // Get all students in the school using the same simple query as the Create Project Team modal
      const students = await storage.getStudentsBySchool(schoolId);

      // Get detailed progress for each student
      const studentsWithProgress = await Promise.all(
        students.map(async (student) => {
          try {
            // Get student's project assignments with project and teacher details
            const studentAssignments = await db.select({
              projectId: projectAssignments.projectId,
              projectTitle: projectsTable.title,
              projectDescription: projectsTable.description,
              projectStatus: projectsTable.status,
              teacherFirstName: usersTable.firstName,
              teacherLastName: usersTable.lastName
            })
              .from(projectAssignments)
              .innerJoin(projectsTable, eq(projectAssignments.projectId, projectsTable.id))
              .innerJoin(usersTable, eq(projectsTable.teacherId, usersTable.id))
              .where(eq(projectAssignments.studentId, student.id));

            const processedAssignments = studentAssignments.map(assignment => ({
              projectId: assignment.projectId,
              projectTitle: assignment.projectTitle,
              projectDescription: assignment.projectDescription,
              projectStatus: assignment.projectStatus,
              teacherName: `${assignment.teacherFirstName} ${assignment.teacherLastName}`
            }));

            console.log(`Student ${student.id} (${student.firstName} ${student.lastName}) has ${studentAssignments.length} project assignments:`, processedAssignments);

            // Get student's credentials
            const studentCredentials = await db.select()
              .from(credentialsTable)
              .where(eq(credentialsTable.studentId, student.id))
              .orderBy(desc(credentialsTable.awardedAt));

            // Get student's submissions and grades for competency progress
            const studentSubmissions = await db.select()
              .from(submissionsTable)
              .where(and(
                eq(submissionsTable.studentId, student.id),
                isNull(submissionsTable.grade) === false
              ));

            // Simplified competency progress calculation
            const competencyAverages = studentSubmissions.map(submission => {
              return {
                competencyId: 1, // Simplified for now
                competencyName: 'General Progress',
                componentSkillId: submission.assessmentId,
                componentSkillName: `Assessment ${submission.assessmentId}`,
                averageScore: submission.grade || 0,
                submissionCount: 1
              };
            });

            return {
              ...student,
              grade: student.grade || 'N/A', // Ensure grade is available
              projects: processedAssignments,
              credentials: studentCredentials.map(cred => ({
                id: cred.id,
                title: cred.title,
                description: cred.description,
                type: cred.type,
                awardedAt: cred.awardedAt
              })),
              competencyProgress: competencyAverages,
              totalCredentials: studentCredentials.length,
              stickers: studentCredentials.filter(c => c.type === 'sticker').length,
              badges: studentCredentials.filter(c => c.type === 'badge').length,
              plaques: studentCredentials.filter(c => c.type === 'plaque').length
            };
          } catch (studentError) {
            console.error(`Error processing student ${student.id}:`, studentError);
            return {
              ...student,
              grade: student.grade || 'N/A',
              projects: [],
              credentials: [],
              competencyProgress: [],
              totalCredentials: 0,
              stickers: 0,
              badges: 0,
              plaques: 0
            };
          }
        })
      );

      res.json(studentsWithProgress);
    } catch (error) {
      console.error('School students progress error:', error);
      res.status(500).json({ message: "Failed to fetch school students progress" });
    }
  });

  // Student upcoming deadlines
  app.get("/api/deadlines/student", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      if (req.user.role !== 'student') {
        return res.status(403).json({ message: "Access denied" });
      }

      const studentId = req.user.id;

      // Get student's assigned projects
      const assignments = await db.select()
        .from(projectAssignments)
        .where(eq(projectAssignments.studentId, studentId));

      const projectIds = assignments.map(a => a.projectId);

      const upcomingDeadlines = projectIds.length > 0
        ? await db.select({
        milestoneId: milestonesTable.id,
        title: milestonesTable.title,
        projectTitle: projectsTable.title,
        dueDate: milestonesTable.dueDate
      })
        .from(milestonesTable)
        .innerJoin(projectsTable, eq(milestonesTable.projectId, projectsTable.id))
        .where(and(
          inArray(milestonesTable.projectId, projectIds),
          gte(milestonesTable.dueDate, new Date()))
        )
        .orderBy(milestonesTable.dueDate)
        .limit(5) : [];

      const deadlines = upcomingDeadlines.map((deadline) => {
        const daysUntil = deadline.dueDate ? Math.ceil((new Date(deadline.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

        return {
          id: deadline.milestoneId,
          title: deadline.title,
          project: deadline.projectTitle,
          dueDate: daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : "In " + daysUntil + " days",
          priority: daysUntil <= 1 ? 'high' as const : daysUntil <= 3 ? 'medium' as const : 'low' as const
        };
      });

      res.json(deadlines);
    } catch (error) {
      console.error('Student deadlines error:', error);
      res.status(500).json({ message: "Failed to fetch student deadlines" });
    }
  });

  // Student competency progress endpoint
  app.get('/api/students/competency-progress', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;

      // Students can only view their own progress
      if (req.user?.role !== 'student' && req.user?.role !== 'teacher' && req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      // For students, get their own progress. For teachers/admins, allow studentId query param
      let studentId = userId;
      if (req.user.role === 'teacher' || req.user.role === 'admin') {
        const queryStudentId = req.query.studentId;
        if (queryStudentId) {
          studentId = parseInt(queryStudentId as string);
        }
      }

      const progress = await storage.getStudentCompetencyProgress(studentId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching competency progress:", error);
      res.status(500).json({ message: "Failed to fetch competency progress" });
    }
  });

  // School-wide component skills performance tracker
  app.get("/api/teacher/school-component-skills-progress", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      if (req.user.role !== 'teacher') {
        return res.status(403).json({ message: "Access denied" });
      }

      const teacher = await db.select().from(usersTable).where(eq(usersTable.id, req.user.id)).limit(1);
      if (!teacher.length || !teacher[0].schoolId) {
        return res.status(400).json({ message: "Teacher school not found" });
      }

      const schoolId = teacher[0].schoolId;

      // Get all students in the school
      const schoolStudents = await storage.getStudentsBySchool(schoolId);
      const studentIds = schoolStudents.map(s => s.id);

      if (studentIds.length === 0) {
        return res.json([]);
      }

      // Use storage method to get component skills with details safely
      const componentSkills = await storage.getComponentSkillsWithDetails();

      if (!componentSkills || componentSkills.length === 0) {
        console.log("No component skills found in database");
        return res.json([]);
      }

      // Debug logging
      console.log('School ID:', schoolId);
      console.log('Student IDs:', studentIds);
      console.log('Valid student IDs count:', studentIds.filter(id => id != null && typeof id === 'number').length);

      // Get grades for students in this school by joining through submissions
      let grades = [];
      try {
        if (studentIds.length === 0) {
          console.log('No students found for school');
          grades = [];
        } else {
          // Build OR conditions for each student ID to avoid inArray issues
          const studentConditions = studentIds.map(id => eq(submissionsTable.studentId, id));
          console.log('Building query for student IDs:', studentIds);

          const gradesWithStudents = await db.select({
            id: gradesTable.id,
            submissionId: gradesTable.submissionId,
            componentSkillId: gradesTable.componentSkillId,
            score: gradesTable.score,
            rubricLevel: gradesTable.rubricLevel,
            feedback: gradesTable.feedback,
            gradedAt: gradesTable.gradedAt,
            studentId: submissionsTable.studentId
          })
          .from(gradesTable)
          .innerJoin(submissionsTable, eq(gradesTable.submissionId, submissionsTable.id))
          .where(or(...studentConditions));

          grades = gradesWithStudents;
        }
        console.log('Total grades found for school students:', grades.length);
        console.log('Sample grades:', grades.slice(0, 3));
      } catch (error) {
        console.error('Error fetching grades:', error);
        grades = [];
      }

      // Calculate performance statistics for each component skill
      const skillsProgress = componentSkills.map(skill => {
        const skillGrades = grades.filter(g => g.componentSkillId === skill.id);

        if (skillGrades.length === 0) {
          return {
            id: skill.id,
            name: skill.name,
            competencyId: skill.competencyId || 0,
            competencyName: skill.competencyName || 'Unknown Competency',
            learnerOutcomeName: skill.learnerOutcomeName || 'Unknown Learner Outcome',
            averageScore: 0,
            studentsAssessed: 0,
            totalStudents: studentIds.length,
            passRate: 0,
            strugglingStudents: 0,
            excellingStudents: 0,
            rubricDistribution: {
              emerging: 0,
              developing: 0,
              proficient: 0,
              applying: 0
            },
            trend: 'stable' as const,
            lastAssessmentDate: null
          };
        }

        // Calculate statistics
        const averageScore = skillGrades.reduce((sum, g) => sum + (g.score || 0), 0) / skillGrades.length;
        const studentsAssessed = new Set(skillGrades.map(g => g.studentId)).size;

        // Count rubric level distribution
        const rubricDistribution = {
          emerging: skillGrades.filter(g => g.rubricLevel === 'emerging').length,
          developing: skillGrades.filter(g => g.rubricLevel === 'developing').length,
          proficient: skillGrades.filter(g => g.rubricLevel === 'proficient').length,
          applying: skillGrades.filter(g => g.rubricLevel === 'applying').length
        };

        const passRate = skillGrades.length > 0 ? ((rubricDistribution.proficient + rubricDistribution.applying) / skillGrades.length) * 100 : 0;
        const strugglingStudents = rubricDistribution.emerging;
        const excellingStudents = rubricDistribution.applying;

        // Simple trend calculation (would need historical data for real trend)
        const trend = averageScore >= 3.0 ? 'improving' : averageScore <= 2.0 ? 'declining' : 'stable';

        // Find most recent assessment
        const lastAssessmentDate = skillGrades.reduce((latest, grade) => {
          const gradeDate = new Date(grade.gradedAt || '');
          return gradeDate > latest ? gradeDate : latest;
        }, new Date(0));

        return {
          id: skill.id,
          name: skill.name,
          competencyId: skill.competencyId || 0,
          competencyName: skill.competencyName || 'Unknown Competency',
          learnerOutcomeName: skill.learnerOutcomeName || 'Unknown Learner Outcome',
          averageScore,
          studentsAssessed,
          totalStudents: studentIds.length,
          passRate,
          strugglingStudents,
          excellingStudents,
          rubricDistribution,
          trend,
          lastAssessmentDate: lastAssessmentDate.getTime() > 0 ? lastAssessmentDate.toISOString() : null
        };
      });

      // Filter out skills with no assessments and sort by most struggling
      const assessedSkills = skillsProgress.filter(skill => skill.studentsAssessed > 0);

      res.json(assessedSkills);
    } catch (error) {
      console.error('School component skills progress error:', error);
      res.status(500).json({ message: "Failed to fetch school component skills progress" });
    }
  });

  // School-wide skills statistics
  app.get("/api/teacher/school-skills-stats", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      if (req.user.role !== 'teacher') {
        return res.status(403).json({ message: "Access denied" });
      }

      const teacher = await db.select().from(usersTable).where(eq(usersTable.id, req.user.id)).limit(1);
      if (!teacher.length || !teacher[0].schoolId) {
        return res.status(400).json({ message: "Teacher school not found" });
      }

      const schoolId = teacher[0].schoolId;

      // Get all students in the school
      const schoolStudents = await storage.getStudentsBySchool(schoolId);
      const studentIds = schoolStudents.map(s => s.id);

      if (studentIds.length === 0) {
        return res.json({
          totalSkillsAssessed: 0,
          averageSchoolScore: 0,
          skillsNeedingAttention: 0,
          excellentPerformance: 0,
          studentsAssessed: 0,
          totalStudents: 0
        });
      }

      // Get all grades and filter in memory for safety
      const allGrades = await db.select().from(gradesTable);

      // Filter grades for students in this school (via submission table)
      const submissionsForSchool = await db.select()
        .from(submissionsTable)
        .where(sql`${submissionsTable.studentId} IN (${studentIds.join(',')})`);
        
      const submissionIds = submissionsForSchool.map(s => s.id);
      const grades = allGrades.filter(grade => submissionIds.includes(grade.submissionId));

      if (grades.length === 0) {
        return res.json({
          totalSkillsAssessed: 0,
          averageSchoolScore: 0,
          skillsNeedingAttention: 0,
          excellentPerformance: 0,
          studentsAssessed: 0,
          totalStudents: studentIds.length
        });
      }

      // Calculate aggregate statistics
      const skillsAssessed = new Set(grades.map(g => g.componentSkillId));
      const studentsAssessed = new Set(submissionsForSchool.map(s => s.studentId));
      const averageSchoolScore = grades.reduce((sum, g) => sum + (g.score ? parseFloat(g.score) : 0), 0) / grades.length;

      // Group by component skill to find struggling and excelling skills
      const skillStats = new Map();
      grades.forEach(grade => {
        const skillId = grade.componentSkillId;
        if (!skillStats.has(skillId)) {
          skillStats.set(skillId, []);
        }
        skillStats.get(skillId).push(grade);
      });

      let skillsNeedingAttention = 0;
      let excellentPerformance = 0;

      skillStats.forEach(skillGrades => {
        const avgScore = skillGrades.reduce((sum: number, g: any) => sum + g.score, 0) / skillGrades.length;
        const strugglingCount = skillGrades.filter((g: any) => g.rubricLevel === 'emerging').length;
        const strugglingPercentage = (strugglingCount / skillGrades.length) * 100;

        if (strugglingPercentage > 30 || avgScore < 2.0) {
          skillsNeedingAttention++;
        }
        if (avgScore >= 3.5) {
          excellentPerformance++;
        }
      });

      res.json({
        totalSkillsAssessed: skillsAssessed.size,
        averageSchoolScore,
        skillsNeedingAttention,
        excellentPerformance,
        studentsAssessed: studentsAssessed.size,
        totalStudents: studentIds.length
      });
    } catch (error) {
      console.error('School skills stats error:', error);
      res.status(500).json({ message: "Failed to fetch school skills statistics" });
    }
  });

  // Add the new endpoint for student assessment submissions
  // Get student's assessment submissions with details
  app.get("/api/student/assessment-submissions/:studentId", requireAuth, async (req: AuthRequest, res) => {
    try {
      const studentId = parseInt(req.params.studentId);

      // Verify the user can access this data (student accessing own data)
      if (req.user.role === 'student' && req.user.id !== studentId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Get all submissions for the student
      const submissionResults = await db
        .select({
          id: submissions.id,
          assessmentId: submissions.assessmentId,
          assessmentTitle: assessments.title,
          assessmentDescription: assessments.description,
          questions: assessments.questions,
          responses: submissions.responses,
          submittedAt: submissions.submittedAt,
          feedback: submissions.feedback,
          projectTitle: projects.title,
          milestoneTitle: milestones.title,
        })
        .from(submissions)
        .innerJoin(assessments, eq(submissions.assessmentId, assessments.id))
        .leftJoin(milestones, eq(assessments.milestoneId, milestones.id))
        .leftJoin(projects, eq(milestones.projectId, projects.id))
        .where(eq(submissions.studentId, studentId))
        .orderBy(desc(submissions.submittedAt));

      // Get earned credentials for each submission
      const submissionsWithCredentials = await Promise.all(
        submissionResults.map(async (submission) => {
          // Get credentials earned for this specific assessment submission
          // First get grades for this submission to find associated component skills
          const submissionGrades = await db
            .select({
              componentSkillId: gradesTable.componentSkillId,
              gradedAt: gradesTable.gradedAt
            })
            .from(gradesTable)
            .where(eq(gradesTable.submissionId, submission.id));

          // Get credentials earned for component skills that were graded in this submission
          // and awarded around the time of grading (within 1 day)
          const earnedCredentials = [];
          if (submissionGrades.length > 0) {
            // Filter out null componentSkillIds to prevent database query failures
            const componentSkillIds = submissionGrades
              .map(g => g.componentSkillId)
              .filter((id): id is number => id !== null);
            const gradeDate = submissionGrades[0].gradedAt;

            if (gradeDate && componentSkillIds.length > 0) {
              const dayBefore = new Date(gradeDate.getTime() - 24 * 60 * 60 * 1000);
              const dayAfter = new Date(gradeDate.getTime() + 24 * 60 * 60 * 1000);

              const submissionCredentials = await db
                .select({
                  id: credentials.id,
                  title: credentials.title,
                  description: credentials.description,
                  type: credentials.type,
                  awardedAt: credentials.awardedAt,
                })
                .from(credentials)
                .where(and(
                  eq(credentials.studentId, studentId),
                  inArray(credentials.componentSkillId, componentSkillIds),
                  gte(credentials.awardedAt, dayBefore),
                  sql`${credentials.awardedAt} <= ${dayAfter}`
                ));

              earnedCredentials.push(...submissionCredentials);
            }
          }

          // Get grades for this submission
          const grades = await db
            .select()
            .from(gradesTable)
            .where(eq(gradesTable.submissionId, submission.id));

          return {
            ...submission,
            earnedCredentials,
            questionGrades: grades.reduce((acc: any, grade) => {
              if (grade.componentSkillId !== null) {
                acc[grade.componentSkillId] = {
                  score: grade.score ? parseFloat(grade.score) : 0,
                  rubricLevel: grade.rubricLevel,
                  feedback: grade.feedback
                };
              }
              return acc;
            }, {}),
          };
        })
      );

      res.json(submissionsWithCredentials);
    } catch (error) {
      console.error("Error fetching student assessment submissions:", error);
      res.status(500).json({ error: "Failed to fetch assessment submissions" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}