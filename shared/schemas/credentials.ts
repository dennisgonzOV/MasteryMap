// Credentials domain schema
import {
  pgTable,
  text,
  varchar,
  timestamp,
  serial,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { InferSelectModel } from 'drizzle-orm';
import { users } from './auth';
import { componentSkills, competencies } from './common';

// Credentials System
export const credentials = pgTable("credentials", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => users.id),
  type: varchar("type", { enum: ["sticker", "badge", "plaque"] }).notNull(),
  componentSkillId: integer("component_skill_id").references(() => componentSkills.id), // For stickers
  competencyId: integer("competency_id").references(() => competencies.id), // For badges
  subjectArea: varchar("subject_area"), // For plaques
  title: varchar("title").notNull(),
  description: text("description"),
  iconUrl: varchar("icon_url"),
  awardedAt: timestamp("awarded_at").defaultNow(),
  awardedBy: integer("awarded_by").references(() => users.id),
  approvedBy: integer("approved_by").references(() => users.id),
});

// Relations
export const credentialsRelations = relations(credentials, ({ one }) => ({
  student: one(users, {
    fields: [credentials.studentId],
    references: [users.id],
  }),
  componentSkill: one(componentSkills, {
    fields: [credentials.componentSkillId],
    references: [componentSkills.id],
  }),
  competency: one(competencies, {
    fields: [credentials.competencyId],
    references: [competencies.id],
  }),
  awardedBy: one(users, {
    fields: [credentials.awardedBy],
    references: [users.id],
  }),
  approvedBy: one(users, {
    fields: [credentials.approvedBy],
    references: [users.id],
  }),
}));

// Types
export type Credential = InferSelectModel<typeof credentials>;

// Insert schemas
export const insertCredentialSchema = createInsertSchema(credentials);

// Insert types
export type InsertCredential = z.infer<typeof insertCredentialSchema>;

// Select types for compatibility
export type SelectCredential = Credential;