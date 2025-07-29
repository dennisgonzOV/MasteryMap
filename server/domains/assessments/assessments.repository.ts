// Assessments Repository - Domain-specific data access layer
import { eq, and, desc, asc, inArray, isNull, ne } from 'drizzle-orm';
import { db } from '../../db';
import { 
  assessments as assessmentsTable,
  submissions as submissionsTable,
  grades as gradesTable,
  selfEvaluations as selfEvaluationsTable,
  milestones as milestonesTable,
  projects as projectsTable
} from '../../../shared/schema';
import type { 
  InsertAssessment, 
  SelectAssessment,
  InsertSubmission,
  SelectSubmission,
  InsertGrade,
  SelectGrade,
  InsertSelfEvaluation,
  SelectSelfEvaluation
} from '../../../shared/schema';

export class AssessmentsRepository {
  
  // Assessment CRUD operations
  async createAssessment(assessmentData: InsertAssessment): Promise<SelectAssessment> {
    try {
      const result = await db.insert(assessmentsTable).values(assessmentData).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating assessment:', error);
      throw new Error('Database error');
    }
  }

  async getAssessmentById(id: number): Promise<SelectAssessment | null> {
    try {
      const result = await db.select().from(assessmentsTable).where(eq(assessmentsTable.id, id)).limit(1);
      return result[0] || null;
    } catch (error) {
      console.error('Error getting assessment:', error);
      throw new Error('Database error');
    }
  }

  async getAssessmentByShareCode(shareCode: string): Promise<SelectAssessment | null> {
    try {
      const result = await db.select().from(assessmentsTable)
        .where(eq(assessmentsTable.shareCode, shareCode))
        .limit(1);
      return result[0] || null;
    } catch (error) {
      console.error('Error getting assessment by share code:', error);
      throw new Error('Database error');
    }
  }

  async getAssessmentsByTeacher(teacherId: number): Promise<SelectAssessment[]> {
    try {
      return await db.select().from(assessmentsTable)
        .where(eq(assessmentsTable.teacherId, teacherId))
        .orderBy(desc(assessmentsTable.createdAt));
    } catch (error) {
      console.error('Error getting assessments by teacher:', error);
      throw new Error('Database error');
    }
  }

  async getAssessmentsForStudent(studentId: number): Promise<SelectAssessment[]> {
    try {
      // Get assessments through project assignments and milestones
      const result = await db
        .select({ assessment: assessmentsTable })
        .from(assessmentsTable)
        .leftJoin(milestonesTable, eq(assessmentsTable.milestoneId, milestonesTable.id))
        .leftJoin(projectsTable, eq(milestonesTable.projectId, projectsTable.id))
        .where(
          // Standalone assessments (no milestone) or project-based assessments
          isNull(assessmentsTable.milestoneId)
        )
        .orderBy(desc(assessmentsTable.createdAt));

      return result.map(r => r.assessment);
    } catch (error) {
      console.error('Error getting assessments for student:', error);
      throw new Error('Database error');
    }
  }

  async getAllAssessments(): Promise<SelectAssessment[]> {
    try {
      return await db.select().from(assessmentsTable).orderBy(desc(assessmentsTable.createdAt));
    } catch (error) {
      console.error('Error getting all assessments:', error);
      throw new Error('Database error');
    }
  }

  async getStandaloneAssessments(): Promise<SelectAssessment[]> {
    try {
      return await db.select().from(assessmentsTable)
        .where(isNull(assessmentsTable.milestoneId))
        .orderBy(desc(assessmentsTable.createdAt));
    } catch (error) {
      console.error('Error getting standalone assessments:', error);
      throw new Error('Database error');
    }
  }

  async updateAssessment(id: number, updates: Partial<InsertAssessment>): Promise<SelectAssessment | null> {
    try {
      const result = await db
        .update(assessmentsTable)
        .set(updates)
        .where(eq(assessmentsTable.id, id))
        .returning();
      return result[0] || null;
    } catch (error) {
      console.error('Error updating assessment:', error);
      throw new Error('Database error');
    }
  }

  async deleteAssessment(id: number): Promise<boolean> {
    try {
      await db.delete(assessmentsTable).where(eq(assessmentsTable.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting assessment:', error);
      throw new Error('Database error');
    }
  }

  // Submission operations
  async createSubmission(submissionData: InsertSubmission): Promise<SelectSubmission> {
    try {
      const result = await db.insert(submissionsTable).values(submissionData).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating submission:', error);
      throw new Error('Database error');
    }
  }

  async getSubmissionById(id: number): Promise<SelectSubmission | null> {
    try {
      const result = await db.select().from(submissionsTable).where(eq(submissionsTable.id, id)).limit(1);
      return result[0] || null;
    } catch (error) {
      console.error('Error getting submission:', error);
      throw new Error('Database error');
    }
  }

  async getSubmissionsByAssessment(assessmentId: number): Promise<SelectSubmission[]> {
    try {
      return await db.select().from(submissionsTable)
        .where(eq(submissionsTable.assessmentId, assessmentId))
        .orderBy(desc(submissionsTable.submittedAt));
    } catch (error) {
      console.error('Error getting submissions by assessment:', error);
      throw new Error('Database error');
    }
  }

  async getSubmissionsByStudent(studentId: number): Promise<SelectSubmission[]> {
    try {
      return await db.select().from(submissionsTable)
        .where(eq(submissionsTable.studentId, studentId))
        .orderBy(desc(submissionsTable.submittedAt));
    } catch (error) {
      console.error('Error getting submissions by student:', error);
      throw new Error('Database error');
    }
  }

  async updateSubmission(id: number, updates: Partial<InsertSubmission>): Promise<SelectSubmission | null> {
    try {
      const result = await db
        .update(submissionsTable)
        .set(updates)
        .where(eq(submissionsTable.id, id))
        .returning();
      return result[0] || null;
    } catch (error) {
      console.error('Error updating submission:', error);
      throw new Error('Database error');
    }
  }

  // Grade operations
  async createGrade(gradeData: InsertGrade): Promise<SelectGrade> {
    try {
      const result = await db.insert(gradesTable).values(gradeData).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating grade:', error);
      throw new Error('Database error');
    }
  }

  async getGradesBySubmission(submissionId: number): Promise<SelectGrade[]> {
    try {
      return await db.select().from(gradesTable)
        .where(eq(gradesTable.submissionId, submissionId));
    } catch (error) {
      console.error('Error getting grades by submission:', error);
      throw new Error('Database error');
    }
  }

  async getGradesByStudent(studentId: number): Promise<SelectGrade[]> {
    try {
      return await db.select().from(gradesTable)
        .where(eq(gradesTable.studentId, studentId))
        .orderBy(desc(gradesTable.createdAt));
    } catch (error) {
      console.error('Error getting grades by student:', error);
      throw new Error('Database error');
    }
  }

  // Self-evaluation operations
  async createSelfEvaluation(evaluationData: InsertSelfEvaluation): Promise<SelectSelfEvaluation> {
    try {
      const result = await db.insert(selfEvaluationsTable).values(evaluationData).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating self evaluation:', error);
      throw new Error('Database error');
    }
  }

  async getSelfEvaluationsByStudent(studentId: number): Promise<SelectSelfEvaluation[]> {
    try {
      return await db.select().from(selfEvaluationsTable)
        .where(eq(selfEvaluationsTable.studentId, studentId))
        .orderBy(desc(selfEvaluationsTable.createdAt));
    } catch (error) {
      console.error('Error getting self evaluations by student:', error);
      throw new Error('Database error');
    }
  }
}