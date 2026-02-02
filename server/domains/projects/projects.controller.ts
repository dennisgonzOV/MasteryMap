import { Router } from "express";
import { projectsService } from './projects.service';
import { projectsStorage } from './projects.storage';
import { competencyStorage } from "../competencies/competencies.storage";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../auth";
import { 
  validateIntParam, 
  sanitizeForPrompt, 
  createErrorResponse,
  aiLimiter
} from "../../middleware/security";
import { 
  handleRouteError, 
  handleEntityNotFound, 
  handleAuthorizationError,
  createSuccessResponse,
  wrapRoute
} from "../../utils/routeHelpers";
import { validateIdParam } from "../../middleware/routeValidation";
import { checkProjectAccess } from "../../middleware/resourceAccess";
import { 
  insertProjectSchema, 
  insertMilestoneSchema,
  insertCredentialSchema,
  type User,
  users,
  projectTeamMembers
} from "../../../shared/schema";
import { aiService } from "../ai/ai.service";
import { fluxImageService } from "../ai/flux.service";
import { z } from "zod";
import { db } from "../../db";
import { eq, sql } from "drizzle-orm";

const router = Router();

// Project CRUD routes
router.post('/', requireAuth, requireRole('teacher', 'admin'), wrapRoute(async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;

  // Get teacher's school ID
  const teacher = await projectsStorage.getUser(userId);
  const teacherSchoolId = teacher?.schoolId ?? null;

  const project = await projectsService.createProject(req.body, userId, teacherSchoolId);
  createSuccessResponse(res, project);
}));

router.get('/', requireAuth, wrapRoute(async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const userRole = req.user!.role;

  const projects = await projectsService.getProjectsByUser(userId, userRole);
  createSuccessResponse(res, projects);
}));

router.get('/:id', requireAuth, validateIdParam(), checkProjectAccess({
  allowedRoles: ['teacher', 'admin', 'student'],
  customAccessCheck: (user, project) => {
    // Teachers and admins can access any project they own or any project
    if (user.role === 'teacher') {
      return project.teacherId === user.id;
    }
    if (user.role === 'admin') {
      return true;
    }
    // Students can only access projects they're assigned to
    if (user.role === 'student') {
      // We need to check if the student is assigned to this project
      // This will be handled in the storage layer
      return true; // Allow the request to proceed, storage will validate assignment
    }
    return false;
  }
}), wrapRoute(async (req: AuthenticatedRequest, res) => {
  const project = (req as any).project;
  const userId = req.user!.id;
  const userRole = req.user!.role;

  // For students, verify they're actually assigned to this project
  if (userRole === 'student') {
    const studentProjects = await projectsService.getProjectsByUser(userId, userRole);
    const hasAccess = studentProjects.some(p => p.id === project.id);
    if (!hasAccess) {
      return res.status(403).json({ message: "You don't have access to this project" });
    }
  }

  createSuccessResponse(res, project);
}));

router.put('/:id', requireAuth, requireRole('teacher', 'admin'), validateIdParam(), checkProjectAccess(), wrapRoute(async (req: AuthenticatedRequest, res) => {
  const projectId = parseInt(req.params.id);
  const userId = req.user!.id;
  const userRole = req.user!.role;

  const updatedProject = await projectsService.updateProject(projectId, req.body, userId, userRole);
  createSuccessResponse(res, updatedProject);
}));

router.delete('/:id', requireAuth, requireRole('teacher', 'admin'), validateIdParam(), checkProjectAccess(), wrapRoute(async (req: AuthenticatedRequest, res) => {
  const projectId = parseInt(req.params.id);
  const userId = req.user!.id;
  const userRole = req.user!.role;

  await projectsService.deleteProject(projectId, userId, userRole);
  createSuccessResponse(res, { message: "Project deleted successfully" });
}));

// Project management routes
router.post('/:id/start', requireAuth, requireRole('teacher', 'admin'), validateIdParam('id'), async (req: AuthenticatedRequest, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const project = await projectsService.startProject(projectId, userId, userRole);
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

router.post('/:id/assign', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (userRole !== 'teacher' && userRole !== 'admin') {
      return res.status(403).json({ message: "Only teachers can assign projects" });
    }

    const projectId = parseInt(req.params.id);
    const { studentIds } = req.body;

    await projectsService.assignStudentsToProject(projectId, studentIds, userId, userRole);
    res.json({ message: "Students assigned successfully" });
  } catch (error) {
    console.error("Error assigning project:", error);
    res.status(500).json({ message: "Failed to assign project" });
  }
});

// AI-powered routes
router.post('/generate-ideas', requireAuth, requireRole('teacher', 'admin'), aiLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    console.log('Generate Ideas Request Body:', req.body);
    const { subject, topic, gradeLevel, duration, componentSkillIds } = req.body;

    if (!subject || !topic || !gradeLevel || !duration || !componentSkillIds?.length) {
      console.log('Missing required fields:', { subject, topic, gradeLevel, duration, componentSkillIds });
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Validate componentSkillIds is an array of numbers
    if (!Array.isArray(componentSkillIds) || !componentSkillIds.every(id => typeof id === 'number')) {
      return res.status(400).json({ message: "Invalid component skill IDs format" });
    }

    // Get component skills details
    const componentSkills = await projectsStorage.getComponentSkillsByIds(componentSkillIds);

    if (!componentSkills || componentSkills.length === 0) {
      return res.status(400).json({ message: "No valid component skills found for the provided IDs" });
    }

    const result = await projectsService.generateProjectIdeas({
      subject,
      topic,
      gradeLevel,
      duration,
      componentSkillIds
    });

    res.json(result);
  } catch (error) {
    console.error("Error generating project ideas:", error);
    const errorResponse = createErrorResponse(error, "Failed to generate project ideas", 500);
    res.status(500).json(errorResponse);
  }
});

// Zod schemas for thumbnail endpoints
const thumbnailOptionsSchema = z.object({
  subject: z.string().max(100).optional(),
  topic: z.string().max(200).optional(),
});

const thumbnailPreviewSchema = z.object({
  title: z.string().min(1, "Project title is required").max(200),
  description: z.string().max(2000).optional(),
  subject: z.string().max(100).optional(),
  topic: z.string().max(200).optional(),
});

// Generate thumbnail for a project
router.post('/:id/generate-thumbnail', requireAuth, requireRole('teacher', 'admin'), validateIdParam('id'), aiLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Validate request body
    const parseResult = thumbnailOptionsSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: "Invalid request body", errors: parseResult.error.errors });
    }
    const { subject, topic } = parseResult.data;

    const project = await projectsStorage.getProject(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Check access
    if (userRole === 'teacher' && project.teacherId !== userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Generate thumbnail using FLUX API
    const thumbnailUrl = await fluxImageService.generateThumbnail({
      projectTitle: project.title,
      projectDescription: project.description || "",
      subject,
      topic
    });

    if (!thumbnailUrl) {
      return res.status(500).json({ message: "Failed to generate thumbnail" });
    }

    // Update project with thumbnail URL
    const updatedProject = await projectsStorage.updateProject(projectId, { thumbnailUrl });

    res.json({ thumbnailUrl, project: updatedProject });
  } catch (error) {
    console.error("Error generating thumbnail:", error);
    const errorResponse = createErrorResponse(error, "Failed to generate thumbnail", 500);
    res.status(500).json(errorResponse);
  }
});

// Generate thumbnail during project creation (returns URL without saving)
router.post('/generate-thumbnail-preview', requireAuth, requireRole('teacher', 'admin'), aiLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    // Validate request body
    const parseResult = thumbnailPreviewSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: "Invalid request body", errors: parseResult.error.errors });
    }
    const { title, description, subject, topic } = parseResult.data;

    // Generate thumbnail using FLUX API
    const thumbnailUrl = await fluxImageService.generateThumbnail({
      projectTitle: title,
      projectDescription: description || "",
      subject,
      topic
    });

    if (!thumbnailUrl) {
      return res.status(500).json({ message: "Failed to generate thumbnail" });
    }

    res.json({ thumbnailUrl });
  } catch (error) {
    console.error("Error generating thumbnail preview:", error);
    const errorResponse = createErrorResponse(error, "Failed to generate thumbnail preview", 500);
    res.status(500).json(errorResponse);
  }
});

router.post('/:id/generate-milestones', requireAuth, validateIdParam('id'), aiLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (userRole !== 'teacher' && userRole !== 'admin') {
      return res.status(403).json({ message: "Only teachers can generate milestones" });
    }

    const projectId = parseInt(req.params.id);

    if (isNaN(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    const competencies = await competencyStorage.getCompetencies();
    const savedMilestones = await projectsService.generateMilestonesForProject(projectId, userId, userRole, competencies);

    res.json(savedMilestones);
  } catch (error) {
    console.error("Error generating milestones:", error);
    const errorResponse = createErrorResponse(error, "Failed to generate milestones", 500);
    res.status(500).json(errorResponse);
  }
});

router.post('/:id/generate-milestones-and-assessments', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (userRole !== 'teacher' && userRole !== 'admin') {
      return res.status(403).json({ message: "Only teachers can generate milestones and assessments" });
    }

    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    const componentSkillDetails = await projectsStorage.getComponentSkillsWithDetails();
    const result = await projectsService.generateMilestonesAndAssessmentsForProject(projectId, userId, userRole, componentSkillDetails);

    res.json({
      milestones: result.map((item: any) => item.milestone),
      assessments: result.map((item: any) => item.assessment).filter(Boolean),
      message: `Generated ${result.length} milestones and ${result.filter((item: any) => item.assessment).length} assessments`
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
router.get('/:id/milestones', requireAuth, validateIdParam('id'), async (req: AuthenticatedRequest, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // For students, verify they have access to this project
    if (userRole === 'student') {
      const studentProjects = await projectsService.getProjectsByUser(userId, userRole);
      const hasAccess = studentProjects.some(p => p.id === projectId);
      if (!hasAccess) {
        return res.status(403).json({ message: "You don't have access to this project" });
      }
    }

    const milestones = await projectsService.getMilestonesByProject(projectId);
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

// Get milestone by ID
router.get('/milestones/:id', requireAuth, validateIdParam(), async (req: AuthenticatedRequest, res) => {
  try {
    const milestoneId = parseInt(req.params.id);
    const milestone = await projectsStorage.getMilestone(milestoneId);

    if (!milestone) {
      return res.status(404).json({ message: "Milestone not found" });
    }

    res.json(milestone);
  } catch (error) {
    console.error("Error fetching milestone:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    res.status(500).json({ 
      message: "Failed to fetch milestone", 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});



// Team management routes  
router.post('/:id/teams', requireAuth, requireRole('teacher', 'admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const projectId = parseInt(req.params.id);

    const teamData = { ...req.body, projectId };
    const team = await projectsService.createProjectTeam(teamData, userId, userRole);
    res.json(team);
  } catch (error) {
    console.error("Error creating project team:", error);
    res.status(500).json({ message: "Failed to create project team" });
  }
});

router.get('/:id/teams', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const teams = await projectsService.getProjectTeams(projectId);
    res.json(teams);
  } catch (error) {
    console.error("Error fetching project teams:", error);
    res.status(500).json({ message: "Failed to fetch project teams" });
  }
});

// Additional routes that should be mounted at different paths but related to projects
export const milestonesRouter = Router();

// Test route to verify the router is working
milestonesRouter.get('/test', (req, res) => {
  res.json({ message: "Milestones router is working" });
});

milestonesRouter.get('/:id/assessments', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const milestoneId = parseInt(req.params.id);
    
    // Import the assessment service
    const { assessmentService } = await import('../assessments');
    const assessments = await assessmentService.getAssessmentsByMilestone(milestoneId);
    
    res.json(assessments);
  } catch (error) {
    console.error("Error fetching assessments for milestone:", error);
    res.status(500).json({ message: "Failed to fetch assessments for milestone" });
  }
});

milestonesRouter.get('/:id', requireAuth, validateIdParam('id'), async (req: AuthenticatedRequest, res) => {
  try {
    const milestoneId = parseInt(req.params.id);
    const milestone = await projectsService.getMilestone(milestoneId);

    if (!milestone) {
      return res.status(404).json({ message: "Milestone not found" });
    }

    res.json(milestone);
  } catch (error) {
    console.error("Error fetching milestone:", error);
    res.status(500).json({ message: "Failed to fetch milestone" });
  }
});

milestonesRouter.post('/', requireAuth, requireRole('teacher', 'admin'), wrapRoute(async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const userRole = req.user!.role;

  const milestone = await projectsService.createMilestone(req.body, userId, userRole);
  createSuccessResponse(res, milestone);
}));

milestonesRouter.put('/:id', requireAuth, requireRole('teacher', 'admin'), validateIdParam(), wrapRoute(async (req: AuthenticatedRequest, res) => {
  const milestoneId = parseInt(req.params.id);
  const userId = req.user!.id;
  const userRole = req.user!.role;

  const updatedMilestone = await projectsService.updateMilestone(milestoneId, req.body, userId, userRole);
  createSuccessResponse(res, updatedMilestone);
}));

milestonesRouter.delete('/:id', requireAuth, requireRole('teacher', 'admin'), validateIdParam(), wrapRoute(async (req: AuthenticatedRequest, res) => {
  const milestoneId = parseInt(req.params.id);
  const userId = req.user!.id;
  const userRole = req.user!.role;

  await projectsService.deleteMilestone(milestoneId, userId, userRole);
  createSuccessResponse(res, { message: "Milestone deleted successfully" });
}));

export const projectTeamsRouter = Router();

projectTeamsRouter.post('/', requireAuth, requireRole('teacher', 'admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const team = await projectsService.createProjectTeam(req.body, userId, userRole);
    res.json(team);
  } catch (error) {
    console.error("Error creating project team:", error);
    res.status(500).json({ message: "Failed to create project team" });
  }
});

projectTeamsRouter.delete('/:id', requireAuth, requireRole('teacher', 'admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const teamId = parseInt(req.params.id);
    const userId = req.user!.id;
    const userRole = req.user!.role;

    await projectsService.deleteProjectTeam(teamId, userId, userRole);
    res.json({ message: "Team deleted successfully" });
  } catch (error) {
    console.error("Error deleting team:", error);
    res.status(500).json({ message: "Failed to delete team" });
  }
});

projectTeamsRouter.get('/:teamId/members', requireAuth, async (req, res) => {
  const teamId = parseInt(req.params.teamId);

  try {
    const members = await db.select({
      id: projectTeamMembers.id,
      teamId: projectTeamMembers.teamId,
      studentId: projectTeamMembers.studentId,
      role: projectTeamMembers.role,
      joinedAt: projectTeamMembers.joinedAt,
      studentName: users.username,
      studentUsername: users.username
    })
      .from(projectTeamMembers)
      .innerJoin(users, eq(projectTeamMembers.studentId, users.id))
      .where(eq(projectTeamMembers.teamId, teamId));

    // Transform the result to include the nested student object
    const transformedMembers = members.map(member => ({
      id: member.id,
      teamId: member.teamId,
      studentId: member.studentId,
      role: member.role,
      joinedAt: member.joinedAt,
      studentName: member.studentName,
      student: {
        id: member.studentId,
        username: member.studentUsername
      }
    }));

    res.json(transformedMembers);
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ message: 'Failed to fetch team members' });
  }
});

export const projectTeamMembersRouter = Router();

projectTeamMembersRouter.post('/', requireAuth, requireRole('teacher', 'admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const member = await projectsService.addTeamMember(req.body, userId, userRole);
    res.json(member);
  } catch (error) {
    console.error("Error adding team member:", error);
    res.status(500).json({ message: "Failed to add team member" });
  }
});

projectTeamMembersRouter.delete('/:id', requireAuth, requireRole('teacher', 'admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const memberId = parseInt(req.params.id);
    const userId = req.user!.id;
    const userRole = req.user!.role;

    await projectsService.removeTeamMember(memberId, userId, userRole);
    res.json({ message: "Team member removed successfully" });
  } catch (error) {
    console.error("Error removing team member:", error);
    res.status(500).json({ message: "Failed to remove team member" });
  }
});

export const schoolsRouter = Router();

schoolsRouter.get('/:id/students', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const schoolId = parseInt(req.params.id);
    const students = await projectsService.getStudentsBySchool(schoolId);
    res.json(students);
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ message: "Failed to fetch students" });
  }
});

// Get school students progress for teacher dashboard
schoolsRouter.get('/students-progress', requireAuth, requireRole('teacher', 'admin'), wrapRoute(async (req: AuthenticatedRequest, res) => {
  const teacherId = req.user!.id;
  
  const studentsProgress = await projectsService.getSchoolStudentsProgress(teacherId);
  createSuccessResponse(res, studentsProgress);
}));

// Teacher dashboard routes
const teacherRouter = Router();

// Teacher dashboard stats
teacherRouter.get('/dashboard-stats', requireAuth, requireRole('teacher', 'admin'), wrapRoute(async (req: AuthenticatedRequest, res) => {
  const teacherId = req.user!.id;
  
  const stats = await projectsService.getTeacherDashboardStats(teacherId);
  createSuccessResponse(res, stats);
}));

// Teacher projects overview
teacherRouter.get('/projects', requireAuth, requireRole('teacher', 'admin'), wrapRoute(async (req: AuthenticatedRequest, res) => {
  const teacherId = req.user!.id;
  
  const projects = await projectsService.getTeacherProjects(teacherId);
  createSuccessResponse(res, projects);
}));

// Teacher pending tasks
teacherRouter.get('/pending-tasks', requireAuth, requireRole('teacher', 'admin'), wrapRoute(async (req: AuthenticatedRequest, res) => {
  const teacherId = req.user!.id;
  
  const tasks = await projectsService.getTeacherPendingTasks(teacherId);
  createSuccessResponse(res, tasks);
}));

// Public projects endpoint (no auth required for browsing)
router.get('/public', wrapRoute(async (req, res) => {
  const { search, subjectArea, gradeLevel, estimatedDuration, componentSkillIds, bestStandardIds } = req.query;
  
  const filters: {
    search?: string;
    subjectArea?: string;
    gradeLevel?: string;
    estimatedDuration?: string;
    componentSkillIds?: number[];
    bestStandardIds?: number[];
  } = {};
  
  if (search && typeof search === 'string') filters.search = search;
  if (subjectArea && typeof subjectArea === 'string') filters.subjectArea = subjectArea;
  if (gradeLevel && typeof gradeLevel === 'string') filters.gradeLevel = gradeLevel;
  if (estimatedDuration && typeof estimatedDuration === 'string') filters.estimatedDuration = estimatedDuration;
  
  if (componentSkillIds) {
    const ids = typeof componentSkillIds === 'string' ? componentSkillIds.split(',') : componentSkillIds;
    filters.componentSkillIds = (ids as string[]).map(id => parseInt(id)).filter(id => !isNaN(id));
  }
  
  if (bestStandardIds) {
    const ids = typeof bestStandardIds === 'string' ? bestStandardIds.split(',') : bestStandardIds;
    filters.bestStandardIds = (ids as string[]).map(id => parseInt(id)).filter(id => !isNaN(id));
  }
  
  const publicProjects = await projectsStorage.getPublicProjects(filters);
  createSuccessResponse(res, publicProjects);
}));

// Get public project detail (no auth required)
router.get('/public/:id', wrapRoute(async (req, res) => {
  const projectId = parseInt(req.params.id);
  if (isNaN(projectId)) {
    return res.status(400).json({ message: "Invalid project ID" });
  }
  
  const project = await projectsStorage.getProject(projectId);
  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }
  
  if (!project.isPublic) {
    return res.status(403).json({ message: "This project is not publicly available" });
  }
  
  // Get milestones for the public project
  const projectMilestones = await projectsStorage.getMilestonesByProject(projectId);
  
  // Get component skills if available
  let componentSkills: any[] = [];
  if (project.componentSkillIds && (project.componentSkillIds as number[]).length > 0) {
    componentSkills = await projectsStorage.getComponentSkillsByIds(project.componentSkillIds as number[]);
  }
  
  createSuccessResponse(res, {
    ...project,
    milestones: projectMilestones,
    componentSkills
  });
}));

// Toggle project visibility (teachers only)
router.patch('/:id/visibility', requireAuth, requireRole('teacher', 'admin'), validateIdParam(), checkProjectAccess(), wrapRoute(async (req: AuthenticatedRequest, res) => {
  const projectId = parseInt(req.params.id);
  const { isPublic } = req.body;
  
  if (typeof isPublic !== 'boolean') {
    return res.status(400).json({ message: "isPublic must be a boolean" });
  }
  
  const updatedProject = await projectsStorage.toggleProjectVisibility(projectId, isPublic);
  createSuccessResponse(res, updatedProject);
}));

// Get filter options for public projects
router.get('/public-filters', wrapRoute(async (req, res) => {
  const subjectAreas = ['Math', 'Science', 'English', 'Social Studies', 'Art', 'Music', 'Physical Education', 'Technology', 'Foreign Language', 'Other'];
  const gradeLevels = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  const durations = ['1-2 weeks', '3-4 weeks', '5-6 weeks', '7-8 weeks', '9+ weeks'];
  
  // Get competency frameworks for filtering
  const learnerOutcomes = await competencyStorage.getLearnerOutcomesHierarchy();
  
  createSuccessResponse(res, {
    subjectAreas,
    gradeLevels,
    durations,
    competencyFrameworks: learnerOutcomes
  });
}));

// Teacher current milestones
teacherRouter.get('/current-milestones', requireAuth, requireRole('teacher', 'admin'), wrapRoute(async (req: AuthenticatedRequest, res) => {
  const teacherId = req.user!.id;
  
  const milestones = await projectsService.getTeacherCurrentMilestones(teacherId);
  createSuccessResponse(res, milestones);
}));

export { teacherRouter };
export default router;