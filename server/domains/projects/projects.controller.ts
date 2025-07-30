// Projects Controller - extracted from monolithic routes.ts
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { createInsertSchema } from 'drizzle-zod';
import { projects, milestones } from '../../../shared/schemas';
import { ProjectsService } from './projects.service';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../../auth';
import { generateMilestonesFromComponentSkills, generateProjectIdeas } from '../../openai';

// Create router for project routes
export const projectsRouter = Router();
const projectsService = new ProjectsService();

// Schema for project creation
const insertProjectSchema = createInsertSchema(projects).omit({ 
  id: true, 
  createdAt: true 
});

const insertMilestoneSchema = createInsertSchema(milestones).omit({ 
  id: true, 
  createdAt: true 
});

// POST /api/projects - Create new project
projectsRouter.post('/', requireAuth, requireRole(['teacher', 'admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    if (req.user?.role !== 'teacher' && req.user?.role !== 'admin') {
      return res.status(403).json({ message: "Only teachers can create projects" });
    }

    // Handle date conversion manually
    const { dueDate, ...bodyData } = req.body;

    // Get teacher's school ID
    const teacher = await projectsService.getUser(userId);
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

    const project = await projectsService.createProject(projectData);
    res.json(project);
  } catch (error) {
    console.error("Error creating project:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    res.status(500).json({ 
      message: "Failed to create project", 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

// GET /api/projects - Get projects for current user
projectsRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    let projects;
    if (req.user?.role === 'teacher') {
      projects = await projectsService.getProjectsByTeacher(userId);
    } else if (req.user?.role === 'student') {
      projects = await projectsService.getProjectsByStudent(userId);
    } else {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    res.status(500).json({ 
      message: "Failed to fetch projects", 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

// GET /api/projects/:id - Get specific project
projectsRouter.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);
    const project = await projectsService.getProject(projectId);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.json(project);
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({ message: "Failed to fetch project" });
  }
});

// POST /api/projects/:id/generate-milestones - Generate AI milestones
projectsRouter.post('/:id/generate-milestones', requireAuth, requireRole(['teacher', 'admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);
    const project = await projectsService.getProject(projectId);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Check if user is the teacher of this project
    if (project.teacherId !== req.user!.id) {
      return res.status(403).json({ message: "Only the project teacher can generate milestones" });
    }

    // Get component skills for the project
    const componentSkills = await projectsService.getComponentSkillsByIds(project.componentSkillIds || []);
    
    if (!componentSkills || componentSkills.length === 0) {
      return res.status(400).json({ message: "Project must have component skills to generate milestones" });
    }

    // Generate milestones using AI
    const generatedMilestones = await generateMilestonesFromComponentSkills(
      project.title,
      project.description,
      componentSkills,
      project.dueDate
    );

    // Save generated milestones
    const savedMilestones = [];
    for (const milestone of generatedMilestones) {
      const milestoneData = insertMilestoneSchema.parse({
        ...milestone,
        projectId: projectId,
        dueDate: new Date(milestone.dueDate)
      });
      
      const savedMilestone = await projectsService.createMilestone(milestoneData);
      savedMilestones.push(savedMilestone);
    }

    res.json({
      message: "Milestones generated successfully",
      milestones: savedMilestones
    });

  } catch (error) {
    console.error("Error generating milestones:", error);
    res.status(500).json({ message: "Failed to generate milestones" });
  }
});

// GET /api/projects/:id/milestones - Get project milestones
projectsRouter.get('/:id/milestones', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);
    const milestones = await projectsService.getMilestonesByProject(projectId);
    res.json(milestones);
  } catch (error) {
    console.error("Error fetching milestones:", error);
    res.status(500).json({ message: "Failed to fetch milestones" });
  }
});

// POST /api/projects/:id/assign-students - Assign students to project
projectsRouter.post('/:id/assign-students', requireAuth, requireRole(['teacher', 'admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);
    const { studentIds } = req.body;

    if (!Array.isArray(studentIds)) {
      return res.status(400).json({ message: "studentIds must be an array" });
    }

    const project = await projectsService.getProject(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Check if user is the teacher of this project
    if (project.teacherId !== req.user!.id) {
      return res.status(403).json({ message: "Only the project teacher can assign students" });
    }

    await projectsService.assignStudentsToProject(projectId, studentIds);
    res.json({ message: "Students assigned successfully" });

  } catch (error) {
    console.error("Error assigning students:", error);
    res.status(500).json({ message: "Failed to assign students" });
  }
});

// GET /api/projects/generate-ideas - Generate project ideas
projectsRouter.get('/generate-ideas', requireAuth, requireRole(['teacher', 'admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { componentSkillIds } = req.query;
    
    if (!componentSkillIds) {
      return res.status(400).json({ message: "Component skill IDs are required" });
    }

    const skillIds = Array.isArray(componentSkillIds) 
      ? componentSkillIds.map(id => parseInt(id as string))
      : [parseInt(componentSkillIds as string)];

    const componentSkills = await projectsService.getComponentSkillsByIds(skillIds);
    
    if (!componentSkills || componentSkills.length === 0) {
      return res.status(400).json({ message: "Valid component skills are required" });
    }

    const projectIdeas = await generateProjectIdeas(componentSkills);
    res.json({ projectIdeas });

  } catch (error) {
    console.error("Error generating project ideas:", error);
    res.status(500).json({ message: "Failed to generate project ideas" });
  }
});

export default projectsRouter;