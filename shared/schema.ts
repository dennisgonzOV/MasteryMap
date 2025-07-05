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
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table with authentication support
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email").unique().notNull(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { enum: ["admin", "teacher", "student"] }).notNull().default("student"),
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

// XQ 3-Level Hierarchy: Learner Outcomes → Competencies → Component Skills
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

// Removed legacy outcomes table - using 3-level hierarchy instead

// Projects and Milestones
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  description: text("description"),
  teacherId: integer("teacher_id").references(() => users.id),
  competencyIds: jsonb("competency_ids"), // Array of competency IDs (legacy)
  learnerOutcomes: jsonb("learner_outcomes"), // Array of {outcomeId, competencyIds: [], componentSkillIds: []} objects
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

// Student-Project Assignments
export const projectAssignments = pgTable("project_assignments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  studentId: integer("student_id").references(() => users.id),
  assignedAt: timestamp("assigned_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  progress: decimal("progress").default("0"), // 0-100
});

// Assessments and Submissions
export const assessments = pgTable("assessments", {
  id: serial("id").primaryKey(),
  milestoneId: integer("milestone_id").references(() => milestones.id),
  title: varchar("title").notNull(),
  description: text("description"),
  questions: jsonb("questions"), // Array of question objects
  rubricId: integer("rubric_id"),
  aiGenerated: boolean("ai_generated").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  assessmentId: integer("assessment_id").references(() => assessments.id),
  studentId: integer("student_id").references(() => users.id),
  responses: jsonb("responses"), // Array of response objects
  artifacts: jsonb("artifacts"), // Array of file URLs/paths
  submittedAt: timestamp("submitted_at").defaultNow(),
  gradedAt: timestamp("graded_at"),
  feedback: text("feedback"),
  aiGeneratedFeedback: boolean("ai_generated_feedback").default(false),
});

export const grades = pgTable("grades", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").references(() => submissions.id),
  componentSkillId: integer("component_skill_id").references(() => componentSkills.id),
  rubricLevel: varchar("rubric_level", { enum: ["emerging", "developing", "proficient", "applying"] }),
  score: decimal("score"),
  feedback: text("feedback"),
  gradedBy: integer("graded_by").references(() => users.id),
  gradedAt: timestamp("graded_at").defaultNow(),
});

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
  approvedBy: integer("approved_by").references(() => users.id),
});

// Digital Portfolio
export const portfolioArtifacts = pgTable("portfolio_artifacts", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => users.id),
  submissionId: integer("submission_id").references(() => submissions.id),
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
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  assignments: many(projectAssignments),
  submissions: many(submissions),
  credentials: many(credentials),
  portfolioArtifacts: many(portfolioArtifacts),
  portfolios: many(portfolios),
  authTokens: many(authTokens),
}));

export const authTokensRelations = relations(authTokens, ({ one }) => ({
  user: one(users, {
    fields: [authTokens.userId],
    references: [users.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  teacher: one(users, {
    fields: [projects.teacherId],
    references: [users.id],
  }),
  milestones: many(milestones),
  assignments: many(projectAssignments),
}));

export const milestonesRelations = relations(milestones, ({ one, many }) => ({
  project: one(projects, {
    fields: [milestones.projectId],
    references: [projects.id],
  }),
  assessments: many(assessments),
}));

export const assessmentsRelations = relations(assessments, ({ one, many }) => ({
  milestone: one(milestones, {
    fields: [assessments.milestoneId],
    references: [milestones.id],
  }),
  submissions: many(submissions),
}));

export const submissionsRelations = relations(submissions, ({ one, many }) => ({
  assessment: one(assessments, {
    fields: [submissions.assessmentId],
    references: [assessments.id],
  }),
  student: one(users, {
    fields: [submissions.studentId],
    references: [users.id],
  }),
  grades: many(grades),
  portfolioArtifacts: many(portfolioArtifacts),
}));

// 3-Level Hierarchy Relations
export const learnerOutcomesRelations = relations(learnerOutcomes, ({ many }) => ({
  competencies: many(competencies),
}));

export const competenciesRelations = relations(competencies, ({ one, many }) => ({
  learnerOutcome: one(learnerOutcomes, {
    fields: [competencies.learnerOutcomeId],
    references: [learnerOutcomes.id],
  }),
  componentSkills: many(componentSkills),
  // Legacy outcomes relation removed
  credentials: many(credentials),
}));

export const componentSkillsRelations = relations(componentSkills, ({ one }) => ({
  competency: one(competencies, {
    fields: [componentSkills.competencyId],
    references: [competencies.id],
  }),
}));

// Legacy relations removed - using 3-level hierarchy instead

// Type exports
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type InsertMilestone = typeof milestones.$inferInsert;
export type Milestone = typeof milestones.$inferSelect;
export type InsertAssessment = typeof assessments.$inferInsert;
export type Assessment = typeof assessments.$inferSelect;
export type InsertSubmission = typeof submissions.$inferInsert;
export type Submission = typeof submissions.$inferSelect;
export type InsertCredential = typeof credentials.$inferInsert;
export type Credential = typeof credentials.$inferSelect;
export type InsertPortfolioArtifact = typeof portfolioArtifacts.$inferInsert;
export type PortfolioArtifact = typeof portfolioArtifacts.$inferSelect;
export type InsertPortfolio = typeof portfolios.$inferInsert;
export type Portfolio = typeof portfolios.$inferSelect;
// 3-Level Hierarchy Types
export type LearnerOutcome = typeof learnerOutcomes.$inferSelect;
export type InsertLearnerOutcome = typeof learnerOutcomes.$inferInsert;
export type Competency = typeof competencies.$inferSelect;
export type InsertCompetency = typeof competencies.$inferInsert;
export type ComponentSkill = typeof componentSkills.$inferSelect;
export type InsertComponentSkill = typeof componentSkills.$inferInsert;

// Other types
export type Grade = typeof grades.$inferSelect;
export type ProjectAssignment = typeof projectAssignments.$inferSelect;
export type AuthToken = typeof authTokens.$inferSelect;
export type InsertAuthToken = typeof authTokens.$inferInsert;

// Zod schemas
export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  dueDate: z.coerce.date().optional(),
});

export const insertMilestoneSchema = createInsertSchema(milestones).omit({
  id: true,
  createdAt: true,
});

export const insertAssessmentSchema = createInsertSchema(assessments).omit({
  id: true,
  createdAt: true,
});

export const insertSubmissionSchema = createInsertSchema(submissions).omit({
  id: true,
  submittedAt: true,
  gradedAt: true,
});

export const insertCredentialSchema = createInsertSchema(credentials).omit({
  id: true,
  awardedAt: true,
});

export const insertPortfolioArtifactSchema = createInsertSchema(portfolioArtifacts).omit({
  id: true,
  createdAt: true,
});

// Auth schemas
export const registerSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  emailConfirmed: true,
}).extend({
  password: createInsertSchema(users).shape.password.min(8),
});

export const loginSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
