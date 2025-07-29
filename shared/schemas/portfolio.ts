// Portfolio domain schema
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
import { submissions } from './assessments';

// Digital Portfolio
export const portfolioArtifacts = pgTable("portfolio_artifacts", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => users.id),
  submissionId: integer("submission_id").references(() => submissions.id),
  projectId: integer("project_id"), // Will reference projects when needed
  title: varchar("title").notNull(),
  description: text("description"),
  artifactUrl: varchar("artifact_url"),
  artifactType: varchar("artifact_type"), // image, video, document, etc.
  tags: jsonb("tags"), // Array of tags
  isPublic: boolean("is_public").default(false),
  isApproved: boolean("is_approved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const portfolios = pgTable("portfolios", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => users.id),
  title: varchar("title").notNull(),
  description: text("description"),
  qrCode: varchar("qr_code").unique(),
  publicUrl: varchar("public_url").unique(),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const portfolioArtifactsRelations = relations(portfolioArtifacts, ({ one }) => ({
  student: one(users, {
    fields: [portfolioArtifacts.studentId],
    references: [users.id],
  }),
  submission: one(submissions, {
    fields: [portfolioArtifacts.submissionId],
    references: [submissions.id],
  }),
}));

export const portfoliosRelations = relations(portfolios, ({ one, many }) => ({
  student: one(users, {
    fields: [portfolios.studentId],
    references: [users.id],
  }),
}));

// Types
export type PortfolioArtifact = InferSelectModel<typeof portfolioArtifacts>;
export type Portfolio = InferSelectModel<typeof portfolios>;

// Insert schemas
export const insertPortfolioArtifactSchema = createInsertSchema(portfolioArtifacts);
export const insertPortfolioSchema = createInsertSchema(portfolios);

// Insert types
export type InsertPortfolioArtifact = z.infer<typeof insertPortfolioArtifactSchema>;
export type InsertPortfolio = z.infer<typeof insertPortfolioSchema>;

// Select types for compatibility
export type SelectPortfolioArtifact = PortfolioArtifact;
export type SelectPortfolio = Portfolio;