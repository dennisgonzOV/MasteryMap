// Projects Repository - Domain-specific data access layer
import { eq, and, desc, asc, inArray } from 'drizzle-orm';
import { db } from '../../db';
import { 
  projects as projectsTable,
  milestones as milestonesTable,
  projectAssignments,
  projectTeamMembers,
  componentSkills as componentSkillsTable,
  users as usersTable
} from '../../../shared/schemas';
import type { 
  InsertProject, 
  SelectProject, 
  InsertMilestone, 
  SelectMilestone,
  SelectUser,
  SelectComponentSkill
} from '../../../shared/schemas';

export class ProjectsRepository {
  
  // Project CRUD operations
  async createProject(projectData: InsertProject): Promise<SelectProject> {
    try {
      const result = await db.insert(projectsTable).values(projectData).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating project:', error);
      throw new Error('Database error');
    }
  }

  async getProjectById(id: number): Promise<SelectProject | null> {
    try {
      const result = await db.select().from(projectsTable).where(eq(projectsTable.id, id)).limit(1);
      return result[0] || null;
    } catch (error) {
      console.error('Error getting project:', error);
      throw new Error('Database error');
    }
  }

  async getProjectsByTeacher(teacherId: number): Promise<SelectProject[]> {
    try {
      return await db.select().from(projectsTable)
        .where(eq(projectsTable.teacherId, teacherId))
        .orderBy(desc(projectsTable.createdAt));
    } catch (error) {
      console.error('Error getting projects by teacher:', error);
      throw new Error('Database error');
    }
  }

  async getProjectsByStudent(studentId: number): Promise<SelectProject[]> {
    try {
      // Get projects through assignments or team memberships
      const assignedProjects = await db
        .select({ project: projectsTable })
        .from(projectAssignments)
        .innerJoin(projectsTable, eq(projectAssignments.projectId, projectsTable.id))
        .where(eq(projectAssignments.studentId, studentId));

      const teamProjects = await db
        .select({ project: projectsTable })
        .from(projectTeamMembers)
        .innerJoin(projectsTable, eq(projectTeamMembers.projectId, projectsTable.id))
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
        .update(projectsTable)
        .set(updates)
        .where(eq(projectsTable.id, id))
        .returning();
      return result[0] || null;
    } catch (error) {
      console.error('Error updating project:', error);
      throw new Error('Database error');
    }
  }

  async deleteProject(id: number): Promise<boolean> {
    try {
      await db.delete(projectsTable).where(eq(projectsTable.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting project:', error);
      throw new Error('Database error');
    }
  }

  async getAllProjects(): Promise<SelectProject[]> {
    try {
      return await db.select().from(projectsTable).orderBy(desc(projectsTable.createdAt));
    } catch (error) {
      console.error('Error getting all projects:', error);
      throw new Error('Database error');
    }
  }

  async getProjectsBySchool(schoolId: number): Promise<SelectProject[]> {
    try {
      return await db.select().from(projectsTable)
        .where(eq(projectsTable.schoolId, schoolId))
        .orderBy(desc(projectsTable.createdAt));
    } catch (error) {
      console.error('Error getting projects by school:', error);
      throw new Error('Database error');
    }
  }

  // Milestone operations
  async createMilestone(milestoneData: InsertMilestone): Promise<SelectMilestone> {
    try {
      const result = await db.insert(milestonesTable).values(milestoneData).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating milestone:', error);
      throw new Error('Database error');
    }
  }

  async getMilestonesByProject(projectId: number): Promise<SelectMilestone[]> {
    try {
      return await db.select().from(milestonesTable)
        .where(eq(milestonesTable.projectId, projectId))
        .orderBy(asc(milestonesTable.dueDate));
    } catch (error) {
      console.error('Error getting milestones by project:', error);
      throw new Error('Database error');
    }
  }

  async getMilestoneById(id: number): Promise<SelectMilestone | null> {
    try {
      const result = await db.select().from(milestonesTable).where(eq(milestonesTable.id, id)).limit(1);
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
        .select({ user: usersTable })
        .from(projectAssignments)
        .innerJoin(usersTable, eq(projectAssignments.studentId, usersTable.id))
        .where(eq(projectAssignments.projectId, projectId));

      return result.map(r => r.user);
    } catch (error) {
      console.error('Error getting assigned students:', error);
      throw new Error('Database error');
    }
  }

  // Component skills operations
  async getComponentSkillsByIds(ids: number[]): Promise<SelectComponentSkill[]> {
    try {
      if (ids.length === 0) return [];
      return await db.select().from(componentSkillsTable).where(inArray(componentSkillsTable.id, ids));
    } catch (error) {
      console.error('Error getting component skills:', error);
      throw new Error('Database error');
    }
  }

  async getAllComponentSkills(): Promise<SelectComponentSkill[]> {
    try {
      return await db.select().from(componentSkillsTable);
    } catch (error) {
      console.error('Error getting all component skills:', error);
      throw new Error('Database error');
    }
  }
}