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
  grades,
  projectAssignments,
  authTokens,
  learnerOutcomes,
  componentSkills,
  schools,
  projectTeams,
  projectTeamMembers,
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
  type Grade,
  type ProjectAssignment,
  type AuthToken,
  type InsertAuthToken,
  type LearnerOutcome,
  type ComponentSkill,
  type School,
  type InsertSchool,
  type ProjectTeam,
  type InsertProjectTeam,
  type ProjectTeamMember,
  type InsertProjectTeamMember,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, inArray, sql, isNull } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<UpsertUser>): Promise<User>;
  
  // Auth token operations
  createAuthToken(token: InsertAuthToken): Promise<AuthToken>;
  getAuthToken(token: string): Promise<AuthToken | undefined>;
  deleteAuthToken(token: string): Promise<void>;
  deleteAuthTokensByUserId(userId: number): Promise<void>;

  // School operations
  getSchools(): Promise<School[]>;
  getSchool(id: number): Promise<School | undefined>;
  createSchool(school: InsertSchool): Promise<School>;

  // Project team operations
  createProjectTeam(team: InsertProjectTeam): Promise<ProjectTeam>;
  getProjectTeams(projectId: number): Promise<ProjectTeam[]>;
  addTeamMember(teamMember: InsertProjectTeamMember): Promise<ProjectTeamMember>;
  removeTeamMember(memberId: number): Promise<void>;
  getTeamMembers(teamId: number): Promise<ProjectTeamMember[]>;
  getStudentsBySchool(schoolId: number): Promise<User[]>;

  // Project operations
  createProject(project: InsertProject): Promise<Project>;
  getProject(id: number): Promise<Project | undefined>;
  getProjectsByTeacher(teacherId: number): Promise<Project[]>;
  getProjectsByStudent(studentId: number): Promise<Project[]>;
  updateProject(id: number, updates: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: number): Promise<void>;

  // Milestone operations
  createMilestone(milestone: InsertMilestone): Promise<Milestone>;
  getMilestone(id: number): Promise<Milestone | undefined>;
  getMilestonesByProject(projectId: number): Promise<Milestone[]>;
  updateMilestone(id: number, updates: Partial<InsertMilestone>): Promise<Milestone>;
  deleteMilestone(id: number): Promise<void>;

  // Assessment operations
  createAssessment(assessment: InsertAssessment): Promise<Assessment>;
  getAssessment(id: number): Promise<Assessment | undefined>;
  getAssessmentsByMilestone(milestoneId: number): Promise<Assessment[]>;
  getStandaloneAssessments(): Promise<Assessment[]>; // Get all standalone assessments
  getAllAssessments(): Promise<Assessment[]>; // Get all assessments (both milestone-linked and standalone)
  updateAssessment(id: number, updates: Partial<InsertAssessment>): Promise<Assessment>;
  deleteAssessment(id: number): Promise<void>;

  // Submission operations
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  getSubmission(id: number): Promise<Submission | undefined>;
  getSubmissionsByStudent(studentId: number): Promise<Submission[]>;
  getSubmissionsByAssessment(assessmentId: number): Promise<Submission[]>;
  updateSubmission(id: number, updates: Partial<InsertSubmission>): Promise<Submission>;

  // Credential operations
  createCredential(credential: InsertCredential): Promise<Credential>;
  getCredentialsByStudent(studentId: number): Promise<Credential[]>;
  updateCredential(id: number, updates: Partial<InsertCredential>): Promise<Credential>;

  // Portfolio operations
  createPortfolioArtifact(artifact: InsertPortfolioArtifact): Promise<PortfolioArtifact>;
  getPortfolioArtifactsByStudent(studentId: number): Promise<PortfolioArtifact[]>;
  updatePortfolioArtifact(id: number, updates: Partial<InsertPortfolioArtifact>): Promise<PortfolioArtifact>;

  // 3-Level Hierarchy operations
  getLearnerOutcomes(): Promise<LearnerOutcome[]>;
  getLearnerOutcomesWithCompetencies(): Promise<Array<LearnerOutcome & { competencies: Array<Competency & { componentSkills: ComponentSkill[] }> }>>;
  getCompetenciesByLearnerOutcome(learnerOutcomeId: number): Promise<Competency[]>;
  getComponentSkillsByCompetency(competencyId: number): Promise<ComponentSkill[]>;
  getComponentSkillsWithDetails(): Promise<any[]>;

  // Legacy competency operations
  getCompetencies(): Promise<Competency[]>;

  // Assignment operations
  assignStudentToProject(projectId: number, studentId: number): Promise<ProjectAssignment>;
  getProjectAssignments(projectId: number): Promise<ProjectAssignment[]>;
  updateProjectProgress(projectId: number, studentId: number, progress: number): Promise<void>;

  // Grade operations
  createGrade(grade: Omit<Grade, "id" | "gradedAt">): Promise<Grade>;
  getGradesBySubmission(submissionId: number): Promise<Grade[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<UpsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Auth token operations
  async createAuthToken(tokenData: InsertAuthToken): Promise<AuthToken> {
    const [token] = await db.insert(authTokens).values(tokenData).returning();
    return token;
  }

  async getAuthToken(token: string): Promise<AuthToken | undefined> {
    const [tokenRecord] = await db
      .select()
      .from(authTokens)
      .where(eq(authTokens.token, token));
    return tokenRecord;
  }

  async deleteAuthToken(token: string): Promise<void> {
    await db.delete(authTokens).where(eq(authTokens.token, token));
  }

  async deleteAuthTokensByUserId(userId: number): Promise<void> {
    await db.delete(authTokens).where(eq(authTokens.userId, userId));
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

  async getProjectsByTeacher(teacherId: number): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.teacherId, teacherId))
      .orderBy(desc(projects.createdAt));
  }

  async getProjectsByStudent(studentId: number): Promise<Project[]> {
    // Get projects where student is a team member
    const teamProjects = await db
      .select({
        id: projects.id,
        title: projects.title,
        description: projects.description,
        teacherId: projects.teacherId,
        schoolId: projects.schoolId,
        competencyIds: projects.competencyIds,
        componentSkillIds: projects.componentSkillIds,
        status: projects.status,
        dueDate: projects.dueDate,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .innerJoin(projectTeams, eq(projects.id, projectTeams.projectId))
      .innerJoin(projectTeamMembers, eq(projectTeams.id, projectTeamMembers.teamId))
      .where(eq(projectTeamMembers.studentId, studentId))
      .orderBy(desc(projects.createdAt));

    // Get directly assigned projects (legacy support)
    const assignedProjects = await db
      .select({
        id: projects.id,
        title: projects.title,
        description: projects.description,
        teacherId: projects.teacherId,
        schoolId: projects.schoolId,
        competencyIds: projects.competencyIds,
        componentSkillIds: projects.componentSkillIds,
        status: projects.status,
        dueDate: projects.dueDate,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .innerJoin(projectAssignments, eq(projects.id, projectAssignments.projectId))
      .where(eq(projectAssignments.studentId, studentId))
      .orderBy(desc(projects.createdAt));

    // Combine and deduplicate projects
    const allProjects = [...teamProjects, ...assignedProjects];
    const uniqueProjects = allProjects.filter((project, index, self) => 
      index === self.findIndex(p => p.id === project.id)
    );

    return uniqueProjects.sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
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

  async getMilestone(id: number): Promise<Milestone | undefined> {
    const [milestone] = await db
      .select()
      .from(milestones)
      .where(eq(milestones.id, id));
    return milestone;
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

  async getStandaloneAssessments(): Promise<Assessment[]> {
    return await db
      .select()
      .from(assessments)
      .where(sql`${assessments.milestoneId} IS NULL`)
      .orderBy(desc(assessments.createdAt));
  }

  async getAllAssessments(): Promise<Assessment[]> {
    return await db
      .select()
      .from(assessments)
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

  async deleteAssessment(id: number): Promise<void> {
    await db.delete(assessments).where(eq(assessments.id, id));
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

  async getSubmissionsByStudent(studentId: number): Promise<Submission[]> {
    return await db
      .select()
      .from(submissions)
      .where(eq(submissions.studentId, studentId))
      .orderBy(desc(submissions.submittedAt));
  }

  async getSubmissionsByAssessment(assessmentId: number): Promise<any[]> {
    return await db
      .select({
        id: submissions.id,
        assessmentId: submissions.assessmentId,
        studentId: submissions.studentId,
        responses: submissions.responses,
        submittedAt: submissions.submittedAt,
        studentName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        studentEmail: users.email,
      })
      .from(submissions)
      .innerJoin(users, eq(submissions.studentId, users.id))
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

  async getCredentialsByStudent(studentId: number): Promise<Credential[]> {
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

  async getPortfolioArtifactsByStudent(studentId: number): Promise<PortfolioArtifact[]> {
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



  // Assignment operations
  async assignStudentToProject(projectId: number, studentId: number): Promise<ProjectAssignment> {
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

  async updateProjectProgress(projectId: number, studentId: number, progress: number): Promise<void> {
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

  // 3-Level Hierarchy operations
  async getLearnerOutcomes(): Promise<LearnerOutcome[]> {
    return await db.select().from(learnerOutcomes).orderBy(learnerOutcomes.name);
  }

  async getLearnerOutcomesWithCompetencies(): Promise<Array<LearnerOutcome & { competencies: Array<Competency & { componentSkills: ComponentSkill[] }> }>> {
    const outcomes = await db.select().from(learnerOutcomes).orderBy(learnerOutcomes.name);
    
    const result = [];
    for (const outcome of outcomes) {
      const competenciesData = await db
        .select()
        .from(competencies)
        .where(eq(competencies.learnerOutcomeId, outcome.id))
        .orderBy(competencies.name);
      
      const competenciesWithSkills = [];
      for (const competency of competenciesData) {
        const skills = await db
          .select()
          .from(componentSkills)
          .where(eq(componentSkills.competencyId, competency.id))
          .orderBy(componentSkills.name);
        
        competenciesWithSkills.push({
          ...competency,
          componentSkills: skills,
        });
      }
      
      result.push({
        ...outcome,
        competencies: competenciesWithSkills,
      });
    }
    
    return result;
  }

  async getCompetenciesByLearnerOutcome(learnerOutcomeId: number): Promise<Competency[]> {
    return await db
      .select()
      .from(competencies)
      .where(eq(competencies.learnerOutcomeId, learnerOutcomeId))
      .orderBy(competencies.name);
  }

  async getComponentSkillsByCompetency(competencyId: number): Promise<ComponentSkill[]> {
    return await db
      .select()
      .from(componentSkills)
      .where(eq(componentSkills.competencyId, competencyId))
      .orderBy(componentSkills.name);
  }

  async getComponentSkillsWithDetails(): Promise<any[]> {
    return await db
      .select({
        id: componentSkills.id,
        name: componentSkills.name,
        competencyId: componentSkills.competencyId,
        competencyName: competencies.name,
        competencyCategory: competencies.category,
        learnerOutcomeId: competencies.learnerOutcomeId,
        learnerOutcomeName: learnerOutcomes.name,
      })
      .from(componentSkills)
      .innerJoin(competencies, eq(componentSkills.competencyId, competencies.id))
      .innerJoin(learnerOutcomes, eq(competencies.learnerOutcomeId, learnerOutcomes.id))
      .orderBy(componentSkills.id);
  }

  // School operations
  async getSchools(): Promise<School[]> {
    return await db.select().from(schools).orderBy(schools.name);
  }

  async getSchool(id: number): Promise<School | undefined> {
    const [school] = await db.select().from(schools).where(eq(schools.id, id));
    return school;
  }

  async createSchool(schoolData: InsertSchool): Promise<School> {
    const [school] = await db.insert(schools).values(schoolData).returning();
    return school;
  }

  // Project team operations
  async createProjectTeam(teamData: InsertProjectTeam): Promise<ProjectTeam> {
    const [team] = await db.insert(projectTeams).values(teamData).returning();
    return team;
  }

  async getProjectTeams(projectId: number): Promise<ProjectTeam[]> {
    return await db.select().from(projectTeams).where(eq(projectTeams.projectId, projectId));
  }

  async addTeamMember(memberData: InsertProjectTeamMember): Promise<ProjectTeamMember> {
    const [member] = await db.insert(projectTeamMembers).values(memberData).returning();
    return member;
  }

  async removeTeamMember(memberId: number): Promise<void> {
    await db.delete(projectTeamMembers).where(eq(projectTeamMembers.id, memberId));
  }

  async getTeamMembers(teamId: number): Promise<ProjectTeamMember[]> {
    return await db.select({
      id: projectTeamMembers.id,
      teamId: projectTeamMembers.teamId,
      studentId: projectTeamMembers.studentId,
      student: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email
      }
    }).from(projectTeamMembers)
    .innerJoin(users, eq(projectTeamMembers.studentId, users.id))
    .where(eq(projectTeamMembers.teamId, teamId));
  }

  async getStudentsBySchool(schoolId: number): Promise<User[]> {
    return await db.select().from(users).where(and(
      eq(users.schoolId, schoolId),
      eq(users.role, 'student')
    )).orderBy(users.firstName, users.lastName);
  }
}

export const storage = new DatabaseStorage();
