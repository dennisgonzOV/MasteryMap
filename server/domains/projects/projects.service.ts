import { projectsStorage, type IProjectsStorage } from './projects.storage';
import { 
  insertProjectSchema, 
  insertMilestoneSchema,
  type User,
  type Project,
  type Milestone,
  type ProjectTeam,
  type ProjectTeamMember,
  type InsertProject,
  type InsertMilestone,
  type InsertProjectTeam
} from "../../../shared/schema";
import { aiService } from "../ai/ai.service";
import { sanitizeForPrompt } from "../../middleware/security";

export class ProjectsService {
  constructor(private storage: IProjectsStorage = projectsStorage) {}

  // Project operations
  async createProject(projectData: any, teacherId: number, teacherSchoolId: number | null): Promise<Project> {
    const { dueDate, ...bodyData } = projectData;
    
    const validatedProject = insertProjectSchema.parse({
      ...bodyData,
      teacherId,
      schoolId: teacherSchoolId,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    });

    // Ensure componentSkillIds is properly handled
    if (!validatedProject.componentSkillIds || validatedProject.componentSkillIds.length === 0) {
      console.warn('Project created without component skills');
    }

    return this.storage.createProject(validatedProject);
  }

  async getProject(id: number): Promise<Project | undefined> {
    return this.storage.getProject(id);
  }

  async getProjectsByUser(userId: number, userRole: string): Promise<Project[]> {
    if (userRole === 'teacher') {
      return this.storage.getProjectsByTeacher(userId);
    } else if (userRole === 'student') {
      return this.storage.getProjectsByStudent(userId);
    } else {
      throw new Error("Access denied");
    }
  }

  async updateProject(id: number, updates: Partial<InsertProject>, userId: number, userRole: string): Promise<Project> {
    const project = await this.storage.getProject(id);
    if (!project) {
      throw new Error("Project not found");
    }

    // Check if user owns this project
    if (userRole === 'teacher' && project.teacherId !== userId) {
      throw new Error("Access denied");
    }

    return this.storage.updateProject(id, updates);
  }

  async deleteProject(id: number, userId: number, userRole: string): Promise<void> {
    const project = await this.storage.getProject(id);
    if (!project) {
      throw new Error("Project not found");
    }

    // Check if user owns this project
    if (userRole === 'teacher' && project.teacherId !== userId) {
      throw new Error("Access denied");
    }

    return this.storage.deleteProject(id);
  }

  async startProject(id: number, userId: number, userRole: string): Promise<Project> {
    const project = await this.storage.getProject(id);
    if (!project) {
      throw new Error("Project not found");
    }

    // Check if user owns this project
    if (userRole === 'teacher' && project.teacherId !== userId) {
      throw new Error("Access denied");
    }

    return this.storage.updateProject(id, { status: 'active' });
  }

  async assignStudentsToProject(projectId: number, studentIds: number[], userId: number, userRole: string): Promise<void> {
    const project = await this.storage.getProject(projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    // Check if user owns this project
    if (userRole === 'teacher' && project.teacherId !== userId) {
      throw new Error("Access denied");
    }

    // Assign each student to the project
    await Promise.all(
      studentIds.map(studentId =>
        this.storage.assignStudentToProject(projectId, studentId)
      )
    );
  }

  // Milestone operations
  async createMilestone(milestoneData: any, userId: number, userRole: string): Promise<Milestone> {
    const validatedMilestone = insertMilestoneSchema.parse(milestoneData);
    
    // Check if user owns the project this milestone belongs to
    if (!validatedMilestone.projectId) {
      throw new Error("Project ID is required");
    }
    const project = await this.storage.getProject(validatedMilestone.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    if (userRole === 'teacher' && project.teacherId !== userId) {
      throw new Error("Access denied");
    }

    return this.storage.createMilestone(validatedMilestone);
  }

  async getMilestone(id: number): Promise<Milestone | undefined> {
    return this.storage.getMilestone(id);
  }

  async getMilestonesByProject(projectId: number): Promise<Milestone[]> {
    return this.storage.getMilestonesByProject(projectId);
  }

  async updateMilestone(id: number, updates: Partial<InsertMilestone>, userId: number, userRole: string): Promise<Milestone> {
    const milestone = await this.storage.getMilestone(id);
    if (!milestone) {
      throw new Error("Milestone not found");
    }

    // Check if user owns the project this milestone belongs to
    if (!milestone.projectId) {
      throw new Error("Milestone project ID is invalid");
    }
    const project = await this.storage.getProject(milestone.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    if (userRole === 'teacher' && project.teacherId !== userId) {
      throw new Error("Access denied");
    }

    return this.storage.updateMilestone(id, updates);
  }

  async deleteMilestone(id: number, userId: number, userRole: string): Promise<void> {
    const milestone = await this.storage.getMilestone(id);
    if (!milestone) {
      throw new Error("Milestone not found");
    }

    // Check if user owns the project this milestone belongs to
    if (!milestone.projectId) {
      throw new Error("Milestone project ID is invalid");
    }
    const project = await this.storage.getProject(milestone.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    if (userRole === 'teacher' && project.teacherId !== userId) {
      throw new Error("Access denied");
    }

    return this.storage.deleteMilestone(id);
  }

  // Team operations
  async createProjectTeam(teamData: InsertProjectTeam, userId: number, userRole: string): Promise<ProjectTeam> {
    // Check if user owns the project this team belongs to
    if (!teamData.projectId) {
      throw new Error("Project ID is required");
    }
    const project = await this.storage.getProject(teamData.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    if (userRole === 'teacher' && project.teacherId !== userId) {
      throw new Error("Access denied");
    }

    return this.storage.createProjectTeam(teamData);
  }

  async getProjectTeams(projectId: number): Promise<ProjectTeam[]> {
    return this.storage.getProjectTeams(projectId);
  }

  async deleteProjectTeam(teamId: number, userId: number, userRole: string): Promise<void> {
    const team = await this.storage.getProjectTeam(teamId);
    if (!team) {
      throw new Error("Team not found");
    }

    // Check if user owns the project this team belongs to
    if (!team.projectId) {
      throw new Error("Team project ID is invalid");
    }
    const project = await this.storage.getProject(team.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    if (userRole === 'teacher' && project.teacherId !== userId) {
      throw new Error("Access denied");
    }

    return this.storage.deleteProjectTeam(teamId);
  }

  async addTeamMember(teamMemberData: Omit<ProjectTeamMember, 'id' | 'joinedAt'>, userId: number, userRole: string): Promise<ProjectTeamMember> {
    const team = await this.storage.getProjectTeam(teamMemberData.teamId);
    if (!team) {
      throw new Error("Team not found");
    }

    // Check if user owns the project this team belongs to
    if (!team.projectId) {
      throw new Error("Team project ID is invalid");
    }
    const project = await this.storage.getProject(team.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    if (userRole === 'teacher' && project.teacherId !== userId) {
      throw new Error("Access denied");
    }

    return this.storage.addTeamMember(teamMemberData);
  }

  async getTeamMembers(teamId: number): Promise<ProjectTeamMember[]> {
    return this.storage.getTeamMembers(teamId);
  }

  async removeTeamMember(memberId: number, userId: number, userRole: string): Promise<void> {
    // Get the team member to find the team
    const members = await this.storage.getTeamMembers(memberId);
    if (members.length === 0) {
      throw new Error("Team member not found");
    }

    const teamId = members[0].teamId;
    const team = await this.storage.getProjectTeam(teamId);
    if (!team) {
      throw new Error("Team not found");
    }

    // Check if user owns the project this team belongs to
    if (!team.projectId) {
      throw new Error("Team project ID is invalid");
    }
    const project = await this.storage.getProject(team.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    if (userRole === 'teacher' && project.teacherId !== userId) {
      throw new Error("Access denied");
    }

    return this.storage.removeTeamMember(memberId);
  }

  async getStudentsBySchool(schoolId: number): Promise<User[]> {
    return this.storage.getStudentsBySchool(schoolId);
  }



  // AI-powered operations
  async generateProjectIdeas(ideaParams: {
    subject: string;
    topic: string;
    gradeLevel: string;
    duration: string;
    componentSkillIds: number[];
  }): Promise<any> {
    const { subject, topic, gradeLevel, duration, componentSkillIds } = ideaParams;

    // Sanitize AI inputs
    const sanitizedSubject = sanitizeForPrompt(subject);
    const sanitizedTopic = sanitizeForPrompt(topic);
    const sanitizedGradeLevel = sanitizeForPrompt(gradeLevel);
    const sanitizedDuration = sanitizeForPrompt(duration);

    // Validate componentSkillIds is an array of numbers
    if (!Array.isArray(componentSkillIds) || !componentSkillIds.every(id => typeof id === 'number')) {
      throw new Error("Invalid component skill IDs format");
    }

    // Get component skills details
    const componentSkills = await this.storage.getComponentSkillsByIds(componentSkillIds);

    const ideas = await aiService.generateProjectIdeas({
      subject: sanitizedSubject,
      topic: sanitizedTopic,
      gradeLevel: sanitizedGradeLevel,
      duration: sanitizedDuration,
      componentSkills
    });

    return { ideas };
  }

  async generateMilestonesForProject(projectId: number, userId: number, userRole: string, competencies: any[]): Promise<Milestone[]> {
    const project = await this.storage.getProject(projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    if (userRole === 'teacher' && project.teacherId !== userId) {
      throw new Error("Access denied");
    }

    const selectedCompetencies = competencies.filter(c => 
      (project.componentSkillIds as number[])?.includes(c.id)
    );

    const milestones = await aiService.generateProjectMilestones(project);

    // Save generated milestones to database
    const savedMilestones = await Promise.all(
      milestones.map((milestone, index) => 
        this.storage.createMilestone({
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

  async generateMilestonesAndAssessmentsForProject(projectId: number, userId: number, userRole: string, componentSkillsDetails: any[]): Promise<any> {
    const project = await this.storage.getProject(projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    if (userRole === 'teacher' && project.teacherId !== userId) {
      throw new Error("Access denied");
    }

    const projectComponentSkillIds = project.componentSkillIds as number[];
    if (!projectComponentSkillIds?.length) {
      throw new Error("Project has no component skills");
    }

    const projectComponentSkills = componentSkillsDetails.filter(
      skill => projectComponentSkillIds.includes(skill.id)
    );

    if (projectComponentSkills.length === 0) {
      throw new Error("No matching component skills found");
    }

    const milestones = await aiService.generateMilestonesFromComponentSkills(
      project.title,
      project.description,
      project.dueDate ? project.dueDate.toISOString() : new Date().toISOString(),
      projectComponentSkills
    );

    // Save generated milestones and their assessments
    const savedMilestones = await Promise.all(
      milestones.map(async (milestone, index) => {
        const savedMilestone = await this.storage.createMilestone({
          projectId,
          title: milestone.title,
          description: milestone.description,
          dueDate: milestone.dueDate ? new Date(milestone.dueDate) : null,
          order: index + 1,
          aiGenerated: true,
        });

        // Generate assessment for this milestone
        const assessment = await aiService.generateAssessmentFromComponentSkills(
          savedMilestone.title,
          savedMilestone.description,
          savedMilestone.dueDate ? savedMilestone.dueDate.toISOString() : new Date().toISOString(),
          projectComponentSkills
        );

        return {
          milestone: savedMilestone,
          assessment
        };
      })
    );

    return savedMilestones;
  }

  // Teacher dashboard methods
  async getTeacherDashboardStats(teacherId: number) {
    return await this.storage.getTeacherDashboardStats(teacherId);
  }

  async getTeacherProjects(teacherId: number) {
    return await this.storage.getTeacherProjects(teacherId);
  }

  async getTeacherPendingTasks(teacherId: number) {
    return await this.storage.getTeacherPendingTasks(teacherId);
  }

  async getTeacherCurrentMilestones(teacherId: number) {
    return await this.storage.getTeacherCurrentMilestones(teacherId);
  }

  async getSchoolStudentsProgress(teacherId: number) {
    return await this.storage.getSchoolStudentsProgress(teacherId);
  }
}

// Export singleton instance
export const projectsService = new ProjectsService();