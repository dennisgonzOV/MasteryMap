// Projects Service - data access layer for projects domain
import { eq, and, desc, asc, inArray } from 'drizzle-orm';
import { db } from '../../db';
import { 
  projects, 
  milestones, 
  projectAssignments,
  users,
  componentSkills,
  projectTeamMembers
} from '../../../shared/schema';
import type { 
  InsertProject, 
  SelectProject, 
  InsertMilestone, 
  SelectMilestone,
  SelectUser,
  SelectComponentSkill
} from '../../../shared/schema';

export class ProjectsService {
  
  // Project CRUD operations
  async createProject(projectData: InsertProject): Promise<SelectProject> {
    try {
      const result = await db.insert(projects).values(projectData).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating project:', error);
      throw new Error('Database error');
    }
  }

  async getProject(id: number): Promise<SelectProject | null> {
    try {
      const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
      return result[0] || null;
    } catch (error) {
      console.error('Error getting project:', error);
      throw new Error('Database error');
    }
  }

  async getProjectsByTeacher(teacherId: number): Promise<SelectProject[]> {
    try {
      return await db.select().from(projects)
        .where(eq(projects.teacherId, teacherId))
        .orderBy(desc(projects.createdAt));
    } catch (error) {
      console.error('Error getting projects by teacher:', error);
      throw new Error('Database error');
    }
  }

  async getProjectsByStudent(studentId: number): Promise<SelectProject[]> {
    try {
      // Get projects through assignments or team memberships
      const assignedProjects = await db
        .select({ project: projects })
        .from(projectAssignments)
        .innerJoin(projects, eq(projectAssignments.projectId, projects.id))
        .where(eq(projectAssignments.studentId, studentId));

      const teamProjects = await db
        .select({ project: projects })
        .from(projectTeamMembers)
        .innerJoin(projects, eq(projectTeamMembers.projectId, projects.id))
        .where(eq(projectTeamMembers.studentId, studentId));

      // Combine and deduplicate
      const allProjects = [...assignedProjects.map(p => p.project), ...teamProjects.map(p => p.project)];
      const uniqueProjects = allProjects.filter((project, index, array) => 
        array.findIndex(p => p.id === project.id) === index
      );

      return uniqueProjects.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      console.error('Error getting projects by student:', error);
      throw new Error('Database error');
    }
  }

  async updateProject(id: number, updates: Partial<InsertProject>): Promise<SelectProject | null> {
    try {
      const result = await db
        .update(projects)
        .set(updates)
        .where(eq(projects.id, id))
        .returning();
      return result[0] || null;
    } catch (error) {
      console.error('Error updating project:', error);
      throw new Error('Database error');
    }
  }

  async deleteProject(id: number): Promise<boolean> {
    try {
      await db.delete(projects).where(eq(projects.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting project:', error);
      throw new Error('Database error');
    }
  }

  // Milestone operations
  async createMilestone(milestoneData: InsertMilestone): Promise<SelectMilestone> {
    try {
      const result = await db.insert(milestones).values(milestoneData).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating milestone:', error);
      throw new Error('Database error');
    }
  }

  async getMilestonesByProject(projectId: number): Promise<SelectMilestone[]> {
    try {
      return await db.select().from(milestones)
        .where(eq(milestones.projectId, projectId))
        .orderBy(asc(milestones.dueDate));
    } catch (error) {
      console.error('Error getting milestones by project:', error);
      throw new Error('Database error');
    }
  }

  async getMilestone(id: number): Promise<SelectMilestone | null> {
    try {
      const result = await db.select().from(milestones).where(eq(milestones.id, id)).limit(1);
      return result[0] || null;
    } catch (error) {
      console.error('Error getting milestone:', error);
      throw new Error('Database error');
    }
  }

  // Student assignment operations
  async assignStudentsToProject(projectId: number, studentIds: number[]): Promise<void> {
    try {
      const assignments = studentIds.map(studentId => ({
        projectId,
        studentId,
        assignedAt: new Date()
      }));

      await db.insert(projectAssignments).values(assignments);
    } catch (error) {
      console.error('Error assigning students to project:', error);
      throw new Error('Database error');
    }
  }

  async getAssignedStudents(projectId: number): Promise<SelectUser[]> {
    try {
      const result = await db
        .select({ user: users })
        .from(projectAssignments)
        .innerJoin(users, eq(projectAssignments.studentId, users.id))
        .where(eq(projectAssignments.projectId, projectId));

      return result.map(r => r.user);
    } catch (error) {
      console.error('Error getting assigned students:', error);
      throw new Error('Database error');
    }
  }

  // Helper methods
  async getUser(id: number): Promise<SelectUser | null> {
    try {
      const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return result[0] || null;
    } catch (error) {
      console.error('Error getting user:', error);
      throw new Error('Database error');
    }
  }

  async getComponentSkillsByIds(ids: number[]): Promise<SelectComponentSkill[]> {
    try {
      if (ids.length === 0) return [];
      return await db.select().from(componentSkills).where(inArray(componentSkills.id, ids));
    } catch (error) {
      console.error('Error getting component skills:', error);
      throw new Error('Database error');
    }
  }

  async getAllProjects(): Promise<SelectProject[]> {
    try {
      return await db.select().from(projects).orderBy(desc(projects.createdAt));
    } catch (error) {
      console.error('Error getting all projects:', error);
      throw new Error('Database error');
    }
  }

  async getProjectsBySchool(schoolId: number): Promise<SelectProject[]> {
    try {
      return await db.select().from(projects)
        .where(eq(projects.schoolId, schoolId))
        .orderBy(desc(projects.createdAt));
    } catch (error) {
      console.error('Error getting projects by school:', error);
      throw new Error('Database error');
    }
  }
}