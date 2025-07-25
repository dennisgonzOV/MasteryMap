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
  bestStandards,
  selfEvaluations,
  grades,
  assessmentAssignments,
  discussionThreads,
  discussionPosts,
  discussionLikes,
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
  type BestStandard,
  type SelfEvaluation,
  type Grade,
  type AssessmentAssignment,
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
  type InsertProjectTeamMember,
  type InsertSelfEvaluation,
  type DiscussionThread,
  type InsertDiscussionThread,
  type DiscussionPost,
  type InsertDiscussionPost
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

  // Discussion Forum operations
  createDiscussionThread(data: InsertDiscussionThread): Promise<DiscussionThread>;
  getDiscussionThreadsByProject(projectId: number): Promise<DiscussionThread[]>;
  getDiscussionThread(threadId: number): Promise<DiscussionThread | null>;
  createDiscussionPost(data: InsertDiscussionPost): Promise<DiscussionPost>;
  getDiscussionPostsByThread(threadId: number): Promise<DiscussionPost[]>;
  updateDiscussionThread(threadId: number, data: Partial<InsertDiscussionThread>): Promise<DiscussionThread | undefined>;
  deleteDiscussionPost(postId: number): Promise<void>;
  toggleDiscussionLike(postId: number, userId: number): Promise<boolean>;

  // Self-evaluation operations
  createSelfEvaluation(selfEvaluation: InsertSelfEvaluation): Promise<SelfEvaluation>;
  getSelfEvaluation(id: number): Promise<SelfEvaluation | undefined>;
  getSelfEvaluationsByAssessment(assessmentId: number): Promise<SelfEvaluation[]>;
  getSelfEvaluationsByStudent(studentId: number): Promise<SelfEvaluation[]>;
  updateSelfEvaluation(id: number, updates: Partial<InsertSelfEvaluation>): Promise<SelfEvaluation>;
  flagRiskySelfEvaluation(id: number, teacherNotified: boolean): Promise<void>;

    // B.E.S.T. Standards methods
  getBestStandards(): Promise<BestStandard[]>;
  getBestStandardsBySubject(subject: string): Promise<BestStandard[]>;
  getBestStandardsByGrade(grade: string): Promise<BestStandard[]>;
  searchBestStandards(searchTerm: string): Promise<BestStandard[]>;

  // Generate unique assessment access code
  generateAssessmentAccessCode(): Promise<string>;

  // Update assessment with access code
  updateAssessmentAccessCode(assessmentId: number, accessCode: string): Promise<Assessment[]>;

  // Get assessment by access code
  getAssessmentByAccessCode(accessCode: string): Promise<Assessment | null>;

  // Assign assessment to student via code
  assignAssessmentToStudentViaCode(assessmentId: number, studentId: number): Promise<AssessmentAssignment>;

  // Get assessments assigned to student via codes
  getCodeAssignedAssessments(studentId: number): Promise<any[]>;
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
    // Get projects where student is a direct assignment
    const directProjects = await db
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
      .where(and(
        eq(projectAssignments.studentId, studentId),
        ne(projects.status, 'draft')
      ));

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
      .where(and(
        eq(projectTeamMembers.studentId, studentId),
        ne(projects.status, 'draft')
      ))
      .where(and(
        eq(projectTeamMembers.studentId, studentId),
        ne(projects.status, 'draft')
      ));

    // Combine and deduplicate projects
    const allProjects = [...directProjects, ...teamProjects];
    const uniqueProjects = Array.from(
      new Map(allProjects.map(p => [p.id, p])).values()
    );

    return uniqueProjects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
  async createAssessment(data: InsertAssessment): Promise<Assessment> {
    // Ensure questions with options have them properly serialized
    const processedData = {
      ...data,
      questions: data.questions ? data.questions.map((q: any) => ({
        ...q,
        options: q.options && Array.isArray(q.options) ? q.options : (q.options ? JSON.parse(q.options) : undefined)
      })) : data.questions
    };

    const [assessment] = await db.insert(assessments).values(processedData).returning();
    return assessment;
  }

  async getAssessment(id: number): Promise<Assessment | undefined> {
    const [assessment] = await db.select().from(assessments).where(eq(assessments.id, id));

    if (assessment && assessment.questions) {
      // Ensure options are properly parsed for multiple choice questions
      assessment.questions = assessment.questions.map((q: any) => {
        if (q.type === 'multiple-choice' && q.options) {
          return {
            ...q,
            options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
          };
        }
        return q;
      });
    }

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
    try {
      // Get all grades for the student with related component skills and competencies
      const studentGrades = await db
        .select({
          gradeId: grades.id,
          score: grades.score,
          gradedAt: grades.gradedAt,
          componentSkillId: grades.componentSkillId,
          componentSkillName: componentSkills.name,
          competencyId: competencies.id,
          competencyName: competencies.name,
          submissionId: grades.submissionId,
        })
        .from(grades)
        .innerJoin(submissions, eq(grades.submissionId, submissions.id))
        .innerJoin(componentSkills, eq(grades.componentSkillId, componentSkills.id))
        .innerJoin(competencies, eq(componentSkills.competencyId, competencies.id))
        .where(eq(submissions.studentId, studentId))
        .orderBy(desc(grades.gradedAt));

      // Group by competency and component skill
      const progressMap = new Map<string, {
        competencyId: number;
        competencyName: string;
        componentSkillId: number;
        componentSkillName: string;
        scores: { score: number; date: Date }[];
      }>();

      studentGrades.forEach(grade => {
        const key = `${grade.competencyId}-${grade.componentSkillId}`;
        const score = Number(grade.score) || 0;

        if (!progressMap.has(key)) {
          progressMap.set(key, {
            competencyId: grade.competencyId,
            competencyName: grade.competencyName,
            componentSkillId: grade.componentSkillId,
            componentSkillName: grade.componentSkillName,
            scores: [],
          });
        }

        progressMap.get(key)!.scores.push({
          score,
          date: grade.gradedAt,
        });
      });

      // Calculate progress metrics for each competency/component skill
      const results = Array.from(progressMap.values()).map(item => {
        // Sort scores by date (most recent first)
        item.scores.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const totalScores = item.scores.map(s => s.score);
        const averageScore = totalScores.length > 0 ? 
          Math.round(totalScores.reduce((sum, score) => sum + score, 0) / totalScores.length) : 0;

        const lastScore = totalScores[0] || 0;
        const secondLastScore = totalScores[1];

        // Determine progress direction
        let progressDirection: 'improving' | 'declining' | 'stable' = 'stable';
        if (totalScores.length > 1 && secondLastScore !== undefined) {
          if (lastScore > secondLastScore + 5) { // 5-point threshold for improvement
            progressDirection = 'improving';
          } else if (lastScore < secondLastScore - 5) { // 5-point threshold for decline
            progressDirection = 'declining';
          }
        }

        const lastUpdated = item.scores[0]?.date?.toISOString() || new Date().toISOString();

        return {
          competencyId: item.competencyId,
          competencyName: item.competencyName,
          componentSkillId: item.componentSkillId,
          componentSkillName: item.componentSkillName,
          averageScore,
          totalScores,
          lastScore,
          lastUpdated,
          progressDirection,
        };
      });

      return results.sort((a, b) => a.competencyName.localeCompare(b.competencyName));
    } catch (error) {
      console.error("Error fetching student competency progress:", error);
      return [];
    }
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

  // B.E.S.T. Standards methods
  async getBestStandards(): Promise<BestStandard[]> {
    return await db.select().from(bestStandards).orderBy(bestStandards.benchmarkNumber);
  }

  async getBestStandardsBySubject(subject: string): Promise<BestStandard[]> {
    return await db.select()
      .from(bestStandards)
      .where(eq(bestStandards.subject, subject))
      .orderBy(bestStandards.benchmarkNumber);
  }

  async getBestStandardsByGrade(grade: string): Promise<BestStandard[]> {
    return await db.select()
      .from(bestStandards)
      .where(eq(bestStandards.grade, grade))
      .orderBy(bestStandards.benchmarkNumber);
  }

  async searchBestStandards(searchTerm: string): Promise<BestStandard[]> {
    return await db.select()
      .from(bestStandards)
      .where(
        or(
          like(bestStandards.description, `%${searchTerm}%`),
          like(bestStandards.benchmarkNumber, `%${searchTerm}%`),
          like(bestStandards.ideaStandard, `%${searchTerm}%`)
        )
      )
      .orderBy(bestStandards.benchmarkNumber);
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
              .where(eq(competencies.id, skill.competencyId));

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
              description: skill.description,
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
              description: skill.description,
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

  // Discussion Forum Methods
  async createDiscussionThread(data: InsertDiscussionThread): Promise<DiscussionThread> {
    const result = await db.insert(discussionThreads).values(data).returning();
    return result[0];
  }

  async getDiscussionThreadsByProject(projectId: number): Promise<DiscussionThread[]> {
    return await db.select().from(discussionThreads)
      .where(eq(discussionThreads.projectId, projectId))
      .orderBy(desc(discussionThreads.isPinned), desc(discussionThreads.lastActivityAt));
  }

  async getDiscussionThread(threadId: number): Promise<DiscussionThread | null> {
    const result = await db.select().from(discussionThreads)
      .where(eq(discussionThreads.id, threadId));
    return result[0] || null;
  }

  async createDiscussionPost(data: InsertDiscussionPost): Promise<DiscussionPost> {
    const result = await db.insert(discussionPosts).values(data).returning();
    return result[0];
  }

  async getDiscussionPostsByThread(threadId: number): Promise<DiscussionPost[]> {
    return await db.select().from(discussionPosts)
      .where(eq(discussionPosts.threadId, threadId))
      .orderBy(asc(discussionPosts.createdAt));
  }

  async updateDiscussionThread(threadId: number, data: Partial<InsertDiscussionThread>): Promise<DiscussionThread | undefined> {
    const result = await db.update(discussionThreads)
      .set(data)
      .where(eq(discussionThreads.id, threadId))
      .returning();
    return result[0];
  }

  async deleteDiscussionPost(postId: number): Promise<void> {
    return db.delete(discussionPosts).where(eq(discussionPosts.id, postId));
  }

  async toggleDiscussionLike(postId: number, userId: number): Promise<boolean> {
    const existingLike = await db.select()
      .from(discussionLikes)
      .where(and(eq(discussionLikes.postId, postId), eq(discussionLikes.userId, userId)));

    if (existingLike.length > 0) {
      await db.delete(discussionLikes)
        .where(and(eq(discussionLikes.postId, postId), eq(discussionLikes.userId, userId)));
      return false;
    } else {
      await db.insert(discussionLikes).values({ postId, userId });
      return true;
    }
  }

  // Self-evaluation operations
  async createSelfEvaluation(selfEvaluationData: InsertSelfEvaluation): Promise<SelfEvaluation> {
    const [selfEvaluation] = await db.insert(selfEvaluations).values(selfEvaluationData).returning();
    return selfEvaluation;
  }

  async getSelfEvaluation(id: number): Promise<SelfEvaluation | undefined> {
    const [selfEvaluation] = await db.select().from(selfEvaluations).where(eq(selfEvaluations.id, id));
    return selfEvaluation;
  }

  async getSelfEvaluationsByAssessment(assessmentId: number): Promise<SelfEvaluation[]> {
    return await db.select()
      .from(selfEvaluations)
      .where(eq(selfEvaluations.assessmentId, assessmentId))
      .orderBy(desc(selfEvaluations.submittedAt));
  }

  async getSelfEvaluationsByStudent(studentId: number): Promise<SelfEvaluation[]> {
    return await db.select()
      .from(selfEvaluations)
      .where(eq(selfEvaluations.studentId, studentId))
      .orderBy(desc(selfEvaluations.submittedAt));
  }

  async updateSelfEvaluation(id: number, updates: Partial<InsertSelfEvaluation>): Promise<SelfEvaluation> {
    const [updated] = await db.update(selfEvaluations)
      .set(updates)
      .where(eq(selfEvaluations.id, id))
      .returning();
    return updated;
  }

  async flagRiskySelfEvaluation(id: number, teacherNotified: boolean): Promise<void> {
    await db.update(selfEvaluations)
      .set({ hasRiskyContent: true, teacherNotified })
      .where(eq(selfEvaluations.id, id));
  }

  // B.E.S.T. Standards methods
  async getBestStandards(): Promise<BestStandard[]> {
    return await db.select().from(bestStandards).orderBy(bestStandards.benchmarkNumber);
  }

  async getBestStandardsBySubject(subject: string): Promise<BestStandard[]> {
    return await db.select()
      .from(bestStandards)
      .where(eq(bestStandards.subject, subject))
      .orderBy(bestStandards.benchmarkNumber);
  }

  async getBestStandardsByGrade(grade: string): Promise<BestStandard[]> {
    return await db.select()
      .from(bestStandards)
      .where(eq(bestStandards.grade, grade))
      .orderBy(bestStandards.benchmarkNumber);
  }

  async searchBestStandards(searchTerm: string): Promise<BestStandard[]> {
    const searchPattern = '%' + searchTerm + '%';
    return await db.select()
      .from(bestStandards)
      .where(or(
        like(bestStandards.description, searchPattern),
        like(bestStandards.benchmarkNumber, searchPattern)
      ))
      .orderBy(bestStandards.benchmarkNumber);
  }

  // Generate unique assessment access code
  async generateAssessmentAccessCode(): Promise<string> {
    let code: string;
    let exists = true;

    while (exists) {
      // Generate 6-digit code
      code = Math.floor(100000 + Math.random() * 900000).toString();

      // Check if code already exists
      const existing = await db.select().from(assessments).where(eq(assessments.accessCode, code)).limit(1);
      exists = existing.length > 0;
    }

    return code!;
  }

  // Update assessment with access code
  async updateAssessmentAccessCode(assessmentId: number, accessCode: string): Promise<Assessment[]> {
    const [updatedAssessment] = await db
      .update(assessments)
      .set({ accessCode })
      .where(eq(assessments.id, assessmentId))
      .returning();
    return updatedAssessment;
  }

  // Get assessment by access code
  async getAssessmentByAccessCode(accessCode: string) {
    const result = await db.select().from(assessments).where(eq(assessments.accessCode, accessCode)).limit(1);
    return result[0] || null;
  }

  // Assign assessment to student via access code
  async assignAssessmentToStudentViaCode(assessmentId: number, studentId: number) {
    const existingAssignment = await db.select()
      .from(assessmentAssignments)
      .where(and(
        eq(assessmentAssignments.assessmentId, assessmentId),
        eq(assessmentAssignments.studentId, studentId)
      ))
      .limit(1);

    if (existingAssignment.length > 0) {
      return existingAssignment[0];
    }

    const [assignment] = await db.insert(assessmentAssignments)
      .values({
        assessmentId,
        studentId,
        assignedAt: new Date()
      })
      .returning();

    return assignment;
  }

  // Get code-assigned assessments for a student
  async getCodeAssignedAssessments(studentId: number) {
    return await db.select({
      id: assessments.id,
      title: assessments.title,
      description: assessments.description,
      dueDate: assessments.dueDate,
      assessmentType: assessments.assessmentType,
      accessCode: assessments.accessCode,
      assignedAt: assessmentAssignments.assignedAt
    })
    .from(assessmentAssignments)
    .innerJoin(assessments, eq(assessmentAssignments.assessmentId, assessments.id))
    .where(eq(assessmentAssignments.studentId, studentId))
    .orderBy(desc(assessmentAssignments.assignedAt));
  }

  // Assign assessment to student via code
  async assignAssessmentToStudentViaCode(assessmentId: number, studentId: number) {
    // Check if already assigned
    const existing = await db.select()
      .from(assessmentAssignments)
      .where(and(
        eq(assessmentAssignments.assessmentId, assessmentId),
        eq(assessmentAssignments.studentId, studentId)
      ))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    // Create new assignment
    const result = await db.insert(assessmentAssignments)
      .values({ assessmentId, studentId })
      .returning();

    return result[0];
  }

  // Get assessments assigned to student via codes
  async getCodeAssignedAssessments(studentId: number) {
    return await db.select({
      id: assessments.id,
      title: assessments.title,
      description: assessments.description,
      dueDate: assessments.dueDate,
      assessmentType: assessments.assessmentType,
      componentSkillIds: assessments.componentSkillIds,
      assignedAt: assessmentAssignments.assignedAt,
    })
    .from(assessmentAssignments)
    .innerJoin(assessments, eq(assessmentAssignments.assessmentId, assessments.id))
    .where(eq(assessmentAssignments.studentId, studentId))
    .orderBy(desc(assessmentAssignments.assignedAt));
  }
}

export const storage = new DatabaseStorage();