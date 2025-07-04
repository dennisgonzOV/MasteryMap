import {
  users,
  projects,
  milestones,
  assessments,
  submissions,
  credentials,
  portfolioArtifacts,
  portfolios,
  competencies,
  outcomes,
  grades,
  projectAssignments,
  type User,
  type UpsertUser,
  type InsertProject,
  type Project,
  type InsertMilestone,
  type Milestone,
  type InsertAssessment,
  type Assessment,
  type InsertSubmission,
  type Submission,
  type InsertCredential,
  type Credential,
  type InsertPortfolioArtifact,
  type PortfolioArtifact,
  type InsertPortfolio,
  type Portfolio,
  type Competency,
  type Outcome,
  type Grade,
  type ProjectAssignment,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, inArray, sql } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Project operations
  createProject(project: InsertProject): Promise<Project>;
  getProject(id: number): Promise<Project | undefined>;
  getProjectsByTeacher(teacherId: string): Promise<Project[]>;
  getProjectsByStudent(studentId: string): Promise<Project[]>;
  updateProject(id: number, updates: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: number): Promise<void>;

  // Milestone operations
  createMilestone(milestone: InsertMilestone): Promise<Milestone>;
  getMilestonesByProject(projectId: number): Promise<Milestone[]>;
  updateMilestone(id: number, updates: Partial<InsertMilestone>): Promise<Milestone>;
  deleteMilestone(id: number): Promise<void>;

  // Assessment operations
  createAssessment(assessment: InsertAssessment): Promise<Assessment>;
  getAssessment(id: number): Promise<Assessment | undefined>;
  getAssessmentsByMilestone(milestoneId: number): Promise<Assessment[]>;
  updateAssessment(id: number, updates: Partial<InsertAssessment>): Promise<Assessment>;

  // Submission operations
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  getSubmission(id: number): Promise<Submission | undefined>;
  getSubmissionsByStudent(studentId: string): Promise<Submission[]>;
  getSubmissionsByAssessment(assessmentId: number): Promise<Submission[]>;
  updateSubmission(id: number, updates: Partial<InsertSubmission>): Promise<Submission>;

  // Credential operations
  createCredential(credential: InsertCredential): Promise<Credential>;
  getCredentialsByStudent(studentId: string): Promise<Credential[]>;
  updateCredential(id: number, updates: Partial<InsertCredential>): Promise<Credential>;

  // Portfolio operations
  createPortfolioArtifact(artifact: InsertPortfolioArtifact): Promise<PortfolioArtifact>;
  getPortfolioArtifactsByStudent(studentId: string): Promise<PortfolioArtifact[]>;
  updatePortfolioArtifact(id: number, updates: Partial<InsertPortfolioArtifact>): Promise<PortfolioArtifact>;

  // Competency operations
  getCompetencies(): Promise<Competency[]>;
  getOutcomesByCompetency(competencyId: number): Promise<Outcome[]>;

  // Assignment operations
  assignStudentToProject(projectId: number, studentId: string): Promise<ProjectAssignment>;
  getProjectAssignments(projectId: number): Promise<ProjectAssignment[]>;
  updateProjectProgress(projectId: number, studentId: string, progress: number): Promise<void>;

  // Grade operations
  createGrade(grade: Omit<Grade, "id" | "gradedAt">): Promise<Grade>;
  getGradesBySubmission(submissionId: number): Promise<Grade[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Project operations
  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db
      .insert(projects)
      .values(project)
      .returning();
    return newProject;
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id));
    return project;
  }

  async getProjectsByTeacher(teacherId: string): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.teacherId, teacherId))
      .orderBy(desc(projects.createdAt));
  }

  async getProjectsByStudent(studentId: string): Promise<Project[]> {
    return await db
      .select({
        id: projects.id,
        title: projects.title,
        description: projects.description,
        teacherId: projects.teacherId,
        competencyIds: projects.competencyIds,
        status: projects.status,
        dueDate: projects.dueDate,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .innerJoin(projectAssignments, eq(projects.id, projectAssignments.projectId))
      .where(eq(projectAssignments.studentId, studentId))
      .orderBy(desc(projects.createdAt));
  }

  async updateProject(id: number, updates: Partial<InsertProject>): Promise<Project> {
    const [updatedProject] = await db
      .update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updatedProject;
  }

  async deleteProject(id: number): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Milestone operations
  async createMilestone(milestone: InsertMilestone): Promise<Milestone> {
    const [newMilestone] = await db
      .insert(milestones)
      .values(milestone)
      .returning();
    return newMilestone;
  }

  async getMilestonesByProject(projectId: number): Promise<Milestone[]> {
    return await db
      .select()
      .from(milestones)
      .where(eq(milestones.projectId, projectId))
      .orderBy(asc(milestones.order));
  }

  async updateMilestone(id: number, updates: Partial<InsertMilestone>): Promise<Milestone> {
    const [updatedMilestone] = await db
      .update(milestones)
      .set(updates)
      .where(eq(milestones.id, id))
      .returning();
    return updatedMilestone;
  }

  async deleteMilestone(id: number): Promise<void> {
    await db.delete(milestones).where(eq(milestones.id, id));
  }

  // Assessment operations
  async createAssessment(assessment: InsertAssessment): Promise<Assessment> {
    const [newAssessment] = await db
      .insert(assessments)
      .values(assessment)
      .returning();
    return newAssessment;
  }

  async getAssessment(id: number): Promise<Assessment | undefined> {
    const [assessment] = await db
      .select()
      .from(assessments)
      .where(eq(assessments.id, id));
    return assessment;
  }

  async getAssessmentsByMilestone(milestoneId: number): Promise<Assessment[]> {
    return await db
      .select()
      .from(assessments)
      .where(eq(assessments.milestoneId, milestoneId))
      .orderBy(desc(assessments.createdAt));
  }

  async updateAssessment(id: number, updates: Partial<InsertAssessment>): Promise<Assessment> {
    const [updatedAssessment] = await db
      .update(assessments)
      .set(updates)
      .where(eq(assessments.id, id))
      .returning();
    return updatedAssessment;
  }

  // Submission operations
  async createSubmission(submission: InsertSubmission): Promise<Submission> {
    const [newSubmission] = await db
      .insert(submissions)
      .values(submission)
      .returning();
    return newSubmission;
  }

  async getSubmission(id: number): Promise<Submission | undefined> {
    const [submission] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, id));
    return submission;
  }

  async getSubmissionsByStudent(studentId: string): Promise<Submission[]> {
    return await db
      .select()
      .from(submissions)
      .where(eq(submissions.studentId, studentId))
      .orderBy(desc(submissions.submittedAt));
  }

  async getSubmissionsByAssessment(assessmentId: number): Promise<Submission[]> {
    return await db
      .select()
      .from(submissions)
      .where(eq(submissions.assessmentId, assessmentId))
      .orderBy(desc(submissions.submittedAt));
  }

  async updateSubmission(id: number, updates: Partial<InsertSubmission>): Promise<Submission> {
    const [updatedSubmission] = await db
      .update(submissions)
      .set(updates)
      .where(eq(submissions.id, id))
      .returning();
    return updatedSubmission;
  }

  // Credential operations
  async createCredential(credential: InsertCredential): Promise<Credential> {
    const [newCredential] = await db
      .insert(credentials)
      .values(credential)
      .returning();
    return newCredential;
  }

  async getCredentialsByStudent(studentId: string): Promise<Credential[]> {
    return await db
      .select()
      .from(credentials)
      .where(eq(credentials.studentId, studentId))
      .orderBy(desc(credentials.awardedAt));
  }

  async updateCredential(id: number, updates: Partial<InsertCredential>): Promise<Credential> {
    const [updatedCredential] = await db
      .update(credentials)
      .set(updates)
      .where(eq(credentials.id, id))
      .returning();
    return updatedCredential;
  }

  // Portfolio operations
  async createPortfolioArtifact(artifact: InsertPortfolioArtifact): Promise<PortfolioArtifact> {
    const [newArtifact] = await db
      .insert(portfolioArtifacts)
      .values(artifact)
      .returning();
    return newArtifact;
  }

  async getPortfolioArtifactsByStudent(studentId: string): Promise<PortfolioArtifact[]> {
    return await db
      .select()
      .from(portfolioArtifacts)
      .where(eq(portfolioArtifacts.studentId, studentId))
      .orderBy(desc(portfolioArtifacts.createdAt));
  }

  async updatePortfolioArtifact(id: number, updates: Partial<InsertPortfolioArtifact>): Promise<PortfolioArtifact> {
    const [updatedArtifact] = await db
      .update(portfolioArtifacts)
      .set(updates)
      .where(eq(portfolioArtifacts.id, id))
      .returning();
    return updatedArtifact;
  }

  // Competency operations
  async getCompetencies(): Promise<Competency[]> {
    return await db
      .select()
      .from(competencies)
      .orderBy(asc(competencies.name));
  }

  async getOutcomesByCompetency(competencyId: number): Promise<Outcome[]> {
    return await db
      .select()
      .from(outcomes)
      .where(eq(outcomes.competencyId, competencyId))
      .orderBy(asc(outcomes.name));
  }

  // Assignment operations
  async assignStudentToProject(projectId: number, studentId: string): Promise<ProjectAssignment> {
    const [assignment] = await db
      .insert(projectAssignments)
      .values({
        projectId,
        studentId,
        progress: "0",
      })
      .returning();
    return assignment;
  }

  async getProjectAssignments(projectId: number): Promise<ProjectAssignment[]> {
    return await db
      .select()
      .from(projectAssignments)
      .where(eq(projectAssignments.projectId, projectId));
  }

  async updateProjectProgress(projectId: number, studentId: string, progress: number): Promise<void> {
    await db
      .update(projectAssignments)
      .set({ progress: progress.toString() })
      .where(
        and(
          eq(projectAssignments.projectId, projectId),
          eq(projectAssignments.studentId, studentId)
        )
      );
  }

  // Grade operations
  async createGrade(grade: Omit<Grade, "id" | "gradedAt">): Promise<Grade> {
    const [newGrade] = await db
      .insert(grades)
      .values(grade)
      .returning();
    return newGrade;
  }

  async getGradesBySubmission(submissionId: number): Promise<Grade[]> {
    return await db
      .select()
      .from(grades)
      .where(eq(grades.submissionId, submissionId))
      .orderBy(desc(grades.gradedAt));
  }
}

export const storage = new DatabaseStorage();
