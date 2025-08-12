import { projectsStorage } from './projects.storage';
import type { Project, Milestone, ProjectTeam, User, InsertProject, InsertMilestone } from '../../../shared/schema';
import { generateMilestones, generateMilestonesFromComponentSkills, generateProjectIdeas } from '../../openai';

export class ProjectsService {
  static async createProject(projectData: InsertProject, teacherId: number, schoolId?: number | null): Promise<Project> {
    // Ensure componentSkillIds is properly handled
    if (!projectData.componentSkillIds || projectData.componentSkillIds.length === 0) {
      console.warn('Project created without component skills');
    }

    const projectToCreate = {
      ...projectData,
      teacherId,
      schoolId,
    };

    return await projectsStorage.createProject(projectToCreate);
  }

  static async getProjectsForUser(userId: number, userRole: string): Promise<Project[]> {
    if (userRole === 'teacher') {
      return await projectsStorage.getProjectsByTeacher(userId);
    } else if (userRole === 'student') {
      return await projectsStorage.getProjectsByStudent(userId);
    } else {
      throw new Error('Access denied');
    }
  }

  static async getProject(id: number): Promise<Project | undefined> {
    return await projectsStorage.getProject(id);
  }

  static async updateProject(id: number, updates: Partial<InsertProject>): Promise<Project> {
    return await projectsStorage.updateProject(id, updates);
  }

  static async deleteProject(id: number): Promise<void> {
    await projectsStorage.deleteProject(id);
  }

  static async startProject(projectId: number, userId: number, userRole: string): Promise<void> {
    const project = await projectsStorage.getProject(projectId);

    if (!project) {
      throw new Error('Project not found');
    }

    // Check ownership: admins can start any project, teachers can only start their own
    if (userRole === 'teacher' && project.teacherId !== userId) {
      throw new Error('Access denied - you can only start your own projects');
    }

    // Update project status to active
    await projectsStorage.updateProject(projectId, { status: 'active' });
  }

  static async generateProjectMilestones(
    projectId: number, 
    userId: number, 
    userRole: string,
    competencies: any[]
  ): Promise<Milestone[]> {
    if (userRole !== 'teacher' && userRole !== 'admin') {
      throw new Error('Only teachers can generate milestones');
    }

    const project = await projectsStorage.getProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const selectedCompetencies = competencies.filter(c => 
      (project.componentSkillIds as number[])?.includes(c.id)
    );

    const milestones = await generateMilestones(project, selectedCompetencies);

    // Save generated milestones to database
    const savedMilestones = await Promise.all(
      milestones.map((milestone, index) => 
        projectsStorage.createMilestone({
          projectId,
          title: milestone.title,
          description: milestone.description,
          dueDate: milestone.dueDate ? new Date(milestone.dueDate) : null,
          order: index + 1,
          aiGenerated: true,
        })
      )
    );

    return savedMilestones;
  }

  static async generateMilestonesAndAssessments(
    projectId: number,
    userId: number,
    userRole: string,
    componentSkillDetails: any[],
    bestStandards: any[] = []
  ): Promise<{ milestones: Milestone[], assessments: any[] }> {
    if (userRole !== 'teacher' && userRole !== 'admin') {
      throw new Error('Only teachers can generate milestones and assessments');
    }

    const project = await projectsStorage.getProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Check if user owns this project
    if (userRole === 'teacher' && project.teacherId !== userId) {
      throw new Error('Access denied');
    }

    const selectedComponentSkills = componentSkillDetails.filter(skill => 
      project.componentSkillIds?.includes(skill.id)
    );

    if (!selectedComponentSkills.length) {
      throw new Error('No component skills found for this project');
    }

    // Generate milestones based on component skills and B.E.S.T. standards
    const milestones = await generateMilestonesFromComponentSkills(
      project.title,
      project.description || "",
      project.dueDate?.toISOString().split('T')[0] || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      selectedComponentSkills,
      bestStandards
    );

    // Save generated milestones to database
    const savedMilestones = await Promise.all(
      milestones.map((milestone, index) => 
        projectsStorage.createMilestone({
          projectId,
          title: milestone.title,
          description: milestone.description,
          dueDate: milestone.dueDate ? new Date(milestone.dueDate) : null,
          order: index + 1,
          aiGenerated: true,
        })
      )
    );

    // Note: Assessment creation would be handled by the assessments domain
    // For now, return empty assessments array
    return { milestones: savedMilestones, assessments: [] };
  }

  static async generateProjectIdeas(ideaParams: {
    subject: string;
    topic: string;
    gradeLevel: string;
    duration: string;
    componentSkills: any[];
  }) {
    return await generateProjectIdeas(ideaParams);
  }

  // Milestone operations
  static async getProjectMilestones(projectId: number): Promise<Milestone[]> {
    return await projectsStorage.getMilestonesByProject(projectId);
  }

  static async createMilestone(milestoneData: InsertMilestone): Promise<Milestone> {
    return await projectsStorage.createMilestone(milestoneData);
  }

  static async updateMilestone(id: number, updates: Partial<InsertMilestone>): Promise<Milestone> {
    return await projectsStorage.updateMilestone(id, updates);
  }

  static async deleteMilestone(id: number): Promise<void> {
    await projectsStorage.deleteMilestone(id);
  }

  // Team operations
  static async getProjectTeams(projectId: number): Promise<ProjectTeam[]> {
    return await projectsStorage.getProjectTeams(projectId);
  }

  static async createProjectTeam(teamData: any): Promise<ProjectTeam> {
    return await projectsStorage.createProjectTeam(teamData);
  }

  static async addTeamMember(teamMemberData: any) {
    return await projectsStorage.addTeamMember(teamMemberData);
  }

  static async getTeamMembers(teamId: number) {
    return await projectsStorage.getTeamMembers(teamId);
  }

  static async removeTeamMember(memberId: number): Promise<void> {
    await projectsStorage.removeTeamMember(memberId);
  }

  static async deleteProjectTeam(teamId: number): Promise<void> {
    await projectsStorage.deleteProjectTeam(teamId);
  }

  static async assignStudentsToProject(projectId: number, studentIds: number[]) {
    const assignments = await Promise.all(
      studentIds.map(studentId => 
        projectsStorage.assignStudentToProject(projectId, studentId)
      )
    );
    return assignments;
  }
}