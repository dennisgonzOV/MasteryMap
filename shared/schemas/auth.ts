// Authentication domain schema
import {
  pgTable,
  text,
  varchar,
  timestamp,
  serial,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { InferSelectModel } from 'drizzle-orm';
import { schools } from './common';

// User storage table with authentication support
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email").unique().notNull(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { enum: ["admin", "teacher", "student"] }).notNull().default("student"),
  schoolId: integer("school_id").references(() => schools.id),
  emailConfirmed: boolean("email_confirmed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Authentication tokens table
export const authTokens = pgTable("auth_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  token: varchar("token").notNull().unique(),
  type: varchar("type", { enum: ["refresh", "reset", "confirmation"] }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Zod schemas for forms and validation  
const baseInsertUserSchema = createInsertSchema(users);
export const selectUserSchema = z.object({
  id: z.number(),
  email: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  role: z.enum(["admin", "teacher", "student"]),
  schoolId: z.number().nullable(),
  profileImageUrl: z.string().nullable(),
  emailConfirmed: z.boolean().nullable(),
  createdAt: z.date().nullable(),
  updatedAt: z.date().nullable(),
});

// Login schema for frontend forms
export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

// Registration schema for frontend forms  
export const registerSchema = baseInsertUserSchema.pick({
  email: true,
  password: true,
  firstName: true,
  lastName: true,
  role: true,
  schoolId: true,
}).extend({
  password: z.string().min(8, "Password must be at least 8 characters"),
  email: z.string().email("Invalid email format"),
});

// Relations
export const authTokensRelations = relations(authTokens, ({ one }) => ({
  user: one(users, {
    fields: [authTokens.userId],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  school: one(schools, {
    fields: [users.schoolId],
    references: [schools.id],
  }),
  authTokens: many(authTokens),
}));

// Types
export type User = InferSelectModel<typeof users>;
export type AuthToken = InferSelectModel<typeof authTokens>;

// Schema exports for backend usage
export const insertUserSchema = baseInsertUserSchema;
export const insertAuthTokenSchema = createInsertSchema(authTokens);

// Insert types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertAuthToken = z.infer<typeof insertAuthTokenSchema>;

// Legacy compatibility types
export type UpsertUser = InsertUser;
export type SelectUser = User;
export type SelectAuthToken = AuthToken;