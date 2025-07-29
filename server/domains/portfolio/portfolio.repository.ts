// Portfolio Repository - Domain-specific data access layer
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../db';
import { 
  portfolioArtifacts as portfolioArtifactsTable
} from '../../../shared/schema';
import type { 
  InsertPortfolioArtifact, 
  SelectPortfolioArtifact
} from '../../../shared/schema';

export class PortfolioRepository {
  
  // Portfolio artifact CRUD operations
  async createPortfolioArtifact(artifactData: InsertPortfolioArtifact): Promise<SelectPortfolioArtifact> {
    try {
      const result = await db.insert(portfolioArtifactsTable).values(artifactData).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating portfolio artifact:', error);
      throw new Error('Database error');
    }
  }

  async getPortfolioArtifactById(id: number): Promise<SelectPortfolioArtifact | null> {
    try {
      const result = await db.select().from(portfolioArtifactsTable)
        .where(eq(portfolioArtifactsTable.id, id))
        .limit(1);
      return result[0] || null;
    } catch (error) {
      console.error('Error getting portfolio artifact:', error);
      throw new Error('Database error');
    }
  }

  async getPortfolioArtifactsByStudent(studentId: number): Promise<SelectPortfolioArtifact[]> {
    try {
      return await db.select().from(portfolioArtifactsTable)
        .where(eq(portfolioArtifactsTable.studentId, studentId))
        .orderBy(desc(portfolioArtifactsTable.createdAt));
    } catch (error) {
      console.error('Error getting portfolio artifacts by student:', error);
      throw new Error('Database error');
    }
  }

  async getPortfolioArtifactsByProject(projectId: number): Promise<SelectPortfolioArtifact[]> {
    try {
      return await db.select().from(portfolioArtifactsTable)
        .where(eq(portfolioArtifactsTable.projectId, projectId))
        .orderBy(desc(portfolioArtifactsTable.createdAt));
    } catch (error) {
      console.error('Error getting portfolio artifacts by project:', error);
      throw new Error('Database error');
    }
  }

  async updatePortfolioArtifact(id: number, updates: Partial<InsertPortfolioArtifact>): Promise<SelectPortfolioArtifact | null> {
    try {
      const result = await db
        .update(portfolioArtifactsTable)
        .set(updates)
        .where(eq(portfolioArtifactsTable.id, id))
        .returning();
      return result[0] || null;
    } catch (error) {
      console.error('Error updating portfolio artifact:', error);
      throw new Error('Database error');
    }
  }

  async deletePortfolioArtifact(id: number): Promise<boolean> {
    try {
      await db.delete(portfolioArtifactsTable).where(eq(portfolioArtifactsTable.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting portfolio artifact:', error);
      throw new Error('Database error');
    }
  }

  async getAllPortfolioArtifacts(): Promise<SelectPortfolioArtifact[]> {
    try {
      return await db.select().from(portfolioArtifactsTable)
        .orderBy(desc(portfolioArtifactsTable.createdAt));
    } catch (error) {
      console.error('Error getting all portfolio artifacts:', error);
      throw new Error('Database error');
    }
  }
}