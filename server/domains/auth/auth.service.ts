// Authentication Service - data access layer for auth domain
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { users } from '../../../shared/schema';
import type { InsertUser, SelectUser } from '../../../shared/schema';

export class AuthService {
  
  async findUserByEmail(email: string): Promise<SelectUser | null> {
    try {
      const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
      return result[0] || null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw new Error('Database error');
    }
  }

  async findUserById(id: number): Promise<SelectUser | null> {
    try {
      const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return result[0] || null;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw new Error('Database error');
    }
  }

  async createUser(userData: InsertUser): Promise<SelectUser> {
    try {
      const result = await db.insert(users).values(userData).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Database error');
    }
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<SelectUser | null> {
    try {
      const result = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, id))
        .returning();
      return result[0] || null;
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Database error');
    }
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      const result = await db.delete(users).where(eq(users.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error('Database error');
    }
  }

  async getAllUsers(): Promise<SelectUser[]> {
    try {
      return await db.select().from(users);
    } catch (error) {
      console.error('Error getting all users:', error);
      throw new Error('Database error');
    }
  }

  async getUsersByRole(role: 'admin' | 'teacher' | 'student'): Promise<SelectUser[]> {
    try {
      return await db.select().from(users).where(eq(users.role, role));
    } catch (error) {
      console.error('Error getting users by role:', error);
      throw new Error('Database error');
    }
  }

  async getUsersBySchool(schoolId: number): Promise<SelectUser[]> {
    try {
      return await db.select().from(users).where(eq(users.schoolId, schoolId));
    } catch (error) {
      console.error('Error getting users by school:', error);
      throw new Error('Database error');
    }
  }
}