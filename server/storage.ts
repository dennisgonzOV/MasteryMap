import {
  users,
  assessments,
  submissions,
  credentials,
  portfolioArtifacts,
  learnerOutcomes,
  competencies,
  componentSkills,
  schools,
  grades,
  portfolios,
  bestStandards,
  selfEvaluations,
  type User,
  type Assessment,
  type Submission,
  type Credential,
  type PortfolioArtifact,
  type School,
  type LearnerOutcome,
  type Competency,
  type ComponentSkill,
  type Grade,
  type BestStandard,
  type SelfEvaluation,
  type InsertSelfEvaluation,
  type InsertSchool,
  InsertAssessment,
  InsertSubmission,
  InsertCredential,
  InsertPortfolioArtifact,
} from "../shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, isNull, inArray, ne, sql, like, or } from "drizzle-orm";

// Utility function to generate random 5-letter codes
function generateRandomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Interface for storage operations
export interface IStorage {

  // Assessment operations
  createAssessment(assessment: InsertAssessment): Promise<Assessment>;
  getAssessment(id: number): Promise<Assessment | undefined>;
  getAssessmentsByMilestone(milestoneId: number): Promise<Assessment[]>;
  getStandaloneAssessments(): Promise<Assessment[]>; // Get all standalone assessments
  getAllAssessments(): Promise<Assessment[]>; // Get all assessments (both milestone-linked and standalone)
  updateAssessment(id: number, updates: Partial<InsertAssessment>): Promise<Assessment>;
  deleteAssessment(id: number): Promise<void>;

  // Share code operations
  generateShareCode(assessmentId: number): Promise<string>;
  getAssessmentByShareCode(shareCode: string): Promise<Assessment | undefined>;
  regenerateShareCode(assessmentId: number): Promise<string>;

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

  getComponentSkillsWithDetails(): Promise<any[]>;
  getComponentSkillsByIds(skillIds: number[]): Promise<any[]>;

  // Legacy competency operations
  getCompetencies(): Promise<Competency[]>;



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

  // Self-evaluation operations
  createSelfEvaluation(selfEvaluation: InsertSelfEvaluation): Promise<SelfEvaluation>;
  getSelfEvaluation(id: number): Promise<SelfEvaluation | undefined>;
  getSelfEvaluationsByAssessment(assessmentId: number): Promise<SelfEvaluation[]>;
  getSelfEvaluationsByStudent(studentId: number): Promise<SelfEvaluation[]>;
  updateSelfEvaluation(id: number, updates: Partial<InsertSelfEvaluation>): Promise<SelfEvaluation>;
}

export class DatabaseStorage implements IStorage {

  // Assessment operations
  async createAssessment(data: InsertAssessment): Promise<Assessment> {
    // Generate a unique share code
    let shareCode: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      shareCode = generateRandomCode();
      attempts++;

      // Check if code already exists
      const [existing] = await db
        .select()
        .from(assessments)
        .where(eq(assessments.shareCode, shareCode))
        .limit(1);

      if (!existing) {
        break;
      }

      if (attempts >= maxAttempts) {
        throw new Error('Unable to generate unique share code');
      }
    } while (true);

    // Calculate expiration date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Ensure questions with options have them properly serialized
    const processedData = {
      ...data,
      questions: data.questions || [],
      shareCode,
      shareCodeExpiresAt: expiresAt
    };

    const [assessment] = await db.insert(assessments).values(processedData).returning();
    return assessment;
  }

  async getAssessment(id: number): Promise<Assessment | undefined> {
    const [assessment] = await db.select().from(assessments).where(eq(assessments.id, id));

    // Return assessment as-is for now

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

  // Share code operations
  async generateShareCode(assessmentId: number): Promise<string> {
    let shareCode: string;
    let attempts = 0;
    const maxAttempts = 10;

    // Try to generate a unique code
    do {
      shareCode = generateRandomCode();
      attempts++;

      // Check if code already exists
      const [existing] = await db
        .select()
        .from(assessments)
        .where(eq(assessments.shareCode, shareCode))
        .limit(1);

      if (!existing) {
        break;
      }

      if (attempts >= maxAttempts) {
        throw new Error('Unable to generate unique share code');
      }
    } while (true);

    // Update the assessment with the new share code
    await db
      .update(assessments)
      .set({ shareCode })
      .where(eq(assessments.id, assessmentId));

    return shareCode;
  }

  async getAssessmentByShareCode(shareCode: string): Promise<Assessment | undefined> {
    const [assessment] = await db
      .select()
      .from(assessments)
      .where(eq(assessments.shareCode, shareCode))
      .limit(1);

    return assessment;
  }

  async regenerateShareCode(assessmentId: number): Promise<string> {
    return this.generateShareCode(assessmentId);
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
      // Use separate queries to avoid Drizzle ORM field selection issues
      const allGrades = await db.select().from(grades);
      const allSubmissions = await db.select().from(submissions).where(eq(submissions.studentId, studentId));
      const allComponentSkills = await db.select().from(componentSkills);
      const allCompetencies = await db.select().from(competencies);

      // Filter grades for this student's submissions
      const submissionIds = allSubmissions.map(s => s.id);
      const studentGradesRaw = allGrades.filter(g => g.submissionId && submissionIds.includes(g.submissionId));

      // Create lookup maps
      const skillMap = new Map(allComponentSkills.map(s => [s.id, s]));
      const competencyMap = new Map(allCompetencies.map(c => [c.id, c]));

      // Enrich grades with related data
      const studentGrades = studentGradesRaw.map(grade => {
        const skill = skillMap.get(grade.componentSkillId || 0);
        const competency = skill?.competencyId ? competencyMap.get(skill.competencyId) : null;

        return {
          gradeId: grade.id,
          score: grade.score,
          gradedAt: grade.gradedAt,
          componentSkillId: grade.componentSkillId,
          componentSkillName: skill?.name || 'Unknown Skill',
          competencyId: competency?.id || 0,
          competencyName: competency?.name || 'Unknown Competency',
          submissionId: grade.submissionId,
        };
      }).sort((a, b) => new Date(b.gradedAt || 0).getTime() - new Date(a.gradedAt || 0).getTime());

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
            competencyId: grade.competencyId || 0,
            competencyName: grade.competencyName,
            componentSkillId: grade.componentSkillId || 0,
            componentSkillName: grade.componentSkillName,
            scores: [],
          });
        }

        progressMap.get(key)!.scores.push({
          score,
          date: grade.gradedAt || new Date(),
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

        // Determine progress direction with percentage-based threshold
        let progressDirection: 'improving' | 'declining' | 'stable' = 'stable';
        if (totalScores.length > 1 && secondLastScore !== undefined) {
          // Calculate dynamic threshold based on score range (10% of range, minimum 1 point)
          const minScore = Math.min(...totalScores);
          const maxScore = Math.max(...totalScores);
          const scoreRange = maxScore - minScore || 100; // Default to 100 if all scores are identical
          const threshold = Math.max(1, Math.round(scoreRange * 0.1)); // 10% threshold, minimum 1 point
          
          if (lastScore > secondLastScore + threshold) {
            progressDirection = 'improving';
          } else if (lastScore < secondLastScore - threshold) {
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





  // Get component skills with full details
  async getComponentSkillsWithDetails(): Promise<any[]> {
    try {
      // Get all data separately to avoid join issues
      const skills = await db.select().from(componentSkills).orderBy(componentSkills.id);

      if (!skills || skills.length === 0){
        console.log("No component skills found in database");
        return [];
      }

      const allCompetencies = await db.select().from(competencies);
      const allLearnerOutcomes = await db.select().from(learnerOutcomes);

      // Create lookup maps for efficient data matching
      const competencyMap = new Map(allCompetencies.map(c => [c.id, c]));
      const outcomeMap = new Map(allLearnerOutcomes.map(o => [o.id, o]));

      // Enrich skills with competency and learner outcome data
      const enrichedSkills = skills.map((skill) => {
        const competency = skill.competencyId ? competencyMap.get(skill.competencyId) : null;
        const learnerOutcome = competency?.learnerOutcomeId ? outcomeMap.get(competency.learnerOutcomeId) : null;

        return {
          id: skill.id,
          name: skill.name || 'Unknown Skill',
          competencyId: skill.competencyId || 0,
          competencyName: competency?.name || 'Unknown Competency',
          competencyCategory: competency?.category || null,
          learnerOutcomeId: competency?.learnerOutcomeId || null,
          learnerOutcomeName: learnerOutcome?.name || 'Unknown Learner Outcome'
        };
      });

      console.log(`Successfully enriched ${enrichedSkills.length} component skills`);
      return enrichedSkills.filter(skill => skill.id && skill.name !== 'Unknown Skill');
    } catch (error) {
      console.error("Error in getComponentSkillsWithDetails:", error);
      return [];
    }
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
            const competencyQuery = await db
              .select()
              .from(competencies)
              .where(eq(competencies.id, skill.competencyId || 0));
            const competency = competencyQuery[0];

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

  async getStudentsBySchool(schoolId: number): Promise<User[]> {
    return await db.select().from(users).where(and(
      eq(users.schoolId,schoolId),
      eq(users.role, 'student')
    )).orderBy(asc(users.firstName), asc(users.lastName));
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
}

export const storage = new DatabaseStorage();