// Credentials Repository - Domain-specific data access layer
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../db';
import { 
  credentials as credentialsTable
} from '../../../shared/schema';
import type { 
  InsertCredential, 
  SelectCredential
} from '../../../shared/schema';

export class CredentialsRepository {
  
  // Credential CRUD operations
  async createCredential(credentialData: InsertCredential): Promise<SelectCredential> {
    try {
      const result = await db.insert(credentialsTable).values(credentialData).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating credential:', error);
      throw new Error('Database error');
    }
  }

  async getCredentialById(id: number): Promise<SelectCredential | null> {
    try {
      const result = await db.select().from(credentialsTable)
        .where(eq(credentialsTable.id, id))
        .limit(1);
      return result[0] || null;
    } catch (error) {
      console.error('Error getting credential:', error);
      throw new Error('Database error');
    }
  }

  async getCredentialsByStudent(studentId: number): Promise<SelectCredential[]> {
    try {
      return await db.select().from(credentialsTable)
        .where(eq(credentialsTable.studentId, studentId))
        .orderBy(desc(credentialsTable.awardedAt));
    } catch (error) {
      console.error('Error getting credentials by student:', error);
      throw new Error('Database error');
    }
  }

  async getCredentialsByType(type: 'sticker' | 'badge' | 'plaque'): Promise<SelectCredential[]> {
    try {
      return await db.select().from(credentialsTable)
        .where(eq(credentialsTable.type, type))
        .orderBy(desc(credentialsTable.awardedAt));
    } catch (error) {
      console.error('Error getting credentials by type:', error);
      throw new Error('Database error');
    }
  }

  async updateCredential(id: number, updates: Partial<InsertCredential>): Promise<SelectCredential | null> {
    try {
      const result = await db
        .update(credentialsTable)
        .set(updates)
        .where(eq(credentialsTable.id, id))
        .returning();
      return result[0] || null;
    } catch (error) {
      console.error('Error updating credential:', error);
      throw new Error('Database error');
    }
  }

  async deleteCredential(id: number): Promise<boolean> {
    try {
      await db.delete(credentialsTable).where(eq(credentialsTable.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting credential:', error);
      throw new Error('Database error');
    }
  }

  async getAllCredentials(): Promise<SelectCredential[]> {
    try {
      return await db.select().from(credentialsTable)
        .orderBy(desc(credentialsTable.awardedAt));
    } catch (error) {
      console.error('Error getting all credentials:', error);
      throw new Error('Database error');
    }
  }

  async getCredentialsByTeacher(teacherId: number): Promise<SelectCredential[]> {
    try {
      return await db.select().from(credentialsTable)
        .where(eq(credentialsTable.awardedBy, teacherId))
        .orderBy(desc(credentialsTable.awardedAt));
    } catch (error) {
      console.error('Error getting credentials by teacher:', error);
      throw new Error('Database error');
    }
  }
}