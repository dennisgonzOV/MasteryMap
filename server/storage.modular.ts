// Modular Storage Interface - Orchestrates domain repositories
import { AuthRepository } from './domains/auth/auth.repository';
import { ProjectsRepository } from './domains/projects/projects.repository';
import { AssessmentsRepository } from './domains/assessments/assessments.repository';
import { PortfolioRepository } from './domains/portfolio/portfolio.repository';
import { CredentialsRepository } from './domains/credentials/credentials.repository';

// Import existing storage interface for compatibility
// Define storage interface for domain repository orchestration
interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<UpsertUser>): Promise<User>;

  // Project operations  
  createProject(project: InsertProject): Promise<Project>;
  getProject(id: number): Promise<Project | undefined>;
  getProjectsByTeacher(teacherId: number): Promise<Project[]>;
  getProjectsByStudent(studentId: number): Promise<Project[]>;
  updateProject(id: number, updates: Partial<InsertProject>): Promise<Project>;
  
  // Assessment operations
  createAssessment(assessment: InsertAssessment): Promise<Assessment>;
  getAssessment(id: number): Promise<Assessment | undefined>;
  getAssessmentsByProject(projectId: number): Promise<Assessment[]>;
  
  // Portfolio operations
  createPortfolioArtifact(artifact: InsertPortfolioArtifact): Promise<PortfolioArtifact>;
  getPortfolioArtifacts(studentId: number): Promise<PortfolioArtifact[]>;
  
  // Credential operations
  createCredential(credential: InsertCredential): Promise<Credential>;
  getCredentials(studentId: number): Promise<Credential[]>;
  
  // School operations
  getSchools(): Promise<School[]>;
  getSchool(id: number): Promise<School | undefined>;
  
  // Additional methods required by the implementation  
  updateUserPassword?(userId: number, hashedPassword: string): Promise<void>;
}
import type {
  User, Project, Milestone, Assessment, Submission, Credential, PortfolioArtifact,
  AuthToken, ProjectTeam, ProjectTeamMember, School, LearnerOutcome, Competency,
  ComponentSkill, Grade, BestStandard, SelfEvaluation,
  UpsertUser, InsertProject, InsertMilestone, InsertAssessment, InsertSubmission,
  InsertCredential, InsertPortfolioArtifact, InsertSelfEvaluation, ProjectAssignment,
  InsertProjectTeam, InsertProjectTeamMember, InsertSchool, InsertAuthToken
} from "../shared/schemas";

// Modular storage implementation using domain repositories
export class ModularStorage implements IStorage {
  private authRepo = new AuthRepository();
  private projectsRepo = new ProjectsRepository();
  private assessmentsRepo = new AssessmentsRepository();
  private portfolioRepo = new PortfolioRepository();
  private credentialsRepo = new CredentialsRepository();

  // User operations - delegated to AuthRepository
  async getUser(id: number): Promise<User | undefined> {
    const user = await this.authRepo.getUserById(id);
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const user = await this.authRepo.getUserByEmail(email);
    return user || undefined;
  }

  async createUser(user: UpsertUser): Promise<User> {
    return await this.authRepo.createUser(user);
  }

  async updateUser(id: number, updates: Partial<UpsertUser>): Promise<User> {
    const updated = await this.authRepo.updateUser(id, updates);
    if (!updated) throw new Error('User not found');
    return updated;
  }

  // School operations - delegated to AuthRepository
  async getSchools(): Promise<School[]> {
    return await this.authRepo.getAllSchools();
  }

  async getSchool(id: number): Promise<School | undefined> {
    const school = await this.authRepo.getSchoolById(id);
    return school || undefined;
  }

  async createSchool(school: InsertSchool): Promise<School> {
    // Implementation would be added to AuthRepository
    throw new Error('Not implemented in modular structure yet');
  }

  // Project operations - delegated to ProjectsRepository
  async createProject(project: InsertProject): Promise<Project> {
    return await this.projectsRepo.createProject(project);
  }

  async getProject(id: number): Promise<Project | undefined> {
    const project = await this.projectsRepo.getProjectById(id);
    return project || undefined;
  }

  async getProjectsByTeacher(teacherId: number): Promise<Project[]> {
    return await this.projectsRepo.getProjectsByTeacher(teacherId);
  }

  async getProjectsByStudent(studentId: number): Promise<Project[]> {
    return await this.projectsRepo.getProjectsByStudent(studentId);
  }

  async updateProject(id: number, updates: Partial<InsertProject>): Promise<Project> {
    const updated = await this.projectsRepo.updateProject(id, updates);
    if (!updated) throw new Error('Project not found');
    return updated;
  }

  async deleteProject(id: number): Promise<void> {
    await this.projectsRepo.deleteProject(id);
  }

  // Milestone operations - delegated to ProjectsRepository
  async createMilestone(milestone: InsertMilestone): Promise<Milestone> {
    return await this.projectsRepo.createMilestone(milestone);
  }

  async getMilestone(id: number): Promise<Milestone | undefined> {
    const milestone = await this.projectsRepo.getMilestoneById(id);
    return milestone || undefined;
  }

  async getMilestonesByProject(projectId: number): Promise<Milestone[]> {
    return await this.projectsRepo.getMilestonesByProject(projectId);
  }

  async updateMilestone(id: number, updates: Partial<InsertMilestone>): Promise<Milestone> {
    // Would need to implement in ProjectsRepository
    throw new Error('Not implemented in modular structure yet');
  }

  async deleteMilestone(id: number): Promise<void> {
    // Would need to implement in ProjectsRepository
    throw new Error('Not implemented in modular structure yet');
  }

  // Assessment operations - delegated to AssessmentsRepository
  async createAssessment(assessment: InsertAssessment): Promise<Assessment> {
    return await this.assessmentsRepo.createAssessment(assessment);
  }

  async getAssessment(id: number): Promise<Assessment | undefined> {
    const assessment = await this.assessmentsRepo.getAssessmentById(id);
    return assessment || undefined;
  }

  async getAssessmentsByMilestone(milestoneId: number): Promise<Assessment[]> {
    // Would need to implement milestone-specific query in AssessmentsRepository
    throw new Error('Not implemented in modular structure yet');
  }

  async getStandaloneAssessments(): Promise<Assessment[]> {
    return await this.assessmentsRepo.getStandaloneAssessments();
  }

  async getAllAssessments(): Promise<Assessment[]> {
    return await this.assessmentsRepo.getAllAssessments();
  }

  async updateAssessment(id: number, updates: Partial<InsertAssessment>): Promise<Assessment> {
    const updated = await this.assessmentsRepo.updateAssessment(id, updates);
    if (!updated) throw new Error('Assessment not found');
    return updated;
  }

  async deleteAssessment(id: number): Promise<void> {
    await this.assessmentsRepo.deleteAssessment(id);
  }

  // Assessment convenience methods for existing API compatibility
  async getAssessmentsByProject(projectId: number): Promise<Assessment[]> {
    return await this.assessmentsRepo.getAssessmentsByProject(projectId);
  }

  async getAssessmentsByTeacher(teacherId: number): Promise<Assessment[]> {
    return await this.assessmentsRepo.getAssessmentsByTeacher(teacherId);
  }

  async getAssessmentsForStudent(studentId: number): Promise<Assessment[]> {
    return await this.assessmentsRepo.getAssessmentsForStudent(studentId);
  }

  // Share code operations - delegated to AssessmentsRepository
  async generateShareCode(assessmentId: number): Promise<string> {
    // Would need to implement in AssessmentsRepository
    throw new Error('Not implemented in modular structure yet');
  }

  async getAssessmentByShareCode(shareCode: string): Promise<Assessment | undefined> {
    const assessment = await this.assessmentsRepo.getAssessmentByShareCode(shareCode);
    return assessment || undefined;
  }

  async regenerateShareCode(assessmentId: number): Promise<string> {
    // Would need to implement in AssessmentsRepository
    throw new Error('Not implemented in modular structure yet');
  }

  // Submission operations - delegated to AssessmentsRepository
  async createSubmission(submission: InsertSubmission): Promise<Submission> {
    return await this.assessmentsRepo.createSubmission(submission);
  }

  async getSubmission(id: number): Promise<Submission | undefined> {
    const submission = await this.assessmentsRepo.getSubmissionById(id);
    return submission || undefined;
  }

  async getSubmissionsByStudent(studentId: number): Promise<Submission[]> {
    return await this.assessmentsRepo.getSubmissionsByStudent(studentId);
  }

  async getSubmissionsByAssessment(assessmentId: number): Promise<any[]> {
    return await this.assessmentsRepo.getSubmissionsByAssessment(assessmentId);
  }

  async updateSubmission(id: number, updates: Partial<InsertSubmission>): Promise<Submission> {
    const updated = await this.assessmentsRepo.updateSubmission(id, updates);
    if (!updated) throw new Error('Submission not found');
    return updated;
  }

  // Credential operations - delegated to CredentialsRepository
  async createCredential(credential: InsertCredential): Promise<Credential> {
    return await this.credentialsRepo.createCredential(credential);
  }

  async getCredential(id: number): Promise<Credential | undefined> {
    const credential = await this.credentialsRepo.getCredentialById(id);
    return credential || undefined;
  }

  async getCredentials(studentId: number): Promise<Credential[]> {
    return await this.credentialsRepo.getCredentialsByStudent(studentId);
  }

  async getCredentialsByStudent(studentId: number): Promise<Credential[]> {
    return await this.credentialsRepo.getCredentialsByStudent(studentId);
  }

  async updateCredential(id: number, updates: Partial<InsertCredential>): Promise<Credential> {
    const updated = await this.credentialsRepo.updateCredential(id, updates);
    if (!updated) throw new Error('Credential not found');
    return updated;
  }

  async deleteCredential(id: number): Promise<void> {
    await this.credentialsRepo.deleteCredential(id);
  }

  // Portfolio operations - delegated to PortfolioRepository
  async createPortfolioArtifact(artifact: InsertPortfolioArtifact): Promise<PortfolioArtifact> {
    return await this.portfolioRepo.createPortfolioArtifact(artifact);
  }

  async getPortfolioArtifact(id: number): Promise<PortfolioArtifact | undefined> {
    const artifact = await this.portfolioRepo.getPortfolioArtifactById(id);
    return artifact || undefined;
  }

  async getPortfolioArtifacts(studentId: number): Promise<PortfolioArtifact[]> {
    return await this.portfolioRepo.getPortfolioArtifactsByStudent(studentId);
  }

  async updatePortfolioArtifact(id: number, updates: Partial<InsertPortfolioArtifact>): Promise<PortfolioArtifact> {
    const updated = await this.portfolioRepo.updatePortfolioArtifact(id, updates);
    if (!updated) throw new Error('Portfolio artifact not found');
    return updated;
  }

  async deletePortfolioArtifact(id: number): Promise<void> {
    await this.portfolioRepo.deletePortfolioArtifact(id);
  }

  // Additional methods for compatibility
  async updateUserPassword(userId: number, hashedPassword: string): Promise<void> {
    await this.authRepo.updateUser(userId, { password: hashedPassword });
  }

  // Legacy operations that need full implementation (keeping for compatibility)
  
  // Auth token operations (would need AuthRepository extension)
  async createAuthToken(token: InsertAuthToken): Promise<AuthToken> {
    throw new Error('Not implemented in modular structure yet');
  }

  async getAuthToken(token: string): Promise<AuthToken | undefined> {
    throw new Error('Not implemented in modular structure yet');
  }

  async deleteAuthToken(token: string): Promise<void> {
    throw new Error('Not implemented in modular structure yet');
  }

  async deleteAuthTokensByUserId(userId: number): Promise<void> {
    throw new Error('Not implemented in modular structure yet');
  }

  // Project team operations (would need ProjectsRepository extension)
  async createProjectTeam(team: InsertProjectTeam): Promise<ProjectTeam> {
    throw new Error('Not implemented in modular structure yet');
  }

  async getProjectTeams(projectId: number): Promise<ProjectTeam[]> {
    throw new Error('Not implemented in modular structure yet');
  }

  async getProjectTeam(teamId: number): Promise<ProjectTeam | undefined> {
    throw new Error('Not implemented in modular structure yet');
  }

  async deleteProjectTeam(teamId: number): Promise<void> {
    throw new Error('Not implemented in modular structure yet');
  }

  async addTeamMember(teamMember: InsertProjectTeamMember): Promise<ProjectTeamMember> {
    throw new Error('Not implemented in modular structure yet');
  }

  async removeTeamMember(memberId: number): Promise<void> {
    throw new Error('Not implemented in modular structure yet');
  }

  async getTeamMembers(teamId: number): Promise<ProjectTeamMember[]> {
    throw new Error('Not implemented in modular structure yet');
  }

  async getStudentsBySchool(schoolId: number): Promise<User[]> {
    return await this.authRepo.getUsersBySchool(schoolId);
  }

  // Additional operations would be implemented as needed
  async getComponentSkills(): Promise<ComponentSkill[]> {
    return await this.projectsRepo.getAllComponentSkills();
  }

  async getComponentSkill(id: number): Promise<ComponentSkill | undefined> {
    const skills = await this.projectsRepo.getComponentSkillsByIds([id]);
    return skills[0] || undefined;
  }

  // Other legacy methods would need implementation
  async getLearnerOutcomes(): Promise<LearnerOutcome[]> {
    throw new Error('Not implemented in modular structure yet');
  }

  async getCompetencies(): Promise<Competency[]> {
    throw new Error('Not implemented in modular structure yet');
  }

  async createGrade(grade: any): Promise<Grade> {
    throw new Error('Not implemented in modular structure yet');
  }

  async getGradesBySubmission(submissionId: number): Promise<Grade[]> {
    return await this.assessmentsRepo.getGradesBySubmission(submissionId);
  }

  async getGradesByStudent(studentId: number): Promise<Grade[]> {
    return await this.assessmentsRepo.getGradesByStudent(studentId);
  }

  async createSelfEvaluation(evaluation: InsertSelfEvaluation): Promise<SelfEvaluation> {
    return await this.assessmentsRepo.createSelfEvaluation(evaluation);
  }

  async getSelfEvaluationsByStudent(studentId: number): Promise<SelfEvaluation[]> {
    return await this.assessmentsRepo.getSelfEvaluationsByStudent(studentId);
  }
}

// Export modular storage instance
export const modularStorage = new ModularStorage();