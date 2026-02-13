import { eq, and, desc, asc, like, ilike, gte, lte, isNull, isNotNull } from "drizzle-orm";
import { db } from "../db";
import { PgTableWithColumns, PgColumn } from "drizzle-orm/pg-core";

/**
 * @deprecated Legacy base abstraction kept for backward compatibility.
 * New service code should use domain-specific repositories/services.
 *
 * Base service class to eliminate duplication across service implementations
 */

export interface BaseEntity {
  id: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface QueryOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  searchFields?: string[];
  filters?: Record<string, any>;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export abstract class BaseService<
  TTable extends PgTableWithColumns<any>,
  TEntity extends BaseEntity,
  TCreateInput = Partial<TEntity>,
  TUpdateInput = Partial<TEntity>
> {
  protected constructor(
    protected table: TTable,
    protected tableName: string
  ) {}

  /**
   * Create a new entity
   */
  async create(data: TCreateInput): Promise<TEntity> {
    try {
      const [result] = await db
        .insert(this.table)
        .values(data as any)
        .returning();
      
      return result as TEntity;
    } catch (error) {
      throw new Error(`Failed to create ${this.tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get entity by ID
   */
  async getById(id: number): Promise<TEntity | null> {
    try {
      const [result] = await db
        .select()
        .from(this.table)
        .where(eq(this.table.id, id))
        .limit(1);
      
      return (result as TEntity) || null;
    } catch (error) {
      throw new Error(`Failed to get ${this.tableName} by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update entity by ID
   */
  async updateById(id: number, data: TUpdateInput): Promise<TEntity | null> {
    try {
      const updateData = {
        ...data,
        updatedAt: new Date()
      } as any;

      const [result] = await db
        .update(this.table)
        .set(updateData)
        .where(eq(this.table.id, id))
        .returning();
      
      return (result as TEntity) || null;
    } catch (error) {
      throw new Error(`Failed to update ${this.tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete entity by ID
   */
  async deleteById(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(this.table)
        .where(eq(this.table.id, id));
      
      return result.rowCount > 0;
    } catch (error) {
      throw new Error(`Failed to delete ${this.tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all entities with optional filtering and pagination
   */
  async getAll(options: QueryOptions = {}): Promise<PaginatedResult<TEntity>> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        search,
        searchFields = [],
        filters = {}
      } = options;

      let query = db.select().from(this.table);

      // Apply filters
      const conditions = [];
      
      // Apply search
      if (search && searchFields.length > 0) {
        const searchConditions = searchFields.map(field => 
          ilike(this.table[field], `%${search}%`)
        );
        conditions.push(...searchConditions);
      }

      // Apply custom filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            // Handle array filters (IN clause)
            conditions.push(eq(this.table[key], value));
          } else if (typeof value === 'object') {
            // Handle object filters (range, comparison, etc.)
            if (value.gte !== undefined) {
              conditions.push(gte(this.table[key], value.gte));
            }
            if (value.lte !== undefined) {
              conditions.push(lte(this.table[key], value.lte));
            }
            if (value.like !== undefined) {
              conditions.push(like(this.table[key], value.like));
            }
            if (value.isNull === true) {
              conditions.push(isNull(this.table[key]));
            }
            if (value.isNotNull === true) {
              conditions.push(isNotNull(this.table[key]));
            }
          } else {
            conditions.push(eq(this.table[key], value));
          }
        }
      });

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      // Apply sorting
      const sortColumn = this.table[sortBy];
      if (sortColumn) {
        query = query.orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn));
      }

      // Count total records
      const countQuery = db
        .select({ count: db.raw('count(*)') })
        .from(this.table);
      
      if (conditions.length > 0) {
        countQuery.where(and(...conditions));
      }

      const [{ count: totalCount }] = await countQuery;
      const total = parseInt(totalCount);

      // Apply pagination
      const offset = (page - 1) * limit;
      query = query.limit(limit).offset(offset);

      const data = await query;

      return {
        data: data as TEntity[],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Failed to get ${this.tableName} list: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if entity exists by ID
   */
  async exists(id: number): Promise<boolean> {
    try {
      const [result] = await db
        .select({ id: this.table.id })
        .from(this.table)
        .where(eq(this.table.id, id))
        .limit(1);
      
      return !!result;
    } catch (error) {
      throw new Error(`Failed to check ${this.tableName} existence: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get entities by field
   */
  async getByField<K extends keyof TEntity>(
    field: K,
    value: TEntity[K]
  ): Promise<TEntity[]> {
    try {
      const results = await db
        .select()
        .from(this.table)
        .where(eq(this.table[field as string], value));
      
      return results as TEntity[];
    } catch (error) {
      throw new Error(`Failed to get ${this.tableName} by ${String(field)}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get single entity by field
   */
  async getOneByField<K extends keyof TEntity>(
    field: K,
    value: TEntity[K]
  ): Promise<TEntity | null> {
    try {
      const [result] = await db
        .select()
        .from(this.table)
        .where(eq(this.table[field as string], value))
        .limit(1);
      
      return (result as TEntity) || null;
    } catch (error) {
      throw new Error(`Failed to get ${this.tableName} by ${String(field)}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Bulk create entities
   */
  async createMany(data: TCreateInput[]): Promise<TEntity[]> {
    try {
      const results = await db
        .insert(this.table)
        .values(data as any[])
        .returning();
      
      return results as TEntity[];
    } catch (error) {
      throw new Error(`Failed to bulk create ${this.tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Bulk update entities
   */
  async updateMany(
    conditions: Record<string, any>,
    data: TUpdateInput
  ): Promise<TEntity[]> {
    try {
      const whereConditions = Object.entries(conditions).map(([key, value]) =>
        eq(this.table[key], value)
      );

      const updateData = {
        ...data,
        updatedAt: new Date()
      } as any;

      const results = await db
        .update(this.table)
        .set(updateData)
        .where(and(...whereConditions))
        .returning();
      
      return results as TEntity[];
    } catch (error) {
      throw new Error(`Failed to bulk update ${this.tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Bulk delete entities
   */
  async deleteMany(conditions: Record<string, any>): Promise<number> {
    try {
      const whereConditions = Object.entries(conditions).map(([key, value]) =>
        eq(this.table[key], value)
      );

      const result = await db
        .delete(this.table)
        .where(and(...whereConditions));
      
      return result.rowCount;
    } catch (error) {
      throw new Error(`Failed to bulk delete ${this.tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Count entities with optional filters
   */
  async count(filters: Record<string, any> = {}): Promise<number> {
    try {
      let query = db
        .select({ count: db.raw('count(*)') })
        .from(this.table);

      const conditions = Object.entries(filters).map(([key, value]) =>
        eq(this.table[key], value)
      );

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const [{ count }] = await query;
      return parseInt(count);
    } catch (error) {
      throw new Error(`Failed to count ${this.tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search entities with full-text search
   */
  async search(
    searchTerm: string,
    searchFields: string[],
    options: QueryOptions = {}
  ): Promise<PaginatedResult<TEntity>> {
    return this.getAll({
      ...options,
      search: searchTerm,
      searchFields
    });
  }

  /**
   * Get entities with relationships (to be implemented by subclasses)
   */
  protected async getWithRelations(id: number): Promise<TEntity | null> {
    // Default implementation - just get by ID
    return this.getById(id);
  }

  /**
   * Validate entity data (to be implemented by subclasses)
   */
  protected async validateData(data: TCreateInput | TUpdateInput): Promise<void> {
    // Default implementation - no validation
    return;
  }

  /**
   * Pre-create hook (to be implemented by subclasses)
   */
  protected async beforeCreate(data: TCreateInput): Promise<TCreateInput> {
    return data;
  }

  /**
   * Post-create hook (to be implemented by subclasses)
   */
  protected async afterCreate(entity: TEntity): Promise<void> {
    // Default implementation - no action
  }

  /**
   * Pre-update hook (to be implemented by subclasses)
   */
  protected async beforeUpdate(id: number, data: TUpdateInput): Promise<TUpdateInput> {
    return data;
  }

  /**
   * Post-update hook (to be implemented by subclasses)
   */
  protected async afterUpdate(entity: TEntity): Promise<void> {
    // Default implementation - no action
  }

  /**
   * Pre-delete hook (to be implemented by subclasses)
   */
  protected async beforeDelete(id: number): Promise<void> {
    // Default implementation - no action
  }

  /**
   * Post-delete hook (to be implemented by subclasses)
   */
  protected async afterDelete(id: number): Promise<void> {
    // Default implementation - no action
  }
}
