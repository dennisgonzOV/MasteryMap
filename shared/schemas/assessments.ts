// Assessments domain schema
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
import { milestones } from './projects';
import { componentSkills } from './common';

// Assessments and Submissions
export const assessments = pgTable("assessments", {
  id: serial("id").primaryKey(),
  milestoneId: integer("milestone_id").references(() => milestones.id),
  teacherId: integer("teacher_id").references(() => users.id),
  title: varchar("title").notNull(),
  description: text("description"),
  questions: jsonb("questions"),
  rubricId: integer("rubric_id"),
  componentSkillIds: jsonb("component_skill_ids").$type<number[]>().notNull().default([]),
  dueDate: timestamp("due_date"),
  aiGenerated: boolean("ai_generated").default(false),
  assessmentType: varchar("assessment_type", { enum: ["teacher", "self-evaluation"] }).default("teacher"),
  allowSelfEvaluation: boolean("allow_self_evaluation").default(false),
  shareCode: varchar("share_code", { length: 5 }).unique(),
  shareCodeExpiresAt: timestamp("share_code_expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  assessmentId: integer("assessment_id").references(() => assessments.id),
  studentId: integer("student_id").references(() => users.id),
  responses: jsonb("responses"),
  artifacts: jsonb("artifacts"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  gradedAt: timestamp("graded_at"),
  feedback: text("feedback"),
  aiGeneratedFeedback: boolean("ai_generated_feedback").default(false),
  isSelfEvaluation: boolean("is_self_evaluation").default(false),
  selfEvaluationData: jsonb("self_evaluation_data"),
});

// Self-evaluations table
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
  studentId: integer("student_id").references(() => users.id),
  componentSkillId: integer("component_skill_id").references(() => componentSkills.id),
  rubricLevel: varchar("rubric_level", { enum: ["emerging", "developing", "proficient", "applying"] }),
  score: decimal("score"),
  feedback: text("feedback"),
  gradedBy: integer("graded_by").references(() => users.id),
  gradedAt: timestamp("graded_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const assessmentsRelations = relations(assessments, ({ one, many }) => ({
  milestone: one(milestones, {
    fields: [assessments.milestoneId],
    references: [milestones.id],
  }),
  teacher: one(users, {
    fields: [assessments.teacherId],
    references: [users.id],
  }),
  submissions: many(submissions),
  selfEvaluations: many(selfEvaluations),
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

export const gradesRelations = relations(grades, ({ one }) => ({
  submission: one(submissions, {
    fields: [grades.submissionId],
    references: [submissions.id],
  }),
  student: one(users, {
    fields: [grades.studentId],
    references: [users.id],
  }),
  componentSkill: one(componentSkills, {
    fields: [grades.componentSkillId],
    references: [componentSkills.id],
  }),
  gradedBy: one(users, {
    fields: [grades.gradedBy],
    references: [users.id],
  }),
}));

// Types
export type Assessment = InferSelectModel<typeof assessments>;
export type Submission = InferSelectModel<typeof submissions>;
export type SelfEvaluation = InferSelectModel<typeof selfEvaluations>;
export type Grade = InferSelectModel<typeof grades>;

// Insert schemas
export const insertAssessmentSchema = createInsertSchema(assessments);
export const insertSubmissionSchema = createInsertSchema(submissions);
export const insertSelfEvaluationSchema = createInsertSchema(selfEvaluations);
export const insertGradeSchema = createInsertSchema(grades);

// Insert types
export type InsertAssessment = z.infer<typeof insertAssessmentSchema>;
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type InsertSelfEvaluation = z.infer<typeof insertSelfEvaluationSchema>;
export type InsertGrade = z.infer<typeof insertGradeSchema>;

// Select types for compatibility
export type SelectAssessment = Assessment;
export type SelectSubmission = Submission;
export type SelectSelfEvaluation = SelfEvaluation;
export type SelectGrade = Grade;