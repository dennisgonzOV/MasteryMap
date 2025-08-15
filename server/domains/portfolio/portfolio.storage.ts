import { eq, desc } from "drizzle-orm";
import { db } from "../../db";
import { 
  portfolioArtifacts,
  type PortfolioArtifact,
  type InsertPortfolioArtifact
} from "../../../shared/schema";

export interface IPortfolioStorage {
  createPortfolioArtifact(artifact: InsertPortfolioArtifact): Promise<PortfolioArtifact>;
  getPortfolioArtifactsByStudent(studentId: number): Promise<PortfolioArtifact[]>;
  updatePortfolioArtifact(id: number, updates: Partial<InsertPortfolioArtifact>): Promise<PortfolioArtifact>;
}

export class PortfolioStorage implements IPortfolioStorage {
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
}

export const portfolioStorage = new PortfolioStorage();