// Common schema definitions and utilities
import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  decimal,
  uuid,
  json,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { InferSelectModel } from 'drizzle-orm';

// Session storage table - Required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Schools table - Core organizational entity
export const schools = pgTable("schools", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  address: varchar("address"),
  city: varchar("city"),
  state: varchar("state"),
  zipCode: varchar("zip_code"),
  createdAt: timestamp("created_at").defaultNow(),
});

// XQ Competency Framework - 3-Level Hierarchy
export const learnerOutcomes = pgTable("learner_outcomes", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const competencies = pgTable("competencies", {
  id: serial("id").primaryKey(),
  learnerOutcomeId: integer("learner_outcome_id").references(() => learnerOutcomes.id),
  name: varchar("name").notNull(),
  description: text("description"),
  category: varchar("category"), // e.g., "core", "subject-specific"
  createdAt: timestamp("created_at").defaultNow(),
});

export const componentSkills = pgTable("component_skills", {
  id: serial("id").primaryKey(),
  competencyId: integer("competency_id").references(() => competencies.id),
  name: varchar("name").notNull(),
  rubricLevels: jsonb("rubric_levels"), // JSON object with emerging, developing, proficient, applying
  createdAt: timestamp("created_at").defaultNow(),
});

// B.E.S.T. Standards table
export const bestStandards = pgTable("best_standards", {
  id: serial("id").primaryKey(),
  benchmarkNumber: varchar("benchmark_number").notNull(),
  description: text("description").notNull(),
  ideaStandard: varchar("idea_standard"),
  subject: varchar("subject"),
  grade: varchar("grade"),
  bodyOfKnowledge: varchar("body_of_knowledge"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Common types
export type School = InferSelectModel<typeof schools>;
export type LearnerOutcome = InferSelectModel<typeof learnerOutcomes>;
export type Competency = InferSelectModel<typeof competencies>;
export type ComponentSkill = InferSelectModel<typeof componentSkills>;
export type BestStandard = InferSelectModel<typeof bestStandards>;

// Insert schemas
export const insertSchoolSchema = createInsertSchema(schools);
export const insertLearnerOutcomeSchema = createInsertSchema(learnerOutcomes);
export const insertCompetencySchema = createInsertSchema(competencies);
export const insertComponentSkillSchema = createInsertSchema(componentSkills);
export const insertBestStandardSchema = createInsertSchema(bestStandards);

// Insert types
export type InsertSchool = z.infer<typeof insertSchoolSchema>;
export type InsertLearnerOutcome = z.infer<typeof insertLearnerOutcomeSchema>;
export type InsertCompetency = z.infer<typeof insertCompetencySchema>;
export type InsertComponentSkill = z.infer<typeof insertComponentSkillSchema>;
export type InsertBestStandard = z.infer<typeof insertBestStandardSchema>;

// Select types for compatibility
export type SelectSchool = School;
export type SelectLearnerOutcome = LearnerOutcome;
export type SelectCompetency = Competency;
export type SelectComponentSkill = ComponentSkill;
export type SelectBestStandard = BestStandard;