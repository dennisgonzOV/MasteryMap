import { z } from "zod";
import { timestamp, serial, integer, varchar, text, boolean } from "drizzle-orm/pg-core";

/**
 * Base interfaces and types to eliminate duplication across database schemas
 */

// Base entity interface - common fields across most tables
export interface BaseEntity {
  id: number;
  createdAt?: Date | null;
}

// Base entity with updates
export interface BaseEntityWithUpdates extends BaseEntity {
  updatedAt?: Date | null;
}

// Content entity interface - entities with title and description
export interface BaseContentEntity extends BaseEntity {
  title: string;
  description?: string;
}

// User-associated entity interface
export interface BaseUserAssociatedEntity extends BaseEntity {
  userId: number;
}

// Student-associated entity interface
export interface BaseStudentAssociatedEntity extends BaseEntity {
  studentId: number;
}

// Teacher-associated entity interface
export interface BaseTeacherAssociatedEntity extends BaseEntity {
  teacherId: number;
}

// Assessment-associated entity interface
export interface BaseAssessmentAssociatedEntity extends BaseEntity {
  assessmentId: number;
}

// AI-generated entity interface
export interface BaseAIGeneratedEntity extends BaseEntity {
  aiGenerated?: boolean;
}

// Hierarchical entity interface
export interface BaseHierarchicalEntity extends BaseContentEntity {
  parentId?: number;
  order?: number;
}

/**
 * Common database column definitions to reduce duplication
 */
export const baseEntityColumns = {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at").defaultNow(),
};

export const baseEntityWithUpdatesColumns = {
  ...baseEntityColumns,
  updatedAt: timestamp("updated_at").defaultNow(),
};

export const baseContentColumns = {
  title: varchar("title").notNull(),
  description: text("description"),
};

export const baseAIGeneratedColumns = {
  aiGenerated: boolean("ai_generated").default(false),
};

/**
 * Common enum values used across multiple tables
 */
export const RUBRIC_LEVELS = ["emerging", "developing", "proficient", "applying"] as const;
export const USER_ROLES = ["admin", "teacher", "student"] as const;
export const PROJECT_STATUSES = ["draft", "active", "completed", "archived"] as const;
export const ASSESSMENT_TYPES = ["teacher", "self-evaluation"] as const;
export const CREDENTIAL_TYPES = ["sticker", "badge", "plaque"] as const;
export const INCIDENT_SEVERITIES = ["low", "medium", "high", "critical"] as const;
export const NOTIFICATION_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

/**
 * Base Zod schemas for validation
 */
export const baseEntitySchema = z.object({
  id: z.number().int().positive(),
  createdAt: z.date().optional(),
});

export const baseEntityWithUpdatesSchema = baseEntitySchema.extend({
  updatedAt: z.date().optional(),
});

export const baseContentSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
});

export const baseAIGeneratedSchema = z.object({
  aiGenerated: z.boolean().default(false),
});

export const rubricLevelSchema = z.enum(RUBRIC_LEVELS);
export const userRoleSchema = z.enum(USER_ROLES);
export const projectStatusSchema = z.enum(PROJECT_STATUSES);
export const assessmentTypeSchema = z.enum(ASSESSMENT_TYPES);
export const credentialTypeSchema = z.enum(CREDENTIAL_TYPES);

/**
 * Common validation patterns
 */
// Note: emailSchema removed - system now uses username-based authentication
export const passwordSchema = z.string().min(8);
export const positiveIntSchema = z.number().int().positive();
export const nonNegativeIntSchema = z.number().int().min(0);
export const percentageSchema = z.number().min(0).max(100);
export const urlSchema = z.string().url().optional();

/**
 * Array validation schemas
 */
export const idArraySchema = z.array(z.number().int().positive()).default([]);
export const stringArraySchema = z.array(z.string()).default([]);

/**
 * Date validation schemas
 */
export const futureDateSchema = z.date().refine(date => date > new Date(), {
  message: "Date must be in the future"
});

export const pastDateSchema = z.date().refine(date => date < new Date(), {
  message: "Date must be in the past"
});

/**
 * File upload schemas
 */
export const fileTypeSchema = z.enum(["image", "video", "document", "audio", "other"]);
export const imageExtensionSchema = z.enum(["jpg", "jpeg", "png", "gif", "svg", "webp"]);
export const documentExtensionSchema = z.enum(["pdf", "doc", "docx", "txt", "rtf"]);

/**
 * Common response interfaces
 */
export interface BaseResponse {
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ErrorResponse extends BaseResponse {
  success: false;
  error: string;
  details?: unknown;
}

export interface SuccessResponse<T = unknown> extends BaseResponse {
  success: true;
  data?: T;
}

/**
 * Common query interfaces
 */
export interface BaseQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface BaseFilter {
  startDate?: Date;
  endDate?: Date;
  status?: string;
  userId?: number;
}

/**
 * Type utilities
 */
export type OptionalExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;
export type RequiredExcept<T, K extends keyof T> = Required<T> & Partial<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Database relationship types
 */
export type EntityRelation<T> = T | null;
export type EntityListRelation<T> = T[];
export type OptionalEntityRelation<T> = T | null | undefined;