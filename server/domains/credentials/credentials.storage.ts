import { eq, desc } from "drizzle-orm";
import { db } from "../../db";
import { 
  credentials,
  type Credential,
  type InsertCredential
} from "../../../shared/schema";

export interface ICredentialStorage {
  createCredential(credential: InsertCredential): Promise<Credential>;
  getCredentialsByStudent(studentId: number): Promise<Credential[]>;
  updateCredential(id: number, updates: Partial<InsertCredential>): Promise<Credential>;
}

export class CredentialStorage implements ICredentialStorage {
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
}

export const credentialStorage = new CredentialStorage();