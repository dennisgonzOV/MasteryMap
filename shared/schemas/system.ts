// System domain schema - Notifications, Safety, and System-wide entities
import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  serial,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { InferSelectModel } from 'drizzle-orm';
import { users } from './auth';
import { assessments } from './assessments';
import { componentSkills } from './common';

// Safety and Monitoring
export const safetyIncidents = pgTable("safety_incidents", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  teacherId: integer("teacher_id").references(() => users.id, { onDelete: "cascade" }),
  assessmentId: integer("assessment_id").references(() => assessments.id, { onDelete: "cascade" }),
  componentSkillId: integer("component_skill_id").references(() => componentSkills.id, { onDelete: "cascade" }),
  incidentType: varchar("incident_type", { length: 100 }).notNull(),
  message: text("message").notNull(),
  conversationHistory: jsonb("conversation_history"),
  severity: varchar("severity", { length: 20 }).default("medium"),
  resolved: boolean("resolved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: integer("resolved_by").references(() => users.id),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  metadata: jsonb("metadata"),
  read: boolean("read").default(false),
  priority: varchar("priority", { length: 20 }).default("medium"),
  createdAt: timestamp("created_at").defaultNow(),
  readAt: timestamp("read_at"),
});

// Relations
export const safetyIncidentsRelations = relations(safetyIncidents, ({ one }) => ({
  student: one(users, {
    fields: [safetyIncidents.studentId],
    references: [users.id],
  }),
  teacher: one(users, {
    fields: [safetyIncidents.teacherId],
    references: [users.id],
  }),
  assessment: one(assessments, {
    fields: [safetyIncidents.assessmentId],
    references: [assessments.id],
  }),
  componentSkill: one(componentSkills, {
    fields: [safetyIncidents.componentSkillId],
    references: [componentSkills.id],
  }),
  resolvedBy: one(users, {
    fields: [safetyIncidents.resolvedBy],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// Types
export type SafetyIncident = InferSelectModel<typeof safetyIncidents>;
export type Notification = InferSelectModel<typeof notifications>;

// Insert schemas
export const insertSafetyIncidentSchema = createInsertSchema(safetyIncidents);
export const insertNotificationSchema = createInsertSchema(notifications);

// Insert types
export type InsertSafetyIncident = z.infer<typeof insertSafetyIncidentSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Select types for compatibility
export type SelectSafetyIncident = SafetyIncident;
export type SelectNotification = Notification;