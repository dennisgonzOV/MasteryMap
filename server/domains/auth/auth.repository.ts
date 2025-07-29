// Auth Repository - Domain-specific data access layer
import { eq, and } from 'drizzle-orm';
import { db } from '../../db';
import { 
  users as usersTable,
  schools as schoolsTable 
} from '../../../shared/schema';
import type { 
  InsertUser, 
  SelectUser, 
  SelectSchool 
} from '../../../shared/schema';

export class AuthRepository {
  
  // User CRUD operations
  async createUser(userData: InsertUser): Promise<SelectUser> {
    try {
      const result = await db.insert(usersTable).values(userData).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Database error');
    }
  }

  async getUserById(id: number): Promise<SelectUser | null> {
    try {
      const result = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
      return result[0] || null;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      throw new Error('Database error');
    }
  }

  async getUserByEmail(email: string): Promise<SelectUser | null> {
    try {
      const result = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
      return result[0] || null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw new Error('Database error');
    }
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<SelectUser | null> {
    try {
      const result = await db
        .update(usersTable)
        .set(updates)
        .where(eq(usersTable.id, id))
        .returning();
      return result[0] || null;
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Database error');
    }
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      await db.delete(usersTable).where(eq(usersTable.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error('Database error');
    }
  }

  async getAllUsers(): Promise<SelectUser[]> {
    try {
      return await db.select().from(usersTable);
    } catch (error) {
      console.error('Error getting all users:', error);
      throw new Error('Database error');
    }
  }

  async getUsersByRole(role: 'admin' | 'teacher' | 'student'): Promise<SelectUser[]> {
    try {
      return await db.select().from(usersTable).where(eq(usersTable.role, role));
    } catch (error) {
      console.error('Error getting users by role:', error);
      throw new Error('Database error');
    }
  }

  async getUsersBySchool(schoolId: number): Promise<SelectUser[]> {
    try {
      return await db.select().from(usersTable).where(eq(usersTable.schoolId, schoolId));
    } catch (error) {
      console.error('Error getting users by school:', error);
      throw new Error('Database error');
    }
  }

  // School operations
  async getAllSchools(): Promise<SelectSchool[]> {
    try {
      return await db.select().from(schoolsTable);
    } catch (error) {
      console.error('Error getting schools:', error);
      throw new Error('Database error');
    }
  }

  async getSchoolById(id: number): Promise<SelectSchool | null> {
    try {
      const result = await db.select().from(schoolsTable).where(eq(schoolsTable.id, id)).limit(1);
      return result[0] || null;
    } catch (error) {
      console.error('Error getting school by ID:', error);
      throw new Error('Database error');
    }
  }
}