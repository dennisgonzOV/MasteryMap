import {
  assessments,
  submissions,
  grades,
  selfEvaluations,
  componentSkills,
  competencies,
  credentials,
  users,
  type Assessment,
  type Submission,
  type SubmissionWithAssessment,
  type Grade,
  InsertAssessment,
  InsertSubmission,
} from "../../../shared/schema";
import { db } from "../../db";
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

// Interface for assessment-related storage operations
export interface IAssessmentStorage {
  // Assessment operations
  createAssessment(assessment: InsertAssessment): Promise<Assessment>;
  getAssessment(id: number): Promise<Assessment | undefined>;
  getAssessmentsByMilestone(milestoneId: number): Promise<Assessment[]>;
  getStandaloneAssessments(): Promise<Assessment[]>;
  getAllAssessments(): Promise<Assessment[]>;
  updateAssessment(id: number, updates: Partial<InsertAssessment>): Promise<Assessment>;
  deleteAssessment(id: number): Promise<void>;

  // Share code operations
  generateShareCode(assessmentId: number): Promise<string>;
  getAssessmentByShareCode(shareCode: string): Promise<Assessment | undefined>;
  regenerateShareCode(assessmentId: number): Promise<string>;

  // Submission operations
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  getSubmission(id: number): Promise<Submission | undefined>;
  getSubmissionsByStudent(studentId: number): Promise<SubmissionWithAssessment[]>;
  getSubmissionsByAssessment(assessmentId: number): Promise<any[]>;
  updateSubmission(id: number, updates: Partial<InsertSubmission>): Promise<Submission>;
  hasSubmissions(assessmentId: number): Promise<boolean>;

  // Grade operations
  createGrade(grade: Omit<Grade, "id" | "gradedAt">): Promise<Grade>;
  getGradesBySubmission(submissionId: number): Promise<Grade[]>;
  getComponentSkill(id: number): Promise<any>;
  generateComponentSkillGrades(submission: any, assessment: any, componentSkills: any[]): Promise<any[]>;
  generateStudentFeedback(submission: any, grades: any[]): Promise<string>;
  getExistingGrade(submissionId: number, componentSkillId: number): Promise<any>;
  updateGrade(gradeId: number, updates: any): Promise<any>;
  awardStickersForGrades(studentId: number, grades: any[]): Promise<any[]>;

  // Self-evaluation operations
  getSelfEvaluationsByAssessment(assessmentId: number): Promise<SelfEvaluation[]>;

  // Student competency progress
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

  // Teacher-specific methods for school skills tracking
  getSchoolComponentSkillsProgress(teacherId: number): Promise<any[]>;
  getSchoolSkillsStats(teacherId: number): Promise<any>;
}

export class AssessmentStorage implements IAssessmentStorage {
  // Assessment operations
  async createAssessment(data: InsertAssessment): Promise<Assessment> {
    // Generate a unique share code
    let shareCode: string = '';
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
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
    }

    if (attempts >= maxAttempts) {
      throw new Error('Unable to generate unique share code after maximum attempts');
    }

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
    // First delete all related self-evaluations
    await db.delete(selfEvaluations).where(eq(selfEvaluations.assessmentId, id));

    // Then delete all related submissions
    await db.delete(submissions).where(eq(submissions.assessmentId, id));

    // Finally delete the assessment
    await db.delete(assessments).where(eq(assessments.id, id));
  }

  // Share code operations
  async generateShareCode(assessmentId: number): Promise<string> {
    let shareCode: string;
    let attempts = 0;
    const maxAttempts = 10;

    // Try to generate a unique code with explicit loop condition
    while (attempts < maxAttempts) {
      shareCode = generateRandomCode();
      attempts++;

      // Check if code already exists
      const [existing] = await db
        .select()
        .from(assessments)
        .where(eq(assessments.shareCode, shareCode))
        .limit(1);

      if (!existing) {
        // Update the assessment with the new share code
        await db
          .update(assessments)
          .set({ shareCode })
          .where(eq(assessments.id, assessmentId));

        return shareCode;
      }
    }

    throw new Error('Unable to generate unique share code after maximum attempts');
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

  async getSubmissionsByStudent(studentId: number): Promise<SubmissionWithAssessment[]> {
    try {
      const submissionsWithAssessments = await db
        .select({
          id: submissions.id,
          assessmentId: submissions.assessmentId,
          studentId: submissions.studentId,
          responses: submissions.responses,
          artifacts: submissions.artifacts,
          submittedAt: submissions.submittedAt,
          gradedAt: submissions.gradedAt,
          feedback: submissions.feedback,
          aiGeneratedFeedback: submissions.aiGeneratedFeedback,
          isSelfEvaluation: submissions.isSelfEvaluation,
          selfEvaluationData: submissions.selfEvaluationData,
          assessment: assessments
        })
        .from(submissions)
        .leftJoin(assessments, eq(submissions.assessmentId, assessments.id))
        .where(eq(submissions.studentId, studentId))
        .orderBy(desc(submissions.submittedAt));

      // Transform the data to match the expected format
      return submissionsWithAssessments.map(row => ({
        id: row.id,
        assessmentId: row.assessmentId,
        studentId: row.studentId,
        responses: row.responses,
        artifacts: row.artifacts,
        submittedAt: row.submittedAt,
        gradedAt: row.gradedAt,
        feedback: row.feedback,
        aiGeneratedFeedback: row.aiGeneratedFeedback,
        isSelfEvaluation: row.isSelfEvaluation,
        selfEvaluationData: row.selfEvaluationData,
        assessment: row.assessment
      }));
    } catch (error) {
      console.error("Error fetching submissions by student:", error);
      return []; // Return empty array or re-throw depending on desired error handling
    }
  }

  async getSubmissionsByAssessment(assessmentId: number): Promise<any[]> {
    try {
      const result = await db
        .select()
        .from(submissions)
        .innerJoin(users, eq(submissions.studentId, users.id))
        .where(eq(submissions.assessmentId, assessmentId))
        .orderBy(desc(submissions.submittedAt));

      // Transform the result to match expected format and fetch grades for each submission
      const transformedResult = await Promise.all(result.map(async (row) => {
        // Fetch grades for this submission
        const submissionGrades = await this.getGradesBySubmission(row.submissions.id);

        return {
          id: row.submissions.id,
          studentId: row.submissions.studentId,
          studentName: row.users.username,
          studentUsername: row.users.username,
          responses: row.submissions.responses,
          submittedAt: row.submissions.submittedAt,
          feedback: row.submissions.feedback,
          aiGeneratedFeedback: row.submissions.aiGeneratedFeedback,
          grade: row.submissions.grade, // Add the overall grade field
          grades: submissionGrades, // Add the component skill grades
        };
      }));

      return transformedResult || [];
    } catch (error) {
      console.error("Error in getSubmissionsByAssessment storage:", error);
      return [];
    }
  }

  async updateSubmission(id: number, updates: Partial<InsertSubmission>): Promise<Submission> {
    const [updatedSubmission] = await db
      .update(submissions)
      .set(updates)
      .where(eq(submissions.id, id))
      .returning();
    return updatedSubmission;
  }

  async hasSubmissions(assessmentId: number): Promise<boolean> {
    const [submission] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.assessmentId, assessmentId))
      .limit(1);
    return !!submission;
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
    const gradesWithSkills = await db.select({
      id: grades.id,
      submissionId: grades.submissionId,
      componentSkillId: grades.componentSkillId,
      rubricLevel: grades.rubricLevel,
      score: grades.score,
      feedback: grades.feedback,
      gradedBy: grades.gradedBy,
      gradedAt: grades.gradedAt,
      componentSkillName: componentSkills.name,
      competencyName: competencies.name,
    })
      .from(grades)
      .leftJoin(componentSkills, eq(grades.componentSkillId, componentSkills.id))
      .leftJoin(competencies, eq(componentSkills.competencyId, competencies.id))
      .where(eq(grades.submissionId, submissionId))
      .orderBy(grades.gradedAt);

    return gradesWithSkills as any[];
  }

  async getComponentSkill(id: number): Promise<any> {
    const componentSkill = await db
      .select()
      .from(componentSkills)
      .where(eq(componentSkills.id, id))
      .limit(1);

    return componentSkill[0];
  }

  async generateComponentSkillGrades(submission: any, assessment: any, componentSkills: any[]): Promise<any[]> {
    const { aiService } = await import("../ai/ai.service");
    return await aiService.generateComponentSkillGrades(submission, assessment, componentSkills);
  }

  async generateStudentFeedback(submission: any, grades: any[]): Promise<string> {
    const { aiService } = await import("../ai/ai.service");
    return await aiService.generateStudentFeedback(submission, grades);
  }

  async getExistingGrade(submissionId: number, componentSkillId: number): Promise<any> {
    const grade = await db
      .select()
      .from(grades)
      .where(and(
        eq(grades.submissionId, submissionId),
        eq(grades.componentSkillId, componentSkillId)
      ))
      .limit(1);

    return grade[0];
  }

  async updateGrade(gradeId: number, updates: any): Promise<any> {
    const [updatedGrade] = await db
      .update(grades)
      .set({
        ...updates,
        gradedAt: new Date()
      })
      .where(eq(grades.id, gradeId))
      .returning();

    return updatedGrade;
  }

  async awardStickersForGrades(studentId: number, grades: any[]): Promise<any[]> {
    const awardedCredentials: any[] = [];

    try {
      for (const grade of grades) {
        // Only award stickers for proficient or applying levels
        if (grade.rubricLevel === 'proficient' || grade.rubricLevel === 'applying') {
          // Check if sticker already exists for this component skill
          const existingCredential = await db
            .select()
            .from(credentials)
            .where(and(
              eq(credentials.studentId, studentId),
              eq(credentials.componentSkillId, grade.componentSkillId),
              eq(credentials.type, 'sticker')
            ))
            .limit(1);

          if (existingCredential.length === 0) {
            // Get component skill name for the credential title
            const componentSkill = await this.getComponentSkill(grade.componentSkillId);

            if (componentSkill) {
              const stickerColor = grade.rubricLevel === 'applying' ? 'green' : 'blue';
              const stickerTitle = `${grade.rubricLevel === 'applying' ? 'Applying' : 'Proficient'} ${componentSkill.name}`;

              const newCredential = await db
                .insert(credentials)
                .values({
                  studentId,
                  componentSkillId: grade.componentSkillId,
                  type: 'sticker',
                  title: stickerTitle,
                  description: `Achieved ${grade.rubricLevel} level in ${componentSkill.name}`,
                  iconUrl: stickerColor,
                  awardedAt: new Date(),
                  approvedBy: grade.gradedBy
                })
                .returning();

              awardedCredentials.push(newCredential[0]);
              console.log(`Awarded sticker: ${stickerTitle} to student ${studentId}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error awarding stickers for grades:', error);
    }

    return awardedCredentials;
  }

  // Self-evaluation operations
  async getSelfEvaluationsByAssessment(assessmentId: number): Promise<SelfEvaluation[]> {
    return await db.select()
      .from(selfEvaluations)
      .where(eq(selfEvaluations.assessmentId, assessmentId))
      .orderBy(desc(selfEvaluations.submittedAt));
  }

  // Student competency progress
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

  // Teacher-specific methods for school skills tracking
  async getSchoolComponentSkillsProgress(teacherId: number): Promise<any[]> {
    try {
      // Get teacher's school ID
      const teacher = await db.select().from(users).where(eq(users.id, teacherId)).limit(1);
      const teacherSchoolId = teacher[0]?.schoolId;

      if (!teacherSchoolId) {
        return [];
      }

      // Get all students in the teacher's school
      const schoolStudents = await db.select().from(users).where(eq(users.schoolId, teacherSchoolId));

      if (schoolStudents.length === 0) {
        return [];
      }

      const studentIds = schoolStudents.map(s => s.id);

      if (studentIds.length === 0) {
        return [];
      }

      // Get all grades for students in this school
      const allGrades = await db.select().from(grades);
      const allSubmissions = await db.select().from(submissions).where(inArray(submissions.studentId, studentIds));
      const allComponentSkills = await db.select().from(componentSkills);
      const allCompetencies = await db.select().from(competencies);

      // Create lookup maps
      const skillMap = new Map(allComponentSkills.map(s => [s.id, s]));
      const competencyMap = new Map(allCompetencies.map(c => [c.id, c]));

      // Filter grades for students in this school
      const submissionIds = allSubmissions.map(s => s.id);
      const schoolGrades = allGrades.filter(g => g.submissionId && submissionIds.includes(g.submissionId));

      // Group grades by component skill
      const skillProgressMap = new Map<number, {
        grades: typeof schoolGrades;
        skill: typeof allComponentSkills[0];
        competency: typeof allCompetencies[0] | undefined;
      }>();

      schoolGrades.forEach(grade => {
        const skill = skillMap.get(grade.componentSkillId || 0);
        if (!skill) return;

        const competency = skill.competencyId ? competencyMap.get(skill.competencyId) : undefined;

        if (!skillProgressMap.has(skill.id)) {
          skillProgressMap.set(skill.id, {
            grades: [],
            skill,
            competency
          });
        }

        skillProgressMap.get(skill.id)!.grades.push(grade);
      });

      // Calculate progress for each skill
      const skillsProgress: any[] = [];

      for (const [skillId, data] of Array.from(skillProgressMap.entries())) {
        const { grades: skillGrades, skill, competency } = data;

        if (skillGrades.length === 0) continue;

        const scores = skillGrades.map((g: any) => g.score || 0);
        const averageScore = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;

        const rubricDistribution = {
          emerging: skillGrades.filter((g: any) => g.rubricLevel === 'emerging').length,
          developing: skillGrades.filter((g: any) => g.rubricLevel === 'developing').length,
          proficient: skillGrades.filter((g: any) => g.rubricLevel === 'proficient').length,
          applying: skillGrades.filter((g: any) => g.rubricLevel === 'applying').length
        };

        const strugglingStudents = skillGrades.filter((g: any) => (g.score || 0) < 2.5).length;
        const excellingStudents = skillGrades.filter((g: any) => (g.score || 0) >= 3.5).length;
        const passRate = (rubricDistribution.proficient + rubricDistribution.applying) / skillGrades.length * 100;

        // Calculate trend (simplified)
        const recentGrades = skillGrades
          .sort((a: any, b: any) => new Date(b.gradedAt || 0).getTime() - new Date(a.gradedAt || 0).getTime())
          .slice(0, Math.floor(skillGrades.length / 2));

        const olderGrades = skillGrades
          .sort((a: any, b: any) => new Date(b.gradedAt || 0).getTime() - new Date(a.gradedAt || 0).getTime())
          .slice(Math.floor(skillGrades.length / 2));

        let trend: 'improving' | 'declining' | 'stable' = 'stable';
        if (recentGrades.length > 0 && olderGrades.length > 0) {
          const recentAvg = recentGrades.reduce((sum: number, g: any) => sum + (g.score || 0), 0) / recentGrades.length;
          const olderAvg = olderGrades.reduce((sum: number, g: any) => sum + (g.score || 0), 0) / olderGrades.length;

          if (recentAvg > olderAvg + 0.5) trend = 'improving';
          else if (recentAvg < olderAvg - 0.5) trend = 'declining';
        }

        const lastAssessmentDate = skillGrades
          .sort((a: any, b: any) => new Date(b.gradedAt || 0).getTime() - new Date(a.gradedAt || 0).getTime())[0]?.gradedAt || new Date().toISOString();

        skillsProgress.push({
          id: skill.id,
          name: skill.name,
          competencyId: competency?.id || 0,
          competencyName: competency?.name || 'Unknown Competency',
          learnerOutcomeName: 'XQ Learner Outcome',
          averageScore: Math.round(averageScore * 100) / 100,
          studentsAssessed: skillGrades.length,
          totalStudents: schoolStudents.length,
          passRate: Math.round(passRate * 100) / 100,
          strugglingStudents,
          excellingStudents,
          rubricDistribution,
          trend,
          lastAssessmentDate
        });
      }

      return skillsProgress;
    } catch (error) {
      console.error('Error getting school component skills progress:', error);
      return [];
    }
  }

  async getSchoolSkillsStats(teacherId: number): Promise<any> {
    try {
      const skillsProgress = await this.getSchoolComponentSkillsProgress(teacherId);

      if (skillsProgress.length === 0) {
        return {
          totalSkillsAssessed: 0,
          averageSchoolScore: 0,
          skillsNeedingAttention: 0,
          excellentPerformance: 0,
          studentsAssessed: 0,
          totalStudents: 0
        };
      }

      const totalSkillsAssessed = skillsProgress.length;
      const averageSchoolScore = skillsProgress.reduce((sum, skill) => sum + skill.averageScore, 0) / totalSkillsAssessed;
      const skillsNeedingAttention = skillsProgress.filter(skill => skill.averageScore < 2.5).length;
      const excellentPerformance = skillsProgress.filter(skill => skill.averageScore >= 3.5).length;
      const studentsAssessed = Math.max(...skillsProgress.map(skill => skill.studentsAssessed), 0);
      const totalStudents = Math.max(...skillsProgress.map(skill => skill.totalStudents), 0);

      return {
        totalSkillsAssessed,
        averageSchoolScore: Math.round(averageSchoolScore * 100) / 100,
        skillsNeedingAttention,
        excellentPerformance,
        studentsAssessed,
        totalStudents
      };
    } catch (error) {
      console.error('Error getting school skills stats:', error);
      return {
        totalSkillsAssessed: 0,
        averageSchoolScore: 0,
        skillsNeedingAttention: 0,
        excellentPerformance: 0,
        studentsAssessed: 0,
        totalStudents: 0
      };
    }
  }
}

export const assessmentStorage = new AssessmentStorage();