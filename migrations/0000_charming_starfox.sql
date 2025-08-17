CREATE TABLE "assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"milestone_id" integer,
	"title" varchar NOT NULL,
	"description" text,
	"questions" jsonb,
	"rubric_id" integer,
	"component_skill_ids" jsonb DEFAULT '[]'::jsonb,
	"due_date" timestamp,
	"ai_generated" boolean DEFAULT false,
	"assessment_type" varchar DEFAULT 'teacher',
	"allow_self_evaluation" boolean DEFAULT false,
	"share_code" varchar(5),
	"share_code_expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "assessments_share_code_unique" UNIQUE("share_code")
);
--> statement-breakpoint
CREATE TABLE "auth_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token" varchar NOT NULL,
	"type" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "auth_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "best_standards" (
	"id" serial PRIMARY KEY NOT NULL,
	"benchmark_number" varchar NOT NULL,
	"description" text NOT NULL,
	"idea_standard" varchar,
	"subject" varchar,
	"grade" varchar,
	"body_of_knowledge" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "competencies" (
	"id" serial PRIMARY KEY NOT NULL,
	"learner_outcome_id" integer,
	"name" varchar NOT NULL,
	"description" text,
	"category" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "component_skills" (
	"id" serial PRIMARY KEY NOT NULL,
	"competency_id" integer,
	"name" varchar NOT NULL,
	"rubric_levels" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "credentials" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer,
	"type" varchar NOT NULL,
	"component_skill_id" integer,
	"competency_id" integer,
	"subject_area" varchar,
	"title" varchar NOT NULL,
	"description" text,
	"icon_url" varchar,
	"awarded_at" timestamp DEFAULT now(),
	"approved_by" integer
);
--> statement-breakpoint
CREATE TABLE "grades" (
	"id" serial PRIMARY KEY NOT NULL,
	"submission_id" integer,
	"component_skill_id" integer,
	"rubric_level" varchar,
	"score" numeric,
	"feedback" text,
	"graded_by" integer,
	"graded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "learner_outcomes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "milestones" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"title" varchar NOT NULL,
	"description" text,
	"due_date" timestamp,
	"order" integer DEFAULT 0,
	"ai_generated" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"metadata" jsonb,
	"read" boolean DEFAULT false,
	"priority" varchar(20) DEFAULT 'medium',
	"created_at" timestamp DEFAULT now(),
	"read_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "portfolio_artifacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer,
	"submission_id" integer,
	"title" varchar NOT NULL,
	"description" text,
	"artifact_url" varchar,
	"artifact_type" varchar,
	"tags" jsonb,
	"is_public" boolean DEFAULT false,
	"is_approved" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "portfolios" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer,
	"title" varchar NOT NULL,
	"description" text,
	"qr_code" varchar,
	"public_url" varchar,
	"is_public" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "portfolios_qr_code_unique" UNIQUE("qr_code"),
	CONSTRAINT "portfolios_public_url_unique" UNIQUE("public_url")
);
--> statement-breakpoint
CREATE TABLE "project_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"student_id" integer,
	"team_id" integer,
	"assigned_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"progress" numeric DEFAULT '0'
);
--> statement-breakpoint
CREATE TABLE "project_team_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"student_id" integer NOT NULL,
	"role" varchar(50) DEFAULT 'member',
	"joined_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"name" varchar NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"teacher_id" integer,
	"school_id" integer,
	"component_skill_ids" jsonb DEFAULT '[]'::jsonb,
	"best_standard_ids" jsonb DEFAULT '[]'::jsonb,
	"status" varchar DEFAULT 'draft',
	"due_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "safety_incidents" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"teacher_id" integer,
	"assessment_id" integer,
	"component_skill_id" integer,
	"incident_type" varchar(100) NOT NULL,
	"message" text NOT NULL,
	"conversation_history" jsonb,
	"severity" varchar(20) DEFAULT 'medium',
	"resolved" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"resolved_at" timestamp,
	"resolved_by" integer
);
--> statement-breakpoint
CREATE TABLE "schools" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"address" varchar,
	"city" varchar,
	"state" varchar,
	"zip_code" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "self_evaluations" (
	"id" serial PRIMARY KEY NOT NULL,
	"assessment_id" integer,
	"student_id" integer,
	"component_skill_id" integer,
	"self_assessed_level" varchar,
	"justification" text NOT NULL,
	"examples" text,
	"ai_improvement_feedback" text,
	"has_risky_content" boolean DEFAULT false,
	"teacher_notified" boolean DEFAULT false,
	"submitted_at" timestamp DEFAULT now(),
	"graded_at" timestamp,
	"teacher_feedback" text
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"assessment_id" integer,
	"student_id" integer,
	"responses" jsonb,
	"artifacts" jsonb,
	"submitted_at" timestamp DEFAULT now(),
	"graded_at" timestamp,
	"feedback" text,
	"ai_generated_feedback" boolean DEFAULT false,
	"is_self_evaluation" boolean DEFAULT false,
	"self_evaluation_data" jsonb
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"profile_image_url" varchar,
	"role" varchar DEFAULT 'student' NOT NULL,
	"school_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_milestone_id_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competencies" ADD CONSTRAINT "competencies_learner_outcome_id_learner_outcomes_id_fk" FOREIGN KEY ("learner_outcome_id") REFERENCES "public"."learner_outcomes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "component_skills" ADD CONSTRAINT "component_skills_competency_id_competencies_id_fk" FOREIGN KEY ("competency_id") REFERENCES "public"."competencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_component_skill_id_component_skills_id_fk" FOREIGN KEY ("component_skill_id") REFERENCES "public"."component_skills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_competency_id_competencies_id_fk" FOREIGN KEY ("competency_id") REFERENCES "public"."competencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_component_skill_id_component_skills_id_fk" FOREIGN KEY ("component_skill_id") REFERENCES "public"."component_skills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_graded_by_users_id_fk" FOREIGN KEY ("graded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_artifacts" ADD CONSTRAINT "portfolio_artifacts_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_artifacts" ADD CONSTRAINT "portfolio_artifacts_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_team_id_project_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."project_teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_team_members" ADD CONSTRAINT "project_team_members_team_id_project_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."project_teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_team_members" ADD CONSTRAINT "project_team_members_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_teams" ADD CONSTRAINT "project_teams_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_incidents" ADD CONSTRAINT "safety_incidents_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_incidents" ADD CONSTRAINT "safety_incidents_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_incidents" ADD CONSTRAINT "safety_incidents_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_incidents" ADD CONSTRAINT "safety_incidents_component_skill_id_component_skills_id_fk" FOREIGN KEY ("component_skill_id") REFERENCES "public"."component_skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_incidents" ADD CONSTRAINT "safety_incidents_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "self_evaluations" ADD CONSTRAINT "self_evaluations_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "self_evaluations" ADD CONSTRAINT "self_evaluations_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "self_evaluations" ADD CONSTRAINT "self_evaluations_component_skill_id_component_skills_id_fk" FOREIGN KEY ("component_skill_id") REFERENCES "public"."component_skills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");