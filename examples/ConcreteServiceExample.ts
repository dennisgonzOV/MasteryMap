/**
 * Example concrete service implementations using BaseService
 * This demonstrates how to eliminate CRUD duplication across services
 */

import { BaseService } from '../server/services/BaseService';
import { projects, milestones, assessments, submissions } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

// Type definitions (would normally be in shared/types.ts)
type Project = typeof projects.$inferSelect;
type CreateProjectInput = typeof projects.$inferInsert;
type UpdateProjectInput = Partial<CreateProjectInput>;

type Milestone = typeof milestones.$inferSelect;
type CreateMilestoneInput = typeof milestones.$inferInsert;
type UpdateMilestoneInput = Partial<CreateMilestoneInput>;

/**
 * Project Service - extends BaseService to eliminate CRUD duplication
 * Before: 200+ lines of repeated CRUD operations
 * After: 30 lines of business-specific logic only
 */
export class ProjectService extends BaseService<typeof projects, Project, CreateProjectInput, UpdateProjectInput> {
  constructor() {
    super(projects, 'project');
  }

  // Only project-specific methods needed - CRUD is inherited
  async getByTeacher(teacherId: number): Promise<Project[]> {
    return this.getByField('teacherId', teacherId);
  }

  async getBySchool(schoolId: number): Promise<Project[]> {
    return this.getByField('schoolId', schoolId);
  }

  async getActiveProjects(): Promise<Project[]> {
    return this.getByField('status', 'active');
  }

  async searchProjects(query: string, teacherId?: number): Promise<Project[]> {
    const filters = teacherId ? { teacherId } : {};
    const result = await this.search(query, ['title', 'description'], { filters });
    return result.data;
  }

  // Override hooks for business logic
  protected async beforeCreate(data: CreateProjectInput): Promise<CreateProjectInput> {
    // Validate teacher permissions, set defaults, etc.
    return {
      ...data,
      status: data.status || 'draft',
      componentSkillIds: data.componentSkillIds || [],
      bestStandardIds: data.bestStandardIds || []
    };
  }

  protected async afterCreate(project: Project): Promise<void> {
    // Trigger notifications, create default milestones, etc.
    console.log(`Project created: ${project.title} (ID: ${project.id})`);
  }
}

/**
 * Milestone Service - another example of BaseService usage
 */
export class MilestoneService extends BaseService<typeof milestones, Milestone, CreateMilestoneInput, UpdateMilestoneInput> {
  constructor() {
    super(milestones, 'milestone');
  }

  async getByProject(projectId: number): Promise<Milestone[]> {
    return this.getByField('projectId', projectId);
  }

  async getOrderedByProject(projectId: number): Promise<Milestone[]> {
    const result = await this.getAll({
      filters: { projectId },
      sortBy: 'order',
      sortOrder: 'asc'
    });
    return result.data;
  }

  async getNextOrder(projectId: number): Promise<number> {
    const milestones = await this.getByProject(projectId);
    return Math.max(...milestones.map(m => m.order || 0), 0) + 1;
  }

  protected async beforeCreate(data: CreateMilestoneInput): Promise<CreateMilestoneInput> {
    // Auto-assign order if not provided
    if (data.order === undefined && data.projectId) {
      data.order = await this.getNextOrder(data.projectId);
    }
    return data;
  }
}

/**
 * Usage comparison:
 * 
 * OLD WAY (repeated across 8+ services):
 * ```typescript
 * class ProjectService {
 *   async create(data: CreateProjectInput): Promise<Project> {
 *     try {
 *       const [result] = await db.insert(projects).values(data).returning();
 *       return result;
 *     } catch (error) {
 *       throw new Error(`Failed to create project: ${error.message}`);
 *     }
 *   }
 * 
 *   async getById(id: number): Promise<Project | null> {
 *     try {
 *       const [result] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
 *       return result || null;
 *     } catch (error) {
 *       throw new Error(`Failed to get project: ${error.message}`);
 *     }
 *   }
 * 
 *   async updateById(id: number, data: UpdateProjectInput): Promise<Project | null> {
 *     try {
 *       const [result] = await db.update(projects).set({...data, updatedAt: new Date()}).where(eq(projects.id, id)).returning();
 *       return result || null;
 *     } catch (error) {
 *       throw new Error(`Failed to update project: ${error.message}`);
 *     }
 *   }
 * 
 *   async deleteById(id: number): Promise<boolean> {
 *     try {
 *       const result = await db.delete(projects).where(eq(projects.id, id));
 *       return result.rowCount > 0;
 *     } catch (error) {
 *       throw new Error(`Failed to delete project: ${error.message}`);
 *     }
 *   }
 * 
 *   async getAll(filters?: any): Promise<Project[]> {
 *     try {
 *       let query = db.select().from(projects);
 *       // ... 20+ lines of filtering logic
 *       return await query;
 *     } catch (error) {
 *       throw new Error(`Failed to get projects: ${error.message}`);
 *     }
 *   }
 * 
 *   // ... 10+ more similar methods
 * }
 * ```
 * 
 * NEW WAY (using BaseService):
 * ```typescript
 * class ProjectService extends BaseService<typeof projects, Project, CreateProjectInput, UpdateProjectInput> {
 *   constructor() { super(projects, 'project'); }
 *   
 *   // All CRUD operations inherited automatically
 *   // Only business-specific methods needed:
 *   async getByTeacher(teacherId: number) { return this.getByField('teacherId', teacherId); }
 *   async getActiveProjects() { return this.getByField('status', 'active'); }
 * }
 * ```
 * 
 * Result: 200+ lines reduced to 30 lines (85% reduction)
 */