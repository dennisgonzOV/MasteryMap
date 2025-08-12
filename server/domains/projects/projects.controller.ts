import { Router } from 'express';
import { ProjectsService } from './projects.service';
import { projectsStorage } from './projects.storage';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../auth';
import { 
  validateIntParam, 
  sanitizeForPrompt, 
  createErrorResponse,
  csrfProtection,
  aiLimiter
} from '../../middleware/security';
import { 
  handleRouteError, 
  handleEntityNotFound, 
  handleAuthorizationError,
  createSuccessResponse,
  wrapRoute
} from '../../utils/routeHelpers';
import { validateIdParam } from '../../middleware/routeValidation';
import { checkProjectAccess } from '../../middleware/resourceAccess';
import { 
  insertProjectSchema, 
  insertMilestoneSchema,
} from '../../../shared/schema';

// We'll need to import these from the main storage for now
// TODO: These should be moved to appropriate domains
import { storage } from '../../storage';

export const createProjectsRouter = () => {
  const router = Router();

  // Project CRUD Operations
  router.post('/', requireAuth, requireRole(['teacher', 'admin']), csrfProtection, wrapRoute(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id;

    // Handle date conversion manually
    const { dueDate, ...bodyData } = req.body;

    // Get teacher's school ID - TODO: This should be moved to auth domain
    const teacher = await storage.getUser(userId);
    const teacherSchoolId = teacher?.schoolId;

    const projectData = insertProjectSchema.parse({
      ...bodyData,
      teacherId: userId,
      schoolId: teacherSchoolId,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    });

    const project = await ProjectsService.createProject(projectData, userId, teacherSchoolId);
    createSuccessResponse(res, project);
  }));

  router.get('/', requireAuth, wrapRoute(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const projects = await ProjectsService.getProjectsForUser(userId, userRole);
    createSuccessResponse(res, projects);
  }));

  router.get('/:id', requireAuth, validateIdParam(), checkProjectAccess(), wrapRoute(async (req: AuthenticatedRequest, res) => {
    // Project is already validated and attached by middleware
    const project = (req as any).project;
    createSuccessResponse(res, project);
  }));

  router.put('/:id', requireAuth, requireRole(['teacher', 'admin']), validateIdParam(), csrfProtection, checkProjectAccess(), wrapRoute(async (req: AuthenticatedRequest, res) => {
    const projectId = parseInt(req.params.id);
    const updatedProject = await ProjectsService.updateProject(projectId, req.body);
    createSuccessResponse(res, updatedProject);
  }));

  router.delete('/:id', requireAuth, requireRole(['teacher', 'admin']), validateIdParam(), csrfProtection, checkProjectAccess(), wrapRoute(async (req: AuthenticatedRequest, res) => {
    const projectId = parseInt(req.params.id);
    await ProjectsService.deleteProject(projectId);
    createSuccessResponse(res, { message: "Project deleted successfully" });
  }));

  router.post('/:id/start', requireAuth, requireRole(['teacher', 'admin']), validateIntParam('id'), csrfProtection, async (req: AuthenticatedRequest, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user!.id;
      const userRole = req.user!.role;

      await ProjectsService.startProject(projectId, userId, userRole);
      res.json({ message: "Project started successfully" });
    } catch (error) {
      console.error("Error starting project:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      
      if (errorMessage === "Project not found") {
        return res.status(404).json({ message: errorMessage });
      }
      if (errorMessage.includes("Access denied")) {
        return res.status(403).json({ message: errorMessage });
      }
      
      res.status(500).json({ 
        message: "Failed to start project", 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });

  // AI-powered project generation
  router.post('/generate-ideas', requireAuth, requireRole(['teacher', 'admin']), csrfProtection, aiLimiter, async (req: AuthenticatedRequest, res) => {
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

      // Get component skills details - TODO: This should be moved to appropriate domain
      const componentSkills = await storage.getComponentSkillsByIds(componentSkillIds);

      if (!componentSkills || componentSkills.length === 0) {
        return res.status(400).json({ message: "No valid component skills found for the provided IDs" });
      }

      const ideas = await ProjectsService.generateProjectIdeas({
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

  // Milestone generation
  router.post('/:id/generate-milestones', requireAuth, validateIntParam('id'), csrfProtection, aiLimiter, async (req: AuthenticatedRequest, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user!.id;
      const userRole = req.user!.role;

      // TODO: Get competencies from appropriate domain
      const competencies = await storage.getCompetencies();
      
      const savedMilestones = await ProjectsService.generateProjectMilestones(projectId, userId, userRole, competencies);
      res.json(savedMilestones);
    } catch (error) {
      console.error("Error generating milestones:", error);
      if (error instanceof Error) {
        if (error.message === "Only teachers can generate milestones") {
          return res.status(403).json({ message: error.message });
        }
        if (error.message === "Project not found") {
          return res.status(404).json({ message: error.message });
        }
      }
      const errorResponse = createErrorResponse(error, "Failed to generate milestones", 500);
      res.status(500).json(errorResponse);
    }
  });

  router.post('/:id/generate-milestones-and-assessments', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user!.id;
      const userRole = req.user!.role;

      // TODO: Get component skill details from appropriate domain
      const componentSkillDetails = await storage.getComponentSkillsWithDetails();
      
      const result = await ProjectsService.generateMilestonesAndAssessments(
        projectId,
        userId,
        userRole,
        componentSkillDetails
      );

      res.json(result);
    } catch (error) {
      console.error("Error generating milestones and assessments:", error);
      if (error instanceof Error) {
        if (error.message.includes("Only teachers")) {
          return res.status(403).json({ message: error.message });
        }
        if (error.message === "Project not found") {
          return res.status(404).json({ message: error.message });
        }
        if (error.message === "Access denied") {
          return res.status(403).json({ message: error.message });
        }
        if (error.message.includes("No component skills found")) {
          return res.status(400).json({ message: error.message });
        }
      }
      const errorResponse = createErrorResponse(error, "Failed to generate milestones and assessments", 500);
      res.status(500).json(errorResponse);
    }
  });

  // Milestone operations
  router.get('/:id/milestones', requireAuth, validateIntParam('id'), async (req: AuthenticatedRequest, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const milestones = await ProjectsService.getProjectMilestones(projectId);
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

  // Team operations
  router.get('/:id/teams', requireAuth, validateIntParam('id'), async (req: AuthenticatedRequest, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const teams = await ProjectsService.getProjectTeams(projectId);
      res.json(teams);
    } catch (error) {
      console.error("Error fetching project teams:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      res.status(500).json({ 
        message: "Failed to fetch project teams", 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });

  // Student assignment
  router.post('/:id/assign', requireAuth, requireRole(['teacher', 'admin']), validateIntParam('id'), csrfProtection, async (req: AuthenticatedRequest, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { studentIds } = req.body;

      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({ message: "Student IDs are required" });
      }

      const assignments = await ProjectsService.assignStudentsToProject(projectId, studentIds);
      res.json(assignments);
    } catch (error) {
      console.error("Error assigning students to project:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      res.status(500).json({ 
        message: "Failed to assign students to project", 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });

  return router;
};

// Milestone routes (separate from projects for cleaner organization)
export const createMilestonesRouter = () => {
  const router = Router();

  router.post('/', requireAuth, requireRole(['teacher', 'admin']), csrfProtection, wrapRoute(async (req: AuthenticatedRequest, res) => {
    const milestoneData = insertMilestoneSchema.parse(req.body);
    const milestone = await ProjectsService.createMilestone(milestoneData);
    createSuccessResponse(res, milestone);
  }));

  router.put('/:id', requireAuth, requireRole(['teacher', 'admin']), validateIdParam(), csrfProtection, wrapRoute(async (req: AuthenticatedRequest, res) => {
    const milestoneId = parseInt(req.params.id);
    const updatedMilestone = await ProjectsService.updateMilestone(milestoneId, req.body);
    createSuccessResponse(res, updatedMilestone);
  }));

  router.delete('/:id', requireAuth, requireRole(['teacher', 'admin']), validateIdParam(), csrfProtection, wrapRoute(async (req: AuthenticatedRequest, res) => {
    const milestoneId = parseInt(req.params.id);
    await ProjectsService.deleteMilestone(milestoneId);
    createSuccessResponse(res, { message: "Milestone deleted successfully" });
  }));

  return router;
};

// Team routes
export const createProjectTeamsRouter = () => {
  const router = Router();

  router.post('/', requireAuth, requireRole(['teacher', 'admin']), csrfProtection, async (req: AuthenticatedRequest, res) => {
    try {
      const team = await ProjectsService.createProjectTeam(req.body);
      res.status(201).json(team);
    } catch (error) {
      console.error("Error creating project team:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      res.status(500).json({ 
        message: "Failed to create project team", 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });

  router.delete('/:id', requireAuth, requireRole(['teacher', 'admin']), validateIntParam('id'), csrfProtection, async (req: AuthenticatedRequest, res) => {
    try {
      const teamId = parseInt(req.params.id);
      await ProjectsService.deleteProjectTeam(teamId);
      res.json({ message: "Project team deleted successfully" });
    } catch (error) {
      console.error("Error deleting project team:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      res.status(500).json({ 
        message: "Failed to delete project team", 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });

  router.get('/:teamId/members', requireAuth, validateIntParam('teamId'), async (req: AuthenticatedRequest, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const members = await ProjectsService.getTeamMembers(teamId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching team members:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      res.status(500).json({ 
        message: "Failed to fetch team members", 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });

  return router;
};

// Team member routes
export const createProjectTeamMembersRouter = () => {
  const router = Router();

  router.post('/', requireAuth, requireRole(['teacher', 'admin']), csrfProtection, async (req: AuthenticatedRequest, res) => {
    try {
      const member = await ProjectsService.addTeamMember(req.body);
      res.status(201).json(member);
    } catch (error) {
      console.error("Error adding team member:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      res.status(500).json({ 
        message: "Failed to add team member", 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });

  router.delete('/:id', requireAuth, requireRole(['teacher', 'admin']), validateIntParam('id'), csrfProtection, async (req: AuthenticatedRequest, res) => {
    try {
      const memberId = parseInt(req.params.id);
      await ProjectsService.removeTeamMember(memberId);
      res.json({ message: "Team member removed successfully" });
    } catch (error) {
      console.error("Error removing team member:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      res.status(500).json({ 
        message: "Failed to remove team member", 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });

  return router;
};

// Export the configured routers
export const projectsRouter = createProjectsRouter();
export const milestonesRouter = createMilestonesRouter();
export const projectTeamsRouter = createProjectTeamsRouter();
export const projectTeamMembersRouter = createProjectTeamMembersRouter();