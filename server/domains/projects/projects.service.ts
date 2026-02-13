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
import type {
  ProjectCreateRequestDTO,
  ComponentSkillWithDetailsDTO,
} from "../../../shared/contracts/api";
import { aiService } from "../ai/ai.service";
import { fluxImageService } from "../ai/flux.service";
import { sanitizeForPrompt } from "../../middleware/security";
import { portfolioStorage } from "../portfolio/portfolio.storage";

type PublicProjectFilters = {
  search?: string;
  subjectArea?: string;
  gradeLevel?: string;
  estimatedDuration?: string;
  componentSkillIds?: number[];
  bestStandardIds?: number[];
};

type IdRecord = { id: number; [key: string]: unknown };

export class ProjectsService {
  constructor(private storage: IProjectsStorage = projectsStorage) { }

  // Project operations
  async createProject(projectData: ProjectCreateRequestDTO, teacherId: number, teacherSchoolId: number | null): Promise<Project> {
    const { dueDate, ...bodyData } = projectData;

    const validatedProject = insertProjectSchema.parse({
      ...bodyData,
      teacherId,
      schoolId: teacherSchoolId ?? undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    });

    return this.storage.createProject(validatedProject);
  }

  async createProjectForCurrentTeacher(projectData: ProjectCreateRequestDTO, teacherId: number): Promise<Project> {
    const teacher = await this.storage.getUser(teacherId);
    const teacherSchoolId = teacher?.schoolId ?? null;
    return this.createProject(projectData, teacherId, teacherSchoolId);
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

  async getProjectsForDashboard(userId: number, userRole: string, userTier?: string): Promise<Project[]> {
    if (userTier === 'free' && userRole === 'teacher') {
      return this.storage.getProjectsByTeacher(userId);
    }
    return this.getProjectsByUser(userId, userRole);
  }

  async toggleProjectVisibility(projectId: number, isPublic: boolean, userId: number, userRole: string): Promise<Project> {
    const project = await this.storage.getProject(projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    if (userRole === 'teacher' && project.teacherId !== userId) {
      throw new Error("Access denied");
    }

    return this.storage.toggleProjectVisibility(projectId, isPublic);
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
  async createMilestone(milestoneData: unknown, userId: number, userRole: string): Promise<Milestone> {
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

  async getAssessmentsByMilestone(milestoneId: number): Promise<Array<Record<string, unknown>>> {
    return this.storage.getAssessmentsByMilestone(milestoneId);
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

  async updateMilestoneDeliverable(
    milestoneId: number,
    updates: {
      deliverableUrl?: string;
      deliverableFileName?: string;
      deliverableDescription?: string;
      includeInPortfolio?: boolean;
    },
    studentId?: number,
  ): Promise<Milestone> {
    const milestone = await this.storage.getMilestone(milestoneId);
    if (!milestone) {
      throw new Error("Milestone not found");
    }

    const milestoneUpdates: Partial<InsertMilestone> = {};
    if (updates.deliverableUrl !== undefined) milestoneUpdates.deliverableUrl = updates.deliverableUrl;
    if (updates.deliverableFileName !== undefined) milestoneUpdates.deliverableFileName = updates.deliverableFileName;
    if (updates.deliverableDescription !== undefined) milestoneUpdates.deliverableDescription = updates.deliverableDescription;
    if (updates.includeInPortfolio !== undefined) milestoneUpdates.includeInPortfolio = updates.includeInPortfolio;

    const updatedMilestone = await this.storage.updateMilestone(milestoneId, milestoneUpdates);

    if (updates.includeInPortfolio && updates.deliverableUrl && studentId) {
      await portfolioStorage.upsertPortfolioArtifact({
        studentId,
        milestoneId,
        title: milestone.title,
        description: updates.deliverableDescription || milestone.description || '',
        artifactUrl: updates.deliverableUrl,
        artifactType: this.getArtifactType(updates.deliverableFileName || ''),
        tags: [],
        isPublic: true,
        isApproved: false,
      });
    }

    return updatedMilestone;
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

  async getTeamMembersWithStudentInfo(teamId: number) {
    return this.storage.getTeamMembersWithStudentInfo(teamId);
  }

  async removeTeamMember(memberId: number, userId: number, userRole: string): Promise<void> {
    // Get the specific team member to find the team
    const teamMember = await this.storage.getTeamMember(memberId);
    if (!teamMember) {
      throw new Error("Team member not found");
    }

    const team = await this.storage.getProjectTeam(teamMember.teamId);
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
  }): Promise<{ ideas: Awaited<ReturnType<typeof aiService.generateProjectIdeas>> }> {
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

  async generateProjectIdeasForUser(
    userId: number,
    ideaParams: {
      subject: string;
      topic: string;
      gradeLevel: string;
      duration: string;
      componentSkillIds: number[];
    },
  ): Promise<{ ideas: Awaited<ReturnType<typeof aiService.generateProjectIdeas>> }> {
    const componentSkills = await this.storage.getComponentSkillsByIds(ideaParams.componentSkillIds);
    if (!componentSkills.length) {
      throw new Error("No valid component skills found for the provided IDs");
    }

    const user = await this.storage.getUser(userId);
    if (user?.tier === 'free') {
      const now = new Date();
      const lastDate = user.lastProjectGenerationDate;
      let currentCount = user.projectGenerationCount || 0;

      if (lastDate) {
        const lastMonth = lastDate.getMonth();
        const lastYear = lastDate.getFullYear();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        if (lastMonth !== currentMonth || lastYear !== currentYear) {
          currentCount = 0;
        }
      }

      if (currentCount >= 5) {
        throw new Error("Free tier limit reached. You can generate up to 5 project ideas per month.");
      }

      await this.storage.incrementProjectGenerationCount(userId);
    }

    return this.generateProjectIdeas(ideaParams);
  }

  async generateProjectThumbnail(
    projectId: number,
    userId: number,
    userRole: string,
    options: { subject?: string; topic?: string },
  ): Promise<{ thumbnailUrl: string; project: Project }> {
    const project = await this.storage.getProject(projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    if (userRole === 'teacher' && project.teacherId !== userId) {
      throw new Error("Access denied");
    }

    const thumbnailUrl = await fluxImageService.generateThumbnail({
      projectTitle: project.title,
      projectDescription: project.description || "",
      subject: options.subject,
      topic: options.topic,
    });

    if (!thumbnailUrl) {
      throw new Error("Failed to generate thumbnail");
    }

    const updatedProject = await this.storage.updateProject(projectId, { thumbnailUrl });
    return { thumbnailUrl, project: updatedProject };
  }

  async generateThumbnailPreview(options: {
    title: string;
    description?: string;
    subject?: string;
    topic?: string;
  }): Promise<{ thumbnailUrl: string }> {
    const thumbnailUrl = await fluxImageService.generateThumbnail({
      projectTitle: options.title,
      projectDescription: options.description || "",
      subject: options.subject,
      topic: options.topic,
    });

    if (!thumbnailUrl) {
      throw new Error("Failed to generate thumbnail");
    }

    return { thumbnailUrl };
  }

  async generateMilestonesForProject(
    projectId: number,
    userId: number,
    userRole: string,
  ): Promise<Milestone[]> {
    const project = await this.storage.getProject(projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    if (userRole === 'teacher' && project.teacherId !== userId) {
      throw new Error("Access denied");
    }

    const projectComponentSkillIds = project.componentSkillIds as number[] | null;
    if (!projectComponentSkillIds?.length) {
      throw new Error("Project has no component skills for milestone generation");
    }

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

  async generateMilestonesAndAssessmentsForProject(
    projectId: number,
    userId: number,
    userRole: string,
  ): Promise<Array<{ milestone: Milestone; assessment: Awaited<ReturnType<typeof aiService.generateAssessmentFromComponentSkills>> }>> {
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

    const componentSkillsDetails = await this.storage.getComponentSkillsWithDetails() as IdRecord[];
    const projectComponentSkills = componentSkillsDetails.filter(
      (skill) => projectComponentSkillIds.includes(skill.id)
    );

    if (projectComponentSkills.length === 0) {
      throw new Error("No matching component skills found");
    }

    const milestones = await aiService.generateMilestonesFromComponentSkills(
      project.title,
      project.description || "",
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
          savedMilestone.description || "",
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

  async getPublicProjectsWithStandards(filters: PublicProjectFilters = {}) {
    const publicProjects = await this.storage.getPublicProjects(filters);

    const allBestStandardIds = new Set<number>();
    publicProjects.forEach((project) => {
      if (Array.isArray(project.bestStandardIds)) {
        project.bestStandardIds.forEach((id) => allBestStandardIds.add(id));
      }
    });

    const bestStandardsMap = new Map<number, IdRecord>();
    if (allBestStandardIds.size > 0) {
      const standards = await this.storage.getBestStandardsByIds(Array.from(allBestStandardIds)) as IdRecord[];
      standards.forEach((standard) => bestStandardsMap.set(standard.id, standard));
    }

    return publicProjects.map((project) => ({
      ...project,
      bestStandards: (project.bestStandardIds as number[] | null)?.map((id) => bestStandardsMap.get(id)).filter(Boolean) || [],
    }));
  }

  async getPublicFilters() {
    const subjectAreas = ['Math', 'Science', 'English', 'Social Studies', 'Art', 'Music', 'Physical Education', 'Technology', 'Foreign Language', 'Other'];
    const gradeLevels = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
    const durations = ['1-2 weeks', '3-4 weeks', '5-6 weeks', '7-8 weeks', '9+ weeks'];
    const competencyFrameworks = await this.storage.getLearnerOutcomesWithCompetencies();

    return {
      subjectAreas,
      gradeLevels,
      durations,
      competencyFrameworks,
    };
  }

  async getPublicProjectDetails(projectId: number) {
    const project = await this.storage.getProject(projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    if (!project.isPublic) {
      throw new Error("This project is not publicly available");
    }

    const projectMilestones = await this.storage.getMilestonesByProject(projectId);

    let componentSkills: ComponentSkillWithDetailsDTO[] = [];
    if (Array.isArray(project.componentSkillIds) && project.componentSkillIds.length > 0) {
      componentSkills = await this.storage.getComponentSkillsByIds(project.componentSkillIds as number[]) as ComponentSkillWithDetailsDTO[];
    }

    let bestStandards: IdRecord[] = [];
    if (Array.isArray(project.bestStandardIds) && project.bestStandardIds.length > 0) {
      bestStandards = await this.storage.getBestStandardsByIds(project.bestStandardIds as number[]) as IdRecord[];
    }

    return {
      ...project,
      milestones: projectMilestones,
      componentSkills,
      bestStandards,
    };
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

  private getArtifactType(fileName: string): string {
    const ext = fileName.toLowerCase().split('.').pop() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
    if (['mp4', 'webm', 'mov', 'avi'].includes(ext)) return 'video';
    if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(ext)) return 'document';
    if (['ppt', 'pptx', 'key'].includes(ext)) return 'presentation';
    return 'file';
  }
}

// Export singleton instance
export const projectsService = new ProjectsService();
