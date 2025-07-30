// Auth Repository - Domain-specific data access layer
import { eq, and } from 'drizzle-orm';
import { db } from '../../db';
import { 
  users as usersTable,
  schools as schoolsTable,
  authTokens as authTokensTable
} from '../../../shared/schema';
import type { 
  UpsertUser, 
  User, 
  School,
  InsertAuthToken,
  AuthToken
} from '../../../shared/schema';

export class AuthRepository {
  
  // User CRUD operations
  async createUser(userData: UpsertUser): Promise<User> {
    try {
      const result = await db.insert(usersTable).values(userData).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Database error');
    }
  }

  async getUserById(id: number): Promise<User | null> {
    try {
      const result = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
      return result[0] || null;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      throw new Error('Database error');
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const result = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
      return result[0] || null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw new Error('Database error');
    }
  }

  async updateUser(id: number, updates: Partial<UpsertUser>): Promise<User | null> {
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

  async getAllUsers(): Promise<User[]> {
    try {
      return await db.select().from(usersTable);
    } catch (error) {
      console.error('Error getting all users:', error);
      throw new Error('Database error');
    }
  }

  async getUsersByRole(role: 'admin' | 'teacher' | 'student'): Promise<User[]> {
    try {
      return await db.select().from(usersTable).where(eq(usersTable.role, role));
    } catch (error) {
      console.error('Error getting users by role:', error);
      throw new Error('Database error');
    }
  }

  async getUsersBySchool(schoolId: number): Promise<User[]> {
    try {
      return await db.select().from(usersTable).where(eq(usersTable.schoolId, schoolId));
    } catch (error) {
      console.error('Error getting users by school:', error);
      throw new Error('Database error');
    }
  }

  // School operations
  async getAllSchools(): Promise<School[]> {
    try {
      return await db.select().from(schoolsTable);
    } catch (error) {
      console.error('Error getting schools:', error);
      throw new Error('Database error');
    }
  }

  async getSchoolById(id: number): Promise<School | null> {
    try {
      const result = await db.select().from(schoolsTable).where(eq(schoolsTable.id, id)).limit(1);
      return result[0] || null;
    } catch (error) {
      console.error('Error getting school by ID:', error);
      throw new Error('Database error');
    }
  }

  // Auth token operations
  async createAuthToken(tokenData: InsertAuthToken): Promise<AuthToken> {
    try {
      const result = await db.insert(authTokensTable).values(tokenData).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating auth token:', error);
      throw new Error('Database error');
    }
  }

  async getAuthToken(token: string): Promise<AuthToken | null> {
    try {
      const result = await db.select().from(authTokensTable).where(eq(authTokensTable.token, token)).limit(1);
      return result[0] || null;
    } catch (error) {
      console.error('Error getting auth token:', error);
      throw new Error('Database error');
    }
  }

  async deleteAuthToken(token: string): Promise<void> {
    try {
      await db.delete(authTokensTable).where(eq(authTokensTable.token, token));
    } catch (error) {
      console.error('Error deleting auth token:', error);
      throw new Error('Database error');
    }
  }

  async deleteAuthTokensByUserId(userId: number): Promise<void> {
    try {
      await db.delete(authTokensTable).where(eq(authTokensTable.userId, userId));
    } catch (error) {
      console.error('Error deleting auth tokens by user ID:', error);
      throw new Error('Database error');
    }
  }
}