import type { Milestone, Project, User } from "../../../shared/schema";
import { projectsService } from "../projects";

interface AssessmentProjectsAdapter {
  getMilestone(id: number): Promise<Milestone | undefined>;
  getProject(id: number): Promise<Project | undefined>;
  getProjectsByUser(userId: number, userRole: string): Promise<Project[]>;
  getUser?(userId: number): Promise<User | undefined>;
}

export interface AssessmentProjectGateway {
  getMilestone(milestoneId: number): Promise<Milestone | undefined>;
  getProject(projectId: number): Promise<Project | undefined>;
  getStudentProjectIds(studentId: number): Promise<number[]>;
  getUser?(userId: number): Promise<User | undefined>;
}

export class ProjectsAssessmentGateway implements AssessmentProjectGateway {
  constructor(private readonly adapter: AssessmentProjectsAdapter = projectsService) {}

  async getMilestone(milestoneId: number): Promise<Milestone | undefined> {
    return this.adapter.getMilestone(milestoneId);
  }

  async getProject(projectId: number): Promise<Project | undefined> {
    return this.adapter.getProject(projectId);
  }

  async getStudentProjectIds(studentId: number): Promise<number[]> {
    const studentProjects = await this.adapter.getProjectsByUser(studentId, "student");
    return studentProjects.map((project) => project.id);
  }

  async getUser(userId: number): Promise<User | undefined> {
    if (!this.adapter.getUser) {
      return undefined;
    }
    return this.adapter.getUser(userId);
  }
}

export const assessmentProjectGateway = new ProjectsAssessmentGateway();
