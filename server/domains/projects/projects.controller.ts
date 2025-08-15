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
import { z } from "zod";
import { db } from "../../db";
import { eq, sql } from "drizzle-orm";

const router = Router();

// Project CRUD routes
router.post('/', requireAuth, requireRole('teacher', 'admin'), wrapRoute(async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;

  // Get teacher's school ID
  const teacher = await projectsStorage.getUser(userId);
  const teacherSchoolId = teacher?.schoolId;

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
    const { subject, topic, gradeLevel, duration, componentSkillIds } = req.body;

    if (!subject || !topic || !gradeLevel || !duration || !componentSkillIds?.length) {
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
      studentName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
      student: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email
      }
    })
      .from(projectTeamMembers)
      .innerJoin(users, eq(projectTeamMembers.studentId, users.id))
      .where(eq(projectTeamMembers.teamId, teamId));

    res.json(members);
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

export default router;