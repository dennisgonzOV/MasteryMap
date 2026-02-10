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
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { InferSelectModel } from 'drizzle-orm';

// Define UserRole enum for type safety
export enum UserRole {
  ADMIN = 'admin',
  TEACHER = 'teacher',
  STUDENT = 'student'
}

export enum UserTier {
  FREE = 'free',
  ENTERPRISE = 'enterprise'
}

// Role utilities
export const USER_ROLES = Object.values(UserRole);
export const ROLE_HIERARCHY = {
  [UserRole.ADMIN]: 3,
  [UserRole.TEACHER]: 2,
  [UserRole.STUDENT]: 1,
} as const;

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

// Schools table
export const schools = pgTable("schools", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  address: varchar("address"),
  city: varchar("city"),
  state: varchar("state"),
  zipCode: varchar("zip_code"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User storage table with authentication support
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  schoolName: varchar("school_name", { length: 255 }),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default(UserRole.STUDENT),
  schoolId: integer("school_id").references(() => schools.id),
  tier: varchar("tier", { enum: ["free", "enterprise"] }).notNull().default("free"),
  projectGenerationCount: integer("project_generation_count").default(0),
  lastProjectGenerationDate: timestamp("last_project_generation_date"),
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

// Grade level enum for K-12
export const gradeLevelEnum = ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"] as const;
export type GradeLevel = typeof gradeLevelEnum[number];

// Project duration enum
export const projectDurationEnum = ["1-2 weeks", "3-4 weeks", "5-6 weeks", "7-8 weeks", "9+ weeks"] as const;
export type ProjectDuration = typeof projectDurationEnum[number];

// Projects and Milestones
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  description: text("description"),
  teacherId: integer("teacher_id").references(() => users.id),
  schoolId: integer("school_id").references(() => schools.id), // Add school association
  thumbnailUrl: varchar("thumbnail_url"), // AI-generated project thumbnail

  componentSkillIds: jsonb("component_skill_ids").$type<number[]>().default([]), // Array of component skill IDs
  bestStandardIds: jsonb("best_standard_ids").$type<number[]>().default([]), // Array of B.E.S.T. standard IDs
  status: varchar("status", { enum: ["draft", "active", "completed", "archived"] }).default("draft"),
  dueDate: timestamp("due_date"),

  // Project Explorer fields
  isPublic: boolean("is_public").default(false), // Whether project appears in public library
  subjectArea: varchar("subject_area"), // e.g., "Math", "Science", "English"
  gradeLevel: varchar("grade_level"), // K-12 grade level
  estimatedDuration: varchar("estimated_duration"), // Estimated project duration

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const milestones = pgTable("milestones", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
  title: varchar("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  order: integer("order").default(0),
  aiGenerated: boolean("ai_generated").default(false),
  deliverableUrl: varchar("deliverable_url"),
  deliverableFileName: varchar("deliverable_file_name"),
  deliverableDescription: text("deliverable_description"),
  includeInPortfolio: boolean("include_in_portfolio").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Project Teams - Each project can have multiple teams
export const projectTeams = pgTable("project_teams", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  name: varchar("name").notNull(), // Team name like "Team A", "Green Team", etc.
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Project Team Members
export const projectTeamMembers = pgTable("project_team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").references(() => projectTeams.id, { onDelete: "cascade" }).notNull(),
  studentId: integer("student_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: varchar("role", { length: 50 }).default("member"),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export type ProjectTeamMember = InferSelectModel<typeof projectTeamMembers>;

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

export type SafetyIncident = InferSelectModel<typeof safetyIncidents>;

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

export type Notification = InferSelectModel<typeof notifications>;

// Student-Project Assignments (Legacy - keeping for backward compatibility)
export const projectAssignments = pgTable("project_assignments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  studentId: integer("student_id").references(() => users.id),
  teamId: integer("team_id").references(() => projectTeams.id), // Optional team reference
  assignedAt: timestamp("assigned_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  progress: decimal("progress").default("0"), // 0-100
});

// Assessments and Submissions
export const assessments = pgTable("assessments", {
  id: serial("id").primaryKey(),
  milestoneId: integer("milestone_id").references(() => milestones.id, { onDelete: "cascade" }), // Optional - for milestone-linked assessments
  title: varchar("title").notNull(),
  description: text("description"),
  questions: jsonb("questions"), // Array of question objects
  rubricId: integer("rubric_id"),
  componentSkillIds: jsonb("component_skill_ids").$type<number[]>().default([]), // Array of component skill IDs for XQ competencies
  dueDate: timestamp("due_date"), // For standalone assessments
  aiGenerated: boolean("ai_generated").default(false),
  assessmentType: varchar("assessment_type", { enum: ["teacher", "self-evaluation"] }).default("teacher"),
  allowSelfEvaluation: boolean("allow_self_evaluation").default(false),
  shareCode: varchar("share_code", { length: 5 }).unique(), // 5-letter code for sharing
  shareCodeExpiresAt: timestamp("share_code_expires_at"), // Optional expiration for codes
  pdfUrl: text("pdf_url"), // URL to uploaded PDF in object storage (for teacher assessments with reading material)
  createdBy: integer("created_by").references(() => users.id), // Track who created the assessment for ownership checks
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
  isSelfEvaluation: boolean("is_self_evaluation").default(false),
  selfEvaluationData: jsonb("self_evaluation_data"), // For storing self-evaluation specific data
});

// Self-evaluations table for storing student self-assessment responses
export const selfEvaluations = pgTable("self_evaluations", {
  id: serial("id").primaryKey(),
  assessmentId: integer("assessment_id").references(() => assessments.id),
  studentId: integer("student_id").references(() => users.id),
  componentSkillId: integer("component_skill_id").references(() => componentSkills.id),
  selfAssessedLevel: varchar("self_assessed_level", { enum: ["emerging", "developing", "proficient", "applying"] }),
  justification: text("justification").notNull(),
  examples: text("examples"),
  aiImprovementFeedback: text("ai_improvement_feedback"),
  hasRiskyContent: boolean("has_risky_content").default(false),
  teacherNotified: boolean("teacher_notified").default(false),
  submittedAt: timestamp("submitted_at").defaultNow(),
  gradedAt: timestamp("graded_at"),
  teacherFeedback: text("teacher_feedback"),
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

// Digital Portfolio
export const portfolioArtifacts = pgTable("portfolio_artifacts", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => users.id),
  submissionId: integer("submission_id").references(() => submissions.id),
  milestoneId: integer("milestone_id").references(() => milestones.id),
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

// Contact requests from landing page
export const contactRequests = pgTable("contact_requests", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations

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

export const selfEvaluationsRelations = relations(selfEvaluations, ({ one }) => ({
  assessment: one(assessments, {
    fields: [selfEvaluations.assessmentId],
    references: [assessments.id],
  }),
  student: one(users, {
    fields: [selfEvaluations.studentId],
    references: [users.id],
  }),
  componentSkill: one(componentSkills, {
    fields: [selfEvaluations.componentSkillId],
    references: [componentSkills.id],
  }),
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

// Project Teams Relations
export const projectTeamsRelations = relations(projectTeams, ({ one, many }) => ({
  project: one(projects, {
    fields: [projectTeams.projectId],
    references: [projects.id],
  }),
  members: many(projectTeamMembers),
  assignments: many(projectAssignments),
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

// Schools Relations
export const schoolsRelations = relations(schools, ({ many }) => ({
  users: many(users),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  school: one(schools, {
    fields: [users.schoolId],
    references: [schools.id],
  }),
  teacherProjects: many(projects),
  projectAssignments: many(projectAssignments),
  teamMemberships: many(projectTeamMembers),
  submissions: many(submissions),
  credentials: many(credentials),
  portfolioArtifacts: many(portfolioArtifacts),
  authTokens: many(authTokens),
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
export type SubmissionWithAssessment = Submission & {
  assessment?: Assessment | null;
};
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
export type School = typeof schools.$inferSelect;
export type InsertSchool = typeof schools.$inferInsert;
export type ProjectTeam = typeof projectTeams.$inferSelect;
export type InsertProjectTeam = typeof projectTeams.$inferInsert;
export type BestStandard = typeof bestStandards.$inferSelect;
export type InsertBestStandard = typeof bestStandards.$inferInsert;
export type SelfEvaluation = typeof selfEvaluations.$inferSelect;
export type InsertSelfEvaluation = typeof selfEvaluations.$inferInsert;
export type ContactRequest = typeof contactRequests.$inferSelect;
export type InsertContactRequest = typeof contactRequests.$inferInsert;

// Zod schemas
export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  title: z.string().min(1, "Title is required"),
  dueDate: z.coerce.date().optional(),
  componentSkillIds: z.array(z.number()).optional(),
  bestStandardIds: z.array(z.number()).optional(),
  schoolId: z.number().optional(),
  thumbnailUrl: z.string().optional(),
  isPublic: z.boolean().optional(),
  subjectArea: z.string().optional(),
  gradeLevel: z.string().optional(),
  estimatedDuration: z.string().optional(),
});

export const insertMilestoneSchema = createInsertSchema(milestones).omit({
  id: true,
  createdAt: true,
}).extend({
  dueDate: z.coerce.date().optional(),
});

export const insertAssessmentSchema = createInsertSchema(assessments).omit({
  id: true,
  createdAt: true,
}).extend({
  milestoneId: z.number().optional(),
  dueDate: z.coerce.date().optional(),
  shareCode: z.string().length(5).optional(),
  shareCodeExpiresAt: z.coerce.date().optional(),
}).refine((data) => {
  // For teacher assessments, questions are required and must have non-empty text
  if (data.assessmentType === "teacher") {
    return data.questions &&
      Array.isArray(data.questions) &&
      data.questions.length > 0 &&
      data.questions.every((q: any) => q.text && q.text.trim().length > 0);
  }
  // For self-evaluation assessments, questions are optional
  return true;
}, {
  message: "Teacher assessments must have at least one question with non-empty text",
  path: ["questions"]
});

export const insertSelfEvaluationSchema = createInsertSchema(selfEvaluations).omit({
  id: true,
  submittedAt: true,
  gradedAt: true,
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

export const insertContactRequestSchema = createInsertSchema(contactRequests).omit({
  id: true,
  createdAt: true,
  isRead: true,
});

// Auth schemas
export const registerSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First Name is required'),
  lastName: z.string().min(1, 'Last Name is required'),
  email: z.string().email('Invalid email address'),
  schoolName: z.string().min(1, 'School Name is required'),
  role: z.nativeEnum(UserRole).default(UserRole.STUDENT),
  schoolId: z.number().int().positive().optional(),
});

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});