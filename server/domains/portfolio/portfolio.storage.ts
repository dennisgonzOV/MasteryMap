import { eq, desc, and } from "drizzle-orm";
import { db } from "../../db";
import { 
  portfolioArtifacts,
  portfolios,
  credentials,
  users,
  type PortfolioArtifact,
  type InsertPortfolioArtifact,
  type Portfolio,
  type InsertPortfolio,
  type Credential,
  type User
} from "../../../shared/schema";

export interface IPortfolioStorage {
  createPortfolioArtifact(artifact: InsertPortfolioArtifact): Promise<PortfolioArtifact>;
  upsertPortfolioArtifact(artifact: InsertPortfolioArtifact): Promise<PortfolioArtifact>;
  getPortfolioArtifactsByStudent(studentId: number): Promise<PortfolioArtifact[]>;
  getPublicArtifactsByStudent(studentId: number): Promise<PortfolioArtifact[]>;
  updatePortfolioArtifact(id: number, updates: Partial<InsertPortfolioArtifact>): Promise<PortfolioArtifact>;
  getPortfolioArtifactById(id: number): Promise<PortfolioArtifact | undefined>;
  getArtifactByMilestoneAndStudent(milestoneId: number, studentId: number): Promise<PortfolioArtifact | undefined>;
  getCredentialsByStudent(studentId: number): Promise<Credential[]>;
  getStudentById(studentId: number): Promise<User | undefined>;
  getPortfolioByStudent(studentId: number): Promise<Portfolio | undefined>;
  getPortfolioByPublicUrl(publicUrl: string): Promise<Portfolio | undefined>;
  createPortfolio(portfolio: InsertPortfolio): Promise<Portfolio>;
  updatePortfolio(id: number, updates: Partial<InsertPortfolio>): Promise<Portfolio>;
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

  async getPortfolioArtifactById(id: number): Promise<PortfolioArtifact | undefined> {
    const [artifact] = await db
      .select()
      .from(portfolioArtifacts)
      .where(eq(portfolioArtifacts.id, id))
      .limit(1);
    return artifact;
  }

  async getPublicArtifactsByStudent(studentId: number): Promise<PortfolioArtifact[]> {
    return await db
      .select()
      .from(portfolioArtifacts)
      .where(and(
        eq(portfolioArtifacts.studentId, studentId),
        eq(portfolioArtifacts.isPublic, true)
      ))
      .orderBy(desc(portfolioArtifacts.createdAt));
  }

  async getArtifactByMilestoneAndStudent(milestoneId: number, studentId: number): Promise<PortfolioArtifact | undefined> {
    const [artifact] = await db
      .select()
      .from(portfolioArtifacts)
      .where(and(
        eq(portfolioArtifacts.milestoneId, milestoneId),
        eq(portfolioArtifacts.studentId, studentId)
      ))
      .limit(1);
    return artifact;
  }

  async upsertPortfolioArtifact(artifact: InsertPortfolioArtifact): Promise<PortfolioArtifact> {
    if (artifact.milestoneId && artifact.studentId) {
      const existing = await this.getArtifactByMilestoneAndStudent(artifact.milestoneId, artifact.studentId);
      if (existing) {
        return await this.updatePortfolioArtifact(existing.id, artifact);
      }
    }
    return await this.createPortfolioArtifact(artifact);
  }

  async getCredentialsByStudent(studentId: number): Promise<Credential[]> {
    return await db
      .select()
      .from(credentials)
      .where(eq(credentials.studentId, studentId))
      .orderBy(desc(credentials.awardedAt));
  }

  async getStudentById(studentId: number): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, studentId))
      .limit(1);
    return user;
  }

  async getPortfolioByStudent(studentId: number): Promise<Portfolio | undefined> {
    const [portfolio] = await db
      .select()
      .from(portfolios)
      .where(eq(portfolios.studentId, studentId))
      .limit(1);
    return portfolio;
  }

  async getPortfolioByPublicUrl(publicUrl: string): Promise<Portfolio | undefined> {
    const [portfolio] = await db
      .select()
      .from(portfolios)
      .where(eq(portfolios.publicUrl, publicUrl))
      .limit(1);
    return portfolio;
  }

  async createPortfolio(portfolio: InsertPortfolio): Promise<Portfolio> {
    const [newPortfolio] = await db
      .insert(portfolios)
      .values(portfolio)
      .returning();
    return newPortfolio;
  }

  async updatePortfolio(id: number, updates: Partial<InsertPortfolio>): Promise<Portfolio> {
    const [updatedPortfolio] = await db
      .update(portfolios)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(portfolios.id, id))
      .returning();
    return updatedPortfolio;
  }
}

export const portfolioStorage = new PortfolioStorage();
