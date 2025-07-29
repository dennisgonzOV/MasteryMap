// Projects Service - business logic layer for projects domain
import { ProjectsRepository } from './projects.repository';
import type { 
  InsertProject, 
  SelectProject, 
  InsertMilestone, 
  SelectMilestone,
  SelectUser,
  SelectComponentSkill
} from '../../../shared/schema';

export class ProjectsService {
  private projectsRepo = new ProjectsRepository();
  
  // Project CRUD operations
  async createProject(projectData: InsertProject): Promise<SelectProject> {
    return await this.projectsRepo.createProject(projectData);
  }

  async getProject(id: number): Promise<SelectProject | null> {
    return await this.projectsRepo.getProjectById(id);
  }

  async getProjectsByTeacher(teacherId: number): Promise<SelectProject[]> {
    return await this.projectsRepo.getProjectsByTeacher(teacherId);
  }

  async getProjectsByStudent(studentId: number): Promise<SelectProject[]> {
    return await this.projectsRepo.getProjectsByStudent(studentId);
  }

  async updateProject(id: number, updates: Partial<InsertProject>): Promise<SelectProject | null> {
    return await this.projectsRepo.updateProject(id, updates);
  }

  async deleteProject(id: number): Promise<boolean> {
    await this.projectsRepo.deleteProject(id);
    return true;
  }

  // Milestone operations
  async createMilestone(milestoneData: InsertMilestone): Promise<SelectMilestone> {
    return await this.projectsRepo.createMilestone(milestoneData);
  }

  async getMilestonesByProject(projectId: number): Promise<SelectMilestone[]> {
    return await this.projectsRepo.getMilestonesByProject(projectId);
  }

  async getMilestone(id: number): Promise<SelectMilestone | null> {
    return await this.projectsRepo.getMilestoneById(id);
  }

  // Student assignment operations
  async assignStudentsToProject(projectId: number, studentIds: number[]): Promise<void> {
    return await this.projectsRepo.assignStudentsToProject(projectId, studentIds);
  }

  async getAssignedStudents(projectId: number): Promise<SelectUser[]> {
    return await this.projectsRepo.getAssignedStudents(projectId);
  }

  // Helper methods
  async getUser(id: number): Promise<SelectUser | null> {
    // Delegate to auth repository through projects repo helper
    const users = await this.projectsRepo.getComponentSkillsByIds([]); // This should be refactored
    // For now, use a simpler approach until we have proper cross-domain access
    return null; // Temporary - this method should use AuthRepository
  }

  async getComponentSkillsByIds(ids: number[]): Promise<SelectComponentSkill[]> {
    return await this.projectsRepo.getComponentSkillsByIds(ids);
  }

  async getAllProjects(): Promise<SelectProject[]> {
    return await this.projectsRepo.getAllProjects();
  }

  async getProjectsBySchool(schoolId: number): Promise<SelectProject[]> {
    return await this.projectsRepo.getProjectsBySchool(schoolId);
  }
}