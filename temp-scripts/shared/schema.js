"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertUserSchema = exports.loginSchema = exports.registerSchema = exports.insertPortfolioArtifactSchema = exports.insertCredentialSchema = exports.insertSubmissionSchema = exports.insertSelfEvaluationSchema = exports.insertAssessmentSchema = exports.insertMilestoneSchema = exports.insertProjectSchema = exports.usersRelations = exports.schoolsRelations = exports.projectTeamMembersRelations = exports.projectTeamsRelations = exports.componentSkillsRelations = exports.competenciesRelations = exports.learnerOutcomesRelations = exports.selfEvaluationsRelations = exports.submissionsRelations = exports.assessmentsRelations = exports.milestonesRelations = exports.projectsRelations = exports.authTokensRelations = exports.portfolios = exports.portfolioArtifacts = exports.bestStandards = exports.credentials = exports.grades = exports.selfEvaluations = exports.submissions = exports.assessments = exports.projectAssignments = exports.notifications = exports.safetyIncidents = exports.projectTeamMembers = exports.projectTeams = exports.milestones = exports.projects = exports.componentSkills = exports.competencies = exports.learnerOutcomes = exports.authTokens = exports.users = exports.schools = exports.sessions = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_zod_1 = require("drizzle-zod");
const zod_1 = require("zod");
// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
exports.sessions = (0, pg_core_1.pgTable)("sessions", {
    sid: (0, pg_core_1.varchar)("sid").primaryKey(),
    sess: (0, pg_core_1.jsonb)("sess").notNull(),
    expire: (0, pg_core_1.timestamp)("expire").notNull(),
}, (table) => [(0, pg_core_1.index)("IDX_session_expire").on(table.expire)]);
// Schools table
exports.schools = (0, pg_core_1.pgTable)("schools", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    name: (0, pg_core_1.varchar)("name").notNull(),
    address: (0, pg_core_1.varchar)("address"),
    city: (0, pg_core_1.varchar)("city"),
    state: (0, pg_core_1.varchar)("state"),
    zipCode: (0, pg_core_1.varchar)("zip_code"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
// User storage table with authentication support
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    username: (0, pg_core_1.varchar)("username", { length: 255 }).notNull().unique(),
    password: (0, pg_core_1.varchar)("password", { length: 255 }).notNull(),
    profileImageUrl: (0, pg_core_1.varchar)("profile_image_url"),
    role: (0, pg_core_1.varchar)("role", { enum: ["admin", "teacher", "student"] }).notNull().default("student"),
    schoolId: (0, pg_core_1.integer)("school_id").references(() => exports.schools.id),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
// Authentication tokens table
exports.authTokens = (0, pg_core_1.pgTable)("auth_tokens", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    userId: (0, pg_core_1.integer)("user_id").references(() => exports.users.id).notNull(),
    token: (0, pg_core_1.varchar)("token").notNull().unique(),
    type: (0, pg_core_1.varchar)("type", { enum: ["refresh", "reset", "confirmation"] }).notNull(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
// XQ 3-Level Hierarchy: Learner Outcomes → Competencies → Component Skills
exports.learnerOutcomes = (0, pg_core_1.pgTable)("learner_outcomes", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    name: (0, pg_core_1.varchar)("name").notNull(),
    description: (0, pg_core_1.text)("description"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.competencies = (0, pg_core_1.pgTable)("competencies", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    learnerOutcomeId: (0, pg_core_1.integer)("learner_outcome_id").references(() => exports.learnerOutcomes.id),
    name: (0, pg_core_1.varchar)("name").notNull(),
    description: (0, pg_core_1.text)("description"),
    category: (0, pg_core_1.varchar)("category"), // e.g., "core", "subject-specific"
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.componentSkills = (0, pg_core_1.pgTable)("component_skills", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    competencyId: (0, pg_core_1.integer)("competency_id").references(() => exports.competencies.id),
    name: (0, pg_core_1.varchar)("name").notNull(),
    rubricLevels: (0, pg_core_1.jsonb)("rubric_levels"), // JSON object with emerging, developing, proficient, applying
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
// Removed legacy outcomes table - using 3-level hierarchy instead
// Projects and Milestones
exports.projects = (0, pg_core_1.pgTable)("projects", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    title: (0, pg_core_1.varchar)("title").notNull(),
    description: (0, pg_core_1.text)("description"),
    teacherId: (0, pg_core_1.integer)("teacher_id").references(() => exports.users.id),
    schoolId: (0, pg_core_1.integer)("school_id").references(() => exports.schools.id), // Add school association
    componentSkillIds: (0, pg_core_1.jsonb)("component_skill_ids").$type().default([]), // Array of component skill IDs
    bestStandardIds: (0, pg_core_1.jsonb)("best_standard_ids").$type().default([]), // Array of B.E.S.T. standard IDs
    status: (0, pg_core_1.varchar)("status", { enum: ["draft", "active", "completed", "archived"] }).default("draft"),
    dueDate: (0, pg_core_1.timestamp)("due_date"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
exports.milestones = (0, pg_core_1.pgTable)("milestones", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    projectId: (0, pg_core_1.integer)("project_id").references(() => exports.projects.id),
    title: (0, pg_core_1.varchar)("title").notNull(),
    description: (0, pg_core_1.text)("description"),
    dueDate: (0, pg_core_1.timestamp)("due_date"),
    order: (0, pg_core_1.integer)("order").default(0),
    aiGenerated: (0, pg_core_1.boolean)("ai_generated").default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
// Project Teams - Each project can have multiple teams
exports.projectTeams = (0, pg_core_1.pgTable)("project_teams", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    projectId: (0, pg_core_1.integer)("project_id").references(() => exports.projects.id),
    name: (0, pg_core_1.varchar)("name").notNull(), // Team name like "Team A", "Green Team", etc.
    description: (0, pg_core_1.text)("description"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
// Project Team Members
exports.projectTeamMembers = (0, pg_core_1.pgTable)("project_team_members", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    teamId: (0, pg_core_1.integer)("team_id").references(() => exports.projectTeams.id, { onDelete: "cascade" }).notNull(),
    studentId: (0, pg_core_1.integer)("student_id").references(() => exports.users.id, { onDelete: "cascade" }).notNull(),
    role: (0, pg_core_1.varchar)("role", { length: 50 }).default("member"),
    joinedAt: (0, pg_core_1.timestamp)("joined_at").defaultNow(),
});
exports.safetyIncidents = (0, pg_core_1.pgTable)("safety_incidents", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    studentId: (0, pg_core_1.integer)("student_id").references(() => exports.users.id, { onDelete: "cascade" }).notNull(),
    teacherId: (0, pg_core_1.integer)("teacher_id").references(() => exports.users.id, { onDelete: "cascade" }),
    assessmentId: (0, pg_core_1.integer)("assessment_id").references(() => exports.assessments.id, { onDelete: "cascade" }),
    componentSkillId: (0, pg_core_1.integer)("component_skill_id").references(() => exports.componentSkills.id, { onDelete: "cascade" }),
    incidentType: (0, pg_core_1.varchar)("incident_type", { length: 100 }).notNull(),
    message: (0, pg_core_1.text)("message").notNull(),
    conversationHistory: (0, pg_core_1.jsonb)("conversation_history"),
    severity: (0, pg_core_1.varchar)("severity", { length: 20 }).default("medium"),
    resolved: (0, pg_core_1.boolean)("resolved").default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    resolvedAt: (0, pg_core_1.timestamp)("resolved_at"),
    resolvedBy: (0, pg_core_1.integer)("resolved_by").references(() => exports.users.id),
});
exports.notifications = (0, pg_core_1.pgTable)("notifications", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    userId: (0, pg_core_1.integer)("user_id").references(() => exports.users.id, { onDelete: "cascade" }).notNull(),
    type: (0, pg_core_1.varchar)("type", { length: 50 }).notNull(),
    title: (0, pg_core_1.varchar)("title", { length: 255 }).notNull(),
    message: (0, pg_core_1.text)("message").notNull(),
    metadata: (0, pg_core_1.jsonb)("metadata"),
    read: (0, pg_core_1.boolean)("read").default(false),
    priority: (0, pg_core_1.varchar)("priority", { length: 20 }).default("medium"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    readAt: (0, pg_core_1.timestamp)("read_at"),
});
// Student-Project Assignments (Legacy - keeping for backward compatibility)
exports.projectAssignments = (0, pg_core_1.pgTable)("project_assignments", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    projectId: (0, pg_core_1.integer)("project_id").references(() => exports.projects.id),
    studentId: (0, pg_core_1.integer)("student_id").references(() => exports.users.id),
    teamId: (0, pg_core_1.integer)("team_id").references(() => exports.projectTeams.id), // Optional team reference
    assignedAt: (0, pg_core_1.timestamp)("assigned_at").defaultNow(),
    completedAt: (0, pg_core_1.timestamp)("completed_at"),
    progress: (0, pg_core_1.decimal)("progress").default("0"), // 0-100
});
// Assessments and Submissions
exports.assessments = (0, pg_core_1.pgTable)("assessments", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    milestoneId: (0, pg_core_1.integer)("milestone_id").references(() => exports.milestones.id), // Optional - for milestone-linked assessments
    title: (0, pg_core_1.varchar)("title").notNull(),
    description: (0, pg_core_1.text)("description"),
    questions: (0, pg_core_1.jsonb)("questions"), // Array of question objects
    rubricId: (0, pg_core_1.integer)("rubric_id"),
    componentSkillIds: (0, pg_core_1.jsonb)("component_skill_ids").$type().default([]), // Array of component skill IDs for XQ competencies
    dueDate: (0, pg_core_1.timestamp)("due_date"), // For standalone assessments
    aiGenerated: (0, pg_core_1.boolean)("ai_generated").default(false),
    assessmentType: (0, pg_core_1.varchar)("assessment_type", { enum: ["teacher", "self-evaluation"] }).default("teacher"),
    allowSelfEvaluation: (0, pg_core_1.boolean)("allow_self_evaluation").default(false),
    shareCode: (0, pg_core_1.varchar)("share_code", { length: 5 }).unique(), // 5-letter code for sharing
    shareCodeExpiresAt: (0, pg_core_1.timestamp)("share_code_expires_at"), // Optional expiration for codes
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.submissions = (0, pg_core_1.pgTable)("submissions", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    assessmentId: (0, pg_core_1.integer)("assessment_id").references(() => exports.assessments.id),
    studentId: (0, pg_core_1.integer)("student_id").references(() => exports.users.id),
    responses: (0, pg_core_1.jsonb)("responses"), // Array of response objects
    artifacts: (0, pg_core_1.jsonb)("artifacts"), // Array of file URLs/paths
    submittedAt: (0, pg_core_1.timestamp)("submitted_at").defaultNow(),
    gradedAt: (0, pg_core_1.timestamp)("graded_at"),
    feedback: (0, pg_core_1.text)("feedback"),
    aiGeneratedFeedback: (0, pg_core_1.boolean)("ai_generated_feedback").default(false),
    isSelfEvaluation: (0, pg_core_1.boolean)("is_self_evaluation").default(false),
    selfEvaluationData: (0, pg_core_1.jsonb)("self_evaluation_data"), // For storing self-evaluation specific data
});
// Self-evaluations table for storing student self-assessment responses
exports.selfEvaluations = (0, pg_core_1.pgTable)("self_evaluations", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    assessmentId: (0, pg_core_1.integer)("assessment_id").references(() => exports.assessments.id),
    studentId: (0, pg_core_1.integer)("student_id").references(() => exports.users.id),
    componentSkillId: (0, pg_core_1.integer)("component_skill_id").references(() => exports.componentSkills.id),
    selfAssessedLevel: (0, pg_core_1.varchar)("self_assessed_level", { enum: ["emerging", "developing", "proficient", "applying"] }),
    justification: (0, pg_core_1.text)("justification").notNull(),
    examples: (0, pg_core_1.text)("examples"),
    aiImprovementFeedback: (0, pg_core_1.text)("ai_improvement_feedback"),
    hasRiskyContent: (0, pg_core_1.boolean)("has_risky_content").default(false),
    teacherNotified: (0, pg_core_1.boolean)("teacher_notified").default(false),
    submittedAt: (0, pg_core_1.timestamp)("submitted_at").defaultNow(),
    gradedAt: (0, pg_core_1.timestamp)("graded_at"),
    teacherFeedback: (0, pg_core_1.text)("teacher_feedback"),
});
exports.grades = (0, pg_core_1.pgTable)("grades", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    submissionId: (0, pg_core_1.integer)("submission_id").references(() => exports.submissions.id),
    componentSkillId: (0, pg_core_1.integer)("component_skill_id").references(() => exports.componentSkills.id),
    rubricLevel: (0, pg_core_1.varchar)("rubric_level", { enum: ["emerging", "developing", "proficient", "applying"] }),
    score: (0, pg_core_1.decimal)("score"),
    feedback: (0, pg_core_1.text)("feedback"),
    gradedBy: (0, pg_core_1.integer)("graded_by").references(() => exports.users.id),
    gradedAt: (0, pg_core_1.timestamp)("graded_at").defaultNow(),
});
// Credentials System
exports.credentials = (0, pg_core_1.pgTable)("credentials", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    studentId: (0, pg_core_1.integer)("student_id").references(() => exports.users.id),
    type: (0, pg_core_1.varchar)("type", { enum: ["sticker", "badge", "plaque"] }).notNull(),
    componentSkillId: (0, pg_core_1.integer)("component_skill_id").references(() => exports.componentSkills.id), // For stickers
    competencyId: (0, pg_core_1.integer)("competency_id").references(() => exports.competencies.id), // For badges
    subjectArea: (0, pg_core_1.varchar)("subject_area"), // For plaques
    title: (0, pg_core_1.varchar)("title").notNull(),
    description: (0, pg_core_1.text)("description"),
    iconUrl: (0, pg_core_1.varchar)("icon_url"),
    awardedAt: (0, pg_core_1.timestamp)("awarded_at").defaultNow(),
    approvedBy: (0, pg_core_1.integer)("approved_by").references(() => exports.users.id),
});
// B.E.S.T. Standards table
exports.bestStandards = (0, pg_core_1.pgTable)("best_standards", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    benchmarkNumber: (0, pg_core_1.varchar)("benchmark_number").notNull(),
    description: (0, pg_core_1.text)("description").notNull(),
    ideaStandard: (0, pg_core_1.varchar)("idea_standard"),
    subject: (0, pg_core_1.varchar)("subject"),
    grade: (0, pg_core_1.varchar)("grade"),
    bodyOfKnowledge: (0, pg_core_1.varchar)("body_of_knowledge"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
// Digital Portfolio
exports.portfolioArtifacts = (0, pg_core_1.pgTable)("portfolio_artifacts", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    studentId: (0, pg_core_1.integer)("student_id").references(() => exports.users.id),
    submissionId: (0, pg_core_1.integer)("submission_id").references(() => exports.submissions.id),
    title: (0, pg_core_1.varchar)("title").notNull(),
    description: (0, pg_core_1.text)("description"),
    artifactUrl: (0, pg_core_1.varchar)("artifact_url"),
    artifactType: (0, pg_core_1.varchar)("artifact_type"), // image, video, document, etc.
    tags: (0, pg_core_1.jsonb)("tags"), // Array of tags
    isPublic: (0, pg_core_1.boolean)("is_public").default(false),
    isApproved: (0, pg_core_1.boolean)("is_approved").default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.portfolios = (0, pg_core_1.pgTable)("portfolios", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    studentId: (0, pg_core_1.integer)("student_id").references(() => exports.users.id),
    title: (0, pg_core_1.varchar)("title").notNull(),
    description: (0, pg_core_1.text)("description"),
    qrCode: (0, pg_core_1.varchar)("qr_code").unique(),
    publicUrl: (0, pg_core_1.varchar)("public_url").unique(),
    isPublic: (0, pg_core_1.boolean)("is_public").default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
// Relations
exports.authTokensRelations = (0, drizzle_orm_1.relations)(exports.authTokens, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.authTokens.userId],
        references: [exports.users.id],
    }),
}));
exports.projectsRelations = (0, drizzle_orm_1.relations)(exports.projects, ({ one, many }) => ({
    teacher: one(exports.users, {
        fields: [exports.projects.teacherId],
        references: [exports.users.id],
    }),
    milestones: many(exports.milestones),
    assignments: many(exports.projectAssignments),
}));
exports.milestonesRelations = (0, drizzle_orm_1.relations)(exports.milestones, ({ one, many }) => ({
    project: one(exports.projects, {
        fields: [exports.milestones.projectId],
        references: [exports.projects.id],
    }),
    assessments: many(exports.assessments),
}));
exports.assessmentsRelations = (0, drizzle_orm_1.relations)(exports.assessments, ({ one, many }) => ({
    milestone: one(exports.milestones, {
        fields: [exports.assessments.milestoneId],
        references: [exports.milestones.id],
    }),
    submissions: many(exports.submissions),
}));
exports.submissionsRelations = (0, drizzle_orm_1.relations)(exports.submissions, ({ one, many }) => ({
    assessment: one(exports.assessments, {
        fields: [exports.submissions.assessmentId],
        references: [exports.assessments.id],
    }),
    student: one(exports.users, {
        fields: [exports.submissions.studentId],
        references: [exports.users.id],
    }),
    grades: many(exports.grades),
    portfolioArtifacts: many(exports.portfolioArtifacts),
}));
exports.selfEvaluationsRelations = (0, drizzle_orm_1.relations)(exports.selfEvaluations, ({ one }) => ({
    assessment: one(exports.assessments, {
        fields: [exports.selfEvaluations.assessmentId],
        references: [exports.assessments.id],
    }),
    student: one(exports.users, {
        fields: [exports.selfEvaluations.studentId],
        references: [exports.users.id],
    }),
    componentSkill: one(exports.componentSkills, {
        fields: [exports.selfEvaluations.componentSkillId],
        references: [exports.componentSkills.id],
    }),
}));
// 3-Level Hierarchy Relations
exports.learnerOutcomesRelations = (0, drizzle_orm_1.relations)(exports.learnerOutcomes, ({ many }) => ({
    competencies: many(exports.competencies),
}));
exports.competenciesRelations = (0, drizzle_orm_1.relations)(exports.competencies, ({ one, many }) => ({
    learnerOutcome: one(exports.learnerOutcomes, {
        fields: [exports.competencies.learnerOutcomeId],
        references: [exports.learnerOutcomes.id],
    }),
    componentSkills: many(exports.componentSkills),
    // Legacy outcomes relation removed
    credentials: many(exports.credentials),
}));
exports.componentSkillsRelations = (0, drizzle_orm_1.relations)(exports.componentSkills, ({ one }) => ({
    competency: one(exports.competencies, {
        fields: [exports.componentSkills.competencyId],
        references: [exports.competencies.id],
    }),
}));
// Project Teams Relations
exports.projectTeamsRelations = (0, drizzle_orm_1.relations)(exports.projectTeams, ({ one, many }) => ({
    project: one(exports.projects, {
        fields: [exports.projectTeams.projectId],
        references: [exports.projects.id],
    }),
    members: many(exports.projectTeamMembers),
    assignments: many(exports.projectAssignments),
}));
exports.projectTeamMembersRelations = (0, drizzle_orm_1.relations)(exports.projectTeamMembers, ({ one }) => ({
    team: one(exports.projectTeams, {
        fields: [exports.projectTeamMembers.teamId],
        references: [exports.projectTeams.id],
    }),
    student: one(exports.users, {
        fields: [exports.projectTeamMembers.studentId],
        references: [exports.users.id],
    }),
}));
// Schools Relations
exports.schoolsRelations = (0, drizzle_orm_1.relations)(exports.schools, ({ many }) => ({
    users: many(exports.users),
}));
exports.usersRelations = (0, drizzle_orm_1.relations)(exports.users, ({ one, many }) => ({
    school: one(exports.schools, {
        fields: [exports.users.schoolId],
        references: [exports.schools.id],
    }),
    teacherProjects: many(exports.projects),
    projectAssignments: many(exports.projectAssignments),
    teamMemberships: many(exports.projectTeamMembers),
    submissions: many(exports.submissions),
    credentials: many(exports.credentials),
    portfolioArtifacts: many(exports.portfolioArtifacts),
    authTokens: many(exports.authTokens),
}));
// Zod schemas
exports.insertProjectSchema = (0, drizzle_zod_1.createInsertSchema)(exports.projects).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
}).extend({
    dueDate: zod_1.z.coerce.date().optional(),
    componentSkillIds: zod_1.z.array(zod_1.z.number()).optional(),
    bestStandardIds: zod_1.z.array(zod_1.z.number()).optional(),
    schoolId: zod_1.z.number().optional(),
});
exports.insertMilestoneSchema = (0, drizzle_zod_1.createInsertSchema)(exports.milestones).omit({
    id: true,
    createdAt: true,
});
exports.insertAssessmentSchema = (0, drizzle_zod_1.createInsertSchema)(exports.assessments).omit({
    id: true,
    createdAt: true,
}).extend({
    milestoneId: zod_1.z.number().optional(),
    dueDate: zod_1.z.coerce.date().optional(),
    shareCode: zod_1.z.string().length(5).optional(),
    shareCodeExpiresAt: zod_1.z.coerce.date().optional(),
}).refine((data) => {
    // For teacher assessments, questions are required and must have non-empty text
    if (data.assessmentType === "teacher") {
        return data.questions &&
            Array.isArray(data.questions) &&
            data.questions.length > 0 &&
            data.questions.every((q) => q.text && q.text.trim().length > 0);
    }
    // For self-evaluation assessments, questions are optional
    return true;
}, {
    message: "Teacher assessments must have at least one question with non-empty text",
    path: ["questions"]
});
exports.insertSelfEvaluationSchema = (0, drizzle_zod_1.createInsertSchema)(exports.selfEvaluations).omit({
    id: true,
    submittedAt: true,
    gradedAt: true,
});
exports.insertSubmissionSchema = (0, drizzle_zod_1.createInsertSchema)(exports.submissions).omit({
    id: true,
    submittedAt: true,
    gradedAt: true,
});
exports.insertCredentialSchema = (0, drizzle_zod_1.createInsertSchema)(exports.credentials).omit({
    id: true,
    awardedAt: true,
});
exports.insertPortfolioArtifactSchema = (0, drizzle_zod_1.createInsertSchema)(exports.portfolioArtifacts).omit({
    id: true,
    createdAt: true,
});
// Auth schemas
exports.registerSchema = (0, drizzle_zod_1.createInsertSchema)(exports.users).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
}).extend({
    username: zod_1.z.string().min(3, 'Username must be at least 3 characters'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
    role: zod_1.z.enum(['admin', 'teacher', 'student']).default('student'),
    schoolId: zod_1.z.number().int().positive().optional(),
});
exports.loginSchema = zod_1.z.object({
    username: zod_1.z.string().min(1, 'Username is required'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
exports.insertUserSchema = (0, drizzle_zod_1.createInsertSchema)(exports.users).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
