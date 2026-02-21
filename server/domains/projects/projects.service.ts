import { projectsStorage, type IProjectsStorage } from './projects.storage';
import {
  insertProjectSchema,
  insertMilestoneSchema,
  type Assessment,
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
import { portfolioStorage } from "../portfolio";
import { assertProjectId, assertTeacherProjectAccess } from "./project-access";
import { ProjectsAIService } from "./projects-ai.service";

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
  private aiOperations: ProjectsAIService;

  constructor(private storage: IProjectsStorage = projectsStorage) {
    this.aiOperations = new ProjectsAIService(
      this.storage,
      this.getAuthorizedProject.bind(this),
    );
  }

  private async getProjectOrThrow(projectId: number): Promise<Project> {
    const project = await this.storage.getProject(projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    return project;
  }

  private assertProjectAccess(project: Pick<Project, "teacherId">, userId: number, userRole: string): void {
    assertTeacherProjectAccess(project, userId, userRole);
  }

  private async getAuthorizedProject(projectId: number, userId: number, userRole: string): Promise<Project> {
    const project = await this.getProjectOrThrow(projectId);
    this.assertProjectAccess(project, userId, userRole);
    return project;
  }

  private async getMilestoneWithProjectOrThrow(milestoneId: number): Promise<{ milestone: Milestone; project: Project }> {
    const milestone = await this.storage.getMilestone(milestoneId);
    if (!milestone) {
      throw new Error("Milestone not found");
    }

    const projectId = assertProjectId(milestone.projectId, "Milestone");
    const project = await this.getProjectOrThrow(projectId);
    return { milestone, project };
  }

  private async getTeamWithProjectOrThrow(teamId: number): Promise<{ team: ProjectTeam; project: Project }> {
    const team = await this.storage.getProjectTeam(teamId);
    if (!team) {
      throw new Error("Team not found");
    }

    const projectId = assertProjectId(team.projectId, "Team");
    const project = await this.getProjectOrThrow(projectId);
    return { team, project };
  }

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
    const teacherSchoolId = await this.getTeacherSchoolId(teacherId);
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

  async getProjectsBySchool(schoolId: number): Promise<Project[]> {
    return this.storage.getProjectsBySchool(schoolId);
  }

  async getProjectsForDashboard(
    userId: number,
    userRole: string,
    userTier?: string,
    scope: "mine" | "school" = "mine",
  ): Promise<Project[]> {
    if (userRole === "teacher") {
      if (scope === "school") {
        const teacherSchoolId = await this.getTeacherSchoolId(userId);
        if (teacherSchoolId) {
          return this.storage.getProjectsBySchool(teacherSchoolId);
        }
      }
      return this.storage.getProjectsByTeacher(userId);
    }

    if (userTier === 'free' && userRole === 'teacher') {
      return this.storage.getProjectsByTeacher(userId);
    }
    return this.getProjectsByUser(userId, userRole);
  }

  async toggleProjectVisibility(projectId: number, isPublic: boolean, userId: number, userRole: string): Promise<Project> {
    await this.getAuthorizedProject(projectId, userId, userRole);

    return this.storage.toggleProjectVisibility(projectId, isPublic);
  }

  async updateProject(id: number, updates: Partial<InsertProject>, userId: number, userRole: string): Promise<Project> {
    await this.getAuthorizedProject(id, userId, userRole);

    return this.storage.updateProject(id, updates);
  }

  async deleteProject(id: number, userId: number, userRole: string): Promise<void> {
    await this.getAuthorizedProject(id, userId, userRole);

    return this.storage.deleteProject(id);
  }

  async startProject(id: number, userId: number, userRole: string): Promise<Project> {
    await this.getAuthorizedProject(id, userId, userRole);

    return this.storage.updateProject(id, { status: 'active' });
  }

  async assignStudentsToProject(projectId: number, studentIds: number[], userId: number, userRole: string): Promise<void> {
    await this.getAuthorizedProject(projectId, userId, userRole);

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
    await this.getAuthorizedProject(validatedMilestone.projectId, userId, userRole);

    return this.storage.createMilestone(validatedMilestone);
  }

  async getMilestone(id: number): Promise<Milestone | undefined> {
    return this.storage.getMilestone(id);
  }

  async getMilestonesByProject(projectId: number): Promise<Milestone[]> {
    return this.storage.getMilestonesByProject(projectId);
  }

  async getAssessmentsByMilestone(milestoneId: number): Promise<Assessment[]> {
    return this.storage.getAssessmentsByMilestone(milestoneId);
  }

  async updateMilestone(id: number, updates: Partial<InsertMilestone>, userId: number, userRole: string): Promise<Milestone> {
    const { project } = await this.getMilestoneWithProjectOrThrow(id);
    this.assertProjectAccess(project, userId, userRole);

    return this.storage.updateMilestone(id, updates);
  }

  async updateMilestoneDeliverable(
    milestoneId: number,
    updates: {
      deliverableId?: number;
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

    if (updates.deliverableUrl && studentId) {
      const deliverableDescription = updates.deliverableDescription || milestone.description || '';
      const deliverableTitle = updates.deliverableFileName || milestone.title;
      const deliverableType = this.getArtifactType(updates.deliverableFileName || '');
      const isPublic = updates.includeInPortfolio ?? false;

      if (updates.deliverableId) {
        const existingArtifact = await portfolioStorage.getPortfolioArtifactById(updates.deliverableId);
        if (!existingArtifact) {
          throw new Error("Deliverable artifact not found");
        }
        if (existingArtifact.studentId !== studentId || existingArtifact.milestoneId !== milestoneId) {
          throw new Error("Access denied");
        }

        await portfolioStorage.updatePortfolioArtifact(existingArtifact.id, {
          title: deliverableTitle,
          description: deliverableDescription,
          artifactUrl: updates.deliverableUrl,
          artifactType: deliverableType,
          isPublic,
          tags: existingArtifact.tags ?? [],
        });
      } else {
        const existingMatchingArtifact = (await portfolioStorage.getPortfolioArtifactsByStudent(studentId)).find(
          (artifact) => artifact.milestoneId === milestoneId && artifact.artifactUrl === updates.deliverableUrl,
        );

        if (existingMatchingArtifact) {
          await portfolioStorage.updatePortfolioArtifact(existingMatchingArtifact.id, {
            title: deliverableTitle,
            description: deliverableDescription,
            artifactUrl: updates.deliverableUrl,
            artifactType: deliverableType,
            isPublic,
            tags: existingMatchingArtifact.tags ?? [],
          });
        } else {
          await portfolioStorage.createPortfolioArtifact({
            studentId,
            milestoneId,
            title: deliverableTitle,
            description: deliverableDescription,
            artifactUrl: updates.deliverableUrl,
            artifactType: deliverableType,
            tags: [],
            isPublic,
            isApproved: false,
          });
        }
      }
    }

    return updatedMilestone;
  }

  async deleteMilestone(id: number, userId: number, userRole: string): Promise<void> {
    const { project } = await this.getMilestoneWithProjectOrThrow(id);
    this.assertProjectAccess(project, userId, userRole);

    return this.storage.deleteMilestone(id);
  }

  // Team operations
  async createProjectTeam(teamData: InsertProjectTeam, userId: number, userRole: string): Promise<ProjectTeam> {
    // Check if user owns the project this team belongs to
    if (!teamData.projectId) {
      throw new Error("Project ID is required");
    }
    await this.getAuthorizedProject(teamData.projectId, userId, userRole);

    return this.storage.createProjectTeam(teamData);
  }

  async getProjectTeams(projectId: number): Promise<ProjectTeam[]> {
    return this.storage.getProjectTeams(projectId);
  }

  async getProjectTeam(teamId: number): Promise<ProjectTeam | undefined> {
    return this.storage.getProjectTeam(teamId);
  }

  async deleteProjectTeam(teamId: number, userId: number, userRole: string): Promise<void> {
    const { project } = await this.getTeamWithProjectOrThrow(teamId);
    this.assertProjectAccess(project, userId, userRole);

    return this.storage.deleteProjectTeam(teamId);
  }

  async addTeamMember(teamMemberData: Omit<ProjectTeamMember, 'id' | 'joinedAt'>, userId: number, userRole: string): Promise<ProjectTeamMember> {
    const { project } = await this.getTeamWithProjectOrThrow(teamMemberData.teamId);
    this.assertProjectAccess(project, userId, userRole);

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

    const { project } = await this.getTeamWithProjectOrThrow(teamMember.teamId);
    this.assertProjectAccess(project, userId, userRole);

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
  }) {
    return this.aiOperations.generateProjectIdeas(ideaParams);
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
  ) {
    return this.aiOperations.generateProjectIdeasForUser(userId, ideaParams);
  }

  async generateProjectThumbnail(
    projectId: number,
    userId: number,
    userRole: string,
    options: { subject?: string; topic?: string },
  ): Promise<{ thumbnailUrl: string; project: Project }> {
    return this.aiOperations.generateProjectThumbnail(projectId, userId, userRole, options);
  }

  async generateThumbnailPreview(options: {
    title: string;
    description?: string;
    subject?: string;
    topic?: string;
  }): Promise<{ thumbnailUrl: string }> {
    return this.aiOperations.generateThumbnailPreview(options);
  }

  async generateMilestonesForProject(
    projectId: number,
    userId: number,
    userRole: string,
  ): Promise<Milestone[]> {
    return this.aiOperations.generateMilestonesForProject(projectId, userId, userRole);
  }

  async generateMilestonesAndAssessmentsForProject(
    projectId: number,
    userId: number,
    userRole: string,
  ) {
    return this.aiOperations.generateMilestonesAndAssessmentsForProject(
      projectId,
      userId,
      userRole,
    );
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
    const milestoneAssessments = await Promise.all(
      projectMilestones.map(async (milestone) => {
        const assessments = await this.storage.getAssessmentsByMilestone(milestone.id);
        return assessments.map((assessment) => ({
          ...assessment,
          milestoneTitle: milestone.title,
          milestoneOrder: milestone.order ?? 0,
        }));
      }),
    );

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
      assessments: milestoneAssessments
        .flat()
        .sort((a, b) => {
          const orderDelta = (a.milestoneOrder ?? 0) - (b.milestoneOrder ?? 0);
          if (orderDelta !== 0) {
            return orderDelta;
          }
          return a.title.localeCompare(b.title);
        }),
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

  async getUser(id: number): Promise<User | undefined> {
    return this.storage.getUser(id);
  }

  private async getTeacherSchoolId(teacherId: number): Promise<number | null> {
    const teacher = await this.storage.getUser(teacherId);
    return teacher?.schoolId ?? null;
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
