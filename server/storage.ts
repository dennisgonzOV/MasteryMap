import { 
  users, 
  projects, 
  milestones, 
  assessments, 
  submissions, 
  credentials, 
  portfolioArtifacts,
  learnerOutcomes,
  competencies,
  componentSkills,
  projectAssignments,
  schools,
  authTokens,
  projectTeams,
  projectTeamMembers,
  grades,
  type User,
  type Project,
  type Milestone,
  type Assessment,
  type Submission,
  type Credential,
  type PortfolioArtifact,
  type LearnerOutcome,
  type Competency,
  type ComponentSkill,
  type ProjectAssignment,
  type School,
  type AuthToken,
  type ProjectTeam,
  type ProjectTeamMember,
  type Grade,
  type UpsertUser,
  type InsertProject,
  type InsertMilestone,
  type InsertAssessment,
  type InsertSubmission,
  type InsertCredential,
  type InsertPortfolioArtifact,
  type InsertAuthToken,
  type InsertSchool,
  type InsertProjectTeam,
  type InsertProjectTeamMember
} from "../shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, isNull, inArray, ne, sql, like, or } from "drizzle-orm";

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
  getProjectTeam(teamId: number): Promise<ProjectTeam | undefined>;
  deleteProjectTeam(teamId: number): Promise<void>;
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
  updateAssessment(id: number, updates: Partial<InsertAssessment>): Promise<Assessment>;
  deleteAssessment(id: number): Promise<void>;
  getAssessmentsForStudent(studentId: number): Promise<Assessment[]>;

  // Submission operations
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  getSubmission(id: number): Promise<Submission | undefined>;
  getSubmissionsByAssessment(assessmentId: number): Promise<Submission[]>;
  getSubmissionsByStudent(studentId: number): Promise<Submission[]>;
  updateSubmission(id: number, updates: Partial<InsertSubmission>): Promise<Submission>;
  deleteSubmission(id: number): Promise<void>;

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
  getComponentSkillsByIds(skillIds: number[]): Promise<any[]>;

  // Legacy competency operations
  getCompetencies(): Promise<Competency[]>;

  // Assignment operations
  assignStudentToProject(projectId: number, studentId: number): Promise<ProjectAssignment>;
  getProjectAssignments(projectId: number): Promise<ProjectAssignment[]>;
  updateProjectProgress(projectId: number, studentId: number, progress: number): Promise<void>;

  // Grade operations
  createGrade(grade: Omit<Grade, "id" | "gradedAt">): Promise<Grade>;
  getGradesBySubmission(submissionId: number): Promise<Grade[]>;
  getStudentCompetencyProgress(studentId: number): Promise<Array<{
    competencyId: number;
    competencyName: string;
    componentSkillId: number;
    componentSkillName: string;
    averageScore: number;
    totalScores: number[];
    lastScore: number;
    lastUpdated: string;
    progressDirection: 'improving' | 'declining' | 'stable';
  }>>;

  // Generate unique assessment access code
  generateAssessmentAccessCode(): Promise<string>;

  // Get assessment by access code
  getAssessmentByAccessCode(accessCode: string): Promise<Assessment | null>;
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
      role: projectTeamMembers.role,
      joinedAt: projectTeamMembers.joinedAt,
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
      eq(users.schoolId,schoolId),
      eq(users.role, 'student')
    )).orderBy(asc(users.firstName), asc(users.lastName));
  }

  async getProjectTeam(teamId: number): Promise<ProjectTeam | undefined> {
    const [team] = await db.select().from(projectTeams).where(eq(projectTeams.id, teamId));
    return team;
  }

  async deleteProjectTeam(teamId: number): Promise<void> {
    // First delete all team members
    await db.delete(projectTeamMembers).where(eq(projectTeamMembers.teamId, teamId));
    // Then delete the team
    await db.delete(projectTeams).where(eq(projectTeams.id, teamId));
  }

  // Project operations
  async createProject(projectData: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(projectData).returning();
    return project;
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async getProjectsByTeacher(teacherId: number): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.teacherId, teacherId));
  }

  async getProjectsByStudent(studentId: number): Promise<Project[]> {
    const projectAssignmentResults = await db
      .select({
        project: projects
      })
      .from(projectAssignments)
      .innerJoin(projects, eq(projectAssignments.projectId, projects.id))
      .where(eq(projectAssignments.studentId, studentId));
    
    return projectAssignmentResults.map(result => result.project);
  }

  async updateProject(id: number, updates: Partial<InsertProject>): Promise<Project> {
    const [project] = await db
      .update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project;
  }

  async deleteProject(id: number): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Milestone operations
  async createMilestone(milestoneData: InsertMilestone): Promise<Milestone> {
    const [milestone] = await db.insert(milestones).values(milestoneData).returning();
    return milestone;
  }

  async getMilestone(id: number): Promise<Milestone | undefined> {
    const [milestone] = await db.select().from(milestones).where(eq(milestones.id, id));
    return milestone;
  }

  async getMilestonesByProject(projectId: number): Promise<Milestone[]> {
    return await db.select().from(milestones).where(eq(milestones.projectId, projectId)).orderBy(milestones.order);
  }

  async updateMilestone(id: number, updates: Partial<InsertMilestone>): Promise<Milestone> {
    const [milestone] = await db
      .update(milestones)
      .set(updates)
      .where(eq(milestones.id, id))
      .returning();
    return milestone;
  }

  async deleteMilestone(id: number): Promise<void> {
    await db.delete(milestones).where(eq(milestones.id, id));
  }

  // Assessment operations
  async createAssessment(assessmentData: InsertAssessment): Promise<Assessment> {
    const [assessment] = await db.insert(assessments).values(assessmentData).returning();
    return assessment;
  }

  async getAssessment(id: number): Promise<Assessment | undefined> {
    const [assessment] = await db.select().from(assessments).where(eq(assessments.id, id));
    return assessment;
  }

  async getAssessmentsByMilestone(milestoneId: number): Promise<Assessment[]> {
    return await db.select().from(assessments).where(eq(assessments.milestoneId, milestoneId));
  }

  async updateAssessment(id: number, updates: Partial<InsertAssessment>): Promise<Assessment> {
    const [assessment] = await db
      .update(assessments)
      .set(updates)
      .where(eq(assessments.id, id))
      .returning();
    return assessment;
  }

  async deleteAssessment(id: number): Promise<void> {
    await db.delete(assessments).where(eq(assessments.id, id));
  }

  async getAssessmentsForStudent(studentId: number): Promise<Assessment[]> {
    // Get assessments from projects assigned to the student
    const results = await db
      .select({
        assessment: assessments
      })
      .from(assessments)
      .innerJoin(milestones, eq(assessments.milestoneId, milestones.id))
      .innerJoin(projects, eq(milestones.projectId, projects.id))
      .innerJoin(projectAssignments, eq(projects.id, projectAssignments.projectId))
      .where(eq(projectAssignments.studentId, studentId));
    
    return results.map(result => result.assessment);
  }

  // Submission operations
  async createSubmission(submissionData: InsertSubmission): Promise<Submission> {
    const [submission] = await db.insert(submissions).values(submissionData).returning();
    return submission;
  }

  async getSubmission(id: number): Promise<Submission | undefined> {
    const [submission] = await db.select().from(submissions).where(eq(submissions.id, id));
    return submission;
  }

  async getSubmissionsByAssessment(assessmentId: number): Promise<Submission[]> {
    return await db.select().from(submissions).where(eq(submissions.assessmentId, assessmentId));
  }

  async getSubmissionsByStudent(studentId: number): Promise<Submission[]> {
    return await db.select().from(submissions).where(eq(submissions.studentId, studentId));
  }

  async updateSubmission(id: number, updates: Partial<InsertSubmission>): Promise<Submission> {
    const [submission] = await db
      .update(submissions)
      .set(updates)
      .where(eq(submissions.id, id))
      .returning();
    return submission;
  }

  async deleteSubmission(id: number): Promise<void> {
    await db.delete(submissions).where(eq(submissions.id, id));
  }

  // Credential operations
  async createCredential(credentialData: InsertCredential): Promise<Credential> {
    const [credential] = await db.insert(credentials).values(credentialData).returning();
    return credential;
  }

  async getCredentialsByStudent(studentId: number): Promise<Credential[]> {
    return await db.select().from(credentials).where(eq(credentials.studentId, studentId));
  }

  async updateCredential(id: number, updates: Partial<InsertCredential>): Promise<Credential> {
    const [credential] = await db
      .update(credentials)
      .set(updates)
      .where(eq(credentials.id, id))
      .returning();
    return credential;
  }

  // Portfolio operations
  async createPortfolioArtifact(artifactData: InsertPortfolioArtifact): Promise<PortfolioArtifact> {
    const [artifact] = await db.insert(portfolioArtifacts).values(artifactData).returning();
    return artifact;
  }

  async getPortfolioArtifactsByStudent(studentId: number): Promise<PortfolioArtifact[]> {
    return await db.select().from(portfolioArtifacts).where(eq(portfolioArtifacts.studentId, studentId));
  }

  async updatePortfolioArtifact(id: number, updates: Partial<InsertPortfolioArtifact>): Promise<PortfolioArtifact> {
    const [artifact] = await db
      .update(portfolioArtifacts)
      .set(updates)
      .where(eq(portfolioArtifacts.id, id))
      .returning();
    return artifact;
  }

  // 3-Level Hierarchy operations
  async getLearnerOutcomes(): Promise<LearnerOutcome[]> {
    return await db.select().from(learnerOutcomes).orderBy(learnerOutcomes.name);
  }

  async getLearnerOutcomesWithCompetencies(): Promise<Array<LearnerOutcome & { competencies: Array<Competency & { componentSkills: ComponentSkill[] }> }>> {
    const learnerOutcomesList = await db.select().from(learnerOutcomes).orderBy(learnerOutcomes.name);
    
    const enrichedOutcomes = await Promise.all(
      learnerOutcomesList.map(async (outcome) => {
        const competenciesList = await db
          .select()
          .from(competencies)
          .where(eq(competencies.learnerOutcomeId, outcome.id))
          .orderBy(competencies.name);
        
        const enrichedCompetencies = await Promise.all(
          competenciesList.map(async (competency) => {
            const skillsList = await db
              .select()
              .from(componentSkills)
              .where(eq(componentSkills.competencyId, competency.id))
              .orderBy(componentSkills.name);
            
            return {
              ...competency,
              componentSkills: skillsList
            };
          })
        );

        return {
          ...outcome,
          competencies: enrichedCompetencies
        };
      })
    );

    return enrichedOutcomes;
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

  // Get component skills with full details
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

  async getComponentSkillsByIds(skillIds: number[]) {
    if (!skillIds || skillIds.length === 0) {
      return [];
    }

    try {
      // First get the component skills
      const skills = await db
        .select()
        .from(componentSkills)
        .where(inArray(componentSkills.id, skillIds));

      if (!skills || skills.length === 0) {
        return [];
      }

      // Then enrich each skill with competency and learner outcome data
      const enrichedSkills = await Promise.all(
        skills.map(async (skill) => {
          try {
            // Get competency data
            const [competency] = await db
              .select()
              .from(competencies)
              .where(eq(competencies.id, skill.competencyId!));

            let learnerOutcome = null;
            if (competency?.learnerOutcomeId) {
              const [outcome] = await db
                .select()
                .from(learnerOutcomes)
                .where(eq(learnerOutcomes.id, competency.learnerOutcomeId));
              learnerOutcome = outcome;
            }

            return {
              id: skill.id,
              name: skill.name,
              rubricLevels: skill.rubricLevels,
              competencyId: skill.competencyId,
              competencyName: competency?.name || 'Unknown Competency',
              learnerOutcomeName: learnerOutcome?.name || 'Unknown Learner Outcome',
            };
          } catch (skillError) {
            console.error(`Error enriching skill ${skill.id}:`, skillError);
            return {
              id: skill.id,
              name: skill.name,
              rubricLevels: skill.rubricLevels,
              competencyId: skill.competencyId,
              competencyName: 'Unknown Competency',
              learnerOutcomeName: 'Unknown Learner Outcome',
            };
          }
        })
      );

      return enrichedSkills;
    } catch (error) {
      console.error("Error in getComponentSkillsByIds:", error);
      return [];
    }
  }

  // Legacy competency operations
  async getCompetencies(): Promise<Competency[]> {
    return await db.select().from(competencies).orderBy(competencies.name);
  }

  // Assignment operations
  async assignStudentToProject(projectId: number, studentId: number): Promise<ProjectAssignment> {
    const [assignment] = await db
      .insert(projectAssignments)
      .values({ projectId, studentId })
      .returning();
    return assignment;
  }

  async getProjectAssignments(projectId: number): Promise<ProjectAssignment[]> {
    return await db.select().from(projectAssignments).where(eq(projectAssignments.projectId, projectId));
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
  async createGrade(gradeData: Omit<Grade, "id" | "gradedAt">): Promise<Grade> {
    const [grade] = await db.insert(grades).values({
      ...gradeData,
      gradedAt: new Date()
    }).returning();
    return grade;
  }

  async getGradesBySubmission(submissionId: number): Promise<Grade[]> {
    return await db.select().from(grades).where(eq(grades.submissionId, submissionId));
  }

  async getStudentCompetencyProgress(studentId: number): Promise<Array<{
    competencyId: number;
    competencyName: string;
    componentSkillId: number;
    componentSkillName: string;
    averageScore: number;
    totalScores: number[];
    lastScore: number;
    lastUpdated: string;
    progressDirection: 'improving' | 'declining' | 'stable';
  }>> {
    // This is a complex aggregation query that would need to be implemented
    // based on the grades table and component skills
    return [];
  }

  // Generate unique assessment access code
  async generateAssessmentAccessCode(): Promise<string> {
    let code: string;
    let exists = true;

    while (exists) {
      // Generate 6-digit code
      code = Math.floor(100000 + Math.random() * 900000).toString();

      // Check if code already exists - this would need an accessCode field in assessments
      // For now, just return the generated code
      exists = false;
    }

    return code!;
  }

  // Get assessment by access code
  async getAssessmentByAccessCode(accessCode: string): Promise<Assessment | null> {
    // This would need an accessCode field in the assessments table
    // For now, return null
    return null;
  }
}

export const storage = new DatabaseStorage();