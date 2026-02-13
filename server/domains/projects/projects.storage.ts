import type {
  BestStandard,
  InsertMilestone,
  InsertProject,
  InsertProjectTeam,
  Milestone,
  Project,
  ProjectAssignment,
  ProjectTeam,
  ProjectTeamMember,
  User,
} from "../../../shared/schema";
import type {
  ComponentSkillWithDetailsDTO,
  TeacherCurrentMilestoneDTO,
  TeacherDashboardStatsDTO,
  TeacherPendingTaskDTO,
  TeacherProjectOverviewDTO,
} from "../../../shared/contracts/api";
import { ProjectsCompetencyQueries } from "./projects-storage-competency.queries";
import { ProjectsCoreQueries } from "./projects-storage-core.queries";
import { ProjectsDashboardQueries } from "./projects-storage-dashboard.queries";
import { ProjectsPublicQueries } from "./projects-storage-public.queries";
import { ProjectsTeamQueries } from "./projects-storage-team.queries";
import type {
  LearnerOutcomeWithCompetencies,
  PublicProjectFilters,
  SchoolStudentProgressRecord,
  StudentCompetencyProgressRecord,
} from "./projects.storage.types";

export type {
  LearnerOutcomeWithCompetencies,
  PublicProjectFilters,
  SchoolStudentProgressRecord,
  StudentCompetencyProgressRecord,
} from "./projects.storage.types";

export interface IProjectsStorage {
  createProject(project: InsertProject): Promise<Project>;
  getProject(id: number): Promise<Project | undefined>;
  getProjectsByTeacher(teacherId: number): Promise<Project[]>;
  getProjectsBySchool(schoolId: number): Promise<Project[]>;
  getProjectsByStudent(studentId: number): Promise<Project[]>;
  updateProject(id: number, updates: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: number): Promise<void>;

  createMilestone(milestone: InsertMilestone): Promise<Milestone>;
  getMilestone(id: number): Promise<Milestone | undefined>;
  getMilestonesByProject(projectId: number): Promise<Milestone[]>;
  updateMilestone(id: number, updates: Partial<InsertMilestone>): Promise<Milestone>;
  deleteMilestone(id: number): Promise<void>;

  createProjectTeam(team: InsertProjectTeam): Promise<ProjectTeam>;
  getProjectTeams(projectId: number): Promise<ProjectTeam[]>;
  getProjectTeam(teamId: number): Promise<ProjectTeam | undefined>;
  deleteProjectTeam(teamId: number): Promise<void>;
  addTeamMember(teamMember: Omit<ProjectTeamMember, "id" | "joinedAt">): Promise<ProjectTeamMember>;
  removeTeamMember(memberId: number): Promise<void>;
  getTeamMembers(teamId: number): Promise<ProjectTeamMember[]>;
  getTeamMembersWithStudentInfo(
    teamId: number,
  ): Promise<
    Array<
      ProjectTeamMember & {
        studentName: string;
        student: {
          id: number;
          username: string;
        };
      }
    >
  >;
  getTeamMember(memberId: number): Promise<ProjectTeamMember | undefined>;
  getStudentsBySchool(schoolId: number): Promise<User[]>;

  assignStudentToProject(projectId: number, studentId: number): Promise<ProjectAssignment>;
  getProjectAssignments(projectId: number): Promise<ProjectAssignment[]>;
  updateProjectProgress(projectId: number, studentId: number, progress: number): Promise<void>;

  getUser(id: number): Promise<User | undefined>;

  getComponentSkillsByIds(ids: number[]): Promise<ComponentSkillWithDetailsDTO[]>;
  getComponentSkillsWithDetails(): Promise<ComponentSkillWithDetailsDTO[]>;
  getBestStandardsByIds(ids: number[]): Promise<BestStandard[]>;
  getLearnerOutcomesWithCompetencies(): Promise<LearnerOutcomeWithCompetencies[]>;

  getAssessmentsByMilestone(milestoneId: number): Promise<Array<Record<string, unknown>>>;

  getTeacherDashboardStats(teacherId: number): Promise<TeacherDashboardStatsDTO>;
  getTeacherProjects(teacherId: number): Promise<TeacherProjectOverviewDTO[]>;
  getTeacherPendingTasks(teacherId: number): Promise<TeacherPendingTaskDTO[]>;
  getTeacherCurrentMilestones(teacherId: number): Promise<TeacherCurrentMilestoneDTO[]>;
  getSchoolStudentsProgress(teacherId: number): Promise<SchoolStudentProgressRecord[]>;

  getPublicProjects(filters?: PublicProjectFilters): Promise<Project[]>;
  toggleProjectVisibility(projectId: number, isPublic: boolean): Promise<Project>;

  incrementProjectGenerationCount(userId: number): Promise<User>;

  getStudentCompetencyProgress(studentId: number): Promise<StudentCompetencyProgressRecord[]>;
}

export class ProjectsStorage implements IProjectsStorage {
  constructor(
    private readonly coreQueries: ProjectsCoreQueries = new ProjectsCoreQueries(),
    private readonly teamQueries: ProjectsTeamQueries = new ProjectsTeamQueries(),
    private readonly competencyQueries: ProjectsCompetencyQueries = new ProjectsCompetencyQueries(),
    private readonly dashboardQueries: ProjectsDashboardQueries = new ProjectsDashboardQueries(),
    private readonly publicQueries: ProjectsPublicQueries = new ProjectsPublicQueries(),
  ) {}

  async createProject(project: InsertProject): Promise<Project> {
    return this.coreQueries.createProject(project);
  }

  async getProject(id: number): Promise<Project | undefined> {
    return this.coreQueries.getProject(id);
  }

  async getProjectsByTeacher(teacherId: number): Promise<Project[]> {
    return this.coreQueries.getProjectsByTeacher(teacherId);
  }

  async getProjectsBySchool(schoolId: number): Promise<Project[]> {
    return this.coreQueries.getProjectsBySchool(schoolId);
  }

  async getProjectsByStudent(studentId: number): Promise<Project[]> {
    return this.coreQueries.getProjectsByStudent(studentId);
  }

  async updateProject(id: number, updates: Partial<InsertProject>): Promise<Project> {
    return this.coreQueries.updateProject(id, updates);
  }

  async deleteProject(id: number): Promise<void> {
    return this.coreQueries.deleteProject(id);
  }

  async createMilestone(milestone: InsertMilestone): Promise<Milestone> {
    return this.coreQueries.createMilestone(milestone);
  }

  async getMilestone(id: number): Promise<Milestone | undefined> {
    return this.coreQueries.getMilestone(id);
  }

  async getMilestonesByProject(projectId: number): Promise<Milestone[]> {
    return this.coreQueries.getMilestonesByProject(projectId);
  }

  async updateMilestone(id: number, updates: Partial<InsertMilestone>): Promise<Milestone> {
    return this.coreQueries.updateMilestone(id, updates);
  }

  async deleteMilestone(id: number): Promise<void> {
    return this.coreQueries.deleteMilestone(id);
  }

  async createProjectTeam(team: InsertProjectTeam): Promise<ProjectTeam> {
    return this.teamQueries.createProjectTeam(team);
  }

  async getProjectTeams(projectId: number): Promise<ProjectTeam[]> {
    return this.teamQueries.getProjectTeams(projectId);
  }

  async getProjectTeam(teamId: number): Promise<ProjectTeam | undefined> {
    return this.teamQueries.getProjectTeam(teamId);
  }

  async deleteProjectTeam(teamId: number): Promise<void> {
    return this.teamQueries.deleteProjectTeam(teamId);
  }

  async addTeamMember(teamMember: Omit<ProjectTeamMember, "id" | "joinedAt">): Promise<ProjectTeamMember> {
    return this.teamQueries.addTeamMember(teamMember);
  }

  async removeTeamMember(memberId: number): Promise<void> {
    return this.teamQueries.removeTeamMember(memberId);
  }

  async getTeamMembers(teamId: number): Promise<ProjectTeamMember[]> {
    return this.teamQueries.getTeamMembers(teamId);
  }

  async getTeamMembersWithStudentInfo(
    teamId: number,
  ): Promise<
    Array<
      ProjectTeamMember & {
        studentName: string;
        student: {
          id: number;
          username: string;
        };
      }
    >
  > {
    return this.teamQueries.getTeamMembersWithStudentInfo(teamId);
  }

  async getTeamMember(memberId: number): Promise<ProjectTeamMember | undefined> {
    return this.teamQueries.getTeamMember(memberId);
  }

  async getStudentsBySchool(schoolId: number): Promise<User[]> {
    return this.teamQueries.getStudentsBySchool(schoolId);
  }

  async assignStudentToProject(projectId: number, studentId: number): Promise<ProjectAssignment> {
    return this.teamQueries.assignStudentToProject(projectId, studentId);
  }

  async getProjectAssignments(projectId: number): Promise<ProjectAssignment[]> {
    return this.teamQueries.getProjectAssignments(projectId);
  }

  async updateProjectProgress(projectId: number, studentId: number, progress: number): Promise<void> {
    return this.teamQueries.updateProjectProgress(projectId, studentId, progress);
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.coreQueries.getUser(id);
  }

  async getComponentSkillsByIds(ids: number[]): Promise<ComponentSkillWithDetailsDTO[]> {
    return this.competencyQueries.getComponentSkillsByIds(ids);
  }

  async getComponentSkillsWithDetails(): Promise<ComponentSkillWithDetailsDTO[]> {
    return this.competencyQueries.getComponentSkillsWithDetails();
  }

  async getBestStandardsByIds(ids: number[]): Promise<BestStandard[]> {
    return this.competencyQueries.getBestStandardsByIds(ids);
  }

  async getLearnerOutcomesWithCompetencies(): Promise<LearnerOutcomeWithCompetencies[]> {
    return this.competencyQueries.getLearnerOutcomesWithCompetencies();
  }

  async getAssessmentsByMilestone(milestoneId: number): Promise<Array<Record<string, unknown>>> {
    return this.competencyQueries.getAssessmentsByMilestone(milestoneId);
  }

  async getTeacherDashboardStats(teacherId: number): Promise<TeacherDashboardStatsDTO> {
    return this.dashboardQueries.getTeacherDashboardStats(teacherId);
  }

  async getTeacherProjects(teacherId: number): Promise<TeacherProjectOverviewDTO[]> {
    return this.dashboardQueries.getTeacherProjects(teacherId);
  }

  async getTeacherPendingTasks(teacherId: number): Promise<TeacherPendingTaskDTO[]> {
    return this.dashboardQueries.getTeacherPendingTasks(teacherId);
  }

  async getTeacherCurrentMilestones(teacherId: number): Promise<TeacherCurrentMilestoneDTO[]> {
    return this.dashboardQueries.getTeacherCurrentMilestones(teacherId);
  }

  async getSchoolStudentsProgress(teacherId: number): Promise<SchoolStudentProgressRecord[]> {
    return this.dashboardQueries.getSchoolStudentsProgress(teacherId);
  }

  async getPublicProjects(filters?: PublicProjectFilters): Promise<Project[]> {
    return this.publicQueries.getPublicProjects(filters);
  }

  async toggleProjectVisibility(projectId: number, isPublic: boolean): Promise<Project> {
    return this.publicQueries.toggleProjectVisibility(projectId, isPublic);
  }

  async incrementProjectGenerationCount(userId: number): Promise<User> {
    return this.coreQueries.incrementProjectGenerationCount(userId);
  }

  async getStudentCompetencyProgress(studentId: number): Promise<StudentCompetencyProgressRecord[]> {
    return this.competencyQueries.getStudentCompetencyProgress(studentId);
  }
}

export const projectsStorage = new ProjectsStorage();
