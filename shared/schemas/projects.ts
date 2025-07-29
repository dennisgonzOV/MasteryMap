// Projects domain schema
import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  serial,
  integer,
  boolean,
  decimal,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { InferSelectModel } from 'drizzle-orm';
import { users } from './auth';
import { schools } from './common';

// Projects and Milestones
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  description: text("description"),
  teacherId: integer("teacher_id").references(() => users.id),
  schoolId: integer("school_id").references(() => schools.id),
  componentSkillIds: jsonb("component_skill_ids").$type<number[]>().default([]),
  bestStandardIds: jsonb("best_standard_ids").$type<number[]>().default([]),
  status: varchar("status", { enum: ["draft", "active", "completed", "archived"] }).default("draft"),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const milestones = pgTable("milestones", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  title: varchar("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  order: integer("order").default(0),
  aiGenerated: boolean("ai_generated").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Project Teams
export const projectTeams = pgTable("project_teams", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  name: varchar("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projectTeamMembers = pgTable("project_team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").references(() => projectTeams.id, { onDelete: "cascade" }).notNull(),
  studentId: integer("student_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: varchar("role", { length: 50 }).default("member"),
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Student-Project Assignments (Legacy - keeping for backward compatibility)
export const projectAssignments = pgTable("project_assignments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  studentId: integer("student_id").references(() => users.id),
  teamId: integer("team_id").references(() => projectTeams.id),
  assignedAt: timestamp("assigned_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  progress: decimal("progress").default("0"),
});

// Relations
export const projectsRelations = relations(projects, ({ one, many }) => ({
  teacher: one(users, {
    fields: [projects.teacherId],
    references: [users.id],
  }),
  school: one(schools, {
    fields: [projects.schoolId],
    references: [schools.id],
  }),
  milestones: many(milestones),
  assignments: many(projectAssignments),
  teams: many(projectTeams),
}));

export const milestonesRelations = relations(milestones, ({ one }) => ({
  project: one(projects, {
    fields: [milestones.projectId],
    references: [projects.id],
  }),
}));

export const projectTeamsRelations = relations(projectTeams, ({ one, many }) => ({
  project: one(projects, {
    fields: [projectTeams.projectId],
    references: [projects.id],
  }),
  members: many(projectTeamMembers),
}));

export const projectTeamMembersRelations = relations(projectTeamMembers, ({ one }) => ({
  team: one(projectTeams, {
    fields: [projectTeamMembers.teamId],
    references: [projectTeams.id],
  }),
  student: one(users, {
    fields: [projectTeamMembers.studentId],
    references: [users.id],
  }),
}));

export const projectAssignmentsRelations = relations(projectAssignments, ({ one }) => ({
  project: one(projects, {
    fields: [projectAssignments.projectId],
    references: [projects.id],
  }),
  student: one(users, {
    fields: [projectAssignments.studentId],
    references: [users.id],
  }),
  team: one(projectTeams, {
    fields: [projectAssignments.teamId],
    references: [projectTeams.id],
  }),
}));

// Types
export type Project = InferSelectModel<typeof projects>;
export type Milestone = InferSelectModel<typeof milestones>;
export type ProjectTeam = InferSelectModel<typeof projectTeams>;
export type ProjectTeamMember = InferSelectModel<typeof projectTeamMembers>;
export type ProjectAssignment = InferSelectModel<typeof projectAssignments>;

// Insert schemas
export const insertProjectSchema = createInsertSchema(projects);
export const insertMilestoneSchema = createInsertSchema(milestones);
export const insertProjectTeamSchema = createInsertSchema(projectTeams);
export const insertProjectTeamMemberSchema = createInsertSchema(projectTeamMembers);
export const insertProjectAssignmentSchema = createInsertSchema(projectAssignments);

// Insert types
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type InsertMilestone = z.infer<typeof insertMilestoneSchema>;
export type InsertProjectTeam = z.infer<typeof insertProjectTeamSchema>;
export type InsertProjectTeamMember = z.infer<typeof insertProjectTeamMemberSchema>;
export type InsertProjectAssignment = z.infer<typeof insertProjectAssignmentSchema>;

// Select types for compatibility
export type SelectProject = Project;
export type SelectMilestone = Milestone;
export type SelectProjectTeam = ProjectTeam;
export type SelectProjectTeamMember = ProjectTeamMember;
export type SelectProjectAssignment = ProjectAssignment;