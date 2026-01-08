import { eq, desc, and } from "drizzle-orm";
import { db } from "../../db";
import { 
  portfolioArtifacts,
  credentials,
  users,
  type PortfolioArtifact,
  type InsertPortfolioArtifact,
  type Credential,
  type User
} from "../../../shared/schema";

export interface IPortfolioStorage {
  createPortfolioArtifact(artifact: InsertPortfolioArtifact): Promise<PortfolioArtifact>;
  upsertPortfolioArtifact(artifact: InsertPortfolioArtifact): Promise<PortfolioArtifact>;
  getPortfolioArtifactsByStudent(studentId: number): Promise<PortfolioArtifact[]>;
  getPublicArtifactsByStudent(studentId: number): Promise<PortfolioArtifact[]>;
  updatePortfolioArtifact(id: number, updates: Partial<InsertPortfolioArtifact>): Promise<PortfolioArtifact>;
  getArtifactByMilestoneAndStudent(milestoneId: number, studentId: number): Promise<PortfolioArtifact | undefined>;
  getCredentialsByStudent(studentId: number): Promise<Credential[]>;
  getStudentById(studentId: number): Promise<User | undefined>;
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
}

export const portfolioStorage = new PortfolioStorage();